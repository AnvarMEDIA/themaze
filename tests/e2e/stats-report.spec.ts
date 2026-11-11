import { test, expect } from '@playwright/test'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import { mkdirSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { NextRequest } from 'next/server'
import { GET } from '../../app/api/cron/daily-digest/route'
import { listRuns } from '../../lib/digest'

/**
 * The daily report's endpoint (app/api/cron/daily-digest), called the way
 * Vercel's scheduler calls it, with Telegram answered by a stub on this
 * machine: who may call it, that it sends, and that the scheduler calling
 * twice for one day sends once. Vercel says outright that it can deliver a
 * scheduled call more than once.
 *
 * The handler is called directly, in a folder of the test's own, so its run
 * log and its "already sent" flags never touch the project's data.
 */
test.skip(({ isMobile }) => isMobile, 'server code: once is enough')
test.describe.configure({ mode: 'serial' })

const SECRET = 'test-cron-secret-0123456789abcdef'
const CHAT = '-1001234567890'

// Days nobody else's report is about, different on every run, so that each
// one's "already sent" flag starts free wherever the flags are kept.
const start = Date.UTC(2031 + Math.floor(Math.random() * 60), 0, 1 + Math.floor(Math.random() * 300))
const day = (n: number) => new Date(start + n * 86_400_000).toISOString().slice(0, 10)
const DAY = day(0)

let stub: Server
let refuseNext = false
const delivered: Array<{ chat_id: string; text: string; parse_mode?: string }> = []
let projectDir = ''
// What this file changes in the worker's environment, put back afterwards:
// other files may run in the same process.
const NAMES = ['CRON_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'TELEGRAM_API_BASE', 'STATS_DEV_DIR',
  'KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL', 'BLOB_READ_WRITE_TOKEN'] as const
const saved = Object.fromEntries(NAMES.map((n) => [n, process.env[n]]))

test.beforeAll(async () => {
  stub = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json')
      if (refuseNext) {
        refuseNext = false
        res.statusCode = 400
        res.end(JSON.stringify({ ok: false, error_code: 400, description: 'Bad Request: chat not found' }))
        return
      }
      delivered.push(JSON.parse(body))
      res.end(JSON.stringify({ ok: true, result: { message_id: delivered.length } }))
    })
  })
  await new Promise<void>((resolve) => stub.listen(0, '127.0.0.1', resolve))

  projectDir = process.cwd()
  const scratch = mkdtempSync(path.join(tmpdir(), 'maze-report-'))
  // The local store keeps its files in ./data (lib/store).
  mkdirSync(path.join(scratch, 'data'))
  process.chdir(scratch)
  Object.assign(process.env, {
    CRON_SECRET: SECRET,
    TELEGRAM_BOT_TOKEN: '123456:test-token',
    TELEGRAM_CHAT_ID: CHAT,
    TELEGRAM_API_BASE: `http://127.0.0.1:${(stub.address() as AddressInfo).port}`,
    STATS_DEV_DIR: path.join(scratch, 'stats'),
  })
  for (const name of ['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL', 'BLOB_READ_WRITE_TOKEN']) delete process.env[name]
})

test.afterAll(async () => {
  if (projectDir) process.chdir(projectDir)
  for (const n of NAMES) {
    if (saved[n] === undefined) delete process.env[n]
    else process.env[n] = saved[n]
  }
  await new Promise<void>((resolve) => stub?.close(() => resolve()))
})

function call(query: string, bearer?: string): Promise<Response> {
  return GET(new NextRequest(`http://localhost/api/cron/daily-digest${query}`, {
    headers: bearer === undefined ? {} : { authorization: `Bearer ${bearer}` },
  }))
}

test('without the secret nothing is sent, and the reply says where to look', async () => {
  const none = await call(`?date=${DAY}`)
  expect(none.status).toBe(401)
  expect((await none.json()).hint).toContain('dashboard')

  const wrong = await call(`?date=${DAY}`, 'not-the-secret')
  expect(wrong.status).toBe(401)
  expect(delivered).toHaveLength(0)
})

test('the scheduler sends the day once, however many times it calls', async () => {
  const first = await call(`?date=${DAY}`, SECRET)
  expect(first.status).toBe(200)
  expect(await first.json()).toMatchObject({ ok: true, sent: true, date: DAY, via: 'secret' })
  expect(delivered).toHaveLength(1)
  expect(delivered[0].chat_id).toBe(CHAT)
  expect(delivered[0].text).toContain('Итоги дня')
  expect(delivered[0].text.length).toBeLessThan(4096)

  // The same scheduled call delivered again: nothing more goes out.
  const again = await call(`?date=${DAY}`, SECRET)
  expect(await again.json()).toMatchObject({ sent: false, reason: 'already_sent', date: DAY })
  expect(delivered).toHaveLength(1)

  // Two at once, for a day not yet sent: exactly one of them sends.
  const both = await Promise.all([call(`?date=${day(1)}`, SECRET), call(`?date=${day(1)}`, SECRET)])
  const replies = await Promise.all(both.map((r) => r.json()))
  expect(replies.filter((r) => r.sent)).toHaveLength(1)
  expect(delivered).toHaveLength(2)
})

test('a report Telegram refused leaves the day free, and the next call delivers it', async () => {
  refuseNext = true
  const refused = await call(`?date=${day(2)}`, SECRET)
  expect(refused.status).toBe(200)
  expect(await refused.json()).toMatchObject({ sent: false, reason: expect.stringContaining('chat not found') })
  expect(delivered).toHaveLength(2)

  const retried = await call(`?date=${day(2)}`, SECRET)
  expect(await retried.json()).toMatchObject({ sent: true, date: day(2) })
  expect(delivered).toHaveLength(3)
})

test('every run is logged with the figures it reported', async () => {
  const runs = await listRuns()
  // Newest first: the delivered retry, the refusal, the two sends before.
  expect(runs[0]).toMatchObject({ date: day(2), sent: true, via: 'secret' })
  expect(runs[1]).toMatchObject({ date: day(2), sent: false })
  expect(runs[0].counts).toEqual({ visitors: 0, views: 0, leads: 0 })
  // A duplicate call is not a run: it sent nothing and changed nothing.
  expect(runs.filter((r) => r.date === DAY)).toHaveLength(1)
})

test('without a bot the report says so instead of failing quietly', async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  delete process.env.TELEGRAM_BOT_TOKEN
  try {
    const res = await call(`?date=${day(3)}`, SECRET)
    expect(await res.json()).toMatchObject({ sent: false, reason: 'telegram_not_configured' })
  } finally {
    process.env.TELEGRAM_BOT_TOKEN = token
  }
  expect(delivered).toHaveLength(3)
})

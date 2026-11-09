import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { NOWHERE, PAGE_PATTERNS } from '../../lib/publicRoutes'

test('unknown path renders styled 404', async ({ page }) => {
  const res = await page.goto('/en/this-route-does-not-exist')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Lost in the maze/i)
})

/**
 * The 404 for an address no page claims is decided in the middleware, from
 * the list in lib/publicRoutes.ts, and drawn by app/not-found.tsx. These
 * keep that arrangement honest: the list is the folders, a real page is
 * never shut out, and the screen is the one a visitor always got.
 */

const PUBLIC = path.join(process.cwd(), 'app', '(public)', '[locale]')

// 'portfolio/category/*' for app/(public)/[locale]/portfolio/category/[slug]/page.tsx
function pagesOnDisk(dir = PUBLIC): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return pagesOnDisk(full)
    if (!/^page\.(tsx|ts|jsx|js)$/.test(entry.name)) return []
    return [
      path.relative(PUBLIC, dir).split(path.sep)
        .filter((segment) => segment && !/^\(.*\)$/.test(segment))
        .map((segment) => (/^\[.*\]$/.test(segment) ? '*' : segment))
        .join('/'),
    ]
  })
}

test('the middleware knows every public page, and no other', () => {
  expect(pagesOnDisk().sort()).toEqual([...PAGE_PATTERNS].sort())
  // Where an unclaimed request is sent for Next to find nothing.
  expect(fs.existsSync(path.join(PUBLIC, NOWHERE))).toBe(false)
})

test('no page of the sitemap is answered with the 404', async ({ request }) => {
  const xml   = await (await request.get('/sitemap.xml')).text()
  const paths = Array.from(new Set(
    Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => new URL(m[1]).pathname),
  ))
  expect(paths.length).toBeGreaterThan(20)

  const failed: string[] = []
  for (let i = 0; i < paths.length; i += 8) {
    await Promise.all(paths.slice(i, i + 8).map(async (p) => {
      const res = await request.get(p)
      if (res.status() !== 200) failed.push(`${res.status()} ${p}`)
    }))
  }
  expect(failed).toEqual([])
})

test('the 404 is the screen it was: same address, header and footer, nothing for search engines', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error' && /hydrat|Minified React error/i.test(msg.text())) errors.push(msg.text())
  })

  const res = await page.goto('/ru/portfolio/category/nope')
  expect(res?.status()).toBe(404)
  await expect(page).toHaveURL(/\/ru\/portfolio\/category\/nope$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Заблудились в лабиринте.')
  await expect(page.locator('.noise > header')).toBeVisible()
  await expect(page.locator('.noise > footer')).toBeVisible()
  // Arrived through the page's entrance animation, like every page.
  await expect(page.locator('#main-content > div')).toHaveCSS('opacity', '1')
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached()

  // The way back works as a link of the site.
  await page.locator('main a').first().click()
  await expect(page).toHaveURL(/\/ru$/)

  expect(errors).toEqual([])
})

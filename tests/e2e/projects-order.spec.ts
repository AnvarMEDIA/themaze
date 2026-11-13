import { test, expect, type Page } from '@playwright/test'
import { SignJWT } from 'jose'
import { mkdirSync, mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { createProject, getAllProjects } from '../../lib/portfolio'
import type { CreateProjectInput, Project } from '../../lib/types'

/**
 * The order of the portfolio (lib/portfolio, Admin → Projects): a new
 * project goes first, and a card's arrows move it one place, as a drag does.
 */

const SECRET = process.env.JWT_SECRET
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${process.env.PLAYWRIGHT_PORT ?? 3100}`
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(BASE)

test.describe('A new project', () => {
  test.skip(({ isMobile }) => isMobile, 'server code: once is enough')

  // The local store is data/<name>.json under the working directory: a
  // folder of this test's own, so the project's own data is never written.
  const home = process.cwd()
  test.beforeAll(() => {
    const dir = mkdtempSync(path.join(tmpdir(), 'maze-order-'))
    mkdirSync(path.join(dir, 'data'))
    const at = '2026-01-01T00:00:00.000Z'
    const row = (id: string, sortOrder?: number, extra: Partial<Project> = {}) => ({
      id, slug: id, title: id, client: id, categories: ['branding'], year: 2026, description: '', shortDescription: '',
      coverImage: '', images: [], tags: [], services: [], featured: false, accentColor: '#C8FF47',
      createdAt: at, updatedAt: at, ...(sortOrder === undefined ? {} : { sortOrder }), ...extra,
    })
    writeFileSync(path.join(dir, 'data', 'portfolio.json'), JSON.stringify({
      projects: [row('a', 0), row('b', 1), row('c', 2), row('legacy'), row('gone', -5, { deletedAt: at })],
    }))
    process.chdir(dir)
  })
  test.afterAll(() => process.chdir(home))

  test('goes first, and no other project is touched', async () => {
    const before = await getAllProjects()
    expect(before.map((p) => p.id)).toEqual(['a', 'b', 'c', 'legacy'])

    const made = await createProject({
      slug: 'new', title: 'New', client: 'New', categories: ['branding'], year: 2026, description: '', shortDescription: '',
      coverImage: '', images: [], tags: [], services: [], featured: false, accentColor: '#C8FF47', status: 'draft',
    } as CreateProjectInput)

    // Before every project, the deleted one too: restored, it stays behind.
    expect(made.sortOrder).toBe(-6)
    const after = await getAllProjects()
    expect(after.map((p) => p.id)).toEqual([made.id, 'a', 'b', 'c', 'legacy'])
    for (const p of after.slice(1)) expect(p.updatedAt).toBe('2026-01-01T00:00:00.000Z')
  })
})

test.describe('Admin → Projects: the arrows', () => {
  test.skip(!SECRET || !LOCAL, 'needs the local server and its JWT_SECRET')

  async function signIn(page: Page) {
    const token = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' }).setIssuedAt()
      .setIssuer('maze.uz/admin').setAudience('maze.uz/admin-ui').setSubject('admin').setExpirationTime('10m')
      .sign(new TextEncoder().encode(SECRET))
    await page.context().addCookies([{ name: 'maze_admin_token', value: token, url: BASE }])
  }

  /** The order saved, as the page sends it; answered here, so the project's data is never written. */
  async function catchSaves(page: Page): Promise<string[][]> {
    const saves: string[][] = []
    await page.route('**/api/portfolio/reorder', async (route) => {
      saves.push((route.request().postDataJSON() as { ids: string[] }).ids)
      await route.fulfill({ json: { ok: true } })
    })
    return saves
  }

  const titles = (page: Page) => page.locator('article h3').allInnerTexts()

  test('a card moves one place each way, the place is saved, and the focus stays on its arrow', async ({ page }) => {
    await signIn(page)
    const saves = await catchSaves(page)
    await page.goto('/admin/projects')
    await expect(page.locator('article').first()).toBeVisible()
    const start = await titles(page)
    expect(start.length).toBeGreaterThan(2)
    const [first, second] = start

    // The ends: the first card cannot go earlier, the last cannot go later.
    await expect(page.getByRole('button', { name: `Move ${first} earlier` })).toBeDisabled()
    await expect(page.getByRole('button', { name: `Move ${start[start.length - 1]} later` })).toBeDisabled()

    await page.getByRole('button', { name: `Move ${first} later` }).click()
    expect((await titles(page)).slice(0, 2)).toEqual([second, first])
    await expect(page.getByRole('group', { name: `Place of ${first}` })).toContainText('2')
    await expect(page.getByRole('button', { name: `Move ${first} later` })).toBeFocused()
    // Saved as a drag is: the whole list's ids, in the new order.
    await expect.poll(() => saves.length).toBe(1)
    const moved = saves[0]
    expect(moved).toHaveLength(start.length)

    // Back to the first place: "earlier" is now disabled, the focus moves to "later".
    await page.getByRole('button', { name: `Move ${first} earlier` }).click()
    expect(await titles(page)).toEqual(start)
    await expect(page.getByRole('button', { name: `Move ${first} later` })).toBeFocused()
    await expect.poll(() => saves.length).toBe(2)
    expect(saves[1]).toEqual([moved[1], moved[0], ...moved.slice(2)])
  })

  test('while the list is searched there are no arrows, as there is no drag', async ({ page }) => {
    await signIn(page)
    await catchSaves(page)
    await page.goto('/admin/projects')
    await expect(page.locator('article').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Move .* later$/ }).first()).toBeVisible()
    await page.getByRole('searchbox', { name: 'Search projects' }).fill('a')
    await expect(page.getByRole('button', { name: /^Move .* (earlier|later)$/ })).toHaveCount(0)
  })
})

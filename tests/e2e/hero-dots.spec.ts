import { test, expect, type Page } from '@playwright/test'

/**
 * The dot grid behind the homepage's first screen (components/home/HeroDots):
 * it swells under a mouse, rings out from a click or a tap, follows the
 * theme, and keeps still for reduced motion.
 */

const INTRO_KEY = 'maze-hero-ripple'

/** The ink on the canvas, summed over a square around a point given in CSS pixels. */
async function inkAround(page: Page, x: number, y: number, r: number): Promise<number> {
  return page.evaluate(([x, y, r]) => {
    const canvas = document.querySelector('.hero-dots canvas') as HTMLCanvasElement
    const k  = canvas.width / canvas.clientWidth
    const sx = Math.max(0, Math.round((x - r) * k))
    const sy = Math.max(0, Math.round((y - r) * k))
    const sw = Math.min(canvas.width - sx, Math.round(2 * r * k))
    const sh = Math.min(canvas.height - sy, Math.round(2 * r * k))
    const data = canvas.getContext('2d')!.getImageData(sx, sy, sw, sh).data
    let sum = 0
    for (let i = 3; i < data.length; i += 4) sum += data[i]
    return sum
  }, [x, y, r] as const)
}

/** The homepage with its grid running, without the once-a-visit first ring. */
async function quietHome(page: Page) {
  await page.addInitScript((key) => sessionStorage.setItem(key, '1'), INTRO_KEY)
  await page.goto('/')
  await expect(page.locator('.hero-dots')).toHaveAttribute('data-live', '')
  return (await page.locator('.hero-dots canvas').boundingBox())!
}

test.describe('Homepage dot grid', () => {
  test('swells under the mouse and settles when it leaves', async ({ page, isMobile }) => {
    test.skip(isMobile, 'a finger does not hover')
    const box = await quietHome(page)
    const x = box.width / 2
    const y = box.height * 0.45

    const rest = await inkAround(page, x, y, 120)
    expect(rest).toBeGreaterThan(0)

    await page.mouse.move(box.x + x, box.y + y)
    await expect.poll(() => inkAround(page, x, y, 120)).toBeGreaterThan(rest * 3)

    // Onto the header, which is not part of the first screen: the lens goes.
    await page.mouse.move(box.x + x, 10)
    await expect.poll(() => inkAround(page, x, y, 120)).toBeLessThan(rest * 1.05)
  })

  test('a tap sends a ring through the dots, which then come to rest', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'on a phone a tap is the whole interaction')
    const box = await quietHome(page)
    const all = () => inkAround(page, box.width / 2, box.height / 2, Math.max(box.width, box.height))
    const rest = await all()

    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.45)
    await expect.poll(all, { intervals: [50] }).toBeGreaterThan(rest * 2)
    await expect.poll(all).toBeLessThan(rest * 1.05)
  })

  test('the first ring plays once a visit', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.hero-dots')).toHaveAttribute('data-live', '')
    await expect.poll(() => page.evaluate((key) => sessionStorage.getItem(key), INTRO_KEY)).toBe('1')
  })

  test('follows the theme', async ({ page }) => {
    await quietHome(page)
    // A resting dot sits in the middle of each 36px cell: (18, 18) is the first.
    const red = () => page.evaluate(() => {
      const canvas = document.querySelector('.hero-dots canvas') as HTMLCanvasElement
      const k = canvas.width / canvas.clientWidth
      return canvas.getContext('2d')!.getImageData(Math.floor(18 * k), Math.floor(18 * k), 1, 1).data[0]
    })
    expect(await red()).toBeLessThan(80)
    await page.evaluate(() => {
      document.documentElement.classList.remove('light')
      document.documentElement.classList.add('dark')
    })
    await expect.poll(red).toBeGreaterThan(200)
  })

  test.describe('with reduced motion', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } })

    test('the grid keeps still: the CSS one, no canvas', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('load')
      await page.waitForTimeout(500)
      const shown = await page.evaluate(() => ({
        live:   document.querySelector('.hero-dots')!.hasAttribute('data-live'),
        css:    getComputedStyle(document.querySelector('.hero-dots-static')!).visibility,
        canvas: getComputedStyle(document.querySelector('.hero-dots canvas')!).visibility,
      }))
      expect(shown).toEqual({ live: false, css: 'visible', canvas: 'hidden' })
    })
  })
})

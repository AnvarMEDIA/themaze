import { test, expect } from '@playwright/test'

/**
 * The site animates its content in from states the server writes into the
 * HTML (opacity 0, moved, waiting below a mask), and a script plays them
 * out. With scripts off nothing does, so components/NoScriptStyles puts the
 * page in its finished state. These tests are that promise: add a new kind
 * of "before" state without teaching that file about it and the page comes
 * up empty for such a visitor, and one of these fails.
 */

const PAGES = ['/', '/ru', '/ru/about', '/ru/services', '/ru/portfolio', '/ru/internship', '/ru/contact', '/ru/brief']

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  for (const path of PAGES) {
    test(`${path} shows its content`, async ({ page }) => {
      await page.goto(path)

      const found = await page.evaluate(() => {
        // Invisible on purpose: the map's hover labels and pulse, the
        // country <select> laid over its flag, anything decorative.
        const BY_DESIGN = '.world-map-ping, .world-map-label, .PhoneInputCountrySelect, .sr-only, [aria-hidden="true"]'
        const label = (el: Element) => `<${el.tagName.toLowerCase()}> "${(el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)}"`

        // Text that is in the page but cannot be seen.
        const unseen: string[] = []
        for (const el of Array.from(document.querySelectorAll('main *'))) {
          const ownText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '')
          if (!ownText || el.closest('noscript, script, style') || el.closest(BY_DESIGN)) continue
          let opacity = 1
          let rendered = true
          for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) {
            const cs = getComputedStyle(e)
            if (cs.display === 'none') { rendered = false; break }
            opacity *= cs.visibility === 'hidden' ? 0 : parseFloat(cs.opacity)
          }
          if (rendered && opacity === 0) unseen.push(label(el))
        }

        // Headings still waiting below their mask.
        const masked = Array.from(document.querySelectorAll('main .reveal-mask > *'))
          .filter((el) => getComputedStyle(el).transform !== 'none')
          .map(label)

        const header = document.querySelector('.noise > header')
        return {
          unseen,
          masked,
          text: (document.querySelector('main') as HTMLElement).innerText.trim().length,
          header: header ? getComputedStyle(header).position : null,
        }
      })

      expect(found.unseen).toEqual([])
      expect(found.masked).toEqual([])
      expect(found.text).toBeGreaterThan(200)
      // Fixed and clear, it would ride over the text all the way down.
      expect(found.header).toBe('absolute')
    })
  }

  test('the custom cursor is gone and the native one is back', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the custom cursor only exists for a mouse')
    await page.goto('/')
    const cursor = await page.evaluate(() => ({
      parts: Array.from(document.querySelectorAll('[data-custom-cursor]')).map((el) => getComputedStyle(el).display),
      text: getComputedStyle(document.querySelector('main p')!).cursor,
      link: getComputedStyle(document.querySelector('main a')!).cursor,
    }))
    expect(cursor.parts).toEqual(['none', 'none'])
    expect(cursor.text).not.toBe('none')
    expect(cursor.link).toBe('pointer')
  })

  test('the services list on the homepage shows what a row opens to', async ({ page }) => {
    await page.goto('/')
    // With scripts the description appears on hover; here it is just there.
    await expect(page.locator('main h3 + noscript > p').first()).toBeVisible()
  })

  // An address no page claims. Thrown as `notFound()` by a page, the 404
  // is an empty document that a script fills in, a blank page here. So the
  // middleware answers these itself (lib/publicRoutes.ts) and the screen
  // comes from the server, in the header and the footer.
  const MISSING = [
    { path: '/ru/nope',                      lang: 'ru', heading: 'Заблудились в лабиринте.', home: '/ru' },
    { path: '/nope',                         lang: 'en', heading: 'Lost in the maze.',        home: '/' },
    { path: '/ru/services/nope',             lang: 'ru', heading: 'Заблудились в лабиринте.', home: '/ru' },
  ]

  for (const { path, lang, heading, home } of MISSING) {
    test(`${path} shows the 404 screen`, async ({ page }) => {
      const res = await page.goto(path)
      expect(res?.status()).toBe(404)

      await expect(page.locator('html')).toHaveAttribute('lang', lang)
      await expect(page.locator('.noise > header')).toBeVisible()
      await expect(page.locator('.noise > footer')).toBeVisible()

      const screen = await page.evaluate(() => {
        // Opacity all the way up: the page wrapper waits at 0 for a script.
        const shown = (el: Element | null) => {
          let opacity = el ? 1 : 0
          for (let e = el; e && e !== document.body; e = e.parentElement) opacity *= parseFloat(getComputedStyle(e).opacity)
          return opacity
        }
        const h1 = document.querySelector('main h1')
        const links = Array.from(document.querySelectorAll('main a'))
        return {
          heading: h1?.textContent,
          shown:   [h1, ...links].map(shown),
          links:   links.map((a) => a.getAttribute('href')),
          robots:  Array.from(document.querySelectorAll('meta[name="robots"]')).map((m) => m.getAttribute('content')),
        }
      })

      expect(screen.heading).toBe(heading)
      // A way back, and it can be seen.
      expect(screen.links).toContain(home)
      expect(screen.shown.every((opacity) => opacity === 1)).toBe(true)
      expect(screen.robots.join()).toContain('noindex')
    })
  }

  test('a form says it cannot be sent', async ({ page }) => {
    for (const path of ['/contact', '/brief']) {
      await page.goto(path)
      await expect(page.locator('main noscript').getByText(/JavaScript/)).toBeVisible()
    }
  })
})

test('with JavaScript the fallback does nothing', async ({ page }) => {
  await page.goto('/contact')
  // A <noscript> is plain text to a browser that runs scripts: no rules, no note.
  await expect(page.locator('noscript style, noscript p')).toHaveCount(0)
  await expect(page.locator('.noise > header')).toHaveCSS('position', 'fixed')
  // The page still arrives through its entrance animation and ends up shown.
  await expect(page.locator('#main-content > div')).toHaveCSS('opacity', '1')
})

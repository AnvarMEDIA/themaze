import { test, expect, type Page } from '@playwright/test'
import { blockTrackers } from './trackers'

/**
 * What the site tells Google when someone gets in touch.
 *
 *  - A client's form that the server accepted pushes `generate_lead` to the
 *    data layer (lib/leadEvent.ts), which a tag in the Tag Manager container
 *    counts as the Google Ads conversion "Контакт". It is not also reported to
 *    Google directly: that would count it twice.
 *  - A click on the studio's e-mail, phone or Telegram link calls the Google
 *    tag directly (lib/adsConversion.ts).
 *
 * The visitor's cookie choice is not decided by the site: the container's
 * Consent Mode is, so both are reported whatever the banner says.
 *
 * It needs a production build (`next start`, which playwright.config.ts
 * boots): both are skipped under `next dev` on purpose.
 *
 * Nothing goes to Google from here. The tags' hosts are refused, so what the
 * site reports is read where it is put, in the data layer, and no test run
 * can ever count as a lead.
 */

const SEND_TO = 'AW-18565782280/oeosCKWmzbUdEIi27ZRF'

async function visitor(page: Page, consent?: 'accepted' | 'rejected') {
  await blockTrackers(page)
  if (consent) {
    await page.addInitScript((value) => window.localStorage.setItem('maze_cookie_consent', value), consent)
  }
}

const accepted = (body: object = { ok: true, id: 'e2e' }) => ({
  status: 201,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

/** The `generate_lead` events the page has pushed: plain objects in its data layer. */
function leads(page: Page) {
  return page.evaluate(() => {
    const layer = (window as unknown as { dataLayer?: unknown[] }).dataLayer ?? []
    return layer.filter(
      (entry) =>
        Object.prototype.toString.call(entry) === '[object Object]' &&
        (entry as { event?: string }).event === 'generate_lead',
    )
  })
}

/** The conversions reported straight to the Google tag: `gtag('event', 'conversion', …)` commands. */
function conversions(page: Page) {
  return page.evaluate(() => {
    const layer = (window as unknown as { dataLayer?: unknown[] }).dataLayer ?? []
    return layer
      .filter((entry) => Object.prototype.toString.call(entry) === '[object Arguments]')
      .map((entry) => Array.from(entry as ArrayLike<unknown>))
      .filter(([command, name]) => command === 'event' && name === 'conversion')
      .map(([, , params]) => params)
  })
}

/**
 * Let the page settle, then keep clicks on e-mail, phone and external links
 * from leaving it. The report is made before the browser acts on the click
 * (the tracker listens first, this listener is added after it), and a test
 * has nowhere to go: no mail client, no Telegram.
 */
async function readyToClick(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.addEventListener('click', (event) => event.preventDefault(), true))
}

async function fillContactForm(page: Page) {
  await page.getByLabel(/name/i).first().fill('Playwright Tester')
  await page.getByLabel(/email/i).first().fill('tester@example.com')
  await page.getByLabel(/service/i).first().selectOption({ index: 1 })
  await page.getByLabel(/message/i).first().fill('Hello MAZE team, this is an automated e2e submission.')
  // The form takes a submission in under two seconds for a bot.
  await page.waitForTimeout(2100)
}

test.describe('Lead events for Google Tag Manager', () => {
  test('a contact form the server accepted pushes one lead, and nothing else to Google', async ({ page }) => {
    await visitor(page)
    await page.route('**/api/inquiries', (route) => route.fulfill(accepted()))

    await page.goto('/contact')
    await fillContactForm(page)
    await page.getByRole('button', { name: /send/i }).click()

    await expect(page.getByText(/message sent/i)).toBeVisible()
    expect(await leads(page)).toEqual([{ event: 'generate_lead', form_name: 'contact' }])
    // The tag in the container counts it; a direct report too would count it twice.
    expect(await conversions(page)).toEqual([])
  })

  test('a contact form the server refused pushes nothing', async ({ page }) => {
    await visitor(page)
    await page.route('**/api/inquiries', (route) => route.fulfill({ status: 500, body: '{}' }))

    await page.goto('/contact')
    await fillContactForm(page)
    await page.getByRole('button', { name: /send/i }).click()

    await expect(page.getByText(/something went wrong/i)).toBeVisible()
    expect(await leads(page)).toEqual([])
  })

  test('a bot that fills the hidden field is not a lead', async ({ page }) => {
    await visitor(page)
    // What the server does with it: 201, nothing stored.
    await page.route('**/api/inquiries', (route) => route.fulfill(accepted({ ok: true })))

    await page.goto('/contact')
    await fillContactForm(page)
    await page.locator('input[tabindex="-1"]').fill('https://spam.example')
    await page.getByRole('button', { name: /send/i }).click()

    await expect(page.getByText(/message sent/i)).toBeVisible()
    expect(await leads(page)).toEqual([])
  })

  test('a brief the server accepted pushes one lead', async ({ page }) => {
    await visitor(page)
    await page.route('**/api/brief', (route) => route.fulfill(accepted()))

    await page.goto('/brief')
    await page.getByLabel(/your name/i).fill('Playwright Tester')
    await page.getByPlaceholder('+998 90 123 45 67').fill('+998 90 123 45 67')
    await page.getByRole('button', { name: /continue/i }).click()

    await page.getByLabel(/describe your project/i).fill('A brand for a bakery in Tashkent.')
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /continue/i }).click()

    // Step 4. The form takes a submission in under two seconds for a bot.
    await page.waitForTimeout(2100)
    await page.getByRole('button', { name: /send brief/i }).click()

    await expect(page.getByRole('heading', { name: /brief received/i })).toBeVisible()
    expect(await leads(page)).toEqual([{ event: 'generate_lead', form_name: 'brief' }])
    expect(await conversions(page)).toEqual([])
  })

  test('the cookie choice is the container’s to apply: a lead and a click are reported either way', async ({ page }) => {
    await visitor(page, 'rejected')
    await page.route('**/api/inquiries', (route) => route.fulfill(accepted()))

    await page.goto('/contact')
    await fillContactForm(page)
    await page.getByRole('button', { name: /send/i }).click()
    await expect(page.getByText(/message sent/i)).toBeVisible()

    await readyToClick(page)
    await page.locator('main a[href^="mailto:"]').first().click()

    expect(await leads(page)).toEqual([{ event: 'generate_lead', form_name: 'contact' }])
    expect(await conversions(page)).toEqual([{ send_to: SEND_TO }])
  })
})

test.describe('Click conversion for Google Ads', () => {
  test('a click on the e-mail, phone or Telegram link is a contact', async ({ page }) => {
    await visitor(page)
    await page.goto('/contact')
    await readyToClick(page)

    for (const link of ['mailto:', 'tel:', 'https://t.me/']) {
      await page.locator(`main a[href^="${link}"]`).first().click()
    }

    expect(await conversions(page)).toEqual([{ send_to: SEND_TO }, { send_to: SEND_TO }, { send_to: SEND_TO }])
  })

  test('a click on any other link is not', async ({ page }) => {
    await visitor(page)
    await page.goto('/contact')
    await readyToClick(page)

    // Social profiles and the address are not a way to write to the studio.
    await page.locator('footer a[href*="instagram.com"]').first().click()
    await page.locator('footer a[href="/portfolio"]').first().click()

    expect(await conversions(page)).toEqual([])
  })
})

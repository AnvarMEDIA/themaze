import { test, expect, type Page } from '@playwright/test'

/**
 * The Google Ads conversion "Контакт" (lib/adsConversion.ts): reported when a
 * client's form has really been accepted by the server, for a visitor who
 * accepted the cookie banner, and at no other time.
 *
 * It needs a production build (`next start`, which playwright.config.ts
 * boots): the call is skipped under `next dev` on purpose.
 *
 * Nothing goes to Google from here. The tag's hosts are refused, so the
 * report is read where the site puts it, in the dataLayer, and no test run
 * can ever count as a lead. The analytics are refused too: accepting the
 * banner switches them on.
 */

const SEND_TO = 'AW-18565782280/oeosCKWmzbUdEIi27ZRF'

const TRACKERS =
  /googletagmanager\.com|googleadservices\.com|doubleclick\.net|google-analytics\.com|google\.com\/(pagead|ccm)|mc\.yandex\.(ru|com)|va\.vercel-scripts\.com|vitals\.vercel-insights\.com/

async function visitor(page: Page, consent: 'accepted' | 'rejected') {
  await page.route(TRACKERS, (route) => route.abort())
  await page.addInitScript((value) => window.localStorage.setItem('maze_cookie_consent', value), consent)
}

const accepted = (body: object = { ok: true, id: 'e2e' }) => ({
  status: 201,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

/** The conversions the page has reported: the `gtag('event', 'conversion', …)` commands in its dataLayer. */
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

async function fillContactForm(page: Page) {
  await page.getByLabel(/name/i).first().fill('Playwright Tester')
  await page.getByLabel(/email/i).first().fill('tester@example.com')
  await page.getByLabel(/service/i).first().selectOption({ index: 1 })
  await page.getByLabel(/message/i).first().fill('Hello MAZE team, this is an automated e2e submission.')
  // The form takes a submission in under two seconds for a bot.
  await page.waitForTimeout(2100)
}

test.describe('Google Ads conversion', () => {
  test('a contact form the server accepted reports one conversion', async ({ page }) => {
    await visitor(page, 'accepted')
    await page.route('**/api/inquiries', (route) => route.fulfill(accepted()))

    await page.goto('/contact')
    await fillContactForm(page)
    await page.getByRole('button', { name: /send/i }).click()

    await expect(page.getByText(/message sent/i)).toBeVisible()
    expect(await conversions(page)).toEqual([{ send_to: SEND_TO }])
  })

  test('a contact form the server refused reports nothing', async ({ page }) => {
    await visitor(page, 'accepted')
    await page.route('**/api/inquiries', (route) => route.fulfill({ status: 500, body: '{}' }))

    await page.goto('/contact')
    await fillContactForm(page)
    await page.getByRole('button', { name: /send/i }).click()

    await expect(page.getByText(/something went wrong/i)).toBeVisible()
    expect(await conversions(page)).toEqual([])
  })

  test('a visitor who rejected the cookie banner is not reported', async ({ page }) => {
    await visitor(page, 'rejected')
    await page.route('**/api/inquiries', (route) => route.fulfill(accepted()))

    await page.goto('/contact')
    await fillContactForm(page)
    await page.getByRole('button', { name: /send/i }).click()

    // The form still works for them; it just does not tell Google.
    await expect(page.getByText(/message sent/i)).toBeVisible()
    expect(await conversions(page)).toEqual([])
  })

  test('a bot that fills the hidden field is not a contact', async ({ page }) => {
    await visitor(page, 'accepted')
    // What the server does with it: 201, nothing stored.
    await page.route('**/api/inquiries', (route) => route.fulfill(accepted({ ok: true })))

    await page.goto('/contact')
    await fillContactForm(page)
    await page.locator('input[tabindex="-1"]').fill('https://spam.example')
    await page.getByRole('button', { name: /send/i }).click()

    await expect(page.getByText(/message sent/i)).toBeVisible()
    expect(await conversions(page)).toEqual([])
  })

  test('a brief the server accepted reports one conversion', async ({ page }) => {
    await visitor(page, 'accepted')
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
    expect(await conversions(page)).toEqual([{ send_to: SEND_TO }])
  })
})

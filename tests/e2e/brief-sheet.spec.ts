import { test, expect, type Page } from '@playwright/test'
import { blockTrackers } from './trackers'

/**
 * The brief sheet (components/brief/BriefSheet): the brief as a document.
 * Beside the form on a wide screen, filling in as the form does; in the
 * last step on a narrow one, to check before sending; stamped once sent.
 */

async function contact(page: Page) {
  await page.getByLabel(/your name/i).fill('Ada Lovelace')
  await page.getByLabel(/company/i).fill('Analytical Engines')
  await page.getByPlaceholder('+998 90 123 45 67').fill('+998 90 123 45 67')
  await page.getByRole('button', { name: /continue/i }).click()
}

async function project(page: Page) {
  await page.getByRole('button', { name: 'Branding', exact: true }).click()
  await page.getByRole('button', { name: 'Packaging', exact: true }).click()
  await page.getByLabel(/describe your project/i).fill('A brand for a bakery in Tashkent.')
  await page.getByRole('button', { name: /continue/i }).click()
}

async function look(page: Page) {
  await page.getByRole('button', { name: /minimal & clean/i }).click()
  await page.getByRole('button', { name: /monochrome/i }).click()
  await page.getByRole('button', { name: /continue/i }).click()
}

async function terms(page: Page) {
  await page.getByRole('button', { name: /standard/i }).click()
  await page.getByRole('button', { name: '$5,000 – $15,000' }).click()
}

test.describe('Brief sheet', () => {
  test('fills in beside the form as the brief is filled', async ({ page, isMobile }) => {
    test.skip(isMobile, 'beside the form on a wide screen only')
    await page.goto('/brief')

    const sheet = page.getByRole('complementary', { name: /your brief/i })
    await expect(sheet).toBeVisible()
    await expect(sheet).toContainText('0 of 7 filled')

    // The name is the title until there is a company; then the company is,
    // and the name goes under it.
    await page.getByLabel(/your name/i).fill('Ada Lovelace')
    await expect(sheet.locator('p.text-xl')).toHaveText('Ada Lovelace')
    await page.getByLabel(/company/i).fill('Analytical Engines')
    await expect(sheet.locator('p.text-xl')).toHaveText('Analytical Engines')
    await expect(sheet).toContainText('Ada Lovelace')
    await expect(sheet).toContainText('1 of 7 filled')
    await page.getByPlaceholder('+998 90 123 45 67').fill('+998 90 123 45 67')
    await page.getByRole('button', { name: /continue/i }).click()

    // Services become numbered lines, in the order they were picked.
    const services = sheet.locator('ol > li')
    await page.getByRole('button', { name: 'Branding', exact: true }).click()
    await page.getByRole('button', { name: 'Packaging', exact: true }).click()
    await expect(services).toHaveText([/01\s*Branding/, /02\s*Packaging/])
    await page.getByRole('button', { name: 'Branding', exact: true }).click()
    await expect(services).toHaveText([/01\s*Packaging/])
    await page.getByRole('button', { name: 'Branding', exact: true }).click()
    await expect(services).toHaveText([/01\s*Packaging/, /02\s*Branding/])
    await page.getByLabel(/describe your project/i).fill('A brand for a bakery in Tashkent.')
    await expect(sheet).toContainText('A brand for a bakery in Tashkent.')
    await expect(sheet).toContainText('3 of 7 filled')
    await page.getByRole('button', { name: /continue/i }).click()

    // A style becomes its drawing, a palette its swatches.
    await page.getByRole('button', { name: /minimal & clean/i }).click()
    await page.getByRole('button', { name: /monochrome/i }).click()
    await expect(sheet.locator('li[title="Minimal & Clean"] svg')).toBeVisible()
    await expect(sheet.locator('li[title="Monochrome"] > span[aria-hidden]')).toHaveCount(3)
    await expect(sheet).toContainText('5 of 7 filled')

    // It stays in view while the long step scrolls under it.
    await page.evaluate(() => window.scrollTo(0, 700))
    await expect.poll(async () => (await sheet.boundingBox())?.y).toBeCloseTo(112, -1)
    await page.getByRole('button', { name: /continue/i }).click()

    await terms(page)
    await expect(sheet).toContainText('Standard (within 2 weeks)')
    await expect(sheet).toContainText('$5,000 – $15,000')
    await expect(sheet).toContainText('7 of 7 filled')
  })

  test('on a narrow screen it is in the last step, to check before sending', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the narrow layout')
    await page.goto('/brief')
    await expect(page.getByRole('complementary', { name: /your brief/i })).toBeHidden()

    await contact(page)
    await project(page)
    await look(page)
    await terms(page)

    const review = page.locator('form [data-brief-sheet]')
    await expect(review).toBeVisible()
    await expect(review).toContainText('Your brief: check it before sending')
    await expect(review).toContainText('Analytical Engines')
    await expect(review.locator('ol > li')).toHaveText([/01\s*Branding/, /02\s*Packaging/])
    await expect(review).toContainText('7 of 7 filled')
  })

  test('a sent brief gets the stamp', async ({ page }) => {
    // A sent brief is reported to Tag Manager as a lead: keep this run from counting.
    await blockTrackers(page)
    await page.route('**/api/brief', (route) =>
      route.fulfill({ status: 201, contentType: 'application/json', body: '{"ok":true}' }),
    )
    await page.goto('/brief')
    await contact(page)
    await project(page)
    await look(page)
    await terms(page)
    // The form takes a submission in under two seconds for a bot's.
    await page.waitForTimeout(2100)
    await page.getByRole('button', { name: /send brief/i }).click()

    await expect(page.getByRole('heading', { name: /brief received/i })).toBeVisible()
    const sent = page.locator('[data-brief-sheet]')
    await expect(sent).toHaveCount(1)
    await expect(sent).toContainText('Analytical Engines')
    await expect(sent.locator('.brief-stamp')).toBeVisible()
    await expect(sent.locator('.brief-stamp textPath')).toHaveText('MAZE STUDIO • BRIEF RECEIVED •')
    // Pressed down, it rests at full size and a slight tilt.
    await expect(sent.locator('.brief-stamp')).toHaveCSS('opacity', '0.9')
  })

  test('in Russian', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the wording is the same on both layouts')
    await page.goto('/ru/brief')
    const sheet = page.getByRole('complementary', { name: 'Ваш бриф' })
    await expect(sheet).toContainText('Бриф на проект')
    await expect(sheet).toContainText('Заполнено 0 из 7')
  })
})

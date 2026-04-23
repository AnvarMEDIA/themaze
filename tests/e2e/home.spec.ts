import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('loads and shows the hero', async ({ page }) => {
    await page.goto('/')
    // Hero tagline is translated but the MAZE brand is constant.
    await expect(page).toHaveTitle(/MAZE/i)
    // Main landmark is present (accessibility contract).
    await expect(page.locator('main')).toBeVisible()
    // Skip link is the first focusable element after tab.
    await page.keyboard.press('Tab')
    const focused = page.locator(':focus')
    await expect(focused).toContainText(/Skip to main content/i)
  })

  test('navigates to portfolio', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /work|portfolio/i }).first().click()
    await expect(page).toHaveURL(/\/portfolio/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('switches to Russian locale', async ({ page }) => {
    await page.goto('/ru')
    await expect(page).toHaveURL(/\/ru$/)
    // The Russian homepage's <html lang> is en at the root layout but
    // the page content should be Russian — we check the HTML document
    // contains Cyrillic characters anywhere in the visible body.
    await expect(page.locator('body')).toContainText(/[А-Яа-я]/)
  })
})

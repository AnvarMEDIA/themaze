import { test, expect } from '@playwright/test'

test.describe('Contact form', () => {
  test('rejects submission when required fields are empty', async ({ page }) => {
    await page.goto('/contact')
    const submit = page.getByRole('button', { name: /send/i })
    await submit.click()
    // Form is still on the page — native validation blocked the submit.
    await expect(page.getByLabel(/name/i).first()).toBeFocused()
  })

  test('submits successfully with valid data (network stubbed)', async ({ page }) => {
    // Stub the inquiries endpoint so the test doesn't write to the DB.
    await page.route('**/api/inquiries', (route) =>
      route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true }) }),
    )

    await page.goto('/contact')
    await page.getByLabel(/name/i).first().fill('Playwright Tester')
    await page.getByLabel(/email/i).first().fill('tester@example.com')
    await page.getByLabel(/service/i).first().selectOption({ index: 1 })
    await page.getByLabel(/message/i).first().fill(
      'Hello MAZE team, this is an automated e2e submission.',
    )

    // Wait past the 2-second humanity check the form enforces.
    await page.waitForTimeout(2100)

    await page.getByRole('button', { name: /send/i }).click()

    // Success toast from react-hot-toast.
    await expect(page.getByText(/message sent/i)).toBeVisible({ timeout: 5000 })
  })
})

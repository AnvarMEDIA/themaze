import { test, expect } from '@playwright/test'

for (const slug of ['privacy', 'terms', 'cookies'] as const) {
  test(`legal page /${slug} renders its heading`, async ({ page }) => {
    await page.goto(`/legal/${slug}`)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('h1')).not.toBeEmpty()
  })
}

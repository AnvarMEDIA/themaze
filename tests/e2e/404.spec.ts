import { test, expect } from '@playwright/test'

test('unknown path renders styled 404', async ({ page }) => {
  const res = await page.goto('/en/this-route-does-not-exist')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Lost in the maze/i)
})

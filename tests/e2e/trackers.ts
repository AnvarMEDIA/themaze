import type { Page } from '@playwright/test'

/**
 * Everything that would tell Google, Yandex or Vercel that a test run was a
 * visitor. The site loads Google Tag Manager on every page, and a form that
 * is sent here would be counted as a lead by the tags in it (and a click on a
 * contact link as a conversion), so a test that sends a form or clicks a
 * contact link refuses these first. The page's own data layer is still
 * there to read.
 */
export const TRACKERS =
  /googletagmanager\.com|googleadservices\.com|doubleclick\.net|google-analytics\.com|analytics\.google\.com|google\.com\/(pagead|ccm)|google\.co\.uz|mc\.yandex\.(ru|com)|va\.vercel-scripts\.com|vitals\.vercel-insights\.com/

export async function blockTrackers(page: Page) {
  await page.route(TRACKERS, (route) => route.abort())
}

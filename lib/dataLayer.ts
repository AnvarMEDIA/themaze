type WithDataLayer = Window & { dataLayer?: unknown[] }

/**
 * The page's Google Tag Manager data layer, made here if the container has
 * not made it yet: a form can be sent, or a link clicked, before the
 * container has finished loading, and what is pushed early is read when it
 * does.
 */
export function dataLayer(): unknown[] {
  const w = window as WithDataLayer
  w.dataLayer = w.dataLayer || []
  return w.dataLayer
}

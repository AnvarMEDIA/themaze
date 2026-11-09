import Script from 'next/script'

/** Google Tag Manager container ID. */
export const GTM_ID = 'GTM-TRCRJX3G'

/**
 * Google Tag Manager loader — the `<head>` half of the official
 * snippet. Loaded with Next.js' recommended `afterInteractive`
 * strategy so it never blocks first paint, and rendered on every page
 * via the root layout.
 *
 * The loader is intentionally *unconditional*: per Google's guidance,
 * consent for individual tags is handled inside the GTM container via
 * Consent Mode, not by blocking the loader. (Yandex.Metrika and Vercel
 * Analytics remain gated behind the cookie banner in `<Analytics />`.)
 */
export function GoogleTagManager() {
  return (
    <Script id="gtm-loader" strategy="afterInteractive">{`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');
`}</Script>
  )
}

/** A second Tag Manager container, added alongside the first. */
export const GTM_ID_SECONDARY = 'GTM-M8PSRKT5'

/**
 * The second container, loaded the way it was handed over: the container
 * script itself, plus the `dataLayer` and `gtag()` it expects to find.
 *
 * Three things about where and how:
 *  - It sits in the PUBLIC layout, not the root one. The root layout wraps
 *    the admin panel too, and a tag container can run any script it holds on
 *    every page it loads on; the finance and personal-spending screens are
 *    not where a second one belongs. (The first container predates this and
 *    still loads everywhere.)
 *  - Both containers share one `dataLayer`. The first loader's snippet has
 *    already pushed the `gtm.js` event that Page View triggers wait for, and
 *    this container reads it from the queue, so it does not push a second
 *    one, which could make the first container count a page view twice.
 *  - Like the first, the loader is unconditional: consent for the tags
 *    inside is Consent Mode's job, set up in the container itself.
 *
 * Anything this container's tags call is also subject to the CSP in
 * next.config.js; a host it needs beyond Google's own has to be added there.
 */
export function SecondaryGoogleTagManager() {
  return (
    <>
      <Script id="gtm-secondary-init" strategy="afterInteractive">{`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
`}</Script>
      <Script
        id="gtm-secondary-loader"
        src={`https://www.googletagmanager.com/gtm.js?id=${GTM_ID_SECONDARY}`}
        strategy="afterInteractive"
      />
    </>
  )
}

/**
 * The `<noscript>` fallback iframe. Must be placed immediately after
 * the opening `<body>` tag so GTM still fires when JavaScript is
 * disabled.
 */
export function GoogleTagManagerNoScript() {
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager"
      />
    </noscript>
  )
}

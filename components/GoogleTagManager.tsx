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

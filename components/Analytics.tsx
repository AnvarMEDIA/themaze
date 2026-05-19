'use client'

import { useEffect, useState } from 'react'
import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Script from 'next/script'
import { EVENT, readConsent, type ConsentValue } from '@/lib/consent'

const YANDEX_COUNTER = 57206437

/**
 * All analytics — Yandex Metrika (with Webvisor), Vercel Analytics
 * and Vercel Speed Insights — render only after the user has
 * accepted the cookie banner. Strictly-necessary cookies (the admin
 * session, the consent choice itself) are not gated by this component.
 */
export function Analytics() {
  const [consent, setConsentState] = useState<ConsentValue | null>(null)

  useEffect(() => {
    setConsentState(readConsent())
    const onChange = (e: Event) => {
      setConsentState((e as CustomEvent<ConsentValue | null>).detail ?? readConsent())
    }
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [])

  if (consent !== 'accepted') return null

  return (
    <>
      <VercelAnalytics />
      <SpeedInsights />
      {/* Yandex.Metrika counter — loads only with consent */}
      <Script id="ym-loader" strategy="afterInteractive">{`
(function(m,e,t,r,i,k,a){
  m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*new Date();
  for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document,'script','https://mc.yandex.ru/metrika/tag.js', 'ym');
ym(${YANDEX_COUNTER}, 'init', {webvisor:true, clickmap:true, referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
`}</Script>
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc.yandex.ru/watch/${YANDEX_COUNTER}`}
            style={{ position: 'absolute', left: '-9999px' }}
            alt=""
          />
        </div>
      </noscript>
    </>
  )
}

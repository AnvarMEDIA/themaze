/**
 * What the public pages need from CSS when the browser runs no scripts.
 *
 * The site animates its content in. Framer Motion writes each element's
 * "before" state into the HTML the server sends
 * (style="opacity:0;transform:translateY(14px)") and a script then animates
 * out of it. The page template alone wraps every page that way, so with
 * scripts off a visitor got the header, the footer and an empty page between
 * them, for good.
 *
 * These rules put every such element in its finished state. They live in a
 * <noscript>, which a browser that runs scripts never reads as CSS: with
 * JavaScript on, none of this exists and nothing about the animations
 * changes. It is inline rather than a file so the first paint is already
 * right (the CSP allows inline styles).
 *
 * The comments are here and not in the CSS on purpose: the string is sent
 * with every page.
 */

const PAGE = '#main-content'

// An inline style that says opacity is exactly 0 (and not 0.5): the whole
// attribute, its first declaration, its last, or one in the middle. React
// writes styles without spaces, which is what these rely on.
const AT_ZERO = [
  '[style="opacity:0"]',
  '[style^="opacity:0;"]',
  '[style$=";opacity:0"]',
  '[style*=";opacity:0;"]',
]
// The three of those that can also carry a transform.
const AT_ZERO_AND_MOVED = AT_ZERO.slice(1).map((s) => `${s}[style*="transform:"]`)

const inPage = (selectors: string[]) => selectors.map((s) => `${PAGE} ${s}`).join(',')

// The native pointer comes back under the same condition globals.css takes
// it away, and with one more element in the selector so it wins whatever
// the order of the two sheets.
const POINTER_SCOPE = 'html:not(.native-cursor) body .noise'
const PRESSABLE = ['button:enabled', 'summary', 'label[for]', 'select', '[role="button"]', '[data-cursor]', '.cursor-pointer']

const CSS = [
  // Everything that waits at opacity 0 for its entrance: the page wrapper
  // (app/(public)/[locale]/template.tsx), <Reveal>, the sections' own
  // motion elements, the marquee. Only inside <main>: the header's
  // scroll-progress line is also at 0, and that is where it rests.
  `${inPage(AT_ZERO)}{opacity:1!important}`,

  // ...and the distance they were going to travel. Two cases, so that a
  // transform that is nobody's "before" state (the arrow that rests at
  // -45deg in the services list, a centring translate) is left alone:
  // an element that is both invisible and moved, and whatever rises
  // through a .reveal-mask (headings, <TextReveal> words), which waits
  // below the mask at full opacity.
  `${inPage([...AT_ZERO_AND_MOVED, '.reveal-mask>*'])}{transform:none!important}`,

  // <RevealImage> waits fully clipped.
  `${PAGE} [style*="clip-path:inset(0 0 100% 0)"]{clip-path:none!important}`,

  // The world map appears when a script sees it scroll into view (data-in).
  // Here it is simply there; the rings that pulse stay off.
  '.world-map .world-map-base,.world-map .world-map-country,.world-map .world-map-dot{opacity:1}',

  // Counters show their number at once. globals.css already does this for
  // (scripting: none); this covers browsers without that media feature,
  // which would otherwise wait three seconds for the safety timer.
  '.noise .counter[data-phase]{-webkit-text-fill-color:currentColor;animation:none}',

  // The header is fixed and clear, and a script gives it a background once
  // the page has scrolled. Without one it would ride over the text all the
  // way down, so it stays at the top of the page instead.
  '.noise>header{position:absolute}',

  // The custom cursor: only a script moves the dot and the ring out of the
  // corner, and globals.css hides the real pointer to make room for them.
  // Hide the two, and hand each element back the cursor the browser would
  // give it, plus a pointer on what can be pressed (the same list
  // globals.css uses where the native cursor is on).
  '[data-custom-cursor]{display:none!important}',
  '@media (hover:hover) and (pointer:fine){',
  `${POINTER_SCOPE} *{cursor:revert!important}`,
  `${PRESSABLE.map((s) => `${POINTER_SCOPE} ${s}`).join(',')}{cursor:pointer!important}`,
  '}',
].join('')

export function NoScriptStyles() {
  return (
    <noscript>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </noscript>
  )
}

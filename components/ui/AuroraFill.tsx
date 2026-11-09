/**
 * The moving gradient inside the "Start a project" button.
 *
 * Three layers, drawn by `.aurora*` in app/globals.css and clipped by the
 * button (`.aurora-btn`):
 *  - flow:  one long strip of colour that travels sideways for ever;
 *  - glow:  soft white light drifting the other way, which is where the
 *           pastel moments come from;
 *  - grain: a still film grain over both.
 *
 * Only `transform` moves, so the browser's compositor does all of it and the
 * page is never laid out or painted again for the animation.
 */
export function AuroraFill() {
  return (
    <span aria-hidden="true" className="aurora">
      <span className="aurora__flow" />
      <span className="aurora__glow" />
      <span className="aurora__grain" />
    </span>
  )
}

/** How much faster the gradient runs under a mouse pointer. */
const STIR = 2.4

function setRate(el: Element, rate: number) {
  if (typeof el.getAnimations !== 'function') return
  for (const a of el.getAnimations({ subtree: true })) {
    // Only the gradient's own loops, not a hover transition caught mid-way.
    // updatePlaybackRate keeps the current position, so the flow speeds up
    // and slows down without jumping.
    if ((a as CSSAnimation).animationName?.startsWith('aurora-')) a.updatePlaybackRate(rate)
  }
}

/**
 * Spread on the button itself: while a mouse is over it, the gradient stirs
 * faster. A touch does nothing here, since a tap "hovers" until the next tap.
 */
export const auroraStir = {
  onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse') setRate(e.currentTarget, STIR)
  },
  onPointerLeave: (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse') setRate(e.currentTarget, 1)
  },
}

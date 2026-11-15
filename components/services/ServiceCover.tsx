/**
 * A service page's cover, the whole width of the screen, between the hero
 * and the intro: the desktop picture, and below 768px the 4:3 one when there
 * is one (else the desktop picture, cut to 4:3). The frame's height is set
 * by CSS (.service-cover in app/globals.css) before the picture arrives, so
 * nothing moves when it does; it is fetched first, as the likely LCP.
 *
 * Plain <picture>, not next/image: the files are already WebP at their
 * final widths (lib/serviceCoverImage), and two sources by breakpoint is
 * what <picture> is for.
 */
export function ServiceCover({ desktop, mobile, alt }: { desktop: string; mobile: string | null; alt: string }) {
  return (
    <picture>
      {mobile && <source media="(max-width: 767px)" srcSet={mobile} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={desktop}
        alt={alt}
        className="service-cover"
        width={2560}
        height={800}
        // Lower case: this React does not know fetchPriority yet, as next/image works around too.
        {...{ fetchpriority: 'high' }}
        decoding="async"
      />
    </picture>
  )
}

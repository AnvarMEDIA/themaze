import { STYLE_SHAPES, type Shape } from '@/lib/styleShapes'

/**
 * The little drawings for the brief's aesthetic directions, by style id,
 * drawn as SVG from lib/styleShapes (the PDF draws the same data). In
 * currentColor, so the card or tile that holds one decides its colour.
 */

function shape(s: Shape, i: number) {
  const ink = (fill?: boolean, stroke?: number) => ({
    fill: fill ? 'currentColor' : 'none',
    ...(stroke ? { stroke: 'currentColor', strokeWidth: stroke } : {}),
  })
  switch (s.t) {
    case 'rect':    return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} opacity={s.opacity} {...ink(s.fill, s.stroke)} />
    case 'line':    return <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} opacity={s.opacity} stroke="currentColor" strokeWidth={s.stroke} />
    case 'circle':  return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} opacity={s.opacity} {...ink(s.fill, s.stroke)} />
    case 'path':    return <path key={i} d={s.d} opacity={s.opacity} {...ink(s.fill)} />
    case 'polygon': return <polygon key={i} points={s.points} opacity={s.opacity} {...ink(s.fill, s.stroke)} />
  }
}

export const STYLE_ART: Record<string, React.ReactNode> = Object.fromEntries(
  Object.entries(STYLE_SHAPES).map(([id, shapes]) => [
    id,
    <svg key={id} viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      {shapes.map(shape)}
    </svg>,
  ]),
)

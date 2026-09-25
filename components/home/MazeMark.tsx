import { mazeOfM } from '@/lib/maze'

/** When the first step of the route appears, and how far apart the rest are. */
const START_MS = 250
const STEP_MS  = 18
/** How far the route runs out of the maze below the frame, in cells. */
const STUB = 0.9

/**
 * The maze, drawn as it is solved.
 *
 * A server component on purpose: the layout is decided once per request from
 * the maze number, so the HTML already contains the finished drawing and
 * there is nothing to hydrate. The only motion is CSS — each step of the
 * route fading in after the one before it.
 */
export function MazeMark({ seed, label, className }: { seed: number; label: string; className?: string }) {
  const { cols, rows, walls, route } = mazeOfM(seed)
  const centre = (i: number) => [route[i][0] + 0.5, route[i][1] + 0.5] as const

  // One line per step, so each can arrive on its own beat: in through the
  // opening at the foot of the left leg, cell to cell, and out at the right.
  const steps: Array<readonly [number, number, number, number]> = []
  const [ex, ey] = centre(0)
  steps.push([ex, rows + STUB, ex, ey])
  for (let i = 1; i < route.length; i++) {
    const [x0, y0] = centre(i - 1)
    const [x1, y1] = centre(i)
    steps.push([x0, y0, x1, y1])
  }
  const [lx, ly] = centre(route.length - 1)
  steps.push([lx, ly, lx, rows + STUB])

  return (
    <svg
      viewBox={`-0.1 -0.1 ${cols + 0.2} ${rows + STUB + 0.2}`}
      role="img"
      aria-label={label}
      className={className}
    >
      <path
        d={walls}
        fill="none"
        stroke="rgb(var(--muted) / 0.45)"
        strokeWidth={1}
        strokeLinecap="square"
        vectorEffect="non-scaling-stroke"
      />
      <g stroke="rgb(var(--lime))" strokeWidth={0.26} strokeLinecap="square">
        {steps.map(([x1, y1, x2, y2], i) => (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            className="maze-step"
            style={{ animationDelay: `${START_MS + i * STEP_MS}ms` }}
          />
        ))}
      </g>
    </svg>
  )
}

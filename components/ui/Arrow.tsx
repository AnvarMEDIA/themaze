import { cn } from '@/lib/utils'

// Crisp SVG arrows (per the UI/UX skill: use real SVG icons, never text
// glyphs / emoji). currentColor + sized to 1em so they inherit text
// colour and size and animate cleanly on group-hover.
const PATHS = {
  right:      'M5 12h14M13 5l7 7-7 7',
  'up-right': 'M7 17L17 7M7 7h10v10',
  left:       'M19 12H5M11 5l-7 7 7 7',
  down:       'M12 5v14M5 12l7 7 7-7',
} as const

export function Arrow({
  direction = 'right',
  className,
  strokeWidth = 2,
}: {
  direction?: keyof typeof PATHS
  className?: string
  strokeWidth?: number
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('w-[1em] h-[1em] shrink-0', className)}
    >
      <path d={PATHS[direction]} />
    </svg>
  )
}

/**
 * The maze on the homepage.
 *
 * A perfect maze — exactly one route between any two cells — grown around a
 * route fixed in advance: up the left leg, down a staircase to the middle, up
 * a staircase, down the right leg. The only way from the entrance to the exit
 * therefore draws an M, whatever the rest of the maze looks like.
 *
 * The rest is random, seeded, so every visit gets a different maze with the
 * same way through. Seeded rather than Math.random() so a given number always
 * rebuilds the same maze — the page prints it as "Maze no. N".
 *
 * Why the route stays unique: the route is carved first, then every other
 * cell joins the maze exactly once, through one opening into a cell that is
 * already part of it (a randomised depth-first search started from the
 * route). That makes the passages a spanning tree, and a tree has one path
 * between any two of its cells. Two route cells that sit side by side without
 * being consecutive keep the wall between them, because only new cells are
 * ever carved into.
 */

export type Cell = readonly [col: number, row: number]

export interface Maze {
  cols: number
  rows: number
  /** Every wall as one SVG path, in cell units (a cell is 1×1). */
  walls: string
  /** The way through, entrance to exit, one cell at a time. */
  route: Cell[]
}

/* Proportions chosen by eye: 7 steps across each half of the M and two rows
   per step keep the staircase rhythm regular (1 across, 2 down), and a
   one-cell margin buries the letter inside the maze instead of drawing it on
   the frame. 17 × 17 cells. */
const HALF   = 7   // cells from a leg to the middle column
const MARGIN = 1   // maze cells outside the letter, left, right and above
const LEG    = 16  // height of each leg, in cells
const DROP   = 12  // how far the middle of the M comes down

/** mulberry32 — small, fast and good enough to lay out a maze. */
function random(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * An orthogonal staircase between two cells, excluding the start. The first
 * and last moves are across: the stroke has to leave the top of a leg
 * sideways, and it has to meet the other half of the letter sideways, or the
 * two halves would share a cell and the route would cross itself.
 */
function staircase(from: Cell, to: Cell): Cell[] {
  const [x0, y0] = from
  const across = to[0] - x0
  const down   = to[1] - y0
  const sx = Math.sign(across)
  const steps = Math.abs(across)
  const gaps  = steps - 1
  const out: Cell[] = []
  let x = x0
  let y = y0
  let dropped = 0
  for (let i = 0; i < steps; i++) {
    x += sx
    out.push([x, y])
    if (i < gaps) {
      const target = Math.round(((i + 1) * down) / gaps)
      while (dropped < target) {
        y += 1
        dropped += 1
        out.push([x, y])
      }
    }
  }
  return out
}

/** The letter itself, from the foot of the left leg to the foot of the right. */
function routeOfM(): { cols: number; rows: number; route: Cell[] } {
  const cols   = 2 * HALF + 1 + 2 * MARGIN
  const rows   = MARGIN + LEG
  const left   = MARGIN
  const right  = cols - 1 - MARGIN
  const middle = (cols - 1) / 2
  const top    = MARGIN
  const vertex: Cell = [middle, top + DROP]

  const route: Cell[] = []
  for (let r = rows - 1; r >= top; r--) route.push([left, r])
  route.push(...staircase([left, top], vertex))
  // The right half mirrors the left: walk it from the top-right corner to
  // the vertex, then reverse, dropping the vertex that is already there.
  const rightHalf = staircase([right, top], vertex).reverse().slice(1)
  route.push(...rightHalf, [right, top])
  for (let r = top + 1; r < rows; r++) route.push([right, r])
  return { cols, rows, route }
}

export function mazeOfM(seed: number): Maze {
  const { cols, rows, route } = routeOfM()
  const rand = random(seed)
  const id = (c: number, r: number) => r * cols + c
  const passage = (a: number, b: number) => (a < b ? a * cols * rows + b : b * cols * rows + a)

  const inMaze = new Set<number>()
  const open   = new Set<number>()
  route.forEach(([c, r], i) => {
    inMaze.add(id(c, r))
    if (i > 0) open.add(passage(id(route[i - 1][0], route[i - 1][1]), id(c, r)))
  })

  // Grow the rest from the route, depth first, in a shuffled order so the
  // branches don't all sprout from the same end.
  const stack = route.map(([c, r]) => id(c, r))
  for (let i = stack.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[stack[i], stack[j]] = [stack[j], stack[i]]
  }
  while (stack.length > 0) {
    const here = stack[stack.length - 1]
    const c = here % cols
    const r = (here - c) / cols
    const next = ([[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]] as const).filter(
      ([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows && !inMaze.has(id(x, y)),
    )
    if (next.length === 0) {
      stack.pop()
      continue
    }
    const [x, y] = next[Math.floor(rand() * next.length)]
    open.add(passage(here, id(x, y)))
    inMaze.add(id(x, y))
    stack.push(id(x, y))
  }

  // Walls, merged into the longest straight runs so the path stays short.
  const entrance = route[0][0]
  const exit     = route[route.length - 1][0]
  let walls = ''
  for (let y = 0; y <= rows; y++) {
    let start = -1
    for (let c = 0; c <= cols; c++) {
      const wall =
        c < cols &&
        (y === 0 ||
          (y === rows ? c !== entrance && c !== exit : !open.has(passage(id(c, y - 1), id(c, y)))))
      if (wall && start < 0) start = c
      if (!wall && start >= 0) {
        walls += `M${start} ${y}H${c}`
        start = -1
      }
    }
  }
  for (let x = 0; x <= cols; x++) {
    let start = -1
    for (let r = 0; r <= rows; r++) {
      const wall = r < rows && (x === 0 || x === cols || !open.has(passage(id(x - 1, r), id(x, r))))
      if (wall && start < 0) start = r
      if (!wall && start >= 0) {
        walls += `M${x} ${start}V${r}`
        start = -1
      }
    }
  }

  return { cols, rows, walls, route }
}

/** A maze number for this visit: five digits, printed as "Maze no. 48213". */
export function newMazeNumber(): number {
  return 10000 + Math.floor(Math.random() * 90000)
}

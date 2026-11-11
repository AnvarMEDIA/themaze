/**
 * The drawings of the brief's aesthetic directions, as data: a few shapes on
 * an 80×80 grid, in one ink. The form's cards and the brief sheet draw them
 * as SVG (components/brief/styleArt), the brief PDF with react-pdf's own SVG
 * (lib/pdf/briefPdf), so a client sees the same picture in both.
 */

export type Shape =
  | { t: 'rect'; x: number; y: number; w: number; h: number; rx?: number; fill?: boolean; stroke?: number; opacity?: number }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: number; opacity?: number }
  | { t: 'circle'; cx: number; cy: number; r: number; fill?: boolean; stroke?: number; opacity?: number }
  | { t: 'path'; d: string; fill?: boolean; opacity?: number }
  | { t: 'polygon'; points: string; fill?: boolean; stroke?: number; opacity?: number }

export const STYLE_SHAPES: Record<string, Shape[]> = {
  bold: [
    { t: 'rect', x: 8, y: 14, w: 64, h: 16, rx: 2, fill: true },
    { t: 'rect', x: 8, y: 36, w: 44, h: 16, rx: 2, fill: true },
    { t: 'rect', x: 8, y: 58, w: 24, h: 10, rx: 2, fill: true, opacity: 0.45 },
  ],
  minimal: [
    { t: 'line', x1: 8, y1: 40, x2: 72, y2: 40, stroke: 1 },
    { t: 'circle', cx: 40, cy: 40, r: 3.5, fill: true },
    { t: 'line', x1: 8, y1: 52, x2: 48, y2: 52, stroke: 0.75, opacity: 0.4 },
  ],
  playful: [
    { t: 'circle', cx: 24, cy: 34, r: 16, fill: true, opacity: 0.25 },
    { t: 'circle', cx: 50, cy: 50, r: 16, fill: true, opacity: 0.45 },
    { t: 'circle', cx: 58, cy: 28, r: 10, fill: true, opacity: 0.7 },
  ],
  classic: [
    { t: 'line', x1: 40, y1: 10, x2: 40, y2: 70, stroke: 0.75 },
    { t: 'line', x1: 10, y1: 40, x2: 70, y2: 40, stroke: 0.75 },
    { t: 'rect', x: 24, y: 24, w: 32, h: 32, stroke: 0.75 },
    { t: 'circle', cx: 40, cy: 40, r: 9, stroke: 0.75 },
  ],
  tech: [
    { t: 'rect', x: 8,  y: 8,  w: 18, h: 18, stroke: 1 },
    { t: 'rect', x: 31, y: 8,  w: 18, h: 18, fill: true, opacity: 0.8 },
    { t: 'rect', x: 54, y: 8,  w: 18, h: 18, stroke: 1 },
    { t: 'rect', x: 8,  y: 31, w: 18, h: 18, stroke: 1, opacity: 0.4 },
    { t: 'rect', x: 54, y: 31, w: 18, h: 18, fill: true, opacity: 0.3 },
    { t: 'line', x1: 8, y1: 72, x2: 72, y2: 8, stroke: 0.75, opacity: 0.35 },
  ],
  luxury: [
    { t: 'line', x1: 40, y1: 8,  x2: 40, y2: 72, stroke: 0.5 },
    { t: 'line', x1: 16, y1: 28, x2: 64, y2: 28, stroke: 0.5 },
    { t: 'line', x1: 16, y1: 52, x2: 64, y2: 52, stroke: 0.5 },
    // A 14-wide square turned 45° about the centre.
    { t: 'polygon', points: '40,30.1 49.9,40 40,49.9 30.1,40', fill: true, opacity: 0.85 },
  ],
  organic: [
    { t: 'path', d: 'M18,42 C18,22 34,12 52,20 C66,26 70,44 56,58 C44,70 18,62 18,42Z', fill: true, opacity: 0.3 },
    { t: 'circle', cx: 38, cy: 38, r: 9, fill: true, opacity: 0.7 },
  ],
  abstract: [
    { t: 'circle', cx: 30, cy: 36, r: 18, fill: true, opacity: 0.25 },
    { t: 'circle', cx: 52, cy: 46, r: 18, fill: true, opacity: 0.25 },
    { t: 'polygon', points: '40,12 68,62 12,62', stroke: 1.5, opacity: 0.7 },
  ],
}

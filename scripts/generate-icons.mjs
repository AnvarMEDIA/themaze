/**
 * Generates the favicon / app-icon set and the web manifest into public/.
 *
 * Run with `npm run icons` after changing the mark or the brand colours.
 * The mark is drawn as a path, not type, so it rasterises identically
 * wherever this runs — no font dependency, no design tool in the loop.
 */
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const OUT  = new URL('../public/', import.meta.url).pathname.replace(/\/$/, '')
const INK  = '#080808'
const LIME = '#C8FF47'

/**
 * The M, as a stroked polyline: legible down to 16 px where type is mush.
 * Inset so the strokes clear the tile's rounded corners on every size.
 */
const mark = (stroke) => `
  <path d="M26 74 L26 32 L50 58 L74 32 L74 74"
        fill="none" stroke="${stroke}" stroke-width="13"
        stroke-linecap="square" stroke-linejoin="miter" />`

/** Rounded tile for the browser tab / desktop. */
const tile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${INK}"/>
  ${mark(LIME)}
</svg>`

/** iOS masks the corners itself, so this one is full-bleed. */
const appleTile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${INK}"/>
  ${mark(LIME)}
</svg>`

/** Android maskable icons are cropped to a circle: keep the mark inside 80%. */
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${INK}"/>
  <g transform="translate(50 50) scale(0.72) translate(-50 -50)">${mark(LIME)}</g>
</svg>`

const png = (svg, size) =>
  sharp(Buffer.from(svg)).resize(size, size, { fit: 'contain' }).png({ compressionLevel: 9 }).toBuffer()

/** ICO container wrapping PNG entries (universally supported since Vista). */
function ico(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)              // reserved
  header.writeUInt16LE(1, 2)              // type: icon
  header.writeUInt16LE(images.length, 4)

  const dir = Buffer.alloc(16 * images.length)
  let offset = header.length + dir.length
  images.forEach(({ size, data }, i) => {
    const e = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, e)      // width  (0 means 256)
    dir.writeUInt8(size >= 256 ? 0 : size, e + 1)  // height
    dir.writeUInt8(0, e + 2)                       // palette size
    dir.writeUInt8(0, e + 3)                       // reserved
    dir.writeUInt16LE(1, e + 4)                    // colour planes
    dir.writeUInt16LE(32, e + 6)                   // bits per pixel
    dir.writeUInt32LE(data.length, e + 8)
    dir.writeUInt32LE(offset, e + 12)
    offset += data.length
  })

  return Buffer.concat([header, dir, ...images.map((i) => i.data)])
}

const write = (name, buf) => {
  writeFileSync(`${OUT}/${name}`, buf)
  console.log(`✓ ${name.padEnd(24)} ${String(buf.length).padStart(6)} bytes`)
}

for (const size of [16, 32, 48, 192, 512]) {
  const buf = await png(tile, size)
  if (size <= 32) write(`favicon-${size}x${size}.png`, buf)
  if (size >= 192) write(`icon-${size}.png`, buf)
}

write('apple-touch-icon.png', await png(appleTile, 180))
write('icon-512-maskable.png', await png(maskable, 512))

write('favicon.ico', ico(await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, data: await png(tile, size) })),
)))

const manifest = {
  name: 'MAZE Studio — Branding & Design',
  short_name: 'MAZE',
  description: 'Branding and design studio in Tashkent, Uzbekistan.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: INK,
  theme_color: INK,
  lang: 'en',
  dir: 'ltr',
  categories: ['design', 'business'],
  icons: [
    { src: '/favicon-32x32.png',      sizes: '32x32',   type: 'image/png' },
    { src: '/icon-192.png',           sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png',           sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-512-maskable.png',  sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
write('site.webmanifest', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'))

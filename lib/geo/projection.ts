/**
 * The dotted world map's projection: plain equirectangular, latitude cropped
 * to 84°N–56°S. scripts/generate-world-map.mjs draws the dots with the same
 * numbers; change one and regenerate the other.
 *
 * Kept free of the dot data so the homepage can place its markers without
 * shipping the map to the browser.
 */
export const MAP_COLS       = 180
export const MAP_ROWS       = 70
export const MAP_LAT_TOP    = 84
export const MAP_LAT_BOTTOM = -56

/** Where a point sits on the map, in percent of its width and height. */
export function toMap(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng + 180) / 360) * 100,
    y: ((MAP_LAT_TOP - lat) / (MAP_LAT_TOP - MAP_LAT_BOTTOM)) * 100,
  }
}

/** The point under a spot on the map (percent), for placing a city by click. */
export function fromMap(x: number, y: number): { lat: number; lng: number } {
  const round = (n: number) => Math.round(n * 100) / 100
  return {
    lat: round(MAP_LAT_TOP - (y / 100) * (MAP_LAT_TOP - MAP_LAT_BOTTOM)),
    lng: round((x / 100) * 360 - 180),
  }
}

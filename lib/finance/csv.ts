/**
 * CSV emission shared by the finance exports.
 *
 * Two things spreadsheets get wrong unless you handle them:
 *  - a cell starting with =, +, - or @ is executed as a formula, so a category
 *    someone typed becomes code on the accountant's machine;
 *  - a UTF-8 file without a BOM opens as mojibake in Excel, which is fatal for
 *    Cyrillic client names.
 */

/** RFC 4180 quoting, with the formula-injection prefix guard. */
export function csvCell(value: string | number | undefined | null): string {
  const s = value === undefined || value === null ? '' : String(value)
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** Join rows into a CSV body, BOM-prefixed and CRLF-terminated for Excel. */
export function csvBody(rows: (string | number | undefined | null)[][]): string {
  return `﻿${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`
}

/** Standard headers for a CSV download. */
export function csvHeaders(filename: string): Record<string, string> {
  return {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  }
}

/** "2026-01-01_2026-03-31" / "all" — the period stamp used in filenames. */
export function periodStamp(period: { from: string; to: string }): string {
  return period.from || period.to ? `${period.from || 'start'}_${period.to || 'today'}` : 'all'
}

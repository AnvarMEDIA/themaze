'use client'

import { useEffect } from 'react'

/**
 * Screen-only toolbar for the brief print sheet: triggers the browser's print
 * dialog (where "Save as PDF" produces the file) and switches the sheet's
 * label language. Hidden from the printed output via .no-print.
 */
export function BriefPrintActions({ lang, name }: { lang: 'en' | 'ru'; name: string }) {
  // A readable default filename — browsers use document.title for "Save as PDF".
  useEffect(() => {
    const previous = document.title
    const slug = name.trim().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '') || 'brief'
    document.title = `${lang === 'ru' ? 'Бриф' : 'Brief'}-${slug}`
    return () => { document.title = previous }
  }, [lang, name])

  const other = lang === 'ru' ? 'en' : 'ru'

  return (
    <div className="no-print" style={wrap}>
      <a href={`?lang=${other}`} style={ghost}>
        {other.toUpperCase()}
      </a>
      <button type="button" onClick={() => window.print()} style={primary}>
        {lang === 'ru' ? 'Скачать PDF' : 'Download PDF'}
      </button>
      <span style={hint}>
        {lang === 'ru'
          ? 'В диалоге печати выберите «Сохранить как PDF»'
          : 'Choose “Save as PDF” in the print dialog'}
      </span>
    </div>
  )
}

const wrap: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 10,
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 16px',
  background: '#0D0D0D', borderBottom: '1px solid #1E1E1E',
}

const primary: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 8, border: 'none',
  background: '#C8FF47', color: '#0A0A0A',
  fontSize: 13, fontWeight: 700, cursor: 'pointer',
}

const ghost: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8,
  border: '1px solid #2A2A2A', background: '#161616', color: '#ddd',
  fontSize: 12, fontWeight: 700, textDecoration: 'none', letterSpacing: '.06em',
}

const hint: React.CSSProperties = { fontSize: 12, color: '#777' }

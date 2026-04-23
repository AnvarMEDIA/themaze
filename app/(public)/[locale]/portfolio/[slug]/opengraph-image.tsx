import { ImageResponse } from 'next/og'
import { getProjectBySlug } from '@/lib/portfolio'

export const runtime = 'nodejs'
export const alt = 'MAZE Studio project'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

interface Props {
  params: { locale: string; slug: string }
}

async function loadFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const cssRes = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } },
    )
    if (!cssRes.ok) return null
    const css  = await cssRes.text()
    const url  = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|woff2)'\)/)?.[1]
    if (!url) return null
    const font = await fetch(url)
    if (!font.ok) return null
    return await font.arrayBuffer()
  } catch {
    return null
  }
}

export default async function Image({ params }: Props) {
  const project = await getProjectBySlug(params.slug)

  const isRu   = params.locale === 'ru'
  const title  = project
    ? (isRu ? (project.titleRu || project.title) : project.title)
    : 'MAZE Studio'
  const client = project?.client ?? 'Branding & Design Studio'
  const accent = project?.accentColor && /^#[0-9A-Fa-f]{3,8}$/.test(project.accentColor)
    ? project.accentColor
    : '#C8FF47'
  const categoryLabel = project?.categories?.[0]
    ? (isRu ? translateCategory(project.categories[0]) : project.categories[0].replace('-', '/'))
    : (isRu ? 'Брендинг и дизайн' : 'Branding & Design')

  const [bold, regular] = await Promise.all([
    loadFont('Manrope', 800),
    loadFont('Manrope', 400),
  ])

  type FontEntry = { name: string; data: ArrayBuffer; weight: 400 | 800; style: 'normal' }
  const fonts: FontEntry[] = [
    bold    && { name: 'Manrope', data: bold,    weight: 800 as const, style: 'normal' as const },
    regular && { name: 'Manrope', data: regular, weight: 400 as const, style: 'normal' as const },
  ].filter(Boolean) as FontEntry[]

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: '#080808',
          color: '#EDEBE3',
          fontFamily: 'Manrope, "Segoe UI", system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Accent splash */}
        <div
          style={{
            position: 'absolute',
            right: -180,
            top: -180,
            width: 640,
            height: 640,
            borderRadius: '50%',
            background: accent,
            opacity: 0.16,
            filter: 'blur(40px)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: -120,
            bottom: -200,
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: accent,
            opacity: 0.10,
            filter: 'blur(40px)',
            display: 'flex',
          }}
        />

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: accent,
                display: 'flex',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2, color: '#EDEBE3' }}>MAZE STUDIO</span>
              <span style={{ fontSize: 14, color: '#8A8A8A', letterSpacing: 4, marginTop: 2 }}>TASHKENT — SINCE 2019</span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 20px',
              border: '1px solid #2A2A2A',
              borderRadius: 999,
              fontSize: 16,
              color: '#BFBFBF',
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}
          >
            {categoryLabel}
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flexDirection: 'column', zIndex: 1, maxWidth: 980 }}>
          <div
            style={{
              fontSize: 28,
              color: accent,
              letterSpacing: 4,
              textTransform: 'uppercase',
              marginBottom: 24,
              display: 'flex',
            }}
          >
            {client}
          </div>
          <div
            style={{
              fontSize: title.length > 40 ? 84 : 112,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: -2,
              color: '#EDEBE3',
              display: 'flex',
            }}
          >
            {title}
          </div>
        </div>

        {/* Footer row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 2, background: accent, display: 'flex' }} />
            <span style={{ fontSize: 18, color: '#9A9A9A', letterSpacing: 2 }}>
              {isRu ? 'ПРОЕКТ · MAZE.UZ' : 'CASE STUDY · MAZE.UZ'}
            </span>
          </div>
          {project?.year && (
            <span style={{ fontSize: 18, color: '#5A5A5A', letterSpacing: 4 }}>
              {project.year}
            </span>
          )}
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}

function translateCategory(c: string): string {
  const map: Record<string, string> = {
    branding: 'Брендинг',
    rebranding: 'Ребрендинг',
    identity: 'Айдентика',
    naming: 'Нейминг',
    packaging: 'Упаковка',
    'ui-ux': 'UI/UX',
    print: 'Полиграфия',
    motion: 'Motion',
    strategy: 'Стратегия',
  }
  return map[c] ?? c
}

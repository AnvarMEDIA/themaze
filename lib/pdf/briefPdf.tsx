import path from 'path'
import {
  Circle, Document, Font, Line, Link, Page, Path, Polygon, Rect, StyleSheet, Svg, Text, View, renderToBuffer,
} from '@react-pdf/renderer'
import type { Brief } from '@/lib/briefs'
import type { BriefLabels } from '@/lib/briefContent'
import type { BriefLang } from '@/lib/briefTexts'
import { formatSiteTime } from '@/lib/siteTime'
import { STYLE_SHAPES, type Shape } from '@/lib/styleShapes'
import { MAZE_LOGO } from './mazeLogo'

/**
 * A sent brief as a PDF file: an A4 document in the site's own type and
 * monochrome, made on the server and downloaded from the admin
 * (app/api/brief/[id]/pdf). A real file, where the admin used to print an
 * HTML page to PDF through the browser's dialog.
 *
 * Two faces, embedded from assets/fonts (the PDF standard fonts have no
 * Cyrillic, and a client writes in Russian as often as not):
 * - Manrope, the site's own face, for the text: answers, labels, the footer.
 * - Google Sans Flex for display: the client's name, the
 *   summary strip, the section headings and their numbers. It has no
 *   Cyrillic, so a display text with a character it lacks is set whole in
 *   Manrope instead (see `display`); a line never mixes the two.
 */

const INK   = '#0A0A0A'
const MUTED = '#6F6D64'
const FAINT = '#A9A79C'
const LINE  = '#E2E1DA'

const TEXT_FACE    = 'Manrope'
const DISPLAY_FACE = 'GoogleSansFlex'

const FACES = [
  { family: TEXT_FACE, fonts: [
    { file: 'Manrope-Regular.ttf',   fontWeight: 400 },
    { file: 'Manrope-SemiBold.ttf',  fontWeight: 600 },
    { file: 'Manrope-ExtraBold.ttf', fontWeight: 800 },
  ] },
  { family: DISPLAY_FACE, fonts: [
    { file: 'GoogleSansFlex-Medium.ttf',   fontWeight: 500 },
    { file: 'GoogleSansFlex-SemiBold.ttf', fontWeight: 600 },
    { file: 'GoogleSansFlex-Bold.ttf',     fontWeight: 700 },
  ] },
] as const

/** What the warm-up needs of a loaded font (fontkit's, inside react-pdf). */
type WarmableFont = { characterSet?: number[]; glyphForCodePoint?: (codePoint: number) => unknown }

/**
 * Ligatures a font also files under a code point of their own: Manrope's
 * «tt» is U+E009, «fi» U+FB01. They are left to the layout, which knows the
 * letters each one stands for; looked up here, «https» would copy as «h?ps».
 */
const isLigatureSlot = (cp: number) =>
  (cp >= 0xe000 && cp <= 0xf8ff) || cp >= 0xf0000 || (cp >= 0xfb00 && cp <= 0xfb4f)

let fontsReady: Promise<void> | null = null

/** The characters Google Sans Flex can set, once it is loaded. */
let displayCovers: Set<number> = new Set()

/**
 * Registers both faces once per process, then looks up every character
 * each font has before the first document is made.
 *
 * The look-up is a fix, not a nicety. Both faces build many letters from
 * others (Manrope's Cyrillic Т is its Latin T, В is B, С is C; Google Sans
 * Flex's é is e and an accent). Embedding a document makes the font library
 * load those borrowed glyphs, and it caches them without the characters
 * they stand for, for as long as the server process lives. The next brief
 * made by the same server then lost Latin letters: «ONTACT», «rganic», and
 * garbled text when copied or searched. Looked up first, character by
 * character, each glyph is cached with its own character, and nothing can
 * cache it bare later.
 */
function prepareFonts(): Promise<void> {
  fontsReady ??= (async () => {
    const dir = path.join(process.cwd(), 'assets', 'fonts')
    for (const face of FACES) {
      Font.register({
        family: face.family,
        fonts: face.fonts.map((f) => ({ src: path.join(dir, f.file), fontWeight: f.fontWeight })),
      })
    }
    // No hyphenation: the built-in rules are English and cut Russian words
    // in odd places; a line simply breaks between words.
    Font.registerHyphenationCallback((word) => [word])

    for (const face of FACES) {
      for (const { fontWeight } of face.fonts) {
        const source = Font.getFont({ fontFamily: face.family, fontWeight, fontStyle: 'normal' })
        await source.load()
        const font = source.data as unknown as WarmableFont | null
        const chars = font?.characterSet ?? []
        for (const codePoint of chars) {
          if (!isLigatureSlot(codePoint)) font?.glyphForCodePoint?.(codePoint)
        }
        if (face.family === DISPLAY_FACE && displayCovers.size === 0) displayCovers = new Set(chars)
      }
    }
  })().catch((err) => {
    // A failed start is tried again by the next request, not kept forever.
    fontsReady = null
    throw err
  })
  return fontsReady
}

/**
 * Google Sans Flex at `weight` for a display text it can set whole, as it
 * will print (`upper` for one shown in capitals); nothing, so the text
 * keeps its Manrope style, when a character is missing: Cyrillic, «№», «₽».
 */
function display(text: string | undefined, weight: number, upper = false): { fontFamily?: string; fontWeight?: number } {
  const shown = upper ? (text ?? '').toUpperCase() : (text ?? '')
  for (const ch of shown) {
    if (!/\s/.test(ch) && !displayCovers.has(ch.codePointAt(0)!)) return {}
  }
  return { fontFamily: DISPLAY_FACE, fontWeight: weight }
}

const T = {
  en: {
    doc: 'Client brief', submitted: 'Sent', ref: 'Ref.',
    studio: 'Branding & Design Studio · Tashkent, Uzbekistan',
    services: 'Services', budget: 'Budget', timeline: 'Timeline',
    s1: 'Contact', s2: 'Project', s3: 'Visual direction', s4: 'Other',
    phone: 'Phone', email: 'Email', website: 'Website',
    description: 'Project description', goals: 'Goals & challenges', audience: 'Target audience',
    competitors: 'Competitors & references', styles: 'Aesthetic', colors: 'Colour mood',
    refLinks: 'Reference links', source: 'How they found us', notes: 'Comments',
    page: (n: number, total: number) => `${n} / ${total}`,
  },
  ru: {
    doc: 'Бриф клиента', submitted: 'Отправлен', ref: '№',
    studio: 'Студия брендинга и дизайна · Ташкент, Узбекистан',
    services: 'Услуги', budget: 'Бюджет', timeline: 'Сроки',
    s1: 'Контакты', s2: 'Проект', s3: 'Визуальное направление', s4: 'Дополнительно',
    phone: 'Телефон', email: 'Email', website: 'Сайт',
    description: 'Описание проекта', goals: 'Цели и задачи', audience: 'Целевая аудитория',
    competitors: 'Конкуренты и референсы', styles: 'Стилистика', colors: 'Цветовое настроение',
    refLinks: 'Ссылки-референсы', source: 'Откуда узнали', notes: 'Комментарий',
    page: (n: number, total: number) => `${n} / ${total}`,
  },
} as const

const s = StyleSheet.create({
  page: {
    paddingTop: 44, paddingBottom: 72, paddingHorizontal: 50,
    // No lineHeight here: inherited from the page it makes react-pdf drop the
    // footer, whose page number is drawn late. Each text style sets its own.
    fontFamily: TEXT_FACE, fontSize: 10, color: INK, backgroundColor: '#FFFFFF',
  },

  head:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  studio:    { fontSize: 7.5, lineHeight: 1.3, color: MUTED, marginTop: 7 },
  headRight: { alignItems: 'flex-end' },
  docType:   { fontSize: 7.5, lineHeight: 1.2, fontWeight: 800, letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 5 },
  meta:      { fontSize: 7.5, color: MUTED, lineHeight: 1.5 },
  rule:      { height: 2, backgroundColor: INK, marginTop: 16, marginBottom: 22 },

  title:     { fontSize: 30, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.08 },
  subtitle:  { fontSize: 12, lineHeight: 1.3, color: MUTED, marginTop: 5 },

  summary:   { flexDirection: 'row', marginTop: 18, borderTopWidth: 1, borderTopColor: INK, borderBottomWidth: 0.5, borderBottomColor: LINE },
  cell:      { flex: 1, paddingTop: 9, paddingBottom: 10, paddingRight: 10 },
  cellRule:  { borderLeftWidth: 0.5, borderLeftColor: LINE, paddingLeft: 10 },
  cellLabel: { fontSize: 6.5, lineHeight: 1.3, fontWeight: 600, letterSpacing: 1.3, textTransform: 'uppercase', color: MUTED, marginBottom: 4 },
  cellValue: { fontSize: 9.5, fontWeight: 600, lineHeight: 1.3 },

  secHead:   { flexDirection: 'row', alignItems: 'flex-end', marginTop: 24, borderBottomWidth: 0.75, borderBottomColor: INK, paddingBottom: 6, marginBottom: 10 },
  secNum:    { fontSize: 8, lineHeight: 1.2, fontWeight: 600, color: FAINT, width: 24 },
  secTitle:  { fontSize: 8.5, lineHeight: 1.2, fontWeight: 800, letterSpacing: 1.6, textTransform: 'uppercase' },

  row:       { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: LINE },
  label:     { fontSize: 6.8, lineHeight: 1.3, fontWeight: 600, letterSpacing: 1.1, textTransform: 'uppercase', color: MUTED },
  rowLabel:  { width: 132, paddingTop: 2.5 },
  rowValue:  { flex: 1, fontSize: 10, lineHeight: 1.4 },
  link:      { color: INK, textDecoration: 'none' },

  block:     { marginTop: 12 },
  blockLabel:{ marginBottom: 5 },
  para:      { fontSize: 10, lineHeight: 1.55 },

  tiles:     { flexDirection: 'row', flexWrap: 'wrap' },
  tile:      { width: 96, marginRight: 8, marginBottom: 8 },
  tileArt:   { width: 44, height: 44, borderWidth: 0.75, borderColor: LINE, borderRadius: 6, padding: 5, marginBottom: 5 },
  tileLabel: { fontSize: 8, lineHeight: 1.3 },

  palette:   { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  swatch:    { width: 18, height: 18, borderRadius: 3, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.18)', marginRight: 3 },
  palLabel:  { fontSize: 9.5, lineHeight: 1.3, marginLeft: 6 },

  footer:    {
    position: 'absolute', bottom: 30, left: 50, right: 50,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 8,
    fontSize: 7, color: MUTED,
  },
})

/* ── Pieces ─────────────────────────────────────────────────────────────── */

/*
 * Sections, and the labelled blocks in them, are fragments: their pieces sit
 * in the page's own flow. react-pdf moves an element on to the next page for
 * the room it asks to keep below it (minPresenceAhead) only when something
 * comes before it in the same box, so a heading wrapped first in a box of
 * its own would stay behind at the foot of a page, alone.
 */
function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  const face = display(title, 700, true)
  return (
    <>
      {/* 100pt is room for a row of style tiles with their label, the
          tallest thing a section starts with. */}
      <View style={s.secHead} minPresenceAhead={100}>
        {/* The number takes its title's face: two faces' lines would not share a baseline. */}
        <Text style={[s.secNum, face.fontFamily ? { fontFamily: face.fontFamily } : {}]}>{n}</Text>
        <Text style={[s.secTitle, face]}>{title}</Text>
      </View>
      {children}
    </>
  )
}

function Row({ label, value, href }: { label: string; value?: string; href?: string }) {
  if (!value?.trim()) return null
  return (
    <View style={s.row} wrap={false}>
      <Text style={[s.label, s.rowLabel]}>{label}</Text>
      {href
        ? <Link src={href} style={[s.rowValue, s.link]}>{value}</Link>
        : <Text style={s.rowValue}>{value}</Text>}
    </View>
  )
}

function Long({ label, value, first = false }: { label: string; value?: string; first?: boolean }) {
  if (!value?.trim()) return null
  return (
    <>
      <Text style={first ? [s.label, s.blockLabel] : [s.label, s.blockLabel, s.block]} minPresenceAhead={30}>{label}</Text>
      <Text style={s.para}>{value.trim()}</Text>
    </>
  )
}

/** The studio's logo (lib/pdf/mazeLogo), `width` points wide. */
function Logo({ width }: { width: number }) {
  const { width: w, height: h, shapes } = MAZE_LOGO
  return (
    <Svg viewBox={`0 0 ${w} ${h}`} style={{ width, height: (width * h) / w }}>
      {shapes.map((shape, i) => shape.kind === 'path'
        ? <Path key={i} d={shape.d} fill={INK} />
        : <Polygon key={i} points={shape.points} fill={INK} />)}
    </Svg>
  )
}

function ShapeEl({ shape }: { shape: Shape }) {
  const fill = shape.t !== 'line' && shape.fill ? INK : 'none'
  const stroke = 'stroke' in shape && shape.stroke ? INK : undefined
  const common = { fill, stroke, strokeWidth: 'stroke' in shape ? shape.stroke : undefined, opacity: shape.opacity }
  switch (shape.t) {
    case 'rect':    return <Rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx} {...common} />
    case 'line':    return <Line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={INK} strokeWidth={shape.stroke} opacity={shape.opacity} />
    case 'circle':  return <Circle cx={shape.cx} cy={shape.cy} r={shape.r} {...common} />
    case 'path':    return <Path d={shape.d} fill={fill} opacity={shape.opacity} />
    case 'polygon': return <Polygon points={shape.points} {...common} />
  }
}

function StyleTile({ id, label }: { id: string; label: string }) {
  const shapes = STYLE_SHAPES[id]
  return (
    <View style={s.tile} wrap={false}>
      <View style={s.tileArt}>
        {shapes && (
          <Svg viewBox="0 0 80 80" style={{ width: 32.5, height: 32.5 }}>
            {shapes.map((shape, i) => <ShapeEl key={i} shape={shape} />)}
          </Svg>
        )}
      </View>
      <Text style={s.tileLabel}>{label}</Text>
    </View>
  )
}

/* ── The document ───────────────────────────────────────────────────────── */

export interface BriefPdfInput {
  brief: Brief
  lang: BriefLang
  /** How the brief's option ids read in `lang` (lib/briefContent). */
  labels: BriefLabels
  /** The studio's contacts for the footer: site, email, phone. */
  contacts: string[]
}

function BriefDocument({ brief, lang, labels, contacts }: BriefPdfInput) {
  const t = T[lang]
  const services = (brief.services ?? []).map((id) => labels.services[id] ?? id)
  const styles   = (brief.styles ?? []).map((id) => ({ id, label: labels.styles[id] ?? id }))
  const palettes = (brief.colors ?? []).map((id) => ({
    id, label: labels.palettes[id]?.label ?? id, swatches: labels.palettes[id]?.swatches ?? [],
  }))
  const sent = formatSiteTime(brief.createdAt, lang === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  // What a reader wants first, when the client gave it: what, how much,
  // by when. Each is said once: the sections below do not repeat it.
  const cells: Array<{ label: string; value: string | undefined }> = [
    { label: t.services, value: services.join(', ') },
    { label: t.budget,   value: brief.budget?.trim() },
    { label: t.timeline, value: brief.timeline?.trim() },
  ]
  const summary = cells.filter((c): c is { label: string; value: string } => !!c.value)

  const website = brief.website?.trim()
  const hasVisual = styles.length > 0 || palettes.length > 0 || !!brief.refLinks?.trim()
  const hasOther = !!(brief.source?.trim() || brief.notes?.trim())

  return (
    <Document
      title={`${t.doc}: ${brief.name}${brief.company?.trim() ? ` (${brief.company.trim()})` : ''}`}
      author="MAZE Studio" creator="maze.uz" producer="maze.uz" language={lang}
    >
      <Page size="A4" style={s.page}>
        <View style={s.footer} fixed>
          <Text>{contacts.join('    ·    ')}</Text>
          <Text render={({ pageNumber, totalPages }) => t.page(pageNumber, totalPages)} />
        </View>

        <View style={s.head}>
          <View>
            <Logo width={70} />
            <Text style={s.studio}>{t.studio}</Text>
          </View>
          <View style={s.headRight}>
            <Text style={s.docType}>{t.doc}</Text>
            <Text style={s.meta}>{t.submitted}: {sent}</Text>
            <Text style={s.meta}>{t.ref} {brief.id}</Text>
          </View>
        </View>
        <View style={s.rule} />

        <Text style={[s.title, display(brief.name, 600)]}>{brief.name}</Text>
        {brief.company?.trim() && <Text style={[s.subtitle, display(brief.company, 500)]}>{brief.company.trim()}</Text>}

        {summary.length > 0 && (
          <View style={s.summary} wrap={false}>
            {summary.map((c, i) => (
              <View key={c.label} style={i === 0 ? s.cell : [s.cell, s.cellRule]}>
                <Text style={s.cellLabel}>{c.label}</Text>
                <Text style={[s.cellValue, display(c.value, 600)]}>{c.value}</Text>
              </View>
            ))}
          </View>
        )}

        <Section n="01" title={t.s1}>
          <Row label={t.phone}   value={brief.phone} href={brief.phone ? `tel:${brief.phone.replace(/[^\d+]/g, '')}` : undefined} />
          <Row label={t.email}   value={brief.email} href={brief.email ? `mailto:${brief.email}` : undefined} />
          <Row label={t.website} value={website} href={website && /^https?:\/\//i.test(website) ? website : undefined} />
        </Section>

        <Section n="02" title={t.s2}>
          <Long label={t.description} value={brief.description} first />
          <Long label={t.goals}       value={brief.goals} />
          <Long label={t.audience}    value={brief.audience} />
          <Long label={t.competitors} value={brief.competitors} />
        </Section>

        {hasVisual && (
          <Section n="03" title={t.s3}>
            {/* The label and its tiles turn the page together. */}
            {styles.length > 0 && (
              <View wrap={false}>
                <Text style={[s.label, s.blockLabel]}>{t.styles}</Text>
                <View style={s.tiles}>
                  {styles.map((st) => <StyleTile key={st.id} id={st.id} label={st.label} />)}
                </View>
              </View>
            )}
            {palettes.length > 0 && (
              <>
                <Text style={styles.length > 0 ? [s.label, s.blockLabel, s.block] : [s.label, s.blockLabel]} minPresenceAhead={24}>
                  {t.colors}
                </Text>
                {palettes.map((p) => (
                  <View key={p.id} style={s.palette} wrap={false}>
                    {p.swatches.map((hex, i) => <View key={i} style={[s.swatch, { backgroundColor: hex }]} />)}
                    <Text style={s.palLabel}>{p.label}</Text>
                  </View>
                ))}
              </>
            )}
            <Long label={t.refLinks} value={brief.refLinks} first={styles.length === 0 && palettes.length === 0} />
          </Section>
        )}

        {hasOther && (
          <Section n="04" title={t.s4}>
            <Row label={t.source} value={brief.source} />
            <Long label={t.notes} value={brief.notes} first={!brief.source?.trim()} />
          </Section>
        )}
      </Page>
    </Document>
  )
}

export async function renderBriefPdf(input: BriefPdfInput): Promise<Buffer> {
  await prepareFonts()
  return renderToBuffer(<BriefDocument {...input} />)
}

/** "Бриф — Gulzor Sahatova — 2026-11-12.pdf", and a plain-ASCII twin for old clients. */
export function briefPdfFilename(brief: Brief, lang: BriefLang): { utf8: string; ascii: string } {
  const day = formatSiteTime(brief.createdAt, 'en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const who = [brief.name, brief.company].map((x) => x?.trim()).filter(Boolean).join(', ')
  const clean = (x: string) => x.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
  const utf8 = `${lang === 'ru' ? 'Бриф' : 'Brief'} — ${clean(who) || brief.id} — ${day}.pdf`
  const ascii = `brief-${brief.id}-${day}.pdf`
  return { utf8, ascii }
}

import { notFound } from 'next/navigation'
import { getBriefs, type Brief } from '@/lib/briefs'
import { BriefPrintActions } from '@/components/admin/BriefPrintActions'

/**
 * Print sheet for a single brief — A4, light, made to be saved as PDF from the
 * browser's print dialog.
 *
 * Rendered as HTML rather than generated with a PDF library on purpose: the
 * content is client-written Cyrillic, and print CSS uses the same webfont the
 * site already loads instead of requiring an embedded font, while `@page`
 * gives exact A4 geometry. It also keeps the serverless bundle free of a PDF
 * engine.
 *
 * Lives under /admin, so the existing middleware already requires an admin
 * session to open it.
 */

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
  searchParams: { lang?: string }
}

type Lang = 'en' | 'ru'

const T: Record<Lang, Record<string, string>> = {
  en: {
    docType: 'Client brief', submitted: 'Submitted', ref: 'Ref',
    s1: 'Contact', s2: 'Project', s3: 'Visual direction', s4: 'Timeline & budget',
    name: 'Name', company: 'Company', phone: 'Phone', email: 'Email', website: 'Website',
    services: 'Services requested', description: 'Project description', goals: 'Goals',
    audience: 'Target audience', competitors: 'Competitors / references',
    styles: 'Aesthetic', colors: 'Colour mood', refLinks: 'Reference links',
    timeline: 'Timeline', budget: 'Budget', source: 'How they found us', notes: 'Additional notes',
    footer: 'Branding & Design Studio · Tashkent, Uzbekistan',
    empty: '—',
  },
  ru: {
    docType: 'Бриф клиента', submitted: 'Отправлен', ref: '№',
    s1: 'Контакты', s2: 'Проект', s3: 'Визуальное направление', s4: 'Сроки и бюджет',
    name: 'Имя', company: 'Компания', phone: 'Телефон', email: 'Email', website: 'Сайт',
    services: 'Запрошенные услуги', description: 'Описание проекта', goals: 'Цели',
    audience: 'Целевая аудитория', competitors: 'Конкуренты / референсы',
    styles: 'Стилистика', colors: 'Цветовое настроение', refLinks: 'Ссылки-референсы',
    timeline: 'Сроки', budget: 'Бюджет', source: 'Откуда узнали', notes: 'Дополнительно',
    footer: 'Брендинг и дизайн студия · Ташкент, Узбекистан',
    empty: '—',
  },
}

const SERVICE_LABELS: Record<Lang, Record<string, string>> = {
  en: {
    branding: 'Branding', rebranding: 'Rebranding', identity: 'Visual Identity', naming: 'Naming',
    packaging: 'Packaging', 'ui-ux': 'UI / UX Design', print: 'Print & Packaging',
    motion: 'Motion Design', strategy: 'Brand Strategy', unsure: 'Not sure yet',
  },
  ru: {
    branding: 'Брендинг', rebranding: 'Ребрендинг', identity: 'Айдентика', naming: 'Нейминг',
    packaging: 'Упаковка', 'ui-ux': 'UI / UX дизайн', print: 'Печать и упаковка',
    motion: 'Моушн-дизайн', strategy: 'Бренд-стратегия', unsure: 'Пока не решили',
  },
}

const STYLE_LABELS: Record<Lang, Record<string, string>> = {
  en: {
    bold: 'Bold & Powerful', minimal: 'Minimal & Clean', playful: 'Playful & Friendly',
    classic: 'Classic & Timeless', tech: 'Technical & Modern', luxury: 'Luxurious & Premium',
    organic: 'Organic & Natural', abstract: 'Abstract & Expressive',
  },
  ru: {
    bold: 'Смелый и мощный', minimal: 'Минимализм', playful: 'Игривый и дружелюбный',
    classic: 'Классический', tech: 'Технологичный', luxury: 'Премиальный',
    organic: 'Органичный', abstract: 'Абстрактный',
  },
}

const COLOR_LABELS: Record<Lang, Record<string, string>> = {
  en: {
    dark: 'Dark & Moody', light: 'Light & Clean', vibrant: 'Vibrant & Electric',
    earthy: 'Earthy & Warm', natural: 'Natural & Green', mono: 'Monochrome',
  },
  ru: {
    dark: 'Тёмное и глубокое', light: 'Светлое и чистое', vibrant: 'Яркое и сочное',
    earthy: 'Тёплое, земляное', natural: 'Природное, зелёное', mono: 'Монохром',
  },
}

function fmtDate(iso: string, lang: Lang): string {
  try {
    return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
  } catch { return iso }
}

export default async function BriefPrintPage({ params, searchParams }: Props) {
  const lang: Lang = searchParams.lang === 'ru' ? 'ru' : 'en'
  const t = T[lang]

  const briefs = await getBriefs()
  const brief = briefs.find((b) => b.id === params.id)
  if (!brief) notFound()

  const chips = (ids: string[] | undefined, map: Record<string, string>) =>
    (ids ?? []).map((id) => map[id] ?? id).filter(Boolean)

  const services = chips(brief.services, SERVICE_LABELS[lang])
  const styles   = chips(brief.styles,   STYLE_LABELS[lang])
  const colors   = chips(brief.colors,   COLOR_LABELS[lang])

  const hasVisual = styles.length > 0 || colors.length > 0 || !!brief.refLinks?.trim()
  const hasPlan = !!(brief.timeline?.trim() || brief.budget?.trim() || brief.source?.trim() || brief.notes?.trim())

  return (
    <>
      {/* The admin layout paints the app dark; this document is a light,
          printable sheet, so it takes over the page surface. */}
      <style>{PRINT_CSS}</style>

      <BriefPrintActions lang={lang} name={brief.name} />

      <div className="sheet">
        <header className="head">
          <div>
            <p className="wordmark">MAZE</p>
            <p className="wordmark-sub">{t.footer}</p>
          </div>
          <div className="head-right">
            <p className="doctype">{t.docType}</p>
            <p className="meta">{t.submitted}: {fmtDate(brief.createdAt, lang)}</p>
            <p className="meta">{t.ref}: {brief.id}</p>
          </div>
        </header>
        <div className="rule" />

        <h1 className="title">{brief.name}</h1>
        {brief.company?.trim() && <p className="subtitle">{brief.company}</p>}

        <Section n="01" title={t.s1}>
          <dl className="grid">
            <Row label={t.name} value={brief.name} />
            {brief.company?.trim() && <Row label={t.company} value={brief.company} />}
            {brief.phone?.trim()   && <Row label={t.phone}   value={brief.phone} />}
            {brief.email?.trim()   && <Row label={t.email}   value={brief.email} />}
            {brief.website?.trim() && <Row label={t.website} value={brief.website} />}
          </dl>
        </Section>

        <Section n="02" title={t.s2}>
          {services.length > 0 && (
            <div className="block">
              <p className="lbl">{t.services}</p>
              <div className="chips">{services.map((s) => <span key={s} className="chip">{s}</span>)}</div>
            </div>
          )}
          <Long label={t.description} value={brief.description} />
          <Long label={t.goals}       value={brief.goals} />
          <Long label={t.audience}    value={brief.audience} />
          <Long label={t.competitors} value={brief.competitors} />
        </Section>

        {hasVisual && (
          <Section n="03" title={t.s3}>
            {styles.length > 0 && (
              <div className="block">
                <p className="lbl">{t.styles}</p>
                <div className="chips">{styles.map((s) => <span key={s} className="chip">{s}</span>)}</div>
              </div>
            )}
            {colors.length > 0 && (
              <div className="block">
                <p className="lbl">{t.colors}</p>
                <div className="chips">{colors.map((c) => <span key={c} className="chip">{c}</span>)}</div>
              </div>
            )}
            <Long label={t.refLinks} value={brief.refLinks} />
          </Section>
        )}

        {hasPlan && (
          <Section n="04" title={t.s4}>
            <dl className="grid">
              {brief.timeline?.trim() && <Row label={t.timeline} value={brief.timeline} />}
              {brief.budget?.trim()   && <Row label={t.budget}   value={brief.budget} />}
              {brief.source?.trim()   && <Row label={t.source}   value={brief.source} />}
            </dl>
            <Long label={t.notes} value={brief.notes} />
          </Section>
        )}

        <footer className="foot">
          <span>maze.uz</span>
          <span>hello@maze.uz</span>
          <span>+998 71 123 45 67</span>
        </footer>
      </div>
    </>
  )
}

/* ── Pieces ───────────────────────────────────────────────────────────── */

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="sec">
      <h2 className="sec-h"><span className="sec-n">{n}</span>{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null
  return (
    <>
      <dt className="lbl">{label}</dt>
      <dd className="val">{value}</dd>
    </>
  )
}

function Long({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null
  return (
    <div className="block">
      <p className="lbl">{label}</p>
      <p className="para">{value}</p>
    </div>
  )
}

/* ── Print styles ─────────────────────────────────────────────────────── */

const PRINT_CSS = `
  html, body { background: #fff !important; color: #14150F !important; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  .sheet {
    width: 210mm;
    min-height: 297mm;
    margin: 24px auto 48px;
    padding: 16mm 16mm 14mm;
    background: #fff;
    box-sizing: border-box;
    font-family: var(--font-sans), system-ui, sans-serif;
    font-size: 10.5pt;
    line-height: 1.5;
    color: #14150F;
    box-shadow: 0 8px 40px rgba(0,0,0,.28);
  }

  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12mm; }
  .wordmark { font-size: 20pt; font-weight: 800; letter-spacing: .14em; margin: 0; }
  .wordmark-sub { font-size: 7.5pt; color: #6B6D63; margin: 2px 0 0; letter-spacing: .02em; }
  .head-right { text-align: right; }
  .doctype {
    font-size: 8pt; font-weight: 700; letter-spacing: .18em; text-transform: uppercase;
    margin: 0 0 4px; color: #14150F;
  }
  .meta { font-size: 8pt; color: #6B6D63; margin: 0; }

  .rule { height: 3px; background: #C8FF47; margin: 5mm 0 8mm; border-radius: 2px; }

  .title { font-size: 22pt; font-weight: 800; letter-spacing: -.01em; margin: 0; }
  .subtitle { font-size: 11pt; color: #6B6D63; margin: 2px 0 0; }

  .sec { margin-top: 9mm; break-inside: avoid; }
  .sec-h {
    display: flex; align-items: baseline; gap: 8px;
    font-size: 9pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
    margin: 0 0 4mm; padding-bottom: 2mm; border-bottom: 1px solid #E4E5DE;
  }
  .sec-n { font-size: 8pt; color: #A7A99E; font-variant-numeric: tabular-nums; }

  .grid { display: grid; grid-template-columns: 42mm 1fr; gap: 2.5mm 6mm; margin: 0; }
  /* A free-text block after the label/value grid needs air, otherwise its
     label reads as another row of the grid. */
  .grid + .block { margin-top: 6mm; }
  .lbl {
    font-size: 7.5pt; font-weight: 600; letter-spacing: .1em; text-transform: uppercase;
    color: #86887E; margin: 0;
  }
  .val { margin: 0; font-size: 10.5pt; }

  .block { margin-bottom: 5mm; break-inside: avoid; }
  .block .lbl { margin-bottom: 1.5mm; }
  .para { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }

  .chips { display: flex; flex-wrap: wrap; gap: 2mm; }
  .chip {
    display: inline-block; padding: 1.2mm 3mm; border: 1px solid #DEE0D6; border-radius: 999px;
    background: #F6F7F1; font-size: 9pt; line-height: 1.35;
  }

  .foot {
    display: flex; gap: 8mm; justify-content: center;
    margin-top: 12mm; padding-top: 4mm; border-top: 1px solid #E4E5DE;
    font-size: 8pt; color: #86887E;
  }

  @page { size: A4; margin: 12mm; }

  @media print {
    .no-print { display: none !important; }
    .sheet {
      width: auto; min-height: 0; margin: 0; padding: 0;
      box-shadow: none;
    }
    .sec { page-break-inside: avoid; }
  }
`

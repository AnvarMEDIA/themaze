import type { Project } from './types'
import { CATEGORY_LABELS } from './utils'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'

export interface PressKitSnippet {
  label:   string
  text:    string
  /** When set, the snippet has hashtags or copy targeted to this platform. */
  hint?:   string
}

export interface PressKitData {
  project:    Project
  publicUrl:  string
  hashtags:   string[]
  snippets:   PressKitSnippet[]
  shareLinks: Array<{ label: string; href: string; note?: string }>
  submitLinks: Array<{ label: string; href: string; note?: string }>
}

function categoriesLabel(cats: string[]): string {
  return cats.map((c) => CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c).join(' · ')
}

function buildHashtags(project: Project): string[] {
  const fromCat = project.categories.map((c) => CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c)
  const fromTag = project.tags ?? []
  const out = new Set<string>([
    'MAZEStudio',
    ...fromCat.map((c) => c.replace(/[\s/]+/g, '')),
    ...fromTag.map((t) => t.replace(/[\s/]+/g, '')),
    'Tashkent',
    'Uzbekistan',
    'BrandIdentity',
    'GraphicDesign',
  ])
  return Array.from(out).slice(0, 8).map((t) => `#${t}`)
}

export function buildPressKit(project: Project): PressKitData {
  const url = `${SITE_URL}/portfolio/${project.slug}`
  const catText = categoriesLabel(project.categories)
  const hashtags = buildHashtags(project)
  const hashtagLine = hashtags.join(' ')

  const short = project.shortDescription || project.description.slice(0, 200)
  const shortRu = project.shortDescriptionRu || (project.descriptionRu ?? '').slice(0, 200)

  const behanceEn = [
    `${project.title} — ${catText} for ${project.client}.`,
    '',
    project.description || short,
    '',
    project.results ? `Results: ${project.results}` : '',
    '',
    `Designed by MAZE Studio, Tashkent. See more: ${SITE_URL}/portfolio`,
    '',
    hashtagLine,
  ].filter(Boolean).join('\n').trim()

  const behanceRu = [
    `${project.titleRu || project.title} — ${catText} для ${project.client}.`,
    '',
    project.descriptionRu || shortRu,
    '',
    project.resultsRu ? `Результат: ${project.resultsRu}` : '',
    '',
    `Студия MAZE, Ташкент. Ещё работы: ${SITE_URL}/portfolio`,
    '',
    hashtagLine,
  ].filter(Boolean).join('\n').trim()

  const linkedIn = [
    `New from the studio:`,
    `${project.title} — ${catText} for ${project.client}.`,
    '',
    short,
    '',
    `Case study → ${url}`,
    '',
    hashtagLine,
  ].filter(Boolean).join('\n').trim()

  const linkedInRu = [
    `Новый проект из студии:`,
    `${project.titleRu || project.title} — ${catText} для ${project.client}.`,
    '',
    shortRu,
    '',
    `Кейс → ${url}`,
    '',
    hashtagLine,
  ].filter(Boolean).join('\n').trim()

  const twitter = [
    `${project.title} — ${catText} for ${project.client} ↗`,
    short.length > 160 ? short.slice(0, 160) + '…' : short,
    url,
  ].filter(Boolean).join('\n').trim()

  const instagram = [
    `${project.title} — ${catText} for ${project.client}.`,
    '',
    short,
    '',
    'Link in bio.',
    '',
    hashtagLine,
  ].filter(Boolean).join('\n').trim()

  const instagramRu = [
    `${project.titleRu || project.title} — ${catText} для ${project.client}.`,
    '',
    shortRu,
    '',
    'Ссылка в био.',
    '',
    hashtagLine,
  ].filter(Boolean).join('\n').trim()

  const telegram = [
    `<b>${project.titleRu || project.title}</b>`,
    `${catText} · ${project.client}`,
    '',
    shortRu || short,
    '',
    `Кейс: ${url}`,
  ].join('\n').trim()

  const emailClient = [
    `Subject: Your case study is live — ${project.title}`,
    '',
    `Hi ${project.client.split(' ')[0]},`,
    '',
    `The case study for ${project.title} is now live on our portfolio:`,
    `${url}`,
    '',
    `Feel free to share it across your channels — the link is open to everyone.`,
    '',
    `Thanks again for trusting us with the project.`,
    '',
    `— MAZE Studio`,
  ].join('\n').trim()

  return {
    project,
    publicUrl: url,
    hashtags,
    snippets: [
      { label: 'Behance — description (EN)',     text: behanceEn,   hint: 'Paste into the project description field' },
      { label: 'Behance — описание (RU)',         text: behanceRu },
      { label: 'LinkedIn post (EN)',              text: linkedIn },
      { label: 'LinkedIn post (RU)',              text: linkedInRu },
      { label: 'X / Twitter (EN)',                text: twitter },
      { label: 'Instagram caption (EN)',          text: instagram },
      { label: 'Instagram описание (RU)',         text: instagramRu },
      { label: 'Telegram (RU, HTML)',             text: telegram,    hint: 'Telegram clients render <b> tags' },
      { label: 'Email to the client',             text: emailClient },
    ],
    shareLinks: [
      {
        label: 'Share on X',
        href:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(project.title + ' — case study')}&url=${encodeURIComponent(url)}`,
      },
      {
        label: 'Share on LinkedIn',
        href:  `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      },
      {
        label: 'Share on Facebook',
        href:  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      },
      {
        label: 'Share on Telegram',
        href:  `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(project.title)}`,
      },
      {
        label: 'Share on WhatsApp',
        href:  `https://api.whatsapp.com/send?text=${encodeURIComponent(project.title + ' — ' + url)}`,
      },
      {
        label: 'Share on VK',
        href:  `https://vk.com/share.php?url=${encodeURIComponent(url)}`,
      },
    ],
    submitLinks: [
      { label: 'Behance — new project',  href: 'https://www.behance.net/portfolio/editor/new',                                                                  note: 'Login then create a new project and paste the Behance snippet.' },
      { label: 'Awwwards — submit',       href: 'https://www.awwwards.com/submit/',                                                                              note: 'Free to submit; SOTD review is paid.' },
      { label: 'Site Inspire',            href: 'https://www.siteinspire.com/submit',                                                                            note: 'Curated gallery; very high editorial bar.' },
      { label: 'Land-book',               href: 'https://land-book.com/submit',                                                                                  note: 'Excellent for landing-page work.' },
      { label: 'CSS Design Awards',       href: 'https://www.cssdesignawards.com/submissions',                                                                  note: 'Submit your website / project.' },
      { label: 'Dribbble — new shot',     href: 'https://dribbble.com/uploads/new',                                                                              note: 'Crops well for hero asset shots.' },
      { label: 'Google Search Console — request indexing', href: 'https://search.google.com/search-console/inspect',                                            note: 'Paste the case study URL, click "Request indexing".' },
      { label: 'Yandex.Webmaster — переобход страницы',     href: 'https://webmaster.yandex.ru/site/indexing/reindex/',                                          note: 'Вставьте URL кейса в форму «Переобход страниц».' },
    ],
  }
}

import { readStore, writeStore } from './store'

export interface TeamMember {
  id:     string
  name:   string
  role:   string
  roleRu: string
  roleUz?: string
  bio:    string
  bioRu:  string
  bioUz?: string
  photo:  string
  order:  number
}

const DEFAULT: TeamMember[] = [
  {
    id: '1', order: 1,
    name:   'Anvar Yusupov',
    role:   'Founder & Creative Director',
    roleRu: 'Основатель и Арт-директор',
    roleUz: '',
    bio:    'Leads the studio\'s creative vision with 10+ years across branding, typography, and art direction.',
    bioRu:  'Руководит творческим видением студии с 10+ летним опытом в брендинге, типографике и арт-директинге.',
    bioUz:  '',
    photo:  '',
  },
  {
    id: '2', order: 2,
    name:   'Dilnoza Rashidova',
    role:   'Head of Strategy',
    roleRu: 'Руководитель стратегии',
    roleUz: '',
    bio:    'Brand strategist who bridges business objectives and creative execution for measurable impact.',
    bioRu:  'Бренд-стратег, связывающий бизнес-цели и творческое исполнение для измеримых результатов.',
    bioUz:  '',
    photo:  '',
  },
  {
    id: '3', order: 3,
    name:   'Bobur Mirzaev',
    role:   'Lead UI/UX Designer',
    roleRu: 'Ведущий UI/UX дизайнер',
    roleUz: '',
    bio:    'Designs intuitive digital experiences with deep expertise in design systems and user research.',
    bioRu:  'Создаёт интуитивные цифровые интерфейсы с глубокой экспертизой в дизайн-системах и UX-исследованиях.',
    bioUz:  '',
    photo:  '',
  },
  {
    id: '4', order: 4,
    name:   'Malika Toshmatova',
    role:   'Senior Graphic Designer',
    roleRu: 'Старший графический дизайнер',
    roleUz: '',
    bio:    'Specialises in print, packaging, and environmental design with an eye for editorial craft.',
    bioRu:  'Специализируется на печатной продукции, упаковке и навигационном дизайне с вниманием к редакционному мастерству.',
    bioUz:  '',
    photo:  '',
  },
]

export async function getTeam(): Promise<TeamMember[]> {
  const members = await readStore<TeamMember[]>('team', DEFAULT)
  return [...members].sort((a, b) => a.order - b.order)
}

export async function saveTeam(members: TeamMember[]): Promise<void> {
  return writeStore('team', members)
}

export async function reorderTeam(orderedIds: string[]): Promise<void> {
  const members = await readStore<TeamMember[]>('team', DEFAULT)
  const index = new Map(orderedIds.map((id, i) => [id, i + 1]))
  const next = members.map((m) => {
    const order = index.get(m.id)
    return order === undefined ? m : { ...m, order }
  })
  await writeStore('team', next)
}

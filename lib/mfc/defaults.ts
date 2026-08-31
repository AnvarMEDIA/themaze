/**
 * The categories a new MFC starts with.
 *
 * Chosen for how money actually leaves a household in Tashkent, and ordered
 * by how often a row lands in each — the quick-add grid is read top-left
 * first, so groceries and transport sit where the thumb already is. Every one
 * of them is editable and removable; this is a starting point, not a schema.
 *
 * Colour slots are assigned so the categories most likely to appear together
 * on screen take different discs, but nothing depends on it: the disc is
 * identity for the eye, and every row is named.
 */
export interface DefaultCategory {
  name: string
  nameRu: string
  icon: string
  colorSlot: number
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Groceries',      nameRu: 'Продукты',      icon: '🛒', colorSlot: 0 },
  { name: 'Café & dining',  nameRu: 'Кафе и еда вне', icon: '🍽️', colorSlot: 1 },
  { name: 'Transport',      nameRu: 'Транспорт',      icon: '🚕', colorSlot: 2 },
  { name: 'Fuel',           nameRu: 'Топливо',        icon: '⛽', colorSlot: 3 },
  { name: 'Home & rent',    nameRu: 'Жильё и аренда', icon: '🏠', colorSlot: 4 },
  { name: 'Utilities',      nameRu: 'Коммуналка',     icon: '💡', colorSlot: 5 },
  { name: 'Mobile & net',   nameRu: 'Связь и интернет', icon: '📱', colorSlot: 6 },
  { name: 'Shopping',       nameRu: 'Покупки',        icon: '🛍️', colorSlot: 7 },
  { name: 'Clothes',        nameRu: 'Одежда',         icon: '👕', colorSlot: 0 },
  { name: 'Health',         nameRu: 'Здоровье',       icon: '💊', colorSlot: 1 },
  { name: 'Personal care',  nameRu: 'Уход за собой',  icon: '💇', colorSlot: 2 },
  { name: 'Education',      nameRu: 'Образование',    icon: '🎓', colorSlot: 3 },
  { name: 'Entertainment',  nameRu: 'Развлечения',    icon: '🎬', colorSlot: 4 },
  { name: 'Family & kids',  nameRu: 'Семья и дети',   icon: '👨‍👩‍👧', colorSlot: 5 },
  { name: 'Gifts',          nameRu: 'Подарки',        icon: '🎁', colorSlot: 6 },
  { name: 'Travel',         nameRu: 'Поездки',        icon: '✈️', colorSlot: 7 },
  { name: 'Repairs',        nameRu: 'Ремонт',         icon: '🔧', colorSlot: 0 },
  { name: 'Other',          nameRu: 'Прочее',         icon: '📦', colorSlot: 1 },
]

/**
 * Emoji offered in the icon picker. A wider net than the defaults, because
 * "Дача" and "Кальян" are real categories and neither is in the list above.
 * Any single emoji can still be typed in directly.
 */
export const ICON_CHOICES = [
  '🛒', '🍽️', '☕', '🍎', '🥤', '🍺',
  '🚕', '🚌', '⛽', '🚗', '🅿️', '✈️',
  '🏠', '💡', '💧', '🔥', '📱', '🌐',
  '🛍️', '👕', '👟', '💊', '🏥', '💇',
  '🎓', '📚', '🎬', '🎮', '🎧', '🏋️',
  '🎁', '👨‍👩‍👧', '🐾', '🌱', '🔧', '🧾',
  '💳', '🏦', '📦', '🧹', '🪑', '💈',
] as const

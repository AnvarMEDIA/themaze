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
  /**
   * What gets typed when this category is meant — the words a Telegram
   * message will actually contain. Not synonyms of the title: the things
   * themselves. The bot adds to these as it learns.
   */
  keywords: string
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Groceries',      nameRu: 'Продукты',      icon: '🛒', colorSlot: 0,
    keywords: 'корзинка макро havas магазин базар рынок хлеб молоко еда groceries market' },
  { name: 'Café & dining',  nameRu: 'Кафе и еда вне', icon: '🍽️', colorSlot: 1,
    keywords: 'кафе кофе ресторан обед ужин завтрак чайхана пицца бургер доставка cafe coffee lunch dinner' },
  { name: 'Transport',      nameRu: 'Транспорт',      icon: '🚕', colorSlot: 2,
    keywords: 'такси яндекс мойтакси метро автобус маршрутка проезд парковка taxi bus metro' },
  { name: 'Fuel',           nameRu: 'Топливо',        icon: '⛽', colorSlot: 3,
    keywords: 'бензин газ метан пропан заправка солярка дизель fuel petrol' },
  { name: 'Home & rent',    nameRu: 'Жильё и аренда', icon: '🏠', colorSlot: 4,
    keywords: 'аренда квартира ипотека дом жкх rent' },
  { name: 'Utilities',      nameRu: 'Коммуналка',     icon: '💡', colorSlot: 5,
    keywords: 'свет электричество вода газ отопление коммуналка мусор utilities' },
  { name: 'Mobile & net',   nameRu: 'Связь и интернет', icon: '📱', colorSlot: 6,
    keywords: 'интернет мобильный связь ucell beeline uzmobile перекомп телефон internet mobile' },
  { name: 'Shopping',       nameRu: 'Покупки',        icon: '🛍️', colorSlot: 7,
    keywords: 'покупка техника посуда мебель заказ shopping' },
  { name: 'Clothes',        nameRu: 'Одежда',         icon: '👕', colorSlot: 0,
    keywords: 'одежда обувь куртка джинсы футболка кроссовки clothes shoes' },
  { name: 'Health',         nameRu: 'Здоровье',       icon: '💊', colorSlot: 1,
    keywords: 'аптека лекарство врач клиника анализы стоматолог здоровье pharmacy doctor' },
  { name: 'Personal care',  nameRu: 'Уход за собой',  icon: '💇', colorSlot: 2,
    keywords: 'барбер парикмахер стрижка салон маникюр косметика barber haircut' },
  { name: 'Education',      nameRu: 'Образование',    icon: '🎓', colorSlot: 3,
    keywords: 'курсы книга обучение репетитор школа университет course book' },
  { name: 'Entertainment',  nameRu: 'Развлечения',    icon: '🎬', colorSlot: 4,
    keywords: 'кино театр концерт игра подписка netflix spotify youtube боулинг cinema' },
  { name: 'Family & kids',  nameRu: 'Семья и дети',   icon: '👨‍👩‍👧', colorSlot: 5,
    keywords: 'дети садик игрушки школа ребенок family kids' },
  { name: 'Gifts',          nameRu: 'Подарки',        icon: '🎁', colorSlot: 6,
    keywords: 'подарок цветы свадьба туй день рождения gift flowers' },
  { name: 'Travel',         nameRu: 'Поездки',        icon: '✈️', colorSlot: 7,
    keywords: 'билет самолет поезд отель гостиница виза поездка ticket hotel flight' },
  { name: 'Repairs',        nameRu: 'Ремонт',         icon: '🔧', colorSlot: 0,
    keywords: 'ремонт мастер сантехник электрик запчасти сто автосервис repair' },
  { name: 'Other',          nameRu: 'Прочее',         icon: '📦', colorSlot: 1,
    keywords: 'прочее разное other misc' },
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

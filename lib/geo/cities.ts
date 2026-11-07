/**
 * Cities the admin can add to the map from a list, without placing them by
 * hand. Anything missing can still be put on the map with a click.
 *
 * [country, English, Russian, latitude, longitude]
 */
type Row = [string, string, string, number, number]

const ROWS: Row[] = [
  // Uzbekistan
  ['UZ', 'Tashkent',      'Ташкент',     41.30,  69.24],
  ['UZ', 'Samarkand',     'Самарканд',   39.65,  66.96],
  ['UZ', 'Bukhara',       'Бухара',      39.77,  64.43],
  ['UZ', 'Khiva',         'Хива',        41.38,  60.36],
  ['UZ', 'Urgench',       'Ургенч',      41.55,  60.63],
  ['UZ', 'Nukus',         'Нукус',       42.46,  59.60],
  ['UZ', 'Andijan',       'Андижан',     40.78,  72.34],
  ['UZ', 'Namangan',      'Наманган',    41.00,  71.67],
  ['UZ', 'Fergana',       'Фергана',     40.39,  71.78],
  ['UZ', 'Kokand',        'Коканд',      40.53,  70.94],
  ['UZ', 'Karshi',        'Карши',       38.86,  65.79],
  ['UZ', 'Termez',        'Термез',      37.22,  67.28],
  ['UZ', 'Navoi',         'Навои',       40.10,  65.37],
  ['UZ', 'Jizzakh',       'Джизак',      40.12,  67.84],
  ['UZ', 'Gulistan',      'Гулистан',    40.49,  68.78],
  // Central Asia and the Caucasus
  ['KZ', 'Almaty',        'Алматы',      43.24,  76.89],
  ['KZ', 'Astana',        'Астана',      51.17,  71.45],
  ['KZ', 'Shymkent',      'Шымкент',     42.32,  69.60],
  ['KZ', 'Karaganda',     'Караганда',   49.80,  73.10],
  ['KZ', 'Aktobe',        'Актобе',      50.28,  57.17],
  ['KZ', 'Atyrau',        'Атырау',      47.11,  51.92],
  ['KG', 'Bishkek',       'Бишкек',      42.87,  74.59],
  ['KG', 'Osh',           'Ош',          40.53,  72.80],
  ['TJ', 'Dushanbe',      'Душанбе',     38.56,  68.79],
  ['TJ', 'Khujand',       'Худжанд',     40.28,  69.62],
  ['TM', 'Ashgabat',      'Ашхабад',     37.96,  58.33],
  ['AZ', 'Baku',          'Баку',        40.41,  49.87],
  ['GE', 'Tbilisi',       'Тбилиси',     41.72,  44.79],
  ['GE', 'Batumi',        'Батуми',      41.64,  41.63],
  ['AM', 'Yerevan',       'Ереван',      40.18,  44.51],
  ['MN', 'Ulaanbaatar',   'Улан-Батор',  47.89, 106.91],
  // Russia, Belarus, Ukraine, Moldova
  ['RU', 'Moscow',            'Москва',           55.76,  37.62],
  ['RU', 'Saint Petersburg',  'Санкт-Петербург',  59.94,  30.31],
  ['RU', 'Kazan',             'Казань',           55.80,  49.11],
  ['RU', 'Samara',            'Самара',           53.20,  50.15],
  ['RU', 'Tolyatti',          'Тольятти',         53.51,  49.42],
  ['RU', 'Nizhny Novgorod',   'Нижний Новгород',  56.33,  44.00],
  ['RU', 'Yekaterinburg',     'Екатеринбург',     56.84,  60.61],
  ['RU', 'Novosibirsk',       'Новосибирск',      55.01,  82.93],
  ['RU', 'Krasnodar',         'Краснодар',        45.04,  38.98],
  ['RU', 'Sochi',             'Сочи',             43.60,  39.73],
  ['RU', 'Rostov-on-Don',     'Ростов-на-Дону',   47.24,  39.70],
  ['RU', 'Ufa',               'Уфа',              54.74,  55.97],
  ['RU', 'Kaliningrad',       'Калининград',      54.71,  20.51],
  ['RU', 'Vladivostok',       'Владивосток',      43.12, 131.89],
  ['BY', 'Minsk',             'Минск',            53.90,  27.56],
  ['UA', 'Kyiv',              'Киев',             50.45,  30.52],
  ['MD', 'Chisinau',          'Кишинёв',          47.01,  28.86],
  // Middle East and Türkiye
  ['AE', 'Dubai',         'Дубай',       25.20,  55.27],
  ['AE', 'Abu Dhabi',     'Абу-Даби',    24.45,  54.38],
  ['AE', 'Sharjah',       'Шарджа',      25.35,  55.42],
  ['SA', 'Riyadh',        'Эр-Рияд',     24.71,  46.68],
  ['SA', 'Jeddah',        'Джидда',      21.49,  39.19],
  ['QA', 'Doha',          'Доха',        25.29,  51.53],
  ['KW', 'Kuwait City',   'Эль-Кувейт',  29.38,  47.99],
  ['BH', 'Manama',        'Манама',      26.23,  50.59],
  ['OM', 'Muscat',        'Маскат',      23.59,  58.41],
  ['IL', 'Tel Aviv',      'Тель-Авив',   32.09,  34.78],
  ['EG', 'Cairo',         'Каир',        30.04,  31.24],
  ['IR', 'Tehran',        'Тегеран',     35.69,  51.39],
  ['TR', 'Istanbul',      'Стамбул',     41.01,  28.98],
  ['TR', 'Ankara',        'Анкара',      39.93,  32.86],
  ['TR', 'Antalya',       'Анталья',     36.90,  30.70],
  // Europe
  ['GB', 'London',        'Лондон',      51.51,  -0.13],
  ['FR', 'Paris',         'Париж',       48.86,   2.35],
  ['DE', 'Berlin',        'Берлин',      52.52,  13.40],
  ['DE', 'Munich',        'Мюнхен',      48.14,  11.58],
  ['DE', 'Frankfurt',     'Франкфурт',   50.11,   8.68],
  ['NL', 'Amsterdam',     'Амстердам',   52.37,   4.90],
  ['BE', 'Brussels',      'Брюссель',    50.85,   4.35],
  ['IT', 'Milan',         'Милан',       45.46,   9.19],
  ['IT', 'Rome',          'Рим',         41.90,  12.50],
  ['ES', 'Madrid',        'Мадрид',      40.42,  -3.70],
  ['ES', 'Barcelona',     'Барселона',   41.39,   2.17],
  ['PT', 'Lisbon',        'Лиссабон',    38.72,  -9.14],
  ['CH', 'Zurich',        'Цюрих',       47.38,   8.54],
  ['CH', 'Geneva',        'Женева',      46.20,   6.14],
  ['AT', 'Vienna',        'Вена',        48.21,  16.37],
  ['CZ', 'Prague',        'Прага',       50.08,  14.44],
  ['PL', 'Warsaw',        'Варшава',     52.23,  21.01],
  ['HU', 'Budapest',      'Будапешт',    47.50,  19.04],
  ['RS', 'Belgrade',      'Белград',     44.79,  20.45],
  ['GR', 'Athens',        'Афины',       37.98,  23.73],
  ['CY', 'Limassol',      'Лимасол',     34.71,  33.02],
  ['IE', 'Dublin',        'Дублин',      53.35,  -6.26],
  ['DK', 'Copenhagen',    'Копенгаген',  55.68,  12.57],
  ['SE', 'Stockholm',     'Стокгольм',   59.33,  18.07],
  ['NO', 'Oslo',          'Осло',        59.91,  10.75],
  ['FI', 'Helsinki',      'Хельсинки',   60.17,  24.94],
  ['EE', 'Tallinn',       'Таллин',      59.44,  24.75],
  ['LV', 'Riga',          'Рига',        56.95,  24.11],
  ['LT', 'Vilnius',       'Вильнюс',     54.69,  25.28],
  // North America
  ['US', 'New York',      'Нью-Йорк',      40.71,  -74.01],
  ['US', 'Washington',    'Вашингтон',     38.91,  -77.04],
  ['US', 'Boston',        'Бостон',        42.36,  -71.06],
  ['US', 'Philadelphia',  'Филадельфия',   39.95,  -75.17],
  ['US', 'Chicago',       'Чикаго',        41.88,  -87.63],
  ['US', 'Miami',         'Майами',        25.76,  -80.19],
  ['US', 'Houston',       'Хьюстон',       29.76,  -95.37],
  ['US', 'Dallas',        'Даллас',        32.78,  -96.80],
  ['US', 'Denver',        'Денвер',        39.74, -104.99],
  ['US', 'Las Vegas',     'Лас-Вегас',     36.17, -115.14],
  ['US', 'Los Angeles',   'Лос-Анджелес',  34.05, -118.24],
  ['US', 'San Francisco', 'Сан-Франциско', 37.77, -122.42],
  ['US', 'Seattle',       'Сиэтл',         47.61, -122.33],
  ['CA', 'Toronto',       'Торонто',       43.65,  -79.38],
  ['CA', 'Montreal',      'Монреаль',      45.50,  -73.57],
  ['CA', 'Vancouver',     'Ванкувер',      49.28, -123.12],
  ['MX', 'Mexico City',   'Мехико',        19.43,  -99.13],
  // South America, Africa
  ['BR', 'São Paulo',     'Сан-Паулу',      -23.55, -46.63],
  ['AR', 'Buenos Aires',  'Буэнос-Айрес',   -34.60, -58.38],
  ['ZA', 'Cape Town',     'Кейптаун',       -33.92,  18.42],
  ['ZA', 'Johannesburg',  'Йоханнесбург',   -26.20,  28.05],
  // Asia and Oceania
  ['IN', 'Delhi',         'Дели',          28.61,  77.21],
  ['IN', 'Mumbai',        'Мумбаи',        19.08,  72.88],
  ['CN', 'Beijing',       'Пекин',         39.90, 116.41],
  ['CN', 'Shanghai',      'Шанхай',        31.23, 121.47],
  ['CN', 'Guangzhou',     'Гуанчжоу',      23.13, 113.26],
  ['CN', 'Urumqi',        'Урумчи',        43.83,  87.62],
  ['HK', 'Hong Kong',     'Гонконг',       22.32, 114.17],
  ['KR', 'Seoul',         'Сеул',          37.57, 126.98],
  ['JP', 'Tokyo',         'Токио',         35.68, 139.69],
  ['SG', 'Singapore',     'Сингапур',       1.35, 103.82],
  ['TH', 'Bangkok',       'Бангкок',       13.76, 100.50],
  ['MY', 'Kuala Lumpur',  'Куала-Лумпур',   3.14, 101.69],
  ['ID', 'Jakarta',       'Джакарта',      -6.21, 106.85],
  ['VN', 'Ho Chi Minh City', 'Хошимин',    10.82, 106.63],
  ['AU', 'Sydney',        'Сидней',       -33.87, 151.21],
  ['AU', 'Melbourne',     'Мельбурн',     -37.81, 144.96],
]

export interface PresetCity {
  id:      string
  country: string
  nameEn:  string
  nameRu:  string
  lat:     number
  lng:     number
}

const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const PRESET_CITIES: PresetCity[] = ROWS.map(([country, nameEn, nameRu, lat, lng]) => ({
  id: `${country.toLowerCase()}-${slug(nameEn)}`,
  country,
  nameEn,
  nameRu,
  lat,
  lng,
}))

#!/usr/bin/env node
/**
 * Usage: node scripts/check-translations.mjs
 * Checks that ru.json and uz.json have all keys present in en.json.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = resolve(__dir, '..')

function load(file) {
  return JSON.parse(readFileSync(resolve(root, 'messages', file), 'utf8'))
}

function flatKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k
    return typeof v === 'object' && v !== null && !Array.isArray(v)
      ? flatKeys(v, key)
      : [key]
  })
}

const en = load('en.json')
const ru = load('ru.json')
const uz = load('uz.json')

const enKeys = new Set(flatKeys(en))
const ruKeys = new Set(flatKeys(ru))
const uzKeys = new Set(flatKeys(uz))

let errors = 0

function check(lang, keys) {
  const missing = [...enKeys].filter((k) => !keys.has(k))
  const extra   = [...keys].filter((k) => !enKeys.has(k))
  if (missing.length) {
    console.log(`\n❌ ${lang}.json — ${missing.length} missing key(s):`)
    missing.forEach((k) => console.log(`   - ${k}`))
    errors += missing.length
  }
  if (extra.length) {
    console.log(`\n⚠️  ${lang}.json — ${extra.length} extra key(s) not in en.json:`)
    extra.forEach((k) => console.log(`   + ${k}`))
  }
}

check('ru', ruKeys)
check('uz', uzKeys)

if (errors === 0) {
  console.log('✅  All translation keys are present in ru.json and uz.json')
} else {
  console.log(`\n${errors} missing key(s) found.`)
  process.exit(1)
}

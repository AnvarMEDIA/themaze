'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  translate, monthShort, FIN_LOCALE, type FinLang, FIN_LANGS,
} from '@/lib/finance/i18n'
import type { ProjectStatus, PaymentMethod } from '@/lib/finance/types'

const STORAGE_KEY = 'maze_finance_lang'

interface Ctx {
  lang: FinLang
  setLang: (l: FinLang) => void
  locale: string
  t: (key: string, vars?: Record<string, string | number>) => string
  tStatus: (s: ProjectStatus | string) => string
  tMethod: (m: PaymentMethod | string) => string
  month: (index0: number) => string
}

const FinanceLangContext = createContext<Ctx | null>(null)

export function FinanceLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<FinLang>('en')

  // Load persisted choice after mount (localStorage is client-only).
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'ru') setLangState(stored)
  }, [])

  const setLang = useCallback((l: FinLang) => {
    setLangState(l)
    try { window.localStorage.setItem(STORAGE_KEY, l) } catch { /* ignore */ }
  }, [])

  const value: Ctx = {
    lang,
    setLang,
    locale: FIN_LOCALE[lang],
    t: (key, vars) => translate(lang, key, vars),
    tStatus: (s) => translate(lang, `status.${s}`),
    tMethod: (m) => translate(lang, `method.${m}`),
    month: (i) => monthShort(lang, i),
  }

  return <FinanceLangContext.Provider value={value}>{children}</FinanceLangContext.Provider>
}

export function useFinanceLang(): Ctx {
  const ctx = useContext(FinanceLangContext)
  if (!ctx) throw new Error('useFinanceLang must be used within FinanceLangProvider')
  return ctx
}

/** EN/RU segmented toggle. */
export function LangToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useFinanceLang()
  return (
    <div className={`inline-flex items-center rounded-lg border border-[#252525] bg-[#0D0D0D] p-0.5 ${className}`}>
      {FIN_LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-2.5 py-1 rounded-md text-[12px] font-semibold uppercase tracking-wide transition-colors active:scale-[0.97] ${
            lang === l ? 'bg-[#C8FF47] text-[#0A0A0A]' : 'text-[#888] hover:text-white'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

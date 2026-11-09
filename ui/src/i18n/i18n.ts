// Language choice, translation lookup and date formatting (FR9.1-FR9.4).

import { createContext, useContext } from 'react'
import { I18n } from 'aws-amplify/utils'
import en from './en.json'
import ar from './ar.json'

export type Language = 'en' | 'ar'

export const LANGUAGE_STORAGE_KEY = 'hr-portal.language'

type Dictionary = { [key: string]: string | Dictionary }

export const dictionaries: Record<Language, Dictionary> = { en, ar }

let amplifyVocabularyLoaded = false

/** Gives the Amplify Authenticator the same English and Arabic labels as the rest of the app. */
export function loadAmplifyVocabulary(): void {
  if (amplifyVocabularyLoaded) return
  I18n.putVocabularies({ en: en.amplify, ar: ar.amplify })
  amplifyVocabularyLoaded = true
}

function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'ar'
}

/** Stored choice first; otherwise Arabic only when the browser prefers it; otherwise English. */
export function detectInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (isLanguage(stored)) return stored
  } catch (error) {
    console.warn('Could not read the saved language', error)
  }
  const preferred = navigator.languages?.[0] ?? navigator.language ?? 'en'
  return preferred.toLowerCase().startsWith('ar') ? 'ar' : 'en'
}

export function directionOf(language: Language): 'rtl' | 'ltr' {
  return language === 'ar' ? 'rtl' : 'ltr'
}

/** Sets <html lang dir>, saves the choice and switches the Amplify labels. */
export function applyLanguage(language: Language): void {
  document.documentElement.lang = language
  document.documentElement.dir = directionOf(language)
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch (error) {
    console.warn('Could not save the language choice', error)
  }
  loadAmplifyVocabulary()
  I18n.setLanguage(language)
}

function lookup(dictionary: Dictionary, key: string): string | undefined {
  let node: string | Dictionary | undefined = dictionary
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = node[part]
  }
  return typeof node === 'string' ? node : undefined
}

export type TranslationParams = Record<string, string | number>

export function translate(language: Language, key: string, params: TranslationParams = {}): string {
  const template = lookup(dictionaries[language], key) ?? lookup(dictionaries.en, key)
  if (template === undefined) {
    console.warn(`Missing translation key: ${key}`)
    return key
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

const LOCALES: Record<Language, string> = {
  en: 'en-GB-u-ca-gregory',
  ar: 'ar-SA-u-ca-gregory-nu-latn',
}

/** Shows an API date (YYYY-MM-DD) in the chosen language, always on the Gregorian calendar. */
export function formatIsoDate(language: Language, isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate
  const date = new Date(`${isoDate}T00:00:00Z`)
  return new Intl.DateTimeFormat(LOCALES[language], { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
}

export interface I18nValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, params?: TranslationParams) => string
  formatDate: (isoDate: string) => string
}

export const I18nContext = createContext<I18nValue | null>(null)

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (value === null) throw new Error('useI18n must be used inside <I18nProvider>.')
  return value
}

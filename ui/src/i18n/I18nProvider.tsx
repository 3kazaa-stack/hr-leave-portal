import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import {
  applyLanguage,
  detectInitialLanguage,
  formatIsoDate,
  I18nContext,
  translate,
  type I18nValue,
  type Language,
  type TranslationParams,
} from './i18n'

interface I18nProviderProps {
  children: ReactNode
  initialLanguage?: Language
}

export function I18nProvider({ children, initialLanguage }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => initialLanguage ?? detectInitialLanguage())

  useLayoutEffect(() => {
    applyLanguage(language)
  }, [language])

  const setLanguage = useCallback((next: Language) => setLanguageState(next), [])

  const value = useMemo<I18nValue>(
    () => ({
      language,
      setLanguage,
      t: (key: string, params?: TranslationParams) => translate(language, key, params),
      formatDate: (isoDate: string) => formatIsoDate(language, isoDate),
    }),
    [language, setLanguage],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

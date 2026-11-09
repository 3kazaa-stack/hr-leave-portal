import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from './I18nProvider'
import { vi } from 'vitest'
import { detectInitialLanguage, formatIsoDate, LANGUAGE_STORAGE_KEY, useI18n } from './i18n'
import en from './en.json'
import ar from './ar.json'

type Tree = { [key: string]: string | Tree }

function flattenKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}/${key}` : key
    return typeof value === 'string' ? [path] : flattenKeys(value, path)
  })
}

function LanguageProbe() {
  const { t, setLanguage } = useI18n()
  return createElement(
    'div',
    null,
    createElement('p', null, t('nav.employees')),
    createElement(
      'button',
      { type: 'button', 'data-testid': 'probe-switch', onClick: () => setLanguage('ar') },
      'switch',
    ),
  )
}

describe('translations and direction', () => {
  it('FR9.3: en and ar have identical key sets', () => {
    const englishKeys = flattenKeys(en).sort()
    const arabicKeys = flattenKeys(ar).sort()

    expect(arabicKeys).toEqual(englishKeys)
    expect(englishKeys.length).toBeGreaterThan(50)
  })

  it('FR9.2: switching to Arabic sets dir="rtl" and lang="ar" and remembers it', async () => {
    render(createElement(I18nProvider, { initialLanguage: 'en', children: createElement(LanguageProbe) }))
    expect(document.documentElement).toHaveAttribute('dir', 'ltr')
    expect(document.documentElement).toHaveAttribute('lang', 'en')
    expect(screen.getByText('Employees')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('probe-switch'))

    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
    expect(document.documentElement).toHaveAttribute('lang', 'ar')
    expect(screen.getByText('الموظفون')).toBeInTheDocument()
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ar')
    expect(detectInitialLanguage()).toBe('ar')
  })

  it('FR9.1: first visit uses Arabic only when the browser prefers it, otherwise English', () => {
    const languages = vi.spyOn(navigator, 'languages', 'get')
    languages.mockReturnValue(['ar-SA', 'en'])
    expect(detectInitialLanguage()).toBe('ar')
    languages.mockReturnValue(['fr-FR'])
    expect(detectInitialLanguage()).toBe('en')
    languages.mockRestore()
  })

  it('FR9.4: formats API dates per language on the Gregorian calendar and leaves bad input as-is', () => {
    expect(formatIsoDate('en', '2026-12-01')).toBe('1 Dec 2026')
    const arabic = formatIsoDate('ar', '2026-12-01')
    expect(arabic).toContain('2026')
    expect(arabic).not.toBe('1 Dec 2026')
    expect(formatIsoDate('en', 'not-a-date')).toBe('not-a-date')
  })
})

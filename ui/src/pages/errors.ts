import { ApiError } from '../api/client'
import type { TranslationParams } from '../i18n/i18n'

type Translate = (key: string, params?: TranslationParams) => string

/** Turns a REST client failure into a translated, user-facing message. */
export function describeApiError(error: unknown, t: Translate): string {
  if (error instanceof ApiError) {
    if (error.kind === 'network') return t('common.networkError')
    if (error.kind === 'session-expired') return t('session.expired')
    if (error.kind === 'validation') return t('common.validationError', { detail: error.message })
  }
  console.error('HR API request failed', error)
  return t('common.error')
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'not-found'
}

import { useI18n } from '../i18n/i18n'

/** Switches between English and Arabic with no reload (FR9.1, FR9.2). */
export function LanguageSwitch({ className = 'button button--ghost' }: { className?: string }) {
  const { language, setLanguage, t } = useI18n()
  const target = language === 'ar' ? 'en' : 'ar'

  return (
    <button
      type="button"
      className={className}
      lang={target}
      aria-label={`${t('header.language')}: ${t('header.switchLanguage')}`}
      data-testid="language-switch-button"
      onClick={() => setLanguage(target)}
    >
      {t('header.switchLanguage')}
    </button>
  )
}

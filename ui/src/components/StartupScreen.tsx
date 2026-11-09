import { useI18n } from '../i18n/i18n'

interface StartupScreenProps {
  /** Technical detail from the config loader; absent while loading. */
  error?: string
}

/** Start-up state before Amplify is configured: loading, or a clear config error (FR7.3). */
export function StartupScreen({ error }: StartupScreenProps) {
  const { t } = useI18n()

  if (error === undefined) {
    return (
      <main className="startup-screen" aria-busy="true">
        <p className="muted" role="status">
          {t('startup.loading')}
        </p>
      </main>
    )
  }

  return (
    <main className="startup-screen">
      <section className="card" role="alert" data-testid="startup-error">
        <h1>{t('startup.title')}</h1>
        <p>{t('startup.body')}</p>
        <p className="muted">
          <code dir="ltr">{error}</code>
        </p>
      </section>
    </main>
  )
}

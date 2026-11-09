import { useSessionExpiredNotice } from '../auth/sessionNotice'
import { useI18n } from '../i18n/i18n'
import { Brand } from './Brand'
import { LanguageSwitch } from './LanguageSwitch'

/** Shown above the Amplify sign-in form: logo slot, language switch and the session-expired notice. */
export function AuthHeader() {
  const { t } = useI18n()
  const sessionExpired = useSessionExpiredNotice()

  return (
    <div data-testid="auth-header">
      <div className="auth-header">
        <Brand />
      </div>
      <div className="auth-language">
        <LanguageSwitch className="button button--secondary" />
      </div>
      {sessionExpired && (
        <p className="alert alert--warning" role="alert" data-testid="session-expired-message">
          {t('session.expired')}
        </p>
      )}
    </div>
  )
}

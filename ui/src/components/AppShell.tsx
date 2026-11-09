import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { onSessionExpired } from '../auth/sessionEvents'
import { useI18n } from '../i18n/i18n'
import { Brand } from './Brand'
import { ChatPanel } from './ChatPanel'
import { LanguageSwitch } from './LanguageSwitch'

interface AppShellProps {
  username: string
  onSignOut: () => void
  /** Called when the API or agent reports an expired session (FR1.5). */
  onSessionExpired: () => void
  children: ReactNode
}

function navClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'app-nav__link active' : 'app-nav__link'
}

/** Navy header with logo, navigation, language switch, user and sign-out (FR1.3, FR8.2), plus the chat drawer. */
export function AppShell({ username, onSignOut, onSessionExpired: handleExpired, children }: AppShellProps) {
  const { t } = useI18n()
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => onSessionExpired(handleExpired), [handleExpired])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <NavLink to="/employees" className="brand-link" data-testid="header-home-link">
            <Brand />
          </NavLink>
          <nav className="app-nav" aria-label={t('nav.label')}>
            <NavLink to="/employees" className={navClass} data-testid="nav-employees-link">
              {t('nav.employees')}
            </NavLink>
            <NavLink to="/hr-requests" className={navClass} data-testid="nav-hr-requests-link">
              {t('nav.hrRequests')}
            </NavLink>
          </nav>
          <div className="header-actions">
            <LanguageSwitch />
            <span className="header-user" dir="auto" data-testid="header-username">
              {t('header.signedInAs', { name: username })}
            </span>
            <button type="button" className="button button--ghost" data-testid="sign-out-button" onClick={onSignOut}>
              {t('header.signOut')}
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">{children}</main>

      {!chatOpen && (
        <button
          type="button"
          className="button chat-launcher"
          aria-haspopup="dialog"
          title={t('chat.open')}
          data-testid="chat-open-button"
          onClick={() => setChatOpen(true)}
        >
          {t('nav.chat')}
        </button>
      )}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}

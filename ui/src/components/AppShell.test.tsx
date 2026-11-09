import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentType, ReactNode } from 'react'
import App from '../App'
import { AppShell } from './AppShell'
import { emitSessionExpired } from '../auth/sessionEvents'
import { I18nProvider } from '../i18n/I18nProvider'
import { renderWithProviders } from '../test/render'

const authenticatorProps = vi.hoisted(() => ({ calls: [] as Record<string, unknown>[] }))

vi.mock('@aws-amplify/ui-react', () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
  Authenticator: (props: Record<string, unknown>) => {
    authenticatorProps.calls.push(props)
    const Header = (props.components as { Header: ComponentType }).Header
    return <Header />
  },
}))

vi.mock('aws-amplify/auth', async () => {
  const { fakeAuthSession } = await import('../test/amplifyMock')
  return { fetchAuthSession: vi.fn(async () => fakeAuthSession()) }
})

function renderShell(handlers: { onSignOut?: () => void; onSessionExpired?: () => void } = {}) {
  return renderWithProviders(
    <AppShell
      username="hr.user@example.test"
      onSignOut={handlers.onSignOut ?? (() => {})}
      onSessionExpired={handlers.onSessionExpired ?? (() => {})}
    >
      <p>page body</p>
    </AppShell>,
  )
}

describe('sign-in gate and app shell', () => {
  beforeEach(() => {
    authenticatorProps.calls.length = 0
  })

  it('FR1.1: renders the Authenticator with sign-up hidden and the logo slot in its header', () => {
    render(
      <I18nProvider initialLanguage="en">
        <App />
      </I18nProvider>,
    )

    expect(authenticatorProps.calls.length).toBeGreaterThan(0)
    expect(authenticatorProps.calls[0].hideSignUp).toBe(true)
    expect(screen.getByTestId('auth-header')).toBeInTheDocument()
    expect(screen.getByTestId('brand-logo')).toHaveAttribute('src', '/brand/logo.svg')
  })

  it('FR8.4: falls back to the text title when no logo file exists', () => {
    renderShell()

    fireEvent.error(screen.getByTestId('brand-logo'))
    expect(screen.getByTestId('brand-logo')).toHaveAttribute('src', '/brand/logo.png')
    fireEvent.error(screen.getByTestId('brand-logo'))

    expect(screen.queryByTestId('brand-logo')).not.toBeInTheDocument()
    expect(screen.getByTestId('brand-placeholder')).toHaveTextContent('HR Leave Portal')
  })

  it('FR1.3/FR1.5: shows the user, signs out on request and on session expiry', async () => {
    const onSignOut = vi.fn()
    const onSessionExpired = vi.fn()
    renderShell({ onSignOut, onSessionExpired })

    expect(screen.getByTestId('header-username')).toHaveTextContent('Signed in as hr.user@example.test')
    await userEvent.click(screen.getByTestId('sign-out-button'))
    expect(onSignOut).toHaveBeenCalledTimes(1)

    emitSessionExpired()
    expect(onSessionExpired).toHaveBeenCalledTimes(1)
  })
})

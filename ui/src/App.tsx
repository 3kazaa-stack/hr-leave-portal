import { useCallback, useState } from 'react'
import { Authenticator, ThemeProvider } from '@aws-amplify/ui-react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SessionNoticeContext } from './auth/sessionNotice'
import { AppShell } from './components/AppShell'
import { AuthHeader } from './components/AuthHeader'
import { directionOf, useI18n } from './i18n/i18n'
import { EmployeeDetailPage } from './pages/EmployeeDetailPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { HrRequestsPage } from './pages/HrRequestsPage'
import { amplifyTheme } from './theme/amplifyTheme'

const AUTH_COMPONENTS = { Header: AuthHeader }

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/employees" replace />} />
      <Route path="/employees" element={<EmployeesPage />} />
      <Route path="/employees/:employeeId" element={<EmployeeDetailPage />} />
      <Route path="/hr-requests" element={<HrRequestsPage />} />
      <Route path="*" element={<Navigate to="/employees" replace />} />
    </Routes>
  )
}

/**
 * Sign-in gate and routes (FR1.1-FR1.3). Accounts are created by an administrator, so
 * sign-up is hidden; the Authenticator handles Cognito's forced password change itself.
 */
function App() {
  const { language } = useI18n()
  const [sessionExpired, setSessionExpired] = useState(false)
  const expire = useCallback((signOut?: () => void) => {
    setSessionExpired(true)
    signOut?.()
  }, [])

  return (
    <ThemeProvider theme={amplifyTheme} direction={directionOf(language)}>
      <SessionNoticeContext.Provider value={sessionExpired}>
        <Authenticator hideSignUp components={AUTH_COMPONENTS}>
          {({ signOut, user }) => (
            <BrowserRouter>
              <AppShell
                username={user?.signInDetails?.loginId ?? user?.username ?? ''}
                onSignOut={() => {
                  setSessionExpired(false)
                  signOut?.()
                }}
                onSessionExpired={() => expire(signOut)}
              >
                <AppRoutes />
              </AppShell>
            </BrowserRouter>
          )}
        </Authenticator>
      </SessionNoticeContext.Provider>
    </ThemeProvider>
  )
}

export default App

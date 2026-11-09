import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import '@fontsource/ibm-plex-sans-arabic/400.css'
import '@fontsource/ibm-plex-sans-arabic/600.css'
import '@fontsource/ibm-plex-sans-arabic/700.css'
import '@aws-amplify/ui-react/styles.css'
import './theme/tokens.css'
import './theme/global.css'
import App from './App.tsx'
import { StartupScreen } from './components/StartupScreen'
import { loadConfig, setAppConfig, type AppConfig } from './config/config'
import { I18nProvider } from './i18n/I18nProvider'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('index.html has no #root element.')
const root = createRoot(rootElement)

function configureAmplify(config: AppConfig): void {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.userPoolId,
        userPoolClientId: config.userPoolClientId,
        loginWith: { email: true },
      },
    },
  })
}

root.render(
  <I18nProvider>
    <StartupScreen />
  </I18nProvider>,
)

// FR7.3: config.json is read before Amplify is configured; a bad file gets a clear error screen.
loadConfig()
  .then((config) => {
    setAppConfig(config)
    configureAmplify(config)
    root.render(
      <StrictMode>
        <I18nProvider>
          <App />
        </I18nProvider>
      </StrictMode>,
    )
  })
  .catch((error: unknown) => {
    console.error('The portal could not start', error)
    root.render(
      <I18nProvider>
        <StartupScreen error={error instanceof Error ? error.message : String(error)} />
      </I18nProvider>,
    )
  })

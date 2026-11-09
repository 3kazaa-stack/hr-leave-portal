import { useState } from 'react'
import { useI18n } from '../i18n/i18n'

// FR8.4: the official logo is dropped into ui/public/brand/ as logo.svg or logo.png.
// Until then a neutral text placeholder is shown. No code change is needed to swap it in.
const LOGO_SOURCES = ['/brand/logo.svg', '/brand/logo.png']

export function Brand() {
  const { t } = useI18n()
  const [sourceIndex, setSourceIndex] = useState(0)
  const source = LOGO_SOURCES[sourceIndex]

  return (
    <span className="brand" data-testid="brand">
      {source ? (
        <img
          key={source}
          className="brand__logo"
          src={source}
          alt={t('app.logoAlt')}
          data-testid="brand-logo"
          onError={() => setSourceIndex((index) => index + 1)}
        />
      ) : (
        <span className="brand__placeholder" data-testid="brand-placeholder">
          {t('app.title')}
        </span>
      )}
    </span>
  )
}

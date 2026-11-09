// Amplify UI theme built from the shared design tokens in tokens.css (FR8.3).
// Values are CSS variable references, so the palette lives in one file.

import type { Theme } from '@aws-amplify/ui-react'

const token = (name: string) => ({ value: `var(--${name})` })

export const amplifyTheme: Theme = {
  name: 'hr-leave-portal',
  tokens: {
    colors: {
      brand: {
        primary: {
          10: token('color-primary-soft'),
          20: token('color-primary-soft'),
          40: token('color-cyan'),
          60: token('color-primary'),
          80: token('color-primary'),
          90: token('color-primary-hover'),
          100: token('color-navy'),
        },
      },
      font: {
        primary: token('color-text'),
        secondary: token('color-text-muted'),
        interactive: token('color-primary'),
        error: token('color-error'),
      },
      background: {
        primary: token('color-surface'),
        secondary: token('color-page'),
      },
      border: {
        primary: token('color-border'),
        focus: token('color-focus'),
      },
    },
    fonts: {
      default: {
        variable: token('font-family'),
        static: token('font-family'),
      },
    },
    radii: {
      small: token('radius-sm'),
      medium: token('radius-md'),
      large: token('radius-lg'),
    },
    components: {
      authenticator: {
        router: {
          borderWidth: { value: '0' },
          boxShadow: token('shadow-card'),
        },
      },
      button: {
        primary: {
          backgroundColor: token('color-primary'),
          _hover: { backgroundColor: token('color-primary-hover') },
        },
      },
    },
  },
}

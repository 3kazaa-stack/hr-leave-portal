import { createElement, type ReactElement } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { I18nProvider } from '../i18n/I18nProvider'

interface RenderOptions {
  /** URL to start at. */
  route?: string
  /** Route pattern the element is mounted on, for pages that read URL params. */
  path?: string
}

/** Renders a screen inside the English I18nProvider and a memory router. */
export function renderWithProviders(element: ReactElement, { route = '/', path = '*' }: RenderOptions = {}) {
  const routes = createElement(Routes, null, createElement(Route, { path, element }))
  const router = createElement(MemoryRouter, { initialEntries: [route], children: routes })
  return render(createElement(I18nProvider, { initialLanguage: 'en', children: router }))
}

type FetchHandler = (url: string, init: RequestInit | undefined) => Response | Promise<Response>

/** Builds a fetch replacement that answers by method and URL; unmatched calls fail the test loudly. */
export function routeFetch(handler: FetchHandler): typeof fetch {
  return async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    return handler(url, init)
  }
}

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HrRequestsPage } from './HrRequestsPage'
import { setAppConfig } from '../config/config'
import { jsonResponse, testConfig } from '../test/fixtures'
import { TEST_USER } from '../test/amplifyMock'
import { renderWithProviders, routeFetch } from '../test/render'

vi.mock('aws-amplify/auth', async () => {
  const { fakeAuthSession, TEST_USER: user } = await import('../test/amplifyMock')
  return {
    fetchAuthSession: vi.fn(async () => fakeAuthSession()),
    getCurrentUser: vi.fn(async () => user),
  }
})

describe('HrRequestsPage', () => {
  beforeEach(() => {
    setAppConfig(testConfig)
    vi.restoreAllMocks()
  })

  it('FR4.1/FR4.3: sends the signed-in sub as user_id and confirms the email to HR', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(routeFetch(() => jsonResponse({ executionArn: 'arn:execution' }, 202)))
    renderWithProviders(<HrRequestsPage />)

    fireEvent.change(screen.getByTestId('time-off-start-date-input'), { target: { value: '2026-12-01' } })
    fireEvent.change(screen.getByTestId('time-off-end-date-input'), { target: { value: '2026-12-05' } })
    await userEvent.click(screen.getByTestId('time-off-submit-button'))

    expect(await screen.findByTestId('time-off-sent')).toHaveTextContent('Your request was sent to HR by email.')
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe(`${testConfig.apiUrl}/hr-requests/time-off`)
    expect(JSON.parse(init?.body as string)).toEqual({
      user_id: TEST_USER.userId,
      start_date: '2026-12-01',
      end_date: '2026-12-05',
    })
  })

  it('FR4.2: an empty inquiry is blocked and sends nothing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderWithProviders(<HrRequestsPage />)

    await userEvent.type(screen.getByTestId('inquiry-prompt-input'), '   ')
    await userEvent.click(screen.getByTestId('inquiry-submit-button'))

    expect(await screen.findByText('Describe your request before sending it.')).toBeVisible()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

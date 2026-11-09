import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, getEmployee, listEmployees } from './client'
import { setAppConfig } from '../config/config'
import { onSessionExpired } from '../auth/sessionEvents'
import { janeDoe, janeDoeApiItem, jsonResponse, testConfig } from '../test/fixtures'
import { TEST_ID_TOKEN } from '../test/amplifyMock'

vi.mock('aws-amplify/auth', async () => {
  const { fakeAuthSession: session } = await import('../test/amplifyMock')
  return { fetchAuthSession: vi.fn(async () => session()) }
})

describe('REST client', () => {
  beforeEach(() => {
    setAppConfig(testConfig)
    vi.restoreAllMocks()
  })

  it('sends the Cognito ID token and drops storage keys (FR1.4)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ employees: [janeDoeApiItem] }))

    const employees = await listEmployees({ hiredFrom: '2026-01-01', hiredTo: '2026-12-31' })

    expect(employees).toEqual([janeDoe])
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe(`${testConfig.apiUrl}/employees?hiredFrom=2026-01-01&hiredTo=2026-12-31`)
    expect((init?.headers as Record<string, string>).Authorization).toBe(TEST_ID_TOKEN)
  })

  it('raises session-expired on a 401 and signals the app shell (FR1.5)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ message: 'Unauthorized' }, 401))
    const listener = vi.fn()
    const unsubscribe = onSessionExpired(listener)

    await expect(listEmployees()).rejects.toMatchObject({ kind: 'session-expired', status: 401 })
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('maps a 404 to a not-found error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ detail: 'Employee not found' }, 404),
    )

    const failure = getEmployee('missing').catch((error: unknown) => error)

    await expect(failure).resolves.toBeInstanceOf(ApiError)
    await expect(failure).resolves.toMatchObject({ kind: 'not-found', message: 'Employee not found' })
  })
})

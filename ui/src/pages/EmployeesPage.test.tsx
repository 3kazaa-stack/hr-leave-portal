import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmployeesPage } from './EmployeesPage'
import { setAppConfig } from '../config/config'
import { janeDoeApiItem, jsonResponse, testConfig } from '../test/fixtures'
import { renderWithProviders, routeFetch } from '../test/render'

vi.mock('aws-amplify/auth', async () => {
  const { fakeAuthSession } = await import('../test/amplifyMock')
  return { fetchAuthSession: vi.fn(async () => fakeAuthSession()) }
})

describe('EmployeesPage', () => {
  beforeEach(() => {
    setAppConfig(testConfig)
    vi.restoreAllMocks()
  })

  it('FR2.1: lists employees without showing storage keys', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(routeFetch(() => jsonResponse({ employees: [janeDoeApiItem] })))

    renderWithProviders(<EmployeesPage />)

    const table = await screen.findByTestId('employees-table')
    const row = within(table).getByTestId('employees-table-row')
    expect(within(row).getByText('Jane Doe')).toBeInTheDocument()
    expect(within(row).getByText('Finance')).toBeInTheDocument()
    expect(within(row).getByText('a1b2c3d4')).toBeInTheDocument()
    expect(within(table).queryByText('USER_BY_DATE')).not.toBeInTheDocument()
    expect(fetchSpy).toHaveBeenCalledWith(`${testConfig.apiUrl}/employees`, expect.objectContaining({ method: 'GET' }))
  })

  it('FR2.3: an empty name shows a field error and sends nothing', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(routeFetch(() => jsonResponse({ employees: [] })))
    renderWithProviders(<EmployeesPage />)
    await screen.findByTestId('employees-empty')

    await userEvent.type(screen.getByTestId('employee-create-department-input'), 'Finance')
    await userEvent.click(screen.getByTestId('employee-create-submit-button'))

    expect(await screen.findByText('This field is required.', { selector: '#employee-create-name-error' })).toBeVisible()
    expect(screen.getByTestId('employee-create-name-input')).toHaveAttribute('aria-invalid', 'true')
    const posts = fetchSpy.mock.calls.filter(([, init]) => init?.method === 'POST')
    expect(posts).toHaveLength(0)
  })

  it('FR2.2: one hire date alone disables the filter and says why', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(routeFetch(() => jsonResponse({ employees: [] })))
    renderWithProviders(<EmployeesPage />)
    await screen.findByTestId('employees-empty')

    await userEvent.type(screen.getByTestId('employee-filter-from-input'), '2026-01-01')

    expect(screen.getByTestId('employee-filter-apply-button')).toBeDisabled()
    expect(screen.getByTestId('employee-filter-problem')).toHaveTextContent('Enter both dates to apply the filter.')
  })
})

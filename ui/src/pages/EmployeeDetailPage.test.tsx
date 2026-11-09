import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmployeeDetailPage } from './EmployeeDetailPage'
import { setAppConfig } from '../config/config'
import { decemberLeaveApiItem, janeDoeApiItem, jsonResponse, testConfig } from '../test/fixtures'
import { renderWithProviders, routeFetch } from '../test/render'

vi.mock('aws-amplify/auth', async () => {
  const { fakeAuthSession } = await import('../test/amplifyMock')
  return { fetchAuthSession: vi.fn(async () => fakeAuthSession()) }
})

const employeeUrl = `${testConfig.apiUrl}/employees/a1b2c3d4`

function backend() {
  return routeFetch((url) => {
    if (url === employeeUrl) return jsonResponse(janeDoeApiItem)
    if (url.startsWith(`${employeeUrl}/leave`)) return jsonResponse({ leave: [decemberLeaveApiItem] })
    return jsonResponse({ detail: 'Not Found' }, 404)
  })
}

function renderPage(employeeId = 'a1b2c3d4') {
  return renderWithProviders(<EmployeeDetailPage />, {
    route: `/employees/${employeeId}`,
    path: '/employees/:employeeId',
  })
}

describe('EmployeeDetailPage', () => {
  beforeEach(() => {
    setAppConfig(testConfig)
    vi.restoreAllMocks()
  })

  it('FR3.1: shows the employee and their leave entries', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(backend())

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument()
    const rows = within(await screen.findByTestId('leave-table')).getAllByTestId('leave-table-row')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('1 Dec 2026')
    expect(rows[0]).toHaveTextContent('5 Dec 2026')
  })

  it('FR3.4: warns before replacing leave with the same start date, and sends nothing until confirmed', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(backend())
    renderPage()
    await screen.findByTestId('leave-table')

    fireEvent.change(screen.getByTestId('leave-create-start-date-input'), { target: { value: '2026-12-01' } })
    fireEvent.change(screen.getByTestId('leave-create-end-date-input'), { target: { value: '2026-12-08' } })
    await userEvent.click(screen.getByTestId('leave-create-submit-button'))

    const warning = await screen.findByTestId('leave-overwrite-warning')
    expect(warning).toHaveTextContent('Leave starting on 1 Dec 2026 already exists. Saving will replace it.')
    expect(fetchSpy.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0)
    expect(screen.getByTestId('leave-overwrite-confirm-button')).toBeEnabled()
  })

  it('FR3.3: edits end date and note with PUT on the original start date', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(backend())
    renderPage()
    await screen.findByTestId('leave-table')

    await userEvent.click(screen.getByTestId('leave-table-row-edit-button'))
    const form = await screen.findByTestId('leave-edit-form')
    expect(within(form).queryByTestId('leave-create-start-date-input')).toBeNull()

    fireEvent.change(screen.getByTestId('leave-edit-end-date-input'), { target: { value: '2026-12-09' } })
    fireEvent.change(screen.getByTestId('leave-edit-note-input'), { target: { value: 'Extended' } })
    await userEvent.click(screen.getByTestId('leave-edit-submit-button'))

    await vi.waitFor(() => {
      const puts = fetchSpy.mock.calls.filter(([, init]) => init?.method === 'PUT')
      expect(puts).toHaveLength(1)
      expect(String(puts[0][0])).toBe(`${employeeUrl}/leave/2026-12-01`)
      expect(JSON.parse(String(puts[0][1]?.body))).toEqual({ endDate: '2026-12-09', note: 'Extended' })
    })
  })

  it('FR2.4: shows "Employee not found" on a 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(backend())

    renderPage('missing')

    expect(await screen.findByTestId('employee-not-found')).toHaveTextContent('Employee not found')
  })
})

// REST client for the HR API (api-documentation.md, section 1).
// Every call sends the Cognito ID token, which is what the API Gateway Cognito authorizer accepts (FR1.4).

import { fetchAuthSession } from 'aws-amplify/auth'
import { emitSessionExpired } from '../auth/sessionEvents'
import { getAppConfig } from '../config/config'
import type {
  Employee,
  EmployeeInput,
  HireDateFilter,
  HrInquiry,
  HrRequestAccepted,
  IsoDate,
  Leave,
  LeaveInput,
  LeaveUpdate,
  TimeOffRequest,
} from './types'

export type ApiErrorKind = 'network' | 'http' | 'session-expired' | 'not-found' | 'validation'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null

  constructor(kind: ApiErrorKind, message: string, status: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MONTH = /^\d{4}-\d{2}$/

function assertIsoDate(value: IsoDate, field: string): void {
  if (!ISO_DATE.test(value)) {
    throw new ApiError('validation', `${field} must be a date in YYYY-MM-DD format.`)
  }
}

async function idToken(): Promise<string> {
  let token: string | undefined
  try {
    const session = await fetchAuthSession()
    token = session.tokens?.idToken?.toString()
  } catch (error) {
    console.error('Could not read the Cognito session', error)
  }
  if (!token) {
    emitSessionExpired()
    throw new ApiError('session-expired', 'Your session has expired.', 401)
  }
  return token
}

async function errorFromResponse(response: Response): Promise<ApiError> {
  let detail: string
  try {
    const body: unknown = await response.json()
    const raw = (body as { detail?: unknown; message?: unknown }).detail ?? (body as { message?: unknown }).message
    detail = typeof raw === 'string' ? raw : JSON.stringify(raw ?? '')
  } catch {
    detail = response.statusText
  }
  if (response.status === 401) {
    emitSessionExpired()
    return new ApiError('session-expired', 'Your session has expired.', 401)
  }
  if (response.status === 404) return new ApiError('not-found', detail || 'Not found', 404)
  if (response.status === 422) return new ApiError('validation', detail || 'Invalid request', 422)
  return new ApiError('http', detail || `Request failed (HTTP ${response.status})`, response.status)
}

interface RequestOptions {
  query?: Record<string, string | undefined>
  body?: unknown
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${getAppConfig().apiUrl}${path}`)
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, value)
  }
  const headers: Record<string, string> = { Authorization: await idToken() }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch (error) {
    throw new ApiError('network', `Could not reach the HR API: ${(error as Error).message}`)
  }
  if (!response.ok) throw await errorFromResponse(response)
  try {
    return (await response.json()) as T
  } catch {
    throw new ApiError('http', 'The HR API returned an unreadable response.', response.status)
  }
}

type RawItem = Record<string, unknown>

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function toEmployee(item: RawItem): Employee {
  return {
    employeeId: asString(item.employeeId),
    name: asString(item.name),
    department: asString(item.department),
    startDate: asString(item.startDate),
    role: asString(item.role),
  }
}

export function toLeave(item: RawItem): Leave {
  return {
    employeeId: asString(item.employeeId),
    startDate: asString(item.startDate),
    endDate: asString(item.endDate),
    note: asString(item.note),
  }
}

const segment = encodeURIComponent

export async function listEmployees(filter?: HireDateFilter): Promise<Employee[]> {
  if (filter) {
    assertIsoDate(filter.hiredFrom, 'hiredFrom')
    assertIsoDate(filter.hiredTo, 'hiredTo')
  }
  const body = await request<{ employees?: RawItem[] }>('GET', '/employees', {
    query: { hiredFrom: filter?.hiredFrom, hiredTo: filter?.hiredTo },
  })
  return (body.employees ?? []).map(toEmployee)
}

export async function getEmployee(employeeId: string): Promise<Employee> {
  return toEmployee(await request<RawItem>('GET', `/employees/${segment(employeeId)}`))
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  assertIsoDate(input.startDate, 'startDate')
  return toEmployee(await request<RawItem>('POST', '/employees', { body: input }))
}

export async function listLeave(employeeId: string, month?: string): Promise<Leave[]> {
  if (month !== undefined && !MONTH.test(month)) {
    throw new ApiError('validation', 'month must be in YYYY-MM format.')
  }
  const body = await request<{ leave?: RawItem[] }>('GET', `/employees/${segment(employeeId)}/leave`, {
    query: { month },
  })
  return (body.leave ?? []).map(toLeave)
}

export async function createLeave(employeeId: string, input: LeaveInput): Promise<Leave> {
  assertIsoDate(input.startDate, 'startDate')
  assertIsoDate(input.endDate, 'endDate')
  return toLeave(
    await request<RawItem>('POST', `/employees/${segment(employeeId)}/leave`, { body: input }),
  )
}

export async function updateLeave(
  employeeId: string,
  startDate: IsoDate,
  update: LeaveUpdate,
): Promise<Leave> {
  assertIsoDate(startDate, 'startDate')
  assertIsoDate(update.endDate, 'endDate')
  return toLeave(
    await request<RawItem>(
      'PUT',
      `/employees/${segment(employeeId)}/leave/${segment(startDate)}`,
      { body: update },
    ),
  )
}

export async function submitTimeOff(input: TimeOffRequest): Promise<HrRequestAccepted> {
  assertIsoDate(input.start_date, 'start_date')
  assertIsoDate(input.end_date, 'end_date')
  return request<HrRequestAccepted>('POST', '/hr-requests/time-off', { body: input })
}

export async function submitHrRequest(input: HrInquiry): Promise<HrRequestAccepted> {
  return request<HrRequestAccepted>('POST', '/hr-requests', { body: input })
}

// Form rules for the employee, leave and HR request screens.
// Each rule returns translation keys, so messages come from en.json / ar.json (FR9.3).

import type { EmployeeInput, IsoDate, Leave } from '../api/types'

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>

export const REQUIRED = 'validation.required'
export const DATE_RANGE_BOTH = 'validation.dateRangeBothRequired'
export const DATE_RANGE_ORDER = 'validation.dateRangeOrder'
export const END_BEFORE_START = 'validation.endBeforeStart'
export const PROMPT_REQUIRED = 'validation.promptRequired'

function isBlank(value: string): boolean {
  return value.trim() === ''
}

/** FR2.3: name and department are required; a start date is needed by the API. */
export function validateEmployee(input: EmployeeInput): FieldErrors<'name' | 'department' | 'startDate'> {
  const errors: FieldErrors<'name' | 'department' | 'startDate'> = {}
  if (isBlank(input.name)) errors.name = REQUIRED
  if (isBlank(input.department)) errors.department = REQUIRED
  if (isBlank(input.startDate)) errors.startDate = REQUIRED
  return errors
}

/** FR2.2: both dates are needed, and "from" must not be after "to". Returns null when the filter can apply. */
export function validateHireDateRange(hiredFrom: IsoDate, hiredTo: IsoDate): string | null {
  if (isBlank(hiredFrom) || isBlank(hiredTo)) return DATE_RANGE_BOTH
  if (hiredFrom > hiredTo) return DATE_RANGE_ORDER
  return null
}

/** FR3.2 and FR4.1: both dates required, end not before start. ISO dates compare as strings. */
export function validateDateSpan(startDate: IsoDate, endDate: IsoDate): FieldErrors<'startDate' | 'endDate'> {
  const errors: FieldErrors<'startDate' | 'endDate'> = {}
  if (isBlank(startDate)) errors.startDate = REQUIRED
  if (isBlank(endDate)) errors.endDate = REQUIRED
  if (!errors.startDate && !errors.endDate && endDate < startDate) errors.endDate = END_BEFORE_START
  return errors
}

/** FR4.2: the free-text HR prompt must not be empty. */
export function validateHrPrompt(prompt: string): string | null {
  return isBlank(prompt) ? PROMPT_REQUIRED : null
}

/** FR3.4: the API overwrites leave with the same start date silently, so find it first. */
export function findLeaveWithStartDate(existing: Leave[], startDate: IsoDate): Leave | undefined {
  return existing.find((entry) => entry.startDate === startDate)
}

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some((value) => value !== undefined)
}

import { describe, expect, it } from 'vitest'
import {
  DATE_RANGE_BOTH,
  DATE_RANGE_ORDER,
  END_BEFORE_START,
  findLeaveWithStartDate,
  PROMPT_REQUIRED,
  REQUIRED,
  validateDateSpan,
  validateEmployee,
  validateHireDateRange,
  validateHrPrompt,
} from './validation'
import { decemberLeave, janeDoe } from '../test/fixtures'

describe('form validation', () => {
  it('FR2.3: accepts a complete employee and requires name and department', () => {
    expect(validateEmployee(janeDoe)).toEqual({})
    expect(validateEmployee({ ...janeDoe, name: '  ', department: '' })).toEqual({
      name: REQUIRED,
      department: REQUIRED,
    })
  })

  it('FR2.2: applies a hire-date range only with both dates in order', () => {
    expect(validateHireDateRange('2026-01-01', '2026-12-31')).toBeNull()
    expect(validateHireDateRange('2026-01-01', '2026-01-01')).toBeNull()
    expect(validateHireDateRange('2026-01-01', '')).toBe(DATE_RANGE_BOTH)
    expect(validateHireDateRange('2026-12-31', '2026-01-01')).toBe(DATE_RANGE_ORDER)
  })

  it('FR3.2: rejects leave that ends before it starts', () => {
    expect(validateDateSpan('2026-12-01', '2026-12-05')).toEqual({})
    expect(validateDateSpan('2026-12-05', '2026-12-01')).toEqual({ endDate: END_BEFORE_START })
    expect(validateDateSpan('', '2026-12-01')).toEqual({ startDate: REQUIRED })
  })

  it('FR4.2: requires a non-empty HR prompt', () => {
    expect(validateHrPrompt('How many leave days do I have?')).toBeNull()
    expect(validateHrPrompt('   ')).toBe(PROMPT_REQUIRED)
  })

  it('FR3.4: finds an existing entry with the same start date', () => {
    expect(findLeaveWithStartDate([decemberLeave], '2026-12-01')).toEqual(decemberLeave)
    expect(findLeaveWithStartDate([decemberLeave], '2026-12-02')).toBeUndefined()
  })
})

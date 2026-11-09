// Display and request types for the HR REST API (api-documentation.md, section 1).
// The storage keys (PK, SK, GSI1PK, GSI1SK) the API returns are deliberately left out.

/** A calendar date as the API expects it: YYYY-MM-DD. */
export type IsoDate = string

export interface Employee {
  employeeId: string
  name: string
  department: string
  startDate: IsoDate
  role: string
}

export interface EmployeeInput {
  name: string
  department: string
  startDate: IsoDate
  role: string
}

export interface HireDateFilter {
  hiredFrom: IsoDate
  hiredTo: IsoDate
}

export interface Leave {
  employeeId: string
  startDate: IsoDate
  endDate: IsoDate
  note: string
}

export interface LeaveInput {
  startDate: IsoDate
  endDate: IsoDate
  note: string
}

export interface LeaveUpdate {
  endDate: IsoDate
  note: string
}

export interface TimeOffRequest {
  user_id: string
  start_date: IsoDate
  end_date: IsoDate
}

export interface HrInquiry {
  user_id: string
  prompt: string
}

export interface HrRequestAccepted {
  executionArn: string
}

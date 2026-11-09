import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createLeave, getEmployee, listLeave, updateLeave } from '../api/client'
import type { Employee, Leave, LeaveInput } from '../api/types'
import { Field } from '../components/Field'
import { useI18n } from '../i18n/i18n'
import { describeApiError, isNotFound } from './errors'
import { useReloadToken } from './useReloadToken'
import { findLeaveWithStartDate, hasErrors, validateDateSpan, type FieldErrors } from './validation'

type EmployeeState =
  | { status: 'loading' }
  | { status: 'ready'; employee: Employee }
  | { status: 'not-found' }
  | { status: 'error'; error: unknown }

type LeaveState = { status: 'loading' } | { status: 'ready'; leave: Leave[] } | { status: 'error'; error: unknown }

/** FR2.4 and FR3.1-FR3.4: one employee's details and leave. */
export function EmployeeDetailPage() {
  const { employeeId = '' } = useParams()
  const { t } = useI18n()
  const [reloadToken, reload] = useReloadToken()
  const [employeeState, setEmployeeState] = useState<EmployeeState>({ status: 'loading' })
  const [leaveState, setLeaveState] = useState<LeaveState>({ status: 'loading' })
  const [month, setMonth] = useState('')
  const [editing, setEditing] = useState<Leave | null>(null)

  useEffect(() => {
    let cancelled = false
    getEmployee(employeeId)
      .then((employee) => !cancelled && setEmployeeState({ status: 'ready', employee }))
      .catch((error: unknown) => {
        if (cancelled) return
        setEmployeeState(isNotFound(error) ? { status: 'not-found' } : { status: 'error', error })
      })
    return () => {
      cancelled = true
    }
  }, [employeeId, reloadToken])

  useEffect(() => {
    let cancelled = false
    listLeave(employeeId, month || undefined)
      .then((leave) => !cancelled && setLeaveState({ status: 'ready', leave }))
      .catch((error: unknown) => !cancelled && setLeaveState({ status: 'error', error }))
    return () => {
      cancelled = true
    }
  }, [employeeId, month, reloadToken])

  function changeMonth(value: string) {
    setLeaveState({ status: 'loading' })
    setMonth(value)
  }

  function retry() {
    setEmployeeState({ status: 'loading' })
    setLeaveState({ status: 'loading' })
    reload()
  }

  function savedLeave() {
    setEditing(null)
    reload()
  }

  return (
    <div className="page" data-testid="employee-detail-page">
      <Link to="/employees" data-testid="employee-back-link">
        <span className="icon-directional" aria-hidden="true">
          ←
        </span>{' '}
        {t('employee.back')}
      </Link>

      <EmployeeDetails state={employeeState} onRetry={retry} />

      {employeeState.status === 'ready' && (
        <>
          <section className="card" aria-labelledby="leave-list-title">
            <h2 id="leave-list-title" className="card__title">
              {t('leave.title')}
            </h2>
            <div className="form-row">
              <Field
                id="leave-month-filter"
                label={t('leave.month')}
                type="month"
                value={month}
                data-testid="leave-month-filter-input"
                onChange={(event) => changeMonth(event.target.value)}
              />
              {month && (
                <button
                  type="button"
                  className="button button--ghost"
                  data-testid="leave-month-clear-button"
                  onClick={() => changeMonth('')}
                >
                  {t('leave.showAll')}
                </button>
              )}
            </div>
            <LeaveList state={leaveState} onEdit={setEditing} onRetry={retry} />
          </section>

          {editing ? (
            <EditLeaveForm
              key={editing.startDate}
              employeeId={employeeId}
              entry={editing}
              onSaved={savedLeave}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <RecordLeaveForm
              employeeId={employeeId}
              month={month}
              currentLeave={leaveState.status === 'ready' ? leaveState.leave : []}
              onSaved={savedLeave}
            />
          )}
        </>
      )}
    </div>
  )
}

function EmployeeDetails({ state, onRetry }: { state: EmployeeState; onRetry: () => void }) {
  const { t, formatDate } = useI18n()

  if (state.status === 'loading') {
    return (
      <p className="muted" role="status" data-testid="employee-loading">
        {t('common.loading')}
      </p>
    )
  }
  if (state.status === 'not-found') {
    return (
      <section className="card" role="alert" data-testid="employee-not-found">
        <h1>{t('employee.notFound')}</h1>
      </section>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="alert alert--error" role="alert" data-testid="employee-error">
        <p>{describeApiError(state.error, t)}</p>
        <button type="button" className="button button--secondary" data-testid="employee-retry-button" onClick={onRetry}>
          {t('common.retry')}
        </button>
      </div>
    )
  }
  const { employee } = state
  return (
    <section className="card" aria-labelledby="employee-name" data-testid="employee-details">
      <h1 id="employee-name" dir="auto">
        {employee.name}
      </h1>
      <dl className="grid-two">
        <div>
          <dt className="muted">{t('employees.columns.department')}</dt>
          <dd dir="auto">{employee.department}</dd>
        </div>
        <div>
          <dt className="muted">{t('employees.columns.startDate')}</dt>
          <dd>{formatDate(employee.startDate)}</dd>
        </div>
        <div>
          <dt className="muted">{t('employees.columns.role')}</dt>
          <dd dir="auto">{employee.role}</dd>
        </div>
        <div>
          <dt className="muted">{t('employees.columns.employeeId')}</dt>
          <dd dir="ltr">{employee.employeeId}</dd>
        </div>
      </dl>
    </section>
  )
}

interface LeaveListProps {
  state: LeaveState
  onEdit: (entry: Leave) => void
  onRetry: () => void
}

function LeaveList({ state, onEdit, onRetry }: LeaveListProps) {
  const { t, formatDate } = useI18n()

  if (state.status === 'loading') {
    return (
      <p className="muted" role="status" data-testid="leave-loading">
        {t('common.loading')}
      </p>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="alert alert--error" role="alert" data-testid="leave-error">
        <p>{describeApiError(state.error, t)}</p>
        <button type="button" className="button button--secondary" data-testid="leave-retry-button" onClick={onRetry}>
          {t('common.retry')}
        </button>
      </div>
    )
  }
  if (state.leave.length === 0) {
    return (
      <p className="muted" data-testid="leave-empty">
        {t('leave.empty')}
      </p>
    )
  }
  return (
    <div className="table-wrapper">
      <table className="data-table" aria-label={t('leave.tableLabel')} data-testid="leave-table">
        <thead>
          <tr>
            <th scope="col">{t('leave.columns.startDate')}</th>
            <th scope="col">{t('leave.columns.endDate')}</th>
            <th scope="col">{t('leave.columns.note')}</th>
            <th scope="col">{t('leave.columns.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {state.leave.map((entry) => (
            <tr key={entry.startDate} data-testid="leave-table-row">
              <td>{formatDate(entry.startDate)}</td>
              <td>{formatDate(entry.endDate)}</td>
              <td dir="auto">{entry.note}</td>
              <td>
                <button
                  type="button"
                  className="link-button"
                  data-testid="leave-table-row-edit-button"
                  onClick={() => onEdit(entry)}
                >
                  {t('leave.edit')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const EMPTY_LEAVE: LeaveInput = { startDate: '', endDate: '', note: '' }

interface RecordLeaveFormProps {
  employeeId: string
  month: string
  currentLeave: Leave[]
  onSaved: () => void
}

function RecordLeaveForm({ employeeId, month, currentLeave, onSaved }: RecordLeaveFormProps) {
  const { t, formatDate } = useI18n()
  const [form, setForm] = useState<LeaveInput>(EMPTY_LEAVE)
  const [errors, setErrors] = useState<FieldErrors<'startDate' | 'endDate'>>({})
  const [overwrite, setOverwrite] = useState<Leave | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  function update(field: keyof LeaveInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    if (field === 'startDate') setOverwrite(null)
  }

  /** The visible list may be filtered to another month, so look up the start date's own month then. */
  async function existingEntry(startDate: string): Promise<Leave | undefined> {
    const visible = month === '' || startDate.startsWith(month)
    const candidates = visible ? currentLeave : await listLeave(employeeId, startDate.slice(0, 7))
    return findLeaveWithStartDate(candidates, startDate)
  }

  async function save(confirmed: boolean) {
    setSaving(true)
    setSaveError('')
    try {
      if (!confirmed) {
        const existing = await existingEntry(form.startDate)
        if (existing) {
          setOverwrite(existing)
          return
        }
      }
      await createLeave(employeeId, form)
      setForm(EMPTY_LEAVE)
      setOverwrite(null)
      setSaved(true)
      onSaved()
    } catch (error) {
      setSaveError(describeApiError(error, t))
    } finally {
      setSaving(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const found = validateDateSpan(form.startDate, form.endDate)
    setErrors(found)
    setSaved(false)
    if (hasErrors(found)) return
    void save(false)
  }

  const fieldError = (field: 'startDate' | 'endDate') => (errors[field] ? t(errors[field]) : undefined)

  return (
    <section className="card" aria-labelledby="leave-create-title">
      <h2 id="leave-create-title" className="card__title">
        {t('leave.create.title')}
      </h2>
      <form className="form" onSubmit={submit} noValidate data-testid="leave-create-form">
        <div className="form-row">
          <Field
            id="leave-create-start-date"
            label={t('leave.create.startDate')}
            type="date"
            value={form.startDate}
            required
            error={fieldError('startDate')}
            data-testid="leave-create-start-date-input"
            onChange={(event) => update('startDate', event.target.value)}
          />
          <Field
            id="leave-create-end-date"
            label={t('leave.create.endDate')}
            type="date"
            value={form.endDate}
            required
            error={fieldError('endDate')}
            data-testid="leave-create-end-date-input"
            onChange={(event) => update('endDate', event.target.value)}
          />
          <Field
            id="leave-create-note"
            label={t('leave.create.note')}
            value={form.note}
            dir="auto"
            data-testid="leave-create-note-input"
            onChange={(event) => update('note', event.target.value)}
          />
        </div>
        {overwrite ? (
          <div className="alert alert--warning" role="alert" data-testid="leave-overwrite-warning">
            <p>{t('leave.overwrite.warning', { date: formatDate(overwrite.startDate) })}</p>
            <div className="form-actions">
              <button
                type="button"
                className="button button--warning"
                disabled={saving}
                data-testid="leave-overwrite-confirm-button"
                onClick={() => void save(true)}
              >
                {t('leave.overwrite.confirm')}
              </button>
              <button
                type="button"
                className="button button--ghost"
                data-testid="leave-overwrite-cancel-button"
                onClick={() => setOverwrite(null)}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="form-actions">
            <button type="submit" className="button button--primary" disabled={saving} data-testid="leave-create-submit-button">
              {saving ? t('common.saving') : t('leave.create.submit')}
            </button>
          </div>
        )}
        {saveError && (
          <p className="alert alert--error" role="alert" data-testid="leave-create-error">
            {saveError}
          </p>
        )}
        {saved && (
          <p className="alert alert--success" role="status" data-testid="leave-create-success">
            {t('leave.saved')}
          </p>
        )}
      </form>
    </section>
  )
}

interface EditLeaveFormProps {
  employeeId: string
  entry: Leave
  onSaved: () => void
  onCancel: () => void
}

/** FR3.3: only the end date and note can change; the start date identifies the entry. */
function EditLeaveForm({ employeeId, entry, onSaved, onCancel }: EditLeaveFormProps) {
  const { t, formatDate } = useI18n()
  const [endDate, setEndDate] = useState(entry.endDate)
  const [note, setNote] = useState(entry.note)
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const found = validateDateSpan(entry.startDate, endDate)
    setError(found.endDate ? t(found.endDate) : undefined)
    if (hasErrors(found)) return
    setSaving(true)
    setSaveError('')
    try {
      await updateLeave(employeeId, entry.startDate, { endDate, note })
      onSaved()
    } catch (failure) {
      setSaveError(describeApiError(failure, t))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card" aria-labelledby="leave-edit-title">
      <h2 id="leave-edit-title" className="card__title">
        {t('leave.update.title', { date: formatDate(entry.startDate) })}
      </h2>
      <form className="form" onSubmit={submit} noValidate data-testid="leave-edit-form">
        <div className="form-row">
          <Field
            id="leave-edit-end-date"
            label={t('leave.create.endDate')}
            type="date"
            value={endDate}
            required
            error={error}
            data-testid="leave-edit-end-date-input"
            onChange={(event) => setEndDate(event.target.value)}
          />
          <Field
            id="leave-edit-note"
            label={t('leave.create.note')}
            value={note}
            dir="auto"
            data-testid="leave-edit-note-input"
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={saving} data-testid="leave-edit-submit-button">
            {saving ? t('common.saving') : t('leave.update.submit')}
          </button>
          <button type="button" className="button button--ghost" data-testid="leave-edit-cancel-button" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        </div>
        {saveError && (
          <p className="alert alert--error" role="alert" data-testid="leave-edit-error">
            {saveError}
          </p>
        )}
      </form>
    </section>
  )
}

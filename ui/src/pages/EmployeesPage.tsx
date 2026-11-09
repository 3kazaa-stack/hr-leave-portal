import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { createEmployee, listEmployees } from '../api/client'
import type { Employee, EmployeeInput, HireDateFilter } from '../api/types'
import { Field } from '../components/Field'
import { useI18n } from '../i18n/i18n'
import { describeApiError } from './errors'
import { useReloadToken } from './useReloadToken'
import { hasErrors, validateEmployee, validateHireDateRange, type FieldErrors } from './validation'

const EMPTY_EMPLOYEE: EmployeeInput = { name: '', department: '', startDate: '', role: 'employee' }

type LoadState = { status: 'loading' } | { status: 'ready'; employees: Employee[] } | { status: 'error'; error: unknown }

/** FR2.1-FR2.3: employee list, hire-date filter and create form. */
export function EmployeesPage() {
  const { t, formatDate } = useI18n()
  const [reloadToken, reload] = useReloadToken()
  // Data changes from the hrAgent refetch in place, keeping the current rows visible meanwhile.
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [filter, setFilter] = useState<HireDateFilter | null>(null)
  const [hiredFrom, setHiredFrom] = useState('')
  const [hiredTo, setHiredTo] = useState('')

  useEffect(() => {
    let cancelled = false
    listEmployees(filter ?? undefined)
      .then((employees) => !cancelled && setState({ status: 'ready', employees }))
      .catch((error: unknown) => !cancelled && setState({ status: 'error', error }))
    return () => {
      cancelled = true
    }
  }, [filter, reloadToken])

  const filterProblem = validateHireDateRange(hiredFrom, hiredTo)
  const showFilterProblem = filterProblem !== null && (hiredFrom !== '' || hiredTo !== '')

  function applyFilter(event: FormEvent) {
    event.preventDefault()
    if (filterProblem !== null) return
    setState({ status: 'loading' })
    setFilter({ hiredFrom, hiredTo })
  }

  function clearFilter() {
    setHiredFrom('')
    setHiredTo('')
    setState({ status: 'loading' })
    setFilter(null)
  }

  function retry() {
    setState({ status: 'loading' })
    reload()
  }

  return (
    <div className="page" data-testid="employees-page">
      <h1>{t('employees.title')}</h1>

      <section className="card" aria-labelledby="employee-filter-title">
        <h2 id="employee-filter-title" className="card__title">
          {t('employees.filter.title')}
        </h2>
        <form className="form-row" onSubmit={applyFilter} data-testid="employee-filter-form" noValidate>
          <Field
            id="employee-filter-from"
            label={t('employees.filter.from')}
            type="date"
            value={hiredFrom}
            data-testid="employee-filter-from-input"
            onChange={(event) => setHiredFrom(event.target.value)}
          />
          <Field
            id="employee-filter-to"
            label={t('employees.filter.to')}
            type="date"
            value={hiredTo}
            data-testid="employee-filter-to-input"
            onChange={(event) => setHiredTo(event.target.value)}
          />
          <div className="form-actions">
            <button
              type="submit"
              className="button button--primary"
              disabled={filterProblem !== null}
              aria-describedby={showFilterProblem ? 'employee-filter-problem' : undefined}
              data-testid="employee-filter-apply-button"
            >
              {t('employees.filter.apply')}
            </button>
            {filter && (
              <button
                type="button"
                className="button button--ghost"
                data-testid="employee-filter-clear-button"
                onClick={clearFilter}
              >
                {t('employees.filter.clear')}
              </button>
            )}
          </div>
        </form>
        {showFilterProblem && (
          <p id="employee-filter-problem" className="field-error" role="status" data-testid="employee-filter-problem">
            {t(filterProblem)}
          </p>
        )}
        {filter && (
          <p className="muted">
            {t('employees.filter.active', { from: formatDate(filter.hiredFrom), to: formatDate(filter.hiredTo) })}
          </p>
        )}
      </section>

      <section className="card" aria-labelledby="employee-list-title">
        <h2 id="employee-list-title" className="card__title">
          {t('employees.tableLabel')}
        </h2>
        <EmployeeList state={state} onRetry={retry} />
      </section>

      <CreateEmployeeForm
        onCreated={(employee) =>
          setState((current) =>
            current.status === 'ready' ? { status: 'ready', employees: [...current.employees, employee] } : current,
          )
        }
      />
    </div>
  )
}

function EmployeeList({ state, onRetry }: { state: LoadState; onRetry: () => void }) {
  const { t, formatDate } = useI18n()

  if (state.status === 'loading') {
    return (
      <p className="muted" role="status" data-testid="employees-loading">
        {t('common.loading')}
      </p>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="alert alert--error" role="alert" data-testid="employees-error">
        <p>{describeApiError(state.error, t)}</p>
        <button type="button" className="button button--secondary" data-testid="employees-retry-button" onClick={onRetry}>
          {t('common.retry')}
        </button>
      </div>
    )
  }
  if (state.employees.length === 0) {
    return (
      <p className="muted" data-testid="employees-empty">
        {t('employees.empty')}
      </p>
    )
  }
  return (
    <div className="table-wrapper">
      <table className="data-table" data-testid="employees-table">
        <thead>
          <tr>
            <th scope="col">{t('employees.columns.name')}</th>
            <th scope="col">{t('employees.columns.department')}</th>
            <th scope="col">{t('employees.columns.startDate')}</th>
            <th scope="col">{t('employees.columns.role')}</th>
            <th scope="col">{t('employees.columns.employeeId')}</th>
          </tr>
        </thead>
        <tbody>
          {state.employees.map((employee) => (
            <tr key={employee.employeeId} data-testid="employees-table-row">
              <td dir="auto">
                <Link
                  to={`/employees/${encodeURIComponent(employee.employeeId)}`}
                  aria-label={t('employees.open', { name: employee.name })}
                  data-testid="employees-table-row-link"
                >
                  {employee.name}
                </Link>
              </td>
              <td dir="auto">{employee.department}</td>
              <td>{formatDate(employee.startDate)}</td>
              <td dir="auto">{employee.role}</td>
              <td dir="ltr">{employee.employeeId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CreateEmployeeForm({ onCreated }: { onCreated: (employee: Employee) => void }) {
  const { t } = useI18n()
  const [form, setForm] = useState<EmployeeInput>(EMPTY_EMPLOYEE)
  const [errors, setErrors] = useState<FieldErrors<'name' | 'department' | 'startDate'>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [createdName, setCreatedName] = useState('')

  function update(field: keyof EmployeeInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const found = validateEmployee(form)
    setErrors(found)
    setCreatedName('')
    setSaveError('')
    if (hasErrors(found)) return
    setSaving(true)
    try {
      const created = await createEmployee({
        ...form,
        name: form.name.trim(),
        department: form.department.trim(),
        role: form.role.trim() || EMPTY_EMPLOYEE.role,
      })
      onCreated(created)
      setCreatedName(created.name)
      setForm(EMPTY_EMPLOYEE)
    } catch (error) {
      setSaveError(describeApiError(error, t))
    } finally {
      setSaving(false)
    }
  }

  const fieldError = (field: 'name' | 'department' | 'startDate') => (errors[field] ? t(errors[field]) : undefined)

  return (
    <section className="card" aria-labelledby="employee-create-title">
      <h2 id="employee-create-title" className="card__title">
        {t('employees.create.title')}
      </h2>
      <form className="form" onSubmit={submit} noValidate data-testid="employee-create-form">
        <div className="form-row">
          <Field
            id="employee-create-name"
            label={t('employees.create.name')}
            value={form.name}
            dir="auto"
            required
            error={fieldError('name')}
            data-testid="employee-create-name-input"
            onChange={(event) => update('name', event.target.value)}
          />
          <Field
            id="employee-create-department"
            label={t('employees.create.department')}
            value={form.department}
            dir="auto"
            required
            error={fieldError('department')}
            data-testid="employee-create-department-input"
            onChange={(event) => update('department', event.target.value)}
          />
          <Field
            id="employee-create-start-date"
            label={t('employees.create.startDate')}
            type="date"
            value={form.startDate}
            required
            error={fieldError('startDate')}
            data-testid="employee-create-start-date-input"
            onChange={(event) => update('startDate', event.target.value)}
          />
          <Field
            id="employee-create-role"
            label={t('employees.create.role')}
            value={form.role}
            dir="auto"
            data-testid="employee-create-role-input"
            onChange={(event) => update('role', event.target.value)}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={saving} data-testid="employee-create-submit-button">
            {saving ? t('common.saving') : t('employees.create.submit')}
          </button>
        </div>
        {saveError && (
          <p className="alert alert--error" role="alert" data-testid="employee-create-error">
            {saveError}
          </p>
        )}
        {createdName && (
          <p className="alert alert--success" role="status" data-testid="employee-create-success">
            {t('employees.create.success', { name: createdName })}
          </p>
        )}
      </form>
    </section>
  )
}

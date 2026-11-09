import { useState, type FormEvent } from 'react'
import { getCurrentUser } from 'aws-amplify/auth'
import { submitHrRequest, submitTimeOff } from '../api/client'
import { Field, TextAreaField } from '../components/Field'
import { useI18n } from '../i18n/i18n'
import { describeApiError } from './errors'
import { hasErrors, validateDateSpan, validateHrPrompt, type FieldErrors } from './validation'

/** The signed-in user's Cognito id (sub); never typed by the user (FR4.1, FR4.2). */
async function signedInUserId(): Promise<string> {
  const { userId } = await getCurrentUser()
  return userId
}

/** FR4.1-FR4.3: time-off requests and free-text HR inquiries, emailed to HR. */
export function HrRequestsPage() {
  const { t } = useI18n()
  return (
    <div className="page" data-testid="hr-requests-page">
      <h1>{t('hr.title')}</h1>
      <p className="muted">{t('hr.intro')}</p>
      <div className="grid-two">
        <TimeOffForm />
        <InquiryForm />
      </div>
    </div>
  )
}

function SubmitResult({ sent, error, testIdPrefix }: { sent: boolean; error: string; testIdPrefix: string }) {
  const { t } = useI18n()
  if (error) {
    return (
      <p className="alert alert--error" role="alert" data-testid={`${testIdPrefix}-error`}>
        {error}
      </p>
    )
  }
  if (!sent) return null
  return (
    <p className="alert alert--success" role="status" data-testid={`${testIdPrefix}-sent`}>
      {t('hr.sent')}
    </p>
  )
}

function TimeOffForm() {
  const { t } = useI18n()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [errors, setErrors] = useState<FieldErrors<'startDate' | 'endDate'>>({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const found = validateDateSpan(startDate, endDate)
    setErrors(found)
    setSent(false)
    setSendError('')
    if (hasErrors(found)) return
    setSending(true)
    try {
      const userId = await signedInUserId()
      await submitTimeOff({ user_id: userId, start_date: startDate, end_date: endDate })
      setSent(true)
      setStartDate('')
      setEndDate('')
    } catch (error) {
      setSendError(describeApiError(error, t))
    } finally {
      setSending(false)
    }
  }

  const fieldError = (field: 'startDate' | 'endDate') => (errors[field] ? t(errors[field]) : undefined)

  return (
    <section className="card" aria-labelledby="time-off-title">
      <h2 id="time-off-title" className="card__title">
        {t('hr.timeOff.title')}
      </h2>
      <form className="form" onSubmit={submit} noValidate data-testid="time-off-form">
        <Field
          id="time-off-start-date"
          label={t('hr.timeOff.startDate')}
          type="date"
          value={startDate}
          required
          error={fieldError('startDate')}
          data-testid="time-off-start-date-input"
          onChange={(event) => setStartDate(event.target.value)}
        />
        <Field
          id="time-off-end-date"
          label={t('hr.timeOff.endDate')}
          type="date"
          value={endDate}
          required
          error={fieldError('endDate')}
          data-testid="time-off-end-date-input"
          onChange={(event) => setEndDate(event.target.value)}
        />
        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={sending} data-testid="time-off-submit-button">
            {sending ? t('common.sending') : t('hr.timeOff.submit')}
          </button>
        </div>
        <SubmitResult sent={sent} error={sendError} testIdPrefix="time-off" />
      </form>
    </section>
  )
}

function InquiryForm() {
  const { t } = useI18n()
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const problem = validateHrPrompt(prompt)
    setError(problem ? t(problem) : undefined)
    setSent(false)
    setSendError('')
    if (problem) return
    setSending(true)
    try {
      const userId = await signedInUserId()
      await submitHrRequest({ user_id: userId, prompt: prompt.trim() })
      setSent(true)
      setPrompt('')
    } catch (failure) {
      setSendError(describeApiError(failure, t))
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="card" aria-labelledby="inquiry-title">
      <h2 id="inquiry-title" className="card__title">
        {t('hr.inquiry.title')}
      </h2>
      <form className="form" onSubmit={submit} noValidate data-testid="inquiry-form">
        <TextAreaField
          id="inquiry-prompt"
          label={t('hr.inquiry.prompt')}
          value={prompt}
          rows={5}
          dir="auto"
          required
          error={error}
          data-testid="inquiry-prompt-input"
          onChange={(event) => setPrompt(event.target.value)}
        />
        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={sending} data-testid="inquiry-submit-button">
            {sending ? t('common.sending') : t('hr.inquiry.submit')}
          </button>
        </div>
        <SubmitResult sent={sent} error={sendError} testIdPrefix="inquiry" />
      </form>
    </section>
  )
}

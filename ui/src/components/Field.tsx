import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface FieldBaseProps {
  id: string
  label: string
  /** Already-translated error text; shown as text, not colour only (NFR5). */
  error?: string
}

function errorProps(id: string, error?: string) {
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  }
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null
  return (
    <p id={`${id}-error`} className="field-error" role="alert">
      {error}
    </p>
  )
}

export function Field({ id, label, error, ...inputProps }: FieldBaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} {...errorProps(id, error)} {...inputProps} />
      <FieldError id={id} error={error} />
    </div>
  )
}

export function TextAreaField({
  id,
  label,
  error,
  ...textareaProps
}: FieldBaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} {...errorProps(id, error)} {...textareaProps} />
      <FieldError id={id} error={error} />
    </div>
  )
}

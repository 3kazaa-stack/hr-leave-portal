import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { AgentError, streamAgentReply, type AgentErrorKind } from '../agent/agentClient'
import { newSessionId } from '../agent/session'
import { emitDataChanged } from '../api/dataEvents'
import { useI18n } from '../i18n/i18n'

interface ChatMessage {
  id: number
  role: 'user' | 'agent'
  text: string
}

interface ChatFailure {
  kind: AgentErrorKind
  status: number | null
}

interface ChatPanelProps {
  open: boolean
  onClose: () => void
}

function toFailure(error: unknown): ChatFailure {
  if (error instanceof AgentError) return { kind: error.kind, status: error.status }
  console.error('hrAgent call failed', error)
  return { kind: 'network', status: null }
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

/** The hrAgent chat drawer (FR5.1-FR5.6), reachable from every screen. */
export function ChatPanel({ open, onClose }: ChatPanelProps) {
  const { t } = useI18n()
  const titleId = useId()
  const [sessionId, setSessionId] = useState(newSessionId)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState<ChatFailure | null>(null)
  const [lastPrompt, setLastPrompt] = useState<string | null>(null)
  const nextId = useRef(1)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => () => abortRef.current?.abort(), [])

  function appendChunk(agentId: number, chunk: string) {
    setMessages((current) =>
      current.map((message) => (message.id === agentId ? { ...message, text: message.text + chunk } : message)),
    )
  }

  async function send(prompt: string, isRetry: boolean) {
    const agentId = nextId.current++
    const added: ChatMessage[] = [{ id: agentId, role: 'agent', text: '' }]
    if (!isRetry) added.unshift({ id: nextId.current++, role: 'user', text: prompt })
    setMessages((current) => [...current, ...added])
    setFailure(null)
    setPending(true)
    setLastPrompt(prompt)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      for await (const chunk of streamAgentReply({ prompt, sessionId, signal: controller.signal })) {
        appendChunk(agentId, chunk)
      }
      emitDataChanged()
    } catch (error) {
      if (isAbort(error)) return
      setFailure(toFailure(error))
      setMessages((current) => current.filter((message) => message.id !== agentId || message.text !== ''))
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setPending(false)
      }
    }
  }

  function handleSubmit(event: FormEvent | KeyboardEvent) {
    event.preventDefault()
    const prompt = draft.trim()
    if (prompt === '' || pending) return
    setDraft('')
    void send(prompt, false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) handleSubmit(event)
  }

  function startNewConversation() {
    abortRef.current?.abort()
    abortRef.current = null
    setPending(false)
    setSessionId(newSessionId())
    setMessages([])
    setFailure(null)
    setLastPrompt(null)
    setDraft('')
    inputRef.current?.focus()
  }

  function failureText(value: ChatFailure): string {
    return t(`chat.errors.${value.kind}`, { status: value.status ?? '' })
  }

  return (
    <aside
      className="chat-drawer"
      role="dialog"
      aria-labelledby={titleId}
      hidden={!open}
      data-testid="chat-panel"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div className="chat-drawer__header">
        <h2 id={titleId}>{t('chat.title')}</h2>
        <div className="form-actions">
          <button
            type="button"
            className="button button--ghost"
            data-testid="chat-new-conversation-button"
            onClick={startNewConversation}
          >
            {t('chat.newConversation')}
          </button>
          <button
            type="button"
            className="button button--ghost"
            aria-label={t('chat.close')}
            data-testid="chat-close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </div>

      <ol className="chat-messages" aria-live="polite" data-testid="chat-messages">
        {messages.length === 0 && <li className="muted">{t('chat.empty')}</li>}
        {messages.map((message) => (
          <li key={message.id} className={`chat-message chat-message--${message.role}`} data-testid="chat-message">
            <span className="chat-message__author">{message.role === 'user' ? t('chat.you') : t('chat.agent')}</span>
            <span dir="auto">{message.text}</span>
          </li>
        ))}
      </ol>

      <div className="chat-status">
        {pending && (
          <p className="muted" role="status" data-testid="chat-pending">
            {t('chat.thinking')}
          </p>
        )}
        {failure && (
          <div className="alert alert--error" role="alert" data-testid="chat-error">
            <p>{failureText(failure)}</p>
            {lastPrompt !== null && failure.kind !== 'session-expired' && (
              <button
                type="button"
                className="button button--secondary"
                data-testid="chat-retry-button"
                onClick={() => void send(lastPrompt, true)}
              >
                {t('chat.retry')}
              </button>
            )}
          </div>
        )}
      </div>

      <form className="chat-form" onSubmit={handleSubmit} data-testid="chat-form">
        <label htmlFor={`${titleId}-input`} className="visually-hidden">
          {t('chat.input')}
        </label>
        <textarea
          id={`${titleId}-input`}
          ref={inputRef}
          dir="auto"
          rows={2}
          value={draft}
          placeholder={t('chat.input')}
          data-testid="chat-input"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="submit"
          className="button button--primary"
          disabled={pending || draft.trim() === ''}
          data-testid="chat-send-button"
        >
          {t('chat.send')}
        </button>
      </form>
    </aside>
  )
}

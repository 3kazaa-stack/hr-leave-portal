// Streaming client for the hrAgent AgentCore runtime (FR5.2-FR5.4).
// The browser calls the AgentCore data plane directly with the Cognito access token.
// If the deployed runtime rejects browser CORS requests (FR5.5), change agentInvocationUrl()
// and the auth header below to point at the API proxy route; nothing else calls AgentCore.

import { fetchAuthSession } from 'aws-amplify/auth'
import { emitSessionExpired } from '../auth/sessionEvents'
import { getAppConfig, type AppConfig } from '../config/config'

export type AgentErrorKind = 'network' | 'http' | 'stream-interrupted' | 'agent' | 'session-expired'

export class AgentError extends Error {
  readonly kind: AgentErrorKind
  readonly status: number | null

  constructor(kind: AgentErrorKind, message: string, status: number | null = null) {
    super(message)
    this.name = 'AgentError'
    this.kind = kind
    this.status = status
  }
}

export const SESSION_HEADER = 'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id'

export function agentInvocationUrl(config: AppConfig): string {
  const arn = encodeURIComponent(config.agentRuntimeArn)
  return `https://bedrock-agentcore.${config.region}.amazonaws.com/runtimes/${arn}/invocations?qualifier=DEFAULT`
}

async function accessToken(): Promise<string> {
  let token: string | undefined
  try {
    const session = await fetchAuthSession()
    token = session.tokens?.accessToken?.toString()
  } catch (error) {
    console.error('Could not read the Cognito session', error)
  }
  if (!token) {
    emitSessionExpired()
    throw new AgentError('session-expired', 'Your session has expired.', 401)
  }
  return token
}

/** Pulls the reply text out of one Strands stream event, or returns null for other events. */
export function textFromEvent(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null
  const record = payload as Record<string, unknown>
  if (typeof record.error === 'string') {
    throw new AgentError('agent', record.error)
  }
  const event = record.event as { contentBlockDelta?: { delta?: { text?: unknown } } } | undefined
  const text = event?.contentBlockDelta?.delta?.text
  return typeof text === 'string' ? text : null
}

function textFromSseLine(line: string): string | null {
  if (!line.startsWith('data:')) return null
  const data = line.slice(5).trim()
  if (data === '') return null
  let payload: unknown
  try {
    payload = JSON.parse(data)
  } catch {
    return null
  }
  return textFromEvent(payload)
}

async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>
      try {
        chunk = await reader.read()
      } catch (error) {
        if ((error as Error).name === 'AbortError') throw error
        throw new AgentError('stream-interrupted', 'The reply stream was cut off.')
      }
      if (chunk.done) break
      buffer += decoder.decode(chunk.value, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const text = textFromSseLine(line)
        if (text) yield text
      }
    }
    const last = textFromSseLine(buffer + decoder.decode())
    if (last) yield last
  } finally {
    reader.releaseLock()
  }
}

export interface AgentRequest {
  prompt: string
  sessionId: string
  signal?: AbortSignal
}

/** Sends one message to the hrAgent and yields the reply text as it streams in. */
export async function* streamAgentReply(request: AgentRequest): AsyncGenerator<string> {
  const config = getAppConfig()
  const token = await accessToken()
  let response: Response
  try {
    response = await fetch(agentInvocationUrl(config), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        [SESSION_HEADER]: request.sessionId,
      },
      body: JSON.stringify({ prompt: request.prompt }),
      signal: request.signal,
    })
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error
    throw new AgentError('network', `Could not reach the hrAgent: ${(error as Error).message}`)
  }
  if (response.status === 401) {
    emitSessionExpired()
    throw new AgentError('session-expired', 'Your session has expired.', 401)
  }
  if (!response.ok) {
    throw new AgentError('http', `The hrAgent returned HTTP ${response.status}.`, response.status)
  }
  if (!response.body) {
    throw new AgentError('stream-interrupted', 'The hrAgent sent no reply.')
  }
  yield* readSse(response.body)
}

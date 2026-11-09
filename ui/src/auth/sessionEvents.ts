// Session-expired signal shared by the REST client, the agent client and the app shell (FR1.5).

const SESSION_EXPIRED_EVENT = 'hr-portal:session-expired'

export function emitSessionExpired(): void {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}

export function onSessionExpired(listener: () => void): () => void {
  window.addEventListener(SESSION_EXPIRED_EVENT, listener)
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, listener)
}

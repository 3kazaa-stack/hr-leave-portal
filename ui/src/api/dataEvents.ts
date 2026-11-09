// Raised after each hrAgent reply, because the agent can change or delete records (FR5.6).
// Open employee and leave screens listen and refetch.

const DATA_CHANGED_EVENT = 'hr-portal:data-changed'

export function emitDataChanged(): void {
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT))
}

export function onDataChanged(listener: () => void): () => void {
  window.addEventListener(DATA_CHANGED_EVENT, listener)
  return () => window.removeEventListener(DATA_CHANGED_EVENT, listener)
}

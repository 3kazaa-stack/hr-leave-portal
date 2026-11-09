// AgentCore requires runtime session ids of at least 33 characters (FR5.3).

export const MIN_SESSION_ID_LENGTH = 33

export function newSessionId(): string {
  const id = `hr-portal-${crypto.randomUUID()}`
  if (id.length < MIN_SESSION_ID_LENGTH) {
    throw new Error('Generated session id is shorter than AgentCore allows.')
  }
  return id
}

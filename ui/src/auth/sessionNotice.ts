import { createContext, useContext } from 'react'

/** True after the app signed the user out because the session expired (FR1.5). */
export const SessionNoticeContext = createContext(false)

export function useSessionExpiredNotice(): boolean {
  return useContext(SessionNoticeContext)
}

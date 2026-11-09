import { useCallback, useEffect, useState } from 'react'
import { onDataChanged } from '../api/dataEvents'

/** A counter that changes after each hrAgent reply or a manual reload, for use as an effect dependency. */
export function useReloadToken(): [number, () => void] {
  const [token, setToken] = useState(0)
  const reload = useCallback(() => setToken((value) => value + 1), [])
  useEffect(() => onDataChanged(reload), [reload])
  return [token, reload]
}

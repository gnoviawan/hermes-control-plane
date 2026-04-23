import { useEffect, useState } from 'react'
import type { ApiResult } from '../types'

interface ApiQueryState<T> {
  data?: T
  isLoading: boolean
  isMock: boolean
  error?: string
  refresh: () => Promise<void>
}

export function useApiQuery<T>(query: () => Promise<ApiResult<T>>, deps: unknown[] = []): ApiQueryState<T> {
  const [data, setData] = useState<T>()
  const [isLoading, setIsLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)
  const [error, setError] = useState<string>()
  const [version, setVersion] = useState(0)

  // Re-fetch when deps change
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setIsLoading(true)
      const result = await query()
      if (!cancelled) {
        setData(result.data)
        setIsMock(result.mock)
        setError(result.error)
        setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps])

  const refresh = async () => {
    setVersion(v => v + 1)
  }

  return { data, isLoading, isMock, error, refresh }
}
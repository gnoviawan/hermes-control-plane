import { useCallback, useEffect, useState } from 'react'
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

  const refresh = useCallback(async () => {
    setIsLoading(true)
    const result = await query()
    setData(result.data)
    setIsMock(result.mock)
    setError(result.error)
    setIsLoading(false)
  }, deps)

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, isLoading, isMock, error, refresh }
}

import { getAuthHeader } from '@/hooks/auth/token-store'
import { useEffect, useMemo, useRef, useState } from 'react'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? ''
const GRAPHQL_URL = process.env.EXPO_PUBLIC_GRAPHQL_URL ?? `${API_BASE_URL}/graphql`

export type UseGraphQLQueryOptions<TData, TVariables> = {
  query: string
  variables?: TVariables
  skip?: boolean
  fetchPolicy?: 'cache-first' | 'network-only'
  onSuccess?: (data: TData) => void
  onError?: (error: Error) => void
}

export type UseGraphQLQueryResult<TData> = {
  data: TData | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useGraphQLQuery<TData = any, TVariables = Record<string, unknown>>({
  query,
  variables,
  skip = false,
  onSuccess,
  onError,
}: UseGraphQLQueryOptions<TData, TVariables>): UseGraphQLQueryResult<TData> {
  const [data, setData] = useState<TData | null>(null)
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState<Error | null>(null)

  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  useEffect(() => { onSuccessRef.current = onSuccess }, [onSuccess])
  useEffect(() => { onErrorRef.current = onError }, [onError])

  const variablesKey = JSON.stringify(variables ?? null)

  const execute = useMemo(() => async () => {
    if (skip) { setLoading(false); return }
    try {
      setLoading(true)
      setError(null)

      const authHeader = await getAuthHeader()
      if (!authHeader) throw new Error('No access token available')

      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ query, variables: JSON.parse(variablesKey) }),
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        throw new Error(`GraphQL request failed ${response.status}: ${body}`)
      }

      const json = await response.json()
      if (json.errors?.length) {
        throw new Error(json.errors[0]?.message ?? 'GraphQL error')
      }

      const result = json.data as TData
      setData(result)
      onSuccessRef.current?.(result)
    } catch (err) {
      const e = err instanceof Error ? err : new Error('GraphQL request failed')
      setError(e)
      onErrorRef.current?.(e)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, variablesKey, skip])

  useEffect(() => { void execute() }, [execute])

  return { data, loading, error, refetch: execute }
}

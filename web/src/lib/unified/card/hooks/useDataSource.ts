/**
 * useDataSource - Unified data fetching hook for cards
 *
 * Supports multiple data source types:
 * - hook: Use a registered data hook (e.g., useClusters, usePods)
 * - api: Direct API fetch with optional polling
 * - static: Static data array
 * - context: Read from React context
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { CardDataSource } from '../../types'

// Hook registry - populated by registerDataHook
const dataHookRegistry: Record<
  string,
  (params?: Record<string, unknown>) => {
    data: unknown[] | undefined
    isLoading: boolean
    error: Error | null
    refetch?: () => void
  }
> = {}

/**
 * Register a data hook for use in card configs
 *
 * @example
 * registerDataHook('useCachedPodIssues', useCachedPodIssues)
 */
export function registerDataHook(
  name: string,
  hook: (params?: Record<string, unknown>) => {
    data: unknown[] | undefined
    isLoading: boolean
    error: Error | null
    refetch?: () => void
  }
) {
  dataHookRegistry[name] = hook
}

/**
 * Get a registered data hook
 */
export function getDataHook(name: string) {
  return dataHookRegistry[name]
}

/**
 * List all registered data hooks
 */
export function getRegisteredDataHooks(): string[] {
  return Object.keys(dataHookRegistry)
}

export interface UseDataSourceResult {
  data: unknown[] | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export interface UseDataSourceOptions {
  /** Skip fetching data (useful when overrideData is provided) */
  skip?: boolean
}

const EMPTY_RESULT: UseDataSourceResult = {
  data: undefined,
  isLoading: false,
  error: null,
  refetch: () => {},
}

/**
 * Unified data source hook
 *
 * IMPORTANT: This hook must be used with a stable config reference.
 * Changing config.type between renders will cause issues due to React's
 * rules of hooks. Each data source type has its own component wrapper
 * that should be used instead if dynamic switching is needed.
 */
export function useDataSource(
  config: CardDataSource,
  options?: UseDataSourceOptions
): UseDataSourceResult {
  const skip = options?.skip ?? false

  // Call ALL hooks unconditionally - they check internally if they should be active
  // This satisfies React's rules of hooks
  // When skip is true, pass null to all hooks to make them return empty results
  const hookResult = useHookDataSourceInternal(
    !skip && config.type === 'hook' ? config.hook : null,
    !skip && config.type === 'hook' ? config.params : undefined
  )

  const apiResult = useApiDataSourceInternal(
    !skip && config.type === 'api' ? config.endpoint : null,
    !skip && config.type === 'api' ? config.method : 'GET',
    !skip && config.type === 'api' ? config.params : undefined,
    !skip && config.type === 'api' ? config.pollInterval : undefined
  )

  const staticResult = useStaticDataSourceInternal(
    !skip && config.type === 'static' ? (config.data ?? null) : null
  )

  const contextResult = useContextDataSourceInternal(
    !skip && config.type === 'context' ? config.contextKey : null
  )

  // If skip is true, return empty result
  if (skip) {
    return EMPTY_RESULT
  }

  // Return the appropriate result based on config type
  switch (config.type) {
    case 'hook':
      return hookResult
    case 'api':
      return apiResult
    case 'static':
      return staticResult
    case 'context':
      return contextResult
    default: {
      // Exhaustive check
      const _exhaustiveCheck: never = config
      return {
        data: undefined,
        isLoading: false,
        error: new Error(`Unknown data source type: ${(_exhaustiveCheck as CardDataSource).type}`),
        refetch: () => {},
      }
    }
  }
}

/**
 * Hook-based data source (internal - always runs but skips if hookName is null)
 */
function useHookDataSourceInternal(
  hookName: string | null,
  params?: Record<string, unknown>
): UseDataSourceResult {
  // Memoize error result
  const errorResult = useMemo<UseDataSourceResult>(
    () => {
      if (!hookName) return EMPTY_RESULT
      return {
        data: undefined,
        isLoading: false,
        error: new Error(
          `Data hook not registered: ${hookName}. Register it with registerDataHook().`
        ),
        refetch: () => {},
      }
    },
    [hookName]
  )

  // Get the hook from registry
  const registeredHook = hookName ? dataHookRegistry[hookName] : null

  // Call the hook if it exists, otherwise use a stable empty result
  // Note: We can't conditionally call hooks, but we CAN conditionally
  // pass null to a function that returns stable results
  const hookResult = registeredHook ? registeredHook(params) : null

  // Return appropriate result
  if (!hookName) {
    return EMPTY_RESULT
  }

  if (!hookResult) {
    return errorResult
  }

  return {
    data: hookResult.data,
    isLoading: hookResult.isLoading,
    error: hookResult.error,
    refetch: hookResult.refetch ?? (() => {}),
  }
}

/**
 * API-based data source (internal - always runs but skips if endpoint is null)
 */
function useApiDataSourceInternal(
  endpoint: string | null,
  method: 'GET' | 'POST' = 'GET',
  params?: Record<string, unknown>,
  pollInterval?: number
): UseDataSourceResult {
  const [data, setData] = useState<unknown[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(!!endpoint)
  const [error, setError] = useState<Error | null>(null)

  // Stringify params for stable dependency comparison
  const paramsKey = useMemo(() => (params ? JSON.stringify(params) : ''), [params])

  const fetchData = useCallback(async () => {
    if (!endpoint) return

    try {
      setIsLoading(true)
      setError(null)

      let url = endpoint
      if (method === 'GET' && params) {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value))
          }
        })
        url = `${endpoint}?${searchParams.toString()}`
      }

      const response = await fetch(url, {
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'POST' && params ? JSON.stringify(params) : undefined,
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const json = await response.json()
      // Assume response is array or has data array property
      const resultData = Array.isArray(json) ? json : json.data ?? json.items ?? []
      setData(resultData)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, method, paramsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initial fetch (only if endpoint is provided)
  useEffect(() => {
    if (endpoint) {
      fetchData()
    }
  }, [endpoint, fetchData])

  // Polling (only if endpoint and pollInterval are provided)
  useEffect(() => {
    if (!endpoint || !pollInterval || pollInterval <= 0) return

    const interval = setInterval(fetchData, pollInterval)
    return () => clearInterval(interval)
  }, [endpoint, fetchData, pollInterval])

  // Return empty result if no endpoint
  if (!endpoint) {
    return EMPTY_RESULT
  }

  return { data, isLoading, error, refetch: fetchData }
}

/**
 * Static data source (internal - always runs but skips if data is null)
 */
function useStaticDataSourceInternal(staticData: unknown[] | null): UseDataSourceResult {
  return useMemo(
    () => {
      if (!staticData) return EMPTY_RESULT
      return {
        data: staticData,
        isLoading: false,
        error: null,
        refetch: () => {},
      }
    },
    [staticData]
  )
}

/**
 * Context-based data source (internal - always runs but skips if contextKey is null)
 */
function useContextDataSourceInternal(contextKey: string | null): UseDataSourceResult {
  return useMemo(
    () => {
      if (!contextKey) return EMPTY_RESULT
      // TODO: Implement context registry similar to hook registry
      return {
        data: undefined,
        isLoading: false,
        error: new Error(`Context data source not yet implemented: ${contextKey}`),
        refetch: () => {},
      }
    },
    [contextKey]
  )
}

export default useDataSource

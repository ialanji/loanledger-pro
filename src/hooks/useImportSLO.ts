import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

export type ImportSource = 'salariul' | 'cheltueli' | 'rechizite'
export const IMPORT_SOURCES: ImportSource[] = ['salariul', 'cheltueli', 'rechizite']

export type ImportStatus = 'ok' | 'warn' | 'error' | 'not_configured'

export interface SourceSLO {
  source: ImportSource
  status: ImportStatus
  lastSuccessAt: Date | null
  lastErrorAt?: Date | null
  latencyMinutes: number | null
  errorMessage?: string | null
}

export interface ImportSLO {
  overallStatus: ImportStatus
  perSource: Record<ImportSource, SourceSLO>
  isLoading: boolean
  notConfigured: boolean
  lastCheckedAt: Date
}

function minutesBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / 60000)
}

// Thresholds (can be tuned): green ≤60m, yellow 60-90m, red >90m
const WARN_THRESHOLD_MIN = 60
const ERROR_THRESHOLD_MIN = 90

export function useImportSLO(): ImportSLO {
  const { data, error, isLoading } = useQuery({
    queryKey: ['import_logs_slo'],
    queryFn: async ({ signal }) => {
      const data = await apiClient.get('/import-logs?limit=300&order=completed_at:desc', { signal })
      return data as Array<{ source: string; completed_at: string | null; status: string; error?: string | null }>
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const now = new Date()

  // Table not found or other errors => treat as not configured
  if (error) {
    return {
      overallStatus: 'not_configured',
      perSource: Object.fromEntries(
        IMPORT_SOURCES.map((s) => [s, { source: s, status: 'not_configured', lastSuccessAt: null, latencyMinutes: null }])
      ) as Record<ImportSource, SourceSLO>,
      isLoading,
      notConfigured: true,
      lastCheckedAt: now,
    }
  }

  // Build per-source stats
  const perSourceDefaults: Record<ImportSource, SourceSLO> = IMPORT_SOURCES.reduce((acc, s) => {
    acc[s] = {
      source: s,
      status: 'not_configured',
      lastSuccessAt: null,
      latencyMinutes: null,
    }
    return acc
  }, {} as Record<ImportSource, SourceSLO>)

  const perSource = { ...perSourceDefaults }

  if (data && data.length > 0) {
    for (const s of IMPORT_SOURCES) {
      const rows = data.filter((r) => r.source === s)
      if (rows.length === 0) continue

      const lastSuccess = rows.find((r) => r.status === 'success' && r.completed_at)
      const lastAny = rows[0]
      const lastError = rows.find((r) => r.status !== 'success' && r.completed_at)

      let status: ImportStatus = 'not_configured'
      let lastSuccessAt: Date | null = lastSuccess?.completed_at ? new Date(lastSuccess.completed_at) : null
      let lastErrorAt: Date | null = lastError?.completed_at ? new Date(lastError.completed_at) : null
      let latencyMinutes: number | null = null
      let errorMessage: string | null = lastAny?.status !== 'success' ? (lastAny.error ?? null) : null

      if (lastSuccessAt) {
        latencyMinutes = minutesBetween(now, lastSuccessAt)
        if (latencyMinutes <= WARN_THRESHOLD_MIN) status = 'ok'
        else if (latencyMinutes <= ERROR_THRESHOLD_MIN) status = 'warn'
        else status = 'error'

        // If the most recent record is an error and is newer than last success, override to error
        const lastAnyAt = lastAny?.completed_at ? new Date(lastAny.completed_at) : null
        if (lastAny && lastAny.status !== 'success' && lastAnyAt && lastAnyAt > lastSuccessAt) {
          status = 'error'
        }
      } else {
        // No success records at all
        status = 'error'
      }

      perSource[s] = {
        source: s,
        status,
        lastSuccessAt,
        lastErrorAt,
        latencyMinutes,
        errorMessage,
      }
    }
  }

  // Determine overall as the worst of sources: error > warn > ok > not_configured
  const order: ImportStatus[] = ['not_configured', 'ok', 'warn', 'error']
  const overallStatus = (Object.values(perSource) as SourceSLO[]).reduce<ImportStatus>((worst, cur) => {
    return order.indexOf(cur.status) > order.indexOf(worst) ? cur.status : worst
  }, 'not_configured')

  const notConfigured = overallStatus === 'not_configured'

  return {
    overallStatus,
    perSource,
    isLoading,
    notConfigured,
    lastCheckedAt: now,
  }
}
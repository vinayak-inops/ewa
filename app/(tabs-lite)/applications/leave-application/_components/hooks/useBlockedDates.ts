import { useMemo, useState } from 'react'
import { useGetRequest } from '@/hooks/api/useGetRequest'
import { useLeaveApplications } from './useLeaveApplications'

function parseDDMMYYYY(raw: string): Date | null {
  if (!raw) return null
  const parts = raw.split('-')
  if (parts.length !== 3) return null
  const [dd, mm, yyyy] = parts
  if (!dd || !mm || !yyyy) return null
  return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd))
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const SKIP_STATES = ['REJECTED', 'FAILED', 'CANCELLED']

export function useBlockedDates({
  isOpen,
  tenantCode,
  employeeId,
}: {
  isOpen: boolean
  tenantCode: string
  employeeId: string
}): Record<string, string> {
  const {
    applicationsData,
    updateApplicationsData,
    setLoadingState,
    setErrorState,
  } = useLeaveApplications()

  const [specialApps, setSpecialApps] = useState<any[]>([])

  const enabled = Boolean(isOpen && tenantCode && employeeId)
  const requestData = [
    { field: 'tenantCode', value: tenantCode, operator: 'eq' },
    { field: 'employeeID', value: employeeId, operator: 'eq' },
  ]

  useGetRequest<any[]>({
    url: 'leaveApplication/search?offset=0&limit=200',
    method: 'POST',
    data: requestData,
    enabled,
    dependencies: [isOpen, tenantCode, employeeId],
    onSuccess: (data: any) => { setLoadingState(false); updateApplicationsData(data) },
    onError: (err: any) => { setLoadingState(false); setErrorState(err?.message ?? 'Failed to load applications') },
  })

  useGetRequest<any[]>({
    url: 'specialLeaveApplication/search?offset=0&limit=200',
    method: 'POST',
    data: requestData,
    enabled,
    dependencies: [isOpen, tenantCode, employeeId],
    onSuccess: (data: any) => setSpecialApps(Array.isArray(data) ? data : []),
    onError: () => setSpecialApps([]),
  })

  return useMemo(() => {
    const map: Record<string, string> = {}

    const expandRange = (fromRaw: string, toRaw: string, state: string) => {
      const from = parseDDMMYYYY(fromRaw) ?? (fromRaw.length === 10 && fromRaw[4] === '-' ? new Date(fromRaw) : null)
      const to   = parseDDMMYYYY(toRaw)   ?? (toRaw.length === 10   && toRaw[4]   === '-' ? new Date(toRaw)   : null)
      if (!from || !to) return
      const cur = new Date(from)
      while (cur <= to) { map[toIso(cur)] = state; cur.setDate(cur.getDate() + 1) }
    }

    applicationsData.forEach(app => {
      const state = (app.workflowState || '').toUpperCase()
      if (SKIP_STATES.includes(state)) return
      if (app.leaves?.length > 0) {
        app.leaves.forEach((l: any) => {
          if (!l.date) return
          const parts = l.date.split('-')
          if (parts.length === 3) {
            const iso = parts[0]!.length === 4 ? l.date : `${parts[2]}-${parts[1]}-${parts[0]}`
            map[iso] = state
          }
        })
      } else if (app.fromDate && app.toDate) {
        expandRange(app.fromDate, app.toDate, state)
      }
    })

    specialApps.forEach(app => {
      const state = (app.workflowState || '').toUpperCase()
      if (SKIP_STATES.includes(state)) return
      const from = parseDDMMYYYY(app.fromDate)
      const to   = parseDDMMYYYY(app.toDate)
      if (!from || !to) return
      const cur = new Date(from)
      while (cur <= to) { map[toIso(cur)] = state; cur.setDate(cur.getDate() + 1) }
    })

    return map
  }, [applicationsData, specialApps])
}

import { useState } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BalanceData {
  leaveTitle: string
  leaveCode: string
  unitOfTime: string
  beginningYearBalance: number
  carryoverBalance: number
  absencePaidYearToDate: number
  absencePaidInPeriod: number
  beginningPeriodBalance: number
  accruedInPeriod: number
  carryoverForfeitedInPeriod: number
  balance: number
  encashed: number
  includeEventsAwaitingApproval: number
  asOfPeriod: string
}

interface ApiResponse {
  balances: BalanceData[]
  employeeID: string
}

export interface DashboardBalanceData {
  type: string
  balance: number
  used: number
  total: number
  leaveCode: string
  unitOfTime: string
  asOfPeriod: string
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export const useLeaveBalances = () => {
  const [balanceData, setBalanceData] = useState<DashboardBalanceData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const transformApiData = (apiData: ApiResponse): DashboardBalanceData[] =>
    apiData.balances.map((b) => ({
      type: b.leaveTitle,
      balance: b.balance,
      used: b.absencePaidYearToDate,
      total: b.beginningYearBalance + b.carryoverBalance + b.accruedInPeriod,
      leaveCode: b.leaveCode,
      unitOfTime: b.unitOfTime,
      asOfPeriod: b.asOfPeriod,
    }))

  const handleApiResponse = (rawData: any) => {
    try {
      let apiData: ApiResponse

      if (rawData?.balances && Array.isArray(rawData.balances) && rawData.employeeID) {
        apiData = rawData as ApiResponse
      } else if (rawData?.data?.balances && Array.isArray(rawData.data.balances)) {
        apiData = rawData.data as ApiResponse
      } else if (Array.isArray(rawData)) {
        const rawBalances = rawData[0]?.balances || []
        apiData = {
          balances: rawBalances.map((item: any) => ({
            leaveTitle: item.leaveTitle || item.leaveCode || '',
            leaveCode: item.leaveCode || '',
            unitOfTime: item.unitOfTime || 'Days',
            beginningYearBalance: item.beginningYearBalance || 0,
            carryoverBalance: item.carryoverBalance || 0,
            absencePaidYearToDate: item.absencePaidYearToDate || 0,
            absencePaidInPeriod: item.absencePaidInPeriod || 0,
            beginningPeriodBalance: item.beginningPeriodBalance || 0,
            accruedInPeriod: item.accruedInPeriod || 0,
            carryoverForfeitedInPeriod: item.carryoverForfeitedInPeriod || 0,
            balance: item.balance || 0,
            encashed: item.encashed || 0,
            includeEventsAwaitingApproval: item.includeEventsAwaitingApproval || 0,
            asOfPeriod: item.asOfPeriod || new Date().toISOString().split('T')[0],
          })),
          employeeID: rawData[0]?.employeeID || '',
        }
      } else {
        throw new Error('API response does not contain expected balance data')
      }

      setBalanceData(transformApiData(apiData))
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      console.error('[useLeaveBalances] Error processing balance data:', err)
      setError(err instanceof Error ? err.message : 'Failed to process balance data')
    }
  }

  const handleApiError = (err: any) => {
    console.error('[useLeaveBalances] Error fetching balance data:', err)
    setError(err instanceof Error ? err.message : 'Failed to fetch balance data')
  }

  return {
    balanceData,
    loading,
    error,
    lastUpdated,
    handleApiResponse,
    handleApiError,
    updateBalanceData: handleApiResponse,
    setErrorState: setError,
    setLoadingState: setLoading,
  }
}

import { useState } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Leave {
  date: string
  leaveCode: string
  duration: string
}

export interface LeaveApplication {
  _id: string
  tenantCode: string
  workflowName: string
  uploadedBy: string
  createdOn: string
  employeeID: string
  fromDate: string
  toDate: string
  uploadTime: string
  organizationCode: string
  appliedDate: string
  workflowState: string
  commentToApprover: string
  reason: string
  leaves: Leave[]
  noOfDays: number
  stateEvent: string
}

interface UseLeaveApplicationsReturn {
  applicationsData: LeaveApplication[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  updateApplicationInState: (id: string, updates: Partial<LeaveApplication>) => void
  handleApplicationApprovalUpdate: (id: string, action: 'approve' | 'reject' | 'cancel', remarks?: string) => void
  handleApiResponse: (rawData: any) => void
  handleApiError: (error: any) => void
  updateApplicationsData: (rawData: any) => void
  setLoadingState: (loading: boolean) => void
  setErrorState: (error: string | null) => void
  refetch: () => void
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export const useLeaveApplications = (): UseLeaveApplicationsReturn => {
  const [applicationsData, setApplicationsData] = useState<LeaveApplication[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const updateApplicationInState = (id: string, updates: Partial<LeaveApplication>) => {
    setApplicationsData(prev => prev.map(app => app._id === id ? { ...app, ...updates } : app))
  }

  const handleApiResponse = (rawData: any) => {
    try {
      if (!rawData || typeof rawData !== 'object') {
        throw new Error('Invalid API response format')
      }

      let apiData: any[]
      if (Array.isArray(rawData)) {
        apiData = rawData
      } else if (Array.isArray(rawData.data)) {
        apiData = rawData.data
      } else if (rawData.data) {
        apiData = [rawData.data]
      } else if (Array.isArray(rawData.applications)) {
        apiData = rawData.applications
      } else {
        throw new Error('API response does not contain expected leave application data')
      }

      const normalizedData: LeaveApplication[] = apiData.map((item: any) => ({
        _id: item._id || item.id || '',
        tenantCode: item.tenantCode || item.tenant || '',
        workflowName: item.workflowName || 'Leave Application',
        uploadedBy: item.uploadedBy || item.createdBy || '',
        createdOn: item.createdOn || item.createdAt || '',
        employeeID: item.employeeID || item.employeeId || item.empId || '',
        fromDate: item.fromDate || item.startDate || '',
        toDate: item.toDate || item.endDate || '',
        uploadTime: item.uploadTime || item.uploadedAt || item.createdAt || '',
        organizationCode: item.organizationCode || item.orgCode || '',
        appliedDate: item.appliedDate || item.applicationDate || '',
        workflowState: item.workflowState || item.status || item.state || '',
        commentToApprover: item.commentToApprover || item.approverComment || item.remarks || '',
        reason: item.remarks || item.reason || item.purpose || '',
        leaves: item.leaves || item.leaveDetails || [],
        noOfDays: parseInt(item.noOfDays) || item.totalDays || item.days || 0,
        stateEvent: item.stateEvent || '',
      }))

      setApplicationsData(normalizedData)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      console.error('[useLeaveApplications] Error processing data:', err)
      setError(err instanceof Error ? err.message : 'Failed to process applications data')
    }
  }

  const handleApiError = (err: any) => {
    console.error('[useLeaveApplications] Error fetching data:', err)
    setError(err instanceof Error ? err.message : 'Failed to fetch applications data')
  }

  const handleApplicationApprovalUpdate = (
    id: string,
    action: 'approve' | 'reject' | 'cancel',
    remarks?: string
  ) => {
    const stateMap = {
      approve: { workflowState: 'APPROVED', stateEvent: 'NEXT' },
      reject: { workflowState: 'REJECTED', stateEvent: 'REJECT' },
      cancel: { workflowState: 'CANCELLED', stateEvent: 'CANCEL' },
    }
    setApplicationsData(prev =>
      prev.map(app =>
        app._id === id
          ? { ...app, ...stateMap[action], commentToApprover: remarks ?? app.commentToApprover }
          : app
      )
    )
  }

  return {
    applicationsData,
    loading,
    error,
    lastUpdated,
    updateApplicationInState,
    handleApplicationApprovalUpdate,
    handleApiResponse,
    handleApiError,
    updateApplicationsData: handleApiResponse,
    setLoadingState: setLoading,
    setErrorState: setError,
    refetch: () => {},
  }
}

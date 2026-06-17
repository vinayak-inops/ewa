import { useState, useEffect } from 'react'
import { Alert } from 'react-native'
import { useLeaveApplications, LeaveApplication } from './useLeaveApplications'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface UseMessageReturn {
  messagesData: { id: string }[]
  applicationsData: LeaveApplication[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  refetch: () => Promise<void>
  showMessage: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export const useMessage = (): UseMessageReturn => {
  const [messagesData, setMessagesData] = useState<{ id: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const {
    applicationsData,
    updateApplicationsData,
    setLoadingState,
    setErrorState,
  } = useLeaveApplications()

  const fetchMessages = async () => {
    setLoading(true)
    setError(null)
    try {
      // Placeholder: replace with your actual workflow management API call via useGetRequest
      // when this hook is wired up to a real component.
      // The web version called:
      //   GET /api/query/attendance/workflow_management
      // and filtered leave applications whose _id matched returned fileIds.
      setMessagesData([])
      setLastUpdated(new Date())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch messages'
      setError(msg)
      setMessagesData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchMessages()
  }, [])

  // RN-compatible show message — uses Alert for errors/warnings, console for info/success.
  const showMessage = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    if (type === 'error' || type === 'warning') {
      Alert.alert(type === 'error' ? 'Error' : 'Warning', msg)
    } else {
      console.log(`[${type.toUpperCase()}] ${msg}`)
    }
  }

  return {
    messagesData,
    applicationsData,
    loading,
    error,
    lastUpdated,
    refetch: fetchMessages,
    showMessage,
  }
}

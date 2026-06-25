import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

export function useLeaveIdentity() {
  const employeeId = useSelector((s: RootState) => s.role.employeeId) ?? ''
  const tenantCode = useSelector((s: RootState) => s.role.org) ?? ''
  return { employeeId, tenantCode }
}

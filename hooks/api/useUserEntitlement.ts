import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

export interface UserEntitlement {
  employeeID?: string
  roleID?: string
  subsidiary?: string[]
  division?: string[]
  department?: string[]
  contractor?: string[]
  location?: string[]
  organizationCode?: string
  tenantCode?: string
  isManager?: boolean
  isEndUser?: boolean
}

/**
 * Builds a UserEntitlement object from the logged-in user's Redux identity
 * (state.role.employeeId) and their data-scope from Redux hierarchy
 * (state.hierarchy.data).
 *
 * Optionally accepts an explicit employeeId override (e.g. when acting on
 * behalf of another employee).
 *
 * @example
 * // Typical usage — fully from Redux, no args needed
 * const userEntitlement = useUserEntitlement()
 * // Returns: { employeeID: "EMP025", subsidiary: ["M01",...], isManager: false, ... }
 *
 * @example
 * // Override employeeId (e.g. manager viewing a specific employee)
 * const userEntitlement = useUserEntitlement('EMP099')
 */
export function useUserEntitlement(employeeIdOverride?: string | null): UserEntitlement {
  const reduxEmployeeId = useSelector((s: RootState) => s.role.employeeId)
  const hierarchy = useSelector((s: RootState) => s.hierarchy.data)

  return useMemo(() => {
    const entitlement: UserEntitlement = {}

    const employeeId = employeeIdOverride?.trim() || reduxEmployeeId?.trim()
    if (employeeId) entitlement.employeeID = employeeId

    if (hierarchy?.roleID)         entitlement.roleID = hierarchy.roleID
    if (hierarchy?.organizationCode) entitlement.organizationCode = hierarchy.organizationCode
    if (hierarchy?.tenantCode)     entitlement.tenantCode = hierarchy.tenantCode

    if (hierarchy?.subsidiaries?.length)  entitlement.subsidiary = hierarchy.subsidiaries
    if (hierarchy?.divisions?.length)     entitlement.division   = hierarchy.divisions
    if (hierarchy?.departments?.length)   entitlement.department = hierarchy.departments
    if (hierarchy?.contractors?.length)   entitlement.contractor = hierarchy.contractors
    if (hierarchy?.locations?.length)     entitlement.location   = hierarchy.locations

    if (hierarchy?.isManager !== undefined) entitlement.isManager = hierarchy.isManager
    if (hierarchy?.isEndUser !== undefined) entitlement.isEndUser = hierarchy.isEndUser

    return entitlement
  }, [employeeIdOverride, reduxEmployeeId, hierarchy])
}

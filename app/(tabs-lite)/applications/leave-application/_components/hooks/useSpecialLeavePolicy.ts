import { useGraphQLQuery } from '@/hooks/api/useGraphQLQuery'
import { useUserEntitlement, type UserEntitlement } from '@/hooks/api/useUserEntitlement'
import { useMemo } from 'react'

export interface SpecialLeaveOption {
  leaveCode: string
  leaveTitle: string
}

function arr(values: string[]): string {
  return `[${values.map(v => `"${v}"`).join(', ')}]`
}

function buildUeArg(ue: UserEntitlement): string {
  const parts: string[] = []
  if (ue.employeeID)          parts.push(`employeeID: "${ue.employeeID}"`)
  if (ue.roleID)              parts.push(`roleID: "${ue.roleID}"`)
  if (ue.organizationCode)    parts.push(`organizationCode: "${ue.organizationCode}"`)
  if (ue.tenantCode)          parts.push(`tenantCode: "${ue.tenantCode}"`)
  if (ue.subsidiary?.length)  parts.push(`subsidiaries: ${arr(ue.subsidiary)}`)
  if (ue.division?.length)    parts.push(`divisions: ${arr(ue.division)}`)
  if (ue.department?.length)  parts.push(`departments: ${arr(ue.department)}`)
  if (ue.location?.length)    parts.push(`locations: ${arr(ue.location)}`)
  if (ue.contractor?.length)  parts.push(`contractors: ${arr(ue.contractor)}`)
  if (ue.isManager !== undefined) parts.push(`isManager: ${ue.isManager}`)
  if (ue.isEndUser !== undefined) parts.push(`isEndUser: ${ue.isEndUser}`)
  if (parts.length === 0) return ''
  return `userEntitlement: { ${parts.join(', ')} }`
}

export function useSpecialLeavePolicy({
  isOpen,
  tenantCode,
  employeeId,
}: {
  isOpen: boolean
  tenantCode: string
  employeeId: string
}): { leaveOptions: SpecialLeaveOption[]; loading: boolean } {
  const userEntitlement = useUserEntitlement()

  const employeeQuery = useMemo(() => {
    const ueArg = buildUeArg(userEntitlement)
    return `
      query FetchEmployees(
        $criteriaRequests: [CriteriaRequest!]!
        $collection: String!
        $offset: Int
        $limit: Int
      ) {
        fetchEmployees(
          criteriaRequests: $criteriaRequests
          collection: $collection
          offset: $offset
          limit: $limit
          ${ueArg}
        ) {
          deployment {
            subsidiary { subsidiaryCode }
            location { locationCode }
            designation { designationCode }
            employeeCategory { employeeCategoryCode }
          }
        }
      }
    `
  }, [userEntitlement])

  const { data: employeeData } = useGraphQLQuery<{
    fetchEmployees: Array<{ deployment: any }>
  }>({
    query: employeeQuery,
    variables: {
      criteriaRequests:
        tenantCode && employeeId
          ? [
              { field: 'tenantCode', operator: 'is', value: tenantCode },
              { field: 'employeeID', operator: 'eq', value: employeeId },
            ]
          : [],
      collection: 'contract_employee',
      offset: 0,
      limit: 1,
    },
    skip: !isOpen || !tenantCode || !employeeId,
  })

  const deployment = employeeData?.fetchEmployees?.[0]?.deployment

  const leaveCriteria = useMemo(() => {
    const criteria: object[] = []
    if (!tenantCode) return criteria
    criteria.push(
      { field: 'tenantCode', operator: 'is', value: tenantCode },
      { field: 'leavePolicy.leaveCategory', operator: 'eq', value: 'Leave of Absence' }
    )
    const subsidiaryCode   = deployment?.subsidiary?.subsidiaryCode
    const locationCode     = deployment?.location?.locationCode
    const designationCode  = deployment?.designation?.designationCode
    const employeeCategory = deployment?.employeeCategory?.employeeCategoryCode
    if (subsidiaryCode)   criteria.push({ field: 'subsidiary.subsidiaryCode', operator: 'eq', value: subsidiaryCode })
    if (locationCode)     criteria.push({ field: 'location.locationCode', operator: 'eq', value: locationCode })
    if (designationCode)  criteria.push({ field: 'designation.designationCode', operator: 'eq', value: designationCode })
    if (employeeCategory) criteria.push({ field: 'employeeCategory', operator: 'in', value: [employeeCategory] })
    return criteria
  }, [tenantCode, deployment])


  const { data: leavePolicyData, loading } = useGraphQLQuery<{
    fetchLeavePolicy: Array<{ leavePolicy: any; employeeCategory: string }>
  }>({
    query: `
      query FetchLeavePolicy($criteriaRequests: [CriteriaRequest!]!, $collection: String!) {
        fetchLeavePolicy(criteriaRequests: $criteriaRequests, collection: $collection) {
          leavePolicy { leaveCode leaveTitle }
          employeeCategory
        }
      }
    `,
    variables: { criteriaRequests: leaveCriteria, collection: 'leave_policy' },
    skip: !isOpen || !tenantCode || !deployment,
  })

  const leaveOptions = useMemo<SpecialLeaveOption[]>(() => {
    const list = Array.isArray(leavePolicyData?.fetchLeavePolicy)
      ? leavePolicyData!.fetchLeavePolicy
      : []
    return list.flatMap((item: any) => {
      const policy = item?.leavePolicy
      if (Array.isArray(policy)) {
        return policy
          .filter((p: any) => (p?.leaveCode || p?.levcode) && (p?.leaveTitle || p?.leavetitle))
          .map((p: any) => ({ leaveCode: p.leaveCode || p.levcode, leaveTitle: p.leaveTitle || p.leavetitle }))
      }
      if (policy && (policy.leaveCode || policy.levcode) && (policy.leaveTitle || policy.leavetitle)) {
        return [{ leaveCode: policy.leaveCode || policy.levcode, leaveTitle: policy.leaveTitle || policy.leavetitle }]
      }
      return []
    })
  }, [leavePolicyData])

  return { leaveOptions, loading }
}

import { useGetRequest } from "@/hooks/api/useGetRequest"
import { useMemo } from "react"

// ── Types (mirroring web hook interface exactly) ───────────────────────────────

export interface FetchedEmployee {
  _id: string
  employeeID: string
  firstName?: string
  middleName?: string
  lastName?: string
  organizationCode?: string
  contractorCode?: string
  tenantCode?: string
  deployment?: {
    effectiveFrom?: string
    subsidiary?: { subsidiaryCode?: string; subsidiaryName?: string }
    division?: { divisionCode?: string; divisionName?: string }
    department?: { departmentCode?: string; departmentName?: string }
    designation?: { designationCode?: string; designationName?: string }
    location?: { locationCode?: string; locationName?: string }
    grade?: { gradeCode?: string; gradeName?: string }
    employeeCategory?: { employeeCategoryCode?: string; employeeCategoryName?: string }
  }
}

export interface ShiftGroupOption {
  shiftGroupCode: string
  shiftGroupName: string
}

export interface ShiftOption {
  shiftCode: string
  shiftName: string
  shift: Record<string, unknown>
  grace: Record<string, unknown>
}

export interface EmployeeShiftHierarchyFilters {
  subsidiary?: string | string[]
  location?: string | string[]
  categories?: string | string[]
}

export interface UseEmployeeShiftGraphqlParams {
  tenantCode: string | null | undefined
  employeeId?: string | null
  shiftGroupCode?: string
  shiftGroupSearch?: string
  hierarchyFilters?: EmployeeShiftHierarchyFilters | null
}

export interface UseEmployeeShiftGraphqlResult {
  fetchedEmployee: FetchedEmployee | null
  shiftGroups: ShiftGroupOption[]
  shiftGroupsLoading: boolean
  shiftGroupsError: Error | undefined
  shiftOptions: ShiftOption[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFirstValue(value: string | string[] | null | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value
  return typeof v === "string" && v.trim() ? v.trim() : undefined
}

function buildGrace(s: Record<string, unknown>): Record<string, unknown> {
  const nested = s.grace as Record<string, unknown> | undefined
  const src = nested ?? s
  return {
    inAheadMargin: src.inAheadMargin ?? 0,
    inAboveMargin: src.inAboveMargin ?? 0,
    outAheadMargin: src.outAheadMargin ?? 0,
    outAboveMargin: src.outAboveMargin ?? 0,
    lateInAllowedTime: src.lateInAllowedTime ?? 0,
    earlyOutAllowedTime: src.earlyOutAllowedTime ?? 0,
    graceIn: src.graceIn ?? 0,
    graceOut: src.graceOut ?? 0,
    minimumDurationForPresent: (src.minimumDurationForPresent as number) ?? 240,
    allowNormalComputation: src.allowNormalComputation ?? true,
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useEmployeeShiftGraphql({
  tenantCode,
  employeeId,
  shiftGroupCode,
  shiftGroupSearch = "",
  hierarchyFilters = null,
}: UseEmployeeShiftGraphqlParams): UseEmployeeShiftGraphqlResult {

  // ── 1. Fetch employee ────────────────────────────────────────────────────────

  const employeeRequestData = useMemo(() => {
    if (!employeeId?.trim() || !tenantCode?.trim()) return null
    return [
      { field: "tenantCode", operator: "is", value: tenantCode.trim() },
      { field: "employeeID", operator: "eq", value: String(employeeId).trim() },
    ]
  }, [employeeId, tenantCode])

  const { data: employeeRaw } = useGetRequest<any[]>({
    url: "contract_employee/search?offset=0&limit=1",
    method: "POST",
    data: employeeRequestData ?? [],
    enabled: Boolean(employeeRequestData),
  })

  const fetchedEmployee = useMemo((): FetchedEmployee | null => {
    if (!Array.isArray(employeeRaw) || employeeRaw.length === 0) return null
    const e = employeeRaw[0]
    return {
      _id: e._id,
      employeeID: e.employeeID ?? "",
      firstName: e.firstName,
      middleName: e.middleName,
      lastName: e.lastName,
      organizationCode: e.organizationCode,
      contractorCode: e.contractorCode,
      tenantCode: e.tenantCode,
      deployment: e.deployment ?? {},
    }
  }, [employeeRaw])

  // ── 2. Fetch shift groups ────────────────────────────────────────────────────

  const shiftGroupRequestData = useMemo(() => {
    if (!tenantCode?.trim()) return null
    const deployment = fetchedEmployee?.deployment

    const subsidiary = getFirstValue(hierarchyFilters?.subsidiary) ?? deployment?.subsidiary?.subsidiaryCode
    const location   = getFirstValue(hierarchyFilters?.location)   ?? deployment?.location?.locationCode
    const category   = getFirstValue(hierarchyFilters?.categories) ?? deployment?.employeeCategory?.employeeCategoryCode

    const criteria: any[] = [
      { field: "tenantCode", operator: "eq", value: tenantCode.trim() },
    ]
    if (subsidiary) criteria.push({ field: "subsidiary.subsidiaryCode", operator: "in", value: subsidiary })
    if (location)   criteria.push({ field: "location.locationCode",     operator: "in", value: location })
    if (category)   criteria.push({ field: "employeeCategory",          operator: "in", value: category })
    if (shiftGroupSearch?.trim())
      criteria.push({ field: "shiftGroupName", operator: "like", value: shiftGroupSearch.trim() })

    return criteria
  }, [tenantCode, fetchedEmployee, hierarchyFilters, shiftGroupSearch])

  const {
    data: shiftGroupsRaw,
    loading: shiftGroupsLoading,
    error: shiftGroupsErr,
  } = useGetRequest<any[]>({
    url: "shift/search?offset=0&limit=20",
    method: "POST",
    data: shiftGroupRequestData ?? [],
    enabled: Boolean(shiftGroupRequestData),
  })

  const shiftGroups = useMemo((): ShiftGroupOption[] => {
    if (!Array.isArray(shiftGroupsRaw)) return []
    return shiftGroupsRaw.map((g: any) => ({
      shiftGroupCode: g.shiftGroupCode ?? "",
      shiftGroupName: g.shiftGroupName ?? "",
    }))
  }, [shiftGroupsRaw])

  // ── 3. Fetch shifts by group ─────────────────────────────────────────────────

  const shiftsByGroupRequestData = useMemo(() => {
    if (!tenantCode?.trim() || !shiftGroupCode?.trim()) return null
    return [
      { field: "tenantCode",     operator: "eq", value: tenantCode.trim() },
      { field: "shiftGroupCode", operator: "eq", value: shiftGroupCode.trim() },
    ]
  }, [tenantCode, shiftGroupCode])

  const { data: shiftsByGroupRaw } = useGetRequest<any[]>({
    url: "shift/search?offset=0&limit=20",
    method: "POST",
    data: shiftsByGroupRequestData ?? [],
    enabled: Boolean(shiftsByGroupRequestData),
  })

  const shiftOptions = useMemo((): ShiftOption[] => {
    if (!Array.isArray(shiftsByGroupRaw) || shiftsByGroupRaw.length === 0) return []
    const options: ShiftOption[] = []
    shiftsByGroupRaw.forEach((g: any) => {
      const arr = g.shift
      if (!Array.isArray(arr)) return
      arr.forEach((s: Record<string, unknown>) => {
        const shiftCode = (s.shiftCode as string) ?? ""
        const shiftName = (s.shiftName as string) ?? ""
        options.push({
          shiftCode,
          shiftName,
          shift: { ...s },
          grace: buildGrace(s),
        })
      })
    })
    return options
  }, [shiftsByGroupRaw])

  // ── Return ────────────────────────────────────────────────────────────────────

  return {
    fetchedEmployee,
    shiftGroups,
    shiftGroupsLoading,
    shiftGroupsError: shiftGroupsErr ?? undefined,
    shiftOptions,
  }
}

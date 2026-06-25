import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

export interface HierarchyFilters {
  subsidiary?: string[]
  division?: string[]
  department?: string[]
  location?: string[]
  contractor?: string[]
  employeeID?: string
}

export interface FilterSelections {
  subsidiaries?: string[]
  divisions?: string[]
  departments?: string[]
  locations?: string[]
  contractors?: string[]
  employeeID?: string
}

/**
 * Builds a HierarchyFilters object from the logged-in user's entitlement scope
 * stored in Redux (state.hierarchy.data), optionally narrowed by user-chosen
 * filter selections.
 *
 * Priority:
 *   1. filterSelections (what the user explicitly picked in a filter UI)
 *   2. Fallback to full entitlement scope from Redux (all subsidiaries, departments, etc.)
 *
 * @example
 * // Full scope — use everything the user is entitled to
 * const filters = useHierarchyFilters()
 *
 * @example
 * // Narrowed — user picked specific departments in a filter UI
 * const filters = useHierarchyFilters({ departments: ['DEPT01', 'DEPT02'] })
 *
 * @example
 * // Single employee
 * const filters = useHierarchyFilters(null, 'EMP025')
 */
export function useHierarchyFilters(
  filterSelections?: FilterSelections | null,
  employeeID?: string | null
): HierarchyFilters {
  const hierarchy = useSelector((s: RootState) => s.hierarchy.data)

  return useMemo(() => {
    const filters: HierarchyFilters = {}

    // ── Subsidiary ──────────────────────────────────────────────────────────
    const selectedSubsidiaries = filterSelections?.subsidiaries?.filter(Boolean)
    if (selectedSubsidiaries && selectedSubsidiaries.length > 0) {
      filters.subsidiary = selectedSubsidiaries
    } else if (hierarchy?.subsidiaries && hierarchy.subsidiaries.length > 0) {
      filters.subsidiary = hierarchy.subsidiaries
    }

    // ── Division ────────────────────────────────────────────────────────────
    const selectedDivisions = filterSelections?.divisions?.filter(Boolean)
    if (selectedDivisions && selectedDivisions.length > 0) {
      filters.division = selectedDivisions
    } else if (hierarchy?.divisions && hierarchy.divisions.length > 0) {
      filters.division = hierarchy.divisions
    }

    // ── Department ──────────────────────────────────────────────────────────
    const selectedDepartments = filterSelections?.departments?.filter(Boolean)
    if (selectedDepartments && selectedDepartments.length > 0) {
      filters.department = selectedDepartments
    } else if (hierarchy?.departments && hierarchy.departments.length > 0) {
      filters.department = hierarchy.departments
    }

    // ── Location ────────────────────────────────────────────────────────────
    const selectedLocations = filterSelections?.locations?.filter(Boolean)
    if (selectedLocations && selectedLocations.length > 0) {
      filters.location = selectedLocations
    } else if (hierarchy?.locations && hierarchy.locations.length > 0) {
      filters.location = hierarchy.locations
    }

    // ── Contractor ──────────────────────────────────────────────────────────
    const selectedContractors = filterSelections?.contractors?.filter(Boolean)
    if (selectedContractors && selectedContractors.length > 0) {
      filters.contractor = selectedContractors
    } else if (hierarchy?.contractors && hierarchy.contractors.length > 0) {
      filters.contractor = hierarchy.contractors
    }

    // ── Employee ID (explicit param takes precedence over filterSelections) ─
    if (employeeID?.trim()) {
      filters.employeeID = employeeID.trim()
    } else if (filterSelections?.employeeID?.trim()) {
      filters.employeeID = filterSelections.employeeID.trim()
    }

    return filters
  }, [hierarchy, filterSelections, employeeID])
}

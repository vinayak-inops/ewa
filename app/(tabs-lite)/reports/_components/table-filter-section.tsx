import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useGetRequest } from '@/hooks/api/useGetRequest';
import { useGraphQLQuery } from '@/hooks/api/useGraphQLQuery';
import { getAccessToken } from '@/hooks/auth/token-store';

const GQL_CONTRACTORS = `
  query FetchContractors($criteriaRequests: [CriteriaRequest!]!, $collection: String!) {
    fetchContractors(criteriaRequests: $criteriaRequests, collection: $collection) {
      contractorCode
      contractorName
      workOrders {
        workOrderNumber
        workOrderDate
        proposalReferenceNumber
        NumberOfEmployee
        contractPeriodFrom
        contractPeriodTo
      }
    }
  }
`;

const GQL_SHIFTS = `
  query FetchShifts($criteriaRequests: [CriteriaRequest!]!, $collection: String!) {
    fetchShifts(criteriaRequests: $criteriaRequests, collection: $collection) {
      shiftGroupCode
      shiftGroupName
      shift {
        shiftCode
        shiftName
      }
    }
  }
`;

const GQL_CONTRACT_EMPLOYEES = `
  query FetchContractEmployees($criteriaRequests: [CriteriaRequest!]!, $collection: String!) {
    fetchEmployees(criteriaRequests: $criteriaRequests, collection: $collection) {
      _id
      employeeID
      firstName
      middleName
      lastName
      contractorCode
      isDeleted
    }
  }
`;
import { TableContent } from './table-content';
import { TableSidebar } from './table-sidebar';
import { TableMenuItem, TableType } from './types';

// Parent-child relationship map
const PARENT_FIELD_MAP: Record<string, string> = {
  subsidiaries: '',
  divisions: 'subsidiaries',
  departments: 'divisions',
  subDepartments: 'departments',
  sections: 'subDepartments',
  designations: '',
  grades: '',
  employeeCategories: '',
  locations: '',
  contractors: '',
  workOrders: 'contractors',
  shiftGroups: '',
  shifts: 'shiftGroups',
  contractEmployees: '',
};

// ── JWT helper ────────────────────────────────────────────────────────────────

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded).split('').map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join('')
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface TableFilterSectionProps {
  tableMenuItems: TableMenuItem[];
  onSaveAndContinue?: () => void;
  onFilterDataChange?: (filterData: Record<TableType, string[]>) => void;
  filterData?: Record<TableType, string[]>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TableFilterSection({
  tableMenuItems,
  onSaveAndContinue,
  onFilterDataChange,
  filterData: initialFilterData,
}: TableFilterSectionProps) {

  // ── Auth ──────────────────────────────────────────────────────────────────

  const [tenantCode, setTenantCode] = useState('');
  useEffect(() => {
    getAccessToken().then((token) => {
      if (!token) return;
      const payload = decodeJwtPayload(token);
      if (!payload) return;
      setTenantCode(String(payload.tenantCode ?? payload.tenant ?? payload.org ?? ''));
    });
  }, []);

  // ── Visible tables ────────────────────────────────────────────────────────

  const [visibleTables, setVisibleTables] = useState<Set<TableType>>(new Set());
  const visibleTablesInitialized = useRef(false);

  // ── Selected items ────────────────────────────────────────────────────────

  const [selectedSubsidiaries, setSelectedSubsidiaries] = useState<string[]>(initialFilterData?.subsidiaries ?? []);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>(initialFilterData?.divisions ?? []);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(initialFilterData?.departments ?? []);
  const [selectedSubDepartments, setSelectedSubDepartments] = useState<string[]>(initialFilterData?.subDepartments ?? []);
  const [selectedSections, setSelectedSections] = useState<string[]>(initialFilterData?.sections ?? []);
  const [selectedDesignations, setSelectedDesignations] = useState<string[]>(initialFilterData?.designations ?? []);
  const [selectedGrades, setSelectedGrades] = useState<string[]>(initialFilterData?.grades ?? []);
  const [selectedEmployeeCategories, setSelectedEmployeeCategories] = useState<string[]>(initialFilterData?.employeeCategories ?? []);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(initialFilterData?.locations ?? []);
  const [selectedContractors, setSelectedContractors] = useState<string[]>(initialFilterData?.contractors ?? []);
  const [selectedWorkOrders, setSelectedWorkOrders] = useState<string[]>(initialFilterData?.workOrders ?? []);
  const [selectedShiftGroups, setSelectedShiftGroups] = useState<string[]>(initialFilterData?.shiftGroups ?? []);
  const [selectedShifts, setSelectedShifts] = useState<string[]>(initialFilterData?.shifts ?? []);
  const [selectedContractEmployees, setSelectedContractEmployees] = useState<string[]>(initialFilterData?.contractEmployees ?? []);

  const [openAddFieldType, setOpenAddFieldType] = useState<TableType | null>(null);

  // ── Search states ─────────────────────────────────────────────────────────

  const [subsidiariesSearch, setSubsidiariesSearch] = useState('');
  const [divisionsSearch, setDivisionsSearch] = useState('');
  const [departmentsSearch, setDepartmentsSearch] = useState('');
  const [designationsSearch, setDesignationsSearch] = useState('');
  const [subDepartmentsSearch, setSubDepartmentsSearch] = useState('');
  const [gradesSearch, setGradesSearch] = useState('');
  const [sectionsSearch, setSectionsSearch] = useState('');
  const [employeeCategoriesSearch, setEmployeeCategoriesSearch] = useState('');
  const [contractorSearch, setContractorSearch] = useState('');
  const [locationsSearch, setLocationsSearch] = useState('');
  const [workOrderSearch, setWorkOrderSearch] = useState('');
  const [shiftGroupsSearch, setShiftGroupsSearch] = useState('');
  const [shiftsSearch, setShiftsSearch] = useState('');

  // ── Field states ──────────────────────────────────────────────────────────

  const [subsidiariesField, setSubsidiariesField] = useState<'code' | 'name'>('code');
  const [divisionsField, setDivisionsField] = useState<'code' | 'name'>('code');
  const [departmentsField, setDepartmentsField] = useState<'code' | 'name'>('code');
  const [designationsField, setDesignationsField] = useState<'code' | 'name'>('code');
  const [subDepartmentsField, setSubDepartmentsField] = useState<'code' | 'name'>('code');
  const [gradesField, setGradesField] = useState<'code' | 'name'>('code');
  const [sectionsField, setSectionsField] = useState<'code' | 'name'>('code');
  const [employeeCategoriesField, setEmployeeCategoriesField] = useState<'code' | 'name'>('code');
  const [contractorField, setContractorField] = useState<'code' | 'name'>('code');
  const [locationsField, setLocationsField] = useState<'code' | 'name'>('code');
  const [workOrderField, setWorkOrderField] = useState<'code' | 'name'>('code');
  const [shiftGroupsField, setShiftGroupsField] = useState<'code' | 'name'>('code');
  const [shiftsField, setShiftsField] = useState<'code' | 'name'>('code');

  // ── Pagination ────────────────────────────────────────────────────────────

  const [subsidiariesPage, setSubsidiariesPage] = useState(1);
  const [divisionsPage, setDivisionsPage] = useState(1);
  const [departmentsPage, setDepartmentsPage] = useState(1);
  const [designationsPage, setDesignationsPage] = useState(1);
  const [subDepartmentsPage, setSubDepartmentsPage] = useState(1);
  const [gradesPage, setGradesPage] = useState(1);
  const [sectionsPage, setSectionsPage] = useState(1);
  const [employeeCategoriesPage, setEmployeeCategoriesPage] = useState(1);
  const [contractorPage, setContractorPage] = useState(1);
  const [locationsPage, setLocationsPage] = useState(1);
  const [workOrderPage, setWorkOrderPage] = useState(1);
  const [shiftGroupsPage, setShiftGroupsPage] = useState(1);
  const [shiftsPage, setShiftsPage] = useState(1);

  const pageSize = 5;

  // ── Restore from initialFilterData ───────────────────────────────────────

  useEffect(() => {
    if (!initialFilterData) return;

    setSelectedSubsidiaries(initialFilterData.subsidiaries ?? []);
    setSelectedDivisions(initialFilterData.divisions ?? []);
    setSelectedDepartments(initialFilterData.departments ?? []);
    setSelectedSubDepartments(initialFilterData.subDepartments ?? []);
    setSelectedSections(initialFilterData.sections ?? []);
    setSelectedDesignations(initialFilterData.designations ?? []);
    setSelectedGrades(initialFilterData.grades ?? []);
    setSelectedEmployeeCategories(initialFilterData.employeeCategories ?? []);
    setSelectedLocations(initialFilterData.locations ?? []);
    setSelectedContractors(initialFilterData.contractors ?? []);
    setSelectedWorkOrders(initialFilterData.workOrders ?? []);
    setSelectedShiftGroups(initialFilterData.shiftGroups ?? []);
    setSelectedShifts(initialFilterData.shifts ?? []);
    setSelectedContractEmployees(initialFilterData.contractEmployees ?? []);

    if (!visibleTablesInitialized.current) {
      const tablesWithSelections = new Set<TableType>();
      tableMenuItems.forEach((item) => {
        if ((initialFilterData[item.id] ?? []).length > 0) {
          tablesWithSelections.add(item.id);
        }
      });
      if (tablesWithSelections.size > 0) setVisibleTables(tablesWithSelections);
      visibleTablesInitialized.current = true;
    }
  }, [initialFilterData, tableMenuItems]);

  // ── API request builders ──────────────────────────────────────────────────

  const makeOrgRequest = (arrayField: string, filterCriteria: any[] = []) => ({
    criteriaRequests: [{ field: 'tenantCode', operator: 'is', value: tenantCode }],
    arrayFilter: { arrayField, filterCriteria },
  });

  const subsidiariesData = useMemo(() => makeOrgRequest('subsidiaries'), [tenantCode]);
  const divisionsData = useMemo(() => makeOrgRequest('divisions'), [tenantCode]);
  const departmentsData = useMemo(() => makeOrgRequest('departments'), [tenantCode]);
  const subDepartmentsData = useMemo(() => makeOrgRequest('subDepartments'), [tenantCode]);
  const sectionsData = useMemo(() => makeOrgRequest('sections'), [tenantCode]);
  const designationsData = useMemo(() => makeOrgRequest('designations'), [tenantCode]);
  const gradesData = useMemo(() => makeOrgRequest('grades'), [tenantCode]);
  const locationsData = useMemo(() => makeOrgRequest('location'), [tenantCode]);
  const empCategoriesData = useMemo(() => makeOrgRequest('employeeCategories'), [tenantCode]);

  const contractorVars = useMemo(() => ({
    criteriaRequests: [{ field: 'tenantCode', operator: 'eq', value: tenantCode }],
    collection: 'contractor',
  }), [tenantCode]);

  const shiftVars = useMemo(() => ({
    criteriaRequests: [{ field: 'tenantCode', operator: 'eq', value: tenantCode }],
    collection: 'shift',
  }), [tenantCode]);

  const contractEmpVars = useMemo(() => ({
    criteriaRequests: [{ field: 'tenantCode', operator: 'eq', value: tenantCode }],
    collection: 'contract_employee',
  }), [tenantCode]);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const enabled = Boolean(tenantCode);

  const { data: subsidiariesRes, loading: subsidiariesLoading } = useGetRequest<any[]>({
    url: 'organization/aggregate', method: 'POST',
    data: subsidiariesData, enabled, dependencies: [tenantCode],
  });
  const { data: divisionsRes, loading: divisionsLoading } = useGetRequest<any[]>({
    url: 'organization/aggregate', method: 'POST',
    data: divisionsData, enabled, dependencies: [tenantCode],
  });
  const { data: departmentsRes, loading: departmentsLoading } = useGetRequest<any[]>({
    url: 'organization/aggregate', method: 'POST',
    data: departmentsData, enabled, dependencies: [tenantCode],
  });
  const { data: subDepartmentsRes, loading: subDepartmentsLoading } = useGetRequest<any[]>({
    url: 'organization/aggregate', method: 'POST',
    data: subDepartmentsData, enabled, dependencies: [tenantCode],
  });
  const { data: sectionsRes, loading: sectionsLoading } = useGetRequest<any[]>({
    url: 'organization/aggregate', method: 'POST',
    data: sectionsData, enabled, dependencies: [tenantCode],
  });
  const { data: designationsRes, loading: designationsLoading } = useGetRequest<any[]>({
    url: 'organization/aggregate', method: 'POST',
    data: designationsData, enabled, dependencies: [tenantCode],
  });
  const { data: gradesRes, loading: gradesLoading } = useGetRequest<any[]>({
    url: 'organization/aggregate', method: 'POST',
    data: gradesData, enabled, dependencies: [tenantCode],
  });
  const { data: locationsRes, loading: locationsLoading } = useGetRequest<any[]>({
    url: 'organization/aggregate', method: 'POST',
    data: locationsData, enabled, dependencies: [tenantCode],
  });
  const { data: empCategoriesRes, loading: empCategoriesLoading } = useGetRequest<any[]>({
    url: 'organization/aggregate', method: 'POST',
    data: empCategoriesData, enabled, dependencies: [tenantCode],
  });
  const { data: contractorsGql, loading: contractorsLoading } = useGraphQLQuery<{ fetchContractors: any[] }>({
    query: GQL_CONTRACTORS,
    variables: contractorVars,
    skip: !tenantCode,
  });
  const { data: shiftsGql, loading: shiftsLoading } = useGraphQLQuery<{ fetchShifts: any[] }>({
    query: GQL_SHIFTS,
    variables: shiftVars,
    skip: !tenantCode,
  });
  const { data: contractEmpGql, loading: contractEmpLoading } = useGraphQLQuery<{ fetchEmployees: any[] }>({
    query: GQL_CONTRACT_EMPLOYEES,
    variables: contractEmpVars,
    skip: !tenantCode,
  });

  // ── Raw data normalization ────────────────────────────────────────────────

  function extractNestedArray(res: any[] | null, key: string, codeKey: string): any[] {
    if (!Array.isArray(res) || res.length === 0) return [];
    if (res[0]?.[key] && Array.isArray(res[0][key])) {
      return res.flatMap((org: any) => Array.isArray(org[key]) ? org[key] : []);
    }
    if (res[0]?.[codeKey]) return res;
    return [];
  }

  const rawSubsidiaries = useMemo(() => extractNestedArray(subsidiariesRes, 'subsidiaries', 'subsidiaryCode'), [subsidiariesRes]);
  const rawDivisions = useMemo(() => extractNestedArray(divisionsRes, 'divisions', 'divisionCode'), [divisionsRes]);
  const rawDepartments = useMemo(() => extractNestedArray(departmentsRes, 'departments', 'departmentCode'), [departmentsRes]);
  const rawSubDepartments = useMemo(() => extractNestedArray(subDepartmentsRes, 'subDepartments', 'subDepartmentCode'), [subDepartmentsRes]);
  const rawSections = useMemo(() => extractNestedArray(sectionsRes, 'sections', 'sectionCode'), [sectionsRes]);
  const rawDesignations = useMemo(() => extractNestedArray(designationsRes, 'designations', 'designationCode'), [designationsRes]);
  const rawGrades = useMemo(() => extractNestedArray(gradesRes, 'grades', 'gradeCode'), [gradesRes]);

  const rawWorkOrders = useMemo(() => {
    const contractors = contractorsGql?.fetchContractors;
    if (!Array.isArray(contractors)) return [];
    return contractors.flatMap((ctr: any) =>
      Array.isArray(ctr.workOrders)
        ? ctr.workOrders.map((wo: any) => ({ ...wo, code: wo.workOrderNumber, contractorCode: ctr.contractorCode }))
        : []
    );
  }, [contractorsGql]);

  const rawShiftGroups = useMemo(() => {
    const shifts = shiftsGql?.fetchShifts;
    if (!Array.isArray(shifts)) return [];
    const map = new Map<string, any>();
    shifts.forEach((item: any) => {
      if (item.shiftGroupCode && !map.has(item.shiftGroupCode)) {
        map.set(item.shiftGroupCode, { shiftGroupCode: item.shiftGroupCode, shiftGroupName: item.shiftGroupName });
      }
    });
    return Array.from(map.values());
  }, [shiftsGql]);

  const rawShifts = useMemo(() => {
    const shifts = shiftsGql?.fetchShifts;
    if (!Array.isArray(shifts)) return [];
    return shifts.flatMap((item: any) =>
      Array.isArray(item.shift)
        ? item.shift.map((s: any) => ({ ...s, shiftGroupCode: item.shiftGroupCode }))
        : []
    );
  }, [shiftsGql]);

  const rawContractEmployees = useMemo(() => {
    const employees = contractEmpGql?.fetchEmployees;
    return Array.isArray(employees) ? employees.filter((e: any) => !e.isDeleted) : [];
  }, [contractEmpGql]);

  // ── Normalized (code/name) data ───────────────────────────────────────────

  const norm = <T extends Record<string, any>>(arr: T[], codeKey: keyof T, nameKey: keyof T) =>
    arr.map((item) => ({ code: String(item[codeKey] ?? ''), name: String(item[nameKey] ?? '') }));

  const normalizedSubsidiaries = useMemo(() => norm(rawSubsidiaries, 'subsidiaryCode', 'subsidiaryName'), [rawSubsidiaries]);
  const normalizedDivisions = useMemo(() => norm(rawDivisions, 'divisionCode', 'divisionName'), [rawDivisions]);
  const normalizedDepartments = useMemo(() => norm(rawDepartments, 'departmentCode', 'departmentName'), [rawDepartments]);
  const normalizedSubDepartments = useMemo(() => norm(rawSubDepartments, 'subDepartmentCode', 'subDepartmentName'), [rawSubDepartments]);
  const normalizedSections = useMemo(() => norm(rawSections, 'sectionCode', 'sectionName'), [rawSections]);
  const normalizedDesignations = useMemo(() => norm(rawDesignations, 'designationCode', 'designationName'), [rawDesignations]);
  const normalizedGrades = useMemo(() => norm(rawGrades, 'gradeCode', 'gradeName'), [rawGrades]);
  const normalizedContractors = useMemo(() => {
    const contractors = contractorsGql?.fetchContractors;
    return Array.isArray(contractors) ? norm(contractors, 'contractorCode', 'contractorName') : [];
  }, [contractorsGql]);
  const normalizedWorkOrders = useMemo(() =>
    rawWorkOrders.map((wo: any) => ({ code: wo.workOrderNumber ?? wo.code, name: wo.workOrderNumber ?? wo.code })),
    [rawWorkOrders]);
  const normalizedShiftGroups = useMemo(() => norm(rawShiftGroups, 'shiftGroupCode', 'shiftGroupName'), [rawShiftGroups]);
  const normalizedShifts = useMemo(() => norm(rawShifts, 'shiftCode', 'shiftName'), [rawShifts]);
  const normalizedContractEmployees = useMemo(() =>
    rawContractEmployees.map((emp: any) => ({
      code: emp.employeeID,
      name: `${emp.firstName ?? ''} ${emp.middleName ?? ''} ${emp.lastName ?? ''}`.trim() || emp.employeeID,
    })),
    [rawContractEmployees]);

  const normalizedLocations = useMemo(() => {
    if (!Array.isArray(locationsRes) || locationsRes.length === 0) return [];
    const all: any[] = locationsRes[0]?.location
      ? locationsRes.flatMap((org: any) => Array.isArray(org.location) ? org.location : [])
      : locationsRes.filter((loc: any) => loc.locationCode);
    const byCode = new Map<string, any>();
    all.forEach((loc: any) => {
      if (loc.locationCode && !byCode.has(loc.locationCode)) {
        byCode.set(loc.locationCode, { code: loc.locationCode, name: loc.locationName });
      }
    });
    return Array.from(byCode.values());
  }, [locationsRes]);

  const normalizedEmployeeCategories = useMemo(() => {
    if (!Array.isArray(empCategoriesRes)) return [];
    const all = empCategoriesRes.flatMap((org: any) =>
      Array.isArray(org.employeeCategories) ? org.employeeCategories : []
    );
    const byCode = new Map<string, any>();
    all.forEach((cat: any) => {
      if (!byCode.has(cat.employeeCategoryCode)) {
        byCode.set(cat.employeeCategoryCode, { code: cat.employeeCategoryCode, name: cat.employeeCategoryName });
      }
    });
    return Array.from(byCode.values());
  }, [empCategoriesRes]);

  // ── Lookup helpers ────────────────────────────────────────────────────────

  const getSelectedItems = useCallback((type: TableType): string[] => {
    switch (type) {
      case 'subsidiaries': return selectedSubsidiaries;
      case 'divisions': return selectedDivisions;
      case 'departments': return selectedDepartments;
      case 'subDepartments': return selectedSubDepartments;
      case 'sections': return selectedSections;
      case 'designations': return selectedDesignations;
      case 'grades': return selectedGrades;
      case 'employeeCategories': return selectedEmployeeCategories;
      case 'locations': return selectedLocations;
      case 'contractors': return selectedContractors;
      case 'workOrders': return selectedWorkOrders;
      case 'shiftGroups': return selectedShiftGroups;
      case 'shifts': return selectedShifts;
      case 'contractEmployees': return selectedContractEmployees;
      default: return [];
    }
  }, [
    selectedSubsidiaries, selectedDivisions, selectedDepartments, selectedSubDepartments,
    selectedSections, selectedDesignations, selectedGrades, selectedEmployeeCategories,
    selectedLocations, selectedContractors, selectedWorkOrders, selectedShiftGroups,
    selectedShifts, selectedContractEmployees,
  ]);

  const getDataSetter = (type: TableType): ((codes: string[]) => void) => {
    switch (type) {
      case 'subsidiaries': return setSelectedSubsidiaries;
      case 'divisions': return setSelectedDivisions;
      case 'departments': return setSelectedDepartments;
      case 'subDepartments': return setSelectedSubDepartments;
      case 'sections': return setSelectedSections;
      case 'designations': return setSelectedDesignations;
      case 'grades': return setSelectedGrades;
      case 'employeeCategories': return setSelectedEmployeeCategories;
      case 'locations': return setSelectedLocations;
      case 'contractors': return setSelectedContractors;
      case 'workOrders': return setSelectedWorkOrders;
      case 'shiftGroups': return setSelectedShiftGroups;
      case 'shifts': return setSelectedShifts;
      case 'contractEmployees': return setSelectedContractEmployees;
      default: return () => {};
    }
  };

  const getRawDataForType = (type: TableType): any[] => {
    switch (type) {
      case 'subsidiaries': return rawSubsidiaries;
      case 'divisions': return rawDivisions;
      case 'departments': return rawDepartments;
      case 'subDepartments': return rawSubDepartments;
      case 'sections': return rawSections;
      case 'designations': return rawDesignations;
      case 'grades': return rawGrades;
      case 'workOrders': return rawWorkOrders;
      case 'shiftGroups': return rawShiftGroups;
      case 'shifts': return rawShifts;
      case 'contractEmployees': return rawContractEmployees;
      default: return [];
    }
  };

  const getDataForType = useCallback((type: TableType): any[] => {
    switch (type) {
      case 'subsidiaries': return normalizedSubsidiaries;
      case 'divisions': return normalizedDivisions;
      case 'departments': return normalizedDepartments;
      case 'subDepartments': return normalizedSubDepartments;
      case 'sections': return normalizedSections;
      case 'designations': return normalizedDesignations;
      case 'grades': return normalizedGrades;
      case 'employeeCategories': return normalizedEmployeeCategories;
      case 'locations': return normalizedLocations;
      case 'contractors': return normalizedContractors;
      case 'workOrders': return normalizedWorkOrders;
      case 'shiftGroups': return normalizedShiftGroups;
      case 'shifts': return normalizedShifts;
      case 'contractEmployees': return normalizedContractEmployees;
      default: return [];
    }
  }, [
    normalizedSubsidiaries, normalizedDivisions, normalizedDepartments, normalizedSubDepartments,
    normalizedSections, normalizedDesignations, normalizedGrades, normalizedEmployeeCategories,
    normalizedLocations, normalizedContractors, normalizedWorkOrders, normalizedShiftGroups,
    normalizedShifts, normalizedContractEmployees,
  ]);

  const getLoadingForType = useCallback((type: TableType): boolean => {
    switch (type) {
      case 'subsidiaries': return subsidiariesLoading;
      case 'divisions': return divisionsLoading;
      case 'departments': return departmentsLoading;
      case 'subDepartments': return subDepartmentsLoading;
      case 'sections': return sectionsLoading;
      case 'designations': return designationsLoading;
      case 'grades': return gradesLoading;
      case 'employeeCategories': return empCategoriesLoading;
      case 'locations': return locationsLoading;
      case 'contractors': return contractorsLoading;
      case 'workOrders': return false;
      case 'shiftGroups': return shiftsLoading;
      case 'shifts': return shiftsLoading;
      case 'contractEmployees': return contractEmpLoading;
      default: return false;
    }
  }, [
    subsidiariesLoading, divisionsLoading, departmentsLoading, subDepartmentsLoading,
    sectionsLoading, designationsLoading, gradesLoading, empCategoriesLoading,
    locationsLoading, contractorsLoading, shiftsLoading, contractEmpLoading,
  ]);

  // ── Filtered data (by search text) ───────────────────────────────────────

  const getFilteredDataForType = useCallback((type: TableType): any[] => {
    const data = getDataForType(type);
    const searchMap: Record<TableType, string> = {
      subsidiaries: subsidiariesSearch, divisions: divisionsSearch,
      departments: departmentsSearch, subDepartments: subDepartmentsSearch,
      sections: sectionsSearch, designations: designationsSearch,
      grades: gradesSearch, employeeCategories: employeeCategoriesSearch,
      locations: locationsSearch, contractors: contractorSearch,
      workOrders: workOrderSearch, shiftGroups: shiftGroupsSearch,
      shifts: shiftsSearch, contractEmployees: '',
    };
    const search = (searchMap[type] ?? '').toLowerCase().trim();
    if (!search) return data;
    return data.filter((item: any) =>
      (item.code ?? '').toLowerCase().includes(search) ||
      (item.name ?? '').toLowerCase().includes(search)
    );
  }, [
    getDataForType, subsidiariesSearch, divisionsSearch, departmentsSearch,
    subDepartmentsSearch, sectionsSearch, designationsSearch, gradesSearch,
    employeeCategoriesSearch, locationsSearch, contractorSearch, workOrderSearch,
    shiftGroupsSearch, shiftsSearch,
  ]);

  // ── Parent-child filtering ────────────────────────────────────────────────

  const filterChildByParent = useCallback((childType: TableType, _parentType: TableType, parentCodes: string[]): any[] => {
    if (parentCodes.length === 0) return getDataForType(childType);
    const rawChild = getRawDataForType(childType);
    if (rawChild.length === 0) return getDataForType(childType);

    const matched = rawChild.filter((item: any) => {
      switch (childType) {
        case 'divisions': return parentCodes.includes(item.subsidiaryCode);
        case 'departments': return parentCodes.includes(item.divisionCode);
        case 'subDepartments': return parentCodes.includes(item.departmentCode);
        case 'sections': return parentCodes.includes(item.subDepartmentCode);
        case 'workOrders': return parentCodes.includes(item.contractorCode);
        case 'shifts': return parentCodes.includes(item.shiftGroupCode);
        default: return true;
      }
    });

    const codeKeyMap: Partial<Record<TableType, string>> = {
      divisions: 'divisionCode', departments: 'departmentCode',
      subDepartments: 'subDepartmentCode', sections: 'sectionCode',
      workOrders: 'code', shifts: 'shiftCode',
    };
    const nameKeyMap: Partial<Record<TableType, string>> = {
      divisions: 'divisionName', departments: 'departmentName',
      subDepartments: 'subDepartmentName', sections: 'sectionName',
      workOrders: 'workOrderNumber', shifts: 'shiftName',
    };
    const ck = codeKeyMap[childType];
    const nk = nameKeyMap[childType];
    if (!ck) return matched;
    return matched.map((item: any) => ({ code: item[ck], name: nk ? item[nk] : item[ck] }));
  }, [getDataForType, getRawDataForType]);

  const isParentSelected = useCallback((type: TableType): boolean => {
    const parentType = PARENT_FIELD_MAP[type] as TableType | '';
    if (!parentType) return true;
    return getSelectedItems(parentType).length > 0;
  }, [getSelectedItems]);

  // ── Add / remove handlers ─────────────────────────────────────────────────

  const handleAddItems = useCallback((type: TableType, codes: string[]) => {
    const setter = getDataSetter(type);
    const current = getSelectedItems(type);
    const merged = Array.from(new Set([...current, ...codes]));
    setter(merged);
  }, [getSelectedItems]);

  const handleRemoveItem = useCallback((type: TableType, code: string) => {
    const setter = getDataSetter(type);
    setter(getSelectedItems(type).filter((c) => c !== code));
  }, [getSelectedItems]);

  const handleRemoveItems = useCallback((type: TableType, codes: string[]) => {
    const setter = getDataSetter(type);
    const codeSet = new Set(codes);
    setter(getSelectedItems(type).filter((c) => !codeSet.has(c)));
  }, [getSelectedItems]);

  const toggleAddField = useCallback((type: TableType) => {
    setOpenAddFieldType((prev) => prev === type ? null : type);
  }, []);

  const toggleTableVisibility = useCallback((type: TableType) => {
    setVisibleTables((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  }, []);

  // ── Parent-child cascade clear effects ───────────────────────────────────

  useEffect(() => {
    if (selectedSubsidiaries.length === 0) {
      if (selectedDivisions.length > 0) setSelectedDivisions([]);
    }
  }, [selectedSubsidiaries]);

  useEffect(() => {
    if (selectedDivisions.length === 0) {
      if (selectedDepartments.length > 0) setSelectedDepartments([]);
    }
  }, [selectedDivisions]);

  useEffect(() => {
    if (selectedDepartments.length === 0) {
      if (selectedSubDepartments.length > 0) setSelectedSubDepartments([]);
    }
  }, [selectedDepartments]);

  useEffect(() => {
    if (selectedSubDepartments.length === 0) {
      if (selectedSections.length > 0) setSelectedSections([]);
    }
  }, [selectedSubDepartments]);

  useEffect(() => {
    if (selectedDesignations.length === 0) {
      if (selectedGrades.length > 0) setSelectedGrades([]);
    }
  }, [selectedDesignations]);

  useEffect(() => {
    if (selectedContractors.length === 0) {
      if (selectedWorkOrders.length > 0) setSelectedWorkOrders([]);
    }
  }, [selectedContractors]);

  useEffect(() => {
    if (selectedShiftGroups.length === 0) {
      if (selectedShifts.length > 0) setSelectedShifts([]);
    }
  }, [selectedShiftGroups]);

  // ── Notify parent of filter changes ──────────────────────────────────────

  useEffect(() => {
    onFilterDataChange?.({
      subsidiaries: selectedSubsidiaries,
      divisions: selectedDivisions,
      departments: selectedDepartments,
      subDepartments: selectedSubDepartments,
      sections: selectedSections,
      designations: selectedDesignations,
      grades: selectedGrades,
      employeeCategories: selectedEmployeeCategories,
      locations: selectedLocations,
      contractors: selectedContractors,
      workOrders: selectedWorkOrders,
      shiftGroups: selectedShiftGroups,
      shifts: selectedShifts,
      contractEmployees: selectedContractEmployees,
    });
  }, [
    selectedSubsidiaries, selectedDivisions, selectedDepartments, selectedSubDepartments,
    selectedSections, selectedDesignations, selectedGrades, selectedEmployeeCategories,
    selectedLocations, selectedContractors, selectedWorkOrders, selectedShiftGroups,
    selectedShifts, selectedContractEmployees,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={s.container}>
      {/* Sidebar */}
      <TableSidebar
        tableMenuItems={tableMenuItems}
        visibleTables={visibleTables}
        getSelectedItems={getSelectedItems}
        onToggleTable={toggleTableVisibility}
      />

      {/* Content + footer */}
      <View style={s.main}>
        <TableContent
          tableMenuItems={tableMenuItems}
          visibleTables={visibleTables}
          getSelectedItems={getSelectedItems}
          getDataForType={getDataForType}
          getLoadingForType={getLoadingForType}
          getFilteredDataForType={getFilteredDataForType}
          isParentSelected={isParentSelected}
          handleAddItems={handleAddItems}
          handleRemoveItem={handleRemoveItem}
          handleRemoveItems={handleRemoveItems}
          toggleAddField={toggleAddField}
          openAddFieldType={openAddFieldType}
          setOpenAddFieldType={setOpenAddFieldType}
          subsidiariesSearch={subsidiariesSearch}
          setSubsidiariesSearch={setSubsidiariesSearch}
          divisionsSearch={divisionsSearch}
          setDivisionsSearch={setDivisionsSearch}
          departmentsSearch={departmentsSearch}
          setDepartmentsSearch={setDepartmentsSearch}
          designationsSearch={designationsSearch}
          setDesignationsSearch={setDesignationsSearch}
          subDepartmentsSearch={subDepartmentsSearch}
          setSubDepartmentsSearch={setSubDepartmentsSearch}
          gradesSearch={gradesSearch}
          setGradesSearch={setGradesSearch}
          sectionsSearch={sectionsSearch}
          setSectionsSearch={setSectionsSearch}
          employeeCategoriesSearch={employeeCategoriesSearch}
          setEmployeeCategoriesSearch={setEmployeeCategoriesSearch}
          contractorSearch={contractorSearch}
          setContractorSearch={setContractorSearch}
          locationsSearch={locationsSearch}
          setLocationsSearch={setLocationsSearch}
          workOrderSearch={workOrderSearch}
          setWorkOrderSearch={setWorkOrderSearch}
          shiftGroupsSearch={shiftGroupsSearch}
          setShiftGroupsSearch={setShiftGroupsSearch}
          shiftsSearch={shiftsSearch}
          setShiftsSearch={setShiftsSearch}
          subsidiariesField={subsidiariesField}
          setSubsidiariesField={setSubsidiariesField}
          divisionsField={divisionsField}
          setDivisionsField={setDivisionsField}
          departmentsField={departmentsField}
          setDepartmentsField={setDepartmentsField}
          designationsField={designationsField}
          setDesignationsField={setDesignationsField}
          subDepartmentsField={subDepartmentsField}
          setSubDepartmentsField={setSubDepartmentsField}
          gradesField={gradesField}
          setGradesField={setGradesField}
          sectionsField={sectionsField}
          setSectionsField={setSectionsField}
          employeeCategoriesField={employeeCategoriesField}
          setEmployeeCategoriesField={setEmployeeCategoriesField}
          contractorField={contractorField}
          setContractorField={setContractorField}
          locationsField={locationsField}
          setLocationsField={setLocationsField}
          workOrderField={workOrderField}
          setWorkOrderField={setWorkOrderField}
          shiftGroupsField={shiftGroupsField}
          setShiftGroupsField={setShiftGroupsField}
          shiftsField={shiftsField}
          setShiftsField={setShiftsField}
          subsidiariesPage={subsidiariesPage}
          setSubsidiariesPage={setSubsidiariesPage}
          divisionsPage={divisionsPage}
          setDivisionsPage={setDivisionsPage}
          departmentsPage={departmentsPage}
          setDepartmentsPage={setDepartmentsPage}
          designationsPage={designationsPage}
          setDesignationsPage={setDesignationsPage}
          subDepartmentsPage={subDepartmentsPage}
          setSubDepartmentsPage={setSubDepartmentsPage}
          gradesPage={gradesPage}
          setGradesPage={setGradesPage}
          sectionsPage={sectionsPage}
          setSectionsPage={setSectionsPage}
          employeeCategoriesPage={employeeCategoriesPage}
          setEmployeeCategoriesPage={setEmployeeCategoriesPage}
          contractorPage={contractorPage}
          setContractorPage={setContractorPage}
          locationsPage={locationsPage}
          setLocationsPage={setLocationsPage}
          workOrderPage={workOrderPage}
          setWorkOrderPage={setWorkOrderPage}
          shiftGroupsPage={shiftGroupsPage}
          setShiftGroupsPage={setShiftGroupsPage}
          shiftsPage={shiftsPage}
          setShiftsPage={setShiftsPage}
          pageSize={pageSize}
          filterChildByParent={filterChildByParent}
          PARENT_FIELD_MAP={PARENT_FIELD_MAP}
          onSaveAndContinue={onSaveAndContinue}
        />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
  },
  main: {
    flex: 1,
    flexDirection: 'column',
  },
});

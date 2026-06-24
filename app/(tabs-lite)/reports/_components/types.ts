export type TableType =
  | 'subsidiaries'
  | 'divisions'
  | 'departments'
  | 'subDepartments'
  | 'sections'
  | 'designations'
  | 'grades'
  | 'employeeCategories'
  | 'locations'
  | 'contractors'
  | 'workOrders'
  | 'shiftGroups'
  | 'shifts'
  | 'contractEmployees';

export type TableParent = 'organization' | 'contractor' | 'shift' | 'contractEmployee';

export interface TableMenuItem {
  id: TableType;
  label: string;
  icon?: string;
  parent?: TableParent;
}

export const EMPTY_FILTER_DATA: Record<TableType, string[]> = {
  subsidiaries: [],
  divisions: [],
  departments: [],
  subDepartments: [],
  sections: [],
  designations: [],
  grades: [],
  employeeCategories: [],
  locations: [],
  contractors: [],
  workOrders: [],
  shiftGroups: [],
  shifts: [],
  contractEmployees: [],
};

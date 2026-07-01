import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TableContentArea } from './table-content-area';
import { TableMenuItem, TableType } from './types';

interface TableContentProps {
  tableMenuItems: TableMenuItem[];
  visibleTables: Set<TableType>;
  getSelectedItems: (type: TableType) => string[];
  getDataForType: (type: TableType) => any[];
  getLoadingForType: (type: TableType) => boolean;
  getFilteredDataForType: (type: TableType) => any[];
  isParentSelected: (type: TableType) => boolean;
  handleAddItems: (type: TableType, codes: string[]) => void;
  handleRemoveItem: (type: TableType, code: string) => void;
  handleRemoveItems: (type: TableType, codes: string[]) => void;
  toggleAddField: (type: TableType) => void;
  openAddFieldType: TableType | null;
  setOpenAddFieldType: (type: TableType | null) => void;
  // Search states
  subsidiariesSearch: string;
  setSubsidiariesSearch: (val: string) => void;
  divisionsSearch: string;
  setDivisionsSearch: (val: string) => void;
  departmentsSearch: string;
  setDepartmentsSearch: (val: string) => void;
  designationsSearch: string;
  setDesignationsSearch: (val: string) => void;
  subDepartmentsSearch: string;
  setSubDepartmentsSearch: (val: string) => void;
  gradesSearch: string;
  setGradesSearch: (val: string) => void;
  sectionsSearch: string;
  setSectionsSearch: (val: string) => void;
  employeeCategoriesSearch: string;
  setEmployeeCategoriesSearch: (val: string) => void;
  contractorSearch: string;
  setContractorSearch: (val: string) => void;
  locationsSearch: string;
  setLocationsSearch: (val: string) => void;
  workOrderSearch: string;
  setWorkOrderSearch: (val: string) => void;
  shiftGroupsSearch: string;
  setShiftGroupsSearch: (val: string) => void;
  shiftsSearch: string;
  setShiftsSearch: (val: string) => void;
  // Field states
  subsidiariesField: 'code' | 'name';
  setSubsidiariesField: (val: 'code' | 'name') => void;
  divisionsField: 'code' | 'name';
  setDivisionsField: (val: 'code' | 'name') => void;
  departmentsField: 'code' | 'name';
  setDepartmentsField: (val: 'code' | 'name') => void;
  designationsField: 'code' | 'name';
  setDesignationsField: (val: 'code' | 'name') => void;
  subDepartmentsField: 'code' | 'name';
  setSubDepartmentsField: (val: 'code' | 'name') => void;
  gradesField: 'code' | 'name';
  setGradesField: (val: 'code' | 'name') => void;
  sectionsField: 'code' | 'name';
  setSectionsField: (val: 'code' | 'name') => void;
  employeeCategoriesField: 'code' | 'name';
  setEmployeeCategoriesField: (val: 'code' | 'name') => void;
  contractorField: 'code' | 'name';
  setContractorField: (val: 'code' | 'name') => void;
  locationsField: 'code' | 'name';
  setLocationsField: (val: 'code' | 'name') => void;
  workOrderField: 'code' | 'name';
  setWorkOrderField: (val: 'code' | 'name') => void;
  shiftGroupsField: 'code' | 'name';
  setShiftGroupsField: (val: 'code' | 'name') => void;
  shiftsField: 'code' | 'name';
  setShiftsField: (val: 'code' | 'name') => void;
  // Pagination states
  subsidiariesPage: number;
  setSubsidiariesPage: (val: number) => void;
  divisionsPage: number;
  setDivisionsPage: (val: number) => void;
  departmentsPage: number;
  setDepartmentsPage: (val: number) => void;
  designationsPage: number;
  setDesignationsPage: (val: number) => void;
  subDepartmentsPage: number;
  setSubDepartmentsPage: (val: number) => void;
  gradesPage: number;
  setGradesPage: (val: number) => void;
  sectionsPage: number;
  setSectionsPage: (val: number) => void;
  employeeCategoriesPage: number;
  setEmployeeCategoriesPage: (val: number) => void;
  contractorPage: number;
  setContractorPage: (val: number) => void;
  locationsPage: number;
  setLocationsPage: (val: number) => void;
  workOrderPage: number;
  setWorkOrderPage: (val: number) => void;
  shiftGroupsPage: number;
  setShiftGroupsPage: (val: number) => void;
  shiftsPage: number;
  setShiftsPage: (val: number) => void;
  pageSize: number;
  // Additional props
  filterChildByParent: (childType: TableType, parentType: TableType, parentCodes: string[]) => any[];
  PARENT_FIELD_MAP: Record<string, string>;
  onSaveAndContinue?: () => void;
}

export function TableContent(props: TableContentProps) {
  const { tableMenuItems, visibleTables, getSelectedItems, onSaveAndContinue } = props;
  const insets = useSafeAreaInsets();
  const footerBottom = Math.max(insets.bottom, 90) + 12;

  const visibleItems = tableMenuItems.filter((item) => visibleTables.has(item.id));

  // Validation: every visible table must have ≥1 selection
  const { isValid, missingTables } = useMemo(() => {
    if (visibleTables.size === 0) return { isValid: false, missingTables: [] };
    const missing: string[] = [];
    visibleTables.forEach((id) => {
      if (getSelectedItems(id).length === 0) {
        const item = tableMenuItems.find((m) => m.id === id);
        if (item) missing.push(item.label);
      }
    });
    return { isValid: missing.length === 0, missingTables: missing };
  }, [visibleTables, getSelectedItems, tableMenuItems]);

  if (visibleTables.size === 0) {
    return (
      <View style={s.emptyWrap}>
        <Ionicons name="business-outline" size={48} color="#9ca3af" />
        <Text style={s.emptyTitle}>No tables selected</Text>
        <Text style={s.emptySub}>Select tables from the sidebar to view them</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>
        {visibleItems.map((tableItem) => (
          <TableContentArea
            key={tableItem.id}
            tableItem={tableItem}
            visibleTables={visibleTables}
            getSelectedItems={props.getSelectedItems}
            getDataForType={props.getDataForType}
            getLoadingForType={props.getLoadingForType}
            getFilteredDataForType={props.getFilteredDataForType}
            isParentSelected={props.isParentSelected}
            handleAddItems={props.handleAddItems}
            handleRemoveItem={props.handleRemoveItem}
            handleRemoveItems={props.handleRemoveItems}
            toggleAddField={props.toggleAddField}
            openAddFieldType={props.openAddFieldType}
            setOpenAddFieldType={props.setOpenAddFieldType}
            subsidiariesSearch={props.subsidiariesSearch}
            setSubsidiariesSearch={props.setSubsidiariesSearch}
            divisionsSearch={props.divisionsSearch}
            setDivisionsSearch={props.setDivisionsSearch}
            departmentsSearch={props.departmentsSearch}
            setDepartmentsSearch={props.setDepartmentsSearch}
            designationsSearch={props.designationsSearch}
            setDesignationsSearch={props.setDesignationsSearch}
            subDepartmentsSearch={props.subDepartmentsSearch}
            setSubDepartmentsSearch={props.setSubDepartmentsSearch}
            gradesSearch={props.gradesSearch}
            setGradesSearch={props.setGradesSearch}
            sectionsSearch={props.sectionsSearch}
            setSectionsSearch={props.setSectionsSearch}
            employeeCategoriesSearch={props.employeeCategoriesSearch}
            setEmployeeCategoriesSearch={props.setEmployeeCategoriesSearch}
            contractorSearch={props.contractorSearch}
            setContractorSearch={props.setContractorSearch}
            locationsSearch={props.locationsSearch}
            setLocationsSearch={props.setLocationsSearch}
            workOrderSearch={props.workOrderSearch}
            setWorkOrderSearch={props.setWorkOrderSearch}
            shiftGroupsSearch={props.shiftGroupsSearch}
            setShiftGroupsSearch={props.setShiftGroupsSearch}
            shiftsSearch={props.shiftsSearch}
            setShiftsSearch={props.setShiftsSearch}
            subsidiariesField={props.subsidiariesField}
            setSubsidiariesField={props.setSubsidiariesField}
            divisionsField={props.divisionsField}
            setDivisionsField={props.setDivisionsField}
            departmentsField={props.departmentsField}
            setDepartmentsField={props.setDepartmentsField}
            designationsField={props.designationsField}
            setDesignationsField={props.setDesignationsField}
            subDepartmentsField={props.subDepartmentsField}
            setSubDepartmentsField={props.setSubDepartmentsField}
            gradesField={props.gradesField}
            setGradesField={props.setGradesField}
            sectionsField={props.sectionsField}
            setSectionsField={props.setSectionsField}
            employeeCategoriesField={props.employeeCategoriesField}
            setEmployeeCategoriesField={props.setEmployeeCategoriesField}
            contractorField={props.contractorField}
            setContractorField={props.setContractorField}
            locationsField={props.locationsField}
            setLocationsField={props.setLocationsField}
            workOrderField={props.workOrderField}
            setWorkOrderField={props.setWorkOrderField}
            shiftGroupsField={props.shiftGroupsField}
            setShiftGroupsField={props.setShiftGroupsField}
            shiftsField={props.shiftsField}
            setShiftsField={props.setShiftsField}
            subsidiariesPage={props.subsidiariesPage}
            setSubsidiariesPage={props.setSubsidiariesPage}
            divisionsPage={props.divisionsPage}
            setDivisionsPage={props.setDivisionsPage}
            departmentsPage={props.departmentsPage}
            setDepartmentsPage={props.setDepartmentsPage}
            designationsPage={props.designationsPage}
            setDesignationsPage={props.setDesignationsPage}
            subDepartmentsPage={props.subDepartmentsPage}
            setSubDepartmentsPage={props.setSubDepartmentsPage}
            gradesPage={props.gradesPage}
            setGradesPage={props.setGradesPage}
            sectionsPage={props.sectionsPage}
            setSectionsPage={props.setSectionsPage}
            employeeCategoriesPage={props.employeeCategoriesPage}
            setEmployeeCategoriesPage={props.setEmployeeCategoriesPage}
            contractorPage={props.contractorPage}
            setContractorPage={props.setContractorPage}
            locationsPage={props.locationsPage}
            setLocationsPage={props.setLocationsPage}
            workOrderPage={props.workOrderPage}
            setWorkOrderPage={props.setWorkOrderPage}
            shiftGroupsPage={props.shiftGroupsPage}
            setShiftGroupsPage={props.setShiftGroupsPage}
            shiftsPage={props.shiftsPage}
            setShiftsPage={props.setShiftsPage}
            pageSize={props.pageSize}
            filterChildByParent={props.filterChildByParent}
            PARENT_FIELD_MAP={props.PARENT_FIELD_MAP}
            tableMenuItems={tableMenuItems}
          />
        ))}
      </ScrollView>

      {/* Footer: validation error + Continue */}
      <View style={[s.footer, { paddingBottom: footerBottom }]}>
        {!isValid && missingTables.length > 0 && (
          <View style={s.validationRow}>
            <Ionicons name="warning-outline" size={14} color="#dc2626" style={{ marginRight: 6 }} />
            <Text style={s.validationTxt} numberOfLines={2}>
              Select at least one item for: {missingTables.join(', ')}
            </Text>
          </View>
        )}
        <Pressable
          style={({ pressed }) => [s.continueBtn, !isValid && s.continueBtnDisabled, pressed && isValid && { opacity: 0.88 }]}
          onPress={() => { if (isValid) onSaveAndContinue?.(); }}
          disabled={!isValid}>
          <Text style={s.continueBtnTxt}>Save & Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
    padding: 24,
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptySub: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  validationTxt: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#dc2626',
    flex: 1,
    lineHeight: 16,
  },
  continueBtn: {
    backgroundColor: '#0a1c63',
    borderRadius: 10,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: '#a3aed0',
  },
  continueBtnTxt: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});

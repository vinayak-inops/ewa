import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store';

import { EmployeeSearchField, type Employee } from '../../../../components/employee-search-field';
import { TableMenuItem, TableType } from './types';

const F = 'Inter';

// ── Props (matches what TableContent passes) ──────────────────────────────────

interface TableContentAreaProps {
  tableItem: TableMenuItem;
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
  filterChildByParent: (childType: TableType, parentType: TableType, parentCodes: string[]) => any[];
  PARENT_FIELD_MAP: Record<string, string>;
  tableMenuItems: TableMenuItem[];
  pageSize: number;
  // per-type search/field/page (flat props, routed by type in TableContent)
  [key: string]: any;
}

// ── Column labels ─────────────────────────────────────────────────────────────

const CODE_LABEL: Record<TableType, string> = {
  subsidiaries: 'Subsidiary Code', divisions: 'Division Code',
  departments: 'Department Code', subDepartments: 'Sub Dept Code',
  sections: 'Section Code', designations: 'Designation Code',
  grades: 'Grade Code', employeeCategories: 'Category Code',
  locations: 'Location Code', contractors: 'Contractor Code',
  workOrders: 'Work Order No.', shiftGroups: 'Shift Group Code',
  shifts: 'Shift Code', contractEmployees: 'Employee ID',
};
const NAME_LABEL: Record<TableType, string> = {
  subsidiaries: 'Subsidiary Name', divisions: 'Division Name',
  departments: 'Department Name', subDepartments: 'Sub Dept Name',
  sections: 'Section Name', designations: 'Designation Name',
  grades: 'Grade Name', employeeCategories: 'Category Name',
  locations: 'Location Name', contractors: 'Contractor Name',
  workOrders: 'Work Order No.', shiftGroups: 'Shift Group Name',
  shifts: 'Shift Name', contractEmployees: 'Employee Name',
};

// ── InlineAddField modal ──────────────────────────────────────────────────────

interface InlineAddFieldProps {
  visible: boolean;
  tableItem: TableMenuItem;
  selectedCodes: string[];
  selectedField: 'code' | 'name';
  visibleTables: Set<TableType>;
  PARENT_FIELD_MAP: Record<string, string>;
  getSelectedItems: (type: TableType) => string[];
  getDataForType: (type: TableType) => any[];
  filterChildByParent: (childType: TableType, parentType: TableType, parentCodes: string[]) => any[];
  onAdd: (codes: string[]) => void;
  onRemove: (code: string) => void;
  onRemoveMultiple: (codes: string[]) => void;
  onClose: () => void;
}

function InlineAddField({
  visible, tableItem, selectedCodes, selectedField,
  visibleTables, PARENT_FIELD_MAP, getSelectedItems, getDataForType,
  filterChildByParent, onAdd, onRemove, onRemoveMultiple, onClose,
}: InlineAddFieldProps) {
  const [search, setSearch] = useState('');
  const tableId = tableItem.id;

  useEffect(() => { if (visible) setSearch(''); }, [visible, tableId]);

  const availableItems = useMemo(() => {
    const allData = getDataForType(tableId);
    const parentField = PARENT_FIELD_MAP[tableId];
    if (!parentField) return allData.filter((i: any) => i?.code);

    let current = parentField;
    while (current) {
      const currentType = current as TableType;
      if (visibleTables.has(currentType)) {
        const ancestorCodes = getSelectedItems(currentType);
        if (ancestorCodes.length > 0) {
          return filterChildByParent(tableId, currentType, ancestorCodes);
        }
        return allData.filter((i: any) => i?.code);
      }
      const grand = PARENT_FIELD_MAP[current];
      if (!grand) break;
      current = grand;
    }
    return allData.filter((i: any) => i?.code);
  }, [tableId, PARENT_FIELD_MAP, visibleTables, getSelectedItems, getDataForType, filterChildByParent]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return availableItems;
    return availableItems.filter((item: any) => {
      if (!item?.code) return false;
      return selectedField === 'name'
        ? (item.name ?? '').toLowerCase().includes(q)
        : (item.code ?? '').toLowerCase().includes(q);
    });
  }, [search, selectedField, availableItems]);

  const allSelected = filtered.length > 0 && filtered.every((i: any) => selectedCodes.includes(i.code));

  function toggleAll() {
    const codes = filtered.map((i: any) => i.code);
    if (allSelected) {
      onRemoveMultiple(codes.filter((c: string) => selectedCodes.includes(c)));
    } else {
      onAdd(codes.filter((c: string) => !selectedCodes.includes(c)));
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={am.backdrop} onPress={onClose} />
      <View style={am.sheet}>
        {/* Header */}
        <View style={am.header}>
          <Text style={am.headerTitle}>Add {tableItem.label}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color="#374151" />
          </Pressable>
        </View>

        {/* Search */}
        <View style={am.searchRow}>
          <Ionicons name="search-outline" size={16} color="#9ca3af" style={am.searchIcon} />
          <TextInput
            style={am.searchInput}
            placeholder={`Search by ${selectedField === 'code' ? 'code' : 'name'}…`}
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </Pressable>
          )}
        </View>

        {/* Select all */}
        {filtered.length > 0 && (
          <Pressable style={am.selectAll} onPress={toggleAll}>
            <View style={[am.chk, allSelected && am.chkActive]}>
              {allSelected && <Ionicons name="checkmark" size={11} color="#fff" />}
            </View>
            <Text style={am.selectAllTxt}>Select all ({filtered.length})</Text>
          </Pressable>
        )}

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.code}
          style={am.list}
          ListEmptyComponent={
            <View style={am.empty}>
              <Text style={am.emptyTxt}>No {tableItem.label.toLowerCase()} found.</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => {
            const isSelected = selectedCodes.includes(item.code);
            return (
              <Pressable
                style={({ pressed }) => [am.row, pressed && { backgroundColor: '#f3f4f6' }]}
                onPress={() => isSelected ? onRemove(item.code) : onAdd([item.code])}>
                <View style={[am.chk, isSelected && am.chkActive]}>
                  {isSelected && <Ionicons name="checkmark" size={11} color="#fff" />}
                </View>
                <View style={am.rowText}>
                  <Text style={am.rowName}>{item.name || 'N/A'}</Text>
                  <Text style={am.rowCode}>Code: {item.code}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

// ── ContractEmployeeCard ──────────────────────────────────────────────────────

function ContractEmployeeCard({
  tableItem, getSelectedItems, getDataForType,
  handleAddItems, handleRemoveItem,
}: {
  tableItem: TableMenuItem;
  getSelectedItems: (type: TableType) => string[];
  getDataForType: (type: TableType) => any[];
  handleAddItems: (type: TableType, codes: string[]) => void;
  handleRemoveItem: (type: TableType, code: string) => void;
}) {
  const tableId = tableItem.id;
  const selectedIds = getSelectedItems(tableId);
  const allEmployees: any[] = getDataForType(tableId);
  const selectedContractors = getSelectedItems('contractors' as TableType);

  // Read tenantCode from hierarchy Redux slice (populated on login)
  const tenantCode = useSelector((s: RootState) => s.hierarchy.data?.tenantCode ?? '');

  // Increment key after each selection to reset EmployeeSearchField internal state,
  // allowing the user to search and add the next employee immediately
  const [searchFieldKey, setSearchFieldKey] = useState(0);

  const handleEmployeeSelect = (emp: Employee) => {
    if (!selectedIds.includes(emp.employeeID)) {
      handleAddItems(tableId, [emp.employeeID]);
    }
    setSearchFieldKey((k) => k + 1);
  };

  return (
    <View style={s.card}>
      {/* Card header */}
      <View style={s.cardHeader}>
        <Text style={s.cardTitle}>{tableItem.label.toUpperCase()}</Text>
        <View style={s.cardHeaderRight}>
          <Text style={s.cardSub}>{selectedIds.length} selected</Text>
        </View>
      </View>

      <View style={s.cardBody}>
        {/* Live employee search — replaces the old modal picker */}
        <EmployeeSearchField
          key={searchFieldKey}
          tenantCode={tenantCode}
          contractors={selectedContractors.length ? selectedContractors : undefined}
          label="Search Employee"
          onSelect={handleEmployeeSelect}
        />

        {/* Selected employees table */}
        {selectedIds.length > 0 ? (
          <View style={s.table}>
            <View style={s.tableHead}>
              <Text style={[s.th, { flex: 1 }]}>Employee ID</Text>
              <Text style={[s.th, { flex: 2 }]}>Employee Name</Text>
              <Text style={[s.th, { width: 40, textAlign: 'right' }]}>Del</Text>
            </View>
            {selectedIds.map((id) => {
              const emp = allEmployees.find((e: any) => e.code === id);
              return (
                <View key={id} style={s.tableRow}>
                  <Text style={[s.tdMono, { flex: 1 }]} numberOfLines={1}>{id}</Text>
                  <Text style={[s.td, { flex: 2 }]} numberOfLines={1}>{emp?.name ?? id}</Text>
                  <Pressable
                    style={[s.delBtn, { width: 40, alignItems: 'flex-end' }]}
                    onPress={() => handleRemoveItem(tableId, id)}
                    hitSlop={6}>
                    <Ionicons name="trash-outline" size={14} color="#94a3b8" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={s.emptyRow}>
            <Text style={s.emptyTxt}>No employees selected. Search above to add.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── TableTypeCard (standard) ──────────────────────────────────────────────────

function TableTypeCard(props: TableContentAreaProps) {
  const {
    tableItem, visibleTables, getSelectedItems, getDataForType,
    getLoadingForType, isParentSelected,
    handleAddItems, handleRemoveItem, handleRemoveItems,
    openAddFieldType, setOpenAddFieldType,
    filterChildByParent, PARENT_FIELD_MAP, tableMenuItems, pageSize,
  } = props;

  const tableId = tableItem.id;
  const selectedCodes = getSelectedItems(tableId);
  const loading = getLoadingForType(tableId);
  const parentField = PARENT_FIELD_MAP[tableId] as TableType | '';
  // Parent required only when it's also visible in the sidebar
  const parentOk = !parentField || !visibleTables.has(parentField as TableType) || isParentSelected(tableId);

  // Per-type search/field/page from spread props
  const searchKey = tableId === 'contractors' ? 'contractorSearch'
    : tableId === 'workOrders' ? 'workOrderSearch'
    : tableId === 'employeeCategories' ? 'employeeCategoriesSearch'
    : `${tableId}Search`;
  const setSearchKey = tableId === 'contractors' ? 'setContractorSearch'
    : tableId === 'workOrders' ? 'setWorkOrderSearch'
    : tableId === 'employeeCategories' ? 'setEmployeeCategoriesSearch'
    : `set${tableId.charAt(0).toUpperCase() + tableId.slice(1)}Search`;
  const fieldKey = tableId === 'contractors' ? 'contractorField'
    : tableId === 'workOrders' ? 'workOrderField'
    : tableId === 'employeeCategories' ? 'employeeCategoriesField'
    : `${tableId}Field`;
  const setFieldKey = tableId === 'contractors' ? 'setContractorField'
    : tableId === 'workOrders' ? 'setWorkOrderField'
    : tableId === 'employeeCategories' ? 'setEmployeeCategoriesField'
    : `set${tableId.charAt(0).toUpperCase() + tableId.slice(1)}Field`;
  const pageKey = tableId === 'contractors' ? 'contractorPage'
    : tableId === 'workOrders' ? 'workOrderPage'
    : tableId === 'employeeCategories' ? 'employeeCategoriesPage'
    : `${tableId}Page`;
  const setPageKey = tableId === 'contractors' ? 'setContractorPage'
    : tableId === 'workOrders' ? 'setWorkOrderPage'
    : tableId === 'employeeCategories' ? 'setEmployeeCategoriesPage'
    : `set${tableId.charAt(0).toUpperCase() + tableId.slice(1)}Page`;

  const searchTerm: string = props[searchKey] ?? '';
  const setSearchTerm: (v: string) => void = props[setSearchKey] ?? (() => {});
  const field: 'code' | 'name' = props[fieldKey] ?? 'code';
  const setField: (v: 'code' | 'name') => void = props[setFieldKey] ?? (() => {});
  const page: number = props[pageKey] ?? 1;
  const setPage: (v: number) => void = props[setPageKey] ?? (() => {});

  // Use filterChildByParent so that when no parent is selected, all items are shown
  const parentCodes = parentField ? getSelectedItems(parentField as TableType) : [];
  const data = filterChildByParent(tableId, parentField as TableType, parentCodes);

  // Filtered selected codes (by search)
  const filteredSelected = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return selectedCodes;
    return selectedCodes.filter((code) => {
      const item = data.find((d: any) => d.code === code);
      if (!item) return false;
      return field === 'code'
        ? (item.code ?? '').toLowerCase().includes(q)
        : (item.name ?? '').toLowerCase().includes(q);
    });
  }, [selectedCodes, searchTerm, field, data]);

  const totalPages = Math.ceil(filteredSelected.length / pageSize);
  const paged = filteredSelected.slice((page - 1) * pageSize, page * pageSize);

  // Parent-missing warning
  const missingParent = useMemo(() => {
    if (!parentField || parentOk) return null;
    let cur: string = parentField;
    while (cur) {
      const curType = cur as TableType;
      if (visibleTables.has(curType) && getSelectedItems(curType).length === 0) {
        const item = tableMenuItems.find((m) => m.id === curType);
        return item?.label ?? cur;
      }
      const grand = PARENT_FIELD_MAP[cur];
      if (!grand) break;
      cur = grand;
    }
    return null;
  }, [parentField, parentOk, visibleTables, getSelectedItems, tableMenuItems, PARENT_FIELD_MAP]);

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.cardHeader}>
        <Text style={s.cardTitle}>{tableItem.label.toUpperCase()}</Text>
        <View style={s.cardHeaderRight}>
          {loading && <ActivityIndicator size="small" color="#7c3aed" style={{ marginRight: 8 }} />}
          <Text style={s.cardSub}>{selectedCodes.length} selected</Text>
        </View>
      </View>

      <View style={s.cardBody}>
        {/* Search bar row */}
        <View style={s.searchRow}>
          <Ionicons name="search-outline" size={15} color="#9ca3af" />
          <TextInput
            style={s.searchInput}
            placeholder={`Search ${tableItem.label} name…`}
            placeholderTextColor="#9ca3af"
            value={searchTerm}
            onChangeText={(t) => { setSearchTerm(t); setPage(1); }}
            autoCorrect={false}
          />
          {searchTerm.length > 0 && (
            <Pressable onPress={() => { setSearchTerm(''); setPage(1); }} hitSlop={8}>
              <Ionicons name="close-circle" size={15} color="#9ca3af" />
            </Pressable>
          )}
          <Pressable
            style={[s.filterBtn, field === 'name' && s.filterBtnActive]}
            onPress={() => { setField(field === 'code' ? 'name' : 'code'); setPage(1); }}
            hitSlop={4}>
            <Ionicons
              name="reorder-three-outline"
              size={18}
              color={field === 'name' ? '#0a1c63' : '#6b7280'}
            />
          </Pressable>
        </View>

        {/* Add button row */}
        <Pressable
          style={({ pressed }) => [
            s.addBtn,
            (loading || !parentOk) && s.addBtnDisabled,
            pressed && !loading && parentOk && { opacity: 0.88 },
          ]}
          onPress={() => {
            if (!loading && parentOk) setOpenAddFieldType(tableId);
          }}
          disabled={loading || !parentOk}>
          <Ionicons name="add" size={16} color="#ffffff" />
          <Text style={s.addBtnTxt}>Add {tableItem.label}</Text>
        </Pressable>

        {/* Parent warning */}
        {missingParent && (
          <View style={s.warning}>
            <Ionicons name="warning-outline" size={14} color="#d97706" />
            <Text style={s.warningTxt}>
              Please select <Text style={{ fontWeight: '700' }}>{missingParent}</Text> first.
            </Text>
          </View>
        )}

        {/* Table */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tableScroll}>
          <View style={s.table}>
            {/* Table header */}
            <View style={s.tableHead}>
              <Text style={[s.th, { width: 110 }]}>{CODE_LABEL[tableId]}</Text>
              <Text style={[s.th, { width: 200 }]}>{NAME_LABEL[tableId]}</Text>
              <Text style={[s.th, { width: 40, textAlign: 'right' }]}>Del</Text>
            </View>

            {/* Rows */}
            {paged.length > 0 ? (
              paged.map((code, idx) => {
                const item = data.find((d: any) => d.code === code);
                return (
                  <View key={code} style={[s.tableRow, idx % 2 === 1 && s.tableRowAlt]}>
                    <Text style={[s.tdMono, { width: 110 }]} numberOfLines={1}>{code}</Text>
                    <Text style={[s.td, { width: 200 }]} numberOfLines={1}>{item?.name ?? code}</Text>
                    <Pressable
                      style={{ width: 40, alignItems: 'flex-end', justifyContent: 'center' }}
                      onPress={() => handleRemoveItem(tableId, code)}
                      hitSlop={6}>
                      <Ionicons name="trash-outline" size={14} color="#94a3b8" />
                    </Pressable>
                  </View>
                );
              })
            ) : (
              <View style={s.emptyRow}>
                <Text style={s.emptyTxt}>
                  No {tableItem.label.toLowerCase()} selected. Tap "Add" to select.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Pagination */}
        {filteredSelected.length > pageSize && (
          <View style={s.pagination}>
            <Text style={s.pageInfo}>
              {Math.min((page - 1) * pageSize + 1, filteredSelected.length)}–
              {Math.min(page * pageSize, filteredSelected.length)} of {filteredSelected.length}
            </Text>
            <View style={s.pageButtons}>
              <Pressable
                style={[s.pageBtn, page === 1 && s.pageBtnDisabled]}
                onPress={() => { if (page > 1) setPage(page - 1); }}
                disabled={page === 1}>
                <Text style={s.pageBtnTxt}>Prev</Text>
              </Pressable>
              <Pressable
                style={[s.pageBtn, page >= totalPages && s.pageBtnDisabled]}
                onPress={() => { if (page < totalPages) setPage(page + 1); }}
                disabled={page >= totalPages}>
                <Text style={s.pageBtnTxt}>Next</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Inline add modal */}
      <InlineAddField
        visible={openAddFieldType === tableId}
        tableItem={tableItem}
        selectedCodes={selectedCodes}
        selectedField={field}
        visibleTables={visibleTables}
        PARENT_FIELD_MAP={PARENT_FIELD_MAP}
        getSelectedItems={getSelectedItems}
        getDataForType={getDataForType}
        filterChildByParent={filterChildByParent}
        onAdd={(codes) => handleAddItems(tableId, codes)}
        onRemove={(code) => handleRemoveItem(tableId, code)}
        onRemoveMultiple={(codes) => handleRemoveItems(tableId, codes)}
        onClose={() => setOpenAddFieldType(null)}
      />
    </View>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function TableContentArea(props: TableContentAreaProps) {
  if (props.tableItem.id === 'contractEmployees') {
    return (
      <ContractEmployeeCard
        tableItem={props.tableItem}
        getSelectedItems={props.getSelectedItems}
        getDataForType={props.getDataForType}
        handleAddItems={props.handleAddItems}
        handleRemoveItem={props.handleRemoveItem}
      />
    );
  }
  return <TableTypeCard {...props} />;
}

// ── Modal styles (InlineAddField) ─────────────────────────────────────────────

const am = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '65%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontFamily: F, fontSize: 15, fontWeight: '700', color: '#111827',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1, fontFamily: F, fontSize: 14, color: '#111827',
  },
  selectAll: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  selectAllTxt: {
    fontFamily: F, fontSize: 13, fontWeight: '600', color: '#374151',
    marginLeft: 8,
  },
  list: { flex: 1 },
  empty: {
    paddingVertical: 32, alignItems: 'center',
  },
  emptyTxt: {
    fontFamily: F, fontSize: 13, color: '#9ca3af',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  rowText: { flex: 1, marginLeft: 12 },
  rowName: { fontFamily: F, fontSize: 13, fontWeight: '600', color: '#111827' },
  rowCode: { fontFamily: F, fontSize: 11, color: '#6b7280', marginTop: 1 },
  chk: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5,
    borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  chkActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
});

// ── Card styles ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#eef2ff',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: F, fontSize: 12, fontWeight: '700',
    color: '#0a1c63', letterSpacing: 0.8,
  },
  cardSub: {
    fontFamily: F, fontSize: 11, fontWeight: '600',
    color: '#6b7280',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10,
  },
  cardBody: { padding: 12 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, backgroundColor: '#f9fafb',
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontFamily: F, fontSize: 13, color: '#111827', padding: 0, marginLeft: 8 },
  filterBtn: {
    padding: 4, borderRadius: 6, marginLeft: 4,
  },
  filterBtnActive: {
    backgroundColor: '#e8eaf6',
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0a1c63',
    borderRadius: 10, height: 40,
    marginBottom: 10,
  },
  addBtnDisabled: { backgroundColor: '#a3aed0' },
  addBtnTxt: { fontFamily: F, fontSize: 13, fontWeight: '700', color: '#ffffff', marginLeft: 4 },

  warning: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: 8, padding: 10,
    marginBottom: 10,
  },
  warningTxt: { fontFamily: F, fontSize: 12, color: '#92400e', flex: 1 },

  tableScroll: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8,
  },
  table: {
    minWidth: '100%',
    overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  th: {
    fontFamily: F, fontSize: 10, fontWeight: '700',
    color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  tableRowAlt: { backgroundColor: '#f8fafc' },
  td: { fontFamily: F, fontSize: 13, color: '#111827' },
  tdMono: { fontFamily: F, fontSize: 11, color: '#374151' },
  delBtn: { justifyContent: 'center' },
  emptyRow: {
    paddingVertical: 24, alignItems: 'center',
  },
  emptyTxt: { fontFamily: F, fontSize: 13, color: '#9ca3af', textAlign: 'center' },

  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 6,
  },
  pageInfo: { fontFamily: F, fontSize: 11, color: '#6b7280' },
  pageButtons: { flexDirection: 'row' },
  pageBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 6, backgroundColor: '#ffffff',
    marginLeft: 6,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnTxt: { fontFamily: F, fontSize: 12, fontWeight: '600', color: '#374151' },

  hint: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#e8eaf6', borderWidth: 1, borderColor: '#c7d2fe',
    borderRadius: 8, padding: 10,
  },
  hintIconWrap: { marginRight: 8 },
  hintIcon: { fontSize: 14 },
  hintTxt: { fontFamily: F, fontSize: 12, color: '#0a1c63', flex: 1, lineHeight: 17 },
});

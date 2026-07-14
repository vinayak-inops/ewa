import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store';

import { EmployeeSearchField, type Employee } from '../../../../components/employee-search-field';
import { TableMenuItem, TableType } from './types';

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
      <View className="flex-1 bg-black/40 justify-end">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="bg-white rounded-tl-[20px] rounded-tr-[20px] pb-5" style={{ maxHeight: '70%' }}>

          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-[14px] border-b border-[#f1f5f9]">
            <Text className="text-[15px] font-bold text-[#111827]">Add {tableItem.label}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color="#374151" />
            </Pressable>
          </View>

          {/* Search */}
          <View className="flex-row items-center m-3 px-3 py-2 bg-[#f9fafb] border border-[#e5e7eb] rounded-[10px]">
            <Ionicons name="search-outline" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
            <TextInput
              className="flex-1 text-[14px] text-[#111827]"
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
            <Pressable className="flex-row items-center px-4 py-[10px] border-b border-[#e5e7eb] bg-[#f9fafb]" onPress={toggleAll}>
              <View
                className={`w-[18px] h-[18px] rounded-[4px] items-center justify-center shrink-0 ${allSelected ? 'bg-[#16a34a] border-[#16a34a]' : 'border-[#d1d5db]'}`}
                style={{ borderWidth: 1.5 }}
              >
                {allSelected && <Ionicons name="checkmark" size={11} color="#fff" />}
              </View>
              <Text className="text-[13px] font-semibold text-[#374151] ml-2">Select all ({filtered.length})</Text>
            </Pressable>
          )}

          {/* List */}
          <FlatList
            className="flex-1"
            data={filtered}
            keyExtractor={(item: any) => item.code}
            ListEmptyComponent={
              <View className="py-8 items-center">
                <Text className="text-[13px] text-[#9ca3af]">No {tableItem.label.toLowerCase()} found.</Text>
              </View>
            }
            renderItem={({ item }: { item: any }) => {
              const isSelected = selectedCodes.includes(item.code);
              return (
                <Pressable
                  className="flex-row items-center px-4 py-3 border-b border-[#f3f4f6]"
                  style={({ pressed }) => pressed ? [{ backgroundColor: '#f3f4f6' }] : []}
                  onPress={() => isSelected ? onRemove(item.code) : onAdd([item.code])}
                >
                  <View
                    className={`w-[18px] h-[18px] rounded-[4px] items-center justify-center shrink-0 ${isSelected ? 'bg-[#16a34a] border-[#16a34a]' : 'border-[#d1d5db]'}`}
                    style={{ borderWidth: 1.5 }}
                  >
                    {isSelected && <Ionicons name="checkmark" size={11} color="#fff" />}
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-[13px] font-semibold text-[#111827]">{item.name || 'N/A'}</Text>
                    <Text className="text-[11px] text-[#6b7280] mt-[1px]">Code: {item.code}</Text>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
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
    <View
      className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
    >
      {/* Card header */}
      <View className="flex-row items-center justify-between px-[14px] py-[10px] bg-[#eef2ff]">
        <Text className="text-[12px] font-bold text-[#0a1c63]" style={{ letterSpacing: 0.8 }}>
          {tableItem.label.toUpperCase()}
        </Text>
        <View className="flex-row items-center">
          <Text className="text-[11px] font-semibold text-[#6b7280] bg-[#f1f5f9] px-2 py-[2px] rounded-[10px]">
            {selectedIds.length} selected
          </Text>
        </View>
      </View>

      <View className="p-3">
        {/* Live employee search */}
        <EmployeeSearchField
          key={searchFieldKey}
          tenantCode={tenantCode}
          contractors={selectedContractors.length ? selectedContractors : undefined}
          label="Search Employee"
          onSelect={handleEmployeeSelect}
        />

        {/* Selected employees table */}
        {selectedIds.length > 0 ? (
          <View className="min-w-full overflow-hidden">
            <View className="flex-row items-center bg-[#f8fafc] px-3 py-2 border-b border-[#e2e8f0]">
              <Text className="text-[10px] font-bold text-[#475569] uppercase" style={{ flex: 1, letterSpacing: 0.4 }}>Employee ID</Text>
              <Text className="text-[10px] font-bold text-[#475569] uppercase" style={{ flex: 2, letterSpacing: 0.4 }}>Employee Name</Text>
              <Text className="text-[10px] font-bold text-[#475569] uppercase text-right" style={{ width: 40, letterSpacing: 0.4 }}>Del</Text>
            </View>
            {selectedIds.map((id) => {
              const emp = allEmployees.find((e: any) => e.code === id);
              return (
                <View key={id} className="flex-row items-center px-3 py-[9px] border-b border-[#f1f5f9] bg-white">
                  <Text className="text-[11px] text-[#374151]" style={{ flex: 1 }} numberOfLines={1}>{id}</Text>
                  <Text className="text-[13px] text-[#111827]" style={{ flex: 2 }} numberOfLines={1}>{emp?.name ?? id}</Text>
                  <Pressable
                    className="justify-center items-end"
                    style={{ width: 40 }}
                    onPress={() => handleRemoveItem(tableId, id)}
                    hitSlop={6}
                  >
                    <Ionicons name="trash-outline" size={14} color="#94a3b8" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="py-6 items-center">
            <Text className="text-[13px] text-[#9ca3af] text-center">No employees selected. Search above to add.</Text>
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
    <View
      className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-[14px] py-[10px] bg-[#eef2ff]">
        <Text className="text-[12px] font-bold text-[#0a1c63]" style={{ letterSpacing: 0.8 }}>
          {tableItem.label.toUpperCase()}
        </Text>
        <View className="flex-row items-center">
          {loading && <ActivityIndicator size="small" color="#7c3aed" style={{ marginRight: 8 }} />}
          <Text className="text-[11px] font-semibold text-[#6b7280] bg-[#f1f5f9] px-2 py-[2px] rounded-[10px]">
            {selectedCodes.length} selected
          </Text>
        </View>
      </View>

      <View className="p-3">
        {/* Search bar row */}
        <View className="flex-row items-center px-3 py-[9px] border border-[#e5e7eb] rounded-[10px] bg-[#f9fafb] mb-[10px]">
          <Ionicons name="search-outline" size={15} color="#9ca3af" />
          <TextInput
            className="flex-1 text-[13px] text-[#111827] p-0 ml-2"
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
            className={`p-1 rounded-md ml-1 ${field === 'name' ? 'bg-[#e8eaf6]' : ''}`}
            onPress={() => { setField(field === 'code' ? 'name' : 'code'); setPage(1); }}
            hitSlop={4}
          >
            <Ionicons
              name="reorder-three-outline"
              size={18}
              color={field === 'name' ? '#0a1c63' : '#6b7280'}
            />
          </Pressable>
        </View>

        {/* Add button */}
        <Pressable
          className={`flex-row items-center justify-center rounded-[10px] h-10 mb-[10px] ${(loading || !parentOk) ? 'bg-[#a3aed0]' : 'bg-[#0a1c63]'}`}
          style={({ pressed }) => pressed && !loading && parentOk ? [{ opacity: 0.88 }] : []}
          onPress={() => { if (!loading && parentOk) setOpenAddFieldType(tableId); }}
          disabled={loading || !parentOk}
        >
          <Ionicons name="add" size={16} color="#ffffff" />
          <Text className="text-[13px] font-bold text-white ml-1">Add {tableItem.label}</Text>
        </Pressable>

        {/* Parent warning */}
        {missingParent && (
          <View className="flex-row items-center bg-[#fffbeb] border border-[#fde68a] rounded-lg p-[10px] mb-[10px]">
            <Ionicons name="warning-outline" size={14} color="#d97706" />
            <Text className="text-[12px] text-[#92400e] flex-1">
              Please select <Text style={{ fontWeight: '700' }}>{missingParent}</Text> first.
            </Text>
          </View>
        )}

        {/* Table */}
        {paged.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="border border-[#e2e8f0] rounded-lg">
            <View className="min-w-full overflow-hidden">
              <View className="flex-row items-center bg-[#f8fafc] px-3 py-2 border-b border-[#e2e8f0]">
                <Text className="text-[10px] font-bold text-[#475569] uppercase" style={{ width: 110, letterSpacing: 0.4 }}>{CODE_LABEL[tableId]}</Text>
                <Text className="text-[10px] font-bold text-[#475569] uppercase" style={{ width: 200, letterSpacing: 0.4 }}>{NAME_LABEL[tableId]}</Text>
                <Text className="text-[10px] font-bold text-[#475569] uppercase text-right" style={{ width: 40, letterSpacing: 0.4 }}>Del</Text>
              </View>
              {paged.map((code, idx) => {
                const item = data.find((d: any) => d.code === code);
                return (
                  <View key={code} className={`flex-row items-center px-3 py-[9px] border-b border-[#f1f5f9] ${idx % 2 === 1 ? 'bg-[#f8fafc]' : 'bg-white'}`}>
                    <Text className="text-[11px] text-[#374151]" style={{ width: 110 }} numberOfLines={1}>{code}</Text>
                    <Text className="text-[13px] text-[#111827]" style={{ width: 200 }} numberOfLines={1}>{item?.name ?? code}</Text>
                    <Pressable
                      className="items-end justify-center"
                      style={{ width: 40 }}
                      onPress={() => handleRemoveItem(tableId, code)}
                      hitSlop={6}
                    >
                      <Ionicons name="trash-outline" size={14} color="#94a3b8" />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <View className="border border-[#e2e8f0] rounded-lg py-6 items-center">
            <Text className="text-[13px] text-[#9ca3af] text-center">
              No {tableItem.label.toLowerCase()} selected. Tap "Add" to select.
            </Text>
          </View>
        )}

        {/* Pagination */}
        {filteredSelected.length > pageSize && (
          <View className="flex-row items-center justify-between pt-[6px]">
            <Text className="text-[11px] text-[#6b7280]">
              {Math.min((page - 1) * pageSize + 1, filteredSelected.length)}–
              {Math.min(page * pageSize, filteredSelected.length)} of {filteredSelected.length}
            </Text>
            <View className="flex-row">
              <Pressable
                className={`px-3 py-[5px] border border-[#e5e7eb] rounded-md bg-white ml-[6px] ${page === 1 ? 'opacity-40' : ''}`}
                onPress={() => { if (page > 1) setPage(page - 1); }}
                disabled={page === 1}
              >
                <Text className="text-[12px] font-semibold text-[#374151]">Prev</Text>
              </Pressable>
              <Pressable
                className={`px-3 py-[5px] border border-[#e5e7eb] rounded-md bg-white ml-[6px] ${page >= totalPages ? 'opacity-40' : ''}`}
                onPress={() => { if (page < totalPages) setPage(page + 1); }}
                disabled={page >= totalPages}
              >
                <Text className="text-[12px] font-semibold text-[#374151]">Next</Text>
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

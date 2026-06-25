import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getAuthHeader } from '@/hooks/auth/token-store';
import { useUserEntitlement, type UserEntitlement } from '@/hooks/api/useUserEntitlement';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const GRAPHQL_URL = process.env.EXPO_PUBLIC_GRAPHQL_URL ?? `${API_BASE_URL}/graphql`;

// ── Inline userEntitlement arg builder (schema has no $variable for this) ────

function arr(values: string[]): string {
  return `[${values.map((v) => `"${v}"`).join(', ')}]`;
}

function buildUeArg(ue: UserEntitlement): string {
  const parts: string[] = [];
  if (ue.employeeID)           parts.push(`employeeID: "${ue.employeeID}"`);
  if (ue.roleID)               parts.push(`roleID: "${ue.roleID}"`);
  if (ue.organizationCode)     parts.push(`organizationCode: "${ue.organizationCode}"`);
  if (ue.tenantCode)           parts.push(`tenantCode: "${ue.tenantCode}"`);
  if (ue.subsidiary?.length)   parts.push(`subsidiaries: ${arr(ue.subsidiary)}`);
  if (ue.division?.length)     parts.push(`divisions: ${arr(ue.division)}`);
  if (ue.department?.length)   parts.push(`departments: ${arr(ue.department)}`);
  if (ue.location?.length)     parts.push(`locations: ${arr(ue.location)}`);
  if (ue.contractor?.length)   parts.push(`contractors: ${arr(ue.contractor)}`);
  if (ue.isManager !== undefined) parts.push(`isManager: ${ue.isManager}`);
  if (ue.isEndUser !== undefined) parts.push(`isEndUser: ${ue.isEndUser}`);
  if (parts.length === 0) return '';
  return `userEntitlement: { ${parts.join(', ')} }`;
}

function buildGqlQuery(ueArg: string): string {
  return `
    query FetchContractEmployees(
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
}

export interface Employee {
  _id: string;
  employeeID: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  contractorCode?: string;
}

interface EmployeeSearchFieldProps {
  tenantCode: string;
  label?: string;
  placeholder?: string;
  preSelectedEmployeeId?: string;
  contractors?: string[];
  onSelect: (employee: Employee) => void;
  onClear?: () => void;
}

export function EmployeeSearchField({
  tenantCode,
  label = 'Employee',
  placeholder = 'Type at least 2 characters to search',
  preSelectedEmployeeId,
  contractors,
  onSelect,
  onClear,
}: EmployeeSearchFieldProps) {
  const userEntitlement = useUserEntitlement();

  // Bake userEntitlement inline into the query string (same pattern as useLeavePolicy)
  const gqlQuery = useMemo(() => {
    const ueArg = buildUeArg(userEntitlement);
    return buildGqlQuery(ueArg);
  }, [userEntitlement]);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchEmployees = useCallback(async (query: string) => {
    if (!tenantCode) return;

    const criteriaRequests: any[] = [
      { field: 'tenantCode', operator: 'is', value: tenantCode },
    ];
    if (contractors?.length) {
      criteriaRequests.push({ field: 'contractorCode', operator: 'in', value: contractors });
    }
    if (query.trim()) {
      criteriaRequests.push({ field: 'employeeID', operator: 'like', value: query.trim() });
    }

    try {
      setLoading(true);
      const authHeader = await getAuthHeader();
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({
          query: gqlQuery,
          variables: { criteriaRequests, collection: 'contract_employee', offset: 0, limit: 20 },
        }),
      });
      const json = await res.json() as { data?: { fetchEmployees?: any[] } };
      const employees: Employee[] = (json?.data?.fetchEmployees ?? []).filter((e: any) => !e.isDeleted);
      if (mountedRef.current) setResults(employees);
    } catch {
      if (mountedRef.current) setResults([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [tenantCode, contractors, gqlQuery]);

  // Debounce: min 2 chars, 350ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = search.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => { void fetchEmployees(trimmed); }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, fetchEmployees]);

  // Resolve pre-selected employee ID once results arrive
  useEffect(() => {
    if (!preSelectedEmployeeId || selected) return;
    const emp = results.find((e) => e.employeeID === preSelectedEmployeeId);
    if (emp) {
      setSelected(emp);
      setSearch([emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' '));
      setResults([]);
      onSelect(emp);
    }
  }, [results, preSelectedEmployeeId, selected, onSelect]);

  // Seed search from preSelectedEmployeeId on mount
  useEffect(() => {
    if (preSelectedEmployeeId && !selected) {
      setSearch(preSelectedEmployeeId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preSelectedEmployeeId]);

  const handleSelect = (emp: Employee) => {
    setSelected(emp);
    setSearch([emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' '));
    setResults([]);
    onSelect(emp);
  };

  const handleClear = () => {
    setSelected(null);
    setSearch('');
    setResults([]);
    onClear?.();
  };

  const handleChange = (text: string) => {
    setSearch(text);
    if (selected) {
      setSelected(null);
      onClear?.();
    }
  };

  return (
    <View style={s.wrap}>
      {label ? <Text style={s.label}>{label}</Text> : null}

      <View style={s.inputRow}>
        <Ionicons name="search-outline" size={15} color="#94a3b8" />
        <TextInput
          style={s.input}
          value={search}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {loading && <ActivityIndicator size="small" color="#7c3aed" />}
        {!loading && (selected || search.length > 0) && (
          <Pressable onPress={handleClear} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color="#94a3b8" />
          </Pressable>
        )}
      </View>

      {results.length > 0 && !selected && (
        <View style={s.dropdown}>
          <FlatList
            data={results}
            keyExtractor={(item) => item._id ?? item.employeeID}
            style={s.dropdownList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const name = [item.firstName, item.middleName, item.lastName].filter(Boolean).join(' ');
              return (
                <Pressable style={({ pressed }) => [s.resultRow, pressed && { backgroundColor: '#f1f5f9' }]} onPress={() => handleSelect(item)}>
                  <Text style={s.resultName}>{name}</Text>
                  <Text style={s.resultId}>({item.employeeID})</Text>
                </Pressable>
              );
            }}
          />
        </View>
      )}

      {selected && (
        <View style={s.selectedBadge}>
          <View style={s.dot} />
          <Text style={s.selectedTxt} numberOfLines={1}>
            <Text style={s.selectedLabel}>Selected: </Text>
            {[selected.firstName, selected.middleName, selected.lastName].filter(Boolean).join(' ')}{' '}
            ({selected.employeeID})
          </Text>
          <Pressable onPress={handleClear} hitSlop={8}>
            <Ionicons name="close-outline" size={14} color="#94a3b8" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    backgroundColor: '#f8fafc',
  },
  input: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#0f172a',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownList: {
    maxHeight: 180,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  resultName: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#0f172a',
    flex: 1,
  },
  resultId: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#94a3b8',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    flexShrink: 0,
  },
  selectedTxt: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  selectedLabel: {
    fontWeight: '700',
    color: '#16a34a',
  },
});

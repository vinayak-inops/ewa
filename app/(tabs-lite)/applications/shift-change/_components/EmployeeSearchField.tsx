import { useGetRequest } from "@/hooks/api/useGetRequest"
import { AlertCircle, Search, X } from "lucide-react-native"
import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

export interface Employee {
  _id: string
  employeeID: string
  firstName: string
  middleName?: string
  lastName?: string
  organizationCode?: string
  contractorCode?: string
  tenantCode?: string
}

interface EmployeeSearchFieldProps {
  label?: string
  required?: boolean
  tenantCode: string
  preSelectedEmployeeId?: string
  errorText?: string
  onSelect: (employee: Employee) => void
  onClear?: () => void
}

function fullName(emp: Employee) {
  return [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ")
}

export default function EmployeeSearchField({
  label = "Employee ID",
  required = true,
  tenantCode,
  preSelectedEmployeeId,
  errorText,
  onSelect,
  onClear,
}: EmployeeSearchFieldProps) {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [searchResults, setSearchResults] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce: only fire after 350ms and at least 2 chars
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = search.trim()
    if (trimmed.length < 2) {
      setDebouncedSearch("")
      setSearchResults([])
      return
    }
    debounceRef.current = setTimeout(() => setDebouncedSearch(trimmed), 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const requestData = useMemo(() => {
    if (!debouncedSearch || !tenantCode) return []
    return [
      { field: "tenantCode", operator: "is", value: tenantCode },
      { field: "employeeID", operator: "like", value: debouncedSearch },
    ]
  }, [debouncedSearch, tenantCode])

  const enabled = debouncedSearch.length >= 2 && Boolean(tenantCode)

  const { loading } = useGetRequest<Employee[]>({
    url: "contract_employee/search?offset=0&limit=20",
    method: "POST",
    data: requestData,
    enabled,
    onSuccess: (data) => {
      if (!Array.isArray(data)) { setSearchResults([]); return }
      setSearchResults(
        data.map((e: any) => ({
          _id: e._id ?? "",
          employeeID: e.employeeID ?? "",
          firstName: e.firstName ?? "",
          middleName: e.middleName,
          lastName: e.lastName,
          organizationCode: e.organizationCode,
          contractorCode: e.contractorCode,
          tenantCode: e.tenantCode,
        }))
      )
    },
    onError: () => setSearchResults([]),
  })

  // Pre-select when preSelectedEmployeeId + tenantCode are ready
  useEffect(() => {
    if (!preSelectedEmployeeId || !tenantCode || selectedEmployee) return
    setSearch(preSelectedEmployeeId)
    setDebouncedSearch(preSelectedEmployeeId)
  }, [preSelectedEmployeeId, tenantCode])

  // Auto-select when results arrive for a pre-selected ID
  useEffect(() => {
    if (!preSelectedEmployeeId || selectedEmployee) return
    const match = searchResults.find(e => e.employeeID === preSelectedEmployeeId)
    if (match) handleSelect(match)
  }, [searchResults, preSelectedEmployeeId])

  const handleSelect = (emp: Employee) => {
    setSelectedEmployee(emp)
    setSearch(emp.employeeID)
    setDebouncedSearch("")
    setSearchResults([])
    onSelect(emp)
  }

  const handleClear = () => {
    setSearch("")
    setDebouncedSearch("")
    setSearchResults([])
    setSelectedEmployee(null)
    onClear?.()
  }

  const showDropdown = !selectedEmployee && searchResults.length > 0 && !loading

  return (
    <View>
      <Text className="text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
        {label}{required && <Text className="text-red-500"> *</Text>}
      </Text>

      {/* Input row */}
      <View
        className={`h-10 flex-row items-center border rounded-lg px-3 bg-white ${errorText ? "border-red-300" : "border-gray-300"}`}
      >
        <Search size={14} color="#9ca3af" />
        <TextInput
          value={search}
          onChangeText={v => {
            setSearch(v)
            if (selectedEmployee) {
              setSelectedEmployee(null)
              onClear?.()
            }
          }}
          placeholder={loading ? "Searching..." : "Type 2+ chars to search"}
          placeholderTextColor="#9ca3af"
          autoCapitalize="characters"
          className="flex-1 mx-2 text-sm text-gray-900"
          editable={!selectedEmployee}
        />
        {loading && <ActivityIndicator size="small" color="#4c008f" />}
        {selectedEmployee && (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={14} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Inline dropdown results */}
      {showDropdown && (
        <View className="border border-gray-200 rounded-lg mt-1 bg-white overflow-hidden" style={{ maxHeight: 200 }}>
          <FlatList
            data={searchResults}
            keyExtractor={item => item._id || item.employeeID}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                className="px-3 py-2.5 border-b border-gray-50 flex-row items-center gap-2"
              >
                <View className="w-7 h-7 rounded-full bg-purple-100 items-center justify-center">
                  <Text className="text-xs font-semibold text-[#4c008f]">
                    {item.firstName?.charAt(0)?.toUpperCase() || "?"}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-800 font-medium">{fullName(item)}</Text>
                  <Text className="text-xs text-gray-500">{item.employeeID}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Selected chip */}
      {selectedEmployee && (
        <View className="flex-row items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 mt-1.5">
          <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <Text className="text-xs text-green-700 flex-1">
            <Text className="font-semibold">Selected: </Text>
            {fullName(selectedEmployee)} ({selectedEmployee.employeeID})
          </Text>
        </View>
      )}

      {/* Minimum chars hint */}
      {!selectedEmployee && search.trim().length > 0 && search.trim().length < 2 && (
        <Text className="text-xs text-gray-400 mt-1">Type at least 2 characters to search</Text>
      )}

      {/* Error */}
      {errorText && (
        <View className="flex-row items-center gap-1 mt-1.5">
          <AlertCircle size={11} color="#ef4444" />
          <Text className="text-xs text-red-500 flex-1">{errorText}</Text>
        </View>
      )}
    </View>
  )
}

import { Filter, RefreshCw, Search } from "lucide-react-native"
import React, { useEffect, useRef, useState } from "react"
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"
import PunchFormPopup from "./punch-form-popup"

export type TabKey = "applications" | "pending" | "failed" | "approved" | "cancelled" | "rejected"

const TABS: { key: TabKey; label: string }[] = [
  { key: "applications", label: "Applications" },
  { key: "pending",      label: "Pending"       },
  { key: "failed",       label: "Failed"        },
  { key: "approved",     label: "Approved"      },
  { key: "cancelled",    label: "Cancel"        },
  { key: "rejected",     label: "Reject"        },
]

const SEARCH_FIELDS = [
  { value: "employeeID",    label: "Employee ID"    },
  { value: "attendanceDate",label: "Att. Date"      },
  { value: "remarks",       label: "Remarks"        },
  { value: "uploadedBy",    label: "Applied By"     },
]

interface ApplicationFiltersProps {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  onApply: (params: { field: string; value: string }) => void
  otRefetch?: () => void
  hideApplicationsTab?: boolean
  hideApplyButton?: boolean
  onActionSuccess?: () => void
}

export default function ApplicationFilters({
  activeTab,
  onTabChange,
  onApply,
  otRefetch,
  hideApplicationsTab = false,
  hideApplyButton = false,
  onActionSuccess,
}: ApplicationFiltersProps) {
  const [searchField, setSearchField] = useState("employeeID")
  const [searchValue, setSearchValue] = useState("")
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [prefillEmployee, setPrefillEmployee] = useState("")
  const [prefillDate, setPrefillDate] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleTabs = hideApplicationsTab
    ? TABS.filter(t => t.key !== "applications")
    : TABS

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onApply({ field: searchField, value: searchValue.trim() })
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchField, searchValue])

  const handleApply = () => {
    const clean = searchValue.trim()
    onApply({ field: searchField, value: clean })
    setPrefillEmployee(searchField === "employeeID" ? clean : "")
    setPrefillDate(searchField === "attendanceDate" ? clean : "")
    setIsFormOpen(true)
  }

  return (
    <View style={{ gap: 8, marginBottom: 12 }}>
      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 6, paddingVertical: 4 }}>
          {visibleTabs.map(tab => {
            const active = activeTab === tab.key
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => onTabChange(tab.key)}
                style={{
                  paddingHorizontal: 12, height: 32, borderRadius: 16,
                  alignItems: "center", justifyContent: "center", borderWidth: 1,
                  backgroundColor: active ? "#2563eb" : "#fff",
                  borderColor: active ? "#2563eb" : "#e5e7eb",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "500", color: active ? "#fff" : "#4b5563" }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      {/* Search row */}
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        {/* Field picker */}
        <TouchableOpacity
          onPress={() => setShowFieldPicker(v => !v)}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8 }}
        >
          <Filter size={13} color="#6b7280" />
          <Text style={{ fontSize: 12, color: "#374151", fontWeight: "500" }}>
            {SEARCH_FIELDS.find(f => f.value === searchField)?.label ?? "Field"}
          </Text>
        </TouchableOpacity>

        {/* Search input */}
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", height: 36, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 12, gap: 8 }}>
          <Search size={13} color="#9ca3af" />
          <TextInput
            value={searchValue}
            onChangeText={setSearchValue}
            placeholder={`Search by ${SEARCH_FIELDS.find(f => f.value === searchField)?.label.toLowerCase()}...`}
            placeholderTextColor="#9ca3af"
            returnKeyType="search"
            style={{ flex: 1, fontSize: 13, color: "#111827" }}
          />
          {searchValue.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchValue(""); onApply({ field: searchField, value: "" }) }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 12, color: "#9ca3af" }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Refresh */}
        {otRefetch && (
          <TouchableOpacity
            onPress={() => { onApply({ field: searchField, value: searchValue.trim() }); otRefetch() }}
            style={{ width: 36, height: 36, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, alignItems: "center", justifyContent: "center" }}
          >
            <RefreshCw size={14} color="#6b7280" />
          </TouchableOpacity>
        )}

        {/* Apply = open new punch form */}
        {!hideApplyButton && (
          <TouchableOpacity
            onPress={handleApply}
            style={{ height: 36, paddingHorizontal: 14, backgroundColor: "#2563eb", borderRadius: 8, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontSize: 12, color: "#fff", fontWeight: "600" }}>Apply</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Field picker dropdown */}
      {showFieldPicker && (
        <View style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          {SEARCH_FIELDS.map(f => (
            <TouchableOpacity
              key={f.value}
              onPress={() => { setSearchField(f.value); setShowFieldPicker(false) }}
              style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f9fafb", backgroundColor: searchField === f.value ? "#eff6ff" : "#fff" }}
            >
              <Text style={{ fontSize: 13, color: searchField === f.value ? "#1d4ed8" : "#374151", fontWeight: searchField === f.value ? "600" : "400" }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* New punch application form */}
      <Modal visible={isFormOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsFormOpen(false)}>
        <PunchFormPopup
          onClose={() => setIsFormOpen(false)}
          prefillEmployeeId={prefillEmployee}
          prefillDate={prefillDate}
          onSuccess={() => {
            setIsFormOpen(false)
            onActionSuccess?.()
            otRefetch?.()
          }}
        />
      </Modal>
    </View>
  )
}

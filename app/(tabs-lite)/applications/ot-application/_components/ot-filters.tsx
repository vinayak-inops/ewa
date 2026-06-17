import { Filter, RefreshCw, Search } from "lucide-react-native"
import React, { useEffect, useRef, useState } from "react"
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"
import OtFormPopup from "./ot-form-popup"

export type OtTabKey = "all" | "applications" | "pending" | "failed" | "approved" | "cancelled" | "rejected"

const TABS: { key: OtTabKey; label: string }[] = [
  { key: "all",          label: "All"          },
  { key: "applications", label: "Applications" },
  { key: "pending",      label: "Pending"      },
  { key: "failed",       label: "Failed"       },
  { key: "approved",     label: "Approved"     },
  { key: "cancelled",    label: "Cancel"       },
  { key: "rejected",     label: "Reject"       },
]

const SEARCH_FIELDS = [
  { value: "employeeID",     label: "Employee ID"      },
  { value: "attendanceDate", label: "Attendance Date"  },
  { value: "remarks",        label: "Remarks"          },
  { value: "uploadedBy",     label: "Applied By"       },
  { value: "status",         label: "Status"           },
]

interface OtFiltersProps {
  activeTab: OtTabKey
  onTabChange: (tab: OtTabKey) => void
  onApply: (params: { field: string; value: string }) => void
  otRefetch?: () => void
  hideApplicationsTab?: boolean
  hideApplyButton?: boolean
  onActionSuccess?: () => void
}

export default function OtFilters({
  activeTab, onTabChange, onApply, otRefetch,
  hideApplicationsTab = false, hideApplyButton = false, onActionSuccess,
}: OtFiltersProps) {
  const [searchField, setSearchField] = useState("employeeID")
  const [searchValue, setSearchValue] = useState("")
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleTabs = hideApplicationsTab
    ? TABS.filter(t => t.key !== "applications" && t.key !== "all")
    : TABS

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onApply({ field: searchField, value: searchValue.trim() })
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchField, searchValue])

  return (
    <View style={{ gap: 8, marginBottom: 12 }}>
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

      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <TouchableOpacity
          onPress={() => setShowFieldPicker(v => !v)}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8 }}
        >
          <Filter size={13} color="#6b7280" />
          <Text style={{ fontSize: 12, color: "#374151", fontWeight: "500" }}>
            {SEARCH_FIELDS.find(f => f.value === searchField)?.label ?? "Field"}
          </Text>
        </TouchableOpacity>

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

        {otRefetch && (
          <TouchableOpacity
            onPress={() => { onApply({ field: searchField, value: searchValue.trim() }); otRefetch() }}
            style={{ width: 36, height: 36, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, alignItems: "center", justifyContent: "center" }}
          >
            <RefreshCw size={14} color="#6b7280" />
          </TouchableOpacity>
        )}

        {!hideApplyButton && (
          <TouchableOpacity
            onPress={() => { onApply({ field: searchField, value: searchValue.trim() }); setIsFormOpen(true) }}
            style={{ height: 36, paddingHorizontal: 14, backgroundColor: "#2563eb", borderRadius: 8, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontSize: 12, color: "#fff", fontWeight: "600" }}>Apply</Text>
          </TouchableOpacity>
        )}
      </View>

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

      <Modal visible={isFormOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsFormOpen(false)}>
        <OtFormPopup
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => { setIsFormOpen(false); onActionSuccess?.(); otRefetch?.() }}
        />
      </Modal>
    </View>
  )
}

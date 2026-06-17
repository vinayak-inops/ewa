import { Filter, RefreshCw, Search } from "lucide-react-native"
import React, { useEffect, useRef, useState } from "react"
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"
import CompoffFormPopup from "./compoff-form-popup"

export type CompoffTabKey = "all" | "pending" | "failed" | "approved" | "rejected" | "cancelled"

const TABS: { key: CompoffTabKey; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "pending",   label: "Pending"   },
  { key: "failed",    label: "Failed"    },
  { key: "approved",  label: "Approved"  },
  { key: "rejected",  label: "Rejected"  },
  { key: "cancelled", label: "Cancelled" },
]

const SEARCH_FIELDS = [
  { value: "employeeID",    label: "Employee ID"   },
  { value: "fromDate",      label: "From Date"     },
  { value: "toDate",        label: "To Date"       },
  { value: "remarks",       label: "Remarks"       },
  { value: "workflowState", label: "Status"        },
]

interface CompoffFiltersProps {
  activeTab: CompoffTabKey
  onTabChange: (tab: CompoffTabKey) => void
  onApply: (params: { field: string; value: string }) => void
  otRefetch?: () => void
  hideApplicationsTab?: boolean
  hideApplyButton?: boolean
  onActionSuccess?: () => void
}

export default function CompoffFilters({
  activeTab, onTabChange, onApply, otRefetch,
  hideApplicationsTab = false, hideApplyButton = false, onActionSuccess,
}: CompoffFiltersProps) {
  const [searchField, setSearchField] = useState("employeeID")
  const [searchValue, setSearchValue] = useState("")
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleTabs = hideApplicationsTab ? TABS.filter(t => t.key !== "all") : TABS

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
                style={{ paddingHorizontal: 12, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, backgroundColor: active ? "#0d9488" : "#fff", borderColor: active ? "#0d9488" : "#e5e7eb" }}
              >
                <Text style={{ fontSize: 12, fontWeight: "500", color: active ? "#fff" : "#4b5563" }}>{tab.label}</Text>
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
            value={searchValue} onChangeText={setSearchValue}
            placeholder={`Search by ${SEARCH_FIELDS.find(f => f.value === searchField)?.label.toLowerCase()}...`}
            placeholderTextColor="#9ca3af" returnKeyType="search"
            style={{ flex: 1, fontSize: 13, color: "#111827" }}
          />
          {searchValue.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchValue(""); onApply({ field: searchField, value: "" }) }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 12, color: "#9ca3af" }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {otRefetch && (
          <TouchableOpacity onPress={() => { onApply({ field: searchField, value: searchValue.trim() }); otRefetch() }} style={{ width: 36, height: 36, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, alignItems: "center", justifyContent: "center" }}>
            <RefreshCw size={14} color="#6b7280" />
          </TouchableOpacity>
        )}

        {!hideApplyButton && (
          <TouchableOpacity
            onPress={() => { onApply({ field: searchField, value: searchValue.trim() }); setIsFormOpen(true) }}
            style={{ height: 36, paddingHorizontal: 14, backgroundColor: "#0d9488", borderRadius: 8, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontSize: 12, color: "#fff", fontWeight: "600" }}>New Request</Text>
          </TouchableOpacity>
        )}
      </View>

      {showFieldPicker && (
        <View style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          {SEARCH_FIELDS.map(f => (
            <TouchableOpacity key={f.value} onPress={() => { setSearchField(f.value); setShowFieldPicker(false) }}
              style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f9fafb", backgroundColor: searchField === f.value ? "#f0fdfa" : "#fff" }}>
              <Text style={{ fontSize: 13, color: searchField === f.value ? "#0d9488" : "#374151", fontWeight: searchField === f.value ? "600" : "400" }}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Modal visible={isFormOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsFormOpen(false)}>
        <CompoffFormPopup
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => { setIsFormOpen(false); onActionSuccess?.(); otRefetch?.() }}
        />
      </Modal>
    </View>
  )
}

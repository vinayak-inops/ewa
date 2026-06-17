import React, { useEffect, useMemo, useRef, useState } from "react"
import { Pressable, Text, TextInput, View } from "react-native"
import EncashmentFormPopup from "./encashment-form-popup"

export type EncashmentTabKey = "all" | "pending" | "failed" | "approved" | "rejected" | "cancelled"

const TABS: { key: EncashmentTabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
  { key: "approved", label: "Approval" },
  { key: "rejected", label: "Reject" },
  { key: "cancelled", label: "Cancel" },
]

const SEARCH_FIELDS = [
  { value: "employeeID", label: "Employee ID" },
  { value: "leaveCode", label: "Leave Code" },
  { value: "appliedDate", label: "Applied Date" },
  { value: "remarks", label: "Remarks" },
  { value: "uploadedBy", label: "Applied By" },
]

interface Props {
  activeTab: EncashmentTabKey
  onTabChange: (tab: EncashmentTabKey) => void
  onApply: (opts: { field: string; value: string }) => void
  otRefetch: () => void
  hideApplicationsTab?: boolean
  hideApplyButton?: boolean
  onActionSuccess?: () => void
}

export default function EncashmentFilters({ activeTab, onTabChange, onApply, otRefetch, hideApplicationsTab = false, hideApplyButton = false, onActionSuccess }: Props) {
  const [field, setField] = useState("employeeID")
  const [value, setValue] = useState("")
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleTabs = useMemo(() =>
    hideApplicationsTab ? TABS.filter(t => t.key !== "all") : TABS,
    [hideApplicationsTab]
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { onApply({ field, value: value.trim() }) }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [field, value])

  const fieldLabel = useMemo(() => SEARCH_FIELDS.find(f => f.value === field)?.label || "Field", [field])

  return (
    <View>
      {/* Tabs */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {visibleTabs.map(t => {
          const active = activeTab === t.key
          return (
            <Pressable
              key={t.key}
              onPress={() => onTabChange(t.key)}
              style={{
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                backgroundColor: active ? "#059669" : "#f1f5f9",
                borderWidth: 1, borderColor: active ? "#059669" : "#e2e8f0",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#fff" : "#64748b" }}>{t.label}</Text>
            </Pressable>
          )
        })}
      </View>

      {/* Search + Apply */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          onPress={() => setShowFieldPicker(v => !v)}
          style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 4 }}
        >
          <Text style={{ fontSize: 12, color: "#374151", fontWeight: "500" }}>{fieldLabel}</Text>
          <Text style={{ fontSize: 10, color: "#9ca3af" }}>▼</Text>
        </Pressable>

        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={`Search by ${fieldLabel.toLowerCase()}...`}
          placeholderTextColor="#9ca3af"
          style={{ flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: "#111827" }}
        />

        {!hideApplyButton && (
          <Pressable
            onPress={() => setIsPopupOpen(true)}
            style={{ backgroundColor: "#059669", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>Apply</Text>
          </Pressable>
        )}
      </View>

      {/* Field picker dropdown */}
      {showFieldPicker && (
        <View style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, marginTop: 4, overflow: "hidden", zIndex: 10 }}>
          {SEARCH_FIELDS.map(f => (
            <Pressable
              key={f.value}
              onPress={() => { setField(f.value); setShowFieldPicker(false) }}
              style={({ pressed }) => [
                { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
                pressed && { backgroundColor: "#f0fdf4" },
                field === f.value && { backgroundColor: "#f0fdf4" },
              ]}
            >
              <Text style={{ fontSize: 13, color: field === f.value ? "#059669" : "#374151", fontWeight: field === f.value ? "600" : "400" }}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <EncashmentFormPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        onSubmit={() => { otRefetch(); onActionSuccess?.(); setIsPopupOpen(false) }}
      />
    </View>
  )
}

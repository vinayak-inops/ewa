import React, { useState, useMemo, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, Pressable } from "react-native"
import { Search, Filter, ChevronDown } from "lucide-react-native"

type TabKey = "all" | "pending" | "approved" | "rejected" | "cancelled" | "failed"
export type LeaveCategoryKey = "all" | "time-away" | "leave-of-absence"

interface ApplicationFiltersProps {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  onApply: (opts: { field: string; value: string }) => void
  otRefetch: () => void
  isSelfPermission?: boolean
  isAllPermission?: boolean
  hideApplicationsTab?: boolean
  hideApplyButton?: boolean
  leaveCategory?: LeaveCategoryKey
  onLeaveCategoryChange?: (category: LeaveCategoryKey) => void
}

const LEAVE_CATEGORIES: { key: LeaveCategoryKey; label: string }[] = [
  { key: "all",              label: "All Types"        },
  { key: "time-away",        label: "Time Away"        },
  { key: "leave-of-absence", label: "Leave of Absence" },
]

const TABS: { key: TabKey; label: string }[] = [
  { key: "all",       label: "All"      },
  { key: "pending",   label: "Pending"  },
  { key: "failed",    label: "Failed"   },
  { key: "approved",  label: "Approved" },
  { key: "rejected",  label: "Reject"   },
  { key: "cancelled", label: "Cancel"   },
]

const SEARCH_FIELDS: { value: string; label: string }[] = [
  { value: "employeeID",    label: "Employee ID"    },
  { value: "attendanceDate",label: "Attendance Date"},
  { value: "remarks",       label: "Remarks"        },
  { value: "uploadedBy",    label: "Applied By"     },
  { value: "status",        label: "Status"         },
]

export default function ApplicationFilters({
  activeTab,
  onTabChange,
  onApply,
  otRefetch,
  isSelfPermission = false,
  isAllPermission = false,
  hideApplicationsTab = false,
  hideApplyButton = false,
  leaveCategory = "all",
  onLeaveCategoryChange,
}: ApplicationFiltersProps) {
  const [field, setField] = useState<string>("employeeID")
  const [value, setValue] = useState<string>("")
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleTabs = useMemo(() => {
    let tabs = TABS
    if (hideApplicationsTab) {
      tabs = tabs.filter(tab => tab.key !== 'all')
    }
    if (isSelfPermission || isAllPermission || hideApplicationsTab) {
      return tabs
    }
    return []
  }, [isSelfPermission, isAllPermission, hideApplicationsTab])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onApply({ field, value: value.trim() })
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [field, value, onApply])

  const activeFieldLabel = SEARCH_FIELDS.find(f => f.value === field)?.label ?? 'Employee ID'

  return (
    <View className="w-full py-2">
      <View className="flex-row items-center justify-between gap-2">

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexShrink: 1 }}
        >
          <View className="flex-row bg-gray-50 rounded-xl">
          {visibleTabs.map((t, index) => {
            const isActive = activeTab === t.key
            const isFirst = index === 0
            const isLast = index === visibleTabs.length - 1
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => onTabChange(t.key)}
                className={`h-10 px-4 items-center justify-center border-b-2 ${
                  isActive ? 'bg-blue-100 border-blue-400' : 'border-transparent'
                } ${isFirst ? 'rounded-l-xl' : ''} ${isLast ? 'rounded-r-xl' : ''}`}
              >
                <Text
                  className={`text-sm font-medium ${isActive ? 'text-blue-800' : 'text-gray-600'}`}
                  numberOfLines={1}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            )
          })}
          </View>
        </ScrollView>

        {/* Search area */}
        <View className="flex-row h-10">
          {/* Field selector */}
          <TouchableOpacity
            onPress={() => setShowFieldPicker(true)}
            className="flex-row items-center bg-white border border-gray-200 rounded-l-xl px-3 h-10"
            style={{ width: 130 }}
          >
            <Filter size={14} color="#6b7280" />
            <Text className="flex-1 text-sm font-medium text-gray-900 mx-1.5" numberOfLines={1}>
              {activeFieldLabel}
            </Text>
            <ChevronDown size={13} color="#6b7280" />
          </TouchableOpacity>

          {/* Search input */}
          <View className="flex-row items-center bg-white border-t border-r border-b border-gray-200 rounded-r-xl px-3 h-10" style={{ width: 160 }}>
            <Search size={14} color="#9ca3af" />
            <TextInput
              placeholder={`Search ${activeFieldLabel.toLowerCase()}...`}
              placeholderTextColor="#9ca3af"
              value={value}
              onChangeText={setValue}
              className="flex-1 text-sm text-gray-900 ml-2"
              style={{ height: 40 }}
              returnKeyType="search"
            />
          </View>
        </View>
      </View>

      {/* Leave category chips */}
      {onLeaveCategoryChange && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: "#94a3b8", letterSpacing: 0.4 }}>Type:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, flexDirection: "row" }}>
            {LEAVE_CATEGORIES.map(cat => {
              const active = leaveCategory === cat.key
              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => onLeaveCategoryChange(cat.key)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                    borderWidth: 1,
                    backgroundColor: active ? "#2563eb" : "#fff",
                    borderColor: active ? "#2563eb" : "#d1d5db",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: active ? "#fff" : "#374151" }}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      )}

      {/* Field picker modal */}
      <Modal visible={showFieldPicker} transparent animationType="fade" onRequestClose={() => setShowFieldPicker(false)}>
        <Pressable
          className="flex-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
          onPress={() => setShowFieldPicker(false)}
        >
          <View
            className="absolute bg-white rounded-xl border border-gray-200 overflow-hidden"
            style={{ right: 16, top: 56, minWidth: 160, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
          >
            {SEARCH_FIELDS.map((f, i) => (
              <TouchableOpacity
                key={f.value}
                onPress={() => { setField(f.value); setShowFieldPicker(false) }}
                className={`px-4 py-3 ${field === f.value ? 'bg-blue-50' : 'bg-white'} ${i < SEARCH_FIELDS.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <Text className={`text-sm ${field === f.value ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

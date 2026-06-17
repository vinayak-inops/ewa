import { Filter, RefreshCw, Search } from "lucide-react-native"
import React, { useState } from "react"
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"

export type TabKey = "all" | "pending" | "approved" | "rejected" | "cancelled" | "failed"

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "cancelled", label: "Cancelled" },
  { key: "failed", label: "Failed" },
]

const SEARCH_FIELDS = [
  { value: "employeeID", label: "Employee ID" },
  { value: "attendanceDate", label: "Att. Date" },
  { value: "newAttendanceDate", label: "New Att. Date" },
  { value: "remarks", label: "Remarks" },
]

interface ApplicationFiltersProps {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  onApply: (params: { field: string; value: string }) => void
  otRefetch?: () => void
  hideAllTab?: boolean
  hideApplyButton?: boolean
}

export default function ApplicationFilters({
  activeTab,
  onTabChange,
  onApply,
  otRefetch,
  hideAllTab = false,
  hideApplyButton = false,
}: ApplicationFiltersProps) {
  const [searchField, setSearchField] = useState("employeeID")
  const [searchValue, setSearchValue] = useState("")
  const [showFieldPicker, setShowFieldPicker] = useState(false)

  const visibleTabs = hideAllTab ? TABS.filter(t => t.key !== "all") : TABS

  const handleApply = () => {
    onApply({ field: searchField, value: searchValue })
    otRefetch?.()
  }

  const handleClear = () => {
    setSearchValue("")
    onApply({ field: searchField, value: "" })
    otRefetch?.()
  }

  return (
    <View className="gap-2 mb-3">
      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
        <View className="flex-row gap-1.5 py-1">
          {visibleTabs.map(tab => {
            const isActive = activeTab === tab.key
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => onTabChange(tab.key)}
                className={`px-3 h-8 rounded-full items-center justify-center border ${
                  isActive ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                }`}
              >
                <Text className={`text-xs font-medium ${isActive ? "text-white" : "text-gray-600"}`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      {/* Search row */}
      <View className="flex-row gap-2 items-center">
        {/* Field picker trigger */}
        <TouchableOpacity
          onPress={() => setShowFieldPicker(v => !v)}
          className="flex-row items-center gap-1.5 h-9 px-3 bg-white border border-gray-200 rounded-lg"
        >
          <Filter size={13} color="#6b7280" />
          <Text className="text-xs text-gray-700 font-medium">
            {SEARCH_FIELDS.find(f => f.value === searchField)?.label ?? "Field"}
          </Text>
        </TouchableOpacity>

        {/* Search input */}
        <View className="flex-1 flex-row items-center h-9 bg-white border border-gray-200 rounded-lg px-3 gap-2">
          <Search size={13} color="#9ca3af" />
          <TextInput
            value={searchValue}
            onChangeText={setSearchValue}
            onSubmitEditing={handleApply}
            placeholder="Search..."
            placeholderTextColor="#9ca3af"
            returnKeyType="search"
            className="flex-1 text-sm text-gray-800"
          />
          {searchValue.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text className="text-xs text-gray-400">✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Refresh */}
        {otRefetch && (
          <TouchableOpacity
            onPress={() => { onApply({ field: searchField, value: searchValue }); otRefetch() }}
            className="w-9 h-9 bg-white border border-gray-200 rounded-lg items-center justify-center"
          >
            <RefreshCw size={14} color="#6b7280" />
          </TouchableOpacity>
        )}

        {/* Apply */}
        {!hideApplyButton && (
          <TouchableOpacity
            onPress={handleApply}
            className="h-9 px-3 bg-blue-600 rounded-lg items-center justify-center"
          >
            <Text className="text-xs text-white font-semibold">Apply</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Field picker dropdown */}
      {showFieldPicker && (
        <View className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {SEARCH_FIELDS.map(f => (
            <TouchableOpacity
              key={f.value}
              onPress={() => { setSearchField(f.value); setShowFieldPicker(false) }}
              className={`px-4 py-2.5 border-b border-gray-50 ${searchField === f.value ? "bg-blue-50" : ""}`}
            >
              <Text className={`text-sm ${searchField === f.value ? "text-blue-700 font-semibold" : "text-gray-700"}`}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

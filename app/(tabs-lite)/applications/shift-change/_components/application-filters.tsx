import React, { useState, useRef, useEffect, useMemo } from "react"
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, Pressable } from "react-native"
import { Search, ChevronDown, Check, X } from "lucide-react-native"

type TabKey = "all" | "pending" | "approved" | "rejected" | "cancelled" | "failed"

interface ApplicationFiltersProps {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  onApply: (opts: { field: string; value: string }) => void
  otRefetch?: () => void
  isSelfPermission?: boolean
  isAllPermission?: boolean
  refreshAll?: () => void
  hideApplicationsTab?: boolean
  hideApplyButton?: boolean
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "pending",   label: "Pending"   },
  { key: "failed",    label: "Failed"    },
  { key: "approved",  label: "Approved"  },
  { key: "rejected",  label: "Rejected"  },
  { key: "cancelled", label: "Cancelled" },
]

const SEARCH_FIELDS: { value: string; label: string; icon: string }[] = [
  { value: "employeeID", label: "Employee ID", icon: "👤" },
  { value: "shiftName",  label: "Shift Name",  icon: "📅" },
  { value: "remarks",    label: "Remarks",     icon: "💬" },
  { value: "status",     label: "Status",      icon: "🔖" },
]

export default function ApplicationFilters({
  activeTab,
  onTabChange,
  onApply,
  isSelfPermission = false,
  isAllPermission = false,
  hideApplicationsTab = false,
}: ApplicationFiltersProps) {
  const [field, setField] = useState<string>("employeeID")
  const [value, setValue] = useState<string>("")
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleTabs = useMemo(() => {
    let tabs = TABS
    if (hideApplicationsTab) tabs = tabs.filter(t => t.key !== "all")
    if (isSelfPermission || isAllPermission || hideApplicationsTab) return tabs
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

  const activeField = SEARCH_FIELDS.find(f => f.value === field) ?? SEARCH_FIELDS[0]!

  return (
    <View style={{ gap: 10 }}>
      {/* Tabs row */}
      {visibleTabs.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          {visibleTabs.map(({ key, label }) => {
            const isActive = activeTab === key
            return (
              <TouchableOpacity
                key={key}
                onPress={() => onTabChange(key)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: isActive ? '#0a1c63' : '#f1f5f9',
                  borderWidth: 1,
                  borderColor: isActive ? '#0a1c63' : '#e2e8f0',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? '#fff' : '#64748b' }}>
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      {/* ── Search bar ── */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: isFocused ? '#6366f1' : '#e5e7eb',
        shadowColor: isFocused ? '#6366f1' : '#000',
        shadowOpacity: isFocused ? 0.08 : 0.04,
        shadowRadius: isFocused ? 6 : 3,
        shadowOffset: { width: 0, height: 2 },
        elevation: isFocused ? 3 : 1,
        overflow: 'hidden',
        height: 44,
      }}>
        {/* Field dropdown button */}
        <TouchableOpacity
          onPress={() => setShowFieldPicker(true)}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row', alignItems: 'center',
            paddingLeft: 10, paddingRight: 8,
            height: '100%',
            borderRightWidth: 1,
            borderRightColor: isFocused ? '#c7d2fe' : '#f3f4f6',
            gap: 4,
            width: 100,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', flex: 1 }} numberOfLines={1}>
            {activeField.label}
          </Text>
          <ChevronDown size={12} color="#9ca3af" />
        </TouchableOpacity>

        {/* Search icon */}
        <View style={{ paddingLeft: 12 }}>
          <Search size={14} color={isFocused ? '#6366f1' : '#9ca3af'} />
        </View>

        {/* Text input */}
        <TextInput
          placeholder={`Search ${activeField.label.toLowerCase()}...`}
          placeholderTextColor="#d1d5db"
          value={value}
          onChangeText={setValue}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{ flex: 1, fontSize: 13, color: '#111827', paddingHorizontal: 8, height: '100%' }}
          returnKeyType="search"
        />

        {/* Clear button */}
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => setValue('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ paddingRight: 12 }}
          >
            <View style={{
              width: 18, height: 18, borderRadius: 9,
              backgroundColor: '#e5e7eb',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={10} color="#6b7280" />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Field picker modal ── */}
      <Modal
        visible={showFieldPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFieldPicker(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.3)' }}
          onPress={() => setShowFieldPicker(false)}
        >
          <View style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            backgroundColor: '#fff',
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            paddingBottom: 32,
            shadowColor: '#000', shadowOpacity: 0.15,
            shadowRadius: 20, shadowOffset: { width: 0, height: -4 },
            elevation: 12,
          }}>
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' }} />
            </View>

            {/* Header */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 20, paddingVertical: 14,
              borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
            }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>Search by</Text>
              <TouchableOpacity onPress={() => setShowFieldPicker(false)}>
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: '#f1f5f9',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <X size={14} color="#64748b" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Options */}
            <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 4 }}>
              {SEARCH_FIELDS.map((f) => {
                const isSelected = field === f.value
                return (
                  <TouchableOpacity
                    key={f.value}
                    onPress={() => { setField(f.value); setShowFieldPicker(false) }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingHorizontal: 14, paddingVertical: 13,
                      borderRadius: 12,
                      backgroundColor: isSelected ? '#eef2ff' : '#fafafa',
                      borderWidth: 1,
                      borderColor: isSelected ? '#c7d2fe' : '#f1f5f9',
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{f.icon}</Text>
                    <Text style={{
                      flex: 1, fontSize: 14,
                      fontWeight: isSelected ? '700' : '500',
                      color: isSelected ? '#4338ca' : '#374151',
                    }}>
                      {f.label}
                    </Text>
                    {isSelected && (
                      <View style={{
                        width: 22, height: 22, borderRadius: 11,
                        backgroundColor: '#4338ca',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

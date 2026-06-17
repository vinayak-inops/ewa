import { useRouter } from "expo-router"
import { Check, ChevronDown, ChevronLeft, ChevronRight, FileText, Search, X } from "lucide-react-native"
import React, { useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"

const SEARCH_FIELDS = [
  { value: "employeeID",    label: "Employee ID", icon: "👤" },
  { value: "fromDate",      label: "From Date",   icon: "📅" },
  { value: "toDate",        label: "To Date",     icon: "📅" },
  { value: "remarks",       label: "Remarks",     icon: "💬" },
  { value: "workflowState", label: "Status",      icon: "🔖" },
]

export type CompoffTabKey = "all" | "pending" | "failed" | "approved" | "rejected" | "cancelled"

export interface CompoffRecord {
  _id: string
  employeeID: string
  fromDate: string
  toDate: string
  fromDuration: string
  toDuration: string
  availForDates?: string[]
  workflowState: string
  remarks?: string
  createdOn: string
  uploadedBy?: string
}

interface ExternalPagination {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  startIndex: number
  endIndex: number
  onPageChange: (page: number) => void
}

interface Props {
  data: CompoffRecord[]
  onOpenDetails: (row: CompoffRecord) => void
  loading?: boolean
  externalPagination?: ExternalPagination
  onNew?: () => void
  title?: string
  subtitle?: string
  activeTab: CompoffTabKey
  onTabChange: (tab: CompoffTabKey) => void
}

const TABS: { key: CompoffTabKey; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "pending",   label: "Pending"   },
  { key: "approved",  label: "Approved"  },
  { key: "rejected",  label: "Rejected"  },
  { key: "cancelled", label: "Cancelled" },
  { key: "failed",    label: "Failed"    },
]

const TAB_DESC: Record<CompoffTabKey, string> = {
  all:       "Showing all compensatory off applications.",
  pending:   "Applications awaiting approval.",
  approved:  "Applications that have been approved.",
  rejected:  "Applications that have been rejected.",
  cancelled: "Applications that have been cancelled or withdrawn.",
  failed:    "Applications that failed during processing.",
}

const fmtDate = (v?: string) => {
  if (!v) return "-"
  try { return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) } catch { return v }
}

const statusStyle = (s: string) => {
  const u = (s || "").toUpperCase()
  if (u === "APPROVED")                    return { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" }
  if (u === "REJECTED")                    return { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" }
  if (u === "CANCELLED" || u === "CANCEL") return { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" }
  if (u === "FAILED")                      return { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" }
  return { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" }
}

export default function CompoffTable({
  data,
  onOpenDetails,
  loading = false,
  externalPagination,
  onNew,
  title = "Comp Off Applications",
  subtitle,
  activeTab,
  onTabChange,
}: Props) {
  const router = useRouter()
  const [internalPage, setInternalPage] = useState(1)
  const [searchValue, setSearchValue] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchField, setSearchField] = useState("employeeID")
  const [showFieldPicker, setShowFieldPicker] = useState(false)

  const activeField = SEARCH_FIELDS.find(f => f.value === searchField) ?? SEARCH_FIELDS[0]!

  const pg = externalPagination ?? {
    currentPage: internalPage,
    totalPages: Math.ceil(data.length / 10),
    totalItems: data.length,
    itemsPerPage: 10,
    startIndex: (internalPage - 1) * 10,
    endIndex: Math.min(internalPage * 10, data.length),
    onPageChange: setInternalPage,
  }

  const filtered = searchValue.trim()
    ? data.filter(row => {
        const val = (row as any)[searchField]
        return String(val ?? "").toLowerCase().includes(searchValue.toLowerCase())
      })
    : data

  const currentData = externalPagination ? filtered : filtered.slice(pg.startIndex, pg.endIndex)
  const totalItems = pg.totalItems

  return (
    <View style={{ width: "100%", overflow: "hidden" }}>

      {/* ── Field picker bottom sheet ── */}
      <Modal visible={showFieldPicker} transparent animationType="fade" onRequestClose={() => setShowFieldPicker(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setShowFieldPicker(false)}>
          <Pressable
            onPress={() => {}}
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 }}
          >
            <View style={{ width: 36, height: 4, backgroundColor: "#e5e7eb", borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 16 }} />
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151", paddingHorizontal: 16, marginBottom: 8 }}>Search by field</Text>
            {SEARCH_FIELDS.map(f => {
              const selected = f.value === searchField
              return (
                <TouchableOpacity
                  key={f.value}
                  onPress={() => { setSearchField(f.value); setSearchValue(""); setShowFieldPicker(false) }}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: selected ? "#eef2ff" : "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 18 }}>{f.icon}</Text>
                    <Text style={{ fontSize: 13, fontWeight: "500", color: selected ? "#4338ca" : "#374151" }}>{f.label}</Text>
                  </View>
                  {selected && (
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#4338ca", alignItems: "center", justifyContent: "center" }}>
                      <Check size={11} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Navy header ── */}
      <View style={{ backgroundColor: "#0a1c63", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => router.push("/(tabs-lite)/applications" as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}
          >
            <ChevronLeft size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>{title}</Text>
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }}>
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
              {totalItems} {totalItems !== 1 ? "records" : "record"}
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {TABS.map(({ key, label }) => {
            const active = activeTab === key
            return (
              <Pressable
                key={key}
                onPress={() => { onTabChange(key); setInternalPage(1) }}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: active ? "#f8fafc" : "rgba(255,255,255,0.1)" }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "#0a1c63" : "rgba(255,255,255,0.7)" }}>
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      {/* ── Content sheet ── */}
      <View style={{ backgroundColor: "#f8fafc" }}>

        {/* Summary card */}
        <View style={{ marginHorizontal: 12, marginTop: 12, marginBottom: 8, backgroundColor: "#eef2ff", borderWidth: 1, borderColor: "#c7d2fe", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#1e1b4b" }}>
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Applications
          </Text>
          <Text style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{subtitle ?? TAB_DESC[activeTab]}</Text>
        </View>

        {/* Search + New button */}
        <View style={{ marginHorizontal: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", height: 44, backgroundColor: "#fff", borderRadius: 10, borderWidth: 1.5, borderColor: searchFocused ? "#6366f1" : "#e5e7eb", overflow: "hidden" }}>
            <TouchableOpacity
              onPress={() => setShowFieldPicker(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, width: 100, height: "100%", paddingHorizontal: 10, borderRightWidth: 1.5, borderRightColor: searchFocused ? "#6366f1" : "#e5e7eb" }}
            >
              <Text style={{ flex: 1, fontSize: 12, fontWeight: "600", color: "#374151" }} numberOfLines={1}>{activeField.label}</Text>
              <ChevronDown size={12} color="#9ca3af" />
            </TouchableOpacity>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 6 }}>
              <Search size={14} color={searchFocused ? "#6366f1" : "#9ca3af"} />
              <TextInput
                placeholder={`Search ${activeField.label.toLowerCase()}...`}
                placeholderTextColor="#d1d5db"
                value={searchValue}
                onChangeText={setSearchValue}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{ flex: 1, fontSize: 13, color: "#111827" }}
              />
              {searchValue.length > 0 && (
                <TouchableOpacity onPress={() => setSearchValue("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#e5e7eb", alignItems: "center", justifyContent: "center" }}>
                    <X size={9} color="#6b7280" />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {onNew && (
            <TouchableOpacity
              onPress={onNew}
              activeOpacity={0.8}
              style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#0a1c63", borderRadius: 10 }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>+ New</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Card list panel */}
        <View style={{ marginHorizontal: 12, marginBottom: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ fontSize: 10, letterSpacing: 0.8, color: "#94a3b8", fontWeight: "700" }}>APPLICATIONS</Text>
            <Text style={{ fontSize: 12, color: "#64748b" }}>{totalItems} total</Text>
          </View>

          {loading ? (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 10 }}>
              <ActivityIndicator size="large" color="#0a1c63" />
              <Text style={{ fontSize: 13, color: "#6b7280" }}>Loading records...</Text>
            </View>
          ) : currentData.length === 0 ? (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 48 }}>
              <View style={{ width: 48, height: 48, backgroundColor: "#f3f4f6", borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <FileText size={22} color="#9ca3af" />
              </View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 4 }}>No Applications</Text>
              <Text style={{ fontSize: 12, color: "#9ca3af" }}>No records found for the selected filter.</Text>
            </View>
          ) : (
            currentData.map((row, idx) => {
              const st = statusStyle(row.workflowState)
              const isLast = idx === currentData.length - 1

              const dateFrom = fmtDate(row.fromDate) + (row.fromDuration ? ` (${row.fromDuration})` : "")
              const dateTo = fmtDate(row.toDate) + (row.toDuration ? ` (${row.toDuration})` : "")
              const dateRange = dateFrom + (row.toDate && row.toDate !== row.fromDate ? `  →  ${dateTo}` : "")

              return (
                <React.Fragment key={row._id || idx}>
                  <Pressable
                    onPress={() => onOpenDetails(row)}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 }}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FileText size={15} color="#334155" />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#0f172a" }} numberOfLines={1}>{row.employeeID}</Text>
                      <Text style={{ fontSize: 12, color: "#64748b" }} numberOfLines={1}>{dateRange}</Text>
                      {row.remarks ? <Text style={{ fontSize: 11, color: "#94a3b8" }} numberOfLines={1}>{row.remarks}</Text> : null}
                    </View>
                    <View style={{ alignItems: "flex-end", flexShrink: 0, gap: 4 }}>
                      <View style={{ borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: st.bg, borderColor: st.border }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: st.text }}>{(row.workflowState || "PENDING").toUpperCase()}</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(row.createdOn)}</Text>
                    </View>
                  </Pressable>
                  {!isLast && <View style={{ height: 1, backgroundColor: "#f1f5f9", marginVertical: 2 }} />}
                </React.Fragment>
              )
            })
          )}

          {!loading && pg.totalPages > 1 && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: "#f1f5f9" }}>
              <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: "500" }}>
                {pg.startIndex + 1}–{Math.min(pg.endIndex, pg.totalItems)} of {pg.totalItems}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <TouchableOpacity
                  onPress={() => pg.onPageChange(Math.max(1, pg.currentPage - 1))}
                  disabled={pg.currentPage === 1}
                  style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: pg.currentPage === 1 ? "#f1f5f9" : "#e2e8f0", backgroundColor: pg.currentPage === 1 ? "#f9fafb" : "#fff", alignItems: "center", justifyContent: "center" }}
                >
                  <ChevronLeft size={13} color={pg.currentPage === 1 ? "#d1d5db" : "#374151"} />
                </TouchableOpacity>

                {Array.from({ length: pg.totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === pg.totalPages || (p >= pg.currentPage - 1 && p <= pg.currentPage + 1))
                  .map((p, i, arr) => (
                    <React.Fragment key={p}>
                      {i > 0 && p - arr[i - 1]! > 1 && (
                        <Text style={{ fontSize: 11, color: "#cbd5e1", paddingHorizontal: 2 }}>…</Text>
                      )}
                      <TouchableOpacity
                        onPress={() => pg.onPageChange(p)}
                        style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: p === pg.currentPage ? "#0a1c63" : "#e2e8f0", backgroundColor: p === pg.currentPage ? "#0a1c63" : "#fff", alignItems: "center", justifyContent: "center" }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "700", color: p === pg.currentPage ? "#fff" : "#374151" }}>{p}</Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}

                <TouchableOpacity
                  onPress={() => pg.onPageChange(Math.min(pg.totalPages, pg.currentPage + 1))}
                  disabled={pg.currentPage === pg.totalPages}
                  style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: pg.currentPage === pg.totalPages ? "#f1f5f9" : "#e2e8f0", backgroundColor: pg.currentPage === pg.totalPages ? "#f9fafb" : "#fff", alignItems: "center", justifyContent: "center" }}
                >
                  <ChevronRight size={13} color={pg.currentPage === pg.totalPages ? "#d1d5db" : "#374151"} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

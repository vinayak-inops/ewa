import { useRouter } from "expo-router"
import { Briefcase, ChevronLeft, ChevronRight, FileText } from "lucide-react-native"
import React, { useState } from "react"
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export type OutDutyTabKey = "all" | "pending" | "approved" | "rejected" | "cancelled" | "failed"

export interface OutDutyRecord {
  _id: string
  employeeID: string
  employeeName?: string
  fromDate: string
  fromDuration: string
  toDate: string
  toDuration: string
  Reason: string
  OutDutyAddress: string
  workflowState: string
  status: string
  uploadedBy: string
  createdOn: string
  remarks: string
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
  data: OutDutyRecord[]
  onOpenDetails: (row: OutDutyRecord) => void
  loading?: boolean
  externalPagination?: ExternalPagination
  activeTab: OutDutyTabKey
  onTabChange: (tab: OutDutyTabKey) => void
  onNew?: () => void
  title?: string
  hideSearchBar?: boolean
  headerSlot?: React.ReactNode
  onRefresh?: () => void
  isRefreshing?: boolean
}

const TABS: { key: OutDutyTabKey; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "pending",   label: "Pending"   },
  { key: "approved",  label: "Approved"  },
  { key: "rejected",  label: "Rejected"  },
  { key: "cancelled", label: "Cancelled" },
  { key: "failed",    label: "Failed"    },
]

const statusStyle = (s: string) => {
  const u = (s || "").toUpperCase()
  if (u === "APPROVED")                    return { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" }
  if (u === "REJECTED")                    return { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" }
  if (u === "CANCELLED" || u === "CANCEL") return { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" }
  if (u === "FAILED")                      return { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" }
  return { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" }
}

const fmtDate = (v?: string) => {
  if (!v) return "-"
  try { return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) } catch { return v }
}

export default function OutDutyTable({
  data, onOpenDetails, loading = false, externalPagination,
  activeTab, onTabChange, onNew, title = "Out Duty Applications",
  hideSearchBar = false, headerSlot, onRefresh, isRefreshing = false,
}: Props) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [internalPage, setInternalPage] = useState(1)

  const pg = externalPagination ?? {
    currentPage: internalPage,
    totalPages: Math.ceil(data.length / 10),
    totalItems: data.length,
    itemsPerPage: 10,
    startIndex: (internalPage - 1) * 10,
    endIndex: Math.min(internalPage * 10, data.length),
    onPageChange: setInternalPage,
  }

  const currentData = externalPagination ? data : data.slice(pg.startIndex, pg.endIndex)
  const totalItems = pg.totalItems
  const refreshControl = onRefresh
    ? <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
    : undefined

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>

      {/* Header - fixed */}
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <Pressable onPress={() => router.push("/(tabs-lite)/applications" as any)} hitSlop={8} style={s.backBtn}>
          <ChevronLeft size={20} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>{title}</Text>
        <View style={s.recordsBadge}>
          <Text style={s.recordsBadgeText}>{totalItems} {totalItems !== 1 ? "records" : "record"}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={refreshControl}
      >

      {/* Banner */}
      <View style={s.banner}>
        <View style={s.bannerText}>
          <Text style={s.bannerTitle}>On the Move? We Track It.</Text>
          <Text style={s.bannerSub}>Submit & track out duty requests instantly</Text>
          {/* <Pressable style={s.bannerLink}>
            <Text style={s.bannerLinkText}>Learn More →</Text>
          </Pressable> */}
        </View>
        <View style={s.bannerIcon}>
          <Briefcase size={38} color="rgba(255,255,255,0.25)" />
        </View>
      </View>

      {/* Content */}
      <View style={{ backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingTop: 12, paddingBottom: 100 }}>

        {/* headerSlot: New card + search */}
        {headerSlot && (
          <View style={{ gap: 10, marginBottom: 10 }}>
            {headerSlot}
          </View>
        )}

        {/* List title */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4, paddingBottom: 8 }}>
          <Text style={{ fontSize: 10, letterSpacing: 0.8, color: "#94a3b8", fontWeight: "700" }}>APPLICATIONS</Text>
          <Text style={{ fontSize: 12, color: "#64748b" }}>{totalItems} total</Text>
        </View>

        {/* Card with tabs + list */}
        <View style={s.card}>

          {/* Tab strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
            {TABS.map(({ key, label }) => {
              const active = activeTab === key
              return (
                <Pressable
                  key={key}
                  onPress={() => { onTabChange(key); setInternalPage(1) }}
                  style={[s.tab, active && s.tabActive]}
                >
                  <Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text>
                </Pressable>
              )
            })}
          </ScrollView>

          <View style={{ height: 1, backgroundColor: "#f1f5f9" }} />

          {/* Records */}
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            {loading ? (
              <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 8 }}>
                <ActivityIndicator size="large" color="#0a1c63" />
                <Text style={{ fontSize: 13, color: "#64748b" }}>Loading records...</Text>
              </View>
            ) : currentData.length === 0 ? (
              <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 8 }}>
                <View style={{ width: 56, height: 56, backgroundColor: "#f1f5f9", borderRadius: 28, alignItems: "center", justifyContent: "center" }}>
                  <FileText size={28} color="#9ca3af" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151" }}>No Applications</Text>
                <Text style={{ fontSize: 12, color: "#9ca3af" }}>No records found for the selected filter.</Text>
              </View>
            ) : (
              currentData.map((row, idx) => {
                const st = statusStyle(row.status || row.workflowState)
                const isLast = idx === currentData.length - 1
                const dateRange = fmtDate(row.fromDate) + (row.toDate && row.toDate !== row.fromDate ? `  →  ${fmtDate(row.toDate)}` : "")
                const detail = row.Reason || row.OutDutyAddress || ""
                return (
                  <React.Fragment key={row._id || idx}>
                    <Pressable
                      onPress={() => onOpenDetails(row)}
                      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 }}
                    >
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Briefcase size={15} color="#334155" />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ fontSize: 13, fontWeight: "600", color: "#0f172a" }} numberOfLines={1}>
                            {row.employeeID || "Out Duty Request"}
                          </Text>
                          {row.employeeName ? (
                            <Text style={{ fontSize: 12, color: "#475569", fontWeight: "500" }} numberOfLines={1}>· {row.employeeName}</Text>
                          ) : null}
                        </View>
                        <Text style={{ fontSize: 12, color: "#64748b" }} numberOfLines={1}>{dateRange}</Text>
                        {detail ? <Text style={{ fontSize: 11, color: "#94a3b8" }} numberOfLines={1}>{detail}</Text> : null}
                      </View>
                      <View style={{ alignItems: "flex-end", flexShrink: 0, gap: 4 }}>
                        <View style={{ borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: st.bg, borderColor: st.border }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: st.text }}>
                            {(row.status || row.workflowState || "PENDING").toUpperCase()}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(row.createdOn)}</Text>
                      </View>
                    </Pressable>
                    {!isLast && <View style={{ height: 1, backgroundColor: "#f1f5f9", marginVertical: 2 }} />}
                  </React.Fragment>
                )
              })
            )}

            {/* Pagination */}
            {!loading && pg.totalPages > 1 && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, marginTop: 8, borderTopWidth: 1, borderTopColor: "#f1f5f9" }}>
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
                    .filter(p => p === 1 || p === pg.totalPages || Math.abs(p - pg.currentPage) <= 1)
                    .map((p, i, arr) => (
                      <React.Fragment key={p}>
                        {i > 0 && arr[i - 1]! !== p - 1 && <Text style={{ fontSize: 11, color: "#cbd5e1", paddingHorizontal: 2 }}>…</Text>}
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

      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  header: {
    backgroundColor: "#0a1c63",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { flex: 1, color: "#fff", fontSize: 15, fontWeight: "700" },
  recordsBadge: {
    paddingHorizontal: 10, paddingVertical: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  recordsBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  banner: {
    backgroundColor: "#1a3080",
    marginHorizontal: 12, marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 16,
    flexDirection: "row", alignItems: "center",
  },
  bannerText: { flex: 1, gap: 3 },
  bannerTitle: { fontSize: 15, fontWeight: "800", color: "#fff" },
  bannerSub:   { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  bannerLink:  { marginTop: 8, alignSelf: "flex-start" },
  bannerLinkText: { fontSize: 12, fontWeight: "700", color: "#93c5fd" },
  bannerIcon: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
    marginLeft: 12,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  tab: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#0a1c63" },
  tabText: { fontSize: 12, fontWeight: "700", color: "#94a3b8" },
  tabTextActive: { color: "#0a1c63" },
})

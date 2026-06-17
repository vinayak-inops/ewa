import { useRouter } from "expo-router"
import { CheckCircle, ChevronLeft, ChevronRight, Clock, FileText, Plus, Repeat2, XCircle } from "lucide-react-native"
import React, { useCallback, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import ApplicationFilters from "./application-filters"

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'FAILED'

interface Application {
  _id: string
  employeeID: string
  appliedDate?: string
  fromDate: string
  toDate: string
  shiftName?: string
  shiftStart?: string
  shiftEnd?: string
  lunchStart?: string
  lunchEnd?: string
  remarks?: string
  status: string
  workflowState: string
}

interface ApplicationTableProps {
  data: Application[]
  onOpenDetails: (row: Application) => void
  onNew?: () => void
  loading?: boolean
  externalPagination?: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    startIndex: number
    endIndex: number
    onPageChange: (page: number) => void
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TERMINAL = ['APPROVED', 'REJECTED', 'CANCELLED', 'CANCEL', 'FAILED']

function getState(row: Application) {
  return (row.workflowState || row.status || '').toUpperCase()
}

function filterByTab(data: Application[], tab: StatusFilter): Application[] {
  if (tab === 'ALL') return data
  if (tab === 'PENDING') return data.filter(row => !TERMINAL.includes(getState(row)))
  if (tab === 'APPROVED') return data.filter(row => getState(row) === 'APPROVED')
  if (tab === 'FAILED') return data.filter(row => getState(row) === 'FAILED')
  return data
}

const TABS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'FAILED', label: 'Failed' },
]

const TAB_DESC: Record<StatusFilter, string> = {
  ALL: 'Showing all shift change applications.',
  PENDING: 'Applications awaiting approval from the approver.',
  APPROVED: 'Applications that have been approved.',
  FAILED: 'Applications that failed during processing.',
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  try {
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [dd, mm, yyyy] = dateStr.split('-').map(Number)
      return new Date(yyyy, (mm as number) - 1, dd as number)
        .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    }
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// ─── Badge config ─────────────────────────────────────────────────────────────

type BadgeConfig = { bg: string; border: string; text: string; accent: string; label: string; icon: React.ReactNode }

function getBadgeConfig(rawState: string): BadgeConfig {
  const s = (rawState || '').toUpperCase()
  if (s === 'APPROVED') return {
    bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', accent: '#22c55e', label: 'Approved',
    icon: <CheckCircle size={10} color="#15803d" />,
  }
  if (s === 'REJECTED') return {
    bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', accent: '#ef4444', label: 'Rejected',
    icon: <XCircle size={10} color="#b91c1c" />,
  }
  if (s === 'CANCELLED' || s === 'CANCEL') return {
    bg: '#f3f4f6', border: '#e5e7eb', text: '#374151', accent: '#9ca3af', label: 'Cancelled',
    icon: <XCircle size={10} color="#374151" />,
  }
  if (s === 'FAILED') return {
    bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', accent: '#f97316', label: 'Failed',
    icon: <XCircle size={10} color="#c2410c" />,
  }
  return {
    bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', accent: '#3b82f6', label: rawState || 'Pending',
    icon: <Clock size={10} color="#1d4ed8" />,
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ApplicationTable({
  data,
  onOpenDetails,
  onNew,
  loading = false,
  externalPagination,
}: ApplicationTableProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<StatusFilter>('ALL')
  const [internalPage, setInternalPage] = useState(1)
  const [searchFilter, setSearchFilter] = useState({ field: 'employeeID', value: '' })

  const handleSearchApply = useCallback((opts: { field: string; value: string }) => {
    setSearchFilter(opts)
    setInternalPage(1)
  }, [])

  const tabFiltered = filterByTab(data, activeTab)
  const filteredData = searchFilter.value.trim()
    ? tabFiltered.filter(row => {
        const val = String((row as unknown as Record<string, unknown>)[searchFilter.field] ?? '')
        return val.toLowerCase().includes(searchFilter.value.trim().toLowerCase())
      })
    : tabFiltered

  const handleTabChange = (tab: StatusFilter) => {
    setActiveTab(tab)
    setInternalPage(1)
  }

  const itemsPerPage = externalPagination?.itemsPerPage ?? 10
  const useExternal  = !!externalPagination

  const currentPage = useExternal ? externalPagination!.currentPage  : internalPage
  const totalPages  = useExternal ? externalPagination!.totalPages   : Math.ceil(filteredData.length / itemsPerPage)
  const startIndex  = useExternal ? externalPagination!.startIndex   : (currentPage - 1) * itemsPerPage
  const endIndex    = useExternal ? externalPagination!.endIndex     : startIndex + itemsPerPage
  const totalItems  = useExternal ? externalPagination!.totalItems   : filteredData.length
  const handlePage  = useExternal ? externalPagination!.onPageChange : setInternalPage

  const currentData = useExternal ? data : filteredData.slice(startIndex, endIndex)

  return (
    <View style={s.screen}>
      {/* ── Dark navy header ── */}
      <View style={s.header}>
        <View style={s.topRow}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs-lite)/applications' as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={s.backButton}
          >
            <ChevronLeft size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={s.title}>Shift Applications</Text>
          <View style={s.countPill}>
            <Text style={s.countPillText}>{totalItems} {totalItems !== 1 ? 'records' : 'record'}</Text>
          </View>
        </View>

        {/* Tab bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
          {TABS.map(({ key, label }) => {
            const active = activeTab === key
            return (
              <Pressable
                key={key}
                onPress={() => handleTabChange(key)}
                style={[s.tab, active && s.tabActive]}
              >
                <Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      {/* ── Content sheet ── */}
      <ScrollView style={s.sheet} contentContainerStyle={s.sheetContent} showsVerticalScrollIndicator={false}>

        {/* Summary card */}
        <View style={s.summaryCard}>
          <Text style={s.summaryTitle}>
            {activeTab === 'ALL' ? 'All Applications' : `${activeTab.charAt(0) + activeTab.slice(1).toLowerCase()} Applications`}
          </Text>
          <Text style={s.summaryText}>{TAB_DESC[activeTab]}</Text>
        </View>

        {/* Search filter + New button */}
        <View style={s.filterRow}>
          <View style={{ flex: 1 }}>
            <ApplicationFilters
              activeTab={activeTab.toLowerCase() as 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'failed'}
              onTabChange={() => {}}
              onApply={handleSearchApply}
            />
          </View>
          {onNew && (
            <TouchableOpacity onPress={onNew} activeOpacity={0.8} style={s.newBtn}>
              <Plus size={13} color="#fff" />
              <Text style={s.newBtnText}>New</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Card list panel */}
        <View style={s.panel}>
          <View style={s.panelHead}>
            <Text style={s.panelKicker}>APPLICATIONS</Text>
            <Text style={s.panelMeta}>{totalItems} total</Text>
          </View>

          {loading ? (
            <View style={s.centerState}>
              <ActivityIndicator size="large" color="#0a1c63" />
              <Text style={s.centerStateText}>Loading records...</Text>
            </View>
          ) : filteredData.length === 0 ? (
            <View style={s.centerState}>
              <View style={s.emptyIconWrap}>
                <FileText size={28} color="#9ca3af" />
              </View>
              <Text style={s.emptyTitle}>No Applications</Text>
              <Text style={s.emptyText}>No records found for the selected filter.</Text>
            </View>
          ) : (
            currentData.map((row, index) => {
              const rawState = row.workflowState || row.status || ''
              const badge = getBadgeConfig(rawState)
              const isLast = index === currentData.length - 1

              return (
                <React.Fragment key={row._id}>
                  <Pressable style={s.card} onPress={() => onOpenDetails(row)}>
                    {/* Avatar */}
                    <View style={s.avatar}>
                      <Repeat2 size={15} color="#334155" />
                    </View>

                    {/* Middle info */}
                    <View style={s.cardMeta}>
                      <Text style={s.cardPrimary} numberOfLines={1}>{row.shiftName || row.employeeID}</Text>
                      <Text style={s.cardSub} numberOfLines={1}>
                        {formatDate(row.fromDate)}
                        {row.toDate && row.toDate !== row.fromDate ? ` → ${formatDate(row.toDate)}` : ''}
                      </Text>
                    </View>

                    {/* Right: status + applied date */}
                    <View style={s.cardRight}>
                      <View style={[s.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                        <Text style={[s.badgeText, { color: badge.text }]}>{badge.label}</Text>
                      </View>
                      <Text style={s.cardRightValue}>{formatDate(row.appliedDate)}</Text>
                    </View>
                  </Pressable>

                  {!isLast && <View style={s.separator} />}
                </React.Fragment>
              )
            })
          )}
        </View>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <View style={s.pagination}>
            <Text style={s.paginationText}>
              {startIndex + 1}–{Math.min(endIndex, totalItems)} of {totalItems}
            </Text>
            <View style={s.pageButtons}>
              <TouchableOpacity
                onPress={() => handlePage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={[s.pageBtn, currentPage === 1 && s.pageBtnDisabled]}
              >
                <ChevronLeft size={13} color={currentPage === 1 ? '#d1d5db' : '#374151'} />
              </TouchableOpacity>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                .map((page, i, arr) => (
                  <React.Fragment key={page}>
                    {i > 0 && page - arr[i - 1]! > 1 && (
                      <Text style={s.pageDots}>…</Text>
                    )}
                    <TouchableOpacity
                      onPress={() => handlePage(page)}
                      style={[s.pageBtn, page === currentPage && s.pageBtnActive]}
                    >
                      <Text style={[s.pageBtnText, page === currentPage && s.pageBtnTextActive]}>{page}</Text>
                    </TouchableOpacity>
                  </React.Fragment>
                ))}

              <TouchableOpacity
                onPress={() => handlePage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={[s.pageBtn, currentPage === totalPages && s.pageBtnDisabled]}
              >
                <ChevronRight size={13} color={currentPage === totalPages ? '#d1d5db' : '#374151'} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a1c63' },

  // Header
  header: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 0 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  backButton: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 15, fontWeight: '800', flex: 1 },
  countPill: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  countPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Tab bar
  tabRow: { gap: 6, paddingBottom: 0 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderTopLeftRadius: 10, borderTopRightRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabActive: { backgroundColor: '#f8fafc' },
  tabText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  tabTextActive: { color: '#0a1c63' },

  // Sheet
  sheet: { flex: 1, backgroundColor: '#f8fafc' },
  sheetContent: { padding: 14, gap: 12 },

  // Summary card
  summaryCard: {
    backgroundColor: '#eef2ff', borderRadius: 12,
    borderWidth: 1, borderColor: '#c7d2fe',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: '#1e3a8a' },
  summaryText: { marginTop: 2, fontSize: 12, color: '#334155', lineHeight: 17 },

  // Filter row
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#0a1c63', borderRadius: 12,
  },
  newBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // Panel
  panel: { backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 0 },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  panelKicker: { fontSize: 10, letterSpacing: 0.8, color: '#94a3b8', fontWeight: '700' },
  panelMeta: { fontSize: 12, color: '#64748b' },

  // Row separator
  separator: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 2 },

  // Card row
  card: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardMeta: { flex: 1, gap: 2 },
  cardPrimary: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  cardSub: { fontSize: 12, color: '#64748b' },

  // Status badge
  badge: {
    borderRadius: 999, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 2,
    alignSelf: 'flex-end',
  },
  badgeText: { fontSize: 10, fontWeight: '700' },

  // Right column
  cardRight: { alignItems: 'flex-end', flexShrink: 0, gap: 4 },
  cardRightValue: { fontSize: 11, color: '#94a3b8' },

  // Empty / loading state
  centerState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  centerStateText: { fontSize: 13, color: '#64748b' },
  emptyIconWrap: { width: 56, height: 56, backgroundColor: '#f1f5f9', borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  emptyText: { fontSize: 12, color: '#9ca3af' },

  // Pagination
  pagination: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  paginationText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  pageButtons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pageBtn: {
    width: 28, height: 28, borderRadius: 8, borderWidth: 1,
    borderColor: '#e2e8f0', backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  pageBtnDisabled: { borderColor: '#f1f5f9', backgroundColor: '#f8fafc' },
  pageBtnActive: { backgroundColor: '#0a1c63', borderColor: '#0a1c63' },
  pageBtnText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  pageBtnTextActive: { color: '#fff' },
  pageDots: { fontSize: 11, color: '#cbd5e1', paddingHorizontal: 2 },
})

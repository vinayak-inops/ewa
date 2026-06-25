import { useRouter } from 'expo-router'
import { Check, ChevronDown, ChevronLeft, ChevronRight, FileText, Search, X } from 'lucide-react-native'
import React, { useState } from 'react'
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export type SpecialLeaveTabKey = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'failed'

interface Application {
  _id: string
  uploadedBy: string
  createdOn: string
  employeeID: string
  fromDate?: string
  toDate?: string
  appliedDate?: string
  workflowState: string
  remarks?: string
  leaveTitle?: string
  typeOfAbsence?: string
  noOfDays?: string
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

interface ApplicationTableProps {
  data: Application[]
  onOpenDetails: (row: Application) => void
  loading?: boolean
  externalPagination?: ExternalPagination
  onNew?: () => void
  title?: string
  subtitle?: string
  activeTab: SpecialLeaveTabKey
  onTabChange: (tab: SpecialLeaveTabKey) => void
  hideSearchBar?: boolean
  headerSlot?: React.ReactNode
  onRefresh?: () => void
  isRefreshing?: boolean
}

const TABS: { key: SpecialLeaveTabKey; label: string }[] = [
  { key: 'all',       label: 'All'       },
  { key: 'pending',   label: 'Pending'   },
  { key: 'approved',  label: 'Approved'  },
  { key: 'rejected',  label: 'Rejected'  },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'failed',    label: 'Failed'    },
]

const SEARCH_FIELDS = [
  { value: 'employeeID',    label: 'Employee ID',  icon: '👤' },
  { value: 'fromDate',      label: 'From Date',    icon: '📅' },
  { value: 'toDate',        label: 'To Date',      icon: '📅' },
  { value: 'appliedDate',   label: 'Applied Date', icon: '📅' },
  { value: 'remarks',       label: 'Remarks',      icon: '💬' },
  { value: 'workflowState', label: 'Status',       icon: '🔖' },
]

const statusStyle = (s: string) => {
  const u = (s || '').toUpperCase()
  if (u.includes('APPROVED'))                          return { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' }
  if (u.includes('REJECTED'))                          return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' }
  if (u.includes('CANCELLED') || u.includes('CANCEL')) return { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' }
  if (u.includes('FAILED'))                            return { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' }
  return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }
}

const formatDate = (v?: string) => {
  if (!v) return '-'
  try {
    if (/^\d{2}-\d{2}-\d{4}$/.test(v)) {
      const [dd, mm, yyyy] = v.split('-').map(Number)
      return new Date(yyyy!, mm! - 1, dd!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    }
    return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return v }
}

export default function ApplicationTable({
  data,
  onOpenDetails,
  loading = false,
  externalPagination,
  onNew,
  title = 'Special Leave Applications',
  activeTab,
  onTabChange,
  hideSearchBar = false,
  headerSlot,
  onRefresh,
  isRefreshing = false,
}: ApplicationTableProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [internalPage, setInternalPage] = useState(1)
  const [searchValue, setSearchValue] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchField, setSearchField] = useState('employeeID')
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
    ? data.filter(row => String((row as any)[searchField] ?? '').toLowerCase().includes(searchValue.toLowerCase()))
    : data

  const currentData = externalPagination ? filtered : filtered.slice(pg.startIndex, pg.endIndex)
  const totalItems = pg.totalItems
  const refreshControl = onRefresh
    ? <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
    : undefined

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>

      {/* Field picker modal */}
      <Modal visible={showFieldPicker} transparent animationType="fade" onRequestClose={() => setShowFieldPicker(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setShowFieldPicker(false)}>
          <Pressable onPress={() => {}} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 }}>
            <View style={{ width: 36, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 16 }} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', paddingHorizontal: 16, marginBottom: 8 }}>Search by field</Text>
            {SEARCH_FIELDS.map(f => {
              const selected = f.value === searchField
              return (
                <TouchableOpacity
                  key={f.value}
                  onPress={() => { setSearchField(f.value); setSearchValue(''); setShowFieldPicker(false) }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: selected ? '#eef2ff' : '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 18 }}>{f.icon}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: selected ? '#4338ca' : '#374151' }}>{f.label}</Text>
                  </View>
                  {selected && (
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#4338ca', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={11} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Header - fixed */}
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <Pressable onPress={() => router.push('/(tabs-lite)/applications' as any)} hitSlop={8} style={s.backBtn}>
          <ChevronLeft size={20} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>{title}</Text>
        <View style={s.recordsBadge}>
          <Text style={s.recordsBadgeText}>{totalItems} {totalItems !== 1 ? 'records' : 'record'}</Text>
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
          <Text style={s.bannerTitle}>Special Leave Made Simple.</Text>
          <Text style={s.bannerSub}>Submit & track special leave requests instantly</Text>
          {/* <Pressable style={s.bannerLink}>
            <Text style={s.bannerLinkText}>Learn More →</Text>
          </Pressable> */}
        </View>
        <View style={s.bannerIcon}>
          <FileText size={38} color="rgba(255,255,255,0.25)" />
        </View>
      </View>

      {/* Content */}
      <View style={{ backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 100 }}>

        {/* headerSlot: New card + search (injected from controller) */}
        {headerSlot && (
          <View style={{ gap: 10, marginBottom: 10 }}>
            {headerSlot}
          </View>
        )}

        {/* List title */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 8 }}>
          <Text style={{ fontSize: 10, letterSpacing: 0.8, color: '#94a3b8', fontWeight: '700' }}>APPLICATIONS</Text>
          <Text style={{ fontSize: 12, color: '#64748b' }}>{totalItems} total</Text>
        </View>

        {/* Card with tabs + search + list */}
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

          <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />

          {/* Search + New (only when hideSearchBar is false) */}
          {!hideSearchBar && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', height: 40, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1.5, borderColor: searchFocused ? '#6366f1' : '#e5e7eb', overflow: 'hidden' }}>
              <TouchableOpacity
                onPress={() => setShowFieldPicker(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, width: 100, height: '100%', paddingHorizontal: 10, borderRightWidth: 1, borderRightColor: '#e5e7eb' }}
              >
                <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: '#374151' }} numberOfLines={1}>{activeField.label}</Text>
                <ChevronDown size={12} color="#9ca3af" />
              </TouchableOpacity>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 6 }}>
                <Search size={13} color={searchFocused ? '#6366f1' : '#9ca3af'} />
                <TextInput
                  placeholder="Search..."
                  placeholderTextColor="#d1d5db"
                  value={searchValue}
                  onChangeText={setSearchValue}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  style={{ flex: 1, fontSize: 13, color: '#111827' }}
                />
                {searchValue.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchValue('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <X size={12} color="#6b7280" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {onNew && (
              <TouchableOpacity onPress={onNew} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#0a1c63', borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>+ New</Text>
              </TouchableOpacity>
            )}
          </View>}

          {/* Records */}
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            {loading ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 }}>
                <ActivityIndicator size="large" color="#0a1c63" />
                <Text style={{ fontSize: 13, color: '#64748b' }}>Loading records...</Text>
              </View>
            ) : currentData.length === 0 ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 }}>
                <View style={{ width: 56, height: 56, backgroundColor: '#f1f5f9', borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={28} color="#9ca3af" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151' }}>No Applications</Text>
                <Text style={{ fontSize: 12, color: '#9ca3af' }}>No records found for the selected filter.</Text>
              </View>
            ) : (
              currentData.map((row, idx) => {
                const st = statusStyle(row.workflowState)
                const isLast = idx === currentData.length - 1
                const dateRange = formatDate(row.fromDate) + (row.toDate && row.toDate !== row.fromDate ? `  →  ${formatDate(row.toDate)}` : '')
                const leaveTitle = row.leaveTitle || 'Special Leave'
                const meta = [row.typeOfAbsence, row.noOfDays ? `${row.noOfDays} days` : ''].filter(Boolean).join('  •  ')
                return (
                  <React.Fragment key={row._id || idx}>
                    <Pressable
                      onPress={() => onOpenDetails(row)}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 }}
                    >
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={15} color="#334155" />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#0f172a' }} numberOfLines={1}>
                          {leaveTitle} — {row.employeeID || '—'}
                        </Text>
                        {dateRange !== '-' && (
                          <Text style={{ fontSize: 12, color: '#64748b' }} numberOfLines={1}>{dateRange}</Text>
                        )}
                        {meta ? <Text style={{ fontSize: 11, color: '#94a3b8' }} numberOfLines={1}>{meta}</Text> : null}
                        {row.remarks ? <Text style={{ fontSize: 11, color: '#94a3b8' }} numberOfLines={1}>{row.remarks}</Text> : null}
                      </View>
                      <View style={{ alignItems: 'flex-end', flexShrink: 0, gap: 4 }}>
                        <View style={{ borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: st.bg, borderColor: st.border }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: st.text }}>{(row.workflowState || 'PENDING').toUpperCase()}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(row.appliedDate || row.createdOn)}</Text>
                      </View>
                    </Pressable>
                    {!isLast && <View style={{ height: 1, backgroundColor: '#f1f5f9', marginVertical: 2 }} />}
                  </React.Fragment>
                )
              })
            )}

            {/* Pagination */}
            {!loading && pg.totalPages > 1 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '500' }}>
                  {pg.startIndex + 1}–{Math.min(pg.endIndex, pg.totalItems)} of {pg.totalItems}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <TouchableOpacity
                    onPress={() => pg.onPageChange(Math.max(1, pg.currentPage - 1))}
                    disabled={pg.currentPage === 1}
                    style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: pg.currentPage === 1 ? '#f1f5f9' : '#e2e8f0', backgroundColor: pg.currentPage === 1 ? '#f9fafb' : '#fff', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronLeft size={13} color={pg.currentPage === 1 ? '#d1d5db' : '#374151'} />
                  </TouchableOpacity>
                  {Array.from({ length: pg.totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === pg.totalPages || Math.abs(p - pg.currentPage) <= 1)
                    .map((p, i, arr) => (
                      <React.Fragment key={p}>
                        {i > 0 && arr[i - 1]! !== p - 1 && <Text style={{ fontSize: 11, color: '#cbd5e1', paddingHorizontal: 2 }}>…</Text>}
                        <TouchableOpacity
                          onPress={() => pg.onPageChange(p)}
                          style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: p === pg.currentPage ? '#0a1c63' : '#e2e8f0', backgroundColor: p === pg.currentPage ? '#0a1c63' : '#fff', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: p === pg.currentPage ? '#fff' : '#374151' }}>{p}</Text>
                        </TouchableOpacity>
                      </React.Fragment>
                    ))}
                  <TouchableOpacity
                    onPress={() => pg.onPageChange(Math.min(pg.totalPages, pg.currentPage + 1))}
                    disabled={pg.currentPage === pg.totalPages}
                    style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: pg.currentPage === pg.totalPages ? '#f1f5f9' : '#e2e8f0', backgroundColor: pg.currentPage === pg.totalPages ? '#f9fafb' : '#fff', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronRight size={13} color={pg.currentPage === pg.totalPages ? '#d1d5db' : '#374151'} />
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
    backgroundColor: '#0a1c63',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '700' },
  recordsBadge: {
    paddingHorizontal: 10, paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  recordsBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  banner: {
    backgroundColor: '#1a3080',
    marginHorizontal: 12, marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  bannerText: { flex: 1, gap: 3 },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  bannerSub:   { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  bannerLink:  { marginTop: 8, alignSelf: 'flex-start' },
  bannerLinkText: { fontSize: 12, fontWeight: '700', color: '#93c5fd' },
  bannerIcon: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 12,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  tab: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#0a1c63' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  tabTextActive: { color: '#0a1c63' },
})

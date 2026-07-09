import { useGetRequest } from "@/hooks/api/useGetRequest"
import { useScreenPermissions } from "@/hooks/auth/useScreenPermissions"
import { useAppSelector } from "@/hooks/useAppSelector"
import { Ionicons } from "@expo/vector-icons"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import ApplicationTable from "./application-table"
import ShiftRequestsPopup from "./shift-requests-popup"

interface ShiftApplicationApproverProps {
  isApprovalPermission?: boolean
}

type TabKey = "all" | "pending" | "approved" | "rejected" | "cancelled" | "failed"

type SearchField = {
  label: string
  field: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  iconColor: string
  iconBg: string
}

const SEARCH_FIELDS: SearchField[] = [
  { label: 'Employee ID',   field: 'employeeID',    icon: 'person-outline',   iconColor: '#6366f1', iconBg: '#eef2ff' },
  { label: 'Employee Name', field: 'employeeName',  icon: 'people-outline',   iconColor: '#0891b2', iconBg: '#ecfeff' },
  { label: 'From Date',     field: 'fromDate',      icon: 'calendar-outline', iconColor: '#f97316', iconBg: '#fff7ed' },
  { label: 'To Date',       field: 'toDate',        icon: 'calendar-outline', iconColor: '#ef4444', iconBg: '#fef2f2' },
  { label: 'Shift Name',    field: 'shiftName',     icon: 'time-outline',     iconColor: '#0ea5e9', iconBg: '#f0f9ff' },
  { label: 'Remarks',       field: 'remarks',       icon: 'chatbox-outline',  iconColor: '#64748b', iconBg: '#f1f5f9' },
  { label: 'Status',        field: 'workflowState', icon: 'flag-outline',     iconColor: '#8b5cf6', iconBg: '#f5f3ff' },
]

export default function ShiftApplicationApprover({ isApprovalPermission: _isApprovalPermission = false }: ShiftApplicationApproverProps) {
  const [otApplications, setOtApplications] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>("pending")
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const [activeSearchField, setActiveSearchField] = useState<SearchField>(SEARCH_FIELDS[1]!)

  const itemsPerPage = 10

  const employeeId = useAppSelector(s => s.role.employeeId) ?? ""
  const tenantCode = useAppSelector(s => s.role.org) ?? ""

  const approverPerms = useScreenPermissions('applicationApprover', 'shiftChange')

  const canApprove = !!approverPerms?.approve
  const canReject  = !!approverPerms?.reject
  const canCancel  = !!approverPerms?.cancel

  const offset = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage])

  useEffect(() => { setCurrentPage(1) }, [searchTerm])

  const collectionName = useMemo(() => {
    if (activeTab === "pending" || activeTab === "failed" || activeTab === "all") return "shiftChangeApplication"
    return "shiftChangeApplicationTransaction"
  }, [activeTab])

  const buildRequestData = useMemo(() => {
    const data: any[] = [
      { field: "tenantCode", value: tenantCode, operator: "eq" },
      { field: "createdOn",  value: "",          operator: "desc" },
    ]
    if (searchTerm.trim()) {
      data.push({ field: activeSearchField.field, value: searchTerm.trim(), operator: "like" })
    }
    if (activeTab === "pending" && employeeId)
      data.push({ field: "approverID", value: employeeId, operator: "eq" })
    if (activeTab === "failed" && employeeId) {
      data.push({ field: "workflowState", value: "FAILED", operator: "like" })
      data.push({ field: "approverID", value: employeeId, operator: "eq" })
    }
    if (activeTab === "approved" && employeeId)
      data.push({ field: "approvedBy", value: employeeId, operator: "eq" })
    if (activeTab === "rejected" && employeeId)
      data.push({ field: "rejectedBy", value: employeeId, operator: "eq" })
    if (activeTab === "cancelled" && employeeId)
      data.push({ field: "cancelledBy", value: employeeId, operator: "eq" })
    return data
  }, [activeTab, tenantCode, employeeId, searchTerm, activeSearchField])

  const { refetch: refetchCount } = useGetRequest<any>({
    url: `${collectionName}/count`, method: "POST", data: buildRequestData,
    onSuccess: (data: any) => { if (data !== null && data !== undefined) setTotalCount(data || 0) },
    onError: () => {},
  })

  const { loading: isLoading, refetch: otRefetch } = useGetRequest<any[]>({
    url: `${collectionName}/search?offset=${offset}&limit=${itemsPerPage}`,
    method: "POST", data: buildRequestData,
    onSuccess: (data: any) => {
      if (!data || !Array.isArray(data)) { setOtApplications([]); return }
      setOtApplications(
        data
          .filter((item: any) => item && typeof item === "object" && Object.keys(item).length > 0)
          .map((item: any) => ({
            _id: item._id || "",
            employeeID: item.employeeID || "",
            employeeName: item.employeeName || "",
            appliedDate: item.appliedDate || item.createdOn || "",
            fromDate: item.fromDate || "",
            toDate: item.toDate || "",
            shiftName: item.shift?.shiftName || item.shiftName || "",
            shiftStart: item.shift?.shiftStart || item.shiftStart || item.startTime || "",
            shiftEnd: item.shift?.shiftEnd || item.shiftEnd || item.endTime || "",
            lunchStart: item.shift?.lunchStart || item.lunchStart || item.breakStart || "",
            lunchEnd: item.shift?.lunchEnd || item.lunchEnd || item.breakEnd || "",
            remarks: item.remarks || item.Remarks || "",
            workflowState: item.workflowState || "",
            status: item.status || item.workflowState || "INITIATED",
          }))
      )
    },
    onError: () => {},
  })

  const refreshAll = useCallback(() => {
    const shouldFetch =
      activeTab === "pending" ||
      activeTab === "failed" ||
      activeTab === "all" ||
      (activeTab === "approved" && canApprove) ||
      (activeTab === "rejected" && canReject) ||
      (activeTab === "cancelled" && canCancel)
    if (shouldFetch) { otRefetch(); refetchCount() }
  }, [activeTab, canApprove, canReject, canCancel, otRefetch, refetchCount])

  const handlePullRefresh = useCallback(() => {
    setIsRefreshing(true)
    refreshAll()
    setIsRefreshing(false)
  }, [refreshAll])

  useEffect(() => { refreshAll() }, [activeTab, employeeId, currentPage, canApprove, canReject, canCancel])

  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount)

  const headerSlot = (
    <View style={s.searchBar}>
      <View style={s.searchIconBox}>
        <Ionicons name="search-outline" size={15} color="#1d4ed8" />
      </View>
      <TextInput
        style={s.searchInput}
        placeholder={`Search ${activeSearchField.label}…`}
        placeholderTextColor="#94a3b8"
        value={searchTerm}
        onChangeText={setSearchTerm}
        returnKeyType="search"
        autoCorrect={false}
      />
      {searchTerm.length > 0 ? (
        <Pressable onPress={() => setSearchTerm("")} hitSlop={8}>
          <Ionicons name="close-circle" size={16} color="#cbd5e1" />
        </Pressable>
      ) : (
        <Pressable onPress={() => setShowFieldPicker(true)} hitSlop={8}>
          <Ionicons name="options-outline" size={20} color="#64748b" />
        </Pressable>
      )}
    </View>
  )

  return (
    <View style={{ flex: 1 }}>
      <Modal
        visible={showFieldPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFieldPicker(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setShowFieldPicker(false)}>
          <Pressable style={s.pickerSheet} onPress={e => e.stopPropagation()}>
            <View style={s.pickerHandle} />
            <Text style={s.pickerTitle}>Search by field</Text>
            {SEARCH_FIELDS.map(f => {
              const isSelected = f.field === activeSearchField.field
              return (
                <Pressable
                  key={f.field}
                  style={[s.pickerRow, isSelected && s.pickerRowActive]}
                  onPress={() => { setActiveSearchField(f); setSearchTerm(""); setShowFieldPicker(false) }}
                >
                  <View style={[s.pickerRowIcon, { backgroundColor: f.iconBg }]}>
                    <Ionicons name={f.icon} size={16} color={f.iconColor} />
                  </View>
                  <Text style={[s.pickerRowLabel, isSelected && s.pickerRowLabelActive]}>{f.label}</Text>
                  {isSelected && (
                    <View style={s.pickerDot}>
                      <View style={s.pickerDotInner} />
                    </View>
                  )}
                </Pressable>
              )
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <ApplicationTable
        data={otApplications}
        onOpenDetails={row => { if (!row?._id) return; setSelectedRequestId(row._id); setIsPopupOpen(true) }}
        loading={isLoading}
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab as TabKey); setCurrentPage(1) }}
        externalPagination={{ currentPage, totalPages, totalItems: totalCount, itemsPerPage, startIndex, endIndex, onPageChange: setCurrentPage }}
        hideSearchBar
        headerSlot={headerSlot}
        onRefresh={handlePullRefresh}
        isRefreshing={isRefreshing}
      />

      <ShiftRequestsPopup
        isOpen={isPopupOpen}
        onClose={() => { setIsPopupOpen(false); setSelectedRequestId(null) }}
        selectedRequestId={selectedRequestId}
        initialSelectedRequest={null}
        isSelfPermission={false}
        isAllPermission={false}
        userMode="approver"
        sourceCollectionName={collectionName}
        onActionSuccess={refreshAll}
      />
    </View>
  )
}

const s = StyleSheet.create({
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12, paddingHorizontal: 10, height: 44,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  searchIconBox: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingBottom: 32, paddingTop: 12,
  },
  pickerHandle: {
    alignSelf: 'center',
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e2e8f0', marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 15, fontWeight: '700', color: '#0f172a',
    marginBottom: 12, paddingHorizontal: 4,
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 8, borderRadius: 12,
  },
  pickerRowActive: { backgroundColor: '#f0f4ff' },
  pickerRowIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  pickerRowLabel: { flex: 1, fontSize: 14, color: '#334155' },
  pickerRowLabelActive: { color: '#0a1c63', fontWeight: '600' },
  pickerDot: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#0a1c63',
    alignItems: 'center', justifyContent: 'center',
  },
  pickerDotInner: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#0a1c63',
  },
})

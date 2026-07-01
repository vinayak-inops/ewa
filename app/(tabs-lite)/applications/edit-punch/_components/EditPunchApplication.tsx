import { useGetRequest } from "@/hooks/api/useGetRequest"
import { useScreenPermissions } from "@/hooks/auth/useScreenPermissions"
import { RootState } from "@/store"
import { Ionicons } from "@expo/vector-icons"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { useSelector } from "react-redux"
import AttendancePunchPanel, { PunchRow } from "./AttendancePunchPanel"
import EditPunchFormModal, { EditPunchPunchRecord } from "./EditPunchFormModal"
import EditPunchRequestsPopup from "./edit-punch-requests-popup"
import ApplicationTable, { EditPunchTabKey } from "./application-table"

interface EditPunchApplicationProps {
  isSelfPermission?: boolean
  isAllPermission?: boolean
  refreshTrigger?: number
}

type SearchField = {
  label: string
  field: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  iconColor: string
  iconBg: string
}

const SEARCH_FIELDS: SearchField[] = [
  { label: 'Employee ID',   field: 'employeeID',        icon: 'person-outline',          iconColor: '#6366f1', iconBg: '#eef2ff' },
  { label: 'Employee Name', field: 'employeeName',      icon: 'people-outline',          iconColor: '#0891b2', iconBg: '#ecfeff' },
  { label: 'Att. Date',     field: 'attendanceDate',    icon: 'calendar-outline',        iconColor: '#f97316', iconBg: '#fff7ed' },
  { label: 'New Att. Date', field: 'newAttendanceDate', icon: 'calendar-outline',        iconColor: '#ef4444', iconBg: '#fef2f2' },
  { label: 'In/Out',        field: 'inOut',             icon: 'swap-horizontal-outline', iconColor: '#0ea5e9', iconBg: '#f0f9ff' },
  { label: 'Remarks',       field: 'remarks',           icon: 'chatbox-outline',         iconColor: '#64748b', iconBg: '#f1f5f9' },
  { label: 'Status',        field: 'workflowState',     icon: 'flag-outline',            iconColor: '#8b5cf6', iconBg: '#f5f3ff' },
]

export default function EditPunchApplication({
  isSelfPermission = false,
  isAllPermission = false,
  refreshTrigger,
}: EditPunchApplicationProps) {
  const [applications, setApplications] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<EditPunchTabKey>("all")
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [isPunchPanelOpen, setIsPunchPanelOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [formPunchRecord, setFormPunchRecord] = useState<EditPunchPunchRecord | null>(null)
  const [formAttendanceDate, setFormAttendanceDate] = useState("")
  const [formMonth, setFormMonth] = useState(0)
  const [formYear, setFormYear] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const itemsPerPage = 10

  const employeeId = useSelector((s: RootState) => s.role.employeeId) ?? ""
  const tenantCode = useSelector((s: RootState) => s.role.org) ?? ""

  const visibleSearchFields = useMemo(
    () => isSelfPermission ? SEARCH_FIELDS.filter(f => f.field !== 'employeeID' && f.field !== 'employeeName') : SEARCH_FIELDS,
    [isSelfPermission]
  )

  const [activeSearchField, setActiveSearchField] = useState<SearchField>(() =>
    isSelfPermission ? (SEARCH_FIELDS.find(f => f.field !== 'employeeID' && f.field !== 'employeeName') ?? SEARCH_FIELDS[2]!) : SEARCH_FIELDS[0]!
  )

  const applierPerms = useScreenPermissions('applicationApplier', 'editPunchApplication')
  const canCancel = !!applierPerms?.cancel

  const offset = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage])

  useEffect(() => { setCurrentPage(1) }, [searchTerm])

  const buildRequestData = useMemo(() => {
    const data: any[] = [
      { field: "tenantCode", value: tenantCode, operator: "eq" },
      { field: "createdOn",  value: "",         operator: "desc" },
    ]
    if (searchTerm.trim()) {
      data.push({ field: activeSearchField.field, value: searchTerm.trim(), operator: "like" })
    }
    const addEmployeeFilter = () => {
      if (!employeeId) return
      if (isSelfPermission) data.push({ field: "employeeID", value: employeeId, operator: "eq" })
      else if (isAllPermission) data.push({ field: "createdBy", value: employeeId, operator: "eq" })
    }
    if (activeTab === "all")       { addEmployeeFilter() }
    if (activeTab === "pending")   { data.push({ field: "workflowState", value: ["APPROVED", "REJECTED", "CANCELLED", "FAILED"], operator: "nin" }); addEmployeeFilter() }
    if (activeTab === "failed")    { data.push({ field: "workflowState", value: "FAILED", operator: "like" }); addEmployeeFilter() }
    if (activeTab === "approved")  { data.push({ field: "workflowState", value: "APPROVED", operator: "eq" }); addEmployeeFilter() }
    if (activeTab === "rejected")  { data.push({ field: "workflowState", value: "REJECTED", operator: "like" }); addEmployeeFilter() }
    if (activeTab === "cancelled") { data.push({ field: "workflowState", value: "CANCELLED", operator: "like" }); addEmployeeFilter() }
    return data
  }, [activeTab, tenantCode, employeeId, isSelfPermission, isAllPermission, searchTerm, activeSearchField])

  const { refetch: refetchCount } = useGetRequest<number>({
    url: "editPunchApplication/count",
    method: "POST",
    data: buildRequestData,
    onSuccess: (data: any) => { if (data !== null && data !== undefined) setTotalCount(data || 0) },
  })

  const { loading, refetch } = useGetRequest<any[]>({
    url: `editPunchApplication/search?offset=${offset}&limit=${itemsPerPage}`,
    method: "POST",
    data: buildRequestData,
    onSuccess: (data: any) => {
      if (!data || !Array.isArray(data)) { setApplications([]); return }
      setApplications(
        data
          .filter((item: any) => item && typeof item === "object" && Object.keys(item).length > 0)
          .map((item: any) => ({
            _id: item._id || "",
            employeeID: item.employeeID || "",
            employeeName: item.employeeName || "",
            punchedTime: item.punchedTime || "",
            transactionTime: item.transactionTime || "",
            inOut: item.inOut || "",
            typeOfMovement: item.typeOfMovement || "",
            attendanceDate: item.attendanceDate || "",
            newAttendanceDate: item.newAttendanceDate || "",
            remarks: item.remarks || "",
            workflowState: item.workflowState || "",
            status: item.status || item.workflowState || "INITIATED",
          }))
      )
    },
  })

  const refreshAll = useCallback(() => {
    const shouldFetch =
      activeTab === "all" || activeTab === "pending" || activeTab === "failed" ||
      activeTab === "approved" || activeTab === "rejected" ||
      (activeTab === "cancelled" && canCancel)
    if (shouldFetch) { refetch(); refetchCount() }
  }, [refetch, refetchCount, activeTab, canCancel])

  const handlePullRefresh = useCallback(() => {
    setIsRefreshing(true)
    refreshAll()
    setIsRefreshing(false)
  }, [refreshAll])

  useEffect(() => {
    refreshAll()
  }, [activeTab, isSelfPermission, isAllPermission, employeeId, currentPage, refreshTrigger, canCancel])

  const handleTabChange = useCallback((tab: EditPunchTabKey) => {
    setActiveTab(tab)
    setCurrentPage(1)
  }, [])

  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount)

  const headerSlot = (
    <>
      {/* New Application card */}
      <Pressable onPress={() => setIsPunchPanelOpen(true)}>
        {({ pressed }) => (
          <View style={[s.newCard, pressed && { opacity: 0.88 }]}>
            <View style={s.newCardIcon}>
              <Ionicons name="add" size={20} color="#ffffff" />
            </View>
            <View style={s.newCardText}>
              <Text style={s.newCardTitle}>New Application</Text>
              <Text style={s.newCardSub}>Select a punch record to correct</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#93c5fd" />
          </View>
        )}
      </Pressable>

      {/* Search bar */}
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
    </>
  )

  return (
    <View style={{ flex: 1 }}>
      {/* Field picker modal */}
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
            {visibleSearchFields.map(f => {
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

      {/* Punch panel modal */}
      <Modal visible={isPunchPanelOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsPunchPanelOpen(false)}>
        <AttendancePunchPanel
          onClose={() => setIsPunchPanelOpen(false)}
          onEditPunch={(punch: PunchRow, attendanceDate: string, month: number, year: number) => {
            setFormPunchRecord({ id: punch.id, employeeID: punch.employeeID, inOut: punch.inOut, typeOfMovement: punch.typeOfMovement, punchedTime: punch.punchedTime, readerSerialNumber: punch.readerSerialNumber })
            setFormAttendanceDate(attendanceDate)
            setFormMonth(month)
            setFormYear(year)
            setIsPunchPanelOpen(false)
            setIsFormOpen(true)
          }}
        />
      </Modal>

      {/* Edit punch form modal */}
      <EditPunchFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        punchRecord={formPunchRecord}
        attendanceDate={formAttendanceDate}
        month={formMonth}
        year={formYear}
        onSuccess={() => { setIsFormOpen(false); refreshAll() }}
      />

      <ApplicationTable
        data={applications}
        onOpenDetails={row => { if (!row?._id) return; setSelectedRequestId(row._id); setIsPopupOpen(true) }}
        loading={loading}
        onNew={() => setIsPunchPanelOpen(true)}
        title="Edit Punch Applications"
        activeTab={activeTab}
        onTabChange={handleTabChange}
        externalPagination={{ currentPage, totalPages, totalItems: totalCount, itemsPerPage, startIndex, endIndex, onPageChange: setCurrentPage }}
        hideSearchBar
        headerSlot={headerSlot}
        onRefresh={handlePullRefresh}
        isRefreshing={isRefreshing}
      />

      <EditPunchRequestsPopup
        isOpen={isPopupOpen}
        onClose={() => { setIsPopupOpen(false); setSelectedRequestId(null) }}
        selectedRequestId={selectedRequestId}
        userMode="user"
        sourceCollectionName="editPunchApplication"
        onActionSuccess={refreshAll}
      />
    </View>
  )
}

const s = StyleSheet.create({
  newCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0a1c63',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
  },
  newCardIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  newCardText: { flex: 1 },
  newCardTitle: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  newCardSub:   { fontSize: 11, color: '#93c5fd', marginTop: 1 },

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

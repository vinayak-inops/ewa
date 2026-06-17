import { useGetRequest } from "@/hooks/api/useGetRequest"
import { useScreenPermissions } from "@/hooks/auth/useScreenPermissions"
import { RootState } from "@/store"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Modal, RefreshControl, ScrollView } from "react-native"
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

  const itemsPerPage = 10

  const employeeId = useSelector((s: RootState) => s.role.employeeId) ?? ""
  const tenantCode = useSelector((s: RootState) => s.role.org) ?? ""

  const applierPerms = useScreenPermissions('applicationApplier', 'editPunchApplication')

  const canCancel = !!applierPerms?.cancel

  const offset = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage])

  const buildRequestData = useMemo(() => {
    const data: any[] = [
      { field: "tenantCode", value: tenantCode, operator: "eq" },
      { field: "createdOn",  value: "",         operator: "desc" },
    ]
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
  }, [activeTab, tenantCode, employeeId, isSelfPermission, isAllPermission])

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
      activeTab === "all" ||
      activeTab === "pending" ||
      activeTab === "failed" ||
      activeTab === "approved" ||
      activeTab === "rejected" ||
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

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handlePullRefresh} />
      }
    >
      <ApplicationTable
        data={applications}
        onOpenDetails={row => { if (!row?._id) return; setSelectedRequestId(row._id); setIsPopupOpen(true) }}
        loading={loading}
        onNew={() => setIsPunchPanelOpen(true)}
        title="Edit Punch Applications"
        subtitle="View and track your edit punch applications"
        activeTab={activeTab}
        onTabChange={handleTabChange}
        externalPagination={{ currentPage, totalPages, totalItems: totalCount, itemsPerPage, startIndex, endIndex, onPageChange: (p: number) => setCurrentPage(p) }}
      />

      <EditPunchRequestsPopup
        isOpen={isPopupOpen}
        onClose={() => { setIsPopupOpen(false); setSelectedRequestId(null) }}
        selectedRequestId={selectedRequestId}
        userMode="user"
        sourceCollectionName="editPunchApplication"
        onActionSuccess={refreshAll}
      />

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

      <EditPunchFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        punchRecord={formPunchRecord}
        attendanceDate={formAttendanceDate}
        month={formMonth}
        year={formYear}
        onSuccess={() => { setIsFormOpen(false); refreshAll() }}
      />
    </ScrollView>
  )
}

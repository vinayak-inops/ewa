import { useGetRequest } from "@/hooks/api/useGetRequest"
import { useScreenPermissions } from "@/hooks/auth/useScreenPermissions"
import { RootState } from "@/store"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { RefreshControl, ScrollView } from "react-native"
import { useSelector } from "react-redux"
import EditPunchRequestsPopup from "./edit-punch-requests-popup"
import ApplicationTable, { EditPunchTabKey } from "./application-table"

interface Props {
  isApprovalPermission?: boolean
}

export default function EditPunchApplicationApprover({ isApprovalPermission: _isApprovalPermission = false }: Props) {
  const [applications, setApplications] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<EditPunchTabKey>("pending")
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const itemsPerPage = 10

  const employeeId = useSelector((s: RootState) => s.role.employeeId) ?? ""
  const tenantCode = useSelector((s: RootState) => s.role.org) ?? ""

  const approverPerms = useScreenPermissions('applicationApprover', 'editPunchApplication')

  const canApprove = !!approverPerms?.approve
  const canReject  = !!approverPerms?.reject
  const canCancel  = !!approverPerms?.cancel

  const offset = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage])

  const collectionName = useMemo(() => {
    if (activeTab === "approved" || activeTab === "rejected" || activeTab === "cancelled")
      return "editPunchApplicationTransaction"
    return "editPunchApplication"
  }, [activeTab])

  const buildRequestData = useMemo(() => {
    const data: any[] = [
      { field: "tenantCode", value: tenantCode, operator: "eq" },
      { field: "createdOn",  value: "",         operator: "desc" },
    ]
    if (activeTab === "pending" && employeeId)
      data.push({ field: "approverID", value: employeeId, operator: "eq" })
    if (activeTab === "failed" && employeeId) {
      data.push({ field: "workflowState", value: "FAILED", operator: "like" })
      data.push({ field: "approverID", value: employeeId, operator: "eq" })
    }
    if (activeTab === "approved" && employeeId) {
      data.push({ field: "approvedBy",    value: employeeId, operator: "eq" })
      data.push({ field: "workflowState", value: "APPROVED", operator: "eq" })
    }
    if (activeTab === "rejected" && employeeId) {
      data.push({ field: "rejectedBy",    value: employeeId, operator: "eq" })
      data.push({ field: "workflowState", value: "REJECTED", operator: "eq" })
    }
    if (activeTab === "cancelled" && employeeId) {
      data.push({ field: "cancelledBy",   value: employeeId, operator: "eq" })
      data.push({ field: "workflowState", value: ["CANCELLED", "CANCEL"], operator: "in" })
    }
    return data
  }, [activeTab, tenantCode, employeeId])

  const { refetch: refetchCount } = useGetRequest<number>({
    url: `${collectionName}/count`,
    method: "POST",
    data: buildRequestData,
    onSuccess: (data: any) => { if (data !== null && data !== undefined) setTotalCount(data || 0) },
  })

  const { loading, refetch } = useGetRequest<any[]>({
    url: `${collectionName}/search?offset=${offset}&limit=${itemsPerPage}`,
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
      activeTab === "pending" ||
      activeTab === "failed" ||
      (activeTab === "approved" && canApprove) ||
      (activeTab === "rejected" && canReject) ||
      (activeTab === "cancelled" && canCancel)
    if (shouldFetch) { refetch(); refetchCount() }
  }, [refetch, refetchCount, activeTab, canApprove, canReject, canCancel])

  const handlePullRefresh = useCallback(() => {
    setIsRefreshing(true)
    refreshAll()
    setIsRefreshing(false)
  }, [refreshAll])

  useEffect(() => { refreshAll() }, [activeTab, employeeId, currentPage, canApprove, canReject, canCancel])

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
        title="Edit Punch Approvals"
        subtitle="Review and action edit punch requests"
        activeTab={activeTab}
        onTabChange={handleTabChange}
        externalPagination={{ currentPage, totalPages, totalItems: totalCount, itemsPerPage, startIndex, endIndex, onPageChange: (p: number) => setCurrentPage(p) }}
      />

      <EditPunchRequestsPopup
        isOpen={isPopupOpen}
        onClose={() => { setIsPopupOpen(false); setSelectedRequestId(null) }}
        selectedRequestId={selectedRequestId}
        userMode="approver"
        sourceCollectionName={collectionName}
        onActionSuccess={refreshAll}
      />
    </ScrollView>
  )
}

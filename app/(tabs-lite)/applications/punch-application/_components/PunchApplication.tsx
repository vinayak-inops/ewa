import { useGetRequest } from "@/hooks/api/useGetRequest"
import { useScreenPermissions } from "@/hooks/auth/useScreenPermissions"
import { RootState } from "@/store"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Modal, RefreshControl, ScrollView } from "react-native"
import { useSelector } from "react-redux"
import ApplicationTable, { PunchRecord, PunchTabKey } from "./application-table"
import PunchFormPopup from "./punch-form-popup"
import PunchRequestsPopup from "./punch-requests-popup"

interface Props {
  isSelfPermission?: boolean
  isAllPermission?: boolean
  refreshTrigger?: number
}

export default function PunchApplication({ isSelfPermission = false, isAllPermission = false, refreshTrigger }: Props) {
  const [applications, setApplications] = useState<PunchRecord[]>([])
  const [activeTab, setActiveTab] = useState<PunchTabKey>("all")
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const itemsPerPage = 10
  const collectionName = "forgotPunchApplication"

  const employeeId = useSelector((s: RootState) => s.role.employeeId) ?? ""
  const tenantCode = useSelector((s: RootState) => s.role.org) ?? ""

  const applierPerms = useScreenPermissions('applicationApplier', 'punch')

  const canCancel = !!applierPerms?.cancel

  const offset = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage])

  const buildRequestData = useMemo(() => {
    const data: any[] = [
      { field: "tenantCode", value: tenantCode, operator: "eq" },
      { field: "createdOn",  value: "",          operator: "desc" },
    ]
    const pushUserScope = () => {
      if (!employeeId) return
      if (isSelfPermission) data.push({ field: "employeeID", value: employeeId, operator: "eq" })
      else if (isAllPermission) data.push({ field: "createdBy", value: employeeId, operator: "eq" })
    }
    if (activeTab === "all")       { pushUserScope() }
    if (activeTab === "pending")   { data.push({ field: "workflowState", value: ["APPROVED", "REJECTED", "CANCELLED", "FAILED"], operator: "nin" }); pushUserScope() }
    if (activeTab === "failed")    { data.push({ field: "workflowState", value: "FAILED", operator: "like" }); pushUserScope() }
    if (activeTab === "approved")  { data.push({ field: "workflowState", value: "APPROVED", operator: "eq" }); pushUserScope() }
    if (activeTab === "rejected")  { data.push({ field: "workflowState", value: "REJECTED", operator: "eq" }); pushUserScope() }
    if (activeTab === "cancelled") { data.push({ field: "workflowState", value: ["CANCELLED", "CANCEL"], operator: "in" }); pushUserScope() }
    return data
  }, [activeTab, tenantCode, employeeId, isSelfPermission, isAllPermission])

  const { refetch: refetchCount } = useGetRequest<any>({
    url: `${collectionName}/count`, method: "POST", data: buildRequestData,
    onSuccess: (d: any) => { if (d !== null && d !== undefined) setTotalCount(d || 0) },
    onError: () => {},
  })

  const { loading, refetch } = useGetRequest<any[]>({
    url: `${collectionName}/search?offset=${offset}&limit=${itemsPerPage}`,
    method: "POST", data: buildRequestData,
    onSuccess: (d: any) => {
      if (!d || !Array.isArray(d)) { setApplications([]); return }
      setApplications(d.filter((i: any) => i && typeof i === "object" && Object.keys(i).length > 0).map((i: any) => ({
        _id: i._id || "", employeeID: i.employeeID || "",
        attendanceDate: i.attendanceDate || "", punchedTime: i.punchedTime || "",
        inOut: i.inOut || "", typeOfMovement: i.typeOfMovement || "",
        workflowState: i.workflowState || "INITIATED", status: i.workflowState || "INITIATED",
        uploadedBy: i.uploadedBy || "", createdOn: i.createdOn || "", remarks: i.remarks || "",
      })))
    },
    onError: () => {},
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

  useEffect(() => { refreshAll() }, [activeTab, employeeId, currentPage, refreshTrigger, canCancel])

  const handleTabChange = useCallback((tab: PunchTabKey) => {
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
        onNew={() => setIsFormOpen(true)}
        title="Punch Applications"
        subtitle="View and manage your punch applications"
        activeTab={activeTab}
        onTabChange={handleTabChange}
        externalPagination={{ currentPage, totalPages, totalItems: totalCount, itemsPerPage, startIndex, endIndex, onPageChange: setCurrentPage }}
      />

      <PunchRequestsPopup
        isOpen={isPopupOpen}
        onClose={() => { setIsPopupOpen(false); setSelectedRequestId(null) }}
        selectedRequestId={selectedRequestId}
        initialSelectedRequest={null}
        userMode="user"
        sourceCollectionName={collectionName}
        onActionSuccess={refreshAll}
      />

      <Modal visible={isFormOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsFormOpen(false)}>
        <PunchFormPopup
          onClose={() => setIsFormOpen(false)}
          prefillEmployeeId=""
          prefillDate=""
          onSuccess={() => { setIsFormOpen(false); refreshAll() }}
        />
      </Modal>
    </ScrollView>
  )
}

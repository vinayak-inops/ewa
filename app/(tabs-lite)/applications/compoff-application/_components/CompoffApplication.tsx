import { useGetRequest } from "@/hooks/api/useGetRequest"
import { useScreenPermissions } from "@/hooks/auth/useScreenPermissions"
import { RootState } from "@/store"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Modal, RefreshControl, ScrollView } from "react-native"
import { useSelector } from "react-redux"
import CompoffFormPopup from "./compoff-form-popup"
import CompoffRequestsPopup from "./compoff-requests-popup"
import CompoffTable, { CompoffRecord, CompoffTabKey } from "./compoff-table"

interface Props {
  isSelfPermission?: boolean
  isAllPermission?: boolean
  refreshTrigger?: number
}

export default function CompoffApplication({ isSelfPermission = false, isAllPermission = false, refreshTrigger }: Props) {
  const [applications, setApplications] = useState<CompoffRecord[]>([])
  const [activeTab, setActiveTab] = useState<CompoffTabKey>("all")
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const itemsPerPage = 10
  const collectionName = "leaveApplication"

  const employeeId = useSelector((s: RootState) => s.role.employeeId) ?? ""
  const tenantCode = useSelector((s: RootState) => s.role.org) ?? ""

  const applierPerms = useScreenPermissions('applicationApplier', 'compOff')

  const canCancel = !!applierPerms?.cancel

  const offset = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage])

  const buildRequestData = useMemo(() => {
    const data: any[] = [
      { field: "tenantCode",   value: tenantCode,            operator: "eq"   },
      { field: "createdOn",    value: "",                    operator: "desc" },
      { field: "workflowName", value: "compOff Application", operator: "eq"   },
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

  const { loading, refetch: otRefetch } = useGetRequest<any[]>({
    url: `${collectionName}/search?offset=${offset}&limit=${itemsPerPage}`,
    method: "POST", data: buildRequestData,
    onSuccess: (d: any) => {
      if (!d || !Array.isArray(d)) { setApplications([]); return }
      setApplications(d.filter((i: any) => i && typeof i === "object" && Object.keys(i).length > 0).map((i: any) => ({
        _id: i._id || "", employeeID: i.employeeID || "",
        fromDate: i.fromDate || "", toDate: i.toDate || "",
        fromDuration: i.fromDuration || "", toDuration: i.toDuration || "",
        availForDates: i.availForDates || [],
        workflowState: i.workflowState || "INITIATED",
        remarks: i.remarks || "", createdOn: i.createdOn || "",
        uploadedBy: i.uploadedBy || i.createdBy || "",
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
    if (shouldFetch) { otRefetch(); refetchCount() }
  }, [otRefetch, refetchCount, activeTab, canCancel])

  const handlePullRefresh = useCallback(() => {
    setIsRefreshing(true)
    refreshAll()
    setIsRefreshing(false)
  }, [refreshAll])

  useEffect(() => { refreshAll() }, [activeTab, employeeId, currentPage, refreshTrigger, canCancel])

  const handleOpenDetails = useCallback((row: any) => {
    if (!row?._id) return
    setSelectedRequestId(row._id)
    setIsPopupOpen(true)
  }, [])

  const handleTabChange = useCallback((tab: CompoffTabKey) => {
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
      <CompoffTable
        data={applications}
        onOpenDetails={handleOpenDetails}
        loading={loading}
        onNew={() => setIsFormOpen(true)}
        title="Comp Off Applications"
        subtitle="View and manage your compensatory off requests"
        activeTab={activeTab}
        onTabChange={handleTabChange}
        externalPagination={{ currentPage, totalPages, totalItems: totalCount, itemsPerPage, startIndex, endIndex, onPageChange: (p: number) => setCurrentPage(p) }}
      />

      <CompoffRequestsPopup
        isOpen={isPopupOpen}
        onClose={() => { setIsPopupOpen(false); setSelectedRequestId(null) }}
        selectedRequestId={selectedRequestId}
        initialSelectedRequest={null}
        userMode="user"
        sourceCollectionName={collectionName}
        onActionSuccess={refreshAll}
      />

      <Modal visible={isFormOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsFormOpen(false)}>
        <CompoffFormPopup
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => { setIsFormOpen(false); refreshAll() }}
        />
      </Modal>
    </ScrollView>
  )
}

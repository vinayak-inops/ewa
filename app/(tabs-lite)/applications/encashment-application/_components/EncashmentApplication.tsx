import { useGetRequest } from "@/hooks/api/useGetRequest"
import { useScreenPermissions } from "@/hooks/auth/useScreenPermissions"
import { RootState } from "@/store"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { RefreshControl, ScrollView } from "react-native"
import { useSelector } from "react-redux"
import EncashmentFormPopup from "./encashment-form-popup"
import EncashmentRequestsPopup from "./encashment-requests-popup"
import EncashmentTable, { EncashmentRecord, EncashmentTabKey } from "./encashment-table"

interface Props {
  isSelfPermission?: boolean
  isAllPermission?: boolean
  refreshTrigger?: number
}

export default function EncashmentApplication({ isSelfPermission = false, isAllPermission = false, refreshTrigger }: Props) {
  const [applications, setApplications] = useState<EncashmentRecord[]>([])
  const [activeTab, setActiveTab] = useState<EncashmentTabKey>("all")
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const itemsPerPage = 10
  const collectionName = "leaveEncashmentApplication"

  const employeeId = useSelector((s: RootState) => s.role.employeeId) ?? ""
  const tenantCode = useSelector((s: RootState) => s.role.org) ?? ""

  const applierPerms = useScreenPermissions('applicationApplier', 'encashment')

  const canCancel = !!applierPerms?.cancel

  const offset = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage])

  const buildRequestData = useMemo(() => {
    const data: any[] = [
      { field: "tenantCode", value: tenantCode, operator: "eq" },
      { field: "createdOn",  value: "",         operator: "desc" },
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
        leaveCode: i.leaveCode || "",
        balance: typeof i.balance === "number" ? i.balance : Number(i.balance ?? 0),
        appliedDate: i.appliedDate || "",
        workflowState: i.workflowState || "INITIATED",
        uploadedBy: i.uploadedBy || i.createdBy || "",
        createdOn: i.createdOn || "",
        remarks: i.remarks || "",
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

  const handleTabChange = useCallback((tab: EncashmentTabKey) => {
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
      <EncashmentTable
        data={applications}
        onOpenDetails={row => { if (!row?._id) return; setSelectedRequestId(row._id); setIsPopupOpen(true) }}
        loading={loading}
        onNew={() => setIsFormOpen(true)}
        title="Encashment Applications"
        subtitle="View and manage your leave encashment requests"
        activeTab={activeTab}
        onTabChange={handleTabChange}
        externalPagination={{ currentPage, totalPages, totalItems: totalCount, itemsPerPage, startIndex, endIndex, onPageChange: (p: number) => setCurrentPage(p) }}
      />

      <EncashmentRequestsPopup
        isOpen={isPopupOpen}
        onClose={() => { setIsPopupOpen(false); setSelectedRequestId(null) }}
        selectedRequestId={selectedRequestId}
        initialSelectedRequest={null}
        userMode="user"
        sourceCollectionName={collectionName}
        onActionSuccess={refreshAll}
      />

      <EncashmentFormPopup
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={() => { setIsFormOpen(false); refreshAll() }}
      />
    </ScrollView>
  )
}

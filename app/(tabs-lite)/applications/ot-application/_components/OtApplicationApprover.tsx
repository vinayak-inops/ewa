import { useGetRequest } from "@/hooks/api/useGetRequest"
import { useScreenPermissions } from "@/hooks/auth/useScreenPermissions"
import { RootState } from "@/store"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { RefreshControl, ScrollView } from "react-native"
import { useSelector } from "react-redux"
import OtRequestsPopup from "./ot-requests-popup"
import OtTable, { OtRecord, OtTabKey } from "./ot-table"

export default function OtApplicationApprover() {
  const [applications, setApplications] = useState<OtRecord[]>([])
  const [activeTab, setActiveTab] = useState<OtTabKey>("pending")
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const itemsPerPage = 10

  const employeeId = useSelector((s: RootState) => s.role.employeeId) ?? ""
  const tenantCode = useSelector((s: RootState) => s.role.org) ?? ""

  const approverPerms = useScreenPermissions('applicationApprover', 'overtime')

  const canApprove = !!approverPerms?.approve
  const canReject  = !!approverPerms?.reject
  const canCancel  = !!approverPerms?.cancel

  const offset = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage])

  const collectionName = useMemo(() => {
    if (activeTab === "pending" || activeTab === "failed" || activeTab === "all") return "outDutyApplication"
    return "outDutyApplicationTransaction"
  }, [activeTab])

  const buildRequestData = useMemo(() => {
    const data: any[] = [
      { field: "tenantCode", value: tenantCode, operator: "eq" },
      { field: "createdOn",  value: "",          operator: "desc" },
    ]
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
  }, [activeTab, tenantCode, employeeId])

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
        _id: i._id || "", employeeID: i.employeeID || "", outDutyType: i.outDutyType || "",
        fromDate: i.fromDate || "", toDate: i.toDate || "",
        duration: i.duration || { noOfDays: 0, noOfHours: 0 },
        Reason: i.Reason || "", OutDutyAddress: i.OutDutyAddress || "",
        workflowState: i.workflowState || "INITIATED", status: i.workflowState || "INITIATED",
        uploadedBy: i.uploadedBy || "", createdOn: i.createdOn || "", remarks: i.remarks || "",
      })))
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
    if (shouldFetch) { refetch(); refetchCount() }
  }, [refetch, refetchCount, activeTab, canApprove, canReject, canCancel])

  const handlePullRefresh = useCallback(() => {
    setIsRefreshing(true)
    refreshAll()
    setIsRefreshing(false)
  }, [refreshAll])

  useEffect(() => { refreshAll() }, [activeTab, employeeId, currentPage, canApprove, canReject, canCancel])

  const handleTabChange = useCallback((tab: OtTabKey) => {
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
      <OtTable
        data={applications}
        onOpenDetails={row => { if (!row?._id) return; setSelectedRequestId(row._id); setIsPopupOpen(true) }}
        loading={loading}
        title="OT Approvals"
        subtitle="Review and action out duty applications assigned to you"
        activeTab={activeTab}
        onTabChange={handleTabChange}
        externalPagination={{ currentPage, totalPages, totalItems: totalCount, itemsPerPage, startIndex, endIndex, onPageChange: setCurrentPage }}
      />

      <OtRequestsPopup
        isOpen={isPopupOpen}
        onClose={() => { setIsPopupOpen(false); setSelectedRequestId(null) }}
        selectedRequestId={selectedRequestId}
        initialSelectedRequest={null}
        userMode="approver"
        sourceCollectionName={collectionName}
        onActionSuccess={refreshAll}
      />
    </ScrollView>
  )
}

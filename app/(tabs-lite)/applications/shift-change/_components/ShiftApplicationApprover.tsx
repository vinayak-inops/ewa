import { useGetRequest } from "@/hooks/api/useGetRequest"
import { useScreenPermissions } from "@/hooks/auth/useScreenPermissions"
import { RootState } from "@/store"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { RefreshControl, ScrollView } from "react-native"
import { useSelector } from "react-redux"
import ApplicationTable from "./application-table"
import ShiftRequestsPopup from "./shift-requests-popup"

interface ShiftApplicationApproverProps {
  isApprovalPermission?: boolean
}

type TabKey = "all" | "pending" | "approved" | "rejected" | "cancelled" | "failed"

export default function ShiftApplicationApprover({ isApprovalPermission: _isApprovalPermission = false }: ShiftApplicationApproverProps) {
  const [otApplications, setOtApplications] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>("pending")
  const [searchField, setSearchField] = useState<string>("employeeID")
  const [searchValue, setSearchValue] = useState<string>("")
  const [debouncedSearchValue, setDebouncedSearchValue] = useState<string>("")
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const itemsPerPage = 10
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const employeeId = useSelector((s: RootState) => s.role.employeeId) ?? ""
  const tenantCode = useSelector((s: RootState) => s.role.org) ?? ""

  const approverPerms = useScreenPermissions('applicationApprover', 'shiftChange')

  const canApprove = !!approverPerms?.approve
  const canReject  = !!approverPerms?.reject
  const canCancel  = !!approverPerms?.cancel

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchValue(searchValue)
      setCurrentPage(1)
    }, 300)
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [searchValue])

  const offset = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage])

  const collectionName = useMemo(() => {
    if (activeTab === "pending" || activeTab === "failed") return "shiftChangeApplication"
    if (activeTab === "cancelled" || activeTab === "rejected" || activeTab === "approved") return "shiftChangeApplicationTransaction"
    return "shiftChangeApplication"
  }, [activeTab])

  const buildRequestData = useMemo(() => {
    const trimmedSearch = debouncedSearchValue.trim()
    const requestData: any[] = [
      { field: "tenantCode", value: tenantCode, operator: "eq" },
      { field: "createdOn", value: "", operator: "desc" },
    ]
    if (activeTab === "pending" && employeeId)
      requestData.push({ field: "approverID", value: employeeId, operator: "eq" })
    if (activeTab === "failed" && employeeId) {
      requestData.push({ field: "workflowState", value: "FAILED", operator: "like" })
      requestData.push({ field: "approverID", value: employeeId, operator: "eq" })
    }
    if (activeTab === "approved" && employeeId)
      requestData.push({ field: "approvedBy", value: employeeId, operator: "eq" })
    if (activeTab === "rejected" && employeeId)
      requestData.push({ field: "rejectedBy", value: employeeId, operator: "eq" })
    if (activeTab === "cancelled" && employeeId)
      requestData.push({ field: "cancelledBy", value: employeeId, operator: "eq" })
    if (trimmedSearch)
      requestData.push({ field: searchField, operator: "like", value: trimmedSearch })
    return requestData
  }, [activeTab, tenantCode, employeeId, debouncedSearchValue, searchField])

  const { refetch: refetchCount } = useGetRequest<any>({
    url: `${collectionName}/count`,
    method: "POST",
    data: buildRequestData,
    onSuccess: (data: any) => {
      if (data !== null && data !== undefined) setTotalCount(data || 0)
    },
  })

  const { refetch: refetchApprovedCount } = useGetRequest<number>({
    url: `${collectionName}/count`,
    method: "POST",
    data: [...buildRequestData, { field: "workflowState", operator: "eq", value: "APPROVED" }],
  })

  const { refetch: refetchRejectedCount } = useGetRequest<number>({
    url: `${collectionName}/count`,
    method: "POST",
    data: [...buildRequestData, { field: "workflowState", operator: "eq", value: "REJECTED" }],
  })

  const { refetch: refetchCancelledCount } = useGetRequest<number>({
    url: `${collectionName}/count`,
    method: "POST",
    data: [...buildRequestData, { field: "workflowState", operator: "in", value: ["CANCELLED", "CANCEL"] }],
  })

  const { loading: isLoading, refetch: otRefetch } = useGetRequest<any[]>({
    url: `${collectionName}/search?offset=${offset}&limit=${itemsPerPage}`,
    method: "POST",
    data: buildRequestData,
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
  })

  const refreshAll = useCallback(() => {
    const shouldFetch =
      activeTab === "pending" ||
      activeTab === "failed" ||
      (activeTab === "approved" && canApprove) ||
      (activeTab === "rejected" && canReject) ||
      (activeTab === "cancelled" && canCancel)
    if (shouldFetch) { otRefetch(); refetchCount() }
    if (activeTab === "approved" && canApprove) refetchApprovedCount()
    if (activeTab === "rejected" && canReject) refetchRejectedCount()
    if (activeTab === "cancelled" && canCancel) refetchCancelledCount()
  }, [activeTab, canApprove, canReject, canCancel, otRefetch, refetchCount, refetchApprovedCount, refetchRejectedCount, refetchCancelledCount])

  const handlePullRefresh = useCallback(() => {
    setIsRefreshing(true)
    refreshAll()
    setIsRefreshing(false)
  }, [refreshAll])

  useEffect(() => {
    const shouldFetch =
      activeTab === "pending" ||
      activeTab === "failed" ||
      (activeTab === "approved" && canApprove) ||
      (activeTab === "rejected" && canReject) ||
      (activeTab === "cancelled" && canCancel)
    if (shouldFetch) { otRefetch(); refetchCount() }
    if (activeTab === "approved" && canApprove) refetchApprovedCount()
    if (activeTab === "rejected" && canReject) refetchRejectedCount()
    if (activeTab === "cancelled" && canCancel) refetchCancelledCount()
  }, [activeTab, employeeId, canApprove, canReject, canCancel, debouncedSearchValue, searchField, currentPage])

  const handleOpenDetails = useCallback((row: any) => {
    if (!row?._id) return
    setSelectedRequestId(row._id)
    setIsPopupOpen(true)
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
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
        data={otApplications}
        onOpenDetails={handleOpenDetails}
        loading={isLoading}
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab as TabKey); setCurrentPage(1) }}
        externalPagination={{
          currentPage,
          totalPages,
          totalItems: totalCount,
          itemsPerPage,
          startIndex,
          endIndex,
          onPageChange: handlePageChange,
        }}
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
    </ScrollView>
  )
}

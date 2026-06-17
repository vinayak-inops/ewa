import { useGetRequest } from "@/hooks/api/useGetRequest"
import { useScreenPermissions } from "@/hooks/auth/useScreenPermissions"
import { RootState } from "@/store"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { RefreshControl, ScrollView } from "react-native"
import { useSelector } from "react-redux"
import ApplicationTable from "./application-table"
import ShiftRequestsPopup from "./shift-requests-popup"
import ShiftChangeFormPopup from "./ShiftChangeFormPopup"

type TabKey = "all" | "pending" | "approved" | "rejected" | "cancelled" | "failed"

interface ShiftApplicationProps {
  isSelfPermission?: boolean
  isAllPermission?: boolean
  isApprovalPermission?: boolean
  onOpenForm?: () => void
}

export default function ShiftApplication({
  isSelfPermission = false,
  isAllPermission = false,
  isApprovalPermission: _isApprovalPermission = false,
  onOpenForm,
}: ShiftApplicationProps) {
  const [otApplications, setOtApplications] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const [searchField, setSearchField] = useState<string>("employeeID")
  const [searchValue, setSearchValue] = useState<string>("")
  const [debouncedSearchValue, setDebouncedSearchValue] = useState<string>("")
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const itemsPerPage = 10
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const employeeId = useSelector((s: RootState) => s.role.employeeId) ?? ""
  const tenantCode = useSelector((s: RootState) => s.role.org) ?? ""

  const applierPerms = useScreenPermissions('applicationApplier', 'shiftChange')

  const canCancel = !!applierPerms?.cancel

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

  const collectionName = "shiftChangeApplication"

  const buildRequestData = useMemo(() => {
    const trimmedSearch = debouncedSearchValue.trim()
    const requestData: any[] = [
      { field: "tenantCode", value: tenantCode, operator: "eq" },
      { field: "createdOn", value: "", operator: "desc" },
    ]

    const addEmployeeFilter = () => {
      if (!employeeId) return
      if (isSelfPermission) {
        requestData.push({ field: "employeeID", value: employeeId, operator: "eq" })
      } else if (isAllPermission) {
        requestData.push({ field: "createdBy", value: employeeId, operator: "eq" })
      }
    }

    if (activeTab === "all") {
      addEmployeeFilter()
    }

    if (activeTab === "pending") {
      requestData.push({ field: "workflowState", value: ["APPROVED", "REJECTED", "CANCELLED", "FAILED"], operator: "nin" })
      addEmployeeFilter()
    }

    if (activeTab === "failed") {
      requestData.push({ field: "workflowState", value: "FAILED", operator: "like" })
      addEmployeeFilter()
    }

    if (activeTab === "approved") {
      requestData.push({ field: "workflowState", value: "APPROVED", operator: "eq" })
      addEmployeeFilter()
    }

    if (activeTab === "rejected") {
      requestData.push({ field: "workflowState", value: "REJECTED", operator: "like" })
      addEmployeeFilter()
    }

    if (activeTab === "cancelled") {
      requestData.push({ field: "workflowState", value: "CANCELLED", operator: "like" })
      addEmployeeFilter()
    }

    if (trimmedSearch) {
      requestData.push({ field: searchField, operator: "like", value: trimmedSearch })
    }

    return requestData
  }, [activeTab, tenantCode, employeeId, isSelfPermission, isAllPermission, debouncedSearchValue, searchField])

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
      console.log("Shift Change Applications Data:", data)
      if (!data || !Array.isArray(data)) { setOtApplications([]); return }
      const updatedData = data
        .filter((item: any) => item && typeof item === "object" && Object.keys(item).length > 0)
        .map((item: any) => ({
          _id: item._id || "",
          employeeID: item.employeeID || "",
          appliedDate: item.appliedDate || item.createdOn || "",
          fromDate: item.fromDate || "",
          toDate: item.toDate || "",
          shiftName: item.shift?.shiftName || item.shiftName || "",
          shiftStart: item.shift?.shiftStart || item.shiftStart || item.startTime || item.shiftFrom || "",
          shiftEnd: item.shift?.shiftEnd || item.shiftEnd || item.endTime || item.shiftTo || "",
          lunchStart: item.shift?.lunchStart || item.lunchStart || item.breakStart || item.lunchFrom || "",
          lunchEnd: item.shift?.lunchEnd || item.lunchEnd || item.breakEnd || item.lunchTo || "",
          remarks: item.remarks || item.Remarks || "",
          workflowState: item.workflowState || "",
          status: item.status || item.workflowState || "INITIATED",
        }))
      setOtApplications([...updatedData])
    },
  })

  const refreshAll = useCallback(() => {
    otRefetch()
    refetchCount()
    refetchApprovedCount()
    refetchRejectedCount()
    if (canCancel) refetchCancelledCount()
  }, [otRefetch, refetchCount, refetchApprovedCount, refetchRejectedCount, refetchCancelledCount, canCancel])

  const handlePullRefresh = useCallback(() => {
    setIsRefreshing(true)
    refreshAll()
    setIsRefreshing(false)
  }, [refreshAll])

  useEffect(() => {
    otRefetch()
    refetchCount()
    if (activeTab === "approved") refetchApprovedCount()
    if (activeTab === "rejected") refetchRejectedCount()
    if (activeTab === "cancelled" && canCancel) refetchCancelledCount()
  }, [activeTab, isSelfPermission, isAllPermission, employeeId, canCancel, debouncedSearchValue, searchField, currentPage])

  const handleOpenDetails = (row: any) => {
    if (!row?._id) return
    setSelectedRequestId(row._id)
    setIsPopupOpen(true)
  }

  const handlePageChange = useCallback((page: number) => setCurrentPage(page), [])

  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount)

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handlePullRefresh} />
      }
    >
      {/* <View className="px-0 py-3 flex-row items-center justify-between">
        <View>
          <View className="flex-row items-center gap-2">
            <Clock size={20} color="#4c008f" />
            <Text className="text-lg font-semibold text-gray-900 tracking-tight">My Shift Applications</Text>
          </View>
          <Text className="text-xs text-gray-500 mt-0.5">View and track your shift change applications</Text>
        </View>
        <TouchableOpacity
          onPress={() => onOpenForm ? onOpenForm() : setIsFormOpen(true)}
          className="flex-row items-center gap-1.5 bg-[#4c008f] px-3 py-2 rounded-lg"
        >
          <Plus size={14} color="#ffffff" />
          <Text className="text-white text-xs font-semibold">New</Text>
        </TouchableOpacity>
      </View>

      <ApplicationFilters
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onApply={({ field, value }) => { setSearchField(field); setSearchValue(value) }}
        otRefetch={refreshAll}
        isSelfPermission={isSelfPermission}
        isAllPermission={isAllPermission}
      /> */}

      <ApplicationTable
        data={otApplications}
        onOpenDetails={handleOpenDetails}
        onNew={() => onOpenForm ? onOpenForm() : setIsFormOpen(true)}
        loading={isLoading}
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
        isSelfPermission={isSelfPermission}
        isAllPermission={isAllPermission}
        userMode="user"
        onActionSuccess={refreshAll}
      />

      <ShiftChangeFormPopup
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={() => { setIsFormOpen(false); refreshAll() }}
      />
    </ScrollView>
  )
}

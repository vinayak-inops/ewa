import { useGetRequest } from "@/hooks/api/useGetRequest"
import { useScreenPermissions } from '@/hooks/auth/useScreenPermissions'
import { RootState } from '@/store'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshControl, ScrollView } from 'react-native'
import { useSelector } from 'react-redux'
import ApplicationTable, { LeaveTabKey } from './application-table'
import LeaveApplicationRequestsPopup from './leave-requests-popup'

interface LeaveApplicationApproverProps {
  isApprovalPermission?: boolean
}

export default function LeaveApplicationApprover({ isApprovalPermission: _isApprovalPermission = false }: LeaveApplicationApproverProps) {
  const [applications, setApplications] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<LeaveTabKey>('pending')
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const itemsPerPage = 10

  const employeeId = useSelector((s: RootState) => s.role.employeeId) ?? ''
  const tenantCode = useSelector((s: RootState) => s.role.org) ?? ''

  const approverPerms = useScreenPermissions('applicationApprover', 'leave')

  const canApprove = !!approverPerms?.approve
  const canReject  = !!approverPerms?.reject
  const canCancel  = !!approverPerms?.cancel

  const offset = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage])

  const collectionName = useMemo(() => {
    if (activeTab === 'pending' || activeTab === 'failed' || activeTab === 'all') return 'leaveApplication'
    return 'leaveApplicationTransaction'
  }, [activeTab])

  const buildRequestData = useMemo(() => {
    const data: any[] = [
      { field: 'tenantCode', value: tenantCode, operator: 'eq' },
      { field: 'createdOn',  value: '',         operator: 'desc' },
    ]
    if (activeTab === 'pending' && employeeId)
      data.push({ field: 'approverID', value: employeeId, operator: 'eq' })
    if (activeTab === 'failed' && employeeId) {
      data.push({ field: 'workflowState', value: 'FAILED', operator: 'like' })
      data.push({ field: 'approverID', value: employeeId, operator: 'eq' })
    }
    if (activeTab === 'approved' && employeeId)
      data.push({ field: 'approvedBy', value: employeeId, operator: 'eq' })
    if (activeTab === 'rejected' && employeeId)
      data.push({ field: 'rejectedBy', value: employeeId, operator: 'eq' })
    if (activeTab === 'cancelled' && employeeId)
      data.push({ field: 'cancelledBy', value: employeeId, operator: 'eq' })
    return data
  }, [activeTab, tenantCode, employeeId])

  const { refetch: refetchCount } = useGetRequest<any>({
    url: `${collectionName}/count`, method: 'POST', data: buildRequestData,
    onSuccess: (d: any) => { if (d !== null && d !== undefined) setTotalCount(d || 0) },
    onError: () => {},
  })

  const { loading, refetch } = useGetRequest<any[]>({
    url: `${collectionName}/search?offset=${offset}&limit=${itemsPerPage}`,
    method: 'POST', data: buildRequestData,
    onSuccess: (d: any) => {
      console.log('Leave Applications Data:', d)
      if (!d || !Array.isArray(d)) { setApplications([]); return }
      setApplications(
        d.filter((i: any) => i && typeof i === 'object' && Object.keys(i).length > 0)
         .map((i: any) => ({
           _id: i._id || '',
           uploadedBy: i.uploadedBy || '',
           createdOn: i.createdOn || '',
           employeeID: i.employeeID || '',
           employeeName: i.employeeName || '',
           fromDate: i.fromDate || '',
           toDate: i.toDate || '',
           uploadTime: i.uploadTime || '',
           appliedDate: i.appliedDate || '',
           workflowState: i.workflowState || 'INITIATED',
           remarks: i.remarks || '',
         }))
      )
    },
    onError: () => {},
  })

  const refreshAll = useCallback(() => {
    const shouldFetch =
      activeTab === 'pending' ||
      activeTab === 'failed' ||
      activeTab === 'all' ||
      (activeTab === 'approved' && canApprove) ||
      (activeTab === 'rejected' && canReject) ||
      (activeTab === 'cancelled' && canCancel)
    if (shouldFetch) { refetch(); refetchCount() }
  }, [refetch, refetchCount, activeTab, canApprove, canReject, canCancel])

  const handlePullRefresh = useCallback(() => {
    setIsRefreshing(true)
    refreshAll()
    setIsRefreshing(false)
  }, [refreshAll])

  useEffect(() => { refreshAll() }, [activeTab, employeeId, currentPage, canApprove, canReject, canCancel])

  const handleTabChange = useCallback((tab: LeaveTabKey) => {
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
        title="Leave Approvals"
        subtitle="Review and action leave applications assigned to you"
        activeTab={activeTab}
        onTabChange={handleTabChange}
        externalPagination={{ currentPage, totalPages, totalItems: totalCount, itemsPerPage, startIndex, endIndex, onPageChange: setCurrentPage }}
      />

      <LeaveApplicationRequestsPopup
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

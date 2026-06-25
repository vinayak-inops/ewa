import { useRolePermissions } from '@/hooks/api/useRolePermissions'
import { useScreenPermissions } from '@/hooks/auth/useScreenPermissions'
import { useLocalSearchParams } from 'expo-router'
import React, { useState } from 'react'
import { Text, View } from 'react-native'
import LeaveApplication from './_components/leave-application/LeaveApplication'
import LeaveApplicationApprover from './_components/leave-application/LeaveApplicationApprover'
import NewSpecialLeaveRequestModal from './_components/special-leave-application/NewSpecialLeaveRequestModal'
import SpecialLeaveApplication from './_components/special-leave-application/SpecialLeaveApplication'
import SpecialLeaveApplicationApprover from './_components/special-leave-application/SpecialLeaveApplicationApprover'

export default function LeaveApplicationPage() {
  const { mode, application } = useLocalSearchParams<{ mode?: string; application?: string }>()
  
  const [showLeaveRequest, setShowLeaveRequest] = useState(false)
  const [showSpecialRequest, setShowSpecialRequest] = useState(false)
  const [leaveRefresh, setLeaveRefresh] = useState(0)
  const [specialRefresh, setSpecialRefresh] = useState(0)

  const { loading } = useRolePermissions()

  // Permissions for Leave
  const leaveApplierPerms = useScreenPermissions('applicationApplier', 'leave')
  const leaveApproverPerms = useScreenPermissions('applicationApprover', 'leave')

  // Permissions for Special Leave
  const specialApplierPerms = useScreenPermissions('applicationApplier', 'specialLeave')
  const specialApproverPerms = useScreenPermissions('applicationApprover', 'specialLeave')

  // Determine which application to show
  const applicationType = application || 'leave' // default to 'leave' if not specified

  // Leave permissions
  const isLeaveSelfPermission = loading ? false : !!(leaveApplierPerms?.self)
  const isLeaveAllPermission = loading ? false : !!(leaveApplierPerms?.all)
  const isLeaveApprovalPermission = loading ? false : !!(leaveApproverPerms?.approve || leaveApproverPerms?.reject || leaveApproverPerms?.cancel)

  // Special Leave permissions
  const isSpecialSelfPermission = loading ? false : !!(specialApplierPerms?.self)
  const isSpecialAllPermission = loading ? false : !!(specialApplierPerms?.all)
  const isSpecialApprovalPermission = loading ? false : !!(specialApproverPerms?.approve || specialApproverPerms?.reject || specialApproverPerms?.cancel)

  // Determine visibility based on mode and application type
  const canViewLeaveApps = mode !== 'approver' && (loading ? false : !!(isLeaveSelfPermission || isLeaveAllPermission))
  const isLeaveApprover = mode !== 'applier' && (loading ? false : isLeaveApprovalPermission)

  const canViewSpecialApps = mode !== 'approver' && (loading ? false : !!(isSpecialSelfPermission || isSpecialAllPermission))
  const isSpecialApprover = mode !== 'applier' && (loading ? false : isSpecialApprovalPermission)

  // Show appropriate content based on URL parameters
  const renderContent = () => {
    // Special Leave Application Flow
    if (applicationType === 'special') {
      if (mode === 'applier') {
        // Applier mode for Special Leave
        if (!canViewSpecialApps) {
          return (
            <View className="px-5 py-10">
              <View className="max-w-lg self-center w-full border border-yellow-200 bg-yellow-50 rounded-lg p-6 items-center">
                <Text className="text-sm font-semibold text-gray-800 text-center">Access Restricted</Text>
                <Text className="text-xs text-gray-500 mt-1 text-center leading-relaxed">
                  You do not have permission to view Special Leave Applications. Please contact your administrator.
                </Text>
              </View>
            </View>
          )
        }
        
        return (
          <>
            <SpecialLeaveApplication
              isSelfPermission={isSpecialSelfPermission}
              isAllPermission={isSpecialAllPermission}
              refreshTrigger={specialRefresh}
            />
            
            {/* Show New Request Button if needed */}
            {canViewSpecialApps && (
              <View className="px-4 py-4">
                {/* You can add a button here to trigger new special leave request */}
              </View>
            )}
          </>
        )
      } 
      else if (mode === 'approver') {
        // Approver mode for Special Leave
        if (!isSpecialApprover) {
          return (
            <View className="px-5 py-10">
              <View className="max-w-lg self-center w-full border border-yellow-200 bg-yellow-50 rounded-lg p-6 items-center">
                <Text className="text-sm font-semibold text-gray-800 text-center">Access Restricted</Text>
                <Text className="text-xs text-gray-500 mt-1 text-center leading-relaxed">
                  You do not have permission to approve Special Leave Applications.
                </Text>
              </View>
            </View>
          )
        }
        
        return (
          <SpecialLeaveApplicationApprover isApprovalPermission={isSpecialApprovalPermission} />
        )
      }
    }
    
    // Leave Application Flow (default)
    if (mode === 'applier') {
      // Applier mode for Leave
      if (!canViewLeaveApps) {
        return (
          <View className="px-5 py-10">
            <View className="max-w-lg self-center w-full border border-yellow-200 bg-yellow-50 rounded-lg p-6 items-center">
              <Text className="text-sm font-semibold text-gray-800 text-center">Access Restricted</Text>
              <Text className="text-xs text-gray-500 mt-1 text-center leading-relaxed">
                You do not have permission to view Leave Applications. Please contact your administrator.
              </Text>
            </View>
          </View>
        )
      }
      
      return (
        <>
          <LeaveApplication
            isSelfPermission={isLeaveSelfPermission}
            isAllPermission={isLeaveAllPermission}
            refreshTrigger={leaveRefresh}
          />
          
          {/* Show New Request Button if needed */}
          {canViewLeaveApps && (
            <View className="px-4 py-4">
              {/* You can add a button here to trigger new leave request */}
            </View>
          )}
        </>
      )
    } 
    else if (mode === 'approver') {
      // Approver mode for Leave
      if (!isLeaveApprover) {
        return (
          <View className="px-5 py-10">
            <View className="max-w-lg self-center w-full border border-yellow-200 bg-yellow-50 rounded-lg p-6 items-center">
              <Text className="text-sm font-semibold text-gray-800 text-center">Access Restricted</Text>
              <Text className="text-xs text-gray-500 mt-1 text-center leading-relaxed">
                You do not have permission to approve Leave Applications.
              </Text>
            </View>
          </View>
        )
      }
      
      return <LeaveApplicationApprover />
    }
    
    // No valid mode specified
    return (
      <View className="px-5 py-10">
        <View className="max-w-lg self-center w-full border border-yellow-200 bg-yellow-50 rounded-lg p-6 items-center">
          <Text className="text-sm font-semibold text-gray-800 text-center">Invalid Access</Text>
          <Text className="text-xs text-gray-500 mt-1 text-center leading-relaxed">
            Please specify a valid mode (applier or approver) in the URL.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <>
      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>

      {/* Modals - Only show for special leave application in applier mode */}
      {applicationType === 'special' && mode === 'applier' && (
        <>
          <NewSpecialLeaveRequestModal
            isOpen={showSpecialRequest}
            onClose={() => setShowSpecialRequest(false)}
            onSuccess={() => setSpecialRefresh(n => n + 1)}
          />
        </>
      )}
    </>
  )
}
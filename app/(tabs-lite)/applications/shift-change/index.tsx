import { useRolePermissions } from "@/hooks/api/useRolePermissions"
import { useScreenPermissions } from "@/hooks/auth/useScreenPermissions"
import { useLocalSearchParams } from "expo-router"
import React, { useState } from "react"
import { Text, View } from "react-native"
import ShiftApplication from "./_components/ShiftApplication"
import ShiftApplicationApprover from "./_components/ShiftApplicationApprover"
import ShiftChangeFormPopup from "./_components/ShiftChangeFormPopup"

export default function ShiftChangePage() {
  const { mode } = useLocalSearchParams<{ mode?: string }>()

  const { loading } = useRolePermissions()
  const applierPerms = useScreenPermissions("applicationApplier", "shiftChange")
  const approverPerms = useScreenPermissions("applicationApprover", "shiftChange")

  const isSelfPermission = loading ? false : !!applierPerms?.self
  const isAllPermission  = loading ? false : !!applierPerms?.all
  const canViewApps = mode !== "approver" && (loading ? false : !!(applierPerms?.self || applierPerms?.all))
  const isApprover  = mode !== "applier"  && (loading ? false : !!(approverPerms?.approve || approverPerms?.reject || approverPerms?.cancel))

  const [isFormOpen, setIsFormOpen] = useState(false)

  return (
    <>
      <View style={{ flex: 1 }}>

        {canViewApps && (
          <ShiftApplication
            isSelfPermission={isSelfPermission}
            isAllPermission={isAllPermission}
            onOpenForm={() => setIsFormOpen(true)}
          />
        )}

        {isApprover && (
          <ShiftApplicationApprover />
        )}

        {!canViewApps && !isApprover && (
          <View className="px-5 py-10">
            <View className="max-w-lg self-center w-full border border-yellow-200 bg-yellow-50 rounded-lg p-6 items-center">
              <Text className="text-sm font-semibold text-gray-800 text-center">Access Restricted</Text>
              <Text className="text-xs text-gray-500 mt-1 text-center leading-relaxed">
                You do not have permission to view Shift Change Applications. Please contact your administrator.
              </Text>
            </View>
          </View>
        )}

      </View>

      <ShiftChangeFormPopup
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={() => setIsFormOpen(false)}
      />
    </>
  )
}

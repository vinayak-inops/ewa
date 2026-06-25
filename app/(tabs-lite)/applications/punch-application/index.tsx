import { useRolePermissions } from "@/hooks/api/useRolePermissions"
import { useScreenPermissions } from "@/hooks/auth/useScreenPermissions"
import { useLocalSearchParams } from "expo-router"
import React, { useState } from "react"
import { Text, View } from "react-native"
import PunchApplication from "./_components/PunchApplication"
import PunchApplicationApprover from "./_components/PunchApplicationApprover"

export default function PunchApplicationPage() {
  const { mode } = useLocalSearchParams<{ mode?: string }>()

  const { loading } = useRolePermissions()

  const applierPerms  = useScreenPermissions("applicationApplier",  "punch")
  const approverPerms = useScreenPermissions("applicationApprover", "punch")

  const isSelfPermission = loading ? false : !!(applierPerms?.self)
  const isAllPermission  = loading ? false : !!(applierPerms?.all)

  const canViewApps = mode !== "approver" && (loading ? false : !!(isSelfPermission || isAllPermission))
  const isApprover  = mode !== "applier"  && (loading ? false : !!(approverPerms?.approve || approverPerms?.reject || approverPerms?.cancel))

  const [refreshTrigger] = useState(0)

  return (
    <View style={{ flex: 1 }}>

      {canViewApps && (
        <PunchApplication
          isSelfPermission={isSelfPermission}
          isAllPermission={isAllPermission}
          refreshTrigger={refreshTrigger}
        />
      )}

      {isApprover && (
        <PunchApplicationApprover />
      )}

      {!canViewApps && !isApprover && (
        <View className="px-5 py-10">
          <View className="max-w-lg self-center w-full border border-yellow-200 bg-yellow-50 rounded-lg p-6 items-center">
            <Text className="text-sm font-semibold text-gray-800 text-center">Access Restricted</Text>
            <Text className="text-xs text-gray-500 mt-1 text-center leading-relaxed">
              You do not have permission to view Punch Applications. Please contact your administrator.
            </Text>
          </View>
        </View>
      )}

    </View>
  )
}

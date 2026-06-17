import { useRolePermissions } from "@/hooks/api/useRolePermissions"
import { useScreenPermissions } from "@/hooks/auth/useScreenPermissions"
import { useLocalSearchParams } from "expo-router"
import React, { useState } from "react"
import { ScrollView, Text, View } from "react-native"
import CompoffApplication from "./_components/CompoffApplication"
import CompoffApplicationApprover from "./_components/CompoffApplicationApprover"

export default function CompoffApplicationPage() {
  const { mode } = useLocalSearchParams<{ mode?: string }>()

  const { loading } = useRolePermissions()

  const applierPerms  = useScreenPermissions("applicationApplier",  "compOff")
  const approverPerms = useScreenPermissions("applicationApprover", "compOff")

  const isSelfPermission = loading ? false : !!(applierPerms?.self)
  const isAllPermission  = loading ? false : !!(applierPerms?.all)

  const canViewApps = mode !== "approver" && (loading ? false : !!(isSelfPermission || isAllPermission))
  const isApprover  = mode !== "applier"  && (loading ? false : !!(approverPerms?.approve || approverPerms?.reject || approverPerms?.cancel))

  const [refreshTrigger] = useState(0)

  return (
    <ScrollView
      className="flex-1 bg-gray-100"
      contentContainerStyle={{ paddingBottom: 96 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="w-full">
        {canViewApps && (
          <View className="w-full">
            <CompoffApplication
              isSelfPermission={isSelfPermission}
              isAllPermission={isAllPermission}
              refreshTrigger={refreshTrigger}
            />
          </View>
        )}

        {isApprover && (
          <View className={`w-full ${canViewApps ? " mt-4 mb-6" : ""}`}>
            <CompoffApplicationApprover />
          </View>
        )}

        {!canViewApps && !isApprover && (
          <View className="px-5 py-10">
            <View className="max-w-lg self-center w-full border border-yellow-200 bg-yellow-50 rounded-lg p-6 items-center">
              <Text className="text-sm font-semibold text-gray-800 text-center">Access Restricted</Text>
              <Text className="text-xs text-gray-500 mt-1 text-center leading-relaxed">
                You do not have permission to view Comp Off Applications.
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

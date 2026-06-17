import { useRolePermissions } from "@/hooks/api/useRolePermissions"
import { useScreenPermissions } from "@/hooks/auth/useScreenPermissions"
import { useLocalSearchParams } from "expo-router"
import React, { useState } from "react"
import { Modal, ScrollView, Text, View } from "react-native"
import AttendancePunchPanel, { PunchRow } from "./_components/AttendancePunchPanel"
import EditPunchApplication from "./_components/EditPunchApplication"
import EditPunchApplicationApprover from "./_components/EditPunchApplicationApprover"
import EditPunchFormModal from "./_components/EditPunchFormModal"

interface EditPunchTarget {
  punch: PunchRow
  attendanceDate: string
  month: number
  year: number
}

export default function EditPunchPage() {
  const { mode } = useLocalSearchParams<{ mode?: string }>()

  const { loading } = useRolePermissions()

  const applierPerms  = useScreenPermissions("applicationApplier",  "editPunchApplication")
  const approverPerms = useScreenPermissions("applicationApprover", "editPunchApplication")

  const isSelfPermission = loading ? false : !!(applierPerms?.self)
  const isAllPermission  = loading ? false : !!(applierPerms?.all)

  const canViewApps = mode !== "approver" && (loading ? false : !!(isSelfPermission || isAllPermission))
  const isApprover  = mode !== "applier"  && (loading ? false : !!(approverPerms?.approve || approverPerms?.reject || approverPerms?.cancel))

  const [showAttendancePanel, setShowAttendancePanel] = useState(false)
  const [editTarget, setEditTarget] = useState<EditPunchTarget | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  return (
    <>
      <ScrollView
        className="flex-1 bg-gray-100"
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full">

          {canViewApps && (
            <>
              <View className="w-full">
                <EditPunchApplication
                  isSelfPermission={isSelfPermission}
                  isAllPermission={isAllPermission}
                  refreshTrigger={refreshTrigger}
                />
              </View>
            </>
          )}

          {isApprover && (
            <View className={`w-full ${canViewApps ? " mt-4 mb-6" : ""}`}>
              <EditPunchApplicationApprover />
            </View>
          )}

          {!canViewApps && !isApprover && (
            <View className="px-5 py-10">
              <View className="max-w-lg self-center w-full border border-yellow-200 bg-yellow-50 rounded-lg p-6 items-center">
                <Text className="text-sm font-semibold text-gray-800 text-center">Access Restricted</Text>
                <Text className="text-xs text-gray-500 mt-1 text-center leading-relaxed">
                  You do not have permission to view Edit Punch Applications. Please contact your administrator.
                </Text>
              </View>
            </View>
          )}

        </View>
      </ScrollView>

      <Modal
        visible={showAttendancePanel}
        animationType="slide"
        onRequestClose={() => setShowAttendancePanel(false)}
      >
        <AttendancePunchPanel
          onClose={() => setShowAttendancePanel(false)}
          onEditPunch={(punch, attendanceDate, month, year) => {
            setEditTarget({ punch, attendanceDate, month, year })
          }}
        />
      </Modal>

      <EditPunchFormModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        punchRecord={editTarget?.punch ?? null}
        attendanceDate={editTarget?.attendanceDate ?? ""}
        month={editTarget?.month ?? 0}
        year={editTarget?.year ?? 0}
        onSuccess={() => {
          setEditTarget(null)
          setShowAttendancePanel(false)
          setRefreshTrigger(n => n + 1)
        }}
      />
    </>
  )
}

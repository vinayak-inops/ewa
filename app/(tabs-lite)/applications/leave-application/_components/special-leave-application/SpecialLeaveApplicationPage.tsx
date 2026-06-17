import React, { useState } from "react"
import { ScrollView, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import SpecialLeaveApplication from "./SpecialLeaveApplication"
import SpecialLeaveApplicationApprover from "./SpecialLeaveApplicationApprover"
import NewSpecialLeaveRequestModal from "./NewSpecialLeaveRequestModal"

export default function SpecialLeaveApplicationPage() {
    // Permissions hardcoded to true — wire useRolePermissions here when available
    const canViewApps = true
    const isSelfPermission = true
    const isAllPermission = true
    const isApprover = true

    const [showNewRequest, setShowNewRequest] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    return (
        <ScrollView
            className="flex-1 bg-gray-100"
            contentContainerStyle={{ paddingBottom: 96 }}
            showsVerticalScrollIndicator={false}
        >
            <View className="w-full">

                {/* New Special Leave Request button */}
                <View className="w-full px-4 pt-4">
                    <TouchableOpacity
                        onPress={() => setShowNewRequest(true)}
                        style={{
                            flexDirection: "row", alignItems: "center", justifyContent: "center",
                            gap: 8, backgroundColor: "#7c3aed", borderRadius: 14,
                            paddingVertical: 14, paddingHorizontal: 20,
                        }}
                    >
                        <Ionicons name="add-circle-outline" size={18} color="#fff" />
                        <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
                            New Special Leave Request
                        </Text>
                    </TouchableOpacity>
                </View>

                {canViewApps && (
                    <SpecialLeaveApplication
                        isSelfPermission={isSelfPermission}
                        isAllPermission={isAllPermission}
                        refreshTrigger={refreshTrigger}
                    />
                )}

                {isApprover && (
                    <View className={`w-full${canViewApps ? " mt-4 mb-6" : ""}`}>
                        <SpecialLeaveApplicationApprover />
                    </View>
                )}

                {!canViewApps && !isApprover && (
                    <View className="px-5 py-10">
                        <View className="max-w-lg self-center w-full border border-yellow-200 bg-yellow-50 rounded-lg p-6 items-center">
                            <Text className="text-sm font-semibold text-gray-800 text-center">Access Restricted</Text>
                            <Text className="text-xs text-gray-500 mt-1 text-center leading-relaxed">
                                You do not have permission to view Special Leave Applications. Please contact your administrator.
                            </Text>
                        </View>
                    </View>
                )}

            </View>

            <NewSpecialLeaveRequestModal
                isOpen={showNewRequest}
                onClose={() => setShowNewRequest(false)}
                onSuccess={() => setRefreshTrigger(n => n + 1)}
            />
        </ScrollView>
    )
}

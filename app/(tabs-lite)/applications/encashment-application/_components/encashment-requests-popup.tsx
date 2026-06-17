import AutoStatusUpdate from "@/components/ui/auto-status-update"
import { useGetRequest } from "@/hooks/api/useGetRequest"
import { usePostRequest } from "@/hooks/api/usePostRequest"
import { useRolePermissions } from "@/hooks/api/useRolePermissions"
import { useScreenPermissions } from "@/hooks/auth/useScreenPermissions"
import { getAccessToken } from "@/hooks/auth/token-store"
import { Ionicons } from "@expo/vector-icons"
import { AlertCircle, CheckCircle, Clock, Send, X, XCircle } from "lucide-react-native"
import React, { useEffect, useRef, useState } from "react"
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"

function decodeJwtPayload(token: string) {
  try {
    const p = token.split(".")[1]; if (!p) return null
    const b64 = p.replace(/-/g, "+").replace(/_/g, "/")
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=")
    return JSON.parse(decodeURIComponent(atob(padded).split("").map(c => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join(""))) as Record<string, unknown>
  } catch { return null }
}

interface EncashmentRequest {
  _id: string
  employeeID: string
  leaveCode: string
  balance: number
  appliedDate: string
  workflowState: string
  uploadedBy: string
  createdOn: string
  remarks?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  selectedRequestId: string | null
  initialSelectedRequest: EncashmentRequest | null
  userMode: "user" | "approver"
  sourceCollectionName: string
  onActionSuccess: () => void
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start border-b border-gray-100 pb-2 mb-2">
      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-28 flex-shrink-0 pt-0.5">{label}</Text>
      <Text className="text-sm text-gray-900 font-medium flex-1">{value || "-"}</Text>
    </View>
  )
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-"
  try { return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) }
  catch { return dateStr }
}

function getStatusStyle(status?: string) {
  const s = status?.toLowerCase() || ""
  if (s.includes("approved")) return { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" }
  if (s.includes("pending") || s.includes("initiated") || s.includes("validated")) return { bg: "bg-sky-50", text: "text-sky-500", border: "border-sky-200" }
  if (s.includes("rejected")) return { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" }
  if (s.includes("failed")) return { bg: "bg-red-100", text: "text-red-600", border: "border-red-200" }
  return { bg: "bg-gray-200", text: "text-gray-700", border: "border-gray-200" }
}

function getStatusIcon(status?: string, size = 14) {
  const s = status?.toLowerCase() || ""
  if (s.includes("approved")) return <CheckCircle size={size} color="#2563eb" />
  if (s.includes("pending") || s.includes("initiated") || s.includes("validated")) return <Clock size={size} color="#0ea5e9" />
  if (s.includes("rejected") || s.includes("failed")) return <XCircle size={size} color="#dc2626" />
  return null
}

export default function EncashmentRequestsPopup({ isOpen, onClose, selectedRequestId, initialSelectedRequest, userMode, sourceCollectionName, onActionSuccess }: Props) {
  const [request, setRequest] = useState<EncashmentRequest | null>(initialSelectedRequest)
  const [statusAction, setStatusAction] = useState<"approve" | "reject" | "cancel" | "">("")
  const [statusComment, setStatusComment] = useState("")
  const [statusError, setStatusError] = useState("")
  const [statusLoading, setStatusLoading] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState<"approve" | "reject" | "cancel" | null>(null)
  const pulseAnim = useRef(new Animated.Value(0)).current
  const [employeeId, setEmployeeId] = useState("")

  useEffect(() => {
    if (!submitSuccess) return
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [submitSuccess])
  const [tenantCode, setTenantCode] = useState("")

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken()
      if (!token) return
      const p = decodeJwtPayload(token)
      if (!p) return
      setEmployeeId(String(p.employeeID ?? p.employeeId ?? p.empId ?? process.env.EXPO_PUBLIC_EMPLOYEE_ID ?? "") || "")
      setTenantCode(String(p.tenantCode ?? p.tenant ?? p.org ?? process.env.EXPO_PUBLIC_TENANT_CODE ?? "") || "")
    }
    void run()
  }, [])

  const collectionForFetch = sourceCollectionName === "leaveEncashmentApplicationTransaction"
    ? "leaveEncashmentApplicationTransaction" : "leaveEncashmentApplication"

  const { loading: fetchLoading, refetch } = useGetRequest<EncashmentRequest>({
    url: selectedRequestId ? `${collectionForFetch}/${selectedRequestId}` : "",
    method: "GET",
    onSuccess: (d: any) => { if (d && d._id) setRequest(d) },
    onError: () => {},
  })

  useEffect(() => {
    if (isOpen && selectedRequestId) { setRequest(null); refetch() }
    if (!isOpen) { setStatusAction(""); setStatusComment(""); setStatusError(""); setRequest(null); setSubmitSuccess(null) }
  }, [isOpen, selectedRequestId])

  const { post } = usePostRequest<any>({
    url: "leaveEncashmentApplication",
    onSuccess: () => { onActionSuccess(); setSubmitSuccess(statusAction as "approve" | "reject" | "cancel") },
    onError: () => { setStatusError("Action failed. Please try again."); setStatusLoading(false) },
  })

  const handleSubmit = async () => {
    if (!request?._id || !tenantCode || !statusAction) return
    setStatusError("")
    setStatusLoading(true)
    const stateEvent = statusAction === "approve" ? "APPROVE" : statusAction === "reject" ? "REJECT" : "CANCEL"
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const yyyy = now.getFullYear(), mm = pad(now.getMonth() + 1), dd = pad(now.getDate())
    const hh = pad(now.getHours()), min = pad(now.getMinutes()), ss = pad(now.getSeconds()), ms = String(now.getMilliseconds()).padStart(3, "0")
    const createdOn = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}.${ms}+05:30`

    await post({
      tenant: tenantCode,
      action: "update",
      id: request._id,
      event: "application",
      collectionName: "leaveEncashmentApplication",
      data: {
        employeeID: request.employeeID,
        leaveCode: request.leaveCode,
        balance: request.balance,
        appliedDate: request.appliedDate,
        remarks: statusComment || request.remarks || "",
        workflowName: "leaveEncashment Application",
        tenantCode,
        uploadedBy: request.uploadedBy || employeeId,
        createdBy: request.uploadedBy || employeeId,
        createdOn: request.createdOn || createdOn,
        uploadTime: createdOn,
        organizationCode: tenantCode,
        stateEvent,
        workflowState: request.workflowState,
      },
    })
    setStatusLoading(false)
  }

  const { loading: permsLoading } = useRolePermissions()
  const applierPerms = useScreenPermissions("applicationApplier", "encashment")
  const approverPerms = useScreenPermissions("applicationApprover", "encashment")
  const activePerms = userMode === "approver" ? approverPerms : applierPerms

  const canApprove = !permsLoading && !!activePerms?.approve
  const canReject  = !permsLoading && !!activePerms?.reject
  const canCancel  = !permsLoading && !!activePerms?.cancel

  const wfState = (request?.workflowState || "").toUpperCase()
  const isProcessed = wfState === "APPROVED" || wfState === "REJECTED" || wfState === "CANCELLED" || wfState === "CANCEL"
  const showActionControls = sourceCollectionName !== "leaveEncashmentApplicationTransaction" && !isProcessed && (canApprove || canReject || canCancel)

  if (submitSuccess) {
    const rippleScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.28] })
    const rippleOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.03] })

    const isApprove = submitSuccess === "approve"
    const isReject  = submitSuccess === "reject"

    const iconBg   = isApprove ? "#16a34a" : isReject ? "#dc2626" : "#475569"
    const orbBg    = isApprove ? "#bbf7d0" : isReject ? "#fecaca" : "#e2e8f0"
    const title    = isApprove ? "Request Approved"  : isReject ? "Request Rejected"  : "Request Cancelled"
    const subtitle = isApprove
      ? "The encashment request has been approved successfully."
      : isReject
      ? "The encashment request has been rejected."
      : "The encashment request has been cancelled."
    const iconName = isApprove ? "checkmark" : "close"

    return (
      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 24, paddingVertical: 48, alignItems: "center" }}>

              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute", width: 220, height: 220, borderRadius: 110,
                  backgroundColor: orbBg, top: "18%", alignSelf: "center",
                  opacity: rippleOpacity, transform: [{ scale: rippleScale }],
                }}
              />

              <View style={{
                width: 110, height: 110, borderRadius: 55,
                backgroundColor: iconBg,
                alignItems: "center", justifyContent: "center",
                marginBottom: 24,
                shadowColor: iconBg, shadowOpacity: 0.25, shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 }, elevation: 6,
              }}>
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute", width: 152, height: 152, borderRadius: 76,
                    backgroundColor: orbBg,
                    opacity: rippleOpacity, transform: [{ scale: rippleScale }],
                  }}
                />
                <Ionicons name={iconName as any} size={44} color="#fff" />
              </View>

              <Text style={{ fontSize: 24, fontWeight: "800", color: "#0f172a", textAlign: "center", marginBottom: 10 }}>
                {title}
              </Text>
              <Text style={{ fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 20, paddingHorizontal: 16, marginBottom: 28 }}>
                {subtitle}
              </Text>

              {request && (
                <View style={{
                  width: "100%", borderRadius: 20, borderWidth: 1, borderColor: "#dbeafe",
                  backgroundColor: "#fff", padding: 16,
                  shadowColor: "#0f172a", shadowOpacity: 0.05, shadowRadius: 10,
                  shadowOffset: { width: 0, height: 6 }, elevation: 2, marginBottom: 28,
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                      <Ionicons name="document-text-outline" size={16} color="#2563eb" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>Employee ID</Text>
                      <Text style={{ marginTop: 2, fontSize: 14, fontWeight: "800", color: "#0f172a" }}>{request.employeeID || "—"}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 14, rowGap: 14 }}>
                    {[
                      { label: "Leave Code",  value: request.leaveCode || "—" },
                      { label: "No. of Days", value: String(request.balance ?? "—") },
                      { label: "Applied Date", value: formatDate(request.appliedDate) },
                      { label: "Status",      value: isApprove ? "Approved" : isReject ? "Rejected" : "Cancelled" },
                    ].map(({ label, value }) => (
                      <View key={label} style={{ width: "50%", paddingRight: 12 }}>
                        <Text style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>{label}</Text>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: isApprove && label === "Status" ? "#16a34a" : isReject && label === "Status" ? "#dc2626" : label === "Status" ? "#475569" : "#0f172a" }}>
                          {value}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={onClose}
                style={{ height: 44, borderRadius: 8, backgroundColor: "#0a1c63", width: "100%", alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Close</Text>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible={isOpen} onRequestClose={onClose} presentationStyle="pageSheet" animationType="slide">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-1 bg-white">

          {/* Header */}
          <View style={{ paddingHorizontal: 14, paddingTop: 58, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color="#0f172a" />
              </TouchableOpacity>
              <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '700', color: '#0f172a' }}>Encashment Application</Text>
            </View>
          </View>

          <ScrollView
            className="flex-1 bg-gray-50"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {request ? (
              <View className="px-4 py-4">

                {/* Status badge */}
                <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-gray-200">
                  <Text className="text-base font-semibold text-gray-700">Request Details</Text>
                  {(() => {
                    const st = getStatusStyle(request.workflowState)
                    return (
                      <View className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-md border ${st.bg} ${st.border}`}>
                        {getStatusIcon(request.workflowState)}
                        <Text className={`text-xs font-semibold uppercase tracking-wide ${st.text}`}>
                          {request.workflowState || "PENDING"}
                        </Text>
                      </View>
                    )
                  })()}
                </View>

                {/* Details card */}
                <View className="bg-white rounded-lg border border-gray-100 p-4 mb-3">
                  <DetailRow label="Employee ID" value={request.employeeID} />
                  <DetailRow label="Leave Code" value={request.leaveCode} />
                  <DetailRow label="No. of Days" value={String(request.balance ?? "-")} />
                  <DetailRow label="Applied Date" value={formatDate(request.appliedDate)} />
                  <DetailRow label="Applied By" value={request.uploadedBy} />
                  <DetailRow label="Created On" value={formatDate(request.createdOn)} />
                  {request.remarks ? <DetailRow label="Remarks" value={request.remarks} /> : null}
                </View>

                {/* Action controls */}
                {showActionControls && (
                  <View className="bg-white rounded-lg border border-gray-100 p-4 mb-3">
                    <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Update Status</Text>

                    <View className="flex-row gap-2 mb-3">
                      {canApprove && (
                        <TouchableOpacity
                          onPress={() => setStatusAction(statusAction === "approve" ? "" : "approve")}
                          className={`flex-1 items-center gap-1.5 p-3 rounded-lg border-2 ${
                            statusAction === "approve" ? "border-green-500 bg-green-50" : "border-gray-200 bg-white"
                          }`}
                        >
                          <CheckCircle size={18} color={statusAction === "approve" ? "#16a34a" : "#9ca3af"} />
                          <Text className={`text-xs font-semibold ${statusAction === "approve" ? "text-green-700" : "text-gray-700"}`}>
                            Approve
                          </Text>
                          <View className={`w-4 h-4 rounded-full border-2 items-center justify-center ${
                            statusAction === "approve" ? "border-green-500 bg-green-500" : "border-gray-300"
                          }`}>
                            {statusAction === "approve" && <View className="w-2 h-2 bg-white rounded-full" />}
                          </View>
                        </TouchableOpacity>
                      )}

                      {canReject && (
                        <TouchableOpacity
                          onPress={() => setStatusAction(statusAction === "reject" ? "" : "reject")}
                          className={`flex-1 items-center gap-1.5 p-3 rounded-lg border-2 ${
                            statusAction === "reject" ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"
                          }`}
                        >
                          <XCircle size={18} color={statusAction === "reject" ? "#dc2626" : "#9ca3af"} />
                          <Text className={`text-xs font-semibold ${statusAction === "reject" ? "text-red-700" : "text-gray-700"}`}>
                            Reject
                          </Text>
                          <View className={`w-4 h-4 rounded-full border-2 items-center justify-center ${
                            statusAction === "reject" ? "border-red-500 bg-red-500" : "border-gray-300"
                          }`}>
                            {statusAction === "reject" && <View className="w-2 h-2 bg-white rounded-full" />}
                          </View>
                        </TouchableOpacity>
                      )}

                      {canCancel && (
                        <TouchableOpacity
                          onPress={() => setStatusAction(statusAction === "cancel" ? "" : "cancel")}
                          className={`flex-1 items-center gap-1.5 p-3 rounded-lg border-2 ${
                            statusAction === "cancel" ? "border-gray-800 bg-gray-100" : "border-gray-200 bg-white"
                          }`}
                        >
                          <X size={18} color={statusAction === "cancel" ? "#1f2937" : "#9ca3af"} />
                          <Text className={`text-xs font-semibold ${statusAction === "cancel" ? "text-gray-900" : "text-gray-700"}`}>
                            Cancel
                          </Text>
                          <View className={`w-4 h-4 rounded-full border-2 items-center justify-center ${
                            statusAction === "cancel" ? "border-gray-800 bg-gray-800" : "border-gray-300"
                          }`}>
                            {statusAction === "cancel" && <View className="w-2 h-2 bg-white rounded-full" />}
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>

                    {statusAction !== "" && (
                      <View className="mb-3">
                        <Text className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Comment</Text>
                        <TextInput
                          value={statusComment}
                          onChangeText={setStatusComment}
                          placeholder="Add remarks (optional)..."
                          placeholderTextColor="#9ca3af"
                          multiline
                          numberOfLines={3}
                          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white"
                          style={{ minHeight: 80, textAlignVertical: "top" }}
                        />
                        {!!statusError && (
                          <View className="flex-row items-center gap-2 mt-2 p-2.5 bg-red-50 rounded-lg border border-red-200">
                            <AlertCircle size={14} color="#dc2626" />
                            <Text className="text-sm text-red-600 flex-1">{statusError}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {statusAction !== "" && (
                      <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={statusLoading}
                        className={`h-11 rounded-lg items-center justify-center flex-row gap-2 ${
                          statusAction === "approve" ? "bg-green-600"
                            : statusAction === "reject" ? "bg-red-600"
                            : "bg-gray-900"
                        } ${statusLoading ? "opacity-50" : ""}`}
                      >
                        {statusLoading ? (
                          <>
                            <ActivityIndicator size="small" color="#ffffff" />
                            <Text className="text-white text-sm font-medium">Updating...</Text>
                          </>
                        ) : (
                          <Text className="text-white text-sm font-medium">
                            Submit {statusAction === "approve" ? "Approve" : statusAction === "reject" ? "Reject" : "Cancel"}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Auto Status Update */}
                {isProcessed && sourceCollectionName === "leaveEncashmentApplication" && (
                  <View className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                    <View className="p-4">
                      <AutoStatusUpdate
                        fileId={request._id}
                        onContinue={() => { onActionSuccess(); onClose() }}
                        onClose={onClose}
                      />
                    </View>
                  </View>
                )}

              </View>
            ) : (
              <View className="flex-1 items-center justify-center py-24">
                {fetchLoading || selectedRequestId ? (
                  <View className="items-center gap-3">
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text className="text-sm text-gray-500">Loading request details...</Text>
                  </View>
                ) : (
                  <View className="items-center">
                    <Send size={48} color="#d1d5db" />
                    <Text className="text-base font-medium text-gray-500 mt-3">No Request Selected</Text>
                    <Text className="text-sm text-gray-400 mt-1">Select a request to view details</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

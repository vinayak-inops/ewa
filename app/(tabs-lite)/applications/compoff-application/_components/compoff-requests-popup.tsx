import AutoStatusUpdate from "@/components/ui/auto-status-update"
import { useGetRequest } from "@/hooks/api/useGetRequest"
import { usePostRequest } from "@/hooks/api/usePostRequest"
import { useRolePermissions } from "@/hooks/api/useRolePermissions"
import { getAccessToken } from "@/hooks/auth/token-store"
import { useScreenPermissions } from "@/hooks/auth/useScreenPermissions"
import { Ionicons } from "@expo/vector-icons"
import { AlertCircle, CheckCircle, Clock, Send, X, XCircle } from "lucide-react-native"
import React, { useEffect, useRef, useState } from "react"
import { ActivityIndicator, Animated, Easing, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"

function decodeJwtPayload(token: string) {
  try {
    const p = token.split(".")[1]; if (!p) return null
    const b64 = p.replace(/-/g, "+").replace(/_/g, "/")
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=")
    return JSON.parse(decodeURIComponent(atob(padded).split("").map(c => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join(""))) as Record<string, unknown>
  } catch { return null }
}

interface CompoffRequest {
  _id: string
  employeeID: string
  fromDate: string
  toDate: string
  fromDuration: string
  toDuration: string
  availForDates?: string[]
  workflowState: string
  remarks?: string
  createdOn: string
  uploadedBy?: string
  uploadTime?: string
  appliedDate?: string
  tenantCode: string
  organizationCode?: string
  approverID?: string
  workflowName?: string
  createdBy?: string
  isDeleted?: boolean
  stateEvent?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  selectedRequestId: string | null
  initialSelectedRequest: CompoffRequest | null
  userMode: "user" | "approver"
  sourceCollectionName: string
  onActionSuccess?: () => void
}

const fmtDate = (v?: string) => {
  if (!v) return "-"
  try { return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) } catch { return v }
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

function mapBackend(i: any): CompoffRequest {
  return {
    _id: i._id || "", employeeID: i.employeeID || "",
    fromDate: i.fromDate || "", toDate: i.toDate || "",
    fromDuration: i.fromDuration || "", toDuration: i.toDuration || "",
    availForDates: i.availForDates || [],
    workflowState: i.workflowState || "INITIATED",
    remarks: i.remarks || "", createdOn: i.createdOn || "",
    uploadedBy: i.uploadedBy || "", uploadTime: i.uploadTime,
    appliedDate: i.appliedDate || "", tenantCode: i.tenantCode || "",
    organizationCode: i.organizationCode || "", approverID: i.approverID || "",
    workflowName: i.workflowName || "compOff Application",
    createdBy: i.createdBy || "", isDeleted: i.isDeleted ?? false,
    stateEvent: i.stateEvent || "NEXT",
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start border-b border-gray-100 pb-2 mb-2">
      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-28 flex-shrink-0 pt-0.5">{label}</Text>
      <Text className="text-sm text-gray-900 font-medium flex-1">{value || "-"}</Text>
    </View>
  )
}

export default function CompoffRequestsPopup({ isOpen, onClose, selectedRequestId, initialSelectedRequest, userMode, sourceCollectionName, onActionSuccess }: Props) {
  const [selectedRequest, setSelectedRequest] = useState<CompoffRequest | null>(initialSelectedRequest)
  const [employeeId, setEmployeeId] = useState("")
  const [tenantCode, setTenantCode] = useState("")
  const [statusAction, setStatusAction] = useState<"approve" | "reject" | "cancel" | "">("")
  const [statusComment, setStatusComment] = useState("")
  const [statusError, setStatusError] = useState("")
  const [statusLoading, setStatusLoading] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState<"approve" | "reject" | "cancel" | null>(null)
  const pulseAnim = useRef(new Animated.Value(0)).current

  const collectionName = sourceCollectionName

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken()
      if (!token) return
      const p = decodeJwtPayload(token)
      if (!p) return
      setEmployeeId(String(p.employeeID ?? p.employeeId ?? p.empId ?? "") || "")
      setTenantCode(String(p.tenantCode ?? p.tenant ?? p.org ?? "") || "")
    }
    void run()
  }, [])

  const { loading } = useGetRequest<any>({
    url: selectedRequestId ? `${collectionName}/${selectedRequestId}` : "",
    method: "GET",
    onSuccess: (d: any) => { if (d && typeof d === "object" && d._id) setSelectedRequest(mapBackend(d)) },
    onError: () => {},
  })

  useEffect(() => {
    if (!isOpen) { setStatusAction(""); setStatusComment(""); setStatusError(""); setStatusLoading(false); setSubmitSuccess(null) }
  }, [isOpen])

  useEffect(() => {
    if (!submitSuccess) return
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [submitSuccess])

  const { post: postAction } = usePostRequest({
    url: "leaveApplication",
    onSuccess: () => {
      setSubmitSuccess(statusAction as "approve" | "reject" | "cancel")
      setStatusLoading(false)
      setStatusAction("")
      setStatusComment("")
      setStatusError("")
      onActionSuccess?.()
    },
    onError: () => { setStatusError("Action failed. Please try again."); setStatusLoading(false) },
  })

  const handleSubmit = () => {
    if (!selectedRequest || !statusAction) return
    if ((statusAction === "approve" && !canApprove) || (statusAction === "reject" && !canReject) || (statusAction === "cancel" && !canCancel)) {
      setStatusError("You do not have permission for this action.")
      return
    }
    setStatusError("")
    setStatusLoading(true)

    const stateEvent = statusAction === "approve" ? "APPROVED" : statusAction === "reject" ? "REJECTED" : "CANCELLED"
    const action = statusAction === "approve" ? "approve" : statusAction === "reject" ? "reject" : "cancel"

    const now = new Date()
    const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    const yyyy = istTime.getFullYear(), mm = pad(istTime.getMonth() + 1), dd = pad(istTime.getDate())
    const hh = pad(istTime.getHours()), min = pad(istTime.getMinutes()), ss = pad(istTime.getSeconds())
    const ms = String(istTime.getMilliseconds()).padStart(3, "0")
    const createdOnIST = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}.${ms}+05:30`

    postAction({
      tenant: tenantCode, action, id: selectedRequest._id, event: "application",
      collectionName: "leaveApplication",
      data: {
        _id: selectedRequest._id,
        tenantCode: selectedRequest.tenantCode || tenantCode,
        workflowName: selectedRequest.workflowName || "compOff Application",
        stateEvent,
        organizationCode: selectedRequest.organizationCode || tenantCode,
        isDeleted: selectedRequest.isDeleted ?? false,
        employeeID: selectedRequest.employeeID,
        fromDate: selectedRequest.fromDate,
        toDate: selectedRequest.toDate,
        fromDuration: selectedRequest.fromDuration,
        toDuration: selectedRequest.toDuration,
        availForDates: selectedRequest.availForDates || [],
        remarks: selectedRequest.remarks,
        uploadedBy: selectedRequest.uploadedBy || employeeId || "user",
        createdOn: selectedRequest.createdOn || createdOnIST,
        uploadTime: selectedRequest.uploadTime,
        appliedDate: selectedRequest.appliedDate,
        workflowState: stateEvent, action, comment: statusComment,
        approverID: employeeId,
      },
    })
  }

  const { loading: permsLoading } = useRolePermissions()
  const applierPerms = useScreenPermissions("applicationApplier", "compOff")
  const approverPerms = useScreenPermissions("applicationApprover", "compOff")
  const activePerms = userMode === "approver" ? approverPerms : applierPerms
  const canApprove = !permsLoading && !!activePerms?.approve
  const canReject  = !permsLoading && !!activePerms?.reject
  const canCancel  = !permsLoading && !!activePerms?.cancel

  const wfState = (selectedRequest?.workflowState || "").toUpperCase()
  const isProcessed = ["APPROVED", "REJECTED", "CANCELLED", "CANCEL", "FAILED"].includes(wfState)
  const showActionControls = collectionName !== "leaveApplicationTransaction" && !isProcessed && (canApprove || canReject || canCancel)

  if (submitSuccess) {
    const rippleScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] })
    const rippleOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] })
    const isApprove = submitSuccess === "approve"
    const isReject = submitSuccess === "reject"
    const accentColor = isApprove ? "#16a34a" : isReject ? "#dc2626" : "#374151"
    const bgColor = isApprove ? "#f0fdf4" : isReject ? "#fef2f2" : "#f9fafb"
    const label = isApprove ? "Approved" : isReject ? "Rejected" : "Cancelled"
    return (
      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View className="flex-1 bg-white">
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: "center", paddingHorizontal: 32, paddingVertical: 48 }}>
              <View style={{ width: 120, height: 120, alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
                <Animated.View style={{
                  position: "absolute", width: 120, height: 120, borderRadius: 60,
                  backgroundColor: accentColor, opacity: rippleOpacity,
                  transform: [{ scale: rippleScale }],
                }} />
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: bgColor, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: accentColor }}>
                  <Ionicons name={isApprove ? "checkmark-circle" : isReject ? "close-circle" : "ban"} size={44} color={accentColor} />
                </View>
              </View>
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#0f172a", marginBottom: 8 }}>Request {label}</Text>
              <Text style={{ fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 32, lineHeight: 20 }}>
                The comp off request has been {label.toLowerCase()} successfully.
              </Text>
              <View style={{ width: "100%", backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 16, marginBottom: 32 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Request Summary</Text>
                {selectedRequest && (
                  <>
                    <DetailRow label="Employee ID" value={selectedRequest.employeeID} />
                    <DetailRow label="From Date" value={`${fmtDate(selectedRequest.fromDate)} (${selectedRequest.fromDuration || "-"})`} />
                    <DetailRow label="To Date" value={`${fmtDate(selectedRequest.toDate)} (${selectedRequest.toDuration || "-"})`} />
                    <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, width: 112 }}>Status</Text>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, backgroundColor: bgColor, borderWidth: 1, borderColor: accentColor }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: accentColor, textTransform: "uppercase" }}>{label}</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={{ width: "100%", height: 48, borderRadius: 12, backgroundColor: accentColor, alignItems: "center", justifyContent: "center" }}
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
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
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
            <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '700', color: '#0f172a' }}>Comp Off Application</Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 bg-gray-50"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {selectedRequest ? (
            <View className="px-4 py-4">

              {/* Status badge */}
              <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <Text className="text-base font-semibold text-gray-700">Request Details</Text>
                {(() => {
                  const st = getStatusStyle(selectedRequest.workflowState)
                  return (
                    <View className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-md border ${st.bg} ${st.border}`}>
                      {getStatusIcon(selectedRequest.workflowState)}
                      <Text className={`text-xs font-semibold uppercase tracking-wide ${st.text}`}>
                        {selectedRequest.workflowState || "PENDING"}
                      </Text>
                    </View>
                  )
                })()}
              </View>

              {/* Details card */}
              <View className="bg-white rounded-lg border border-gray-100 p-4 mb-3">
                <DetailRow label="Employee ID" value={selectedRequest.employeeID} />
                <DetailRow label="From Date" value={`${fmtDate(selectedRequest.fromDate)} (${selectedRequest.fromDuration || "-"})`} />
                <DetailRow label="To Date" value={`${fmtDate(selectedRequest.toDate)} (${selectedRequest.toDuration || "-"})`} />
                <DetailRow label="Avail For" value={selectedRequest.availForDates?.map(fmtDate).join(", ") || "-"} />
                {selectedRequest.remarks ? <DetailRow label="Remarks" value={selectedRequest.remarks} /> : null}
                <DetailRow label="Applied By" value={selectedRequest.uploadedBy || "-"} />
                <DetailRow label="Created On" value={selectedRequest.createdOn?.slice(0, 19).replace("T", " ") || "-"} />
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
                        placeholder="Add a comment (optional)..."
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
              {isProcessed && collectionName === "leaveApplication" && (
                <View className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                  <View className="p-4">
                    <AutoStatusUpdate
                      fileId={selectedRequest._id}
                      onContinue={() => { onActionSuccess?.(); onClose() }}
                      onClose={onClose}
                    />
                  </View>
                </View>
              )}

            </View>
          ) : (
            <View className="flex-1 items-center justify-center py-24">
              {loading || selectedRequestId ? (
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
    </Modal>
  )
}

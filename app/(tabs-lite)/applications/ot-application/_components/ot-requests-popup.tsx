import AutoStatusUpdate from "@/components/ui/auto-status-update"
import { useGetRequest } from "@/hooks/api/useGetRequest"
import { usePostRequest } from "@/hooks/api/usePostRequest"
import { useRolePermissions } from "@/hooks/api/useRolePermissions"
import { useScreenPermissions } from "@/hooks/auth/useScreenPermissions"
import { getAccessToken } from "@/hooks/auth/token-store"
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

interface OtRequest {
  _id: string
  employeeID: string
  date: string
  calculatedOT: number
  approvedOT: number
  workflowState: string
  status: string
  uploadedBy: string
  createdOn: string
  uploadTime?: string
  appliedDate?: string
  remarks?: string
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
  initialSelectedRequest: OtRequest | null
  userMode: "user" | "approver"
  sourceCollectionName: string
  onActionSuccess?: () => void
}

const fmtDate = (v?: string) => {
  if (!v) return "-"
  try { return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) } catch { return v }
}


const getStatusStyle = (s?: string) => {
  const u = (s || "").toLowerCase()
  if (u.includes("approved")) return { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" }
  if (u.includes("pending") || u.includes("initiated")) return { bg: "bg-sky-50", text: "text-sky-500", border: "border-sky-200" }
  if (u.includes("rejected") || u.includes("failed")) return { bg: "bg-red-100", text: "text-red-600", border: "border-red-200" }
  if (u.includes("cancelled")) return { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" }
  return { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" }
}

const getStatusIcon = (s?: string, size = 14) => {
  const u = (s || "").toLowerCase()
  if (u.includes("approved")) return <CheckCircle size={size} color="#2563eb" />
  if (u.includes("pending") || u.includes("initiated")) return <Clock size={size} color="#0ea5e9" />
  if (u.includes("rejected") || u.includes("failed")) return <XCircle size={size} color="#dc2626" />
  return null
}

function mapBackend(i: any): OtRequest {
  return {
    _id: i._id || "", employeeID: i.employeeID || "",
    date: i.date || "", calculatedOT: i.calculatedOT ?? 0, approvedOT: i.approvedOT ?? 0,
    workflowState: i.workflowState || "INITIATED", status: i.workflowState || "INITIATED",
    uploadedBy: i.uploadedBy || "", createdOn: i.createdOn || "",
    uploadTime: i.uploadTime, appliedDate: i.appliedDate || "",
    remarks: i.remarks || "", tenantCode: i.tenantCode || "",
    organizationCode: i.organizationCode || "", approverID: i.approverID || "",
    workflowName: i.workflowName || "ot Application",
    createdBy: i.createdBy || "", isDeleted: i.isDeleted ?? false,
    stateEvent: i.stateEvent || "NEXT",
  }
}

export default function OtRequestsPopup({ isOpen, onClose, selectedRequestId, initialSelectedRequest, userMode, sourceCollectionName, onActionSuccess }: Props) {
  const [selectedRequest, setSelectedRequest] = useState<OtRequest | null>(initialSelectedRequest)
  const [employeeId, setEmployeeId] = useState("")
  const [tenantCode, setTenantCode] = useState("")
  const [statusAction, setStatusAction] = useState<"approve" | "reject" | "cancel" | null>(null)
  const [statusComment, setStatusComment] = useState("")
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState("")
  const [submitSuccess, setSubmitSuccess] = useState<"approve" | "reject" | "cancel" | null>(null)
  const pulseAnim = useRef(new Animated.Value(0)).current

  const collectionName = sourceCollectionName

  useEffect(() => {
    if (!submitSuccess) return
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [submitSuccess])

  const { loading: permsLoading } = useRolePermissions()
  const applierPerms = useScreenPermissions("applicationApplier", "overtime")
  const approverPerms = useScreenPermissions("applicationApprover", "overtime")
  const activePerms = userMode === "approver" ? approverPerms : applierPerms

  const canApprove = !permsLoading && !!activePerms?.approve
  const canReject  = !permsLoading && !!activePerms?.reject
  const canCancel  = !permsLoading && !!activePerms?.cancel

  const ws = selectedRequest?.workflowState?.toUpperCase() || ""
  const isProcessed = ws === "APPROVED" || ws === "REJECTED" || ws === "CANCELLED" || ws === "FAILED"
  const showActionControls = collectionName !== "otApplicationTransaction" && !isProcessed && (canApprove || canReject || canCancel)

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
    onSuccess: (d: any) => {
      if (d && typeof d === "object" && d._id) setSelectedRequest(mapBackend(d))
    },
    onError: () => {},
  })

  useEffect(() => {
    if (!isOpen) { setStatusAction(null); setStatusComment(""); setStatusLoading(false); setStatusError(""); setSubmitSuccess(null) }
  }, [isOpen])

  const { post: postAction } = usePostRequest({
    url: "otApplication",
    onSuccess: () => {
      setSubmitSuccess(statusAction)
      setStatusLoading(false)
      setStatusAction(null)
      setStatusComment("")
      setStatusError("")
      onActionSuccess?.()
    },
    onError: () => {
      setStatusLoading(false)
      setStatusError("Action failed. Please try again.")
    },
  })

  const handleSubmit = () => {
    if (!statusAction || !selectedRequest) return
    if ((statusAction === "approve" && !canApprove) || (statusAction === "reject" && !canReject) || (statusAction === "cancel" && !canCancel)) {
      setStatusError("You do not have permission for this action.")
      return
    }
    if ((statusAction === "cancel" || statusAction === "reject") && !statusComment.trim()) {
      setStatusError("Please enter a comment to proceed.")
      return
    }
    setStatusLoading(true)
    setStatusError("")

    const stateEvent = statusAction === "approve" ? "NEXT" : statusAction === "reject" ? "REJECT" : "CANCEL"
    const pad = (n: number) => n < 10 ? `0${n}` : `${n}`
    const ist = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const createdOnIST = `${ist.getFullYear()}-${pad(ist.getMonth() + 1)}-${pad(ist.getDate())}T${pad(ist.getHours())}:${pad(ist.getMinutes())}:${pad(ist.getSeconds())}.${String(ist.getMilliseconds()).padStart(3, "0")}+05:30`

    postAction({
      tenant: tenantCode,
      action: statusAction,
      id: selectedRequest._id,
      event: "application",
      collectionName: "otApplication",
      data: {
        _id: selectedRequest._id,
        tenantCode: selectedRequest.tenantCode || tenantCode,
        workflowName: selectedRequest.workflowName || "ot Application",
        stateEvent,
        organizationCode: selectedRequest.organizationCode || tenantCode,
        isDeleted: selectedRequest.isDeleted ?? false,
        employeeID: selectedRequest.employeeID,
        date: selectedRequest.date,
        calculatedOT: selectedRequest.calculatedOT,
        approvedOT: selectedRequest.approvedOT,
        remarks: selectedRequest.remarks,
        uploadedBy: selectedRequest.uploadedBy || employeeId || "user",
        createdBy: selectedRequest.createdBy || employeeId || "user",
        createdOn: selectedRequest.createdOn || createdOnIST,
        uploadTime: selectedRequest.uploadTime,
        appliedDate: selectedRequest.appliedDate,
        workflowState: selectedRequest.workflowState,
        action: statusAction,
        comment: statusComment,
        approverID: employeeId,
      },
    })
  }

  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View className="flex-row items-start border-b border-gray-100 pb-2 mb-2">
      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-28 flex-shrink-0 pt-0.5">{label}</Text>
      <Text className="text-sm text-gray-900 font-medium flex-1">{value || "-"}</Text>
    </View>
  )

  if (submitSuccess) {
    const rippleScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.28] })
    const rippleOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.03] })

    const isApprove = submitSuccess === "approve"
    const isReject  = submitSuccess === "reject"

    const iconBg   = isApprove ? "#16a34a" : isReject ? "#dc2626" : "#475569"
    const orbBg    = isApprove ? "#bbf7d0" : isReject ? "#fecaca" : "#e2e8f0"
    const title    = isApprove ? "Request Approved"  : isReject ? "Request Rejected"  : "Request Cancelled"
    const subtitle = isApprove
      ? "The OT request has been approved successfully."
      : isReject
      ? "The OT request has been rejected."
      : "The OT request has been cancelled."
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

              {selectedRequest && (
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
                      <Text style={{ marginTop: 2, fontSize: 14, fontWeight: "800", color: "#0f172a" }}>{selectedRequest.employeeID || "—"}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 14, rowGap: 14 }}>
                    {[
                      { label: "Date",           value: fmtDate(selectedRequest.date) },
                      { label: "Calculated OT",  value: `${selectedRequest.calculatedOT} hrs` },
                      { label: "Approved OT",    value: `${selectedRequest.approvedOT} hrs` },
                      { label: "Status",         value: isApprove ? "Approved" : isReject ? "Rejected" : "Cancelled" },
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
            <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '700', color: '#0f172a' }}>OT Application</Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 bg-gray-50"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 0 }}
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
                {!!selectedRequest.uploadedBy && <DetailRow label="Applied By" value={selectedRequest.uploadedBy} />}
                {!!selectedRequest.date && <DetailRow label="Date" value={fmtDate(selectedRequest.date)} />}
                <DetailRow label="Calculated OT" value={`${selectedRequest.calculatedOT} hrs`} />
                <DetailRow label="Approved OT" value={`${selectedRequest.approvedOT} hrs`} />
                {!!selectedRequest.remarks && <DetailRow label="Remarks" value={selectedRequest.remarks} />}
                {!!selectedRequest.appliedDate && <DetailRow label="Applied Date" value={fmtDate(selectedRequest.appliedDate)} />}
                {!!selectedRequest.createdOn && (
                  <DetailRow label="Created On" value={selectedRequest.createdOn.slice(0, 19).replace("T", " ")} />
                )}
              </View>

              {/* Action controls */}
              {showActionControls && (
                <View className="bg-white rounded-lg border border-gray-100 p-4 mb-3">
                  <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Update Status</Text>

                  <View className="flex-row gap-2 mb-3">
                    {canApprove && (
                      <TouchableOpacity
                        onPress={() => setStatusAction(statusAction === "approve" ? null : "approve")}
                        className={`flex-1 items-center gap-1.5 p-3 rounded-lg border-2 ${statusAction === "approve" ? "border-green-500 bg-green-50" : "border-gray-200 bg-white"}`}
                      >
                        <CheckCircle size={18} color={statusAction === "approve" ? "#16a34a" : "#9ca3af"} />
                        <Text className={`text-xs font-semibold ${statusAction === "approve" ? "text-green-700" : "text-gray-700"}`}>Approve</Text>
                        <View className={`w-4 h-4 rounded-full border-2 items-center justify-center ${statusAction === "approve" ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
                          {statusAction === "approve" && <View className="w-2 h-2 bg-white rounded-full" />}
                        </View>
                      </TouchableOpacity>
                    )}

                    {canReject && (
                      <TouchableOpacity
                        onPress={() => setStatusAction(statusAction === "reject" ? null : "reject")}
                        className={`flex-1 items-center gap-1.5 p-3 rounded-lg border-2 ${statusAction === "reject" ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"}`}
                      >
                        <XCircle size={18} color={statusAction === "reject" ? "#dc2626" : "#9ca3af"} />
                        <Text className={`text-xs font-semibold ${statusAction === "reject" ? "text-red-700" : "text-gray-700"}`}>Reject</Text>
                        <View className={`w-4 h-4 rounded-full border-2 items-center justify-center ${statusAction === "reject" ? "border-red-500 bg-red-500" : "border-gray-300"}`}>
                          {statusAction === "reject" && <View className="w-2 h-2 bg-white rounded-full" />}
                        </View>
                      </TouchableOpacity>
                    )}

                    {canCancel && (
                      <TouchableOpacity
                        onPress={() => setStatusAction(statusAction === "cancel" ? null : "cancel")}
                        className={`flex-1 items-center gap-1.5 p-3 rounded-lg border-2 ${statusAction === "cancel" ? "border-gray-800 bg-gray-100" : "border-gray-200 bg-white"}`}
                      >
                        <X size={18} color={statusAction === "cancel" ? "#1f2937" : "#9ca3af"} />
                        <Text className={`text-xs font-semibold ${statusAction === "cancel" ? "text-gray-900" : "text-gray-700"}`}>Cancel</Text>
                        <View className={`w-4 h-4 rounded-full border-2 items-center justify-center ${statusAction === "cancel" ? "border-gray-800 bg-gray-800" : "border-gray-300"}`}>
                          {statusAction === "cancel" && <View className="w-2 h-2 bg-white rounded-full" />}
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>

                  {(statusAction === "cancel" || statusAction === "reject") && (
                    <View className="mb-3">
                      <Text className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                        Comment <Text className="text-red-500">*</Text>
                      </Text>
                      <TextInput
                        value={statusComment}
                        onChangeText={setStatusComment}
                        placeholder="Please provide a reason for this action..."
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

                  {statusAction && (
                    <TouchableOpacity
                      onPress={handleSubmit}
                      disabled={statusLoading || ((statusAction === "cancel" || statusAction === "reject") && !statusComment.trim())}
                      className={`h-11 rounded-lg items-center justify-center flex-row gap-2 ${
                        statusAction === "cancel" ? "bg-gray-900" : statusAction === "reject" ? "bg-red-600" : "bg-green-600"
                      } ${statusLoading || ((statusAction === "cancel" || statusAction === "reject") && !statusComment.trim()) ? "opacity-50" : ""}`}
                    >
                      {statusLoading ? (
                        <>
                          <ActivityIndicator size="small" color="#ffffff" />
                          <Text className="text-white text-sm font-medium">Updating...</Text>
                        </>
                      ) : (
                        <Text className="text-white text-sm font-medium">
                          Submit {statusAction.charAt(0).toUpperCase() + statusAction.slice(1)}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Auto Status Update / processed state */}
              <View className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                {collectionName === "otApplication" ? (
                  <View className="p-4">
                    <AutoStatusUpdate fileId={selectedRequest._id || ""} onContinue={() => {}} onClose={onClose} />
                  </View>
                ) : (
                  <View className="items-center justify-center py-10 px-4">
                    {(() => {
                      const st = getStatusStyle(selectedRequest.workflowState)
                      return (
                        <>
                          <View className={`flex-row items-center gap-2 px-3 py-1.5 rounded-md border ${st.bg} ${st.border} mb-3`}>
                            {getStatusIcon(selectedRequest.workflowState)}
                            <Text className={`text-xs font-semibold uppercase tracking-wide ${st.text}`}>
                              {selectedRequest.workflowState?.toUpperCase() || "PROCESSED"}
                            </Text>
                          </View>
                          <Text className="text-sm text-gray-500 text-center">
                            This application has already been processed.
                          </Text>
                        </>
                      )
                    })()}
                  </View>
                )}
              </View>

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

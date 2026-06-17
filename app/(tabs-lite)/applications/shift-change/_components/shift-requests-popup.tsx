import AutoStatusUpdate from "@/components/ui/auto-status-update"
import { useGetRequest } from "@/hooks/api/useGetRequest"
import { usePostRequest } from "@/hooks/api/usePostRequest"
import { useRolePermissions } from "@/hooks/api/useRolePermissions"
import { getAccessToken } from "@/hooks/auth/token-store"
import { useScreenPermissions } from "@/hooks/auth/useScreenPermissions"
import { formatDateTimeIST } from "@/utils/time/time-control"
import { Ionicons } from "@expo/vector-icons"
import { AlertCircle, CheckCircle, Clock, Send, X, XCircle } from "lucide-react-native"
import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

interface ShiftRequest {
  id: string
  employeeID: string
  uploadedBy?: string
  fromDate: string
  toDate: string
  appliedDate?: string
  shiftGroupCode?: string
  isAutomatic?: boolean
  shiftName?: string
  shiftStart?: string
  shiftEnd?: string
  lunchStart?: string
  lunchEnd?: string
  remarks?: string
  additionalRemarks?: string
  shift?: {
    shiftCode?: string
    shiftName?: string
    shiftStart?: string
    shiftEnd?: string
    firstHalfStart?: string
    firstHalfEnd?: string
    secondHalfStart?: string
    secondHalfEnd?: string
    lunchStart?: string
    lunchEnd?: string
    duration?: number
    crossDay?: boolean
    flexible?: boolean
    flexiFullDayDuration?: number
    flexiHalfDayDuration?: number
    minimumDurationForFullDay?: number
    minimumDurationForHalfDay?: number
  }
  status: "pending" | "approved" | "rejected" | "validated" | "failed"
  submittedAt?: Date
  uploadTime?: string
  workflowState?: string
  organizationCode?: string
  tenantCode?: string
  comment?: string
  createdOn?: string
  workflowName?: string
  stateEvent?: string
  isDeleted?: boolean
  tenantId?: string
  approverID?: string
}

interface ShiftRequestsPopupProps {
  isOpen: boolean
  onClose: () => void
  initialSelectedRequest?: ShiftRequest | null
  selectedRequestId?: string | null
  isSelfPermission?: boolean
  isAllPermission?: boolean
  userMode?: "user" | "approver"
  sourceCollectionName?: string
  onActionSuccess?: () => void
}

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
    const json = decodeURIComponent(
      atob(padded).split("").map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join("")
    )
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function safeParseDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(dateStr + "T00:00:00Z")
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(dateStr)) return new Date(dateStr + "Z")
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? undefined : d
}

function mapBackendToShiftRequest(item: any): ShiftRequest {
  const shiftSrc = item.shiftList || item.shift
  return {
    id: item._id,
    uploadedBy: item.createdBy || item.uploadedBy || "",
    employeeID: item.employeeID || "",
    fromDate: item.fromDate || "",
    toDate: item.toDate || "",
    appliedDate: item.appliedDate || "",
    shiftGroupCode: item.shiftGroupCode || "",
    isAutomatic: typeof item.isAutomatic === "boolean" ? item.isAutomatic : undefined,
    shiftName: shiftSrc?.shiftName || item.shiftName || "",
    shiftStart: shiftSrc?.shiftStart || item.shiftStart || "",
    shiftEnd: shiftSrc?.shiftEnd || item.shiftEnd || "",
    lunchStart: shiftSrc?.lunchStart || item.lunchStart || "",
    lunchEnd: shiftSrc?.lunchEnd || item.lunchEnd || "",
    shift: shiftSrc ? {
      shiftCode: shiftSrc.shiftCode,
      shiftName: shiftSrc.shiftName,
      shiftStart: shiftSrc.shiftStart,
      shiftEnd: shiftSrc.shiftEnd,
      firstHalfStart: shiftSrc.firstHalfStart,
      firstHalfEnd: shiftSrc.firstHalfEnd,
      secondHalfStart: shiftSrc.secondHalfStart,
      secondHalfEnd: shiftSrc.secondHalfEnd,
      lunchStart: shiftSrc.lunchStart,
      lunchEnd: shiftSrc.lunchEnd,
      duration: shiftSrc.duration,
      crossDay: shiftSrc.crossDay,
      flexible: shiftSrc.flexible,
      flexiFullDayDuration: shiftSrc.flexiFullDayDuration,
      flexiHalfDayDuration: shiftSrc.flexiHalfDayDuration,
      minimumDurationForFullDay: shiftSrc.minimumDurationForFullDay,
      minimumDurationForHalfDay: shiftSrc.minimumDurationForHalfDay,
    } : undefined,
    remarks: item.Remarks || "",
    additionalRemarks: item.remarks || "",
    status: item.workflowState?.toLowerCase() === "approved" ? "approved"
      : item.workflowState?.toLowerCase() === "rejected" ? "rejected"
      : item.workflowState?.toLowerCase() === "validated" ? "validated"
      : item.workflowState?.toLowerCase() === "failed" ? "failed"
      : "pending",
    submittedAt: safeParseDate(item.createdOn),
    uploadTime: item.uploadTime,
    workflowState: item.workflowState,
    organizationCode: item.organizationCode || "",
    tenantCode: item.tenantCode || "",
    comment: item.comment || "",
    createdOn: item.createdOn,
    workflowName: item.workflowName || "shiftChange Application",
    stateEvent: item.stateEvent,
    isDeleted: item.isDeleted,
    tenantId: item.tenantId,
    approverID: item.approverID || item.approvedBy || item.rejectedBy || item.cancelledBy || "",
  }
}

export default function ShiftRequestsPopup({
  isOpen,
  onClose,
  initialSelectedRequest,
  selectedRequestId,
  userMode = "user",
  sourceCollectionName,
  onActionSuccess,
}: ShiftRequestsPopupProps) {
  const [selectedRequest, setSelectedRequest] = useState<ShiftRequest | null>(initialSelectedRequest || null)
  const [showShiftDetails, setShowShiftDetails] = useState(false)
  const [punchRequests, setPunchRequests] = useState<ShiftRequest[]>([])
  const [statusAction, setStatusAction] = useState<"cancel" | "reject" | "approve" | null>(null)
  const [statusComment, setStatusComment] = useState("")
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState("")
  const [submitSuccess, setSubmitSuccess] = useState<"cancel" | "reject" | "approve" | null>(null)
  const pulseAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!submitSuccess) return
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [submitSuccess])

  const [employeeId, setEmployeeId] = useState("")
  const [tenantCode, setTenantCode] = useState("")

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken()
      if (!token) return
      const payload = decodeJwtPayload(token)
      if (!payload) return
      setEmployeeId(String(payload.employeeID ?? payload.employeeId ?? payload.empId ?? process.env.EXPO_PUBLIC_EMPLOYEE_ID ?? "") || "")
      setTenantCode(String(payload.tenantCode ?? payload.tenant ?? payload.org ?? process.env.EXPO_PUBLIC_TENANT_CODE ?? "") || "")
    }
    void run()
  }, [])

  const { loading: permsLoading } = useRolePermissions()
  const applierPerms = useScreenPermissions("applicationApplier", "shiftChange")
  const approverPerms = useScreenPermissions("applicationApprover", "shiftChange")

  // Select the permission source based on which table opened the popup.
  // Buttons are then purely driven by what the backend returns for that service.
  const activePerms = userMode === "approver" ? approverPerms : applierPerms
  const canApprove = !permsLoading && !!activePerms?.approve
  const canReject  = !permsLoading && !!activePerms?.reject
  const canCancel  = !permsLoading && !!activePerms?.cancel

  const resetPopupState = () => {
    setSelectedRequest(initialSelectedRequest || null)
    setPunchRequests([])
    setStatusAction(null)
    setStatusComment("")
    setStatusLoading(false)
    setStatusError("")
    setShowShiftDetails(false)
    setSubmitSuccess(null)
  }

  useEffect(() => {
    if (!isOpen) resetPopupState()
  }, [isOpen])

  const collectionName = useMemo(() => {
    if (sourceCollectionName) return sourceCollectionName
    const ws = selectedRequest?.workflowState?.toUpperCase()
    if (userMode === "approver") {
      if (ws === "APPROVED" || ws === "REJECTED" || ws === "CANCELLED")
        return "shiftChangeApplicationTransaction"
      return "shiftChangeApplication"
    }
    return "shiftChangeApplication"
  }, [selectedRequest?.workflowState, userMode, sourceCollectionName])

  const buildRequestData = useMemo(() => {
    const requestData: any[] = [{ field: "tenantCode", operator: "eq", value: tenantCode }]
    if (selectedRequestId) requestData.push({ field: "_id", operator: "eq", value: selectedRequestId })
    return requestData
  }, [tenantCode, selectedRequestId])

  const {
    data: attendanceResponse,
    loading: isLoading,
    refetch: fetchAttendance,
  } = useGetRequest<any>({
    url: `${collectionName}/search`,
    method: "POST",
    data: buildRequestData,
    enabled: Boolean(selectedRequestId),
    onError: (error: any) => { console.error("Error fetching shift data:", error) },
  })

  const { post: postShiftZone } = usePostRequest<any>({
    url: collectionName,
    onSuccess: () => {
      fetchAttendance()
      if (onActionSuccess) onActionSuccess()
      setSubmitSuccess(statusAction)
      setStatusLoading(false)
      setStatusAction(null)
      setStatusComment("")
      setStatusError("")
    },
    onError: (error: any) => {
      console.error("POST error:", error)
      setStatusLoading(false)
      setStatusError("Failed to update request. Please try again.")
    },
  })

  useEffect(() => {
    if (selectedRequestId) fetchAttendance()
  }, [selectedRequestId])

  useEffect(() => {
    if (attendanceResponse && Array.isArray(attendanceResponse)) {
      const mapped = attendanceResponse.map(mapBackendToShiftRequest)
      setPunchRequests(mapped)
      if (selectedRequestId) {
        const found = mapped.find((r) => r.id === selectedRequestId)
        if (found) setSelectedRequest(found)
      } else if (initialSelectedRequest) {
        setSelectedRequest(initialSelectedRequest)
      }
    }
  }, [attendanceResponse, selectedRequestId, initialSelectedRequest])

  useEffect(() => {
    if (selectedRequestId && punchRequests.length > 0) {
      const found = punchRequests.find((r) => r.id === selectedRequestId)
      if (found) setSelectedRequest(found)
    }
  }, [selectedRequestId, punchRequests])

  useEffect(() => {
    setSelectedRequest(initialSelectedRequest || null)
  }, [initialSelectedRequest])

  // ── Helpers ──────────────────────────────────────────────────────────────

  const formatDDMMYYYY = (value?: string) => {
    if (!value) return "-"
    try {
      if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
        const [dd, mm, yyyy] = value.split("-").map(Number)
        return new Date(yyyy as number, (mm as number) - 1, dd as number)
          .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      }
      return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    } catch { return value }
  }

  const toTimeLabel = (v?: string) => {
    if (!v) return ""
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(v)) {
      const [hh, mm] = v.split(":")
      const d = new Date(); d.setHours(+hh, +mm, 0)
      return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    }
    const d = new Date(v)
    return isNaN(d.getTime()) ? v : d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  }

  const formatTimeRange = (s?: string, e?: string) => {
    const a = toTimeLabel(s), b = toTimeLabel(e)
    if (!a && !b) return "-"
    if (a && b) return `${a} – ${b}`
    return a || b
  }

  const formatMinutes = (m?: number) => {
    if (m == null) return "-"
    const h = Math.floor(m / 60), min = m % 60
    return h > 0 ? `${h}h ${min}m` : `${min}m`
  }

  const getStatusStyle = (status?: string) => {
    const s = status?.toLowerCase() || ""
    if (s === "approved") return { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" }
    if (s === "pending" || s === "initiated" || s === "validated") return { bg: "bg-sky-50", text: "text-sky-500", border: "border-sky-200" }
    if (s === "rejected") return { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" }
    if (s === "failed") return { bg: "bg-red-100", text: "text-red-600", border: "border-red-200" }
    return { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" }
  }

  const getStatusIcon = (status?: string, size = 14) => {
    const s = status?.toLowerCase() || ""
    if (s === "approved") return <CheckCircle size={size} color="#2563eb" />
    if (s === "pending" || s === "initiated" || s === "validated") return <Clock size={size} color="#0ea5e9" />
    if (s === "rejected" || s === "failed") return <XCircle size={size} color="#dc2626" />
    return null
  }

  const ws = selectedRequest?.workflowState?.toUpperCase() || ""
  const isProcessed = ws === "APPROVED" || ws === "REJECTED" || ws === "CANCELLED" || ws === "FAILED"
  const showActionControls = collectionName !== "shiftChangeApplicationTransaction"
    && !isProcessed
    && (canApprove || canReject || canCancel)

  const handleSubmitAction = () => {
    if (!statusAction) return
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

    const stateEvent = statusAction === "reject" ? "REJECT" : statusAction === "approve" ? "NEXT" : "CANCEL"
    const pad = (n: number) => n < 10 ? `0${n}` : `${n}`
    const ist = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const createdOn = `${ist.getFullYear()}-${pad(ist.getMonth() + 1)}-${pad(ist.getDate())}T${pad(ist.getHours())}:${pad(ist.getMinutes())}:${pad(ist.getSeconds())}.${pad(ist.getMilliseconds())}+05:30`

    const data: any = {
      _id: selectedRequest?.id,
      tenantCode: selectedRequest?.tenantCode || tenantCode,
      workflowName: selectedRequest?.workflowName || "shiftChange Application",
      stateEvent,
      organizationCode: selectedRequest?.organizationCode || tenantCode,
      isDeleted: selectedRequest?.isDeleted || false,
      employeeID: selectedRequest?.employeeID,
      fromDate: selectedRequest?.fromDate,
      toDate: selectedRequest?.toDate,
      appliedDate: selectedRequest?.appliedDate,
      shiftGroupCode: selectedRequest?.shiftGroupCode,
      isAutomatic: selectedRequest?.isAutomatic,
      shift: selectedRequest?.shift,
      uploadedBy: selectedRequest?.uploadedBy || "user",
      createdOn: selectedRequest?.createdOn || createdOn,
      workflowState: selectedRequest?.workflowState,
      remarks: selectedRequest?.remarks,
      Remarks: selectedRequest?.remarks,
      action: statusAction,
      comment: statusComment,
      approverID: selectedRequest?.approverID || employeeId || "",
    }

    const approverId = selectedRequest?.approverID || employeeId
    if (statusAction === "approve" && approverId) data.approvedBy = approverId
    else if (statusAction === "reject" && approverId) data.rejectedBy = approverId
    else if (statusAction === "cancel" && approverId) data.cancelledBy = approverId

    postShiftZone({ tenant: tenantCode, action: "insert", id: selectedRequest?.id, event: "application", collectionName, data })
  }

  // ── Sub-components ────────────────────────────────────────────────────────

  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View className="flex-row items-start border-b border-gray-100 pb-2 mb-2">
      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-28 flex-shrink-0 pt-0.5">{label}</Text>
      <Text className="text-sm text-gray-900 font-medium flex-1">{value}</Text>
    </View>
  )

  // ── Success screen (early return) ─────────────────────────────────────────

  if (submitSuccess) {
    const rippleScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.28] })
    const rippleOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.03] })

    const isApprove = submitSuccess === "approve"
    const isReject  = submitSuccess === "reject"

    const iconBg    = isApprove ? "#16a34a" : isReject ? "#dc2626" : "#475569"
    const orbBg     = isApprove ? "#bbf7d0" : isReject ? "#fecaca" : "#e2e8f0"
    const title     = isApprove ? "Request Approved"   : isReject ? "Request Rejected"   : "Request Cancelled"
    const subtitle  = isApprove
      ? "The shift change request has been approved successfully."
      : isReject
      ? "The shift change request has been rejected."
      : "The shift change request has been cancelled."
    const iconName  = isApprove ? "checkmark" : "close"

    return (
      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 24, paddingVertical: 48, alignItems: "center" }}>

              {/* Pulsing background orb */}
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute", width: 220, height: 220, borderRadius: 110,
                  backgroundColor: orbBg, top: "18%", alignSelf: "center",
                  opacity: rippleOpacity, transform: [{ scale: rippleScale }],
                }}
              />

              {/* Icon shell */}
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

              {/* Text */}
              <Text style={{ fontFamily: "Inter", fontSize: 24, fontWeight: "800", color: "#0f172a", textAlign: "center", marginBottom: 10 }}>
                {title}
              </Text>
              <Text style={{ fontFamily: "Inter", fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 20, paddingHorizontal: 16, marginBottom: 28 }}>
                {subtitle}
              </Text>

              {/* Summary card */}
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
                      <Text style={{ fontFamily: "Inter", fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>Employee ID</Text>
                      <Text style={{ fontFamily: "Inter", marginTop: 2, fontSize: 14, fontWeight: "800", color: "#0f172a" }}>{selectedRequest.employeeID || "—"}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 14, rowGap: 14 }}>
                    {[
                      { label: "From Date",  value: formatDDMMYYYY(selectedRequest.fromDate) },
                      { label: "To Date",    value: formatDDMMYYYY(selectedRequest.toDate) },
                      { label: "Shift",      value: selectedRequest.shiftName || "—" },
                      { label: "Status",     value: submitSuccess === "approve" ? "Approved" : submitSuccess === "reject" ? "Rejected" : "Cancelled" },
                    ].map(({ label, value }) => (
                      <View key={label} style={{ width: "50%", paddingRight: 12 }}>
                        <Text style={{ fontFamily: "Inter", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>{label}</Text>
                        <Text style={{ fontFamily: "Inter", fontSize: 13, fontWeight: "700", color: isApprove && label === "Status" ? "#16a34a" : isReject && label === "Status" ? "#dc2626" : label === "Status" ? "#475569" : "#0f172a" }}>
                          {value}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Close button */}
              <TouchableOpacity
                onPress={onClose}
                style={{ height: 44, borderRadius: 8, backgroundColor: "#0a1c63", width: "100%", alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontFamily: "Inter", color: "#fff", fontSize: 15, fontWeight: "700" }}>Close</Text>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </View>
      </Modal>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-white">

        {/* Header */}
        <View style={{ paddingHorizontal: 14, paddingTop: 58, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff' }}>
          {/* Top row: back + greeting */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} color="#0f172a" />
            </TouchableOpacity>
            <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '700', color: '#0f172a' }}>Shift Change</Text>
          </View>
          {/* Title row: label + badge */}
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
                <DetailRow label="Employee ID" value={selectedRequest.employeeID || "-"} />
                {!!selectedRequest.appliedDate && <DetailRow label="Applied Date" value={formatDDMMYYYY(selectedRequest.appliedDate)} />}
                {!!selectedRequest.uploadedBy && <DetailRow label="Uploaded By" value={selectedRequest.uploadedBy} />}
                {!!selectedRequest.shiftGroupCode && <DetailRow label="Shift Group" value={selectedRequest.shiftGroupCode} />}
                {typeof selectedRequest.isAutomatic !== "undefined" && (
                  <DetailRow label="Automatic" value={selectedRequest.isAutomatic ? "Yes" : "No"} />
                )}
                {!!selectedRequest.createdOn && (
                  <DetailRow label="Created On" value={formatDateTimeIST(selectedRequest.createdOn)} />
                )}
                {!!selectedRequest.uploadTime && (
                  <DetailRow label="Upload Time" value={formatDateTimeIST(selectedRequest.uploadTime)} />
                )}
                {!!selectedRequest.shiftName && <DetailRow label="Shift Name" value={selectedRequest.shiftName} />}
                {(!!selectedRequest.fromDate || !!selectedRequest.toDate) && (
                  <DetailRow
                    label="Period"
                    value={`${formatDDMMYYYY(selectedRequest.fromDate)}${selectedRequest.toDate ? ` – ${formatDDMMYYYY(selectedRequest.toDate)}` : ""}`}
                  />
                )}
                {(!!selectedRequest.shiftStart || !!selectedRequest.shiftEnd) && (
                  <DetailRow label="Shift Timing" value={formatTimeRange(selectedRequest.shiftStart, selectedRequest.shiftEnd)} />
                )}
                {(!!selectedRequest.lunchStart || !!selectedRequest.lunchEnd) && (
                  <DetailRow label="Lunch Break" value={formatTimeRange(selectedRequest.lunchStart, selectedRequest.lunchEnd)} />
                )}
                {!!selectedRequest.remarks && <DetailRow label="Remarks" value={selectedRequest.remarks} />}
                {!!selectedRequest.additionalRemarks && <DetailRow label="Add. Remarks" value={selectedRequest.additionalRemarks} />}
                {!!selectedRequest.comment && <DetailRow label="Comment" value={selectedRequest.comment} />}
              </View>

              {/* Shift details expandable */}
              {!!selectedRequest.shift && (
                <View className="bg-white rounded-lg border border-gray-100 mb-3 overflow-hidden">
                  <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
                    <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shift Details</Text>
                    <TouchableOpacity onPress={() => setShowShiftDetails(!showShiftDetails)}>
                      <Text className="text-xs font-semibold text-blue-600">{showShiftDetails ? "Hide" : "Read more"}</Text>
                    </TouchableOpacity>
                  </View>
                  <View className="px-4 pb-3">
                    {!!selectedRequest.shift.shiftCode && <DetailRow label="Shift Code" value={selectedRequest.shift.shiftCode} />}
                    {!!selectedRequest.shift.shiftName && <DetailRow label="Shift Name" value={selectedRequest.shift.shiftName} />}
                    {showShiftDetails && (
                      <>
                        {(!!selectedRequest.shift.firstHalfStart || !!selectedRequest.shift.firstHalfEnd) && (
                          <DetailRow label="First Half" value={formatTimeRange(selectedRequest.shift.firstHalfStart, selectedRequest.shift.firstHalfEnd)} />
                        )}
                        {(!!selectedRequest.shift.secondHalfStart || !!selectedRequest.shift.secondHalfEnd) && (
                          <DetailRow label="Second Half" value={formatTimeRange(selectedRequest.shift.secondHalfStart, selectedRequest.shift.secondHalfEnd)} />
                        )}
                        {selectedRequest.shift.duration != null && (
                          <DetailRow label="Duration" value={formatMinutes(selectedRequest.shift.duration)} />
                        )}
                        {(selectedRequest.shift.crossDay != null || selectedRequest.shift.flexible != null) && (
                          <DetailRow
                            label="Flags"
                            value={[
                              selectedRequest.shift.crossDay ? "Cross Day" : "Same Day",
                              selectedRequest.shift.flexible != null ? (selectedRequest.shift.flexible ? "Flexible" : "Fixed") : "",
                            ].filter(Boolean).join(", ")}
                          />
                        )}
                        {(selectedRequest.shift.flexiFullDayDuration != null || selectedRequest.shift.flexiHalfDayDuration != null) && (
                          <DetailRow
                            label="Flexi Durations"
                            value={[
                              selectedRequest.shift.flexiFullDayDuration != null ? `Full: ${formatMinutes(selectedRequest.shift.flexiFullDayDuration)}` : "",
                              selectedRequest.shift.flexiHalfDayDuration != null ? `Half: ${formatMinutes(selectedRequest.shift.flexiHalfDayDuration)}` : "",
                            ].filter(Boolean).join(", ")}
                          />
                        )}
                        {(selectedRequest.shift.minimumDurationForFullDay != null || selectedRequest.shift.minimumDurationForHalfDay != null) && (
                          <DetailRow
                            label="Min Durations"
                            value={[
                              selectedRequest.shift.minimumDurationForFullDay != null ? `Full: ${formatMinutes(selectedRequest.shift.minimumDurationForFullDay)}` : "",
                              selectedRequest.shift.minimumDurationForHalfDay != null ? `Half: ${formatMinutes(selectedRequest.shift.minimumDurationForHalfDay)}` : "",
                            ].filter(Boolean).join(", ")}
                          />
                        )}
                      </>
                    )}
                  </View>
                </View>
              )}

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
                      onPress={handleSubmitAction}
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
                {collectionName === "shiftChangeApplication" ? (
                  <View className="p-4">
                    <AutoStatusUpdate
                      fileId={selectedRequest?.id || ""}
                      onContinue={() => {}}
                      onClose={onClose}
                    />
                  </View>
                ) : (
                  <View className="items-center justify-center py-10 px-4">
                    {(() => {
                      const st = getStatusStyle(selectedRequest?.workflowState)
                      return (
                        <>
                          <View className={`flex-row items-center gap-2 px-3 py-1.5 rounded-md border ${st.bg} ${st.border} mb-3`}>
                            {getStatusIcon(selectedRequest?.workflowState)}
                            <Text className={`text-xs font-semibold uppercase tracking-wide ${st.text}`}>
                              {selectedRequest?.workflowState?.toUpperCase() || "PROCESSED"}
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
              {isLoading || selectedRequestId ? (
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

import { Ionicons } from "@expo/vector-icons"
import { usePostRequest } from "@/hooks/api/usePostRequest"
import { getAccessToken } from "@/hooks/auth/token-store"
import React, { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

function decodeJwtPayload(token: string) {
  try {
    const p = token.split(".")[1]; if (!p) return null
    const b64 = p.replace(/-/g, "+").replace(/_/g, "/")
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=")
    return JSON.parse(decodeURIComponent(atob(padded).split("").map(c => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join(""))) as Record<string, unknown>
  } catch { return null }
}

function toyyyymmdd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function parseDateInput(val: string): Date | null {
  // Accept dd-mm-yyyy
  const m = val.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!m) return null
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  return isNaN(d.getTime()) ? null : d
}

function dateInputToApi(val: string) {
  // keep as dd-mm-yyyy for API
  if (/^\d{2}-\d{2}-\d{4}$/.test(val)) return val
  return val
}

function calcDays(from: string, to: string): number {
  const f = parseDateInput(from)
  const t = parseDateInput(to)
  if (!f || !t) return 0
  const diff = t.getTime() - f.getTime()
  return diff < 0 ? 0 : Math.round(diff / 86400000) + 1
}

const TYPE_OF_ABSENCE = [
  { value: "Time Away",        label: "Time Away",        desc: "Regular extended leave" },
  { value: "Leave of Absence", label: "Leave of Absence", desc: "Special circumstances leave" },
]

const SPECIAL_LEAVE_TITLES = [
  "Maternity Leave",
  "Paternity Leave",
  "Adoption Leave",
  "Compassionate Leave",
  "Medical Leave",
  "Study Leave",
  "Sabbatical Leave",
  "Other",
]

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface FormErrors {
  leaveTitle?: string
  fromDate?: string
  toDate?: string
}

export default function NewSpecialLeaveRequestModal({ isOpen, onClose, onSuccess }: Props) {
  const [employeeId, setEmployeeId] = useState("")
  const [tenantCode, setTenantCode] = useState("")

  const [leaveTitle, setLeaveTitle] = useState("")
  const [customLeaveTitle, setCustomLeaveTitle] = useState("")
  const [typeOfAbsence, setTypeOfAbsence] = useState<"Time Away" | "Leave of Absence">("Leave of Absence")
  const [leaveCode, setLeaveCode] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [lastDayOfWork, setLastDayOfWork] = useState("")
  const [dobOfChild, setDobOfChild] = useState("")
  const [adoptionDate, setAdoptionDate] = useState("")
  const [remarks, setRemarks] = useState("")
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState("")

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

  const resetForm = () => {
    setLeaveTitle("")
    setCustomLeaveTitle("")
    setTypeOfAbsence("Leave of Absence")
    setLeaveCode("")
    setFromDate("")
    setToDate("")
    setLastDayOfWork("")
    setDobOfChild("")
    setAdoptionDate("")
    setRemarks("")
    setErrors({})
    setSubmitError("")
  }

  useEffect(() => {
    if (!isOpen) resetForm()
  }, [isOpen])

  const noOfDays = useMemo(() => calcDays(fromDate, toDate), [fromDate, toDate])

  const showChildFields = leaveTitle === "Maternity Leave" || leaveTitle === "Adoption Leave" || leaveTitle === "Paternity Leave"

  const { post, loading } = usePostRequest<any>({
    url: "specialLeaveApplication",
    onSuccess: () => {
      resetForm()
      onSuccess?.()
      onClose()
    },
    onError: (err: any) => setSubmitError(err?.message || "Failed to submit. Please try again."),
  })

  const validate = (): boolean => {
    const e: FormErrors = {}
    const finalTitle = leaveTitle === "Other" ? customLeaveTitle.trim() : leaveTitle
    if (!finalTitle) e.leaveTitle = "Select or enter a leave title"
    if (!fromDate || !parseDateInput(fromDate)) e.fromDate = "Enter a valid date (dd-mm-yyyy)"
    if (!toDate || !parseDateInput(toDate)) e.toDate = "Enter a valid date (dd-mm-yyyy)"
    if (fromDate && toDate && parseDateInput(fromDate) && parseDateInput(toDate)) {
      const f = parseDateInput(fromDate)!
      const t = parseDateInput(toDate)!
      if (t < f) e.toDate = "To date must be after from date"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    setSubmitError("")
    const finalTitle = leaveTitle === "Other" ? customLeaveTitle.trim() : leaveTitle
    const defaultLeaveCode = finalTitle === "Maternity Leave" ? "ML" : "PL"
    const now = new Date()

    post({
      tenant: tenantCode,
      action: "insert",
      id: "",
      event: "application",
      collectionName: "specialLeaveApplication",
      data: {
        tenantCode,
        workflowName: "specialLeave Application",
        stateEvent: "NEXT",
        uploadedBy: employeeId,
        createdBy: employeeId,
        createdOn: now.toISOString(),
        employeeID: employeeId,
        leaveCode: leaveCode.trim() || defaultLeaveCode,
        lastDayOfWork: lastDayOfWork ? dateInputToApi(lastDayOfWork) : "",
        fromDate: dateInputToApi(fromDate),
        toDate: dateInputToApi(toDate),
        noOfDays: String(noOfDays),
        DOBOfChild: dobOfChild ? dateInputToApi(dobOfChild) : "",
        AdoptionPlacementDate: adoptionDate ? dateInputToApi(adoptionDate) : "",
        organizationCode: tenantCode,
        appliedDate: toyyyymmdd(now),
        workflowState: "INITIATED",
        remarks: remarks.trim(),
        leaveTitle: finalTitle,
        documents: [],
        documentCount: 0,
      },
    })
  }

  const DateField = ({ label, value, onChange, error, placeholder = "dd-mm-yyyy" }: {
    label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string
  }) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: "#4b5563", marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={v => { onChange(v); setErrors(prev => ({ ...prev })) }}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType="numeric"
        maxLength={10}
        style={{
          borderWidth: 1,
          borderColor: error ? "#f87171" : "#d1d5db",
          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
          fontSize: 13, color: "#111827",
        }}
      />
      {!!error && <Text style={{ fontSize: 11, color: "#ef4444", marginTop: 3 }}>{error}</Text>}
    </View>
  )

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#fff" }}>

        {/* Header */}
        <View style={{ paddingHorizontal: 14, paddingTop: 58, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={16} color="#0f172a" />
            </TouchableOpacity>
            <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '700', color: '#0f172a' }}>New Special Leave Request</Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }} keyboardShouldPersistTaps="handled">

          {!!submitError && (
            <View style={{ backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: 10, padding: 12, marginBottom: 14, flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <Ionicons name="alert-circle-outline" size={16} color="#dc2626" style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 13, color: "#dc2626", lineHeight: 18 }}>{submitError}</Text>
            </View>
          )}

          {/* Leave Title */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#4b5563", marginBottom: 6 }}>Leave Title *</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SPECIAL_LEAVE_TITLES.map(title => (
                <TouchableOpacity
                  key={title}
                  onPress={() => { setLeaveTitle(title); setErrors(prev => ({ ...prev, leaveTitle: undefined })) }}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
                    backgroundColor: leaveTitle === title ? "#7c3aed" : "#fff",
                    borderColor: leaveTitle === title ? "#7c3aed" : "#d1d5db",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: leaveTitle === title ? "#fff" : "#374151" }}>
                    {title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {leaveTitle === "Other" && (
              <TextInput
                value={customLeaveTitle}
                onChangeText={v => { setCustomLeaveTitle(v); setErrors(prev => ({ ...prev, leaveTitle: undefined })) }}
                placeholder="Enter leave title..."
                placeholderTextColor="#9ca3af"
                style={{ marginTop: 8, borderWidth: 1, borderColor: errors.leaveTitle ? "#f87171" : "#d1d5db", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: "#111827" }}
              />
            )}
            {!!errors.leaveTitle && <Text style={{ fontSize: 11, color: "#ef4444", marginTop: 3 }}>{errors.leaveTitle}</Text>}
          </View>

          {/* Type of Absence */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#4b5563", marginBottom: 6 }}>Type of Absence</Text>
            <View style={{ gap: 8 }}>
              {TYPE_OF_ABSENCE.map(opt => {
                const active = typeOfAbsence === opt.value
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setTypeOfAbsence(opt.value as typeof typeOfAbsence)}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      padding: 12, borderRadius: 10, borderWidth: 1,
                      backgroundColor: active ? "#f5f3ff" : "#fff",
                      borderColor: active ? "#7c3aed" : "#d1d5db",
                    }}
                  >
                    <View style={{
                      width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                      borderColor: active ? "#7c3aed" : "#9ca3af",
                      alignItems: "center", justifyContent: "center", marginRight: 10,
                    }}>
                      {active && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#7c3aed" }} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "#6d28d9" : "#111827" }}>{opt.label}</Text>
                      <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>{opt.desc}</Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Leave Code (optional override) */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#4b5563", marginBottom: 6 }}>Leave Code <Text style={{ fontWeight: "400", color: "#9ca3af" }}>(optional)</Text></Text>
            <TextInput
              value={leaveCode}
              onChangeText={setLeaveCode}
              placeholder="e.g. ML, PL, AL..."
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: "#111827" }}
            />
          </View>

          {/* Date Range */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 0 }}>
            <View style={{ flex: 1 }}>
              <DateField
                label="From Date *"
                value={fromDate}
                onChange={v => { setFromDate(v); setErrors(prev => ({ ...prev, fromDate: undefined })) }}
                error={errors.fromDate}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DateField
                label="To Date *"
                value={toDate}
                onChange={v => { setToDate(v); setErrors(prev => ({ ...prev, toDate: undefined })) }}
                error={errors.toDate}
              />
            </View>
          </View>

          {/* No. of Days (auto-calculated) */}
          {noOfDays > 0 && (
            <View style={{ backgroundColor: "#f5f3ff", borderWidth: 1, borderColor: "#ddd6fe", borderRadius: 10, padding: 10, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="calendar-outline" size={16} color="#7c3aed" />
              <Text style={{ fontSize: 13, color: "#6d28d9", fontWeight: "600" }}>
                {noOfDays} day{noOfDays !== 1 ? "s" : ""} selected
              </Text>
            </View>
          )}

          {/* Last Day of Work */}
          <DateField
            label="Last Day of Work"
            value={lastDayOfWork}
            onChange={setLastDayOfWork}
            placeholder="dd-mm-yyyy (optional)"
          />

          {/* Child-related fields */}
          {showChildFields && (
            <>
              <DateField
                label={leaveTitle === "Adoption Leave" ? "Adoption Placement Date" : "Date of Birth of Child"}
                value={leaveTitle === "Adoption Leave" ? adoptionDate : dobOfChild}
                onChange={leaveTitle === "Adoption Leave" ? setAdoptionDate : setDobOfChild}
                placeholder="dd-mm-yyyy (optional)"
              />
            </>
          )}

          {/* Remarks */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#4b5563", marginBottom: 6 }}>Remarks</Text>
            <TextInput
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Reason for special leave..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: "#111827", height: 80, textAlignVertical: "top" }}
            />
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Footer buttons */}
        <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb" }}>
          <TouchableOpacity
            onPress={onClose}
            disabled={loading}
            style={{ flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: "#d1d5db", alignItems: "center", opacity: loading ? 0.5 : 1 }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={{ flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: "#7c3aed", alignItems: "center", opacity: loading ? 0.7 : 1 }}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>Submit Request</Text>
            }
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  )
}

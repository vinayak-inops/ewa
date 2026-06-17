import { useGetRequest } from "@/hooks/api/useGetRequest"
import { usePostRequest } from "@/hooks/api/usePostRequest"
import { RootState } from "@/store"
import { Ionicons } from "@expo/vector-icons"
import { Check, ChevronDown, Search, X } from "lucide-react-native"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { useSelector } from "react-redux"
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

const FONT = "Inter"
const NAVY = "#13206b"
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormErrors {
  employeeID?: string
  attendanceDate?: string
  typeOfMovement?: string
  punchedTimeStr?: string
  transactionTime?: string
  remarks?: string
}

interface Props {
  onClose: () => void
  prefillEmployeeId?: string
  prefillDate?: string
  onSuccess?: () => void
}

const IN_OUT_OPTIONS = [
  { value: "I", label: "In  (I)" },
  { value: "O", label: "Out (O)" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function thirtyDaysAgoStr() {
  const d = new Date(); d.setDate(d.getDate() - 30)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function nowTimeStr() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function formatDisplayDate(iso: string) {
  if (!iso) return ""
  const [yyyy, mm, dd] = iso.split("-")
  if (!yyyy || !mm || !dd) return iso
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return `${dd} ${m[parseInt(mm, 10) - 1]} ${yyyy}`
}

function validate(fields: {
  employeeID: string; attendanceDate: string; typeOfMovement: string
  punchedTimeStr: string; transactionTime: string; remarks: string
}): FormErrors {
  const e: FormErrors = {}
  if (!fields.employeeID.trim()) e.employeeID = "Employee ID is required"

  if (!fields.attendanceDate) {
    e.attendanceDate = "Attendance date is required"
  } else {
    const selected = new Date(fields.attendanceDate)
    const today = new Date(); today.setHours(23, 59, 59, 999)
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    if (selected > today) e.attendanceDate = "Attendance date cannot be in the future"
    else if (selected < thirtyDaysAgo) e.attendanceDate = "Attendance date cannot be more than 30 days old"
  }

  if (!fields.typeOfMovement) e.typeOfMovement = "Type of movement is required"
  if (!fields.punchedTimeStr || !/^\d{2}:\d{2}/.test(fields.punchedTimeStr)) e.punchedTimeStr = "Enter a valid punched time (HH:mm)"
  if (!fields.transactionTime || !/^\d{2}:\d{2}/.test(fields.transactionTime)) e.transactionTime = "Enter a valid transaction time (HH:mm)"

  if (!fields.remarks.trim()) e.remarks = "Remarks are required"
  else if (fields.remarks.trim().length < 10) e.remarks = "Remarks must be at least 10 characters"
  else if (fields.remarks.trim().length > 500) e.remarks = "Remarks must not exceed 500 characters"

  return e
}

// ── Date Picker ───────────────────────────────────────────────────────────────

function DatePickerModal({ visible, onClose, onSelect, minDate, maxDate, title, selected }: {
  visible: boolean; onClose: () => void; onSelect: (iso: string) => void
  minDate?: string; maxDate?: string; title: string; selected: string
}) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const minObj = useMemo(() => {
    const d = minDate ? new Date(minDate) : new Date(0); d.setHours(0, 0, 0, 0); return d
  }, [minDate])

  const maxObj = useMemo(() => {
    const d = maxDate ? new Date(maxDate) : new Date(9999, 11, 31); d.setHours(23, 59, 59, 999); return d
  }, [maxDate])

  const days = useMemo(() => {
    const count = new Date(year, month + 1, 0).getDate()
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Array.from({ length: count }, (_, i) => {
      const d = i + 1
      const date = new Date(year, month, d); date.setHours(0, 0, 0, 0)
      return { d, disabled: date < minObj || date > maxObj, isToday: date.getTime() === today.getTime() }
    })
  }, [year, month, minObj, maxObj])

  const blanks = Array(new Date(year, month, 1).getDay()).fill(null)
  const prev = () => month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1)
  const next = () => month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()} style={s.calCard}>
          <View style={s.calHeader}>
            <Text style={s.calTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={s.calClose}><X size={13} color="#fff" /></View>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 14 }}>
            <View style={s.calNav}>
              <TouchableOpacity onPress={prev} style={s.navBtn}>
                <ChevronDown size={14} color="#374151" style={{ transform: [{ rotate: "90deg" }] }} />
              </TouchableOpacity>
              <Text style={s.calMonth}>{MONTHS[month]} {year}</Text>
              <TouchableOpacity onPress={next} style={s.navBtn}>
                <ChevronDown size={14} color="#374151" style={{ transform: [{ rotate: "-90deg" }] }} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 4 }}>
              {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                <View key={d} style={{ flex: 1, alignItems: "center" }}>
                  <Text style={s.dayHead}>{d}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {blanks.map((_, i) => <View key={`b${i}`} style={{ width: `${100/7}%` }} />)}
              {days.map(({ d, disabled, isToday }) => {
                const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
                const sel = iso === selected
                return (
                  <View key={d} style={{ width: `${100/7}%`, alignItems: "center", paddingVertical: 2 }}>
                    <TouchableOpacity
                      disabled={disabled}
                      onPress={() => { onSelect(iso); onClose() }}
                      style={[s.dayCell, sel && s.daySel, isToday && !sel && s.dayToday, disabled && { opacity: 0.25 }]}
                    >
                      <Text style={[s.dayNum, sel && { color: "#fff", fontWeight: "700" }, isToday && !sel && { color: NAVY }]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ── Picker Modal ──────────────────────────────────────────────────────────────

function PickerModal({ visible, onClose, title, options, onSelect, selectedValue, loading }: {
  visible: boolean; onClose: () => void; title: string
  options: { value: string; label: string }[]
  onSelect: (value: string) => void
  selectedValue: string; loading?: boolean
}) {
  const [search, setSearch] = useState("")
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.value.toLowerCase().includes(search.toLowerCase())
  )
  useEffect(() => { if (!visible) setSearch("") }, [visible])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.sheetBg}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={s.sheetClose}><X size={13} color="#64748b" /></View>
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
            <View style={s.searchWrap}>
              <Search size={13} color="#9ca3af" />
              <TextInput value={search} onChangeText={setSearch} placeholder="Search..." placeholderTextColor="#9ca3af"
                style={{ flex: 1, marginLeft: 8, fontSize: 13, fontFamily: FONT, color: "#0f172a" }} />
            </View>
          </View>
          {loading ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <ActivityIndicator size="small" color={NAVY} />
              <Text style={[s.muted, { marginTop: 6 }]}>Loading...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <Text style={s.muted}>No options found</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => item.value}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => {
                const sel = item.value === selectedValue
                return (
                  <TouchableOpacity
                    onPress={() => { onSelect(item.value); onClose() }}
                    style={[s.optRow, sel && { backgroundColor: "#f0f4ff" }]}
                  >
                    <Text style={[s.optLabel, sel && { color: NAVY, fontWeight: "700" }]}>{item.label}</Text>
                    {sel && <View style={s.optCheck}><Check size={10} color="#fff" /></View>}
                  </TouchableOpacity>
                )
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  )
}

// ── Reusable field pieces ─────────────────────────────────────────────────────

function Label({ text, required = true }: { text: string; required?: boolean }) {
  return (
    <Text style={s.label}>
      {text}{required && <Text style={{ color: "#ef4444" }}> *</Text>}
    </Text>
  )
}

function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null
  return <Text style={s.errText}>{msg}</Text>
}

function SelectRow({ value, placeholder, onPress, error, loading }: {
  value?: string; placeholder: string; onPress: () => void; error?: string; loading?: boolean
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[s.inputWrap, error ? s.inputError : null]}>
      <Text style={[s.inputText, !value && s.placeholder]} numberOfLines={1}>{value || placeholder}</Text>
      {loading
        ? <ActivityIndicator size="small" color={NAVY} />
        : <ChevronDown size={14} color="#9ca3af" />
      }
    </TouchableOpacity>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PunchFormPopup({ onClose, prefillEmployeeId = "", prefillDate = "", onSuccess }: Props) {
  const jwtEmployeeId = useSelector((s: RootState) => s.role.employeeId) ?? ""
  const tenantCode = useSelector((s: RootState) => s.role.org) ?? ""

  const [employeeID, setEmployeeID] = useState(prefillEmployeeId || jwtEmployeeId)
  const [attendanceDate, setAttendanceDate] = useState(prefillDate || todayStr())
  const [typeOfMovement, setTypeOfMovement] = useState("")
  const [punchedDate, setPunchedDate] = useState(prefillDate || todayStr())
  const [punchedTimeStr, setPunchedTimeStr] = useState(nowTimeStr())
  const [inOut, setInOut] = useState<"I" | "O">("I")
  const [transactionTime, setTransactionTime] = useState(nowTimeStr())
  const [remarks, setRemarks] = useState("")

  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successData, setSuccessData] = useState<{ employeeID: string; attendanceDate: string } | null>(null)
  const pulseAnim = useRef(new Animated.Value(0)).current

  const [showAttendancePicker, setShowAttendancePicker] = useState(false)
  const [showPunchedDatePicker, setShowPunchedDatePicker] = useState(false)
  const [showMovementPicker, setShowMovementPicker] = useState(false)

  useEffect(() => { if (prefillEmployeeId) setEmployeeID(prefillEmployeeId) }, [prefillEmployeeId])
  useEffect(() => {
    if (prefillDate) { setAttendanceDate(prefillDate); setPunchedDate(prefillDate) }
  }, [prefillDate])

  // ── Fetch reasonCodes from organization API ──────────────────────────────────
  const { data: orgData, loading: orgLoading } = useGetRequest<any[]>({
    url: "organization/search",
    method: "POST",
    data: [{ field: "tenantCode", operator: "eq", value: tenantCode }],
    enabled: Boolean(tenantCode),
  })

  const reasonCodes = useMemo((): { value: string; label: string }[] => {
    if (!Array.isArray(orgData) || orgData.length === 0) return []
    const codes = orgData[0]?.reasonCodes
    if (!Array.isArray(codes)) return []
    return codes.map((r: any) => ({ value: r.reasonCode ?? "", label: r.reasonName ?? r.reasonCode ?? "" }))
  }, [orgData])

  // ── Pulse animation ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showSuccess) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [showSuccess])

  // ── POST ─────────────────────────────────────────────────────────────────────
  const { post, loading: posting } = usePostRequest<any>({
    url: "forgotPunchApplication",
    onSuccess: () => setShowSuccess(true),
    onError: (err) => setErrors(p => ({ ...p, remarks: (err as any)?.message || "Submission failed. Please try again." })),
  })

  const handleSubmit = () => {
    setSubmitted(true)
    const errs = validate({ employeeID, attendanceDate, typeOfMovement, punchedTimeStr, transactionTime, remarks })
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSuccessData({ employeeID, attendanceDate: formatDisplayDate(attendanceDate) })

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    const ist = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const yyyy = ist.getFullYear(), mm = pad(ist.getMonth() + 1), dd = pad(ist.getDate())
    const hh = pad(ist.getHours()), mi = pad(ist.getMinutes()), ss = pad(ist.getSeconds())

    const punchedTimeFull = punchedTimeStr.length === 5 ? `${punchedTimeStr}:00` : punchedTimeStr
    const transTimeFull = transactionTime.length === 5 ? `${transactionTime}:00` : transactionTime

    post({
      tenant: tenantCode,
      action: "insert",
      id: null,
      event: "application",
      collectionName: "forgotPunchApplication",
      data: {
        tenantCode,
        organizationCode: tenantCode,
        workflowName: "forgotPunch Application",
        stateEvent: "NEXT",
        workflowState: "INITIATED",
        uploadedBy: jwtEmployeeId,
        createdBy: jwtEmployeeId,
        createdOn: `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`,
        uploadTime: `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`,
        appliedDate: `${yyyy}-${mm}-${dd}`,
        employeeID,
        attendanceDate,
        punchedTime: `${punchedDate}T${punchedTimeFull}`,
        transactionTime: `${attendanceDate}T${transTimeFull}`,
        inOut,
        typeOfMovement,
        remarks: remarks.trim(),
        isDeleted: false,
      },
    })
  }

  const handleClose = () => {
    setErrors({})
    setSubmitted(false)
    onClose()
  }

  // ── Success ──────────────────────────────────────────────────────────────────

  if (showSuccess) {
    const rippleScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.28] })
    const rippleOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.03] })
    return (
      <View style={s.screen}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View style={[s.frame, { alignItems: "center", justifyContent: "center", paddingTop: 72 }]}>

            <Animated.View pointerEvents="none" style={[s.bgOrb, { opacity: rippleOpacity, transform: [{ scale: rippleScale }] }]} />
            <View style={s.iconShell}>
              <Animated.View pointerEvents="none" style={[s.iconRipple, { opacity: rippleOpacity, transform: [{ scale: rippleScale }] }]} />
              <Ionicons name="checkmark" size={42} color="#fff" />
            </View>

            <Text style={s.successTitle}>Request Submitted</Text>
            <Text style={s.successSub}>
              Your punch application has been submitted successfully and is now pending approval.
            </Text>

            <View style={s.successCard}>
              <View style={s.successRefRow}>
                <View style={s.successRefIcon}>
                  <Ionicons name="document-text-outline" size={16} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.successRefLabel}>Employee ID</Text>
                  <Text style={s.successRefValue}>{successData?.employeeID || "—"}</Text>
                </View>
              </View>
              <View style={s.successGrid}>
                <View style={s.successGridItem}>
                  <Text style={s.successGridLabel}>Attendance Date</Text>
                  <Text style={s.successGridValue}>{successData?.attendanceDate || "—"}</Text>
                </View>
                <View style={s.successGridItem}>
                  <Text style={s.successGridLabel}>Punched Time</Text>
                  <Text style={s.successGridValue}>{punchedTimeStr}</Text>
                </View>
                <View style={s.successGridItem}>
                  <Text style={s.successGridLabel}>In / Out</Text>
                  <Text style={s.successGridValue}>{inOut === "I" ? "In" : "Out"}</Text>
                </View>
                <View style={s.successGridItem}>
                  <Text style={s.successGridLabel}>Status</Text>
                  <Text style={[s.successGridValue, { color: "#2563eb" }]}>Initiated</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[s.btn, { marginTop: 20, width: "100%" }]}
              onPress={() => { setShowSuccess(false); onSuccess?.(); handleClose() }}
            >
              <Text style={s.btnText}>Back to Applications</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </View>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────────

  const hasErrors = submitted && Object.values(errors).some(Boolean)
  const movementLabel = reasonCodes.find(r => r.value === typeOfMovement)?.label || typeOfMovement

  return (
    <View style={s.screen}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View style={s.frame}>

          {/* Top row */}
          <View style={s.topRow}>
            <View style={s.leftGroup}>
              <Pressable onPress={handleClose} hitSlop={8} style={s.backBtn}>
                <X size={16} color="#0f172a" />
              </Pressable>
              <Text style={s.greeting}>Punch Application</Text>
            </View>
          </View>

          {/* Title row */}
          <View style={s.titleRow}>
            <Text style={s.titleLabel}>New Application</Text>
            <View style={s.badge}>
              <Text style={s.badgeText}>Forgot Punch</Text>
            </View>
          </View>

          {/* Main card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Fill in the details below</Text>
            <Text style={s.cardSub}>Enter attendance date, punch time, movement type and remarks to submit your punch request.</Text>
            <View style={s.separator} />

            {/* Employee ID */}
            <Label text="Employee ID" />
            <TextInput
              value={employeeID}
              onChangeText={v => {
                setEmployeeID(v)
                if (submitted) setErrors(p => ({ ...p, employeeID: v.trim() ? undefined : "Employee ID is required" }))
              }}
              placeholder="e.g. EMP001"
              placeholderTextColor="#9ca3af"
              style={[s.input, errors.employeeID ? s.inputError : null]}
            />
            <ErrText msg={errors.employeeID} />

            {/* Attendance Date */}
            <Label text="Attendance Date" />
            <SelectRow
              value={attendanceDate ? formatDisplayDate(attendanceDate) : ""}
              placeholder="Select date"
              onPress={() => setShowAttendancePicker(true)}
              error={errors.attendanceDate}
            />
            <ErrText msg={errors.attendanceDate} />

            {/* Type of Movement */}
            <Label text="Type of Movement" />
            <SelectRow
              value={movementLabel}
              placeholder={orgLoading ? "Loading..." : reasonCodes.length === 0 && tenantCode ? "No reasons configured" : "Select reason"}
              onPress={() => { if (reasonCodes.length > 0) setShowMovementPicker(true) }}
              error={errors.typeOfMovement}
              loading={orgLoading}
            />
            <ErrText msg={errors.typeOfMovement} />

            {/* Punched Date + Time */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Label text="Punched Date" />
                <SelectRow
                  value={punchedDate ? formatDisplayDate(punchedDate) : ""}
                  placeholder="Select date"
                  onPress={() => setShowPunchedDatePicker(true)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label text="Punched Time (HH:mm)" />
                <TextInput
                  value={punchedTimeStr}
                  onChangeText={v => {
                    setPunchedTimeStr(v)
                    if (submitted) setErrors(p => ({ ...p, punchedTimeStr: /^\d{2}:\d{2}/.test(v) ? undefined : "Enter valid time (HH:mm)" }))
                  }}
                  placeholder="09:00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  style={[s.input, errors.punchedTimeStr ? s.inputError : null]}
                />
              </View>
            </View>
            <ErrText msg={errors.punchedTimeStr} />

            {/* In / Out */}
            <Label text="In / Out" />
            <View style={{ flexDirection: "row", gap: 10 }}>
              {IN_OUT_OPTIONS.map(opt => {
                const active = inOut === opt.value
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setInOut(opt.value as "I" | "O")}
                    style={[s.toggleBtn, { flex: 1 }, active && s.toggleActive]}
                  >
                    <Text style={[s.toggleText, active && s.toggleTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Transaction Time */}
            <Label text="Transaction Time (HH:mm)" />
            <TextInput
              value={transactionTime}
              onChangeText={v => {
                setTransactionTime(v)
                if (submitted) setErrors(p => ({ ...p, transactionTime: /^\d{2}:\d{2}/.test(v) ? undefined : "Enter valid time (HH:mm)" }))
              }}
              placeholder="09:00"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              style={[s.input, errors.transactionTime ? s.inputError : null]}
            />
            <Text style={[s.muted, { fontSize: 10, marginTop: 3 }]}>Time when the transaction was processed</Text>
            <ErrText msg={errors.transactionTime} />

            {/* Remarks */}
            <Label text="Remarks" />
            <TextInput
              value={remarks}
              onChangeText={v => {
                setRemarks(v)
                if (submitted) {
                  const e = !v.trim() ? "Remarks are required"
                    : v.trim().length < 10 ? "Minimum 10 characters"
                    : v.trim().length > 500 ? "Maximum 500 characters"
                    : undefined
                  setErrors(p => ({ ...p, remarks: e }))
                }
              }}
              placeholder="Enter remarks (minimum 10 characters)"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[s.textArea, errors.remarks ? s.inputError : null]}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
              <ErrText msg={errors.remarks} />
              <Text style={[s.muted, { fontSize: 10, marginLeft: "auto", color: remarks.length > 500 ? "#ef4444" : "#9ca3af" }]}>
                {remarks.length}/500
              </Text>
            </View>
          </View>

          {/* Error summary */}
          {hasErrors && (
            <View style={s.errBox}>
              <Text style={s.errBoxTitle}>Please fix the errors above before submitting.</Text>
              {Object.entries(errors).filter(([, v]) => Boolean(v)).map(([k, v]) => (
                <Text key={k} style={s.errBoxItem}>• {v}</Text>
              ))}
            </View>
          )}

          {/* Note */}
          <Text style={s.note}>
            Ensure all details are correct before submitting. Once submitted, the request will be sent for approval.
          </Text>

          {/* Submit */}
          <TouchableOpacity
            style={[s.btn, posting && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={posting}
          >
            {posting ? (
              <><ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} /><Text style={s.btnText}>Submitting...</Text></>
            ) : (
              <Text style={s.btnText}>Submit Punch Request</Text>
            )}
          </TouchableOpacity>

          {/* Cancel link */}
          <TouchableOpacity onPress={handleClose} style={{ alignItems: "center", marginTop: 14 }}>
            <Text style={s.cancelLink}>Cancel</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Date pickers */}
      <DatePickerModal
        visible={showAttendancePicker} onClose={() => setShowAttendancePicker(false)}
        title="Select Attendance Date" selected={attendanceDate}
        minDate={thirtyDaysAgoStr()} maxDate={todayStr()}
        onSelect={v => {
          setAttendanceDate(v)
          if (submitted) setErrors(p => ({ ...p, attendanceDate: undefined }))
        }}
      />
      <DatePickerModal
        visible={showPunchedDatePicker} onClose={() => setShowPunchedDatePicker(false)}
        title="Select Punched Date" selected={punchedDate}
        minDate={thirtyDaysAgoStr()} maxDate={todayStr()}
        onSelect={v => setPunchedDate(v)}
      />
      <PickerModal
        visible={showMovementPicker} onClose={() => setShowMovementPicker(false)}
        title="Select Type of Movement"
        options={reasonCodes} selectedValue={typeOfMovement} loading={orgLoading}
        onSelect={v => {
          setTypeOfMovement(v)
          if (submitted) setErrors(p => ({ ...p, typeOfMovement: undefined }))
        }}
      />
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  frame: { flex: 1, paddingHorizontal: 14, paddingTop: 58, paddingBottom: 24 },

  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  leftGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  backBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#e2e8f0" },
  greeting: { fontFamily: FONT, color: "#0f172a", fontSize: 20, fontWeight: "700" },

  titleRow: { marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titleLabel: { fontFamily: FONT, fontSize: 18, fontWeight: "600", color: "#0f172a" },
  badge: { borderRadius: 999, backgroundColor: NAVY, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontFamily: FONT, fontSize: 12, fontWeight: "700", color: "#fff" },

  card: { marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#fff", padding: 14 },
  cardTitle: { fontFamily: FONT, fontSize: 18, fontWeight: "700", color: "#0f172a", textAlign: "center" },
  cardSub: { fontFamily: FONT, marginTop: 6, fontSize: 12, color: "#64748b", textAlign: "center", lineHeight: 16, paddingHorizontal: 8 },
  separator: { height: 1, backgroundColor: "#e2e8f0", marginTop: 14, marginBottom: 4 },

  label: { fontFamily: FONT, fontSize: 10, color: "#64748b", marginBottom: 6, fontWeight: "600", marginTop: 12 },
  inputWrap: {
    minHeight: 38, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 6,
    backgroundColor: "#f8fafc", paddingHorizontal: 10,
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  input: {
    fontFamily: FONT, minHeight: 38, borderWidth: 1, borderColor: "#e2e8f0",
    borderRadius: 6, backgroundColor: "#f8fafc", paddingHorizontal: 10,
    fontSize: 13, color: "#0f172a", paddingVertical: 10,
  },
  inputError: { borderColor: "#fca5a5", backgroundColor: "#fff5f5" },
  inputText: { fontFamily: FONT, flex: 1, fontSize: 13, color: "#0f172a", paddingVertical: 10 },
  placeholder: { color: "#9ca3af" },
  textArea: {
    fontFamily: FONT, minHeight: 96, borderWidth: 1, borderColor: "#e2e8f0",
    borderRadius: 6, backgroundColor: "#f8fafc", paddingHorizontal: 10,
    paddingVertical: 10, fontSize: 13, color: "#0f172a",
  },
  errText: { fontFamily: FONT, marginTop: 4, fontSize: 11, color: "#b91c1c" },

  toggleBtn: {
    height: 38, borderRadius: 6, borderWidth: 1, borderColor: "#e2e8f0",
    alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc",
  },
  toggleActive: { borderColor: NAVY, backgroundColor: "#eef2ff" },
  toggleText: { fontFamily: FONT, fontSize: 12, fontWeight: "600", color: "#64748b" },
  toggleTextActive: { color: NAVY, fontWeight: "700" },

  errBox: { marginTop: 12, backgroundColor: "#fff5f5", borderWidth: 1, borderColor: "#fecaca", borderRadius: 10, padding: 12 },
  errBoxTitle: { fontFamily: FONT, fontSize: 12, fontWeight: "700", color: "#dc2626", marginBottom: 4 },
  errBoxItem: { fontFamily: FONT, fontSize: 11, color: "#b91c1c", marginLeft: 6, marginBottom: 2 },

  note: { fontFamily: FONT, marginTop: 20, fontSize: 10, color: "#64748b", textAlign: "center", lineHeight: 14, paddingHorizontal: 12 },
  btn: { marginTop: 12, height: 44, borderRadius: 6, backgroundColor: NAVY, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontFamily: FONT, color: "#fff", fontSize: 15, fontWeight: "700" },
  cancelLink: { fontFamily: FONT, fontSize: 12, color: "#64748b" },

  bgOrb: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "#bbf7d0", top: "20%", alignSelf: "center" },
  iconShell: { width: 110, height: 110, borderRadius: 55, backgroundColor: "#16a34a", alignItems: "center", justifyContent: "center", marginBottom: 20, shadowColor: "#16a34a", shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6, overflow: "visible" },
  iconRipple: { position: "absolute", width: 152, height: 152, borderRadius: 76, backgroundColor: "#86efac" },
  successTitle: { fontFamily: FONT, fontSize: 24, fontWeight: "800", color: "#0f172a", textAlign: "center", marginBottom: 8 },
  successSub: { fontFamily: FONT, fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 20, paddingHorizontal: 22, marginBottom: 4 },
  successCard: { width: "100%", marginTop: 24, borderRadius: 20, borderWidth: 1, borderColor: "#dbeafe", backgroundColor: "#fff", padding: 16, shadowColor: "#0f172a", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  successRefRow: { flexDirection: "row", alignItems: "center", paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  successRefIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center", marginRight: 10 },
  successRefLabel: { fontFamily: FONT, fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 },
  successRefValue: { fontFamily: FONT, marginTop: 2, fontSize: 14, fontWeight: "800", color: "#0f172a" },
  successGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 14, rowGap: 14 },
  successGridItem: { width: "50%", paddingRight: 12 },
  successGridLabel: { fontFamily: FONT, fontSize: 11, color: "#94a3b8", marginBottom: 4 },
  successGridValue: { fontFamily: FONT, fontSize: 13, fontWeight: "700", color: "#0f172a" },

  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  calCard: { backgroundColor: "#fff", borderRadius: 16, width: "100%", maxWidth: 340, overflow: "hidden" },
  calHeader: { backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  calTitle: { fontFamily: FONT, color: "#fff", fontWeight: "700", fontSize: 13 },
  calClose: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  calNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  calMonth: { fontFamily: FONT, fontSize: 13, fontWeight: "700", color: "#0f172a" },
  navBtn: { width: 30, height: 30, borderRadius: 6, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  dayHead: { fontFamily: FONT, fontSize: 10, fontWeight: "700", color: "#94a3b8" },
  dayCell: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  daySel: { backgroundColor: NAVY },
  dayToday: { backgroundColor: "#e0e7ff" },
  dayNum: { fontFamily: FONT, fontSize: 11, color: "#374151" },

  sheetBg: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "70%" },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#e2e8f0", alignSelf: "center", marginTop: 10, marginBottom: 4 },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  sheetTitle: { fontFamily: FONT, fontSize: 14, fontWeight: "700", color: "#0f172a" },
  sheetClose: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 6, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 10, height: 38 },
  optRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#f8fafc" },
  optLabel: { fontFamily: FONT, fontSize: 13, color: "#374151", flex: 1 },
  optCheck: { width: 18, height: 18, borderRadius: 9, backgroundColor: NAVY, alignItems: "center", justifyContent: "center" },
  muted: { fontFamily: FONT, fontSize: 12, color: "#9ca3af" },
})

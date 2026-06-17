import { usePostRequest } from "@/hooks/api/usePostRequest"
import { RootState } from "@/store"
import { Ionicons } from "@expo/vector-icons"
import { ChevronDown, Clock, X } from "lucide-react-native"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { useSelector } from "react-redux"
import {
  ActivityIndicator, Animated, Easing, Modal, Pressable,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native"

const FONT = "Inter"
const NAVY = "#13206b"
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayDateKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function formatDisplayDate(iso: string) {
  if (!iso) return ""
  const [yyyy, mm, dd] = iso.split("-")
  if (!yyyy || !mm || !dd) return iso
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return `${dd} ${m[parseInt(mm, 10) - 1]} ${yyyy}`
}

// ── Date Picker ───────────────────────────────────────────────────────────────

function DatePickerModal({ visible, onClose, onSelect, minDate, title, selected }: {
  visible: boolean; onClose: () => void; onSelect: (iso: string) => void
  minDate?: string; title: string; selected: string
}) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const minObj = useMemo(() => {
    const d = minDate ? new Date(minDate) : new Date(0); d.setHours(0, 0, 0, 0); return d
  }, [minDate])

  const days = useMemo(() => {
    const count = new Date(year, month + 1, 0).getDate()
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Array.from({ length: count }, (_, i) => {
      const d = i + 1
      const date = new Date(year, month, d); date.setHours(0, 0, 0, 0)
      return { d, disabled: date < minObj, isToday: date.getTime() === today.getTime() }
    })
  }, [year, month, minObj])

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
                const iso = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`
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

// ── Reusable field pieces ─────────────────────────────────────────────────────

function Label({ text, optional }: { text: string; optional?: boolean }) {
  return (
    <Text style={s.label}>
      {text}{" "}
      {optional
        ? <Text style={{ color: "#9ca3af", fontWeight: "400" }}>(optional)</Text>
        : <Text style={{ color: "#ef4444" }}>*</Text>
      }
    </Text>
  )
}

function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null
  return <Text style={s.errText}>{msg}</Text>
}

function SelectRow({ value, placeholder, onPress, error, disabled }: {
  value?: string; placeholder: string; onPress: () => void
  error?: string; disabled?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[s.inputWrap, error ? s.inputError : null, disabled ? { opacity: 0.55 } : null]}
    >
      <Text style={[s.inputText, !value && s.placeholder]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <ChevronDown size={14} color="#9ca3af" />
    </TouchableOpacity>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EditPunchPunchRecord {
  id: string
  employeeID: string
  inOut: string
  typeOfMovement: string
  punchedTime: string
  readerSerialNumber?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  punchRecord: EditPunchPunchRecord | null
  attendanceDate: string
  month: number
  year: number
  onSuccess?: () => void
}

type FormData = {
  newAttendanceDate: string
  txDate: string
  txTime: string
  inOut: "I" | "O"
  typeOfMovement: string
  appliedDate: string
  remarks: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

function validateForm(f: FormData): FormErrors {
  const e: FormErrors = {}
  if (!f.newAttendanceDate) e.newAttendanceDate = "New attendance date is required"
  if (!f.txDate) e.txDate = "Transaction date is required"
  if (!f.txTime.trim()) {
    e.txTime = "Transaction time is required"
  } else if (!/^\d{2}:\d{2}$/.test(f.txTime.trim())) {
    e.txTime = "Enter time as HH:mm (e.g. 09:30)"
  }
  return e
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function EditPunchFormModal({
  isOpen, onClose, punchRecord, attendanceDate, month, year, onSuccess,
}: Props) {
  const jwtEmployeeId = useSelector((s: RootState) => s.role.employeeId) ?? ""
  const tenantCode = useSelector((s: RootState) => s.role.org) ?? ""

  const [form, setForm] = useState<FormData>({
    newAttendanceDate: "", txDate: "", txTime: "",
    inOut: "I", typeOfMovement: "P", appliedDate: "", remarks: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successData, setSuccessData] = useState<{
    employeeID: string; newDate: string; txDateTime: string; punchType: string
  } | null>(null)
  const [showNewDatePicker, setShowNewDatePicker] = useState(false)
  const [showTxDatePicker, setShowTxDatePicker] = useState(false)
  const [showAppliedDatePicker, setShowAppliedDatePicker] = useState(false)
  const pulseAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!isOpen || !punchRecord) return
    const today = todayDateKey()
    let txDate = "", txTime = ""
    if (punchRecord.punchedTime) {
      try {
        const d = new Date(punchRecord.punchedTime)
        if (!isNaN(d.getTime())) {
          txDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          txTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
        }
      } catch { /* ignore */ }
    }
    setForm({
      newAttendanceDate: attendanceDate || today,
      txDate, txTime,
      inOut: punchRecord.inOut?.toUpperCase() === "O" ? "O" : "I",
      typeOfMovement: punchRecord.typeOfMovement && punchRecord.typeOfMovement !== "-" ? punchRecord.typeOfMovement : "P",
      appliedDate: today,
      remarks: "",
    })
    setErrors({})
    setSubmitted(false)
    setShowSuccess(false)
  }, [isOpen, punchRecord, attendanceDate])

  useEffect(() => {
    if (!showSuccess) return
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [showSuccess])

  const { post, loading: posting } = usePostRequest<any>({
    url: "editPunchApplication",
    onSuccess: () => setShowSuccess(true),
    onError: (err) => setErrors(p => ({ ...p, remarks: (err as any)?.message || "Submission failed. Please try again." })),
  })

  const setField = <K extends keyof FormData>(key: K, val: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: val }))
    if (submitted && errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const handleSubmit = () => {
    setSubmitted(true)
    const errs = validateForm(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const employeeID = punchRecord?.employeeID || jwtEmployeeId
    if (!employeeID || !tenantCode) {
      setErrors(p => ({ ...p, remarks: "Unable to determine employee or tenant. Please try again." }))
      return
    }

    const transactionTime = `${form.txDate}T${form.txTime}`
    setSuccessData({
      employeeID,
      newDate: formatDisplayDate(form.newAttendanceDate),
      txDateTime: transactionTime,
      punchType: form.inOut === "I" ? "Punch In" : "Punch Out",
    })

    const pad = (n: number) => String(n).padStart(2, "0")
    const pad3 = (n: number) => String(n).padStart(3, "0")
    const now = new Date()
    const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const yyyy = ist.getFullYear()
    const mm = pad(ist.getMonth() + 1)
    const dd = pad(ist.getDate())
    const hh = pad(ist.getHours())
    const min = pad(ist.getMinutes())
    const ss = pad(ist.getSeconds())
    const ms = pad3(ist.getMilliseconds())
    const createdOn = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}.${ms}+05:30`
    const uploadTime = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`

    post({
      tenant: tenantCode, action: "insert", id: null, event: "application",
      collectionName: "editPunchApplication",
      data: {
        employeeID,
        punchedTime: punchRecord?.punchedTime || "",
        transactionTime,
        newAttendanceDate: form.newAttendanceDate,
        attendanceDate,
        inOut: form.inOut,
        typeOfMovement: form.typeOfMovement || "P",
        appliedDate: form.appliedDate || todayDateKey(),
        remarks: form.remarks,
        isDeleted: false,
        tenantCode, organizationCode: tenantCode,
        month, year,
        createdBy: jwtEmployeeId, uploadedBy: jwtEmployeeId,
        workflowName: "EditPunch Application",
        stateEvent: "NEXT",
        state: "new",
        workflowState: "INITIATED",
        createdOn,
        uploadTime,
        punchID: punchRecord?.id || null,
      },
    })
  }

  const handleClose = () => { setErrors({}); setSubmitted(false); onClose() }

  // ── Success ──────────────────────────────────────────────────────────────────

  if (showSuccess) {
    const rippleScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.28] })
    const rippleOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.03] })
    return (
      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
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
                Your edit punch request has been submitted successfully and is now pending approval.
              </Text>
              <View style={s.successCard}>
                <View style={s.successRefRow}>
                  <View style={s.successRefIcon}>
                    <Ionicons name="finger-print-outline" size={16} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.successRefLabel}>Employee ID</Text>
                    <Text style={s.successRefValue}>{successData?.employeeID || "—"}</Text>
                  </View>
                </View>
                <View style={s.successGrid}>
                  <View style={s.successGridItem}>
                    <Text style={s.successGridLabel}>New Date</Text>
                    <Text style={s.successGridValue}>{successData?.newDate || "—"}</Text>
                  </View>
                  <View style={s.successGridItem}>
                    <Text style={s.successGridLabel}>Punch Type</Text>
                    <Text style={s.successGridValue}>{successData?.punchType || "—"}</Text>
                  </View>
                  <View style={s.successGridItem}>
                    <Text style={s.successGridLabel}>Transaction Time</Text>
                    <Text style={s.successGridValue}>{successData?.txDateTime || "—"}</Text>
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
      </Modal>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────────

  const hasErrors = submitted && Object.values(errors).some(Boolean)

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
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
                <Text style={s.greeting}>Edit Punch</Text>
              </View>
            </View>

            {/* Title row */}
            <View style={s.titleRow}>
              <Text style={s.titleLabel}>New Application</Text>
              <View style={s.badge}>
                <Text style={s.badgeText}>Edit Punch</Text>
              </View>
            </View>

            {/* ── Main card ── */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Fill in the details below</Text>
              <Text style={s.cardSub}>Update the punch date, time, and type to correct your attendance record.</Text>

              <View style={s.separator} />

              {/* Original punch banner */}
              {punchRecord && (
                <View style={s.origBanner}>
                  <Text style={s.origBannerTitle}>ORIGINAL PUNCH</Text>
                  <View style={s.origBannerRow}>
                    <Text style={s.origBannerLabel}>Employee</Text>
                    <Text style={s.origBannerValue}>{punchRecord.employeeID || "—"}</Text>
                  </View>
                  <View style={s.origBannerRow}>
                    <Text style={s.origBannerLabel}>Punch Time</Text>
                    <Text style={s.origBannerValue}>
                      {punchRecord.punchedTime
                        ? (() => { try { return new Date(punchRecord.punchedTime).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) } catch { return punchRecord.punchedTime } })()
                        : "—"}
                    </Text>
                  </View>
                  <View style={[s.origBannerRow, { borderBottomWidth: 0 }]}>
                    <Text style={s.origBannerLabel}>Type</Text>
                    <Text style={s.origBannerValue}>
                      {punchRecord.inOut?.toUpperCase() === "I" ? "In" : punchRecord.inOut?.toUpperCase() === "O" ? "Out" : punchRecord.inOut || "—"}
                    </Text>
                  </View>
                </View>
              )}

              {/* New Attendance Date */}
              <Label text="New Attendance Date" />
              <SelectRow
                value={form.newAttendanceDate ? formatDisplayDate(form.newAttendanceDate) : ""}
                placeholder="Select date"
                onPress={() => setShowNewDatePicker(true)}
                error={errors.newAttendanceDate}
              />
              <ErrText msg={errors.newAttendanceDate} />

              {/* Transaction Date + Time */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Label text="Transaction Date" />
                  <SelectRow
                    value={form.txDate ? formatDisplayDate(form.txDate) : ""}
                    placeholder="Select date"
                    onPress={() => setShowTxDatePicker(true)}
                    error={errors.txDate}
                  />
                  <ErrText msg={errors.txDate} />
                </View>
                <View style={{ flex: 1 }}>
                  <Label text="Time (HH:mm)" />
                  <View style={[s.inputWrap, errors.txTime ? s.inputError : null]}>
                    <Clock size={13} color="#9ca3af" />
                    <TextInput
                      value={form.txTime}
                      onChangeText={v => setField("txTime", v)}
                      placeholder="09:30"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numbers-and-punctuation"
                      style={{ flex: 1, fontFamily: FONT, fontSize: 13, color: "#0f172a", paddingVertical: 10 }}
                    />
                  </View>
                  <ErrText msg={errors.txTime} />
                </View>
              </View>

              {/* Punch Type toggle */}
              <Text style={s.label}>Punch Type <Text style={{ color: "#ef4444" }}>*</Text></Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {(["I", "O"] as const).map(v => {
                  const active = form.inOut === v
                  return (
                    <TouchableOpacity
                      key={v}
                      onPress={() => setField("inOut", v)}
                      style={[s.toggleBtn, active && s.toggleActive]}
                    >
                      <Text style={[s.toggleText, active && s.toggleTextActive]}>
                        {v === "I" ? "Punch In" : "Punch Out"}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Type of Movement */}
              <Label text="Type of Movement" optional />
              <TextInput
                value={form.typeOfMovement}
                onChangeText={v => setField("typeOfMovement", v)}
                placeholder="e.g. P, E, ..."
                placeholderTextColor="#9ca3af"
                style={s.inputWrap}
              />

              {/* Applied Date */}
              <Label text="Applied Date" optional />
              <SelectRow
                value={form.appliedDate ? formatDisplayDate(form.appliedDate) : ""}
                placeholder="Select date"
                onPress={() => setShowAppliedDatePicker(true)}
              />

              {/* Remarks */}
              <Label text="Remarks" optional />
              <TextInput
                value={form.remarks}
                onChangeText={v => setField("remarks", v)}
                placeholder="Optional remarks..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={s.textArea}
              />
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
              {posting
                ? <><ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} /><Text style={s.btnText}>Submitting...</Text></>
                : <Text style={s.btnText}>Submit Edit Punch Request</Text>
              }
            </TouchableOpacity>

            {/* Cancel link */}
            <TouchableOpacity onPress={handleClose} style={{ alignItems: "center", marginTop: 14 }}>
              <Text style={s.cancelLink}>Cancel</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </View>

      <DatePickerModal
        visible={showNewDatePicker} onClose={() => setShowNewDatePicker(false)}
        title="New Attendance Date" selected={form.newAttendanceDate}
        onSelect={v => { setField("newAttendanceDate", v); if (submitted) setErrors(p => ({ ...p, newAttendanceDate: undefined })) }}
      />
      <DatePickerModal
        visible={showTxDatePicker} onClose={() => setShowTxDatePicker(false)}
        title="Transaction Date" selected={form.txDate}
        onSelect={v => { setField("txDate", v); if (submitted) setErrors(p => ({ ...p, txDate: undefined })) }}
      />
      <DatePickerModal
        visible={showAppliedDatePicker} onClose={() => setShowAppliedDatePicker(false)}
        title="Applied Date" selected={form.appliedDate}
        onSelect={v => setField("appliedDate", v)}
      />
    </Modal>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  frame: { flex: 1, paddingHorizontal: 14, paddingTop: 58, paddingBottom: 24 },

  // Top row
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  leftGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  backBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#e2e8f0" },
  greeting: { fontFamily: FONT, color: "#0f172a", fontSize: 20, fontWeight: "700" },

  // Title row
  titleRow: { marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titleLabel: { fontFamily: FONT, fontSize: 18, fontWeight: "600", color: "#0f172a" },
  badge: { borderRadius: 999, backgroundColor: NAVY, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontFamily: FONT, fontSize: 12, fontWeight: "700", color: "#fff" },

  // Card
  card: { marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#fff", padding: 14 },
  cardTitle: { fontFamily: FONT, fontSize: 18, fontWeight: "700", color: "#0f172a", textAlign: "center" },
  cardSub: { fontFamily: FONT, marginTop: 6, fontSize: 12, color: "#64748b", textAlign: "center", lineHeight: 16, paddingHorizontal: 8 },
  separator: { height: 1, backgroundColor: "#e2e8f0", marginTop: 14, marginBottom: 4 },

  // Original punch banner
  origBanner: { marginTop: 12, backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 10, padding: 12, marginBottom: 4 },
  origBannerTitle: { fontFamily: FONT, fontSize: 10, fontWeight: "700", color: "#1d4ed8", letterSpacing: 0.6, marginBottom: 8 },
  origBannerRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#dbeafe" },
  origBannerLabel: { fontFamily: FONT, fontSize: 12, color: "#3b82f6" },
  origBannerValue: { fontFamily: FONT, fontSize: 12, fontWeight: "600", color: "#1e40af" },

  // Labels + inputs
  label: { fontFamily: FONT, fontSize: 10, color: "#64748b", marginBottom: 6, fontWeight: "600", marginTop: 12 },
  inputWrap: {
    minHeight: 38, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 6,
    backgroundColor: "#f8fafc", paddingHorizontal: 10,
    flexDirection: "row", alignItems: "center", gap: 8,
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

  // Toggle
  toggleBtn: {
    flex: 1, height: 38, borderRadius: 6, borderWidth: 1, borderColor: "#e2e8f0",
    alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc",
  },
  toggleActive: { borderColor: NAVY, backgroundColor: "#eef2ff" },
  toggleText: { fontFamily: FONT, fontSize: 12, fontWeight: "600", color: "#64748b" },
  toggleTextActive: { color: NAVY, fontWeight: "700" },

  // Error box
  errBox: { marginTop: 12, backgroundColor: "#fff5f5", borderWidth: 1, borderColor: "#fecaca", borderRadius: 10, padding: 12 },
  errBoxTitle: { fontFamily: FONT, fontSize: 12, fontWeight: "700", color: "#dc2626", marginBottom: 4 },
  errBoxItem: { fontFamily: FONT, fontSize: 11, color: "#b91c1c", marginLeft: 6, marginBottom: 2 },

  // Note + button
  note: { fontFamily: FONT, marginTop: 20, fontSize: 10, color: "#64748b", textAlign: "center", lineHeight: 14, paddingHorizontal: 12 },
  btn: { marginTop: 12, height: 44, borderRadius: 6, backgroundColor: NAVY, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontFamily: FONT, color: "#fff", fontSize: 15, fontWeight: "700" },
  cancelLink: { fontFamily: FONT, fontSize: 12, color: "#64748b" },

  // Success screen
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

  // Calendar
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
})

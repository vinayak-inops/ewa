import { Ionicons } from "@expo/vector-icons"
import { usePostRequest } from "@/hooks/api/usePostRequest"
import { RootState } from "@/store"
import { ChevronDown, X } from "lucide-react-native"
import React, { useEffect, useRef, useMemo, useState } from "react"
import { useSelector } from "react-redux"
import {
  ActivityIndicator,
  Animated,
  Easing,
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

const DURATION_OPTIONS = [
  { value: "First-Half",  label: "First Half"  },
  { value: "Second-Half", label: "Second Half" },
  { value: "Full-Day",    label: "Full Day"    },
]

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

interface Props { onClose: () => void; onSuccess?: () => void }
type Errors = Partial<{ fromDate: string; toDate: string; fromDuration: string; toDuration: string; description: string }>

// ── Helpers ───────────────────────────────────────────────────────────────────


function todayStr() {
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
    const d = minDate ? new Date(minDate) : new Date(); d.setHours(0,0,0,0); return d
  }, [minDate])

  const days = useMemo(() => {
    const count = new Date(year, month + 1, 0).getDate()
    const today = new Date(); today.setHours(0,0,0,0)
    return Array.from({ length: count }, (_, i) => {
      const d = i + 1
      const date = new Date(year, month, d); date.setHours(0,0,0,0)
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

// ── Reusable pieces ───────────────────────────────────────────────────────────

function Label({ text }: { text: string }) {
  return <Text style={s.label}>{text} <Text style={{ color: "#ef4444" }}>*</Text></Text>
}

function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null
  return <Text style={s.errText}>{msg}</Text>
}

function SelectRow({ value, placeholder, onPress, error }: {
  value?: string; placeholder: string; onPress: () => void; error?: string
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[s.inputWrap, error ? s.inputError : null]}>
      <Text style={[s.inputText, !value && s.placeholder]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <ChevronDown size={14} color="#9ca3af" />
    </TouchableOpacity>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function WfhFormPopup({ onClose, onSuccess }: Props) {
  const employeeId = useSelector((s: RootState) => s.role.employeeId) ?? ""
  const tenantCode = useSelector((s: RootState) => s.role.org) ?? ""

  const [fromDate, setFromDate] = useState(todayStr())
  const [toDate, setToDate] = useState(todayStr())
  const [fromDuration, setFromDuration] = useState("First-Half")
  const [toDuration, setToDuration] = useState("Full-Day")
  const [description, setDescription] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successData, setSuccessData] = useState<{ employeeID: string; fromDate: string; toDate: string; duration: string } | null>(null)
  const pulseAnim = useRef(new Animated.Value(0)).current

  const [showFrom, setShowFrom] = useState(false)
  const [showTo, setShowTo] = useState(false)

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
    url: "wfhApplication",
    onSuccess: () => { setShowSuccess(true) },
    onError: () => setErrors(p => ({ ...p, description: "Submission failed. Please try again." })),
  })

  const validate = (): Errors => {
    const e: Errors = {}
    if (!fromDate) e.fromDate = "From date is required"
    if (!toDate) { e.toDate = "To date is required" }
    else if (fromDate && new Date(toDate) < new Date(fromDate)) { e.toDate = "To date cannot be before from date" }
    if (!fromDuration) e.fromDuration = "From duration is required"
    if (!toDuration) e.toDuration = "To duration is required"
    if (!description.trim()) { e.description = "Description is required" }
    else if (description.trim().length < 10) { e.description = "Description must be at least 10 characters" }
    else if (description.trim().length > 300) { e.description = "Description must not exceed 300 characters" }
    return e
  }

  const handleSubmit = () => {
    setSubmitted(true)
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSuccessData({
      employeeID: employeeId,
      fromDate: formatDisplayDate(fromDate),
      toDate: formatDisplayDate(toDate),
      duration: `${DURATION_OPTIONS.find(o => o.value === fromDuration)?.label} → ${DURATION_OPTIONS.find(o => o.value === toDuration)?.label}`,
    })

    const pad = (n: number) => n < 10 ? `0${n}` : String(n)
    const ist = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const yy = ist.getFullYear(), mo = pad(ist.getMonth()+1), dd = pad(ist.getDate())
    const hh = pad(ist.getHours()), mi = pad(ist.getMinutes()), ss = pad(ist.getSeconds())
    const ms = String(ist.getMilliseconds()).padStart(3, "0")

    post({
      tenant: tenantCode, action: "insert", id: "", event: "application", collectionName: "wfhApplication",
      data: {
        employeeID: employeeId,
        fromDate, toDate, fromDuration, toDuration,
        description: description.trim(),
        tenantCode,
        workflowName: "wfh Application",
        uploadedBy: employeeId, createdBy: employeeId,
        createdOn: `${yy}-${mo}-${dd}T${hh}:${mi}:${ss}.${ms}+05:30`,
        uploadTime: `${yy}-${mo}-${dd}T${hh}:${mi}:${ss}`,
        organizationCode: tenantCode,
        stateEvent: "NEXT", workflowState: "INITIATED",
        appliedDate: `${yy}-${mo}-${dd}`,
      },
    })
  }

  const handleClose = () => { setErrors({}); setSubmitted(false); onClose() }

  // ── Success ─────────────────────────────────────────────────────────────────

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
              Your WFH request has been submitted successfully and is now pending approval.
            </Text>
            <View style={s.successCard}>
              <View style={s.successRefRow}>
                <View style={s.successRefIcon}>
                  <Ionicons name="home-outline" size={16} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.successRefLabel}>Employee ID</Text>
                  <Text style={s.successRefValue}>{successData?.employeeID || "—"}</Text>
                </View>
              </View>
              <View style={s.successGrid}>
                <View style={s.successGridItem}>
                  <Text style={s.successGridLabel}>From Date</Text>
                  <Text style={s.successGridValue}>{successData?.fromDate || "—"}</Text>
                </View>
                <View style={s.successGridItem}>
                  <Text style={s.successGridLabel}>To Date</Text>
                  <Text style={s.successGridValue}>{successData?.toDate || "—"}</Text>
                </View>
                <View style={s.successGridItem}>
                  <Text style={s.successGridLabel}>Duration</Text>
                  <Text style={s.successGridValue}>{successData?.duration || "—"}</Text>
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
              <Text style={s.greeting}>WFH Application</Text>
            </View>
          </View>

          {/* Title row */}
          <View style={s.titleRow}>
            <Text style={s.titleLabel}>New Application</Text>
            <View style={s.badge}>
              <Text style={s.badgeText}>Work From Home</Text>
            </View>
          </View>

          {/* Main card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Fill in the details below</Text>
            <Text style={s.cardSub}>Enter date range, duration and description to submit your WFH request.</Text>
            <View style={s.separator} />

            {/* Employee ID (read-only) */}
            <Label text="Employee ID" />
            <View style={[s.inputWrap, { backgroundColor: "#f1f5f9" }]}>
              <Text style={[s.inputText, { color: "#64748b" }]}>{employeeId || "Loading..."}</Text>
            </View>

            {/* Dates */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Label text="From Date" />
                <SelectRow
                  value={fromDate ? formatDisplayDate(fromDate) : ""}
                  placeholder="Select date"
                  onPress={() => setShowFrom(true)}
                  error={errors.fromDate}
                />
                <ErrText msg={errors.fromDate} />
              </View>
              <View style={{ flex: 1 }}>
                <Label text="To Date" />
                <SelectRow
                  value={toDate ? formatDisplayDate(toDate) : ""}
                  placeholder="Select date"
                  onPress={() => setShowTo(true)}
                  error={errors.toDate}
                />
                <ErrText msg={errors.toDate} />
              </View>
            </View>

            {/* From Duration */}
            <Label text="From Duration" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              {DURATION_OPTIONS.map(opt => {
                const active = fromDuration === opt.value
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => { setFromDuration(opt.value); if (submitted) setErrors(p => ({ ...p, fromDuration: undefined })) }}
                    style={[s.toggleBtn, active && s.toggleActive]}
                  >
                    <Text style={[s.toggleText, active && s.toggleTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <ErrText msg={errors.fromDuration} />

            {/* To Duration */}
            <Label text="To Duration" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              {DURATION_OPTIONS.map(opt => {
                const active = toDuration === opt.value
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => { setToDuration(opt.value); if (submitted) setErrors(p => ({ ...p, toDuration: undefined })) }}
                    style={[s.toggleBtn, active && s.toggleActive]}
                  >
                    <Text style={[s.toggleText, active && s.toggleTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <ErrText msg={errors.toDuration} />

            {/* Description */}
            <Label text="Description" />
            <TextInput
              value={description}
              onChangeText={v => {
                setDescription(v)
                if (submitted) {
                  const e = !v.trim() ? "Description is required"
                    : v.trim().length < 10 ? "Minimum 10 characters"
                    : v.trim().length > 300 ? "Maximum 300 characters"
                    : undefined
                  setErrors(p => ({ ...p, description: e }))
                }
              }}
              placeholder="Describe your WFH reason (minimum 10 characters)"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[s.textArea, errors.description ? s.inputError : null]}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
              <ErrText msg={errors.description} />
              <Text style={[s.muted, { fontSize: 10, marginLeft: "auto", color: description.length > 300 ? "#ef4444" : "#9ca3af" }]}>
                {description.length}/300
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
            {posting
              ? <><ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} /><Text style={s.btnText}>Submitting...</Text></>
              : <Text style={s.btnText}>Submit WFH Request</Text>
            }
          </TouchableOpacity>

          {/* Cancel link */}
          <TouchableOpacity onPress={handleClose} style={{ alignItems: "center", marginTop: 14 }}>
            <Text style={s.cancelLink}>Cancel</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Date pickers */}
      <DatePickerModal
        visible={showFrom} onClose={() => setShowFrom(false)} title="Select From Date"
        selected={fromDate} minDate={todayStr()}
        onSelect={v => {
          setFromDate(v)
          if (toDate && new Date(toDate) < new Date(v)) setToDate("")
          if (submitted) setErrors(p => ({ ...p, fromDate: undefined }))
        }}
      />
      <DatePickerModal
        visible={showTo} onClose={() => setShowTo(false)} title="Select To Date"
        selected={toDate} minDate={fromDate || todayStr()}
        onSelect={v => { setToDate(v); if (submitted) setErrors(p => ({ ...p, toDate: undefined })) }}
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
    flex: 1, height: 38, borderRadius: 6, borderWidth: 1, borderColor: "#e2e8f0",
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
  muted: { fontFamily: FONT, fontSize: 12, color: "#9ca3af" },
})

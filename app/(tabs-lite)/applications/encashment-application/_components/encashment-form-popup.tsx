import { useGetRequest } from "@/hooks/api/useGetRequest"
import { usePostRequest } from "@/hooks/api/usePostRequest"
import { RootState } from "@/store"
import { Ionicons } from "@expo/vector-icons"
import { ChevronDown, X } from "lucide-react-native"
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeaveOption {
  leaveCode: string
  leaveTitle: string
  balance: number
  encashable: number
}

interface FormErrors {
  leaveCode?: string
  balance?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function validate(fields: { leaveCode: string; balance: string }, maxBalance?: number): FormErrors {
  const e: FormErrors = {}
  if (!fields.leaveCode) e.leaveCode = "Leave code is required"
  const b = parseFloat(fields.balance)
  if (!fields.balance || isNaN(b) || b <= 0) {
    e.balance = "Enter a valid balance"
  } else if (maxBalance !== undefined && b > maxBalance) {
    e.balance = `Balance cannot exceed available ${maxBalance}`
  }
  return e
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

// ── Leave Code Picker Modal ───────────────────────────────────────────────────

function LeavePickerModal({
  visible,
  options,
  selected,
  loading,
  onSelect,
  onClose,
}: {
  visible: boolean
  options: LeaveOption[]
  selected: string
  loading: boolean
  onSelect: (opt: LeaveOption) => void
  onClose: () => void
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.pickerOverlay} onPress={onClose}>
        <Pressable style={s.pickerSheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.pickerHandle} />
          <Text style={s.pickerTitle}>Select Leave Code</Text>
          {loading ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <ActivityIndicator color={NAVY} />
              <Text style={[s.pickerEmpty, { marginTop: 8 }]}>Loading leave balances...</Text>
            </View>
          ) : options.length === 0 ? (
            <Text style={s.pickerEmpty}>No leave balances available</Text>
          ) : (
            <FlatList
              data={options}
              keyExtractor={(item) => item.leaveCode}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <Pressable
                  style={[s.pickerItem, item.leaveCode === selected && s.pickerItemSelected]}
                  onPress={() => { onSelect(item); onClose() }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.pickerItemText, item.leaveCode === selected && s.pickerItemTextSelected]}>
                      {item.leaveCode} — {item.leaveTitle}
                    </Text>
                    <Text style={s.pickerItemSub}>Balance: {item.balance} · Encashable: {item.encashable}</Text>
                  </View>
                  {item.leaveCode === selected && (
                    <Ionicons name="checkmark-circle" size={18} color={NAVY} />
                  )}
                </Pressable>
              )}
            />
          )}
          <TouchableOpacity style={s.pickerCancel} onPress={onClose}>
            <Text style={s.pickerCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function EncashmentFormPopup({ isOpen, onClose, onSubmit }: Props) {
  const employeeId = useSelector((s: RootState) => s.role.employeeId) ?? ""
  const tenantCode = useSelector((s: RootState) => s.role.org) ?? ""

  const [leaveCode, setLeaveCode] = useState("")
  const [balance, setBalance] = useState("")
  const [remarks, setRemarks] = useState("")
  const [leaveCodeOptions, setLeaveCodeOptions] = useState<LeaveOption[]>([])
  const [showLeavePicker, setShowLeavePicker] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successData, setSuccessData] = useState<{ employeeID: string; leaveCode: string; balance: string } | null>(null)
  const pulseAnim = useRef(new Animated.Value(0)).current
  const prevLeaveCodeRef = useRef("")

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setLeaveCode("")
      setBalance("")
      setRemarks("")
      setErrors({})
      setSubmitted(false)
      setShowSuccess(false)
      prevLeaveCodeRef.current = ""
    }
  }, [isOpen])

  // Pulse animation for success
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

  // ── Fetch leave balances (employee-specific) ─────────────────────────────────

  const leaveBalanceRequestData = useMemo(() => {
    if (!employeeId || !tenantCode) return null
    return [
      { field: "tenantCode", operator: "eq", value: tenantCode },
      { field: "employeeID", operator: "eq", value: employeeId },
    ]
  }, [employeeId, tenantCode])

  const { loading: loadingLeaveBalances } = useGetRequest<any[]>({
    url: "leaveBalance/search",
    method: "POST",
    data: leaveBalanceRequestData ?? [],
    enabled: Boolean(leaveBalanceRequestData),
    onSuccess: (data) => {
      if (!Array.isArray(data) || data.length === 0) { setLeaveCodeOptions([]); return }
      const balances: any[] = data[0]?.balances || []
      setLeaveCodeOptions(balances.map((b: any) => ({
        leaveCode: b.leaveCode ?? "",
        leaveTitle: b.leaveTitle ?? b.leaveCode ?? "",
        balance: Number(b.balance) || 0,
        encashable: Number(b.encashable) || 0,
      })))
    },
    onError: () => setLeaveCodeOptions([]),
  })

  // ── maxBalance derived from selected leave code ───────────────────────────────

  const maxBalance = useMemo(() => {
    if (!leaveCode || leaveCodeOptions.length === 0) return undefined
    return leaveCodeOptions.find(o => o.leaveCode === leaveCode)?.balance
  }, [leaveCode, leaveCodeOptions])

  // ── Auto-fill balance when leaveCode changes ──────────────────────────────────

  useEffect(() => {
    if (leaveCode && leaveCodeOptions.length > 0 && prevLeaveCodeRef.current !== leaveCode) {
      const opt = leaveCodeOptions.find(o => o.leaveCode === leaveCode)
      if (opt) setBalance(String(opt.balance))
      prevLeaveCodeRef.current = leaveCode
    } else if (!leaveCode) {
      setBalance("")
      prevLeaveCodeRef.current = ""
    }
  }, [leaveCode, leaveCodeOptions])

  // ── Live re-validate balance when maxBalance changes ──────────────────────────

  useEffect(() => {
    if (!submitted || maxBalance === undefined) return
    const b = parseFloat(balance)
    setErrors(prev => ({
      ...prev,
      balance: !balance || isNaN(b) || b <= 0
        ? "Enter a valid balance"
        : b > maxBalance ? `Balance cannot exceed available ${maxBalance}` : undefined,
    }))
  }, [maxBalance, submitted, balance])

  // ── Post ─────────────────────────────────────────────────────────────────────

  const { post, loading: posting } = usePostRequest<any>({
    url: "leaveEncashmentApplication",
    onSuccess: () => setShowSuccess(true),
    onError: () => setErrors(prev => ({ ...prev, balance: "Submission failed. Please try again." })),
  })

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    setSubmitted(true)
    const errs = validate({ leaveCode, balance }, maxBalance)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const b = parseFloat(balance)
    setSuccessData({ employeeID: employeeId, leaveCode, balance: String(b) })

    const pad = (n: number) => String(n).padStart(2, "0")
    const ist = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const yy = ist.getFullYear(), mo = pad(ist.getMonth() + 1), dd = pad(ist.getDate())
    const hh = pad(ist.getHours()), mi = pad(ist.getMinutes()), ss = pad(ist.getSeconds())
    const ms = String(ist.getMilliseconds()).padStart(3, "0")

    post({
      tenant: tenantCode,
      action: "insert",
      id: "",
      event: "leaveEncashmentApplication",
      collectionName: "leaveEncashmentApplication",
      data: {
        employeeID: employeeId,
        leaveCode,
        balance: b,
        appliedDate: `${yy}-${mo}-${dd}`,
        remarks: remarks.trim() || undefined,
        workflowName: "leaveEncashment Application",
        tenantCode,
        uploadedBy: employeeId,
        createdBy: employeeId,
        createdOn: `${yy}-${mo}-${dd}T${hh}:${mi}:${ss}.${ms}+05:30`,
        uploadTime: `${yy}-${mo}-${dd}T${hh}:${mi}:${ss}`,
        organizationCode: tenantCode,
        stateEvent: "NEXT",
        workflowState: "INITIATED",
      },
    })
  }

  const handleClose = () => {
    setErrors({})
    setSubmitted(false)
    onClose()
  }

  // ── Success ─────────────────────────────────────────────────────────────────

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
                Your leave encashment request has been submitted successfully and is now pending approval.
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
                    <Text style={s.successGridLabel}>Leave Code</Text>
                    <Text style={s.successGridValue}>{successData?.leaveCode || "—"}</Text>
                  </View>
                  <View style={s.successGridItem}>
                    <Text style={s.successGridLabel}>Balance</Text>
                    <Text style={s.successGridValue}>{successData?.balance || "—"}</Text>
                  </View>
                  <View style={s.successGridItem}>
                    <Text style={s.successGridLabel}>Status</Text>
                    <Text style={[s.successGridValue, { color: "#2563eb" }]}>Initiated</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[s.btn, { marginTop: 20, width: "100%" }]}
                onPress={() => { setShowSuccess(false); onSubmit(); handleClose() }}
              >
                <Text style={s.btnText}>Back to Applications</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    )
  }

  // ── Form ────────────────────────────────────────────────────────────────────

  const hasErrors = submitted && Object.values(errors).some(Boolean)
  const selectedLeaveOpt = leaveCodeOptions.find(o => o.leaveCode === leaveCode)

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <LeavePickerModal
        visible={showLeavePicker}
        options={leaveCodeOptions}
        selected={leaveCode}
        loading={loadingLeaveBalances}
        onSelect={(opt) => {
          setLeaveCode(opt.leaveCode)
          if (submitted) setErrors(p => ({ ...p, leaveCode: undefined }))
        }}
        onClose={() => setShowLeavePicker(false)}
      />
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
                  <Text style={s.greeting}>Leave Encashment</Text>
                </View>
              </View>

              {/* Title row */}
              <View style={s.titleRow}>
                <Text style={s.titleLabel}>New Application</Text>
                <View style={s.badge}>
                  <Text style={s.badgeText}>Encashment</Text>
                </View>
              </View>

              {/* Main card */}
              <View style={s.card}>
                <Text style={s.cardTitle}>Fill in the details below</Text>
                <Text style={s.cardSub}>Select a leave code and enter balance days to submit your encashment request.</Text>
                <View style={s.separator} />

                {/* Employee ID (read-only) */}
                <Label text="Employee ID" required={false} />
                <View style={[s.inputWrap, { backgroundColor: "#f1f5f9" }]}>
                  <Text style={[s.inputText, { color: "#64748b" }]}>{employeeId || "Loading..."}</Text>
                </View>

                {/* Leave Code Picker */}
                <Label text="Leave Code" />
                <Pressable
                  style={[s.selectRow, errors.leaveCode ? s.inputError : null]}
                  onPress={() => setShowLeavePicker(true)}
                >
                  <Text style={[s.selectRowText, !leaveCode && { color: "#9ca3af" }]}>
                    {selectedLeaveOpt
                      ? `${selectedLeaveOpt.leaveCode} — ${selectedLeaveOpt.leaveTitle}`
                      : loadingLeaveBalances ? "Loading..." : "Select leave code"}
                  </Text>
                  {loadingLeaveBalances
                    ? <ActivityIndicator size="small" color={NAVY} />
                    : <ChevronDown size={16} color="#64748b" />
                  }
                </Pressable>
                <ErrText msg={errors.leaveCode} />

                {/* Balance */}
                <Label text="Balance (Days)" />
                <TextInput
                  value={balance}
                  onChangeText={(v) => {
                    setBalance(v)
                    if (submitted) {
                      const b = parseFloat(v)
                      setErrors(p => ({
                        ...p,
                        balance: !v || isNaN(b) || b <= 0
                          ? "Enter a valid balance"
                          : maxBalance !== undefined && b > maxBalance
                            ? `Balance cannot exceed available ${maxBalance}`
                            : undefined,
                      }))
                    }
                  }}
                  placeholder={
                    leaveCode
                      ? maxBalance !== undefined ? `Max: ${maxBalance}` : "Enter balance"
                      : "Select leave code first"
                  }
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  editable={Boolean(leaveCode)}
                  style={[
                    s.input,
                    errors.balance ? s.inputError : null,
                    !leaveCode && { backgroundColor: "#f1f5f9" },
                  ]}
                />
                {maxBalance !== undefined && leaveCode ? (
                  <Text style={s.balanceHint}>Available balance: {maxBalance}</Text>
                ) : null}
                <ErrText msg={errors.balance} />

                {/* Remarks */}
                <Label text="Remarks" required={false} />
                <TextInput
                  value={remarks}
                  onChangeText={setRemarks}
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
                {posting ? (
                  <><ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} /><Text style={s.btnText}>Submitting...</Text></>
                ) : (
                  <Text style={s.btnText}>Submit Encashment Request</Text>
                )}
              </TouchableOpacity>

              {/* Cancel link */}
              <TouchableOpacity onPress={handleClose} style={{ alignItems: "center", marginTop: 14 }}>
                <Text style={s.cancelLink}>Cancel</Text>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </View>
      </Modal>
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
    flexDirection: "row", alignItems: "center",
  },
  input: {
    fontFamily: FONT, minHeight: 38, borderWidth: 1, borderColor: "#e2e8f0",
    borderRadius: 6, backgroundColor: "#f8fafc", paddingHorizontal: 10,
    fontSize: 13, color: "#0f172a", paddingVertical: 10,
  },
  inputError: { borderColor: "#fca5a5", backgroundColor: "#fff5f5" },
  inputText: { fontFamily: FONT, flex: 1, fontSize: 13, color: "#0f172a", paddingVertical: 10 },
  textArea: {
    fontFamily: FONT, minHeight: 96, borderWidth: 1, borderColor: "#e2e8f0",
    borderRadius: 6, backgroundColor: "#f8fafc", paddingHorizontal: 10,
    paddingVertical: 10, fontSize: 13, color: "#0f172a",
  },
  errText: { fontFamily: FONT, marginTop: 4, fontSize: 11, color: "#b91c1c" },
  balanceHint: { fontFamily: FONT, marginTop: 4, fontSize: 11, color: "#64748b" },

  selectRow: {
    minHeight: 38, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 6,
    backgroundColor: "#f8fafc", paddingHorizontal: 10,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  selectRowText: { fontFamily: FONT, fontSize: 13, color: "#0f172a", flex: 1 },

  errBox: { marginTop: 12, backgroundColor: "#fff5f5", borderWidth: 1, borderColor: "#fecaca", borderRadius: 10, padding: 12 },
  errBoxTitle: { fontFamily: FONT, fontSize: 12, fontWeight: "700", color: "#dc2626", marginBottom: 4 },
  errBoxItem: { fontFamily: FONT, fontSize: 11, color: "#b91c1c", marginLeft: 6, marginBottom: 2 },

  note: { fontFamily: FONT, marginTop: 20, fontSize: 10, color: "#64748b", textAlign: "center", lineHeight: 14, paddingHorizontal: 12 },
  btn: { marginTop: 12, height: 44, borderRadius: 6, backgroundColor: NAVY, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontFamily: FONT, color: "#fff", fontSize: 15, fontWeight: "700" },
  cancelLink: { fontFamily: FONT, fontSize: 12, color: "#64748b" },

  // ── Picker Modal ────────────────────────────────────────────────────────────
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  pickerSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#d1d5db", alignSelf: "center", marginTop: 10, marginBottom: 4 },
  pickerTitle: { fontFamily: FONT, fontSize: 15, fontWeight: "700", color: "#0f172a", textAlign: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  pickerItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#f8fafc" },
  pickerItemSelected: { backgroundColor: "#eff6ff" },
  pickerItemText: { fontFamily: FONT, fontSize: 14, color: "#0f172a", marginBottom: 2 },
  pickerItemTextSelected: { color: NAVY, fontWeight: "700" },
  pickerItemSub: { fontFamily: FONT, fontSize: 11, color: "#64748b" },
  pickerEmpty: { fontFamily: FONT, fontSize: 13, color: "#94a3b8", textAlign: "center", paddingVertical: 24 },
  pickerCancel: { marginHorizontal: 16, marginTop: 12, height: 40, borderRadius: 8, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  pickerCancelText: { fontFamily: FONT, fontSize: 14, fontWeight: "600", color: "#64748b" },

  // ── Success ─────────────────────────────────────────────────────────────────
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
})

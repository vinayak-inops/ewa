import { usePostRequest } from "@/hooks/api/usePostRequest"
import { Ionicons } from "@expo/vector-icons"
import { Check, ChevronDown, Search, X } from "lucide-react-native"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { useBlockedDates } from '../hooks/useBlockedDates'
import { useLeaveIdentity } from '../hooks/useLeaveIdentity'
import { useSpecialLeavePolicy } from '../hooks/useSpecialLeavePolicy'
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
import SpecialLeaveDatePicker from './SpecialLeaveDatePicker'

const FONT = 'Inter'
const NAVY = '#13206b'

// ── Constants ─────────────────────────────────────────────────────────────────

const LEAVE_TITLES = [
  "Maternity Leave",
  "Paternity Leave",
  "Adoption Leave",
  "Compassionate Leave",
  "Medical Leave",
  "Study Leave",
  "Sabbatical Leave",
  "Other",
]

const DEFAULT_LEAVE_CODE: Record<string, string> = {
  "Maternity Leave":     "ML",
  "Paternity Leave":     "PL",
  "Adoption Leave":      "AL",
  "Compassionate Leave": "CL",
  "Medical Leave":       "MEL",
  "Study Leave":         "SL",
  "Sabbatical Leave":    "SAB",
}

const BALANCE_COLORS = ['#1e40af', '#2563eb', '#1d4ed8', '#1e3a8a', '#3b82f6']

const CAL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CAL_DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa']
function calDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function calFirstOffset(y: number, m: number)  { return new Date(y, m, 1).getDay() }

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'calendar' | 'form' | 'success'

interface FormErrors {
  leaveTitle?: string
  fromDate?: string
  toDate?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function validate(fields: { leaveTitle: string; fromDate: string; toDate: string }): FormErrors {
  const e: FormErrors = {}
  if (!fields.leaveTitle.trim()) e.leaveTitle = "Select or enter a leave title"
  if (!fields.fromDate) e.fromDate = "From date is required"
  if (!fields.toDate) { e.toDate = "To date is required" }
  else if (fields.fromDate && new Date(fields.toDate) < new Date(fields.fromDate)) { e.toDate = "To date cannot be before from date" }
  return e
}

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

function isoToDDMMYYYY(iso: string) {
  if (!iso) return ""
  const [yyyy, mm, dd] = iso.split("-")
  return `${dd}-${mm}-${yyyy}`
}

function calcDays(from: string, to: string): number {
  if (!from || !to) return 0
  const f = new Date(from)
  const t = new Date(to)
  if (isNaN(f.getTime()) || isNaN(t.getTime())) return 0
  const diff = t.getTime() - f.getTime()
  return diff < 0 ? 0 : Math.round(diff / 86400000) + 1
}

// ── Reusable field pieces ─────────────────────────────────────────────────────

function Label({ text, optional }: { text: string; optional?: boolean }) {
  return (
    <Text style={s.label}>
      {text}{' '}
      {optional
        ? <Text style={{ color: '#9ca3af', fontWeight: '400' }}>(optional)</Text>
        : <Text style={{ color: '#ef4444' }}>*</Text>
      }
    </Text>
  )
}

function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null
  return <Text style={s.errText}>{msg}</Text>
}

function SelectRow({ value, placeholder, onPress, error, disabled, loading }: {
  value?: string; placeholder: string; onPress: () => void
  error?: string; disabled?: boolean; loading?: boolean
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
      {loading
        ? <ActivityIndicator size="small" color={NAVY} />
        : <ChevronDown size={14} color="#9ca3af" />
      }
    </TouchableOpacity>
  )
}

const CHIP_COLORS = ['#1e40af','#0369a1','#0f766e','#7c3aed','#b45309','#be185d','#15803d','#9333ea']

function PickerModal({ visible, onClose, title, options, onSelect, selectedValue, loading }: {
  visible: boolean; onClose: () => void; title: string
  options: { value: string; label: string }[]
  onSelect: (value: string, label: string) => void
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

          {/* Handle */}
          <View style={s.sheetHandle} />

          {/* Header */}
          <View style={s.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>{title}</Text>
              {!loading && options.length > 0 && (
                <Text style={{ fontFamily: FONT, fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  {options.length} type{options.length !== 1 ? 's' : ''} available
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={s.sheetClose}><X size={14} color="#64748b" /></View>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <View style={s.searchWrap}>
              <Search size={14} color="#94a3b8" />
              <TextInput
                value={search} onChangeText={setSearch}
                placeholder="Search leave type..." placeholderTextColor="#94a3b8"
                style={{ flex: 1, marginLeft: 8, fontSize: 13, fontFamily: FONT, color: '#0f172a' }}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={10} color="#64748b" />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Content */}
          {loading ? (
            <View style={{ paddingVertical: 48, alignItems: 'center', gap: 10 }}>
              <ActivityIndicator size="large" color={NAVY} />
              <Text style={{ fontFamily: FONT, fontSize: 13, color: '#94a3b8' }}>Loading leave types...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={{ paddingVertical: 48, alignItems: 'center', gap: 6 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                <Search size={20} color="#cbd5e1" />
              </View>
              <Text style={{ fontFamily: FONT, fontSize: 14, fontWeight: '600', color: '#374151' }}>No results</Text>
              <Text style={{ fontFamily: FONT, fontSize: 12, color: '#9ca3af' }}>Try a different search term</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => item.value}
              style={{ maxHeight: 380 }}
              contentContainerStyle={{ paddingVertical: 6 }}
              renderItem={({ item, index }) => {
                const sel = item.value === selectedValue
                const chipColor = CHIP_COLORS[index % CHIP_COLORS.length]!
                return (
                  <TouchableOpacity
                    onPress={() => { onSelect(item.value, item.label); onClose() }}
                    activeOpacity={0.7}
                    style={[
                      s.optRow,
                      sel && { backgroundColor: '#eef2ff', borderLeftWidth: 3, borderLeftColor: NAVY },
                    ]}
                  >
                    {/* Code badge */}
                    <View style={[s.optCodeBadge, { backgroundColor: `${chipColor}15`, borderColor: `${chipColor}30` }]}>
                      <Text style={[s.optCodeText, { color: chipColor }]} numberOfLines={1}>
                        {item.value}
                      </Text>
                    </View>

                    {/* Label */}
                    <Text
                      style={[s.optLabel, sel && { color: NAVY, fontWeight: '700' }]}
                      numberOfLines={2}
                    >
                      {item.label}
                    </Text>

                    {/* Check */}
                    {sel
                      ? <View style={s.optCheck}><Check size={11} color="#fff" /></View>
                      : <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0' }} />
                    }
                  </TouchableOpacity>
                )
              }}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f8fafc', marginHorizontal: 14 }} />}
            />
          )}

          {/* Footer safe area */}
          <View style={{ height: 20 }} />
        </View>
      </View>
    </Modal>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SpecialLeaveFormPopup({ isOpen, onClose, onSuccess }: Props) {
  // Identity + data scope from Redux (set at login by StoreProvider)
  const { employeeId, tenantCode } = useLeaveIdentity()
  const { leaveOptions, loading: leaveLoading } = useSpecialLeavePolicy({ isOpen, tenantCode, employeeId })
  const blockedDateMap = useBlockedDates({ isOpen, tenantCode, employeeId })

  const [leaveTitle, setLeaveTitle] = useState("")
  const [customLeaveTitle, setCustomLeaveTitle] = useState("")
  const [leaveCode, setLeaveCode] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [lastDayOfWork, setLastDayOfWork] = useState("")
  const [childDate, setChildDate] = useState("")
  const [remarks, setRemarks] = useState("")
  const [errors, setErrors]   = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [step, setStep]       = useState<Step>('calendar')
  const [successData, setSuccessData] = useState<{ leaveTitle: string; fromDate: string; toDate: string; noOfDays: number } | null>(null)
  const pulseAnim = useRef(new Animated.Value(0)).current

  const [calCurrentDate, setCalCurrentDate] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) })
  const [showLeaveTitle, setShowLeaveTitle] = useState(false)
  const [showLastDay, setShowLastDay]       = useState(false)
  const [showChildDate, setShowChildDate]   = useState(false)
  const showChildField =
    leaveTitle === "Maternity Leave" || leaveTitle === "Paternity Leave" || leaveTitle === "Adoption Leave"
  const childDateLabel =
    leaveTitle === "Adoption Leave" ? "Adoption Placement Date" : "Date of Birth of Child"

  const noOfDays = useMemo(() => calcDays(fromDate, toDate), [fromDate, toDate])
  const finalTitle = leaveTitle === "Other" ? customLeaveTitle.trim() : leaveTitle

  useEffect(() => {
    if (isOpen) {
      const n = new Date()
      setStep('calendar')
      setCalCurrentDate(new Date(n.getFullYear(), n.getMonth(), 1))
      setLeaveTitle("")
      setCustomLeaveTitle("")
      setLeaveCode("")
      setFromDate("")
      setToDate("")
      setLastDayOfWork("")
      setChildDate("")
      setRemarks("")
      setErrors({})
      setSubmitted(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (step !== 'success') return
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [step])

  const { post, loading: posting } = usePostRequest<any>({
    url: "specialLeaveApplication",
    onSuccess: () => { setStep('success') },
    onError: () => setErrors(p => ({ ...p, leaveTitle: "Submission failed. Please try again." })),
  })

  const handleSubmit = () => {
    setSubmitted(true)
    const errs = validate({ leaveTitle: finalTitle, fromDate, toDate })
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSuccessData({
      leaveTitle: finalTitle,
      fromDate: formatDisplayDate(fromDate),
      toDate: formatDisplayDate(toDate),
      noOfDays,
    })

    const pad = (n: number) => n < 10 ? `0${n}` : String(n)
    const ist = new Date(Date.now() + 330 * 60 * 1000)
    const yy = ist.getUTCFullYear(), mo = pad(ist.getUTCMonth()+1), dd = pad(ist.getUTCDate())
    const hh = pad(ist.getUTCHours()), mi = pad(ist.getUTCMinutes()), ss = pad(ist.getUTCSeconds())
    const ms = String(ist.getUTCMilliseconds()).padStart(3,"0")
    const resolvedCode = leaveCode.trim() || DEFAULT_LEAVE_CODE[finalTitle] || "PL"

    post({
      tenant: tenantCode, action: "insert", id: null, event: "application",
      collectionName: "specialLeaveApplication",
      data: {
        tenantCode, organizationCode: tenantCode,
        workflowName: "specialLeave Application", stateEvent: "NEXT",
        workflowState: "INITIATED",
        uploadedBy: employeeId, createdBy: employeeId, employeeID: employeeId,
        appliedDate: `${yy}-${mo}-${dd}`,
        createdOn: `${yy}-${mo}-${dd}T${hh}:${mi}:${ss}.${ms}+05:30`,
        uploadTime: `${yy}-${mo}-${dd}T${hh}:${mi}:${ss}`,
        leaveTitle: finalTitle, leaveCode: resolvedCode,
        fromDate: isoToDDMMYYYY(fromDate), toDate: isoToDDMMYYYY(toDate),
        noOfDays: String(noOfDays),
        lastDayOfWork: lastDayOfWork ? isoToDDMMYYYY(lastDayOfWork) : "",
        DOBOfChild: showChildField && leaveTitle !== "Adoption Leave" ? isoToDDMMYYYY(childDate) : "",
        AdoptionPlacementDate: leaveTitle === "Adoption Leave" ? isoToDDMMYYYY(childDate) : "",
        remarks: remarks.trim(), documents: [], documentCount: 0,
      },
    })
  }

  const handleClose = () => { setErrors({}); setSubmitted(false); onClose() }

  // ── Success ──────────────────────────────────────────────────────────────────

  // ── Calendar Screen ──────────────────────────────────────────────────────────

  if (step === 'calendar') {
    const y = calCurrentDate.getFullYear()
    const m = calCurrentDate.getMonth()
    const todayIso = todayStr()

    const handleDayTap = (iso: string) => {
      if (iso < todayIso || blockedDateMap[iso]) return
      if (!fromDate || iso < fromDate) {
        setFromDate(iso); setToDate(iso)
      } else {
        setToDate(iso)
      }
    }

    const STATE_COLOR: Record<string, string> = {
      INITIATED:  '#f59e0b',
      PENDING:    '#f59e0b',
      APPROVED:   '#16a34a',
      PROCESSING: '#3b82f6',
    }

    const navigateCal = (dir: 'prev' | 'next') => {
      setCalCurrentDate(prev => {
        const n = new Date(prev); n.setMonth(prev.getMonth() + (dir === 'next' ? 1 : -1)); return n
      })
    }

    const cells: (string | null)[] = []
    for (let i = 0; i < calFirstOffset(y, m); i++) cells.push(null)
    for (let d = 1; d <= calDaysInMonth(y, m); d++) {
      cells.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }

    return (
      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <View style={s.screen}>
          <View style={{ paddingTop: 58, paddingHorizontal: 14, paddingBottom: 12 }}>
            <View style={s.topRow}>
              <View style={s.leftGroup}>
                <Pressable onPress={handleClose} hitSlop={8} style={s.backBtn}>
                  <X size={16} color="#0f172a" />
                </Pressable>
                <Text style={s.greeting}>Special Leave</Text>
              </View>
            </View>
            <View style={s.titleRow}>
              <Text style={s.titleLabel}>Select Date Range</Text>
              <View style={s.badge}><Text style={s.badgeText}>Special Leave</Text></View>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: 120 }}>

            {/* Leave policy chips */}
            {leaveOptions.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={s.sectionLabel}>AVAILABLE LEAVE TYPES</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                  {leaveOptions.map((opt, i) => (
                    <View key={opt.leaveCode} style={[s.balanceChip, { backgroundColor: `${BALANCE_COLORS[i % BALANCE_COLORS.length]}15` }]}>
                      <Text style={[s.balanceChipCode, { color: BALANCE_COLORS[i % BALANCE_COLORS.length] }]}>{opt.leaveTitle}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Calendar card */}
            <View style={s.calCard}>
              {/* Month navigation */}
              <View style={s.calMonthNav}>
                <TouchableOpacity onPress={() => navigateCal('prev')} style={s.calNavBtn} hitSlop={12}>
                  <Ionicons name="chevron-back" size={18} color={NAVY} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCalCurrentDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
                  style={s.calMonthLabelWrap}
                >
                  <Text style={s.calMonthLabel}>{CAL_MONTHS[m]}</Text>
                  <Text style={s.calYearLabel}>{y}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigateCal('next')} style={s.calNavBtn} hitSlop={12}>
                  <Ionicons name="chevron-forward" size={18} color={NAVY} />
                </TouchableOpacity>
              </View>

              {/* Day headers */}
              <View style={s.calDayHeaders}>
                {CAL_DAYS.map((d) => (
                  <View key={d} style={s.calDayHeaderCell}>
                    <Text style={s.calDayHeaderText}>{d}</Text>
                  </View>
                ))}
              </View>

              {/* Day cells */}
              <View style={s.calGrid}>
                {cells.map((iso, idx) => {
                  if (!iso) return <View key={`e-${idx}`} style={s.calCell} />
                  const dayNum     = parseInt(iso.split('-')[2]!, 10)
                  const isPast     = iso < todayIso
                  const appState   = blockedDateMap[iso]
                  const isBlocked  = Boolean(appState)
                  const isFrom     = iso === fromDate
                  const isTo       = iso === toDate && toDate !== fromDate
                  const inRange    = Boolean(fromDate && toDate && iso > fromDate && iso < toDate)
                  const isToday    = iso === todayIso
                  const selected   = isFrom || isTo
                  const stateColor = appState ? (STATE_COLOR[appState] ?? '#6b7280') : undefined

                  return (
                    <View key={iso} style={[s.calCell, inRange && s.calCellInRange]}>
                      <TouchableOpacity
                        onPress={() => handleDayTap(iso)}
                        disabled={isPast || isBlocked}
                        activeOpacity={0.65}
                        style={[
                          s.calDayBtn,
                          selected  && s.calDayBtnSelected,
                          isToday && !selected && s.calDayBtnToday,
                          isBlocked && { backgroundColor: `${stateColor}18`, borderWidth: 1, borderColor: `${stateColor}40` },
                          isPast    && { opacity: 0.25 },
                        ]}
                      >
                        <Text style={[
                          s.calDayNum,
                          selected  && s.calDayNumSelected,
                          isToday && !selected && { color: NAVY, fontWeight: '700' },
                          inRange   && !selected && { color: NAVY },
                          isBlocked && { color: stateColor, fontWeight: '700' },
                        ]}>
                          {dayNum}
                        </Text>
                        {isBlocked && stateColor && (
                          <View style={[s.calDayDot, { backgroundColor: stateColor }]} />
                        )}
                        {isToday && !selected && !isBlocked && (
                          <View style={[s.calDayDot, { backgroundColor: NAVY }]} />
                        )}
                      </TouchableOpacity>
                    </View>
                  )
                })}
              </View>

              {/* Legend */}
              <View style={s.calLegend}>
                {[
                  { color: NAVY,      label: 'Selected' },
                  { color: '#bfdbfe', label: 'Range',   square: true },
                  { color: '#f59e0b', label: 'Pending' },
                  { color: '#16a34a', label: 'Approved' },
                ].map(l => (
                  <View key={l.label} style={s.calLegendItem}>
                    <View style={[s.calLegendDot, { backgroundColor: l.color, borderRadius: l.square ? 2 : 5 }]} />
                    <Text style={s.calLegendText}>{l.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {fromDate && (
              <View style={[s.card, { marginTop: 12, flexDirection: 'row', gap: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>FROM</Text>
                  <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: '700', color: NAVY }}>{formatDisplayDate(fromDate)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>TO</Text>
                  <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: '700', color: NAVY }}>{toDate ? formatDisplayDate(toDate) : '—'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>DAYS</Text>
                  <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: '700', color: NAVY }}>{noOfDays}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {fromDate && toDate && (
            <View style={s.bottomBar}>
              <TouchableOpacity onPress={() => setStep('form')} style={s.btn} activeOpacity={0.85}>
                <Text style={s.btnText}>Continue → {noOfDays} Day{noOfDays !== 1 ? 's' : ''}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    )
  }

  // ── Success ──────────────────────────────────────────────────────────────────

  if (step === 'success') {
    const rippleScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.28] })
    const rippleOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.03] })
    return (
      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <View style={s.screen}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
            <View style={[s.frame, { alignItems: 'center', justifyContent: 'center', paddingTop: 72 }]}>

              {/* Background orb */}
              <Animated.View pointerEvents="none" style={[s.bgOrb, { opacity: rippleOpacity, transform: [{ scale: rippleScale }] }]} />

              {/* Icon shell */}
              <View style={s.iconShell}>
                <Animated.View pointerEvents="none" style={[s.iconRipple, { opacity: rippleOpacity, transform: [{ scale: rippleScale }] }]} />
                <Ionicons name="checkmark" size={42} color="#fff" />
              </View>

              {/* Title */}
              <Text style={s.successTitle}>Request Submitted</Text>
              <Text style={s.successSub}>
                Your special leave request has been submitted successfully and is now pending approval.
              </Text>

              {/* Summary card */}
              <View style={s.successCard}>
                <View style={s.successRefRow}>
                  <View style={s.successRefIcon}>
                    <Ionicons name="document-text-outline" size={16} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.successRefLabel}>Leave Title</Text>
                    <Text style={s.successRefValue}>{successData?.leaveTitle || '—'}</Text>
                  </View>
                </View>
                <View style={s.successGrid}>
                  <View style={s.successGridItem}>
                    <Text style={s.successGridLabel}>From Date</Text>
                    <Text style={s.successGridValue}>{successData?.fromDate || '—'}</Text>
                  </View>
                  <View style={s.successGridItem}>
                    <Text style={s.successGridLabel}>To Date</Text>
                    <Text style={s.successGridValue}>{successData?.toDate || '—'}</Text>
                  </View>
                  <View style={s.successGridItem}>
                    <Text style={s.successGridLabel}>No. of Days</Text>
                    <Text style={s.successGridValue}>
                      {successData?.noOfDays ? `${successData.noOfDays} day${successData.noOfDays !== 1 ? 's' : ''}` : '—'}
                    </Text>
                  </View>
                  <View style={s.successGridItem}>
                    <Text style={s.successGridLabel}>Status</Text>
                    <Text style={[s.successGridValue, { color: '#2563eb' }]}>Initiated</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[s.btn, { marginTop: 20, width: '100%' }]}
                onPress={() => { onSuccess?.(); handleClose() }}
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
                <Pressable onPress={() => setStep('calendar')} hitSlop={8} style={s.backBtn}>
                  <X size={16} color="#0f172a" />
                </Pressable>
                <Text style={s.greeting}>Special Leave</Text>
              </View>
            </View>

            {/* Title row */}
            <View style={s.titleRow}>
              <Text style={s.titleLabel}>New Application</Text>
              <View style={s.badge}>
                <Text style={s.badgeText}>Special Leave</Text>
              </View>
            </View>

            {/* ── Main card ── */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Fill in the details below</Text>
              <Text style={s.cardSub}>Select leave type, date range and required info to submit your special leave request.</Text>

              <View style={s.separator} />

              {/* Leave Title — dropdown sourced from leave policy API */}
              <Label text="Leave Title" />
              <SelectRow
                value={leaveTitle || ""}
                placeholder="Select leave title"
                onPress={() => setShowLeaveTitle(true)}
                error={errors.leaveTitle}
                loading={leaveLoading}
              />
              <ErrText msg={errors.leaveTitle} />

              {/* Dates — read-only, selected from calendar step */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>From Date <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <View style={s.readOnlyWrap}>
                    <Ionicons name="calendar-outline" size={13} color="#94a3b8" />
                    <Text style={[s.inputText, { color: fromDate ? '#0f172a' : '#94a3b8' }]} numberOfLines={1}>
                      {fromDate ? formatDisplayDate(fromDate) : 'Not selected'}
                    </Text>
                    <Ionicons name="lock-closed-outline" size={11} color="#cbd5e1" />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>To Date <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <View style={s.readOnlyWrap}>
                    <Ionicons name="calendar-outline" size={13} color="#94a3b8" />
                    <Text style={[s.inputText, { color: toDate ? '#0f172a' : '#94a3b8' }]} numberOfLines={1}>
                      {toDate ? formatDisplayDate(toDate) : 'Not selected'}
                    </Text>
                    <Ionicons name="lock-closed-outline" size={11} color="#cbd5e1" />
                  </View>
                </View>
              </View>

              {/* Days badge */}
              {noOfDays > 0 && (
                <View style={s.daysBadge}>
                  <Ionicons name="calendar-outline" size={14} color={NAVY} />
                  <Text style={s.daysBadgeText}>
                    {noOfDays} day{noOfDays !== 1 ? 's' : ''} selected
                  </Text>
                </View>
              )}

              {/* Last Day of Work */}
              <Label text="Last Day of Work" optional />
              <SelectRow
                value={lastDayOfWork ? formatDisplayDate(lastDayOfWork) : ""}
                placeholder="Select date"
                onPress={() => setShowLastDay(true)}
              />

              {/* Child / Adoption field */}
              {showChildField && (
                <>
                  <Label text={childDateLabel} optional />
                  <SelectRow
                    value={childDate ? formatDisplayDate(childDate) : ""}
                    placeholder="Select date"
                    onPress={() => setShowChildDate(true)}
                  />
                </>
              )}

              {/* Remarks */}
              <Label text="Remarks" optional />
              <TextInput
                value={remarks}
                onChangeText={setRemarks}
                placeholder="Reason for special leave..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={[s.textArea]}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <View />
                <Text style={[s.muted, { fontSize: 10, color: remarks.length > 500 ? '#ef4444' : '#9ca3af' }]}>
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
              {posting
                ? <><ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} /><Text style={s.btnText}>Submitting...</Text></>
                : <Text style={s.btnText}>Submit Special Leave Request</Text>
              }
            </TouchableOpacity>

            {/* Cancel link */}
            <TouchableOpacity onPress={handleClose} style={{ alignItems: 'center', marginTop: 14 }}>
              <Text style={s.cancelLink}>Cancel</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </View>

      <PickerModal
        visible={showLeaveTitle}
        onClose={() => setShowLeaveTitle(false)}
        title="Select Leave Title"
        options={leaveOptions.map(o => ({ value: o.leaveCode, label: o.leaveTitle }))}
        selectedValue={leaveCode}
        loading={leaveLoading}
        onSelect={(code, label) => {
          setLeaveTitle(label)
          setLeaveCode(code)
          if (submitted) setErrors(p => ({ ...p, leaveTitle: undefined }))
        }}
      />
      <SpecialLeaveDatePicker
        visible={showLastDay} onClose={() => setShowLastDay(false)} title="Select Last Day of Work"
        selected={lastDayOfWork} minDate={undefined}
        onSelect={v => setLastDayOfWork(v)}
      />
      <SpecialLeaveDatePicker
        visible={showChildDate} onClose={() => setShowChildDate(false)} title={`Select ${childDateLabel}`}
        selected={childDate} minDate={undefined}
        onSelect={v => setChildDate(v)}
      />
    </Modal>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  frame: { flex: 1, paddingHorizontal: 14, paddingTop: 58, paddingBottom: 24 },

  // Top row
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leftGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0' },
  greeting: { fontFamily: FONT, color: '#0f172a', fontSize: 20, fontWeight: '700' },

  // Title row
  titleRow: { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleLabel: { fontFamily: FONT, fontSize: 18, fontWeight: '600', color: '#0f172a' },
  badge: { borderRadius: 999, backgroundColor: NAVY, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: '#fff' },

  // Card
  card: { marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', padding: 14 },
  cardTitle: { fontFamily: FONT, fontSize: 18, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  cardSub: { fontFamily: FONT, marginTop: 6, fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 16, paddingHorizontal: 8 },
  separator: { height: 1, backgroundColor: '#e2e8f0', marginTop: 14, marginBottom: 4 },

  // Labels + inputs
  label: { fontFamily: FONT, fontSize: 10, color: '#64748b', marginBottom: 6, fontWeight: '600', marginTop: 12 },
  inputWrap: {
    minHeight: 38, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6,
    backgroundColor: '#f8fafc', paddingHorizontal: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  inputError: { borderColor: '#fca5a5', backgroundColor: '#fff5f5' },
  inputText: { fontFamily: FONT, flex: 1, fontSize: 13, color: '#0f172a', paddingVertical: 10 },
  placeholder: { color: '#9ca3af' },
  textArea: {
    fontFamily: FONT, minHeight: 96, borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 6, backgroundColor: '#f8fafc', paddingHorizontal: 10,
    paddingVertical: 10, fontSize: 13, color: '#0f172a',
  },
  errText: { fontFamily: FONT, marginTop: 4, fontSize: 11, color: '#b91c1c' },
  readOnlyWrap: {
    minHeight: 38, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6,
    backgroundColor: '#f1f5f9', paddingHorizontal: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },

  // Chips (leave title selector)
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
    borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  chipActive: { borderColor: NAVY, backgroundColor: NAVY },
  chipText: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: '#374151' },
  chipTextActive: { color: '#fff' },

  // Toggle (type of absence)
  toggleBtn: {
    flex: 1, height: 38, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc',
  },
  toggleActive: { borderColor: NAVY, backgroundColor: '#eef2ff' },
  toggleText: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: '#64748b' },
  toggleTextActive: { color: NAVY, fontWeight: '700' },

  // Days badge
  daysBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  daysBadgeText: { fontFamily: FONT, fontSize: 13, fontWeight: '600', color: NAVY },

  // Error box
  errBox: { marginTop: 12, backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12 },
  errBoxTitle: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: '#dc2626', marginBottom: 4 },
  errBoxItem: { fontFamily: FONT, fontSize: 11, color: '#b91c1c', marginLeft: 6, marginBottom: 2 },

  // Note + button
  note: { fontFamily: FONT, marginTop: 20, fontSize: 10, color: '#64748b', textAlign: 'center', lineHeight: 14, paddingHorizontal: 12 },
  btn: { marginTop: 12, height: 44, borderRadius: 6, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontFamily: FONT, color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelLink: { fontFamily: FONT, fontSize: 12, color: '#64748b' },
  muted: { fontFamily: FONT, fontSize: 12, color: '#9ca3af' },

  // Success screen
  bgOrb: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#bbf7d0', top: '20%', alignSelf: 'center' },
  iconShell: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: '#16a34a', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6, overflow: 'visible' },
  iconRipple: { position: 'absolute', width: 152, height: 152, borderRadius: 76, backgroundColor: '#86efac' },
  successTitle: { fontFamily: FONT, fontSize: 24, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 8 },
  successSub: { fontFamily: FONT, fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20, paddingHorizontal: 22, marginBottom: 4 },
  successCard: { width: '100%', marginTop: 24, borderRadius: 20, borderWidth: 1, borderColor: '#dbeafe', backgroundColor: '#fff', padding: 16, shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  successRefRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  successRefIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  successRefLabel: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 },
  successRefValue: { fontFamily: FONT, marginTop: 2, fontSize: 14, fontWeight: '800', color: '#0f172a' },
  successGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, rowGap: 14 },
  successGridItem: { width: '50%', paddingRight: 12 },
  successGridLabel: { fontFamily: FONT, fontSize: 11, color: '#94a3b8', marginBottom: 4 },
  successGridValue: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: '#0f172a' },

  // ── Calendar screen ──────────────────────────────────────────────────────────
  sectionLabel: { fontFamily: FONT, fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.6, marginBottom: 8 },

  calCard:       { marginTop: 14, borderRadius: 20, backgroundColor: '#fff', shadowColor: '#0f172a', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3, overflow: 'hidden' },
  calMonthNav:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  calNavBtn:     { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  calMonthLabelWrap: { alignItems: 'center' },
  calMonthLabel: { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: '#0f172a' },
  calYearLabel:  { fontFamily: FONT, fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 1 },

  calDayHeaders: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#f8fafc' },
  calDayHeaderCell: { flex: 1, alignItems: 'center' },
  calDayHeaderText: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: '#94a3b8' },

  calGrid:        { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingVertical: 6 },
  calCell:        { width: `${100/7}%` as any, alignItems: 'center', paddingVertical: 3 },
  calCellInRange: { backgroundColor: '#dbeafe' },
  calDayBtn:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  calDayBtnSelected: { backgroundColor: NAVY, shadowColor: NAVY, shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  calDayBtnToday: { backgroundColor: '#e0e7ff' },
  calDayNum:      { fontFamily: FONT, fontSize: 12, color: '#374151', fontWeight: '500' },
  calDayNumSelected: { color: '#fff', fontWeight: '800' },
  calDayDot:      { width: 4, height: 4, borderRadius: 2, marginTop: 1 },

  calLegend:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  calLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  calLegendDot:  { width: 10, height: 10 },
  calLegendText: { fontFamily: FONT, fontSize: 10, color: '#64748b', fontWeight: '600' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },

  // Bottom sheet picker
  sheetBg:      { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  sheetHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHead:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sheetTitle:   { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sheetClose:   { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 42 },
  optRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  optLabel:     { fontFamily: FONT, fontSize: 13, color: '#374151', flex: 1, lineHeight: 18 },
  optCheck:     { width: 22, height: 22, borderRadius: 11, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  optCodeBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, minWidth: 42, alignItems: 'center' },
  optCodeText:  { fontFamily: FONT, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  // legacy (kept for form/success screens)
  balanceChip:      { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 72 },
  balanceChipValue: { fontSize: 15, fontWeight: '800', fontFamily: FONT },
  balanceChipCode:  { fontSize: 10, fontWeight: '700', marginTop: 1, fontFamily: FONT },
  balanceChipUnit:  { fontSize: 9, fontFamily: FONT },
  dayHead:          { fontFamily: FONT, fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  dayNum:           { fontFamily: FONT, fontSize: 11, color: '#374151' },

})

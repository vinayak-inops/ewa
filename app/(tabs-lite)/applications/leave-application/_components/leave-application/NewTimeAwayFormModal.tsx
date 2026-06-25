import { usePostRequest } from '@/hooks/api/usePostRequest'
import { Ionicons } from '@expo/vector-icons'
import { Check, ChevronDown, Search, X } from 'lucide-react-native'
import React, { useEffect, useMemo, useRef, useState } from 'react'
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
} from 'react-native'
import { useBlockedDates } from '../hooks/useBlockedDates'
import { useLeaveIdentity } from '../hooks/useLeaveIdentity'
import { useLeavePolicy } from '../hooks/useLeavePolicy'

const FONT = 'Inter'
const NAVY = '#13206b'

// ── Calendar helpers ──────────────────────────────────────────────────────────

const CAL_MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CAL_DAYS     = ['Su','Mo','Tu','We','Th','Fr','Sa']
const WEEK_DAYS    = ['SUN','MON','TUE','WED','THU','FRI','SAT']
const MONTH_ABBREV = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
function calDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function calFirstOffset(y: number, m: number)  { return new Date(y, m, 1).getDay() }

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'calendar' | 'form' | 'success'

const DURATIONS = [
  { value: 'Full-Day',    label: 'Full Day'    },
  { value: 'First-Half',  label: 'First Half'  },
  { value: 'Second-Half', label: 'Second Half' },
] as const
type DurationValue = typeof DURATIONS[number]['value']

interface FormErrors {
  leaveCode?: string
  remarks?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toddmmyyyy(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}
function toyyyymmdd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function isPast(d: Date) { const t = new Date(); t.setHours(0, 0, 0, 0); return d < t }

const BALANCE_COLORS = ['#1e40af', '#2563eb', '#1d4ed8', '#1e3a8a', '#3b82f6']
const CHIP_COLORS    = ['#1e40af','#0369a1','#0f766e','#7c3aed','#b45309','#be185d','#15803d','#9333ea']

// ── Reusable field pieces ─────────────────────────────────────────────────────

function Label({ text }: { text: string }) {
  return <Text style={s.label}>{text} <Text style={{ color: '#ef4444' }}>*</Text></Text>
}
function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null
  return <Text style={s.errText}>{msg}</Text>
}

function SelectRow({ value, placeholder, onPress, error, loading }: {
  value?: string; placeholder: string; onPress: () => void
  error?: string; loading?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[s.inputWrap, error ? s.inputError : null, { flexWrap: 'nowrap', paddingVertical: 0 }]}
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

function PickerModal({ visible, onClose, title, options, onSelect, selectedValue, loading }: {
  visible: boolean; onClose: () => void; title: string
  options: { value: string; label: string }[]
  onSelect: (value: string, label: string) => void
  selectedValue: string; loading?: boolean
}) {
  const [search, setSearch] = useState('')
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.value.toLowerCase().includes(search.toLowerCase())
  )
  useEffect(() => { if (!visible) setSearch('') }, [visible])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.sheetBg}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />

          {/* Header */}
          <View style={s.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>{title}</Text>
              {!loading && (
                <Text style={[s.muted, { marginTop: 2 }]}>
                  {filtered.length} type{filtered.length !== 1 ? 's' : ''} available
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
              <Search size={14} color="#9ca3af" />
              <TextInput
                value={search} onChangeText={setSearch}
                placeholder="Search leave types..." placeholderTextColor="#9ca3af"
                style={{ flex: 1, marginLeft: 8, fontSize: 13, fontFamily: FONT, color: '#0f172a' }}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
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
              <Text style={[s.muted, { fontSize: 13 }]}>Loading leave types...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={{ paddingVertical: 48, alignItems: 'center', gap: 6 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                <Search size={20} color="#94a3b8" />
              </View>
              <Text style={{ fontFamily: FONT, fontSize: 14, fontWeight: '600', color: '#374151' }}>No results found</Text>
              <Text style={s.muted}>Try a different search term</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => item.value}
              style={{ maxHeight: '80%' }}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f8fafc', marginLeft: 16 }} />}
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
                    <View style={[s.optCodeBadge, { backgroundColor: `${chipColor}18`, borderColor: `${chipColor}40` }]}>
                      <Text style={[s.optCodeText, { color: chipColor }]}>{item.value.slice(0, 3).toUpperCase()}</Text>
                    </View>
                    <Text style={[s.optLabel, sel && { color: NAVY, fontWeight: '700' }]} numberOfLines={2}>{item.label}</Text>
                    <View style={[s.optCheck, sel ? { backgroundColor: NAVY } : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#d1d5db' }]}>
                      {sel && <Check size={11} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                )
              }}
            />
          )}

          <View style={{ height: 20 }} />
        </View>
      </View>
    </Modal>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function NewTimeAwayFormModal({ isOpen, onClose, onSuccess }: Props) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])

  // Navigation
  const [step, setStep] = useState<Step>('calendar')

  // Calendar state
  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDates, setSelectedDates] = useState<Date[]>([])

  // Form state
  const [leaveCode, setLeaveCode]   = useState('')
  const [leaveTitle, setLeaveTitle] = useState('')
  const [showLeaveType, setShowLeaveType] = useState(false)
  const [duration, setDuration]     = useState<DurationValue>('Full-Day')
  const [remarks, setRemarks]     = useState('')
  const [errors, setErrors]       = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitApiError, setSubmitApiError] = useState('')
  const [successData, setSuccessData] = useState<{ employeeID: string; dates: string; leaveCode: string } | null>(null)

  // Identity — from Redux (decoded at login by StoreProvider)
  const { employeeId, tenantCode } = useLeaveIdentity()

  const pulseAnim = useRef(new Animated.Value(0)).current

  // Leave policy options (employee deployment → filtered leave types)
  const { leaveOptions, loading: leaveLoading } = useLeavePolicy({ isOpen, tenantCode, employeeId })

  // Blocked dates (existing leave + special leave applications)
  const blockedDateMap = useBlockedDates({ isOpen, tenantCode, employeeId })

  const { post, loading: posting } = usePostRequest<any>({
    url: 'leaveApplication',
    onSuccess: () => { setStep('success') },
    onError: (err) => setSubmitApiError(err?.message ?? 'Submission failed. Please try again.'),
  })

  // Reset fully on open
  useEffect(() => {
    if (isOpen) {
      setStep('calendar')
      setSelectedDates([])
      setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))
      setLeaveCode('')
      setLeaveTitle('')
      setDuration('Full-Day')
      setRemarks('')
      setErrors({})
      setSubmitted(false)
      setSubmitApiError('')
      setSuccessData(null)
    }
  }, [isOpen])

  // Success pulse animation
  useEffect(() => {
    if (step !== 'success') return
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [step])

  // Pre-select first leave option on step change to form
  useEffect(() => {
    if (step === 'form' && !leaveCode && leaveOptions.length > 0) {
      setLeaveCode(leaveOptions[0]!.leaveCode)
      setLeaveTitle(leaveOptions[0]!.leaveTitle)
    }
  }, [step, leaveOptions])

  const STATE_COLOR: Record<string, string> = {
    INITIATED:  '#f59e0b',
    PENDING:    '#f59e0b',
    APPROVED:   '#16a34a',
    PROCESSING: '#3b82f6',
  }

  const toggleDate = (iso: string) => {
    if (blockedDateMap[iso]) return
    const d = new Date(iso)
    if (isPast(d)) return
    setSelectedDates(prev =>
      prev.some(s => toyyyymmdd(s) === iso)
        ? prev.filter(s => toyyyymmdd(s) !== iso)
        : [...prev, d]
    )
  }

  const navigate = (dir: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const n = new Date(prev); n.setMonth(prev.getMonth() + (dir === 'next' ? 1 : -1)); return n
    })
  }

  const sorted = useMemo(
    () => [...selectedDates].sort((a, b) => a.getTime() - b.getTime()),
    [selectedDates]
  )

  const handleSubmit = () => {
    setSubmitted(true)
    setSubmitApiError('')
    const errs: FormErrors = {}
    if (!leaveCode.trim()) errs.leaveCode = 'Select a leave type'
    if (!remarks.trim())               errs.remarks = 'Remarks are required'
    else if (remarks.trim().length < 10)  errs.remarks = 'Remarks must be at least 10 characters'
    else if (remarks.trim().length > 500) errs.remarks = 'Remarks must not exceed 500 characters'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const dateLabel = sorted.length === 1
      ? toddmmyyyy(sorted[0]!)
      : `${toddmmyyyy(sorted[0]!)} – ${toddmmyyyy(sorted[sorted.length - 1]!)}`
    setSuccessData({ employeeID: employeeId, dates: dateLabel, leaveCode })

    const now = new Date()
    const pad = (n: number) => n < 10 ? `0${n}` : String(n)
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const uploadTime = `${ist.getFullYear()}-${pad(ist.getMonth() + 1)}-${pad(ist.getDate())}T${pad(ist.getHours())}:${pad(ist.getMinutes())}:${pad(ist.getSeconds())}`

    post({
      tenant: tenantCode,
      action: 'insert',
      id: '',
      event: 'application',
      collectionName: 'leaveApplication',
      data: {
        tenantCode,
        workflowName: 'leave Application',
        stateEvent: 'NEXT',
        typeOfAbsence: 'Time Away',
        uploadedBy: employeeId,
        createdBy: employeeId,
        createdOn: now.toISOString(),
        employeeID: employeeId,
        fromDate: sorted.length ? toddmmyyyy(sorted[0]!) : '',
        toDate:   sorted.length ? toddmmyyyy(sorted[sorted.length - 1]!) : '',
        leaves: sorted.map(d => ({ date: toddmmyyyy(d), leaveCode: leaveCode.trim(), duration })),
        uploadTime,
        organizationCode: tenantCode,
        appliedDate: toyyyymmdd(now),
        workflowState: 'INITIATED',
        remarks: remarks.trim(),
        documents: [],
        documentCount: 0,
      },
    })
  }

  const handleClose = () => { onClose() }

  // ── Success Screen ───────────────────────────────────────────────────────────

  if (step === 'success') {
    const rippleScale   = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.28] })
    const rippleOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.03] })

    return (
      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <View style={s.screen}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
            <View style={[s.frame, { alignItems: 'center', justifyContent: 'center', paddingTop: 72 }]}>

              <Animated.View pointerEvents="none" style={[s.bgOrb, { opacity: rippleOpacity, transform: [{ scale: rippleScale }] }]} />

              <View style={s.iconShell}>
                <Animated.View pointerEvents="none" style={[s.iconRipple, { opacity: rippleOpacity, transform: [{ scale: rippleScale }] }]} />
                <Ionicons name="checkmark" size={42} color="#fff" />
              </View>

              <Text style={s.successTitle}>Request Submitted</Text>
              <Text style={s.successSub}>
                Your time away request has been submitted successfully and is now pending approval.
              </Text>

              <View style={s.successCard}>
                <View style={s.successRefRow}>
                  <View style={s.successRefIcon}>
                    <Ionicons name="document-text-outline" size={16} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.successRefLabel}>Employee ID</Text>
                    <Text style={s.successRefValue}>{successData?.employeeID || '—'}</Text>
                  </View>
                </View>
                <View style={s.successGrid}>
                  <View style={s.successGridItem}>
                    <Text style={s.successGridLabel}>Date(s)</Text>
                    <Text style={s.successGridValue}>{successData?.dates || '—'}</Text>
                  </View>
                  <View style={s.successGridItem}>
                    <Text style={s.successGridLabel}>Days</Text>
                    <Text style={s.successGridValue}>{sorted.length}</Text>
                  </View>
                  <View style={s.successGridItem}>
                    <Text style={s.successGridLabel}>Leave Type</Text>
                    <Text style={s.successGridValue}>{successData?.leaveCode || '—'}</Text>
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

  // ── Form Screen ──────────────────────────────────────────────────────────────

  if (step === 'form') {
    const hasErrors = submitted && Object.values(errors).some(Boolean)

    return (
      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setStep('calendar')}>
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
                  <Text style={s.greeting}>Time Away</Text>
                </View>
              </View>

              {/* Title row */}
              <View style={s.titleRow}>
                <Text style={s.titleLabel}>New Application</Text>
                <View style={s.badge}>
                  <Text style={s.badgeText}>Time Away</Text>
                </View>
              </View>

              {/* ── Main card ── */}
              <View style={s.card}>
                <Text style={s.cardTitle}>Fill in the details below</Text>
                <Text style={s.cardSub}>Select your leave type, duration, and add remarks to submit your time away request.</Text>

                <View style={s.separator} />

                {/* Selected Dates */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 8 }}>
                  <Text style={[s.label, { marginTop: 0, marginBottom: 0 }]}>Selected Dates <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <View style={s.dayCountBadge}>
                    <Ionicons name="checkmark-circle" size={11} color={NAVY} />
                    <Text style={s.dayCountText}>{sorted.length} day{sorted.length !== 1 ? 's' : ''}</Text>
                  </View>
                </View>


                {/* Individual date cards */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                >
                  {sorted.map((d, i) => (
                    <View key={i} style={s.dateChip}>
                      <View style={s.dateChipTop}>
                        <Text style={s.dateChipWeekday}>{WEEK_DAYS[d.getDay()]}</Text>
                      </View>
                      <View style={s.dateChipBody}>
                        <Text style={s.dateChipDay}>{String(d.getDate()).padStart(2, '0')}</Text>
                        <Text style={s.dateChipMonthYear}>{MONTH_ABBREV[d.getMonth()]} {d.getFullYear()}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {/* Leave Type */}
                <Label text="Leave Type" />
                <SelectRow
                  value={leaveTitle || ''}
                  placeholder="Select leave type"
                  onPress={() => setShowLeaveType(true)}
                  error={errors.leaveCode}
                  loading={leaveLoading}
                />
                <ErrText msg={errors.leaveCode} />

                {/* Duration */}
                <Text style={s.label}>Duration <Text style={{ color: '#ef4444' }}>*</Text></Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  {DURATIONS.map(d => {
                    const active = duration === d.value
                    return (
                      <TouchableOpacity
                        key={d.value}
                        onPress={() => setDuration(d.value)}
                        style={[s.toggleBtn, active && s.toggleActive, { flex: 1 }]}
                      >
                        <Text style={[s.toggleText, active && s.toggleTextActive]}>{d.label}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                {/* Remarks */}
                <Label text="Remarks" />
                <TextInput
                  value={remarks}
                  onChangeText={v => {
                    setRemarks(v)
                    if (submitted) {
                      const e = !v.trim()               ? 'Remarks are required'
                              : v.trim().length < 10    ? 'Minimum 10 characters'
                              : v.trim().length > 500   ? 'Maximum 500 characters'
                              : undefined
                      setErrors(p => ({ ...p, remarks: e }))
                    }
                  }}
                  placeholder="Enter reason for leave (minimum 10 characters)"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={[s.textArea, errors.remarks ? s.inputError : null]}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <ErrText msg={errors.remarks} />
                  <Text style={[s.muted, { fontSize: 10, marginLeft: 'auto', color: remarks.length > 500 ? '#ef4444' : '#9ca3af' }]}>
                    {remarks.length}/500
                  </Text>
                </View>
              </View>

              {/* API error */}
              {!!submitApiError && (
                <View style={s.errBox}>
                  <Text style={s.errBoxTitle}>{submitApiError}</Text>
                </View>
              )}

              {/* Validation error summary */}
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
                  : <Text style={s.btnText}>Submit Time Away Request</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep('calendar')} style={{ alignItems: 'center', marginTop: 14 }}>
                <Text style={s.cancelLink}>← Back to Calendar</Text>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </View>

        <PickerModal
          visible={showLeaveType}
          onClose={() => setShowLeaveType(false)}
          title="Select Leave Type"
          options={leaveOptions.map(o => ({ value: o.leaveCode, label: o.leaveTitle }))}
          selectedValue={leaveCode}
          loading={leaveLoading}
          onSelect={(code, label) => {
            setLeaveCode(code)
            setLeaveTitle(label)
            setErrors(p => ({ ...p, leaveCode: undefined }))
          }}
        />
      </Modal>
    )
  }

  // ── Calendar Screen (step === 'calendar') ────────────────────────────────────

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={s.screen}>

        {/* Top row */}
        <View style={{ paddingTop: 58, paddingHorizontal: 14, paddingBottom: 12 }}>
          <View style={s.topRow}>
            <View style={s.leftGroup}>
              <Pressable onPress={handleClose} hitSlop={8} style={s.backBtn}>
                <X size={16} color="#0f172a" />
              </Pressable>
              <Text style={s.greeting}>Time Away</Text>
            </View>
          </View>

          {/* Title row */}
          <View style={s.titleRow}>
            <Text style={s.titleLabel}>Select Dates</Text>
            <View style={s.badge}>
              <Text style={s.badgeText}>Time Away</Text>
            </View>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 120 }}>

          {/* Leave type chips */}
          {leaveOptions.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Text style={s.sectionLabel}>LEAVE TYPES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                {leaveOptions.map((opt, i) => (
                  <View key={opt.leaveCode} style={[s.balanceChip, { backgroundColor: `${BALANCE_COLORS[i % BALANCE_COLORS.length]}15` }]}>
                    <Text style={[s.balanceChipCode, { color: BALANCE_COLORS[i % BALANCE_COLORS.length] }]}>{opt.leaveTitle}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Inline calendar card */}
          {(() => {
            const y = currentDate.getFullYear()
            const m = currentDate.getMonth()
            const todayIso = toyyyymmdd(today)

            const cells: (string | null)[] = []
            for (let i = 0; i < calFirstOffset(y, m); i++) cells.push(null)
            for (let d = 1; d <= calDaysInMonth(y, m); d++) {
              cells.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
            }

            return (
              <View style={s.calCard}>
                {/* Month navigation */}
                <View style={s.calMonthNav}>
                  <TouchableOpacity onPress={() => navigate('prev')} style={s.calNavBtn} hitSlop={12}>
                    <Ionicons name="chevron-back" size={18} color={NAVY} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))}
                    style={s.calMonthLabelWrap}
                  >
                    <Text style={s.calMonthLabel}>{CAL_MONTHS[m]}</Text>
                    <Text style={s.calYearLabel}>{y}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigate('next')} style={s.calNavBtn} hitSlop={12}>
                    <Ionicons name="chevron-forward" size={18} color={NAVY} />
                  </TouchableOpacity>
                </View>

                {/* Day headers */}
                <View style={s.calDayHeaders}>
                  {CAL_DAYS.map(d => (
                    <View key={d} style={s.calDayHeaderCell}>
                      <Text style={s.calDayHeaderText}>{d}</Text>
                    </View>
                  ))}
                </View>

                {/* Day cells */}
                <View style={s.calGrid}>
                  {cells.map((iso, idx) => {
                    if (!iso) return <View key={`e-${idx}`} style={s.calCell} />
                    const dayNum   = parseInt(iso.split('-')[2]!, 10)
                    const pastDay  = iso < todayIso
                    const appState = blockedDateMap[iso]
                    const blocked  = Boolean(appState)
                    const isToday  = iso === todayIso
                    const selected = selectedDates.some(s => toyyyymmdd(s) === iso)
                    const stateColor = appState ? (STATE_COLOR[appState] ?? '#6b7280') : undefined

                    return (
                      <View key={iso} style={s.calCell}>
                        <TouchableOpacity
                          onPress={() => toggleDate(iso)}
                          disabled={pastDay || blocked}
                          activeOpacity={0.65}
                          style={[
                            s.calDayBtn,
                            selected  && s.calDayBtnSelected,
                            isToday && !selected && s.calDayBtnToday,
                            blocked && { backgroundColor: `${stateColor}18`, borderWidth: 1, borderColor: `${stateColor}40` },
                            pastDay   && { opacity: 0.25 },
                          ]}
                        >
                          <Text style={[
                            s.calDayNum,
                            selected  && s.calDayNumSelected,
                            isToday && !selected && { color: NAVY, fontWeight: '700' },
                            blocked && { color: stateColor, fontWeight: '700' },
                          ]}>
                            {dayNum}
                          </Text>
                          {blocked && stateColor && (
                            <View style={[s.calDayDot, { backgroundColor: stateColor }]} />
                          )}
                          {isToday && !selected && !blocked && (
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
                    { color: '#f59e0b', label: 'Pending' },
                    { color: '#16a34a', label: 'Approved' },
                    { color: '#3b82f6', label: 'Processing' },
                  ].map(l => (
                    <View key={l.label} style={s.calLegendItem}>
                      <View style={[s.calLegendDot, { backgroundColor: l.color }]} />
                      <Text style={s.calLegendText}>{l.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )
          })()}

          {/* Selected dates summary */}
          {selectedDates.length > 0 && (
            <View style={[s.card, { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>SELECTED</Text>
                <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: '700', color: NAVY }}>
                  {selectedDates.length} day{selectedDates.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDates([])} style={{ padding: 6 }}>
                <Text style={{ fontFamily: FONT, fontSize: 11, color: '#ef4444', fontWeight: '600' }}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>

        {/* Continue button */}
        {selectedDates.length > 0 && (
          <View style={s.bottomBar}>
            <TouchableOpacity
              onPress={() => setStep('form')}
              style={s.btn}
              activeOpacity={0.85}
            >
              <Text style={s.btnText}>
                Continue with {selectedDates.length} Day{selectedDates.length !== 1 ? 's' : ''} →
              </Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </Modal>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  frame:  { flex: 1, paddingHorizontal: 14, paddingTop: 58, paddingBottom: 24 },

  // Top row — identical to ShiftChangeFormPopup
  topRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leftGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn:   { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0' },
  greeting:  { fontFamily: FONT, color: '#0f172a', fontSize: 20, fontWeight: '700' },

  // Title row — identical to ShiftChangeFormPopup
  titleRow:   { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleLabel: { fontFamily: FONT, fontSize: 18, fontWeight: '600', color: '#0f172a' },
  badge:      { borderRadius: 999, backgroundColor: NAVY, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText:  { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: '#fff' },

  // Card — identical to ShiftChangeFormPopup
  card:     { marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', padding: 14 },
  cardTitle:{ fontFamily: FONT, fontSize: 18, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  cardSub:  { fontFamily: FONT, marginTop: 6, fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 16, paddingHorizontal: 8 },
  separator:{ height: 1, backgroundColor: '#e2e8f0', marginTop: 14, marginBottom: 4 },

  // Labels + inputs — identical to ShiftChangeFormPopup
  label: { fontFamily: FONT, fontSize: 10, color: '#64748b', marginBottom: 6, fontWeight: '600', marginTop: 12 },
  inputWrap: {
    minHeight: 38, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6,
    backgroundColor: '#f8fafc', paddingHorizontal: 10,
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6,
  },
  inputError: { borderColor: '#fca5a5', backgroundColor: '#fff5f5' },
  inputText:  { fontFamily: FONT, flex: 1, fontSize: 13, color: '#0f172a', paddingVertical: 10 },
  placeholder:{ color: '#9ca3af' },
  textArea: {
    fontFamily: FONT, minHeight: 96, borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 6, backgroundColor: '#f8fafc', paddingHorizontal: 10,
    paddingVertical: 10, fontSize: 13, color: '#0f172a', marginTop: 4,
  },
  errText: { fontFamily: FONT, marginTop: 4, fontSize: 11, color: '#b91c1c' },

  // Toggle buttons — identical to ShiftChangeFormPopup
  toggleBtn: {
    height: 38, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', paddingVertical: 4,
  },
  toggleActive:     { borderColor: NAVY, backgroundColor: '#eef2ff' },
  toggleText:       { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: '#64748b' },
  toggleTextActive: { color: NAVY, fontWeight: '700' },

  // Error box — identical to ShiftChangeFormPopup
  errBox:      { marginTop: 12, backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12 },
  errBoxTitle: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: '#dc2626', marginBottom: 4 },
  errBoxItem:  { fontFamily: FONT, fontSize: 11, color: '#b91c1c', marginLeft: 6, marginBottom: 2 },

  // Note + button — identical to ShiftChangeFormPopup
  note:        { fontFamily: FONT, marginTop: 20, fontSize: 10, color: '#64748b', textAlign: 'center', lineHeight: 14, paddingHorizontal: 12 },
  btn:         { marginTop: 12, height: 44, borderRadius: 6, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnDisabled: { opacity: 0.7 },
  btnText:     { fontFamily: FONT, color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelLink:  { fontFamily: FONT, fontSize: 12, color: '#64748b' },

  // Success screen — identical to ShiftChangeFormPopup
  bgOrb:           { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#bbf7d0', top: '20%', alignSelf: 'center' },
  iconShell:       { width: 110, height: 110, borderRadius: 55, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: '#16a34a', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6, overflow: 'visible' },
  iconRipple:      { position: 'absolute', width: 152, height: 152, borderRadius: 76, backgroundColor: '#86efac' },
  successTitle:    { fontFamily: FONT, fontSize: 24, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 8 },
  successSub:      { fontFamily: FONT, fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20, paddingHorizontal: 22, marginBottom: 4 },
  successCard:     { width: '100%', marginTop: 24, borderRadius: 20, borderWidth: 1, borderColor: '#dbeafe', backgroundColor: '#fff', padding: 16, shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  successRefRow:   { flexDirection: 'row', alignItems: 'center', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  successRefIcon:  { width: 34, height: 34, borderRadius: 17, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  successRefLabel: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 },
  successRefValue: { fontFamily: FONT, marginTop: 2, fontSize: 14, fontWeight: '800', color: '#0f172a' },
  successGrid:     { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, rowGap: 14 },
  successGridItem: { width: '50%', paddingRight: 12 },
  successGridLabel:{ fontFamily: FONT, fontSize: 11, color: '#94a3b8', marginBottom: 4 },
  successGridValue:{ fontFamily: FONT, fontSize: 13, fontWeight: '700', color: '#0f172a' },

  // Section label + balance chips
  sectionLabel: { fontFamily: FONT, fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.6, marginBottom: 8 },
  balanceChip:      { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 72 },
  balanceChipValue: { fontSize: 15, fontWeight: '800', fontFamily: FONT },
  balanceChipCode:  { fontSize: 10, fontWeight: '700', marginTop: 1, fontFamily: FONT },
  balanceChipUnit:  { fontSize: 9, fontFamily: FONT },

  // Calendar card
  calCard:       { marginTop: 14, borderRadius: 20, backgroundColor: '#fff', shadowColor: '#0f172a', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3, overflow: 'hidden' },
  calMonthNav:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  calNavBtn:     { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  calMonthLabelWrap: { alignItems: 'center' },
  calMonthLabel: { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: '#0f172a' },
  calYearLabel:  { fontFamily: FONT, fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 1 },

  calDayHeaders:    { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#f8fafc' },
  calDayHeaderCell: { flex: 1, alignItems: 'center' },
  calDayHeaderText: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: '#94a3b8' },

  calGrid:           { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingVertical: 6 },
  calCell:           { width: `${100/7}%` as any, alignItems: 'center', paddingVertical: 3 },
  calDayBtn:         { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  calDayBtnSelected: { backgroundColor: NAVY, shadowColor: NAVY, shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  calDayBtnToday:    { backgroundColor: '#e0e7ff' },
  calDayNum:         { fontFamily: FONT, fontSize: 12, color: '#374151', fontWeight: '500' },
  calDayNumSelected: { color: '#fff', fontWeight: '800' },
  calDayDot:         { width: 4, height: 4, borderRadius: 2, marginTop: 1 },

  calLegend:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  calLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  calLegendDot:  { width: 10, height: 10, borderRadius: 5 },
  calLegendText: { fontFamily: FONT, fontSize: 10, color: '#64748b', fontWeight: '600' },

  // Selected dates summary card
  datesSummaryCard: {
    flexDirection: 'row', borderWidth: 1, borderColor: '#e0e7ff',
    borderRadius: 12, backgroundColor: '#f5f7ff', overflow: 'hidden', marginTop: 4,
  },
  datesSummaryItem:  { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 3 },
  datesSummaryLabel: { fontFamily: FONT, fontSize: 9, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.5, marginTop: 2 },
  datesSummaryValue: { fontFamily: FONT, fontSize: 12, fontWeight: '800', color: '#0f172a' },
  datesSummarySep:   { width: 1, backgroundColor: '#e0e7ff' },

  // Date chip tags (horizontal scroll)
  dateTag:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e0e7ff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  dateTagText: { fontFamily: FONT, fontSize: 11, color: NAVY, fontWeight: '600' },

  // Day count badge
  dayCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eef2ff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dayCountText:  { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: NAVY },

  // Individual date chips
  dateChip:          { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#c7d2fe', minWidth: 58, alignItems: 'center' },
  dateChipTop:       { width: '100%', backgroundColor: NAVY, alignItems: 'center', paddingVertical: 5 },
  dateChipWeekday:   { fontFamily: FONT, fontSize: 9, fontWeight: '800', color: '#a5b4fc', letterSpacing: 0.8 },
  dateChipBody:      { backgroundColor: '#f0f4ff', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, width: '100%' },
  dateChipDay:       { fontFamily: FONT, fontSize: 22, fontWeight: '900', color: NAVY, lineHeight: 24 },
  dateChipMonthYear: { fontFamily: FONT, fontSize: 9, fontWeight: '600', color: '#64748b', marginTop: 2, letterSpacing: 0.3 },

  // Range banner
  rangeBanner:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eef2ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 8, borderWidth: 1, borderColor: '#c7d2fe' },
  rangeBannerText: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: NAVY, flex: 1 },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },

  // Bottom sheet picker
  sheetBg:    { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  sheetHandle:{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHead:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sheetTitle: { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 10, height: 42 },
  optRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  optLabel:   { fontFamily: FONT, fontSize: 13, color: '#374151', flex: 1 },
  optCheck:   { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  optCodeBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 3, alignItems: 'center', justifyContent: 'center', minWidth: 36 },
  optCodeText:  { fontFamily: FONT, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },

  muted: { fontFamily: FONT, fontSize: 11, color: '#9ca3af' },
})

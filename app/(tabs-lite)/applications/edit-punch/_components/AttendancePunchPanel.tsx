import { Ionicons } from "@expo/vector-icons"
import { useEffect, useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useGetRequest } from "@/hooks/api/useGetRequest"
import { getAccessToken } from "@/hooks/auth/token-store"

const ATTENDANCE_SEARCH_URL = process.env.EXPO_PUBLIC_ATTENDANCE_SEARCH_URL ?? "muster/muster/search"

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const DAY_NAMES = ["Mo","Tu","We","Th","Fr","Sa","Su"]

const COLORS = {
  sheet: "#f8fafc", ink: "#0f172a", primary: "#1d4ed8",
  primaryStrong: "#1e40af", accent: "#2563eb", heroBg: "#dbeafe",
}

// ─── Types ─────────────────────────────────────────────────────────────────────
type AttendanceRow = Record<string, unknown>

export type PunchRow = {
  id: string; employeeID: string; inOut: string; typeOfMovement: string
  punchedTime: string; readerSerialNumber: string; processed: string
}

type AttendanceDetail = {
  workOrderNumber: string; shiftsAllocated: string; shiftCode: string; extraManShift: string
  attendanceID: string; hoursWorked: number; lateIn: number; earlyOut: number
  extraHoursPostShift: number; extraHoursPreShift: number; extraHours: number
  personalOut: number; officialOut: number; otHours: number; leaveCode: string
  firstIn: string; lastOut: string; inPunchCount: number; outPunchCount: number
}

type GridDay = { date: Date; isCurrentMonth: boolean; label: number }

// ─── Helpers ───────────────────────────────────────────────────────────────────
function decodeJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1]; if (!payload) return null
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
    const json = decodeURIComponent(atob(padded).split("").map(c => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join(""))
    return JSON.parse(json) as Record<string, unknown>
  } catch { return null }
}

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate() }
function getFirstDayOffset(year: number, month: number) { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1 }
function isSameCalendarDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }
function isFutureCalendarDay(date: Date, today: Date) { return date.getTime() > new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() }
function toLocalDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` }

function isRecord(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null }
function getFirstNonEmptyString(record: AttendanceRow, keys: string[]) {
  for (const key of keys) { const v = record[key]; if (typeof v === "string" && v.trim()) return v.trim(); if (typeof v === "number") return String(v) }
  return ""
}
function getValueByKnownKeys(record: AttendanceRow, keys: string[]) {
  for (const key of keys) { if (key in record) return record[key] }
  const m = new Map<string, unknown>()
  for (const [k, v] of Object.entries(record)) m.set(k.toLowerCase(), v)
  for (const key of keys) { const v = m.get(key.toLowerCase()); if (v !== undefined) return v }
  return undefined
}
function getNumericByKnownKeys(record: AttendanceRow, keys: string[]) {
  const v = getValueByKnownKeys(record, keys)
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim()) { const n = Number(v); return Number.isFinite(n) ? n : null }
  return null
}
function parseNumericValue(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim()) { const n = Number(v); return Number.isFinite(n) ? n : 0 }
  return 0
}
function formatMinutesToHHMM(min: number) {
  const s = Number.isFinite(min) ? Math.max(0, min) : 0
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
}
function getNumericField(record: AttendanceRow, key: string): number | null {
  const v = record[key]
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim()) { const n = Number(v); return Number.isFinite(n) ? n : null }
  return null
}
function getDateKeyFromValue(value: unknown) {
  const text = typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : ""; if (!text) return ""
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/); if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dmy = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`
  const p = new Date(text); if (isNaN(p.getTime())) return ""
  return toLocalDateKey(p)
}
function getAttendanceDateKey(record: AttendanceRow) {
  const key =
    getDateKeyFromValue(getValueByKnownKeys(record, ["date","Date"])) ||
    getDateKeyFromValue(getValueByKnownKeys(record, ["attendanceDate","attendance_date"])) ||
    getDateKeyFromValue(getValueByKnownKeys(record, ["attendanceOn","attendance_on"])) ||
    getDateKeyFromValue(getValueByKnownKeys(record, ["shiftDate","shift_date"])) ||
    getDateKeyFromValue(getValueByKnownKeys(record, ["createdAt","created_at"])) ||
    getDateKeyFromValue(getValueByKnownKeys(record, ["createdOn","created_on"]))
  if (key) return key
  const year = getNumericByKnownKeys(record, ["year","Year"])
  const month = getNumericByKnownKeys(record, ["month","Month"])
  const day = getNumericByKnownKeys(record, ["day","Day"]) ?? getNumericByKnownKeys(record, ["dateNo","date_no"]) ?? getNumericByKnownKeys(record, ["dayOfMonth","day_of_month"])
  if (!year || !month || !day) return ""
  const resolved = new Date(year, month - 1, day)
  return isNaN(resolved.getTime()) ? "" : toLocalDateKey(resolved)
}
function normalizeAttendanceRows(data: unknown): AttendanceRow[] {
  if (!Array.isArray(data)) return []
  return data.flatMap(item => {
    if (!isRecord(item)) return []
    const details = item.attendanceDetails
    if (!Array.isArray(details)) return [item]
    return details.filter(d => isRecord(d)).map(d => ({
      ...d,
      organizationCode: (d as any).organizationCode ?? item.organizationCode ?? "",
      tenantCode: (d as any).tenantCode ?? item.tenantCode ?? "",
      employeeID: (d as any).employeeID ?? item.employeeID ?? "",
      month: (d as any).month ?? item.month,
      year: (d as any).year ?? item.year,
    }))
  })
}
function buildAttendanceDetail(record: AttendanceRow): AttendanceDetail {
  const pd = isRecord(record.punchDetails) ? record.punchDetails : null
  const inP = Array.isArray(pd?.inPunches) ? pd!.inPunches : []
  const outP = Array.isArray(pd?.outPunches) ? pd!.outPunches : []
  const fallIn = inP.find((i: any) => isRecord(i) && typeof i.punchedTime === "string" && i.punchedTime.trim())
  const fallOut = [...outP].reverse().find((i: any) => isRecord(i) && typeof i.punchedTime === "string" && i.punchedTime.trim())
  return {
    workOrderNumber: getFirstNonEmptyString(record, ["workOrderNumber","workOrderNo","woNumber"]) || "-",
    shiftsAllocated: getFirstNonEmptyString(record, ["shiftsAllocated","shiftAllocated"]) || "-",
    shiftCode: getFirstNonEmptyString(record, ["shiftCode","shift"]) || "-",
    extraManShift: getFirstNonEmptyString(record, ["extraManShift"]) || "-",
    attendanceID: getFirstNonEmptyString(record, ["attendanceID","attendanceId","attendanceid","attendanceCode","attendanceStatus","status"]) || "-",
    hoursWorked: parseNumericValue(record.hoursWorked),
    lateIn: parseNumericValue(record.lateIn),
    earlyOut: parseNumericValue(record.earlyOut),
    extraHoursPostShift: parseNumericValue(record.extraHoursPostShift),
    extraHoursPreShift: parseNumericValue(record.extraHoursPreShift),
    extraHours: parseNumericValue(record.extraHours),
    personalOut: parseNumericValue(record.personalOut),
    officialOut: parseNumericValue(record.officialOut),
    otHours: parseNumericValue(record.otHours),
    leaveCode: getFirstNonEmptyString(record, ["leaveCode","leave_code","leave","leaveId"]) || "-",
    firstIn: getFirstNonEmptyString(record, ["firstIn"]) || (isRecord(fallIn) ? getFirstNonEmptyString(fallIn, ["punchedTime"]) : ""),
    lastOut: getFirstNonEmptyString(record, ["lastOut"]) || (isRecord(fallOut) ? getFirstNonEmptyString(fallOut, ["punchedTime"]) : ""),
    inPunchCount: inP.length, outPunchCount: outP.length,
  }
}
function extractPunchRows(record: AttendanceRow): PunchRow[] {
  const pd = isRecord(record.punchDetails) ? record.punchDetails : null
  const buckets = [
    ...(Array.isArray(pd?.inPunches) ? pd!.inPunches : []),
    ...(Array.isArray(pd?.outPunches) ? pd!.outPunches : []),
    ...(Array.isArray(pd?.defaultPunches) ? pd!.defaultPunches : []),
  ]
  return buckets.filter(i => isRecord(i)).map((item: any, idx) => ({
    id: getFirstNonEmptyString(item, ["_id","id"]) || `${item.punchedTime || "row"}-${idx}`,
    employeeID: getFirstNonEmptyString(item, ["employeeID"]) || getFirstNonEmptyString(record, ["employeeID"]) || "-",
    inOut: getFirstNonEmptyString(item, ["inOut"]) || "-",
    typeOfMovement: getFirstNonEmptyString(item, ["typeOfMovement"]) || "-",
    punchedTime: getFirstNonEmptyString(item, ["punchedTime","transactionTime","date"]) || "",
    readerSerialNumber: getFirstNonEmptyString(item, ["readerSerialNumber"]) || "-",
    processed: typeof item.processed === "boolean" ? (item.processed ? "Processed" : "Pending") : "Processed",
  })).sort((a, b) => (a.punchedTime ? new Date(a.punchedTime).getTime() : 0) - (b.punchedTime ? new Date(b.punchedTime).getTime() : 0))
}
function formatPunchDateTime(value: string) {
  if (!value?.trim()) return "--"
  try { const dt = new Date(value); if (isNaN(dt.getTime())) return value; return dt.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) } catch { return value }
}
function getPunchTypeLabel(inOut: string) {
  const v = inOut.trim().toUpperCase(); if (v === "I") return "In"; if (v === "O") return "Out"; return inOut || "-"
}
function getAttendanceRowForDay(date: Date, rows: AttendanceRow[]) {
  const key = toLocalDateKey(date); return rows.find(r => getAttendanceDateKey(r) === key) ?? null
}
function hasAttendanceForDay(date: Date, rows: AttendanceRow[]) {
  const key = toLocalDateKey(date); return rows.some(r => getAttendanceDateKey(r) === key)
}
function getDayCardColor(detail: AttendanceDetail | null, hasData: boolean) {
  if (!hasData || !detail) return "#e5e7eb"
  const lc = (detail.leaveCode || "").trim().toUpperCase()
  const aid = (detail.attendanceID || "").trim().toUpperCase()
  if (lc && lc !== "00" && lc !== "0" && lc !== "-") {
    if (lc === "AL" || lc === "AL001") return "#dbeafe"; if (lc === "SL" || lc === "SL001") return "#cffafe"
    if (lc === "CL" || lc === "CL001") return "#faf5ff"; if (lc === "PL" || lc === "PL001") return "#fce7f3"
    if (lc === "EL") return "#fef2f2"; if (lc === "ML" || lc === "ML001") return "#ede9fe"
    if (lc === "LWP") return "#ffedd5"; if (lc === "HL") return "#e0e7ff"
    if (lc === "VL") return "#ccfbf1"; if (lc === "FL") return "#fef3c7"
    return "#eff6ff"
  }
  if (aid === "AA") return "#fee2e2"; if (aid === "HH") return "#fef3c7"
  if (aid === "PP") return "#dbeafe"; if (aid === "WW") return "#f3f4f6"
  return "#eff6ff"
}
function buildMonthGrid(anchor: Date): GridDay[] {
  const year = anchor.getFullYear(), month = anchor.getMonth()
  const startOffset = getFirstDayOffset(year, month), daysThisMonth = getDaysInMonth(year, month)
  const cells: GridDay[] = []
  const lastDayPrev = new Date(year, month, 0).getDate()
  for (let i = 0; i < startOffset; i++) { const d = lastDayPrev - startOffset + i + 1; cells.push({ date: new Date(year, month - 1, d), isCurrentMonth: false, label: d }) }
  for (let d = 1; d <= daysThisMonth; d++) cells.push({ date: new Date(year, month, d), isCurrentMonth: true, label: d })
  const rem = cells.length % 7, pad = rem === 0 ? 0 : 7 - rem
  for (let i = 1; i <= pad; i++) cells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false, label: i })
  return cells
}

// ─── Component ─────────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void
  onEditPunch: (punch: PunchRow, attendanceDate: string, month: number, year: number) => void
}

export default function AttendancePunchPanel({ onClose, onEditPunch }: Props) {
  const today = useMemo(() => new Date(), [])
  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()))
  const [employeeId, setEmployeeId] = useState("")
  const [tenantCode, setTenantCode] = useState("")
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([])

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken(); if (!token) return
      const p = decodeJwtPayload(token); if (!p) return
      setEmployeeId(String(p.employeeID ?? p.employeeId ?? p.empId ?? process.env.EXPO_PUBLIC_EMPLOYEE_ID ?? "") || "")
      setTenantCode(String(p.tenantCode ?? p.tenant ?? p.org ?? process.env.EXPO_PUBLIC_TENANT_CODE ?? "") || "")
    }
    void run()
  }, [])

  const selectedMonthNumber = currentDate.getMonth() + 1

  useGetRequest<any[]>({
    url: ATTENDANCE_SEARCH_URL, method: "POST",
    data: [
      { field: "employeeID", value: employeeId, operator: "eq" },
      { field: "tenantCode", value: tenantCode, operator: "eq" },
      { field: "month", value: selectedMonthNumber, operator: "eq" },
    ],
    enabled: Boolean(employeeId && tenantCode),
    dependencies: [employeeId, tenantCode, selectedMonthNumber],
    onSuccess: (data) => setAttendanceRows(normalizeAttendanceRows(data)),
    onError: () => setAttendanceRows([]),
  })

  const gridDays = useMemo(() => buildMonthGrid(currentDate), [currentDate])
  const monthTitle = `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`

  const selectedAttendanceRecord = useMemo(() => {
    if (!selectedDate) return null
    const selectedKey = toLocalDateKey(selectedDate)
    const exact = attendanceRows.find(r => getAttendanceDateKey(r) === selectedKey)
    if (exact) return exact
    const selMonth = selectedDate.getMonth() + 1, selYear = selectedDate.getFullYear(), selDay = selectedDate.getDate()
    const scoped = attendanceRows.filter(r => getNumericField(r, "month") === selMonth && getNumericField(r, "year") === selYear)
    return scoped.find(r => { const dt = typeof r.date === "string" ? r.date : ""; return dt.length >= 10 && Number(dt.slice(8, 10)) === selDay }) ?? null
  }, [selectedDate, attendanceRows])

  const attendanceDetail = useMemo(() => selectedAttendanceRecord ? buildAttendanceDetail(selectedAttendanceRecord) : null, [selectedAttendanceRecord])
  const punchRows = useMemo(() => selectedAttendanceRecord ? extractPunchRows(selectedAttendanceRecord) : [], [selectedAttendanceRecord])

  const detailColumnOne = attendanceDetail ? [
    { label: "Work Order Number", value: attendanceDetail.workOrderNumber },
    { label: "Shifts Allocated", value: attendanceDetail.shiftsAllocated },
    { label: "Shift Code", value: attendanceDetail.shiftCode },
    { label: "Attendance ID", value: attendanceDetail.attendanceID },
    { label: "Hours Worked", value: formatMinutesToHHMM(attendanceDetail.hoursWorked) },
    { label: "Late In", value: formatMinutesToHHMM(attendanceDetail.lateIn) },
    { label: "Early Out", value: formatMinutesToHHMM(attendanceDetail.earlyOut) },
  ] : []
  const detailColumnTwo = attendanceDetail ? [
    { label: "Extra Hours", value: formatMinutesToHHMM(attendanceDetail.extraHours) },
    { label: "Post Shift", value: formatMinutesToHHMM(attendanceDetail.extraHoursPostShift) },
    { label: "Pre Shift", value: formatMinutesToHHMM(attendanceDetail.extraHoursPreShift) },
    { label: "Personal Out", value: formatMinutesToHHMM(attendanceDetail.personalOut) },
    { label: "Official Out", value: formatMinutesToHHMM(attendanceDetail.officialOut) },
    { label: "OT Hours", value: formatMinutesToHHMM(attendanceDetail.otHours) },
    { label: "Leave Code", value: attendanceDetail.leaveCode || "-" },
  ] : []

  const navigateMonth = (dir: "prev" | "next") => {
    setSelectedDate(null)
    setCurrentDate(prev => { const n = new Date(prev); n.setMonth(prev.getMonth() + (dir === "next" ? 1 : -1)); return n })
  }

  const handleEditPunch = (punch: PunchRow) => {
    if (!selectedDate) return
    const dateKey = toLocalDateKey(selectedDate)
    onEditPunch(punch, dateKey, selectedDate.getMonth() + 1, selectedDate.getFullYear())
  }

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.top}>
        <View style={s.topRow}>
          <View style={s.leftGroup}>
            <Pressable onPress={onClose} hitSlop={8} style={s.backButton}>
              <Ionicons name="arrow-back" size={18} color="#0f172a" />
            </Pressable>
            <Text style={s.greeting}>Select Punch to Edit</Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
          Select a date, then tap the edit icon on a punch record
        </Text>
      </View>

      <ScrollView style={s.sheet} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Calendar */}
        <View style={s.calendarCard}>
          <View style={s.calHeader}>
            <Pressable hitSlop={12} style={s.calNavHit} onPress={() => navigateMonth("prev")}>
              <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
            </Pressable>
            <Pressable onPress={() => { setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(new Date(today.getFullYear(), today.getMonth(), today.getDate())) }} style={s.monthTitleHit}>
              <Text style={s.monthTitle}>{monthTitle}</Text>
            </Pressable>
            <Pressable hitSlop={12} style={s.calNavHit} onPress={() => navigateMonth("next")}>
              <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
            </Pressable>
          </View>

          <View style={s.weekdayRow}>
            {DAY_NAMES.map(n => <Text key={n} style={s.weekdayCell}>{n}</Text>)}
          </View>

          <View style={s.grid}>
            {gridDays.map((cell, index) => {
              const isToday = isSameCalendarDay(cell.date, today)
              const isFuture = isFutureCalendarDay(cell.date, today)
              const isSelected = selectedDate ? isSameCalendarDay(cell.date, selectedDate) : false
              const dayRow = cell.isCurrentMonth ? getAttendanceRowForDay(cell.date, attendanceRows) : null
              const dayDetail = dayRow ? buildAttendanceDetail(dayRow) : null
              const bgColor = cell.isCurrentMonth ? getDayCardColor(dayDetail, Boolean(dayRow)) : null
              const cellKey = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}-${index}`
              return (
                <Pressable key={cellKey} style={s.gridCell} disabled={isFuture}
                  onPress={() => { setSelectedDate(cell.date); if (!cell.isCurrentMonth) setCurrentDate(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1)) }}>
                  <View style={[s.dayInner, !isSelected && cell.isCurrentMonth && bgColor ? { backgroundColor: bgColor } : null, isFuture && s.futureDayBlock, isToday && !isSelected && s.todayRing, isSelected && s.selectedBlock]}>
                    <Text style={[s.dayText, isFuture && s.dayFuture, !cell.isCurrentMonth && s.dayMuted, isSelected && s.dayTextSelected, !isSelected && cell.isCurrentMonth && hasAttendanceForDay(cell.date, attendanceRows) && s.dayActivity, !isSelected && cell.isCurrentMonth && !hasAttendanceForDay(cell.date, attendanceRows) && s.dayPlain]}>
                      {cell.label}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Day details */}
        {selectedDate ? (
          attendanceDetail ? (
            <View style={{ gap: 10 }}>
              {/* Info cards */}
              {[{ title: "Attendance Core", rows: detailColumnOne }, { title: "Hours Information", rows: detailColumnTwo }].map(({ title, rows }) => (
                <View key={title} style={s.infoCard}>
                  <Text style={s.infoCardTitle}>{title}</Text>
                  {rows.map(item => (
                    <View key={item.label} style={s.infoRow}>
                      <Text style={s.infoLabel}>{item.label}</Text>
                      <Text style={s.infoValue}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              ))}

              {/* Punch details with edit buttons */}
              <View style={s.infoCard}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Text style={s.infoCardTitle}>Punch Details</Text>
                  <Text style={{ fontSize: 12, color: "#64748b" }}>{punchRows.length} Records</Text>
                </View>
                {punchRows.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    {punchRows.map((row, idx) => (
                      <View key={row.id} style={s.punchCard}>
                        {/* Card header: index badge + type badge + edit button */}
                        <View style={s.punchCardHeader}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <View style={s.punchIndexBadge}>
                              <Text style={s.punchIndexText}>#{idx + 1}</Text>
                            </View>
                            <View style={[s.punchTypeBadge, row.inOut.toUpperCase() === "I" ? s.inBadge : s.outBadge]}>
                              <Text style={[s.punchTypeBadgeText, row.inOut.toUpperCase() === "I" ? s.inText : s.outText]}>
                                {getPunchTypeLabel(row.inOut)}
                              </Text>
                            </View>
                            <View style={[s.statusBadge, row.processed === "Processed" ? s.processedBadge : s.pendingBadge]}>
                              <Text style={[s.statusBadgeText, row.processed === "Processed" ? s.processedText : s.pendingText]}>
                                {row.processed}
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity onPress={() => handleEditPunch(row)} style={s.editBtn} hitSlop={6}>
                            <Ionicons name="create-outline" size={16} color="#2563eb" />
                          </TouchableOpacity>
                        </View>
                        {/* Card body: punch details */}
                        <View style={s.punchCardBody}>
                          <View style={s.punchDetailRow}>
                            <Text style={s.punchDetailLabel}>Punch Time</Text>
                            <Text style={[s.punchDetailValue, { color: COLORS.primaryStrong, fontWeight: "700" }]}>
                              {formatPunchDateTime(row.punchedTime) || "--"}
                            </Text>
                          </View>
                          <View style={s.punchDetailRow}>
                            <Text style={s.punchDetailLabel}>Employee ID</Text>
                            <Text style={s.punchDetailValue}>{row.employeeID}</Text>
                          </View>
                          <View style={s.punchDetailRow}>
                            <Text style={s.punchDetailLabel}>Movement</Text>
                            <Text style={s.punchDetailValue}>{row.typeOfMovement || "-"}</Text>
                          </View>
                          <View style={[s.punchDetailRow, { borderBottomWidth: 0 }]}>
                            <Text style={s.punchDetailLabel}>Reader Serial</Text>
                            <Text style={s.punchDetailValue}>{row.readerSerialNumber || "-"}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ fontSize: 13, color: "#64748b", textAlign: "center", paddingVertical: 12 }}>
                    No punch records for this date.
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 32, gap: 8 }}>
              <Ionicons name="calendar-outline" size={36} color="#cbd5e1" />
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#334155" }}>No Attendance Data</Text>
              <Text style={{ fontSize: 13, color: "#64748b" }}>No records found for this date.</Text>
            </View>
          )
        ) : (
          <Text style={{ fontSize: 13, color: "#64748b" }}>Tap a date to view punch details below.</Text>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.sheet },
  top: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: COLORS.sheet },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  leftGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  backButton: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#e2e8f0" },
  greeting: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  sheet: { flex: 1, backgroundColor: COLORS.sheet },
  content: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 96, gap: 12 },
  calendarCard: { backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  calHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  calNavHit: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  monthTitleHit: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  monthTitle: { fontSize: 17, fontWeight: "700", color: COLORS.primaryStrong, letterSpacing: 0.2 },
  weekdayRow: { flexDirection: "row", marginBottom: 8, marginTop: 4, backgroundColor: "#f1f5f9", borderRadius: 10, paddingVertical: 6 },
  weekdayCell: { width: "14.285%", textAlign: "center", fontSize: 12, fontWeight: "700", color: COLORS.ink, paddingVertical: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridCell: { width: "14.285%", aspectRatio: 1, maxHeight: 48, alignItems: "center", justifyContent: "center", paddingVertical: 2 },
  dayInner: { minWidth: 34, minHeight: 34, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  todayRing: { borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.heroBg },
  selectedBlock: { backgroundColor: COLORS.primary },
  futureDayBlock: { backgroundColor: "#f8fafc", opacity: 0.9 },
  dayText: { fontSize: 14, fontWeight: "600" },
  dayMuted: { color: "#cbd5e1", fontWeight: "500" },
  dayFuture: { color: "#cbd5e1", fontWeight: "500" },
  dayPlain: { color: COLORS.ink },
  dayActivity: { color: COLORS.accent, fontWeight: "700" },
  dayTextSelected: { color: "#fff", fontWeight: "700" },
  infoCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0", padding: 12 },
  infoCardTitle: { fontSize: 10, fontWeight: "700", color: "#94a3b8", letterSpacing: 0.8, marginBottom: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderBottomWidth: 1, borderBottomColor: "#eef2f7", paddingVertical: 7 },
  infoLabel: { fontSize: 12, color: "#64748b" },
  infoValue: { fontSize: 13, color: "#0f172a", fontWeight: "600", flexShrink: 1, textAlign: "right" },
  inText: { color: "#0f766e", fontWeight: "700" },
  outText: { color: "#1d4ed8", fontWeight: "700" },
  editBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#bfdbfe" },
  punchCard: { backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden" },
  punchCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  punchIndexBadge: { width: 24, height: 24, borderRadius: 6, backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center" },
  punchIndexText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  punchTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  inBadge: { backgroundColor: "#ccfbf1" },
  outBadge: { backgroundColor: "#dbeafe" },
  punchTypeBadgeText: { fontSize: 12, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  processedBadge: { backgroundColor: "#dcfce7" },
  pendingBadge: { backgroundColor: "#fef9c3" },
  statusBadgeText: { fontSize: 11, fontWeight: "600" },
  processedText: { color: "#16a34a" },
  pendingText: { color: "#ca8a04" },
  punchCardBody: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 4 },
  punchDetailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#eef2f7" },
  punchDetailLabel: { fontSize: 12, color: "#64748b" },
  punchDetailValue: { fontSize: 12, color: "#0f172a", fontWeight: "600", flexShrink: 1, textAlign: "right" },
})

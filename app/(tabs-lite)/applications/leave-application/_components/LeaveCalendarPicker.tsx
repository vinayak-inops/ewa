import { Ionicons } from '@expo/vector-icons'
import React, { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const FONT = 'Inter'
const NAVY = '#13206b'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES   = ['Su','Mo','Tu','We','Th','Fr','Sa']

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDayOffset(y: number, m: number) { return new Date(y, m, 1).getDay() }
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function isPast(d: Date) { const t = new Date(); t.setHours(0, 0, 0, 0); return d < t }
function toyyyymmdd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function toddmmyyyy(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

interface Props {
  today: Date
  currentDate: Date
  selectedDates: Date[]
  onNavigate: (dir: 'prev' | 'next') => void
  onTodayReset: () => void
  onToggleDate: (d: Date) => void
  onClearAll: () => void
  isBlocked: (d: Date) => boolean
}

export default function LeaveCalendarPicker({
  today,
  currentDate,
  selectedDates,
  onNavigate,
  onTodayReset,
  onToggleDate,
  onClearAll,
  isBlocked,
}: Props) {
  const gridDays = useMemo(() => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth()
    const offset = getFirstDayOffset(y, m)
    const days = getDaysInMonth(y, m)
    const cells: (Date | null)[] = []
    for (let i = 0; i < offset; i++) cells.push(null)
    for (let d = 1; d <= days; d++) cells.push(new Date(y, m, d))
    return cells
  }, [currentDate])

  return (
    <>
      {/* Calendar card */}
      <View style={s.calCard}>

        {/* Header */}
        <View style={s.calHeader}>
          <TouchableOpacity onPress={() => onNavigate('prev')} style={s.calNavBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onTodayReset}>
            <Text style={s.calMonthTitle}>
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onNavigate('next')} style={s.calNavBtn} hitSlop={10}>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{ padding: 14 }}>
          {/* Day name headers */}
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            {DAY_NAMES.map(d => (
              <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={s.dayHead}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Date grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {gridDays.map((cell, idx) => {
              if (!cell) return <View key={`e-${idx}`} style={s.cell} />
              const selected = selectedDates.some(sd => isSameDay(sd, cell))
              const isToday  = isSameDay(cell, today)
              const blocked  = isBlocked(cell)
              const past     = isPast(cell)
              const disabled = past || blocked

              return (
                <View key={idx} style={s.cell}>
                  <TouchableOpacity
                    onPress={() => onToggleDate(cell)}
                    disabled={disabled}
                    activeOpacity={disabled ? 1 : 0.7}
                    style={[
                      s.dayCell,
                      selected  && s.daySel,
                      isToday && !selected && s.dayToday,
                      blocked   && { backgroundColor: '#fee2e2' },
                      disabled  && { opacity: 0.3 },
                    ]}
                  >
                    <Text style={[
                      s.dayNum,
                      selected && { color: '#fff', fontWeight: '700' },
                      isToday && !selected && { color: NAVY },
                      blocked && { color: '#dc2626' },
                    ]}>
                      {cell.getDate()}
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            })}
          </View>

          {/* Legend */}
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
            {[
              { color: NAVY,      label: 'Selected' },
              { color: '#dc2626', label: 'Applied'  },
              { color: '#d1d5db', label: 'Past'     },
            ].map(l => (
              <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: l.color }} />
                <Text style={s.muted}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Selected date chips */}
      {selectedDates.length > 0 && (
        <View style={[s.card, { marginTop: 12 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={s.sectionLabel}>
              SELECTED — {selectedDates.length} DAY{selectedDates.length !== 1 ? 'S' : ''}
            </Text>
            <TouchableOpacity onPress={onClearAll}>
              <Text style={{ fontFamily: FONT, fontSize: 12, color: '#64748b', fontWeight: '600' }}>Clear all</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {[...selectedDates]
              .sort((a, b) => a.getTime() - b.getTime())
              .map((d, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => onToggleDate(d)}
                  style={s.selectedChip}
                >
                  <Text style={s.selectedChipText}>{toddmmyyyy(d)}</Text>
                  <Ionicons name="close" size={10} color="#475569" />
                </TouchableOpacity>
              ))}
          </View>
        </View>
      )}
    </>
  )
}

const s = StyleSheet.create({
  calCard:      { marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', overflow: 'hidden' },
  calHeader:    { backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calNavBtn:    { width: 30, height: 30, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  calMonthTitle:{ fontFamily: FONT, color: '#fff', fontSize: 15, fontWeight: '700' },
  dayHead:      { fontFamily: FONT, fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  cell:         { width: `${100/7}%`, alignItems: 'center', paddingVertical: 2 },
  dayCell:      { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  daySel:       { backgroundColor: NAVY },
  dayToday:     { backgroundColor: '#e0e7ff' },
  dayNum:       { fontFamily: FONT, fontSize: 11, color: '#374151' },
  selectedChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: '#e2e8f0' },
  selectedChipText: { fontFamily: FONT, fontSize: 11, color: '#475569', fontWeight: '600' },
  card:         { marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', padding: 14 },
  sectionLabel: { fontFamily: FONT, fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.6, marginBottom: 8 },
  muted:        { fontFamily: FONT, fontSize: 11, color: '#9ca3af' },
})

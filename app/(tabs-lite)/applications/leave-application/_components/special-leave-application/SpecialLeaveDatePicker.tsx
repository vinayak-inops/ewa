import { ChevronDown, X } from 'lucide-react-native'
import React, { useMemo, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const FONT = 'Inter'
const NAVY = '#13206b'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface Props {
  visible: boolean
  onClose: () => void
  onSelect: (iso: string) => void
  minDate?: string
  title: string
  selected: string
}

export default function SpecialLeaveDatePicker({ visible, onClose, onSelect, minDate, title, selected }: Props) {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const minObj = useMemo(() => {
    const d = minDate ? new Date(minDate) : new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [minDate])

  const days = useMemo(() => {
    const count = new Date(year, month + 1, 0).getDate()
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Array.from({ length: count }, (_, i) => {
      const d    = i + 1
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
        <Pressable onPress={e => e.stopPropagation()} style={s.card}>

          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={s.closeBtn}><X size={13} color="#fff" /></View>
            </TouchableOpacity>
          </View>

          <View style={{ padding: 14 }}>
            {/* Month / year nav */}
            <View style={s.nav}>
              <TouchableOpacity onPress={prev} style={s.navBtn}>
                <ChevronDown size={14} color="#374151" style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
              <Text style={s.monthLabel}>{MONTHS[month]} {year}</Text>
              <TouchableOpacity onPress={next} style={s.navBtn}>
                <ChevronDown size={14} color="#374151" style={{ transform: [{ rotate: '-90deg' }] }} />
              </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={s.dayHead}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Date grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {blanks.map((_, i) => <View key={`b${i}`} style={{ width: `${100/7}%` }} />)}
              {days.map(({ d, disabled, isToday }) => {
                const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                const sel = iso === selected
                return (
                  <View key={d} style={{ width: `${100/7}%`, alignItems: 'center', paddingVertical: 2 }}>
                    <TouchableOpacity
                      disabled={disabled}
                      onPress={() => { onSelect(iso); onClose() }}
                      style={[s.dayCell, sel && s.daySel, isToday && !sel && s.dayToday, disabled && { opacity: 0.25 }]}
                    >
                      <Text style={[s.dayNum, sel && { color: '#fff', fontWeight: '700' }, isToday && !sel && { color: NAVY }]}>
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

const s = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card:       { backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 340, overflow: 'hidden' },
  header:     { backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle:{ fontFamily: FONT, color: '#fff', fontWeight: '700', fontSize: 13 },
  closeBtn:   { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  nav:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthLabel: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: '#0f172a' },
  navBtn:     { width: 30, height: 30, borderRadius: 6, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  dayHead:    { fontFamily: FONT, fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  dayCell:    { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  daySel:     { backgroundColor: NAVY },
  dayToday:   { backgroundColor: '#e0e7ff' },
  dayNum:     { fontFamily: FONT, fontSize: 11, color: '#374151' },
})

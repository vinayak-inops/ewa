import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const F = 'Inter';

const C = {
  ink: '#0f172a',
  muted: '#64748b',
  primary: '#7c3aed',
  primaryStrong: '#6d28d9',
  heroBg: '#ede9fe',
  white: '#ffffff',
  border: '#e2e8f0',
  error: '#dc2626',
  errorBg: '#fef2f2',
  surface: '#f8fafc',
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BasicInformationProps {
  extension: string;
  fromDate: string;
  toDate: string;
  period: string;
  reportTitle: string;
  reportDescription: string;
  onExtensionChange: (value: string) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onPeriodChange: (value: string) => void;
  onReportTitleChange: (value: string) => void;
  onReportDescriptionChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  'This Week', 'Last Week', 'This Month', 'Last Month',
  'This Quarter', 'Last Quarter', 'This Year', 'Last Year', 'Custom',
];

const EXTENSION_OPTIONS = [
  { value: 'excel', label: 'Excel (.xlsx)' },
  { value: 'pdf', label: 'PDF (.pdf)' },
];

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayLocal() {
  return fmtLocal(new Date());
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

function parseYMD(str: string) {
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: +m[1], mo: +m[2] - 1, d: +m[3] };
}

function fmtDisplay(str: string) {
  const p = parseYMD(str);
  if (!p) return str;
  return `${MONTH_SHORT[p.mo]} ${String(p.d).padStart(2, '0')}, ${p.y}`;
}

// ── DropdownModal ─────────────────────────────────────────────────────────────

type DropdownProps = {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
};

function DropdownModal({ visible, title, options, selected, onSelect, onClose }: DropdownProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{title}</Text>
          <Pressable hitSlop={10} onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={20} color={C.ink} />
          </Pressable>
        </View>
        <FlatList
          data={options}
          keyExtractor={(i) => i.value}
          renderItem={({ item }) => {
            const active = item.value === selected;
            return (
              <Pressable
                style={[s.optionRow, active && s.optionRowActive]}
                onPress={() => { onSelect(item.value); onClose(); }}>
                <Text style={[s.optionText, active && s.optionTextActive]}>{item.label}</Text>
                {active && <Ionicons name="checkmark" size={16} color={C.primary} />}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

// ── DatePickerModal ───────────────────────────────────────────────────────────

type DatePickerProps = {
  visible: boolean;
  title: string;
  value: string;
  onConfirm: (date: string) => void;
  onClose: () => void;
};

function DatePickerModal({ visible, title, value, onConfirm, onClose }: DatePickerProps) {
  const now = new Date();
  const init = parseYMD(value) ?? { y: now.getFullYear(), mo: now.getMonth(), d: now.getDate() };
  const [y, setY] = useState(init.y);
  const [mo, setMo] = useState(init.mo);
  const [d, setD] = useState(init.d);

  const maxD = daysInMonth(y, mo);
  const safeD = Math.min(d, maxD);

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);
  const days = Array.from({ length: maxD }, (_, i) => i + 1);

  const confirm = () => {
    onConfirm(`${y}-${String(mo + 1).padStart(2, '0')}-${String(safeD).padStart(2, '0')}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{title}</Text>
          <Pressable hitSlop={10} onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={20} color={C.ink} />
          </Pressable>
        </View>
        <View style={s.pickerRow}>
          {/* Month */}
          <View style={s.pickerCol}>
            <Text style={s.pickerColLabel}>Month</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={s.pickerScroll}>
              {MONTH_SHORT.map((name, idx) => (
                <Pressable key={idx} style={[s.pickerItem, idx === mo && s.pickerItemOn]} onPress={() => setMo(idx)}>
                  <Text style={[s.pickerItemTxt, idx === mo && s.pickerItemTxtOn]}>{name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          {/* Day */}
          <View style={s.pickerCol}>
            <Text style={s.pickerColLabel}>Day</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={s.pickerScroll}>
              {days.map((day) => (
                <Pressable key={day} style={[s.pickerItem, day === safeD && s.pickerItemOn]} onPress={() => setD(day)}>
                  <Text style={[s.pickerItemTxt, day === safeD && s.pickerItemTxtOn]}>
                    {String(day).padStart(2, '0')}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          {/* Year */}
          <View style={s.pickerCol}>
            <Text style={s.pickerColLabel}>Year</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={s.pickerScroll}>
              {years.map((year) => (
                <Pressable key={year} style={[s.pickerItem, year === y && s.pickerItemOn]} onPress={() => setY(year)}>
                  <Text style={[s.pickerItemTxt, year === y && s.pickerItemTxtOn]}>{year}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
        <Pressable style={s.confirmBtn} onPress={confirm}>
          <Text style={s.confirmBtnTxt}>Confirm</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

// ── Error / Hint helpers ──────────────────────────────────────────────────────

function Err({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <View style={s.errRow}>
      <Ionicons name="alert-circle-outline" size={12} color={C.error} />
      <Text style={s.errTxt}>{msg}</Text>
    </View>
  );
}

function Hint({ msg }: { msg: string }) {
  return <Text style={s.hintTxt}>{msg}</Text>;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function BasicInformation({
  extension, fromDate, toDate, period,
  reportTitle, reportDescription,
  onExtensionChange, onFromDateChange, onToDateChange,
  onPeriodChange, onReportTitleChange, onReportDescriptionChange,
  onSubmit, isSubmitting = false,
}: BasicInformationProps) {

  const [errors, setErrors] = useState({
    extension: '', fromDate: '', toDate: '', dateRange: '',
    period: '', reportTitle: '', reportDescription: '',
  });

  const [showPeriod, setShowPeriod] = useState(false);
  const [showExt, setShowExt] = useState(false);
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  // ── Period auto-fill ──────────────────────────────────────────────────────

  const handlePeriodChange = (value: string) => {
    onPeriodChange(value);
    setErrors((e) => ({ ...e, period: '' }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const set = (from: Date, to: Date) => {
      onFromDateChange(fmtLocal(from));
      onToDateChange(fmtLocal(to));
    };

    switch (value) {
      case 'This Week': {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        set(start, today); break;
      }
      case 'Last Week': {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay() - 7);
        const end = new Date(start); end.setDate(start.getDate() + 6);
        set(start, end); break;
      }
      case 'This Month':
        set(new Date(today.getFullYear(), today.getMonth(), 1), today); break;
      case 'Last Month':
        set(
          new Date(today.getFullYear(), today.getMonth() - 1, 1),
          new Date(today.getFullYear(), today.getMonth(), 0)
        ); break;
      case 'This Quarter': {
        const q = Math.floor(today.getMonth() / 3);
        set(new Date(today.getFullYear(), q * 3, 1), today); break;
      }
      case 'Last Quarter': {
        const cq = Math.floor(today.getMonth() / 3);
        const lq = cq === 0 ? 3 : cq - 1;
        const lqY = cq === 0 ? today.getFullYear() - 1 : today.getFullYear();
        set(new Date(lqY, lq * 3, 1), new Date(lqY, (lq + 1) * 3, 0)); break;
      }
      case 'This Year':
        set(new Date(today.getFullYear(), 0, 1), today); break;
      case 'Last Year':
        set(new Date(today.getFullYear() - 1, 0, 1), new Date(today.getFullYear() - 1, 11, 31)); break;
      case 'Custom': break;
    }
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = () => {
    const td = todayLocal();
    const e = { extension: '', fromDate: '', toDate: '', dateRange: '', period: '', reportTitle: '', reportDescription: '' };
    let ok = true;

    if (!extension)          { e.extension = 'File extension is required'; ok = false; }
    if (!fromDate)           { e.fromDate  = 'From date is required'; ok = false; }
    if (!toDate)             { e.toDate    = 'To date is required'; ok = false; }
    if (!period)             { e.period    = 'Period is required'; ok = false; }
    if (!reportTitle.trim()) { e.reportTitle = 'Report title is required'; ok = false; }

    if (fromDate && fromDate > td)  { e.fromDate = 'From date cannot be in the future'; ok = false; }
    if (toDate && toDate > td)      { e.toDate   = 'To date cannot be in the future'; ok = false; }
    if (fromDate && toDate && fromDate > toDate) { e.dateRange = 'From date cannot be later than to date'; ok = false; }

    setErrors(e);
    return ok;
  };

  const isValid = () => {
    const td = todayLocal();
    return Boolean(
      extension && fromDate && toDate && period && reportTitle.trim() &&
      fromDate <= td && toDate <= td && fromDate <= toDate
    );
  };

  const handleSubmit = () => {
    if (validate()) onSubmit();
  };

  const extLabel = EXTENSION_OPTIONS.find((o) => o.value === extension)?.label ?? '';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Section header ── */}
        <View style={s.sectionCard}>
          <View style={s.cardHeader}>
            <View style={s.cardHeaderIcon}>
              <Ionicons name="document-text-outline" size={16} color={C.muted} />
            </View>
            <View>
              <Text style={s.cardHeaderTitle}>Report Information</Text>
              <Text style={s.cardHeaderSub}>Complete details including date range, format, and description</Text>
            </View>
          </View>

          {/* ── 1. Date Range ── */}
          <View style={s.subSection}>
            <Text style={s.subTitle}>Date Range</Text>
            <Text style={s.subSub}>Select the time period for report generation</Text>

            {/* Period */}
            <View style={s.field}>
              <Text style={s.label}>PERIOD <Text style={s.req}>*</Text></Text>
              <Pressable style={[s.trigger, errors.period ? s.triggerErr : null]} onPress={() => setShowPeriod(true)}>
                <Text style={period ? s.triggerVal : s.triggerPh}>{period || 'Select period'}</Text>
                <Ionicons name="chevron-down" size={16} color={C.muted} />
              </Pressable>
              {errors.period ? <Err msg={errors.period} /> : <Hint msg="(Required)" />}
            </View>

            {/* From / To row */}
            <View style={s.row}>
              <View style={s.half}>
                <Text style={s.label}>FROM DATE <Text style={s.req}>*</Text></Text>
                <Pressable style={[s.trigger, errors.fromDate ? s.triggerErr : null]} onPress={() => setShowFrom(true)}>
                  <Ionicons name="calendar-outline" size={15} color={C.muted} style={{ marginRight: 6 }} />
                  <Text style={[{ flex: 1 }, fromDate ? s.triggerVal : s.triggerPh]}>
                    {fromDate ? fmtDisplay(fromDate) : 'Select date'}
                  </Text>
                </Pressable>
                {errors.fromDate
                  ? <Err msg={errors.fromDate} />
                  : <Hint msg="e.g. Jun 01, 2025" />}
              </View>
              <View style={s.half}>
                <Text style={s.label}>TO DATE <Text style={s.req}>*</Text></Text>
                <Pressable style={[s.trigger, errors.toDate ? s.triggerErr : null]} onPress={() => setShowTo(true)}>
                  <Ionicons name="calendar-outline" size={15} color={C.muted} style={{ marginRight: 6 }} />
                  <Text style={[{ flex: 1 }, toDate ? s.triggerVal : s.triggerPh]}>
                    {toDate ? fmtDisplay(toDate) : 'Select date'}
                  </Text>
                </Pressable>
                {errors.toDate
                  ? <Err msg={errors.toDate} />
                  : <Hint msg="e.g. Jun 30, 2025" />}
              </View>
            </View>

            {/* Date range error or info */}
            {errors.dateRange ? (
              <View style={s.inlineErr}>
                <Ionicons name="information-circle-outline" size={14} color={C.error} />
                <Text style={s.inlineErrTxt}>{errors.dateRange}</Text>
              </View>
            ) : (
              <View style={s.infoBox}>
                <Ionicons name="information-circle-outline" size={13} color={C.muted} />
                <Text style={s.infoTxt}>Future dates are not allowed for these fields.</Text>
              </View>
            )}
          </View>

          {/* ── 2. Report Details ── */}
          <View style={s.subSection}>
            <Text style={s.subTitle}>Report Details</Text>
            <Text style={s.subSub}>Report title, format, and description information</Text>

            {/* Title + Extension row */}
            <View style={s.row}>
              <View style={s.half}>
                <Text style={s.label}>REPORT TITLE <Text style={s.req}>*</Text></Text>
                <TextInput
                  style={[s.input, errors.reportTitle ? s.inputErr : null]}
                  placeholder="Enter report title"
                  placeholderTextColor="#94a3b8"
                  value={reportTitle}
                  onChangeText={(v) => {
                    onReportTitleChange(v);
                    if (errors.reportTitle) setErrors((e) => ({ ...e, reportTitle: '' }));
                  }}
                  returnKeyType="next"
                />
                {errors.reportTitle ? <Err msg={errors.reportTitle} /> : <Hint msg="(Required)" />}
              </View>
              <View style={s.half}>
                <Text style={s.label}>EXTENSION <Text style={s.req}>*</Text></Text>
                <Pressable style={[s.trigger, errors.extension ? s.triggerErr : null]} onPress={() => setShowExt(true)}>
                  {extension && (
                    <Ionicons
                      name={extension === 'pdf' ? 'document-outline' : 'grid-outline'}
                      size={15} color={C.primary} style={{ marginRight: 6 }} />
                  )}
                  <Text style={[{ flex: 1 }, extension ? s.triggerVal : s.triggerPh]}>
                    {extLabel || 'Select format'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={C.muted} />
                </Pressable>
                {errors.extension ? <Err msg={errors.extension} /> : <Hint msg="(Required)" />}
              </View>
            </View>

            {/* Description */}
            <View style={s.field}>
              <Text style={s.label}>REPORT DESCRIPTION</Text>
              <TextInput
                style={[s.input, s.textarea]}
                placeholder="Enter report description (optional)"
                placeholderTextColor="#94a3b8"
                value={reportDescription}
                onChangeText={onReportDescriptionChange}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Hint msg="(Optional)" />
            </View>
          </View>
        </View>

        {/* ── Submit ── */}
        <Pressable
          style={({ pressed }) => [
            s.submitBtn,
            (!isValid() || isSubmitting) && s.submitBtnOff,
            pressed && isValid() && !isSubmitting && { opacity: 0.88 },
          ]}
          disabled={!isValid() || isSubmitting}
          onPress={handleSubmit}>
          {isSubmitting ? (
            <Text style={s.submitTxt}>Submitting…</Text>
          ) : (
            <>
              <Ionicons name="document-text-outline" size={17} color={C.white} />
              <Text style={s.submitTxt}>Submit Report</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      {/* ── Modals ── */}
      <DropdownModal
        visible={showPeriod} title="Select Period"
        options={PERIOD_OPTIONS.map((p) => ({ value: p, label: p }))}
        selected={period}
        onSelect={handlePeriodChange}
        onClose={() => setShowPeriod(false)}
      />
      <DropdownModal
        visible={showExt} title="Select File Format"
        options={EXTENSION_OPTIONS}
        selected={extension}
        onSelect={(v) => { onExtensionChange(v); setErrors((e) => ({ ...e, extension: '' })); }}
        onClose={() => setShowExt(false)}
      />
      <DatePickerModal
        visible={showFrom} title="Select From Date"
        value={fromDate}
        onConfirm={(d) => { onFromDateChange(d); setErrors((e) => ({ ...e, fromDate: '', dateRange: '' })); }}
        onClose={() => setShowFrom(false)}
      />
      <DatePickerModal
        visible={showTo} title="Select To Date"
        value={toDate}
        onConfirm={(d) => { onToDateChange(d); setErrors((e) => ({ ...e, toDate: '', dateRange: '' })); }}
        onClose={() => setShowTo(false)}
      />
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40, gap: 12 },

  /* Card */
  sectionCard: {
    backgroundColor: C.white, borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  cardHeaderIcon: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  cardHeaderTitle: { fontFamily: F, fontSize: 13, fontWeight: '700', color: C.ink },
  cardHeaderSub: { fontFamily: F, fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 16 },

  /* Sub sections inside card */
  subSection: { padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  subTitle: { fontFamily: F, fontSize: 14, fontWeight: '700', color: C.ink },
  subSub: { fontFamily: F, fontSize: 12, color: C.muted },

  /* Fields */
  field: { gap: 4 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1, gap: 4 },
  label: { fontFamily: F, fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 0.5 },
  req: { color: C.error },

  /* Inputs */
  input: {
    height: 40, borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 10, fontFamily: F, fontSize: 13, color: C.ink, backgroundColor: C.white,
  },
  inputErr: { borderColor: C.error, backgroundColor: C.errorBg },
  textarea: { height: 72, paddingTop: 10 },

  /* Select trigger */
  trigger: {
    height: 40, borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
  },
  triggerErr: { borderColor: C.error, backgroundColor: C.errorBg },
  triggerVal: { fontFamily: F, fontSize: 13, color: C.ink, flex: 1 },
  triggerPh: { fontFamily: F, fontSize: 13, color: '#94a3b8', flex: 1 },

  /* Helpers */
  hintTxt: { fontFamily: F, fontSize: 10, color: C.muted },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  errTxt: { fontFamily: F, fontSize: 10, color: C.error },

  /* Banners */
  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f8fafc', borderRadius: 6, padding: 8,
  },
  infoTxt: { fontFamily: F, fontSize: 11, color: C.muted },
  inlineErr: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.errorBg, borderRadius: 6, padding: 8,
  },
  inlineErrTxt: { fontFamily: F, fontSize: 11, color: C.error },

  /* Submit */
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: 12, height: 48,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28, shadowRadius: 6, elevation: 4,
  },
  submitBtnOff: { backgroundColor: '#cbd5e1', shadowOpacity: 0, elevation: 0 },
  submitTxt: { fontFamily: F, fontSize: 14, fontWeight: '800', color: C.white },

  /* Modal shared */
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 36, maxHeight: '70%', elevation: 20,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1',
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 4,
  },
  sheetTitle: { fontFamily: F, fontSize: 15, fontWeight: '800', color: C.ink },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },

  /* Dropdown */
  optionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  optionRowActive: {
    backgroundColor: C.heroBg, borderRadius: 8, paddingHorizontal: 10,
  },
  optionText: { fontFamily: F, fontSize: 14, color: C.ink, fontWeight: '500' },
  optionTextActive: { color: C.primaryStrong, fontWeight: '700' },

  /* Date Picker */
  pickerRow: { flexDirection: 'row', height: 190, gap: 6, marginVertical: 10 },
  pickerCol: { flex: 1 },
  pickerColLabel: {
    fontFamily: F, fontSize: 10, fontWeight: '700', color: C.muted,
    textAlign: 'center', letterSpacing: 0.4, marginBottom: 4,
  },
  pickerScroll: { backgroundColor: '#f8fafc', borderRadius: 8 },
  pickerItem: { paddingVertical: 9, alignItems: 'center', borderRadius: 6 },
  pickerItemOn: { backgroundColor: C.heroBg },
  pickerItemTxt: { fontFamily: F, fontSize: 14, color: C.muted, fontWeight: '500' },
  pickerItemTxtOn: { color: C.primaryStrong, fontWeight: '800' },
  confirmBtn: {
    backgroundColor: C.primary, borderRadius: 10, height: 44,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  confirmBtnTxt: { fontFamily: F, fontSize: 14, fontWeight: '800', color: C.white },
});

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = {
  ink: '#0f172a',
  muted: '#64748b',
  primary: '#0a1c63',
  error: '#dc2626',
  white: '#ffffff',
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
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/45" onPress={onClose} />
        <View className="bg-white rounded-tl-3xl rounded-tr-3xl px-4 pb-9 overflow-hidden" style={{ maxHeight: '70%', elevation: 20 }}>
          <View className="w-9 h-1 rounded-sm bg-slate-300 self-center mt-[10px] mb-1" />
          <View className="flex-row items-center justify-between py-3 border-b border-slate-100 mb-1">
            <Text className="text-[15px] font-extrabold text-slate-900">{title}</Text>
            <Pressable hitSlop={10} onPress={onClose} className="w-[30px] h-[30px] rounded-full bg-slate-100 items-center justify-center">
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
                  className={`flex-row items-center justify-between py-3 border-b border-[#f8fafc] ${active ? 'bg-[#e8eaf6] rounded-lg px-[10px]' : 'px-1'}`}
                  onPress={() => { onSelect(item.value); onClose(); }}>
                  <Text className={`text-[14px] font-medium ${active ? 'text-[#0a1c63] font-bold' : 'text-slate-900'}`}>{item.label}</Text>
                  {active && <Ionicons name="checkmark" size={16} color={C.primary} />}
                </Pressable>
              );
            }}
          />
        </View>
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
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/45" onPress={onClose} />
        <View className="bg-white rounded-tl-3xl rounded-tr-3xl px-4 pb-9 overflow-hidden" style={{ maxHeight: '70%', elevation: 20 }}>
          <View className="w-9 h-1 rounded-sm bg-slate-300 self-center mt-[10px] mb-1" />
          <View className="flex-row items-center justify-between py-3 border-b border-slate-100 mb-1">
            <Text className="text-[15px] font-extrabold text-slate-900">{title}</Text>
            <Pressable hitSlop={10} onPress={onClose} className="w-[30px] h-[30px] rounded-full bg-slate-100 items-center justify-center">
              <Ionicons name="close" size={20} color={C.ink} />
            </Pressable>
          </View>
          <View className="flex-row h-[190px] gap-[6px] my-[10px]">
            {/* Month */}
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-slate-500 text-center mb-1" style={{ letterSpacing: 0.4 }}>Month</Text>
              <ScrollView showsVerticalScrollIndicator={false} className="bg-[#f8fafc] rounded-lg">
                {MONTH_SHORT.map((name, idx) => (
                  <Pressable key={idx} className={`py-[9px] items-center rounded-md ${idx === mo ? 'bg-[#e8eaf6]' : ''}`} onPress={() => setMo(idx)}>
                    <Text className={`text-[14px] font-medium ${idx === mo ? 'text-[#0a1c63] font-extrabold' : 'text-slate-500'}`}>{name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            {/* Day */}
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-slate-500 text-center mb-1" style={{ letterSpacing: 0.4 }}>Day</Text>
              <ScrollView showsVerticalScrollIndicator={false} className="bg-[#f8fafc] rounded-lg">
                {days.map((day) => (
                  <Pressable key={day} className={`py-[9px] items-center rounded-md ${day === safeD ? 'bg-[#e8eaf6]' : ''}`} onPress={() => setD(day)}>
                    <Text className={`text-[14px] font-medium ${day === safeD ? 'text-[#0a1c63] font-extrabold' : 'text-slate-500'}`}>
                      {String(day).padStart(2, '0')}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            {/* Year */}
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-slate-500 text-center mb-1" style={{ letterSpacing: 0.4 }}>Year</Text>
              <ScrollView showsVerticalScrollIndicator={false} className="bg-[#f8fafc] rounded-lg">
                {years.map((year) => (
                  <Pressable key={year} className={`py-[9px] items-center rounded-md ${year === y ? 'bg-[#e8eaf6]' : ''}`} onPress={() => setY(year)}>
                    <Text className={`text-[14px] font-medium ${year === y ? 'text-[#0a1c63] font-extrabold' : 'text-slate-500'}`}>{year}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
          <Pressable className="bg-[#0a1c63] rounded-[10px] h-11 items-center justify-center mt-1" onPress={confirm}>
            <Text className="text-[14px] font-extrabold text-white">Confirm</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Error / Hint helpers ──────────────────────────────────────────────────────

function Err({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <View className="flex-row items-center gap-[3px]">
      <Ionicons name="alert-circle-outline" size={12} color={C.error} />
      <Text className="text-[10px] text-red-600">{msg}</Text>
    </View>
  );
}

function Hint({ msg }: { msg: string }) {
  return <Text className="text-[10px] text-slate-500">{msg}</Text>;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function BasicInformation({
  extension, fromDate, toDate, period,
  reportTitle, reportDescription,
  onExtensionChange, onFromDateChange, onToDateChange,
  onPeriodChange, onReportTitleChange, onReportDescriptionChange,
  onSubmit, isSubmitting = false,
}: BasicInformationProps) {

  const insets = useSafeAreaInsets();
  // Tab bar is position:absolute — floats over content, does not reserve layout space.
  // Its bottom edge = Math.max(insets.bottom, 14), height ≈ 72. Add 12 breathing room.
  const footerBottom = Math.max(insets.bottom, 14) + 72 + 12;

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
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView className="flex-1 bg-[#f8fafc]" contentContainerStyle={{ padding: 16, paddingBottom: 16, gap: 12 }} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Section card ── */}
        <View
          className="bg-white rounded-xl border border-slate-200 overflow-hidden"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}
        >
          <View className="flex-row items-start gap-[10px] px-4 py-3 border-b border-slate-200 bg-[#f8fafc]">
            <View className="w-[30px] h-[30px] rounded-lg bg-slate-100 items-center justify-center">
              <Ionicons name="document-text-outline" size={16} color={C.muted} />
            </View>
            <View>
              <Text className="text-[13px] font-bold text-slate-900">Report Information</Text>
              <Text className="text-[11px] text-slate-500 mt-[2px] leading-4">Complete details including date range, format, and description</Text>
            </View>
          </View>

          {/* ── 1. Date Range ── */}
          <View className="p-4 gap-3 border-b border-slate-100">
            <Text className="text-[14px] font-bold text-slate-900">Date Range</Text>
            <Text className="text-xs text-slate-500">Select the time period for report generation</Text>

            {/* Period */}
            <View className="gap-1">
              <Text className="text-[10px] font-bold text-slate-500" style={{ letterSpacing: 0.5 }}>
                PERIOD <Text className="text-red-600">*</Text>
              </Text>
              <Pressable
                className={`h-10 border rounded-lg px-[10px] flex-row items-center bg-white ${errors.period ? 'border-red-600 bg-red-50' : 'border-slate-200'}`}
                onPress={() => setShowPeriod(true)}
              >
                <Text className={`flex-1 text-[13px] ${period ? 'text-slate-900' : 'text-[#94a3b8]'}`}>{period || 'Select period'}</Text>
                <Ionicons name="chevron-down" size={16} color={C.muted} />
              </Pressable>
              {errors.period ? <Err msg={errors.period} /> : <Hint msg="(Required)" />}
            </View>

            {/* From / To row */}
            <View className="flex-row gap-[10px]">
              <View className="flex-1 gap-1">
                <Text className="text-[10px] font-bold text-slate-500" style={{ letterSpacing: 0.5 }}>
                  FROM DATE <Text className="text-red-600">*</Text>
                </Text>
                <Pressable
                  className={`h-10 border rounded-lg px-[10px] flex-row items-center bg-white ${errors.fromDate ? 'border-red-600 bg-red-50' : 'border-slate-200'}`}
                  onPress={() => setShowFrom(true)}
                >
                  <Ionicons name="calendar-outline" size={15} color={C.muted} style={{ marginRight: 6 }} />
                  <Text className={`flex-1 text-[13px] ${fromDate ? 'text-slate-900' : 'text-[#94a3b8]'}`}>
                    {fromDate ? fmtDisplay(fromDate) : 'Select date'}
                  </Text>
                </Pressable>
                {errors.fromDate ? <Err msg={errors.fromDate} /> : <Hint msg="e.g. Jun 01, 2025" />}
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-[10px] font-bold text-slate-500" style={{ letterSpacing: 0.5 }}>
                  TO DATE <Text className="text-red-600">*</Text>
                </Text>
                <Pressable
                  className={`h-10 border rounded-lg px-[10px] flex-row items-center bg-white ${errors.toDate ? 'border-red-600 bg-red-50' : 'border-slate-200'}`}
                  onPress={() => setShowTo(true)}
                >
                  <Ionicons name="calendar-outline" size={15} color={C.muted} style={{ marginRight: 6 }} />
                  <Text className={`flex-1 text-[13px] ${toDate ? 'text-slate-900' : 'text-[#94a3b8]'}`}>
                    {toDate ? fmtDisplay(toDate) : 'Select date'}
                  </Text>
                </Pressable>
                {errors.toDate ? <Err msg={errors.toDate} /> : <Hint msg="e.g. Jun 30, 2025" />}
              </View>
            </View>

            {/* Date range error or info */}
            {errors.dateRange ? (
              <View className="flex-row items-center gap-[6px] bg-red-50 rounded-md p-2">
                <Ionicons name="information-circle-outline" size={14} color={C.error} />
                <Text className="text-[11px] text-red-600">{errors.dateRange}</Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-[6px] bg-[#f8fafc] rounded-md p-2">
                <Ionicons name="information-circle-outline" size={13} color={C.muted} />
                <Text className="text-[11px] text-slate-500">Future dates are not allowed for these fields.</Text>
              </View>
            )}
          </View>

          {/* ── 2. Report Details ── */}
          <View className="p-4 gap-3 border-b border-slate-100">
            <Text className="text-[14px] font-bold text-slate-900">Report Details</Text>
            <Text className="text-xs text-slate-500">Report title, format, and description information</Text>

            {/* Title + Extension row */}
            <View className="flex-row gap-[10px]">
              <View className="flex-1 gap-1">
                <Text className="text-[10px] font-bold text-slate-500" style={{ letterSpacing: 0.5 }}>
                  REPORT TITLE <Text className="text-red-600">*</Text>
                </Text>
                <TextInput
                  className={`h-10 border rounded-lg px-[10px] text-[13px] text-slate-900 bg-white ${errors.reportTitle ? 'border-red-600 bg-red-50' : 'border-slate-200'}`}
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
              <View className="flex-1 gap-1">
                <Text className="text-[10px] font-bold text-slate-500" style={{ letterSpacing: 0.5 }}>
                  EXTENSION <Text className="text-red-600">*</Text>
                </Text>
                <Pressable
                  className={`h-10 border rounded-lg px-[10px] flex-row items-center bg-white ${errors.extension ? 'border-red-600 bg-red-50' : 'border-slate-200'}`}
                  onPress={() => setShowExt(true)}
                >
                  {extension && (
                    <Ionicons
                      name={extension === 'pdf' ? 'document-outline' : 'grid-outline'}
                      size={15} color={C.primary} style={{ marginRight: 6 }} />
                  )}
                  <Text className={`flex-1 text-[13px] ${extension ? 'text-slate-900' : 'text-[#94a3b8]'}`}>
                    {extLabel || 'Select format'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={C.muted} />
                </Pressable>
                {errors.extension ? <Err msg={errors.extension} /> : <Hint msg="(Required)" />}
              </View>
            </View>

            {/* Description */}
            <View className="gap-1">
              <Text className="text-[10px] font-bold text-slate-500" style={{ letterSpacing: 0.5 }}>REPORT DESCRIPTION</Text>
              <TextInput
                className="h-[72px] border border-slate-200 rounded-lg px-[10px] pt-[10px] text-[13px] text-slate-900 bg-white"
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

      </ScrollView>

      {/* ── Sticky footer ── */}
      <View className="p-4 border-t border-slate-100 bg-white" style={{ paddingBottom: footerBottom }}>
        <Pressable
          className="flex-row items-center justify-center gap-2 rounded-xl h-12"
          style={({ pressed }) => [
            (!isValid() || isSubmitting)
              ? { backgroundColor: '#cbd5e1' }
              : {
                  backgroundColor: '#0a1c63',
                  shadowColor: '#0a1c63', shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.28, shadowRadius: 6, elevation: 4,
                },
            pressed && isValid() && !isSubmitting && { opacity: 0.88 },
          ]}
          disabled={!isValid() || isSubmitting}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <Text className="text-[14px] font-extrabold text-white">Submitting…</Text>
          ) : (
            <>
              <Ionicons name="document-text-outline" size={17} color={C.white} />
              <Text className="text-[14px] font-extrabold text-white">Submit Report</Text>
            </>
          )}
        </Pressable>
      </View>

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

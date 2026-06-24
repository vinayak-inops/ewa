import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const F = 'Inter';
const PRIMARY = '#7c3aed';

// TODO: replace with real API data
const MOCK_REPORTS = [
  { id: 'attendance_summary', name: 'Attendance Summary', category: 'Attendance', workflowName: 'AttendanceSummary' },
  { id: 'late_in_report', name: 'Late In Report', category: 'Attendance', workflowName: 'LateInReport' },
  { id: 'early_out_report', name: 'Early Out Report', category: 'Attendance', workflowName: 'EarlyOutReport' },
  { id: 'ot_report', name: 'Overtime Report', category: 'Overtime', workflowName: 'OTReport' },
  { id: 'leave_summary', name: 'Leave Summary', category: 'Leave', workflowName: 'LeaveSummary' },
  { id: 'monthly_attendance', name: 'Monthly Attendance', category: 'Attendance', workflowName: 'MonthlyAttendance' },
];

interface SelectReportsProps {
  selectedReport: string | null;
  onSelectionChange: (id: string, workflowName?: string) => void;
  onSaveAndContinue: () => void;
  searchLabel?: string;
  searchPlaceholder?: string;
}

export function SelectReports({
  selectedReport,
  onSelectionChange,
  onSaveAndContinue,
  searchLabel = 'Search by Report Title',
  searchPlaceholder = 'Report title, category, or keyword',
}: SelectReportsProps) {
  const [query, setQuery] = useState('');

  const filtered = MOCK_REPORTS.filter((r) =>
    query.trim() === '' ||
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    r.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Select Report</Text>
        <Text style={s.headerSub}>Choose a report type to generate</Text>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Text style={s.searchLabel}>{searchLabel}</Text>
        <View style={s.searchRow}>
          <Ionicons name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable hitSlop={8} onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={s.list}
        contentContainerStyle={s.listContent}
        renderItem={({ item }) => {
          const isSelected = selectedReport === item.id;
          return (
            <Pressable
              style={[s.reportRow, isSelected && s.reportRowActive]}
              onPress={() => onSelectionChange(item.id, item.workflowName)}>
              <View style={[s.radioOuter, isSelected && s.radioOuterActive]}>
                {isSelected && <View style={s.radioInner} />}
              </View>
              <View style={s.reportText}>
                <Text style={[s.reportName, isSelected && s.reportNameActive]}>{item.name}</Text>
                <Text style={s.reportCat}>{item.category}</Text>
              </View>
              {isSelected && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="search-outline" size={28} color="#cbd5e1" />
            <Text style={s.emptyTxt}>No reports found</Text>
          </View>
        }
      />

      {/* Continue */}
      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [
            s.continueBtn,
            !selectedReport && s.continueBtnOff,
            pressed && selectedReport && { opacity: 0.88 },
          ]}
          disabled={!selectedReport}
          onPress={onSaveAndContinue}>
          <Text style={s.continueBtnTxt}>Save & Continue</Text>
          <Ionicons name="arrow-forward" size={16} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontFamily: F, fontSize: 15, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontFamily: F, fontSize: 12, color: '#64748b', marginTop: 2 },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchLabel: { fontFamily: F, fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 0.5, marginBottom: 6 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 12, height: 40, backgroundColor: '#f8fafc',
  },
  searchInput: { flex: 1, fontFamily: F, fontSize: 13, color: '#0f172a' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  reportRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  reportRowActive: {
    borderColor: PRIMARY, backgroundColor: '#f5f3ff',
  },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#cbd5e1',
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: PRIMARY },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },
  reportText: { flex: 1 },
  reportName: { fontFamily: F, fontSize: 13, fontWeight: '600', color: '#0f172a' },
  reportNameActive: { color: PRIMARY },
  reportCat: { fontFamily: F, fontSize: 11, color: '#64748b', marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTxt: { fontFamily: F, fontSize: 13, color: '#94a3b8' },
  footer: {
    padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#ffffff',
  },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 12, height: 46,
  },
  continueBtnOff: { backgroundColor: '#cbd5e1' },
  continueBtnTxt: { fontFamily: F, fontSize: 14, fontWeight: '800', color: '#ffffff' },
});

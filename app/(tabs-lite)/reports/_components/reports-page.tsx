import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View, Pressable, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SUMMARY_ITEMS = [
  { label: 'Present Days', icon: 'checkmark-circle-outline' as const, color: '#16a34a', bg: '#dcfce7' },
  { label: 'Absent Days', icon: 'close-circle-outline' as const, color: '#dc2626', bg: '#fee2e2' },
  { label: 'Late In', icon: 'time-outline' as const, color: '#d97706', bg: '#fef3c7' },
  { label: 'OT Hours', icon: 'moon-outline' as const, color: '#7c3aed', bg: '#ede9fe' },
];

type Props = {
  id: string;
};

export default function ReportsPage({ id }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear] = useState(today.getFullYear());

  const monthTitle = `${MONTHS[selectedMonth]} ${selectedYear}`;

  const navigateMonth = (dir: 'prev' | 'next') => {
    setSelectedMonth((prev) => {
      if (dir === 'next') return prev === 11 ? 0 : prev + 1;
      return prev === 0 ? 11 : prev - 1;
    });
  };

  return (
    <View className="flex-1 bg-[#f5f3ff]">
      <StatusBar barStyle="light-content" backgroundColor="#4c1d95" />

      {/* Header */}
      <View
        className="bg-[#4c1d95] px-5 pb-5 overflow-hidden"
        style={{ paddingTop: insets.top + 14 }}
      >
        {/* Decorative blobs */}
        <View
          className="absolute w-[180px] h-[180px] rounded-full bg-[#6d28d9] opacity-50"
          style={{ right: -40, top: -60 }}
        />
        <View
          className="absolute w-[120px] h-[120px] rounded-full bg-[#7c3aed] opacity-25"
          style={{ right: 60, top: 10 }}
        />

        {/* Top row */}
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center gap-[10px]">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="w-[34px] h-[34px] rounded-full items-center justify-center bg-white/15"
            >
              <Ionicons name="arrow-back" size={18} color="#ffffff" />
            </Pressable>
            <Text className="text-[20px] font-bold text-white">Reports</Text>
          </View>
          <View className="flex-row gap-2">
            <Pressable className="w-[34px] h-[34px] rounded-full items-center justify-center bg-white/[0.12]" hitSlop={8}>
              <Ionicons name="download-outline" size={19} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        {/* Identity card */}
        <View
          className="flex-row items-center gap-[14px] rounded-2xl p-[14px] border"
          style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.18)' }}
        >
          <View
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
          >
            <Ionicons name="person-outline" size={22} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-[11px] font-bold text-[#c4b5fd] uppercase" style={{ letterSpacing: 0.4 }}>
              Employee Report
            </Text>
            <Text className="text-[14px] font-extrabold text-white mt-[2px]">ID: {id}</Text>
            <Text className="text-[11px] text-[#c4b5fd] mt-[2px]">{monthTitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#c4b5fd" />
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-[#f5f3ff]"
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: 96, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Month navigator */}
        <View
          className="flex-row items-center justify-between bg-white rounded-[14px] p-3"
          style={{ shadowColor: '#4c1d95', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 }}
        >
          <Pressable
            hitSlop={12}
            className="w-9 h-9 rounded-[10px] bg-[#ede9fe] items-center justify-center"
            onPress={() => navigateMonth('prev')}
          >
            <Ionicons name="chevron-back" size={20} color="#7c3aed" />
          </Pressable>
          <Text className="text-[16px] font-extrabold text-[#4c1d95]">{monthTitle}</Text>
          <Pressable
            hitSlop={12}
            className="w-9 h-9 rounded-[10px] bg-[#ede9fe] items-center justify-center"
            onPress={() => navigateMonth('next')}
          >
            <Ionicons name="chevron-forward" size={20} color="#7c3aed" />
          </Pressable>
        </View>

        {/* Summary grid */}
        <View className="flex-row flex-wrap gap-[10px]">
          {SUMMARY_ITEMS.map((item) => (
            <View
              key={item.label}
              className="w-[47.5%] rounded-[14px] p-[14px] gap-[6px]"
              style={{
                backgroundColor: item.bg,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
              }}
            >
              <View
                className="w-8 h-8 rounded-[10px] items-center justify-center"
                style={{ backgroundColor: item.color }}
              >
                <Ionicons name={item.icon} size={18} color="#ffffff" />
              </View>
              <Text className="text-[22px] font-extrabold" style={{ color: item.color }}>--</Text>
              <Text className="text-[11px] font-semibold text-[#64748b]">{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Details card */}
        <View
          className="bg-white rounded-2xl p-[14px]"
          style={{ shadowColor: '#4c1d95', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}
        >
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center gap-2">
              <View className="w-1 h-4 rounded-sm bg-[#7c3aed]" />
              <Text className="text-[13px] font-bold text-[#0f172a]">Monthly Summary</Text>
            </View>
            <View className="bg-[#ede9fe] rounded-md px-2 py-[3px]">
              <Text className="text-[10px] font-bold text-[#6d28d9]">{monthTitle}</Text>
            </View>
          </View>

          {[
            { label: 'Employee ID', value: id },
            { label: 'Total Working Days', value: '--' },
            { label: 'Days Present', value: '--' },
            { label: 'Days Absent', value: '--' },
            { label: 'Total Hours Worked', value: '--' },
            { label: 'Overtime Hours', value: '--' },
            { label: 'Leave Balance', value: '--' },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              className={`flex-row justify-between items-center py-[9px] ${i === arr.length - 1 ? 'pb-[2px]' : 'border-b border-[#f1f5f9]'}`}
            >
              <Text className="text-[12px] text-[#64748b] font-medium">{row.label}</Text>
              <Text className="text-[13px] text-[#0f172a] font-bold text-right">{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Empty state */}
        <View
          className="bg-white rounded-2xl p-7 items-center gap-2"
          style={{ shadowColor: '#4c1d95', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 }}
        >
          <Ionicons name="bar-chart-outline" size={32} color="#c4b5fd" />
          <Text className="text-[15px] font-bold text-[#0f172a]">No Report Data</Text>
          <Text className="text-[12px] text-[#64748b] text-center leading-[18px]">
            Report data for employee {id} will appear here once available.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

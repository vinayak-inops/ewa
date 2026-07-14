import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { TableMenuItem, TableParent, TableType } from './types';

const SECTIONS: { key: TableParent; label: string }[] = [
  { key: 'organization', label: 'Organization' },
  { key: 'contractor', label: 'Contractor' },
  { key: 'shift', label: 'Shift' },
  { key: 'contractEmployee', label: 'Contract Employee' },
];

interface TableSidebarProps {
  tableMenuItems: TableMenuItem[];
  visibleTables: Set<TableType>;
  getSelectedItems: (type: TableType) => string[];
  onToggleTable: (type: TableType) => void;
}

export function TableSidebar({
  tableMenuItems,
  visibleTables,
  getSelectedItems,
  onToggleTable,
}: TableSidebarProps) {
  return (
    <View className="border-b border-[#e5e7eb] bg-white">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 8, flexDirection: 'row' }}
      >
        {SECTIONS.map((section, sIdx) => {
          const items = tableMenuItems.filter((item) => item.parent === section.key);
          if (items.length === 0) return null;

          return (
            <View
              key={section.key}
              className={`gap-1 px-2 ${sIdx > 0 ? 'border-l border-[#e5e7eb]' : ''}`}
            >
              <Text
                className="text-[9px] font-bold text-[#9ca3af] uppercase px-[2px]"
                style={{ letterSpacing: 0.6 }}
              >
                {section.label}
              </Text>

              <View className="flex-row gap-1">
                {items.map((item) => {
                  const selectedCount = getSelectedItems(item.id).length;
                  const hasItems = selectedCount > 0;
                  const isVisible = visibleTables.has(item.id);
                  const isVisibleButEmpty = isVisible && !hasItems;
                  const isVisibleWithItems = isVisible && hasItems;

                  const chipBgBorder = isVisibleButEmpty
                    ? 'bg-[#fef2f2] border-[#fecaca]'
                    : isVisibleWithItems
                    ? 'bg-[#e8eaf6] border-[#0a1c63]'
                    : hasItems && !isVisible
                    ? 'bg-[#f0fdf4] border-[#bbf7d0]'
                    : 'bg-[#f9fafb] border-[#e5e7eb]';

                  const chipLabelClass = isVisibleButEmpty
                    ? 'text-[#7f1d1d] font-semibold'
                    : isVisibleWithItems
                    ? 'text-[#0a1c63] font-semibold'
                    : 'text-[#374151] font-medium';

                  return (
                    <Pressable
                      key={item.id}
                      className={`flex-row items-center gap-1 px-2 py-[5px] rounded-md border ${chipBgBorder}`}
                      style={({ pressed }) => pressed ? [{ opacity: 0.72 }] : []}
                      onPress={() => onToggleTable(item.id)}
                    >
                      <Ionicons
                        name={(item.icon ?? 'business-outline') as any}
                        size={13}
                        color={
                          isVisibleButEmpty ? '#991b1b'
                            : isVisibleWithItems ? '#0a1c63'
                            : '#4b5563'
                        }
                      />

                      <Text className={`text-[11px] ${chipLabelClass}`} numberOfLines={1}>
                        {item.label}
                      </Text>

                      {hasItems && (
                        <View className={`rounded-lg min-w-[16px] h-4 items-center justify-center px-[3px] ${isVisibleWithItems ? 'bg-[#c7d2fe]' : 'bg-[#e5e7eb]'}`}>
                          <Text className={`text-[9px] font-bold ${isVisibleWithItems ? 'text-[#1e40af]' : 'text-[#374151]'}`}>
                            {selectedCount}
                          </Text>
                        </View>
                      )}

                      {isVisibleButEmpty && (
                        <Ionicons name="alert-circle" size={12} color="#dc2626" />
                      )}
                      {isVisibleWithItems && (
                        <Ionicons name="checkmark-circle" size={12} color="#0a1c63" />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

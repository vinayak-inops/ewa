import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TableMenuItem, TableParent, TableType } from './types';

const F = 'Inter';

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
    <View style={s.sidebar}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {SECTIONS.map((section) => {
          const items = tableMenuItems.filter((item) => item.parent === section.key);
          if (items.length === 0) return null;

          return (
            <View key={section.key} style={s.section}>
              <Text style={s.sectionLabel}>{section.label}</Text>
              {items.map((item) => {
                const selectedCount = getSelectedItems(item.id).length;
                const hasItems = selectedCount > 0;
                const isVisible = visibleTables.has(item.id);
                const isVisibleButEmpty = isVisible && !hasItems;
                const isVisibleWithItems = isVisible && hasItems;

                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      s.item,
                      isVisibleButEmpty && s.itemWarning,
                      isVisibleWithItems && s.itemActive,
                      hasItems && !isVisible && s.itemDone,
                      pressed && s.itemPressed,
                    ]}
                    onPress={() => onToggleTable(item.id)}>

                    {/* Icon */}
                    <Ionicons
                      name={(item.icon ?? 'business-outline') as any}
                      size={16}
                      color={
                        isVisibleButEmpty ? '#991b1b'
                          : isVisibleWithItems ? '#1e40af'
                          : '#4b5563'
                      }
                    />

                    {/* Label */}
                    <Text
                      style={[
                        s.itemLabel,
                        isVisibleButEmpty && s.itemLabelWarning,
                        isVisibleWithItems && s.itemLabelActive,
                      ]}
                      numberOfLines={2}>
                      {item.label}
                    </Text>

                    {/* Badge count */}
                    {hasItems && (
                      <View style={[s.badge, isVisibleWithItems && s.badgeActive]}>
                        <Text style={[s.badgeText, isVisibleWithItems && s.badgeTextActive]}>
                          {selectedCount}
                        </Text>
                      </View>
                    )}

                    {/* State icon */}
                    {isVisibleButEmpty && (
                      <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    )}
                    {isVisibleWithItems && (
                      <Ionicons name="checkmark-circle" size={14} color="#2563eb" />
                    )}
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  sidebar: {
    width: 160,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  scroll: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 16,
  },
  section: {
    gap: 2,
  },
  sectionLabel: {
    fontFamily: F,
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
  },
  itemActive: {
    backgroundColor: '#dbeafe',
  },
  itemWarning: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  itemDone: {
    backgroundColor: '#f9fafb',
  },
  itemPressed: {
    opacity: 0.78,
  },
  itemLabel: {
    fontFamily: F,
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
    lineHeight: 16,
  },
  itemLabelActive: {
    color: '#1e3a8a',
    fontWeight: '600',
  },
  itemLabelWarning: {
    color: '#7f1d1d',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeActive: {
    backgroundColor: '#bfdbfe',
  },
  badgeText: {
    fontFamily: F,
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
  },
  badgeTextActive: {
    color: '#1e40af',
  },
});

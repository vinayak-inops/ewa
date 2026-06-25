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
    <View style={s.topbar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scroll}>

        {SECTIONS.map((section, sIdx) => {
          const items = tableMenuItems.filter((item) => item.parent === section.key);
          if (items.length === 0) return null;

          return (
            <View key={section.key} style={[s.section, sIdx > 0 && s.sectionBorder]}>
              <Text style={s.sectionLabel}>{section.label}</Text>

              <View style={s.chips}>
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
                        s.chip,
                        isVisibleButEmpty && s.chipWarning,
                        isVisibleWithItems && s.chipActive,
                        hasItems && !isVisible && s.chipDone,
                        pressed && s.chipPressed,
                      ]}
                      onPress={() => onToggleTable(item.id)}>

                      <Ionicons
                        name={(item.icon ?? 'business-outline') as any}
                        size={13}
                        color={
                          isVisibleButEmpty ? '#991b1b'
                            : isVisibleWithItems ? '#0a1c63'
                            : '#4b5563'
                        }
                      />

                      <Text
                        style={[
                          s.chipLabel,
                          isVisibleButEmpty && s.chipLabelWarning,
                          isVisibleWithItems && s.chipLabelActive,
                        ]}
                        numberOfLines={1}>
                        {item.label}
                      </Text>

                      {hasItems && (
                        <View style={[s.badge, isVisibleWithItems && s.badgeActive]}>
                          <Text style={[s.badgeText, isVisibleWithItems && s.badgeTextActive]}>
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

const s = StyleSheet.create({
  topbar: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  scroll: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 0,
  },
  section: {
    gap: 4,
    paddingHorizontal: 8,
  },
  sectionBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
  },
  sectionLabel: {
    fontFamily: F,
    fontSize: 9,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 2,
  },
  chips: {
    flexDirection: 'row',
    gap: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  chipActive: {
    backgroundColor: '#e8eaf6',
    borderColor: '#0a1c63',
  },
  chipWarning: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  chipDone: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  chipPressed: {
    opacity: 0.72,
  },
  chipLabel: {
    fontFamily: F,
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
  },
  chipLabelActive: {
    color: '#0a1c63',
    fontWeight: '600',
  },
  chipLabelWarning: {
    color: '#7f1d1d',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeActive: {
    backgroundColor: '#c7d2fe',
  },
  badgeText: {
    fontFamily: F,
    fontSize: 9,
    fontWeight: '700',
    color: '#374151',
  },
  badgeTextActive: {
    color: '#1e40af',
  },
});

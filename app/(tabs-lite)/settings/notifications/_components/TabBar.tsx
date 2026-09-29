import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { TABS, type Category } from './types';

type Props = {
  active:   Category;
  onChange: (tab: Category) => void;
};

export function TabBar({ active, onChange }: Props) {
  return (
    <View className="flex-row bg-white border-b border-[#E5E7EB] px-3">
      {TABS.map((tab) => {
        const isActive = tab === active;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            className="mr-4 pt-[11px] pb-[10px] px-1"
          >
            <Text
              style={{
                fontSize:    13.5,
                fontWeight:  isActive ? '700' : '500',
                color:       isActive ? '#111827' : '#9CA3AF',
                letterSpacing: 0.1,
              }}
            >
              {tab}
            </Text>
            {isActive && (
              <View
                style={{
                  position:        'absolute',
                  bottom:          0,
                  left:            4,
                  right:           4,
                  height:          2.5,
                  backgroundColor: '#111827',
                  borderRadius:    2,
                }}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

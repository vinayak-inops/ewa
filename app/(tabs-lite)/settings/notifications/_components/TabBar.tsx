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
              className={`text-[13.5px] tracking-[0.1px] ${isActive ? 'font-bold text-gray-900' : 'font-medium text-gray-400'}`}
            >
              {tab}
            </Text>
            {isActive && (
              <View className="absolute bottom-0 left-1 right-1 h-[2.5px] bg-gray-900 rounded-sm" />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Notification } from './types';

type Props = {
  item:    Notification;
  onStar:  (id: string) => void;
  onPress: (item: Notification) => void;
  isLast:  boolean;
};

export function NotificationCard({ item, onStar, onPress, isLast }: Props) {
  return (
    <>
      <Pressable
        onPress={() => onPress(item)}
        className="flex-row items-start bg-white px-4 py-3.5 gap-3 active:bg-slate-50"
      >
        {/* Icon circle */}
        <View
          className={`w-10 h-10 rounded-full items-center justify-center shrink-0 mt-0.5 ${item.iconBg}`}
        >
          <Ionicons name={item.icon as any} size={19} color={item.iconColor} />
        </View>

        {/* Text content */}
        <View className="flex-1">

          {/* Row 1: title + time + star */}
          <View className="flex-row items-center">
            <Text
              className="flex-1 text-[#111827] text-[14px] font-bold"
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text className="text-[#9CA3AF] text-[12px] mr-2 font-normal">
              {item.time}
            </Text>
            <Pressable onPress={() => onStar(item.id)} hitSlop={10}>
              <Ionicons
                name={item.starred ? 'star' : 'star-outline'}
                size={15}
                color={item.starred ? '#f59e0b' : '#D1D5DB'}
              />
            </Pressable>
          </View>

          {/* Row 2: subtitle */}
          <Text
            className="text-[#111827] text-[13px] mt-[3px] font-semibold"
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>

          {/* Row 3: body */}
          <Text
            className="text-[#9CA3AF] text-[12px] mt-[2px] font-normal"
            numberOfLines={1}
          >
            {item.body}
          </Text>

        </View>
      </Pressable>

      {/* Divider */}
      {!isLast && (
        <View className="h-px bg-gray-200 ml-[68px] mr-4" />
      )}
    </>
  );
}

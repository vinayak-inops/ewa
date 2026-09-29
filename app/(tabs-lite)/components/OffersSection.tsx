/**
 * OffersSection
 *
 * "OFFERS FOR YOU" horizontal image-card carousel for the main launchpad.
 * Each card shows a full-bleed local image that is tappable.
 * Card height is derived from the image's natural aspect ratio via onLoad.
 *
 * Props:
 *   onEwaPress — called when the wage-management card is tapped
 *   onPfPress  — called when the wage-every-payout card is tapped
 */

import { useState } from 'react';
import { Dimensions, Image, ImageLoadEventData, NativeSyntheticEvent, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const CARD_WIDTH    = Dimensions.get('window').width * 0.75;
const FALLBACK_H    = 160;

// ─── Local image assets ───────────────────────────────────────────────────────

const IMG_MANAGEMENT   = require('@/assets/images/wage-management.png');
const IMG_EVERY_PAYOUT = require('@/assets/images/wage-every-payout.png');

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  onEwaPress?: () => void;
  onPfPress?:  () => void;
};

// ─── Single image card ────────────────────────────────────────────────────────

function OfferCard({
  image,
  onPress,
}: {
  image:   number;  // React Native require() returns a numeric asset ID
  onPress: () => void;
}) {
  const [height, setHeight] = useState(FALLBACK_H);

  const handleLoad = (e: NativeSyntheticEvent<ImageLoadEventData>) => {
    // Native: nativeEvent.source = { width, height, uri }
    const src = e.nativeEvent.source as { width?: number; height?: number } | undefined;
    if (src?.width && src?.height) {
      setHeight(Math.round((src.height / src.width) * CARD_WIDTH));
      return;
    }
    // Web (react-native-web): nativeEvent is a DOM Event — read naturalWidth/Height from target
    const target = (e.nativeEvent as any).target as HTMLImageElement | undefined;
    if (target?.naturalWidth && target?.naturalHeight) {
      setHeight(Math.round((target.naturalHeight / target.naturalWidth) * CARD_WIDTH));
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{
        width:         CARD_WIDTH,
        height,
        borderRadius:  16,
        overflow:      'hidden',
        shadowColor:   '#000',
        shadowOffset:  { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius:  8,
        elevation:     4,
      }}
    >
      <Image
        source={image}
        onLoad={handleLoad}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );
}

// ─── Section component ────────────────────────────────────────────────────────

export function OffersSection({ onEwaPress, onPfPress }: Props) {
  const cards = [
    { id: 'ewa', image: IMG_MANAGEMENT,   onPress: onEwaPress ?? (() => {}) },
    { id: 'pf',  image: IMG_EVERY_PAYOUT, onPress: onPfPress  ?? (() => {}) },
  ];

  return (
    <View className="mt-5">

      {/* ── Section header ── */}
      <View className="flex-row items-center justify-between mx-4 mb-3">
        <Text className="text-slate-400 text-[11px] font-bold tracking-[1.6px]">
          OFFERS FOR YOU
        </Text>
        <Text className="text-slate-400 text-[11px] font-normal">Sponsored</Text>
      </View>

      {/* ── Horizontal image scroll ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 12}
        snapToAlignment="start"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {cards.map((card) => (
          <OfferCard
            key={card.id}
            image={card.image}
            onPress={card.onPress}
          />
        ))}
      </ScrollView>

    </View>
  );
}

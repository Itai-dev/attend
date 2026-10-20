import { useEffect, type ReactNode } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { PlaceFocus, PlacePhoto } from '@/domain/finish';

/**
 * The program's places, drawn from the app's photographs by file. Kept apart from design/Photo's
 * scenes on purpose: those follow the sounds (they were renamed for the tones on 20 Oct 2026),
 * and a postcard someone earned on day 3 must stay the same picture.
 */
const FILE: Record<PlacePhoto, number> = {
  dawn: require('../../../assets/images/photos/dawn.jpg'),
  day: require('../../../assets/images/photos/day.jpg'),
  dusk: require('../../../assets/images/photos/dusk.jpg'),
  evening: require('../../../assets/images/photos/evening.jpg'),
  rain: require('../../../assets/images/photos/rain.jpg'),
  forest: require('../../../assets/images/photos/forest.jpg'),
  stream: require('../../../assets/images/photos/stream.jpg'),
  waterfall: require('../../../assets/images/photos/waterfall.jpg'),
  ocean: require('../../../assets/images/photos/ocean.jpg'),
  night: require('../../../assets/images/photos/night.jpg'),
  fire: require('../../../assets/images/photos/fire.jpg'),
  fog: require('../../../assets/images/photos/tone.jpg'),
};

/** Every photograph is 1200 × 800. */
const ASPECT = 1.5;
const SHIFT: Record<PlaceFocus, number> = { left: 0, center: 0.5, right: 1 };

type Props = {
  photo: PlacePhoto;
  focus?: PlaceFocus;
  width: number;
  height: number;
  radius?: number;
  /** The same very slow push-in as design/Photo: a place, not a poster. None under Reduce Motion. */
  drift?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * A photograph cropped to cover the box, framed at its left, middle or right: a portrait
 * postcard from a landscape photograph shows a different part of the place.
 */
export function PlaceImage({ photo, focus = 'center', width, height, radius = 0, drift, style, children }: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!drift || reduceMotion) return;
    scale.value = 1;
    scale.value = withTiming(1.08, { duration: 40_000, easing: Easing.out(Easing.quad) });
  }, [drift, reduceMotion, photo, scale]);
  const zoom = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const w = Math.max(width, height * ASPECT);
  const h = w / ASPECT;
  const left = -(w - width) * SHIFT[focus];
  const top = -(h - height) / 2;
  return (
    <View style={[{ width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: '#5E676A' }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, zoom]}>
        <Image source={FILE[photo]} style={{ position: 'absolute', width: w, height: h, left, top }} resizeMode="cover" accessibilityIgnoresInvertColors />
      </Animated.View>
      {children}
    </View>
  );
}

import { useEffect, type ReactNode } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SoundscapeId } from '../domain/soundscapes';

/**
 * The app's photographs: misty, overcast, 35mm film, in the manner of daisysound.com. One for
 * each sound and one for each part of the day (tools/grade-photos.py). Places to be, never a
 * picture of a body or of pain.
 */

export type SceneId = SoundscapeId | 'dawn' | 'day' | 'dusk' | 'evening';

const PHOTO: Record<SceneId, number> = {
  rain: require('../../assets/images/photos/rain.jpg'),
  forest: require('../../assets/images/photos/forest.jpg'),
  stream: require('../../assets/images/photos/stream.jpg'),
  waterfall: require('../../assets/images/photos/waterfall.jpg'),
  ocean: require('../../assets/images/photos/ocean.jpg'),
  night: require('../../assets/images/photos/night.jpg'),
  fire: require('../../assets/images/photos/fire.jpg'),
  tone: require('../../assets/images/photos/tone.jpg'),
  dawn: require('../../assets/images/photos/dawn.jpg'),
  day: require('../../assets/images/photos/day.jpg'),
  dusk: require('../../assets/images/photos/dusk.jpg'),
  evening: require('../../assets/images/photos/evening.jpg'),
};

/** Today's photograph: the sky that matches the hour. */
export function sceneForHour(hour: number): SceneId {
  if (hour >= 5 && hour < 10) return 'dawn';
  if (hour >= 10 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'evening';
}

/** Whether type over the photograph's upper half reads best light or dark. */
export function sceneIsLight(id: SceneId): boolean {
  return id === 'day' || id === 'tone' || id === 'ocean' || id === 'rain' || id === 'waterfall';
}

type Props = {
  scene: SceneId;
  width?: number;
  height: number;
  radius?: number;
  /**
   * A very slow push in (8% over 40 s), once, for a large photograph: it reads as a living
   * place rather than a poster. Never a loop; none under Reduce Motion.
   */
  drift?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Photo({ scene, width, height, radius = 0, drift, style, children }: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!drift || reduceMotion) return;
    scale.value = 1;
    scale.value = withTiming(1.08, { duration: 40_000, easing: Easing.out(Easing.quad) });
  }, [drift, reduceMotion, scene, scale]);
  const zoom = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={[{ width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: '#8F9A9C' }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, zoom]}>
        {/* Explicit size: on web an image otherwise takes its file's own pixel size. */}
        <Image source={PHOTO[scene]} style={styles.fill} resizeMode="cover" accessibilityIgnoresInvertColors />
      </Animated.View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { width: '100%', height: '100%' } });

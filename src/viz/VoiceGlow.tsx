import { Canvas, Group, LinearGradient, Rect, useClock, vec } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useDerivedValue, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import type { BreathMode } from './BreathingField';

/**
 * A soft band of colour that rises from the bottom of the screen with the person's voice
 * (after voice-glow, rebuilt natively: that library is web-only). It tells someone who
 * glances at the phone that they are being heard, and drifts side to side while the guide
 * speaks. Cool colours only — colour is never a verdict, and there is no red.
 */

const COLORS = ['#3E7CB1', '#5BB5B0', '#7B6CC4', '#4F9FD0', '#3E7CB1'];
const HEIGHT = 260;

type Props = { width: number; mode: BreathMode; level: SharedValue<number> };

export function VoiceGlow({ width, mode, level }: Props) {
  const reduceMotion = useReducedMotion();
  const clock = useClock();
  const presence = useSharedValue(0);

  useEffect(() => {
    // Listening: present and following the voice. Guide speaking: a faint drift. Otherwise gone.
    const target = mode === 'listening' ? 1 : mode === 'speaking' ? 0.35 : 0;
    presence.value = withTiming(target, { duration: mode === 'listening' ? 900 : 1600 });
  }, [mode, presence]);

  // How far up the screen the glow reaches: a low line at rest, rising with the voice.
  const top = useDerivedValue(() => {
    const voice = Math.min(1, level.value * 1.6);
    const reach = 0.18 + 0.82 * voice * presence.value;
    return HEIGHT * (1 - reach * presence.value);
  });
  const opacity = useDerivedValue(() => 0.25 + 0.6 * presence.value);
  // The colours slide side to side, slowly.
  const sweep = useDerivedValue(() => (reduceMotion ? 0 : Math.sin(clock.value / 4200) * width * 0.35));
  const start = useDerivedValue(() => vec(-width * 0.5 + sweep.value, 0));
  const end = useDerivedValue(() => vec(width * 1.5 + sweep.value, 0));
  const fadeStart = useDerivedValue(() => vec(0, top.value));

  return (
    <Canvas style={[styles.canvas, { width, height: HEIGHT }]} pointerEvents="none">
      <Group layer opacity={opacity}>
        <Rect x={0} y={0} width={width} height={HEIGHT}>
          <LinearGradient start={start} end={end} colors={COLORS} />
        </Rect>
        {/* Keep only the lower part, fading upward from the bottom edge. */}
        <Rect x={0} y={0} width={width} height={HEIGHT} blendMode="dstIn">
          <LinearGradient start={fadeStart} end={vec(0, HEIGHT)} colors={['#00000000', '#000000A0', '#000000FF']} positions={[0, 0.6, 1]} />
        </Rect>
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: { position: 'absolute', left: 0, bottom: 0 },
});

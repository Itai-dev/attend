import { Canvas, Fill, Shader, useClock } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useDerivedValue, useReducedMotion, type SharedValue } from 'react-native-reanimated';
import { speakPlace } from '../domain/regions';
import type { BodyMapState } from '../domain/types';
import { color } from '../design/theme';
import { bodyUniforms, fieldsFor, focusFor, type View as FigureView } from './bodyUniforms';
import { BG_RGB, effect } from './effects';

/**
 * The living body map: an abstract figure with the sensations the person
 * described drawn as soft animated fields. A visual interpretation of their
 * words — it never claims to show what is happening inside the body.
 */

type Props = {
  map: BodyMapState;
  view: FigureView;
  width: number;
  height: number;
  /** Thumbnails are still; the recap and Body tab breathe. */
  animated?: boolean;
  /** 0 → 1 fades the fields in (the reveal after a session). */
  reveal?: SharedValue<number>;
  weights?: Map<string, number>;
  /** Figure size relative to the canvas height. Above 1, the view zooms toward the main sensation. */
  scale?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function describeMap(map: BodyMapState): string {
  if (map.sensations.length === 0) return 'A visual interpretation of the body, with nothing in particular marked.';
  const parts = map.sensations.slice(0, 3).map((s) => {
    const words = s.descriptors.slice(0, 2).join(' and ');
    const moving = s.movement?.destinationRegion ? `, moving toward ${speakPlace(s.movement.destinationRegion)}` : '';
    return `${words ? words + ' ' : ''}${/^the .*side/.test(speakPlace(s.region, s.side)) ? 'on' : 'in'} ${speakPlace(s.region, s.side)}${moving}`;
  });
  return `A visual interpretation of what you described: ${parts.join('; ')}.`;
}

export function BodyField({ map, view, width, height, animated = true, reveal, weights, scale = 1, style, accessibilityLabel }: Props) {
  const reduceMotion = useReducedMotion();
  const fx = effect('body');
  const base = useMemo(
    () => ({ ...bodyUniforms(fieldsFor(map, view, { weights })), uFocus: [focusFor(map, scale)] }),
    [map, view, weights, scale],
  );
  const label = accessibilityLabel ?? describeMap(map);

  if (!fx || width <= 0 || height <= 0) {
    return <View style={[{ width, height, backgroundColor: color.bg }, style]} accessible accessibilityRole="image" accessibilityLabel={label} />;
  }

  return (
    <View style={[{ width, height }, style]} accessible accessibilityRole="image" accessibilityLabel={label}>
      {animated && !reduceMotion ? (
        <LiveCanvas fx={fx} base={base} width={width} height={height} reveal={reveal} scale={scale} />
      ) : (
        <StillCanvas fx={fx} base={base} width={width} height={height} reveal={reveal} scale={scale} />
      )}
    </View>
  );
}

type CanvasProps = {
  fx: NonNullable<ReturnType<typeof effect>>;
  base: Record<string, number[]>;
  width: number;
  height: number;
  reveal?: SharedValue<number>;
  scale: number;
};

function LiveCanvas({ fx, base, width, height, reveal, scale }: CanvasProps) {
  const clock = useClock();
  const uniforms = useDerivedValue(
    () => ({
      ...base,
      uRes: [width, height],
      uTime: clock.value / 1000,
      uMotion: 1,
      uReveal: reveal ? reveal.value : 1,
      uScale: scale,
      uBg: BG_RGB,
    }),
    [base, width, height, scale, reveal],
  );
  return (
    <Canvas style={{ width, height }}>
      <Fill>
        <Shader source={fx} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}

function StillCanvas({ fx, base, width, height, reveal, scale }: CanvasProps) {
  const uniforms = useDerivedValue(
    () => ({
      ...base,
      uRes: [width, height],
      uTime: 2.4,
      uMotion: 0,
      uReveal: reveal ? reveal.value : 1,
      uScale: scale,
      uBg: BG_RGB,
    }),
    [base, width, height, scale, reveal],
  );
  return (
    <Canvas style={{ width, height }}>
      <Fill>
        <Shader source={fx} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}

import { Canvas, Fill, Shader, useClock } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useDerivedValue, useReducedMotion, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { speakPlace } from '../domain/regions';
import type { BodyMapState } from '../domain/types';
import { color } from '../design/theme';
import { bodyUniforms, fieldsFor, fieldsFor3d, focusFor, type View as FigureView } from './bodyUniforms';
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
  /**
   * Large, animated maps are drawn as a turning 3D figure with the sensations inside it, and can
   * be dragged round. Thumbnails, still maps and Reduce Motion keep the flat figure.
   */
  depth?: boolean;
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

/** Below this width a figure is a thumbnail: the flat one reads better and costs far less. */
const DEPTH_MIN_WIDTH = 220;

export function BodyField(props: Props) {
  const reduceMotion = useReducedMotion();
  const { width, height, animated = true, depth = true } = props;
  if (depth && animated && !reduceMotion && width >= DEPTH_MIN_WIDTH && height > 0 && effect('body3d')) return <BodyField3d {...props} />;
  return <BodyField2d {...props} />;
}

function BodyField2d({ map, view, width, height, animated = true, reveal, weights, scale = 1, style, accessibilityLabel }: Props) {
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

/**
 * The 3D figure. It turns slowly on its own — a gentle sway around the side the sensations
 * are on — and follows a horizontal drag. The sway is slow on purpose: something to look at
 * for a moment, not a spinning model.
 */
function BodyField3d({ map, view, width, height, reveal, weights, scale = 1, style, accessibilityLabel }: Props) {
  const fx = effect('body3d')!;
  const clock = useClock();
  const drag = useSharedValue(0);
  const base = useMemo(
    () => ({ ...bodyUniforms(fieldsFor3d(map, { weights }), { depth: true }), uFocus: [focusFor(map, scale)] }),
    [map, weights, scale],
  );
  // Facing the side with more to show, then swaying about ±30°.
  const facing = view === 'back' ? Math.PI : 0;
  const uniforms = useDerivedValue(
    () => ({
      ...base,
      uRes: [width, height],
      uTime: clock.value / 1000,
      uMotion: 1,
      uReveal: reveal ? reveal.value : 1,
      uScale: scale,
      uYaw: facing + Math.sin(clock.value / 1000 / 6.5) * 0.5 + drag.value,
      uBg: BG_RGB,
    }),
    [base, width, height, scale, reveal, facing],
  );
  // Horizontal drags only, so a vertical scroll over the figure still scrolls the page.
  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .onChange((e) => {
      drag.value += (e.changeX / Math.max(width, 1)) * Math.PI * 1.4;
    })
    .onEnd((e) => {
      drag.value = withSpring(drag.value + (e.velocityX / Math.max(width, 1)) * 0.35, { damping: 30, stiffness: 40 });
    });
  return (
    <GestureDetector gesture={pan}>
      <View
        style={[{ width, height }, style]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel ?? describeMap(map)}
        accessibilityHint="A turning figure. Drag sideways to turn it."
      >
        <Canvas style={{ width, height }}>
          <Fill>
            <Shader source={fx} uniforms={uniforms} />
          </Fill>
        </Canvas>
      </View>
    </GestureDetector>
  );
}

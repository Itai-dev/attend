import { Canvas, Circle, Fill, LinearGradient, RadialGradient, Rect, Shader, vec } from '@shopify/react-native-skia';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { effect } from '../viz/effects';
import { ART, glowSpots, MOTIFS, type ArtKey, type Motif } from './art';
import { haptic, Txt } from './components';
import { color, radius, space, useColors } from './theme';

/**
 * Colour fields and small chrome: a colour field (a diagonal gradient with soft light), the
 * week's wash behind a page header, and a pill. Colour names a week or a kind of session,
 * never anything about pain.
 */

/**
 * A colour field: a diagonal gradient with soft light inside it, and optionally a small picture
 * in grain, in the field's own light colour (a placeholder for illustration). Anything passed as
 * children sits on top.
 */
export function CoverArt({
  art,
  size,
  height,
  seed = 1,
  rounded = radius.s,
  motif,
  children,
  style,
}: {
  art: ArtKey;
  size: number;
  height?: number;
  seed?: number;
  rounded?: number;
  motif?: Motif;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const p = ART[art];
  const fx = motif ? effect('motif') : null;
  const h = height ?? size;
  const m = Math.max(size, h);
  return (
    <View style={[{ width: size, height: h, borderRadius: rounded, overflow: 'hidden', backgroundColor: p.to }, style]}>
      <Canvas style={{ position: 'absolute', left: 0, top: 0, width: size, height: h }}>
        <Rect x={0} y={0} width={size} height={h}>
          <LinearGradient start={vec(0, 0)} end={vec(size, h)} colors={[p.from, p.to]} />
        </Rect>
        {glowSpots(seed).map((g, i) => (
          <Circle key={i} cx={g.x * size} cy={g.y * h} r={g.r * m}>
            <RadialGradient c={vec(g.x * size, g.y * h)} r={g.r * m} colors={[withAlpha(p.glow, g.a), withAlpha(p.glow, 0)]} />
          </Circle>
        ))}
        {fx && motif ? (
          <Fill>
            <Shader source={fx} uniforms={{ uRes: [size, h], uKind: MOTIFS.indexOf(motif), uSeed: seed, uInk: rgb(p.glow), uGrain: Math.max(0.6, size / 300) }} />
          </Fill>
        ) : null}
      </Canvas>
      {children}
    </View>
  );
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function withAlpha(hex: string, a: number) {
  return `${hex}${Math.round(a * 255)
    .toString(16)
    .padStart(2, '0')}`;
}

/** The page header's colour, fading from the cover's hue into the background. */
export function HeaderGradient({ art, height, width }: { art: ArtKey; height: number; width: number }) {
  const bg = useColors().bg;
  return (
    <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height }} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[ART[art].header, bg]} />
      </Rect>
    </Canvas>
  );
}

/** A small rounded pill, Spotify's filter chip: on is accent, off is a grey surface. */
export function Pill({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: !!on }}
      disabled={!onPress}
      onPress={() => {
        haptic('select');
        onPress?.();
      }}
      style={({ pressed }) => [styles.pill, on && { backgroundColor: color.accent }, pressed && !on && { backgroundColor: color.surfacePressed }]}
    >
      <Txt variant="footnote" style={{ fontWeight: '600', color: on ? color.onAccent : color.text }}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 32,
    paddingHorizontal: space.m + 2,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

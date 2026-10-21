import { Canvas, Circle, LinearGradient, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { ART, glowSpots, type ArtKey } from './art';
import { haptic, Icon, Txt } from './components';
import { color, radius, space } from './theme';

/**
 * The media building blocks: cover art, the play button, shelves, tiles and rows. The
 * grammar of a listening app (Spotify's) so that finding today's practice feels as easy as
 * finding something to play.
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Pressed feedback on touch-down, released with a critically damped spring (no bounce). */
function usePress(to = 0.97) {
  const s = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return {
    style,
    onPressIn: () => {
      s.value = withTiming(to, { duration: 100 });
    },
    onPressOut: () => {
      s.value = withSpring(1, { damping: 20, stiffness: 260 });
    },
  };
}

/** Generated cover art: a diagonal gradient with soft light inside it. Anything passed as children sits on top. */
export function CoverArt({
  art,
  size,
  height,
  seed = 1,
  rounded = radius.s,
  children,
  style,
}: {
  art: ArtKey;
  size: number;
  height?: number;
  seed?: number;
  rounded?: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const p = ART[art];
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
      </Canvas>
      {children}
    </View>
  );
}

function withAlpha(hex: string, a: number) {
  return `${hex}${Math.round(a * 255)
    .toString(16)
    .padStart(2, '0')}`;
}

/** The page header's colour, fading from the cover's hue into the background. */
export function HeaderGradient({ art, height, width }: { art: ArtKey; height: number; width: number }) {
  return (
    <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height }} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[ART[art].header, color.bg]} />
      </Rect>
    </Canvas>
  );
}

/** The one round button that starts something. Accent-filled, always the same shape and place. */
export function PlayButton({
  onPress,
  label,
  size = 56,
  playing = false,
  style,
}: {
  onPress: () => void;
  label: string;
  size?: number;
  playing?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePress(0.94);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPressIn={p.onPressIn}
      onPressOut={p.onPressOut}
      onPress={() => {
        haptic('soft');
        onPress();
      }}
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
        p.style,
        style,
      ]}
    >
      {/* The play glyph is optically off-centre; nudge it right so it looks centred. */}
      <View style={{ marginLeft: playing ? 0 : size * 0.06 }}>
        <Icon name={playing ? 'pause.fill' : 'play.fill'} size={size * 0.36} tint={color.onAccent} />
      </View>
    </AnimatedPressable>
  );
}

/** A titled, horizontally scrolling row of cards. */
export function Shelf({ title, children, style }: { title: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Txt variant="title2" accessibilityRole="header" style={{ paddingHorizontal: space.l, marginBottom: space.m }}>
        {title}
      </Txt>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: space.l, gap: space.m }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** A square cover with a title and a line under it: one item on a shelf. */
export function ShelfCard({
  art,
  seed,
  title,
  subtitle,
  onPress,
  width = 148,
  overlay,
}: {
  art: ArtKey;
  seed?: number;
  title: string;
  subtitle?: string;
  onPress: () => void;
  width?: number;
  overlay?: ReactNode;
}) {
  const p = usePress(0.97);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPressIn={p.onPressIn}
      onPressOut={p.onPressOut}
      onPress={() => {
        haptic('select');
        onPress();
      }}
      style={[{ width }, p.style]}
    >
      <CoverArt art={art} seed={seed} size={width}>
        {overlay}
      </CoverArt>
      <Txt variant="callout" numberOfLines={2} style={{ marginTop: space.s, fontWeight: '700' }}>
        {title}
      </Txt>
      {subtitle ? (
        <Txt variant="footnote" tone="secondary" numberOfLines={2} style={{ marginTop: 2 }}>
          {subtitle}
        </Txt>
      ) : null}
    </AnimatedPressable>
  );
}

/** A compact tile for the two-column grid at the top of Today: art on the left, a bold title. */
export function Tile({ art, seed, title, onPress, label }: { art: ArtKey; seed?: number; title: string; onPress: () => void; label?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      onPress={() => {
        haptic('select');
        onPress();
      }}
      style={({ pressed }) => [styles.tile, pressed && { backgroundColor: color.surfacePressed }]}
    >
      <CoverArt art={art} seed={seed} size={56} rounded={0} />
      <Txt variant="footnote" numberOfLines={2} style={styles.tileText}>
        {title}
      </Txt>
    </Pressable>
  );
}

/** A list row, like a track: art or a leading mark, title, a line under it, and something on the right. */
export function ListRow({
  leading,
  title,
  subtitle,
  right,
  onPress,
  disabled,
  label,
  titleTone = 'primary',
}: {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  label?: string;
  titleTone?: 'primary' | 'secondary' | 'tertiary';
}) {
  const body = (
    <>
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant="body" tone={titleTone} numberOfLines={1} style={{ fontWeight: '500' }}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="footnote" tone="secondary" numberOfLines={1} style={{ marginTop: 1 }}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? (subtitle ? `${title}. ${subtitle}` : title)}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        haptic('select');
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.surface }]}
    >
      {body}
    </Pressable>
  );
}

/** A round icon in a soft circle: the leading mark of a row that has no cover. */
export function RowIcon({ name, tint = color.text, bg = color.surfaceStrong, size = 48 }: { name: string; tint?: string; bg?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius.xs, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={size * 0.42} tint={tint} />
    </View>
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
  tile: {
    flex: 1,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xs,
    overflow: 'hidden',
    backgroundColor: color.surfaceStrong,
  },
  tileText: { flex: 1, paddingHorizontal: space.s, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    minHeight: 64,
    paddingVertical: space.s,
    paddingHorizontal: space.l,
  },
  pill: {
    minHeight: 32,
    paddingHorizontal: space.m + 2,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


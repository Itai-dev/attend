import * as Haptics from 'expo-haptics';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HIT, radius, space, type, type TypeVariant, type Palette } from './theme';
import { useColors, useStyles } from './ThemeProvider';

export function haptic(kind: 'light' | 'select' | 'soft' = 'light') {
  if (Platform.OS === 'web') return;
  try {
    if (kind === 'select') Haptics.selectionAsync();
    else Haptics.impactAsync(kind === 'soft' ? Haptics.ImpactFeedbackStyle.Soft : Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

type TxtProps = TextProps & {
  variant?: TypeVariant;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'inverse';
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
};

const tones = (color: Palette) => ({
  primary: color.text,
  secondary: color.textSecondary,
  tertiary: color.textTertiary,
  inverse: color.onAccent,
});

/** System type, scaled with Dynamic Type (large titles capped so layouts hold). */
export function Txt({ variant = 'body', tone = 'primary', align, style, maxFontSizeMultiplier, ...rest }: TxtProps) {
  const color = useColors();
  const cap = maxFontSizeMultiplier ?? (variant === 'display' || variant === 'title' ? 1.35 : 2);
  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={cap}
      style={[type[variant], { color: tones(color)[tone], textAlign: align }, style]}
    />
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function usePressScale(to = 0.97) {
  const s = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return {
    style,
    onPressIn: () => {
      s.value = withTiming(to, { duration: 120 });
    },
    onPressOut: () => {
      s.value = withSpring(1, { damping: 18, stiffness: 220 });
    },
  };
}

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  detail?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * The one filled control on a screen, after Daisy's: a nearly square bar in ink (paper at
 * night), a lowercase label and an arrow that says "this goes somewhere".
 */
export function PrimaryButton({ label, detail, style, onPress, ...rest }: ButtonProps) {
  const styles = useStyles(makeStyles);
  const p = usePressScale();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      {...rest}
      onPressIn={p.onPressIn}
      onPressOut={p.onPressOut}
      onPress={(e) => {
        haptic('soft');
        onPress?.(e);
      }}
      style={[styles.primary, p.style, style]}
    >
      <View style={{ flex: 1 }}>
        <Txt variant="headline" tone="inverse" style={{ fontSize: 18, textTransform: 'lowercase' }}>
          {label}
        </Txt>
        {detail ? (
          <Txt variant="footnote" tone="inverse" style={{ opacity: 0.62, marginTop: 1 }}>
            {detail}
          </Txt>
        ) : null}
      </View>
      <Txt variant="title2" tone="inverse" importantForAccessibility="no" accessibilityElementsHidden>
        →
      </Txt>
    </AnimatedPressable>
  );
}

/**
 * Daisy's secondary link: a thin outlined box, lowercase, with an arrow. For a second path off
 * a screen ("open sounds →"), never for the main one.
 */
export function OutlineButton({ label, style, onPress, tone, ...rest }: ButtonProps & { tone?: 'onImage' }) {
  const color = useColors();
  const ink = tone === 'onImage' ? color.onImage : color.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      {...rest}
      onPress={(e) => {
        haptic('select');
        onPress?.(e);
      }}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: space.s, alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: space.m, borderWidth: 1, borderColor: ink, borderRadius: 3, opacity: pressed ? 0.55 : 1 },
        style,
      ]}
    >
      <Txt variant="callout" style={{ color: ink, fontWeight: '500', textTransform: 'lowercase' }}>
        {label}
      </Txt>
      <Txt variant="callout" style={{ color: ink }} importantForAccessibility="no" accessibilityElementsHidden>
        →
      </Txt>
    </Pressable>
  );
}

/** A quiet text button. */
export function QuietButton({ label, style, onPress, tone = 'secondary', ...rest }: ButtonProps & { tone?: 'primary' | 'secondary' }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      {...rest}
      onPress={(e) => {
        haptic('select');
        onPress?.(e);
      }}
      style={({ pressed }) => [styles.quiet, { opacity: pressed ? 0.5 : 1 }, style]}
    >
      <Txt variant="callout" tone={tone}>
        {label}
      </Txt>
    </Pressable>
  );
}

const GLYPHS: Record<string, string> = {
  'pause.fill': '❙❙',
  'play.fill': '▶',
  xmark: '✕',
  'stop.fill': '■',
  'gearshape': '⚙',
  'chevron.right': '›',
  'chevron.left': '‹',
  'figure.stand': '◯',
  'waveform': '≈',
  'circle.dotted': '◌',
  'trash': '⌫',
  'ellipsis': '…',
  'chart.xyaxis.line': '⌁',
  checkmark: '✓',
  'lock.fill': '⌂',
  'star.fill': '✦',
  'chevron.down': '⌄',
  'speaker.wave.2.fill': '♪',
  'moon.stars.fill': '☾',
};

export function Icon({ name, size = 20, tint: tintProp, weight = 'regular' }: { name: string; size?: number; tint?: string; weight?: SymbolViewProps['weight'] }) {
  const fallback = useColors().text;
  const tint = tintProp ?? fallback;
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={name as SymbolViewProps['name']}
        size={size}
        tintColor={tint}
        weight={weight}
        fallback={<Text style={{ color: tint, fontSize: size }}>{GLYPHS[name] ?? '•'}</Text>}
      />
    );
  }
  return <Text style={{ color: tint, fontSize: size * 0.9, lineHeight: size * 1.1, textAlign: 'center' }}>{GLYPHS[name] ?? '•'}</Text>;
}

export function IconButton({
  icon,
  label,
  onPress,
  size = HIT,
  iconSize = 18,
  tint: tintProp,
  variant = 'plain',
  style,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  size?: number;
  iconSize?: number;
  tint?: string;
  variant?: 'plain' | 'filled';
  style?: StyleProp<ViewStyle>;
}) {
  const color = useColors();
  const tint = tintProp ?? color.text;
  const p = usePressScale(0.92);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPressIn={p.onPressIn}
      onPressOut={p.onPressOut}
      onPress={() => {
        haptic('select');
        onPress();
      }}
      style={[
        {
          width: Math.max(size, HIT),
          height: Math.max(size, HIT),
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: variant === 'filled' ? color.surfaceStrong : 'transparent',
          borderWidth: variant === 'filled' ? StyleSheet.hairlineWidth : 0,
          borderColor: color.hairline,
        },
        p.style,
        style,
      ]}
    >
      <Icon name={icon} size={iconSize} tint={tint} />
    </AnimatedPressable>
  );
}

/** A screen with a large title that scrolls with its content, iOS-style. */
export function TitledScroll({
  title,
  right,
  onBack,
  children,
  contentStyle,
  ...rest
}: ScrollViewProps & { title: string; right?: ReactNode; onBack?: () => void; contentStyle?: StyleProp<ViewStyle> }) {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      {...rest}
      style={{ flex: 1, backgroundColor: color.bg }}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={[{ paddingTop: insets.top + space.l, paddingBottom: insets.bottom + 120, paddingHorizontal: space.xl }, contentStyle]}
    >
      {onBack ? <IconButton icon="chevron.left" label="Back" onPress={onBack} tint={color.textSecondary} style={{ marginLeft: -space.m }} /> : null}
      <View style={styles.titleRow}>
        <Txt variant="display" accessibilityRole="header" style={{ flex: 1 }}>
          {title}
        </Txt>
        {right}
      </View>
      {children}
    </ScrollView>
  );
}

export function SectionLabel({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return (
    <Txt variant="footnote" tone="secondary" accessibilityRole="header" style={[{ textTransform: 'lowercase', fontWeight: '500', marginBottom: space.m }, style]}>
      {children}
    </Txt>
  );
}

export function Hairline({ style }: { style?: StyleProp<ViewStyle> }) {
  const color = useColors();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: color.hairline }, style]} />;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
  fill,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
  /** Stretch to the row's width, segments sharing it equally. */
  fill?: boolean;
}) {
  const color = useColors();
  const styles = useStyles(makeStyles);
  return (
    <View accessibilityRole="tablist" style={[styles.segmented, fill && { alignSelf: 'stretch' }, style]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            hitSlop={{ top: 4, bottom: 4 }}
            onPress={() => {
              if (!selected) haptic('select');
              onChange(o.value);
            }}
            style={[styles.segment, fill && { flex: 1, minWidth: 0, paddingHorizontal: 0 }, selected && { backgroundColor: color.accent }]}
          >
            <Txt variant="footnote" tone={selected ? 'inverse' : 'secondary'} style={{ fontWeight: '500' }}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * A ready answer, as a pill: the welcome's replies, Explore's categories. Right-aligned
 * stacks of these read as "your side" of the conversation.
 */
export function Chip({
  label,
  selected,
  onPress,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles(makeStyles);
  const p = usePressScale(0.96);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPressIn={p.onPressIn}
      onPressOut={p.onPressOut}
      onPress={() => {
        haptic('select');
        onPress();
      }}
      style={[styles.chip, selected && styles.chipOn, p.style, style]}
    >
      <Txt variant="headline" tone={selected ? 'inverse' : 'primary'} style={{ fontWeight: '500' }}>
        {label}
      </Txt>
      <View style={[styles.chipDot, selected && styles.chipDotOn]} />
    </AnimatedPressable>
  );
}

/** A rounded surface that can be tapped: a preset, a place in You. */
export function Card({ children, onPress, label, style }: { children: ReactNode; onPress?: () => void; label?: string; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles(makeStyles);
  const p = usePressScale(0.98);
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={p.onPressIn}
      onPressOut={p.onPressOut}
      onPress={() => {
        haptic('select');
        onPress();
      }}
      style={[styles.card, p.style, style]}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * "attend" and its mark — a small ring, the breathing form at rest — in the place Daisy puts
 * its wordmark and flower.
 */
export function Wordmark({ tone, size = 22, style }: { tone?: 'onImage'; size?: number; style?: StyleProp<ViewStyle> }) {
  const color = useColors();
  const ink = tone === 'onImage' ? color.onImage : color.text;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-start' }, style]} accessibilityRole="header" accessibilityLabel="Attend">
      <Text style={{ color: ink, fontSize: size, lineHeight: size * 1.15, fontWeight: '500', letterSpacing: -size * 0.045, fontFamily: type.body.fontFamily }}>attend</Text>
      <View style={{ width: size * 0.36, height: size * 0.36, borderRadius: size, borderWidth: Math.max(1.5, size * 0.07), borderColor: ink, marginLeft: size * 0.06, marginTop: size * 0.08 }} />
    </View>
  );
}

export function SampleBadge() {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.badge} accessibilityLabel="Sample session">
      <Txt variant="caption" tone="tertiary" style={{ fontSize: 10, letterSpacing: 0.6 }}>
        SAMPLE
      </Txt>
    </View>
  );
}

const makeStyles = (color: Palette) =>
  StyleSheet.create({
  primary: {
    minHeight: 60,
    borderRadius: radius.s,
    backgroundColor: color.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingVertical: space.m,
  },
  quiet: {
    minHeight: HIT,
    justifyContent: 'center',
    paddingHorizontal: space.s,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: space.xl,
    gap: space.m,
  },
  segmented: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: radius.s,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: color.surface,
    alignSelf: 'center',
  },
  segment: {
    minHeight: 38,
    minWidth: 76,
    paddingHorizontal: space.l,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: space.m,
    minHeight: 50,
    paddingLeft: space.l,
    paddingRight: space.m,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: color.hairline,
    backgroundColor: color.surface,
  },
  chipOn: {
    backgroundColor: color.accent,
    borderColor: color.accent,
  },
  chipDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.hairline,
  },
  chipDotOn: {
    backgroundColor: color.onAccent,
    borderWidth: 5,
    borderColor: color.text,
  },
  card: {
    borderRadius: radius.m,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    overflow: 'hidden',
  },
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
});

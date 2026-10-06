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
import { color, HIT, radius, space, type, type TypeVariant } from './theme';

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

const TONES = {
  primary: color.text,
  secondary: color.textSecondary,
  tertiary: color.textTertiary,
  inverse: color.onAccent,
};

/** System type, scaled with Dynamic Type (large titles capped so layouts hold). */
export function Txt({ variant = 'body', tone = 'primary', align, style, maxFontSizeMultiplier, ...rest }: TxtProps) {
  const cap = maxFontSizeMultiplier ?? (variant === 'display' || variant === 'title' ? 1.35 : 2);
  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={cap}
      style={[type[variant], { color: TONES[tone], textAlign: align }, style]}
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

/** The one big, light button. There is usually only one per screen. */
export function PrimaryButton({ label, detail, style, onPress, ...rest }: ButtonProps) {
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
      <Txt variant="headline" tone="inverse" style={{ fontSize: 18 }}>
        {label}
      </Txt>
      {detail ? (
        <Txt variant="footnote" tone="inverse" style={{ opacity: 0.6, marginTop: 2 }}>
          {detail}
        </Txt>
      ) : null}
    </AnimatedPressable>
  );
}

/** A quiet text button. */
export function QuietButton({ label, style, onPress, tone = 'secondary', ...rest }: ButtonProps & { tone?: 'primary' | 'secondary' }) {
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
};

export function Icon({ name, size = 20, tint = color.text, weight = 'regular' }: { name: string; size?: number; tint?: string; weight?: SymbolViewProps['weight'] }) {
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
  tint = color.text,
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
    <Txt variant="caption" tone="tertiary" accessibilityRole="header" style={[{ textTransform: 'uppercase', marginBottom: space.m }, style]}>
      {children}
    </Txt>
  );
}

export function Hairline({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: color.hairline }, style]} />;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View accessibilityRole="tablist" style={[styles.segmented, style]}>
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
            style={[styles.segment, selected && { backgroundColor: color.surfaceStrong }]}
          >
            <Txt variant="footnote" tone={selected ? 'primary' : 'tertiary'} style={{ fontWeight: '500' }}>
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

export function SampleBadge() {
  return (
    <View style={styles.badge} accessibilityLabel="Sample session">
      <Txt variant="caption" tone="tertiary" style={{ fontSize: 10, letterSpacing: 0.6 }}>
        SAMPLE
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  primary: {
    minHeight: 64,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xxl,
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
    padding: 3,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    alignSelf: 'center',
  },
  segment: {
    minHeight: 38,
    minWidth: 76,
    paddingHorizontal: space.l,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: space.m,
    minHeight: 52,
    paddingLeft: space.xl,
    paddingRight: space.l,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceStrong,
  },
  chipOn: {
    backgroundColor: color.text,
  },
  chipDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  chipDotOn: {
    backgroundColor: color.onAccent,
    borderWidth: 5,
    borderColor: color.text,
  },
  card: {
    borderRadius: radius.l,
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

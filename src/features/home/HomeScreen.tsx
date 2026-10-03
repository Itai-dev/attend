import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { analyzeJourney } from '@/domain/journey';
import type { SessionType } from '@/domain/types';
import { haptic, IconButton, PrimaryButton, SectionLabel, Txt } from '@/design/components';
import { color, HIT, radius, space } from '@/design/theme';
import { SESSION_TYPE_LABELS } from '@/engine/phases';
import { BreathingField } from '@/viz/BreathingField';
import { greeting } from '../shared/format';

/**
 * Practice. One clear thing to do: begin. A handful of contexts below it,
 * and — if Journey has found something — one sentence about lately.
 * No numbers, no streaks, no library.
 */

const TYPES: SessionType[] = ['notice', 'flare', 'sleep', 'fear'];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { sessions } = useData();
  const [type, setType] = useState<SessionType>('notice');
  const lately = useMemo(() => analyzeJourney(sessions).insights[0]?.homeLine, [sessions]);
  const orb = Math.min(width - space.xl * 2, 300);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space.s, paddingBottom: insets.bottom + 110, paddingHorizontal: space.xl }}
    >
      <View style={styles.header}>
        <Txt variant="caption" tone="tertiary" style={styles.wordmark} accessibilityRole="header">
          ATTEND
        </Txt>
        <IconButton icon="gearshape" label="Settings" onPress={() => router.push('/settings')} tint={color.textSecondary} />
      </View>

      <Animated.View entering={FadeIn.duration(1200)} style={{ alignItems: 'center', marginTop: space.l }}>
        <BreathingField width={orb} height={orb} mode="idle" dim={0.85} />
      </Animated.View>

      <Txt variant="title" align="center" style={{ marginTop: space.l }}>
        {greeting()}
      </Txt>
      <Txt variant="callout" tone="secondary" align="center" style={{ marginTop: space.s, marginBottom: space.xl }}>
        A few minutes, eyes closed. Just talk.
      </Txt>

      <PrimaryButton
        label="Begin a session"
        detail={`${SESSION_TYPE_LABELS[type].detail} · Eyes closed`}
        onPress={() => router.push({ pathname: '/session', params: { type } })}
      />

      <View style={{ marginTop: space.xl }} accessibilityRole="radiogroup">
        {TYPES.map((t) => {
          const selected = t === type;
          return (
            <Pressable
              key={t}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={SESSION_TYPE_LABELS[t].title}
              onPress={() => {
                if (!selected) haptic('select');
                setType(t);
              }}
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
            >
              <View style={[styles.dot, selected && styles.dotOn]} />
              <Txt variant="body" tone={selected ? 'primary' : 'secondary'}>
                {SESSION_TYPE_LABELS[t].title}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      {lately ? (
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens Journey"
          onPress={() => router.navigate('/journey')}
          style={({ pressed }) => [styles.lately, { opacity: pressed ? 0.7 : 1 }]}
        >
          <SectionLabel>Lately</SectionLabel>
          <Txt variant="title2" style={{ fontWeight: '300' }}>
            {lately}
          </Txt>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: HIT,
  },
  wordmark: {
    letterSpacing: 3.2,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    minHeight: HIT + 4,
    paddingHorizontal: space.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.2,
    borderColor: color.textTertiary,
  },
  dotOn: {
    backgroundColor: color.text,
    borderColor: color.text,
  },
  lately: {
    marginTop: space.xxl,
    padding: space.xl,
    borderRadius: radius.l,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
  },
});

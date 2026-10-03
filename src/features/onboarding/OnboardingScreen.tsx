import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import type { BodyMapState } from '@/domain/types';
import { PrimaryButton, QuietButton, Txt } from '@/design/components';
import { color, space } from '@/design/theme';
import { BodyField } from '@/viz/BodyField';
import { BreathingField, type BreathMode } from '@/viz/BreathingField';

/**
 * Four short screens. What it is, how it works, what you get — and the one
 * thing that must be understood before beginning: this is for familiar
 * sensations, not for deciding whether a new one is serious.
 */

const DEMO_MAP: BodyMapState = {
  sensations: [
    {
      id: 'demo',
      region: 'neck',
      side: 'left',
      descriptors: ['pulling', 'tight'],
      shape: 'focused',
      movement: { type: 'moving', direction: 'up', destinationRegion: 'head_back' },
      userLanguage: [],
      primary: true,
    },
  ],
};

const PAGES: Array<{ title: string; body: string; visual: BreathMode | 'body' | 'none' }> = [
  {
    title: 'A different way to meet pain.',
    body: 'Guided voice sessions help you pay attention to familiar chronic sensations with curiosity, instead of immediately reacting to them.',
    visual: 'idle',
  },
  {
    title: 'Close your eyes.\nTalk naturally.',
    body: 'The guide listens to what you’re feeling and adapts the practice as you go. No tapping, no typing. Put the phone down and speak.',
    visual: 'listening',
  },
  {
    title: 'Your body map evolves with you.',
    body: 'After each session, see a visual interpretation of the sensations you described, and how they moved or changed.',
    visual: 'body',
  },
  {
    title: 'Before you begin.',
    body: 'Attend is for familiar, long-standing sensations. It isn’t a diagnostic tool, and it can’t tell whether a symptom is safe.\n\nIf something is new, unexplained, getting worse quickly, or feels like an emergency, contact a medical professional instead.',
    visual: 'none',
  },
];

export function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { setPrefs } = useData();
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const visual = Math.min(width - space.xxl * 2, height * 0.38);
  const last = page === PAGES.length - 1;

  const go = (i: number) => {
    scroller.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };

  const finish = async () => {
    await setPrefs({ onboarded: true });
    router.replace('/');
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== page) setPage(i);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + space.l }]}>
      <View style={styles.skipRow}>{!last ? <QuietButton label="Skip" onPress={() => go(PAGES.length - 1)} /> : <View style={{ height: 44 }} />}</View>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={32}
        style={{ flex: 1 }}
      >
        {PAGES.map((p, i) => (
          <View key={i} style={{ width, paddingHorizontal: space.xl }}>
            <View style={{ height: visual + space.xl, alignItems: 'center', justifyContent: 'center' }}>
              {Math.abs(i - page) <= 1 ? (
                p.visual === 'body' ? (
                  <BodyField map={DEMO_MAP} view="back" width={visual * 0.8} height={visual} />
                ) : p.visual === 'none' ? null : (
                  <BreathingField width={visual} height={visual} mode={p.visual} dim={0.9} />
                )
              ) : null}
            </View>
            <Txt variant="display" accessibilityRole="header">
              {p.title}
            </Txt>
            <Txt variant="body" tone="secondary" style={{ marginTop: space.l }}>
              {p.body}
            </Txt>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}>
          {PAGES.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
        <PrimaryButton label={last ? 'I understand' : 'Continue'} onPress={() => (last ? finish() : go(page + 1))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  skipRow: { alignItems: 'flex-end', paddingHorizontal: space.l },
  footer: { paddingHorizontal: space.xl, gap: space.xl },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.hairline },
  dotOn: { backgroundColor: color.text },
});

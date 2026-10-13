import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { EMPTY_PROGRAM, markRead, programDay, WEEKS } from '@/domain/program';
import { haptic, IconButton, PrimaryButton, QuietButton, Txt } from '@/design/components';
import { color, radius, space } from '@/design/theme';
import { BreathingField } from '@/viz/BreathingField';

/**
 * A lesson: a few short cards, one idea each, then straight into the day's practice.
 * Education alone barely changes pain; paired with practice it does better
 * (docs/RESEARCH.md §2), so the last card's button is the practice, not "done".
 */
export function LessonScreen() {
  const { day: dayParam } = useLocalSearchParams<{ day: string }>();
  const day = programDay(Number(dayParam) || 1);
  const insets = useSafeAreaInsets();
  const { prefs, setPrefs } = useData();
  const [i, setI] = useState(0);
  const cards = day.lesson.cards;
  const card = cards[i];
  const last = i === cards.length - 1;

  const finish = async () => {
    await setPrefs({ program: markRead(prefs.program ?? EMPTY_PROGRAM, day.day) });
    router.replace({ pathname: '/before', params: { day: String(day.day) } });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.m, paddingBottom: insets.bottom + space.l }]}>
      <View style={styles.bars} accessibilityLabel={`Card ${i + 1} of ${cards.length}`}>
        {cards.map((_, k) => (
          <View key={k} style={[styles.bar, k <= i && { backgroundColor: color.text }]} />
        ))}
      </View>
      <View style={styles.top}>
        <Txt variant="footnote" tone="tertiary">
          Day {day.day} · Week {day.week} · {WEEKS[day.week].name}
        </Txt>
        <IconButton icon="xmark" label="Close" onPress={() => router.back()} tint={color.textSecondary} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {i === 0 ? (
          <View style={{ alignItems: 'center', marginBottom: space.l }}>
            <BreathingField width={160} height={160} mode="idle" dim={0.8} />
          </View>
        ) : null}
        {i === 0 ? (
          <Txt variant="title" accessibilityRole="header">
            {day.lesson.title}
          </Txt>
        ) : null}
        <Animated.View key={i} entering={FadeIn.duration(500)} style={{ gap: space.l, marginTop: space.l }}>
          {card.text.map((p) => (
            <Txt key={p} variant="body" style={{ fontSize: 19, lineHeight: 28 }}>
              {p}
            </Txt>
          ))}
          {card.notice ? (
            <View style={styles.notice}>
              <Txt variant="caption" style={{ color: color.practice, letterSpacing: 1.2 }}>
                NOTICE
              </Txt>
              <Txt variant="callout" style={{ marginTop: space.xs }}>
                {card.notice}
              </Txt>
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        {last ? (
          <PrimaryButton label="Start the practice" detail={`${day.practice.title} · ${day.practice.minutes} min`} onPress={finish} />
        ) : (
          <PrimaryButton
            label="Next"
            onPress={() => {
              haptic('select');
              setI(i + 1);
            }}
          />
        )}
        {i > 0 ? <QuietButton label="Back" style={{ alignSelf: 'center' }} onPress={() => setI(i - 1)} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0C14' },
  bars: { flexDirection: 'row', gap: 4, paddingHorizontal: space.xl },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(242,240,235,0.2)' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.xl, paddingRight: space.s },
  body: { flexGrow: 1, paddingHorizontal: space.xl, paddingTop: space.l, paddingBottom: space.xxl },
  notice: { padding: space.l, borderRadius: radius.m, backgroundColor: color.practiceSoft },
  footer: { paddingHorizontal: space.xl, gap: space.s },
});

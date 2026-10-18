import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { EMPTY_PROGRAM, markRead, programDay, WEEKS } from '@/domain/program';
import { haptic, IconButton, PrimaryButton, QuietButton, Txt } from '@/design/components';
import { radius, space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';
import { Photo } from '@/design/Photo';
import { dayPlan, startPractice } from '../shared/start';

/**
 * A lesson: a few short cards, one idea each, then straight into the day's practice.
 * Education alone barely changes pain; paired with practice it does better
 * (docs/RESEARCH.md §2), so the last card's button is the practice, not "done".
 */
export function LessonScreen() {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const { day: dayParam } = useLocalSearchParams<{ day: string }>();
  const day = programDay(Number(dayParam) || 1);
  const insets = useSafeAreaInsets();
  const { prefs, setPrefs, checkIns } = useData();
  const [i, setI] = useState(0);
  const cards = day.lesson.cards;
  const card = cards[i];
  const last = i === cards.length - 1;

  const finish = async () => {
    haptic('soft');
    await setPrefs({ program: markRead(prefs.program ?? EMPTY_PROGRAM, day.day) });
    // Straight into the practice: the lesson's last line is the invitation, and a settings
    // screen between them broke the thread (Before stays reachable from Today's "adjust").
    startPractice(dayPlan(day.day, { prefs, checkIns }), 'replace');
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
          <Photo scene="dawn" height={200} radius={radius.s} style={{ marginBottom: space.xl }} />
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
          <PrimaryButton label="begin the practice" detail={`${day.practice.minutes} min · find a comfortable place, then close your eyes`} onPress={finish} />
        ) : (
          <PrimaryButton
            label="next"
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

const makeStyles = (color: Palette) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgElevated },
  bars: { flexDirection: 'row', gap: 4, paddingHorizontal: space.xl },
  bar: { flex: 1, height: 2, borderRadius: 1, backgroundColor: color.hairline },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.xl, paddingRight: space.s },
  body: { flexGrow: 1, paddingHorizontal: space.xl, paddingTop: space.l, paddingBottom: space.xxl },
  notice: { padding: space.l, borderRadius: radius.m, backgroundColor: color.practiceSoft },
  footer: { paddingHorizontal: space.xl, gap: space.s },
});

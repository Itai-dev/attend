import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useData } from '@/data/store';
import { firstWeekCard, NONE_REPLY, NOT_NOW, SIGN_EXTRAS, SIGNS, SIGNS_NOTE, SIGNS_PROMPT, toggleSign, type SignAnswer } from '@/domain/firstWeek';
import { Chip, OutlineButton, QuietButton, Txt } from '@/design/components';
import { space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';

/**
 * "your first week" (docs/studio/r2-copy.md §3): what the person did in their first seven
 * days, in their own taps, and one optional question about Day 4's signs. Put away with done,
 * and never shown again. The answer to the question is kept and feeds nothing.
 */
export function FirstWeekCard({ now, tz }: { now: number; tz: number }) {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const { sessions, prefs, setPrefs } = useData();
  const program = prefs.program;
  const card = useMemo(() => (program ? firstWeekCard({ sessions, program, now, tz }) : undefined), [sessions, program, now, tz]);
  const [picked, setPicked] = useState<SignAnswer[]>([]);
  if (!card) return null;
  // Asked once: once skipped (or answered), the question doesn't come back.
  const asking = !prefs.signs;

  const done = () => {
    const at = Date.now();
    // Done without an answer is a skip, not a "none": nothing is read into silence.
    const signs = prefs.signs ?? (picked.length ? { at, signs: picked } : { at, skipped: true as const });
    setPrefs({ firstWeekDone: at, signs });
  };

  return (
    <Animated.View entering={FadeIn.duration(700)} exiting={FadeOut.duration(300)} style={styles.card}>
      <Txt variant="caption" style={{ color: color.practice, letterSpacing: 1.4 }}>
        {card.kicker}
      </Txt>
      <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.s }}>
        {card.title}
      </Txt>
      {card.lines.length ? (
        <View style={{ marginTop: space.l, gap: space.xs }}>
          {card.lines.map((l) => (
            <Txt key={l} variant="body">
              {l}
            </Txt>
          ))}
        </View>
      ) : null}
      <Txt variant="callout" tone="secondary" style={{ marginTop: space.l }}>
        {card.closing}
      </Txt>

      {asking ? (
        <View style={styles.question}>
          <Txt variant="headline">{SIGNS_PROMPT}</Txt>
          <View style={{ marginTop: space.m, gap: space.s }}>
            {SIGNS.map((s) => (
              <Chip key={s.id} label={s.label} selected={picked.includes(s.id)} onPress={() => setPicked(toggleSign(picked, s.id))} style={styles.wide} />
            ))}
            <View style={styles.pair}>
              {SIGN_EXTRAS.map((s) => (
                <Chip key={s.id} label={s.label} selected={picked.includes(s.id)} onPress={() => setPicked(toggleSign(picked, s.id))} style={styles.half} />
              ))}
            </View>
          </View>
          {picked.includes('none') ? (
            <Animated.View entering={FadeIn.duration(500)}>
              <Txt variant="callout" style={{ marginTop: space.m }}>
                {NONE_REPLY}
              </Txt>
            </Animated.View>
          ) : null}
          {/* After any answer, so a ticked sign never reads as a result (round 3, researcher). */}
          {picked.length ? (
            <Animated.View entering={FadeIn.duration(500)}>
              <Txt variant="footnote" tone="secondary" style={{ marginTop: space.m }}>
                {SIGNS_NOTE}
              </Txt>
            </Animated.View>
          ) : null}
          <View style={styles.askFoot}>
            <Txt variant="caption" tone="tertiary" style={{ flex: 1 }}>
              Optional.
            </Txt>
            {picked.length === 0 ? (
              <QuietButton label={NOT_NOW} onPress={() => setPrefs({ signs: { at: Date.now(), skipped: true } })} style={{ paddingHorizontal: 0 }} />
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.foot}>
        {card.footnote ? (
          <Txt variant="footnote" tone="tertiary" style={{ flex: 1 }}>
            {card.footnote}
          </Txt>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <OutlineButton label="done" onPress={done} />
      </View>
    </Animated.View>
  );
}

const makeStyles = (color: Palette) =>
  StyleSheet.create({
    // Flat on the page between hairlines, like the rest of Today (studio round 1: no boxed
    // cards); the kicker and the done button are what mark it as something to put away.
    card: {
      marginTop: space.xxl,
      paddingVertical: space.xl,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: color.hairline,
    },
    question: { marginTop: space.xl, paddingTop: space.xl, borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.hairline },
    wide: { alignSelf: 'stretch', justifyContent: 'space-between' },
    pair: { flexDirection: 'row', gap: space.s },
    half: { flex: 1, alignSelf: 'auto', justifyContent: 'space-between' },
    askFoot: { flexDirection: 'row', alignItems: 'center', marginTop: space.m, minHeight: 32 },
    foot: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginTop: space.xl },
  });

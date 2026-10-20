import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { currentTz, latestPlace, PAIN_END_HIGH, PAIN_END_LOW, PAIN_MAX, painLabel, WHERE_REGIONS as WHERE } from '@/domain/checkin';
import { newId } from '@/domain/ids';
import { REGIONS } from '@/domain/regions';
import type { BodyRegion, Place } from '@/domain/types';
import { Chip, haptic, IconButton, PrimaryButton, SectionLabel, Txt } from '@/design/components';
import { HIT, radius, space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';

/**
 * The check-in, from Pattern: how much it hurts right now, and where. Pain is the only
 * required answer; where is offered, never demanded, and a check-in without it is not
 * incomplete anywhere.
 *
 * It is never attached to a session. Asked before and after each practice, the number turns
 * every session into a test the pain can fail.
 *
 * The places are Attend's own regions, so the place a check-in names is the place a guided
 * session focuses on, in the same words.
 *
 * Round 5: the save button sat below the fold, and a check-in saved with no sign it had. Save
 * now stays in a footer that never scrolls away, and saving returns to where it was opened
 * (Today, or Progress) with `saved=1`, which that screen shows as a quiet "saved".
 */


export function CheckinScreen() {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { saveCheckIn, checkIns, prefs } = useData();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [pain, setPain] = useState<number | null>(null);
  // Where it hurt is usually where it hurt last time: the latest check-in's one place, or the
  // one named in the welcome. Pre-selected, never hidden: it's on screen to change or clear,
  // and only what is selected when Save is pressed is recorded.
  const [places, setPlaces] = useState<BodyRegion[]>(() => {
    const own = checkIns.filter((c) => !c.isSample);
    const region = (latestPlace(own) ?? prefs.place)?.region;
    return region && WHERE.includes(region) ? [region] : [];
  });
  const [saving, setSaving] = useState(false);

  const toggle = (r: BodyRegion) => {
    setPlaces((p) => (p.includes(r) ? p.filter((x) => x !== r) : r === 'whole_body' ? ['whole_body'] : [...p.filter((x) => x !== 'whole_body'), r]));
  };

  const save = async () => {
    if (pain === null || saving) return;
    setSaving(true);
    const chosen: Place[] = places.map((region) => ({ region }));
    await saveCheckIn({
      id: newId('c_'),
      at: Date.now(),
      tz: currentTz(),
      pain,
      // The question was on screen, so nothing chosen is an answer ([]), not "never asked".
      places: chosen,
    });
    haptic('soft');
    // Back to the screen it was opened from, past the modal, with the word that it saved.
    router.dismissTo({ pathname: from === 'progress' ? '/progress' : '/', params: { saved: '1' } });
  };

  return (
    <View style={styles.root}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + space.l, paddingBottom: space.xl, paddingHorizontal: space.xl }}>
        <View style={styles.top}>
          <IconButton icon="xmark" label="Close" onPress={() => router.back()} tint={color.textSecondary} />
        </View>

        <Txt variant="display" accessibilityRole="header">
          How much does it hurt right now?
        </Txt>

        <View style={styles.readout} accessibilityLiveRegion="polite">
          <Txt variant="title" style={{ fontSize: 44, lineHeight: 52 }}>
            {pain === null ? '–' : pain}
          </Txt>
          {/* The scale's word, glanced at beside the number: lowercase, like every label. */}
          <Txt variant="title2" tone="secondary" style={{ textTransform: 'lowercase' }}>
            {pain === null ? 'choose a number' : painLabel(pain)}
          </Txt>
        </View>

        <View style={styles.scale} accessibilityRole="radiogroup" accessibilityLabel="Pain, from 0, no pain, to 10, most intense">
          {Array.from({ length: PAIN_MAX + 1 }, (_, n) => {
            const on = n === pain;
            return (
              <Pressable
                key={n}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${n}, ${painLabel(n)}`}
                onPress={() => {
                  haptic('select');
                  setPain(n);
                }}
                style={({ pressed }) => [styles.step, on && styles.stepOn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Txt variant="headline" tone={on ? 'inverse' : 'primary'}>
                  {n}
                </Txt>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.ends}>
          <Txt variant="footnote" tone="tertiary">
            0 · {PAIN_END_LOW}
          </Txt>
          <Txt variant="footnote" tone="tertiary">
            {PAIN_END_HIGH} · 10
          </Txt>
        </View>

        <SectionLabel style={{ marginTop: space.xxl }}>Where, if you like</SectionLabel>
        <View style={styles.where}>
          {WHERE.map((r) => (
            <Chip key={r} label={REGIONS[r].label} selected={places.includes(r)} onPress={() => toggle(r)} />
          ))}
        </View>
        <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.m }}>
          Name one place and your next practice focuses there.
        </Txt>
      </ScrollView>

      {/* Never scrolls away: the one thing to do once a number is chosen is always in reach. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.l }]}>
        <PrimaryButton
          label="save"
          style={{ opacity: pain === null ? 0.4 : 1 }}
          disabled={pain === null || saving}
          accessibilityState={{ disabled: pain === null || saving }}
          onPress={save}
        />
        <Txt variant="footnote" tone="tertiary" align="center" style={{ marginTop: space.m }}>
          Stays on this iPhone. Only you see it.
        </Txt>
      </View>
    </View>
  );
}

const makeStyles = (color: Palette) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  top: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: space.s },
  readout: { flexDirection: 'row', alignItems: 'baseline', gap: space.m, marginTop: space.xl },
  scale: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.xl },
  // Six to a row across the full width, nearly square (Daisy): the 0–5 row lines up with the
  // labels under it, where fixed circles left a ragged edge and "10" far from "most intense".
  step: {
    flexBasis: '14%',
    flexGrow: 1,
    maxWidth: '15.5%',
    height: HIT + 4,
    borderRadius: radius.s,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
  },
  // The accent, not the ink: the chosen number is the screen's filled control, and at night
  // the accent is the softer grey rather than a white square.
  stepOn: { backgroundColor: color.accent, borderColor: color.accent },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.m },
  where: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.l,
    backgroundColor: color.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.hairline,
  },
});

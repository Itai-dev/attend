import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useData } from '@/data/store';
import { currentTz, formatPain, MIN_DAYS_FOR_PICTURE, PAIN_MAX, type CheckIn } from '@/domain/checkin';
import { milestones, practiceStats } from '@/domain/engagement';
import { EMPTY_PROGRAM, PROGRAM_DAYS, PROGRAM_TITLE } from '@/domain/program';
import { buildProgress, PROGRESS_MEANING, type ProgressDay } from '@/domain/progress';
import { REGIONS } from '@/domain/regions';
import { Card, Hairline, Icon, PrimaryButton, TitledScroll, Txt } from '@/design/components';
import { color, HIT, radius, space } from '@/design/theme';
import { ProgramPath } from '../program/ProgramPath';
import { sessionDate } from '../shared/format';

/**
 * Progress: the 28-day path first, then two halves that never mix. What you did — practice days, minutes, lessons,
 * milestones, the moments you saved — is celebrated. The pain record is shown, not judged:
 * pain over weeks, beside the days practised. The picture is the person's to read;
 * the screen draws it and says what it does not mean, and never says which way it went.
 * Colour stays neutral: no hue here carries a verdict.
 */

const CHART_H = 140;

/** A bold section title, as on a Spotify shelf. */
function Section({ children, first }: { children: string; first?: boolean }) {
  return (
    <Txt variant="title2" accessibilityRole="header" style={{ marginTop: first ? space.s : space.xxl, marginBottom: space.m }}>
      {children}
    </Txt>
  );
}

function Chart({ days }: { days: ProgressDay[] }) {
  const [w, setW] = useState(0);
  const step = days.length > 1 ? w / (days.length - 1) : 0;
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const label = `Pain over the last ${days.length} days. ${days.filter((d) => d.peak !== undefined).length} days with a check-in, ${days.filter((d) => d.practised).length} days practised.`;
  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={label}>
      <View style={{ height: CHART_H }}>
        {[0, 5, 10].map((v) => (
          <View key={v} style={[styles.grid, { top: CHART_H - (v / PAIN_MAX) * CHART_H }]}>
            <Txt variant="caption" tone="tertiary" style={styles.gridLabel}>
              {v}
            </Txt>
          </View>
        ))}
        {w > 0
          ? days.map((d, i) =>
              d.peak === undefined ? null : (
                <View key={d.day} style={[styles.dot, { left: i * step - 3.5, top: CHART_H - (d.peak / PAIN_MAX) * CHART_H - 3.5 }]} />
              ),
            )
          : null}
      </View>
      <View style={styles.practiceRow}>
        {w > 0 ? days.map((d, i) => (d.practised ? <View key={d.day} style={[styles.tick, { left: i * step - 1.5 }]} /> : null)) : null}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { position: 'relative' }]} />
          <Txt variant="footnote" tone="tertiary">
            Highest pain that day
          </Txt>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.tick, { position: 'relative' }]} />
          <Txt variant="footnote" tone="tertiary">
            Practised
          </Txt>
        </View>
      </View>
    </View>
  );
}

function placesText(c: CheckIn): string | undefined {
  if (!c.places || c.places.length === 0) return undefined;
  return c.places.map((p) => REGIONS[p.region].label).join(', ');
}

export function ProgressScreen() {
  const { checkIns, sessions, prefs, deleteCheckIn } = useData();
  const tz = currentTz();
  const progress = useMemo(() => buildProgress(checkIns, sessions, { tz }), [checkIns, sessions, tz]);
  const program = prefs.program ?? EMPTY_PROGRAM;
  const stats = useMemo(() => practiceStats(sessions, Date.now(), tz), [sessions, tz]);
  const marks = useMemo(() => milestones({ sessions, program, moments: prefs.moments?.length ?? 0, tz }), [sessions, program, prefs.moments, tz]);
  const moments = (prefs.moments ?? []).slice(0, 5);
  const recent = checkIns.filter((c) => !c.isSample).slice(0, 12);

  const remove = (c: CheckIn) => {
    const go = () => void deleteCheckIn(c.id);
    if (Platform.OS === 'web') return go();
    Alert.alert('Delete this check-in?', `${formatPain(c.pain)}, ${sessionDate(c.at)}. It will be removed from this iPhone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <TitledScroll title="Progress">
      {/* The program path leads: what is done and what comes next (three tabs, 21 Oct 2026). */}
      <Section first>{`${PROGRAM_TITLE} · ${PROGRAM_DAYS} days`}</Section>
      <ProgramPath />

      <Section>Your practice</Section>
      <View style={styles.tiles}>
        {[
          [stats.days, stats.days === 1 ? 'practice day' : 'practice days'],
          [stats.minutes, 'minutes'],
          [program.read.length, program.read.length === 1 ? 'lesson' : 'lessons'],
        ].map(([n, label]) => (
          <View key={String(label)} style={styles.tile}>
            <Txt variant="display">{String(n)}</Txt>
            <Txt variant="footnote" tone="secondary">
              {String(label)}
            </Txt>
          </View>
        ))}
      </View>
      <View style={styles.marks} accessible accessibilityLabel={`Milestones: ${marks.filter((m) => m.earned).map((m) => m.label).join(', ') || 'none yet'}.`}>
        {marks.map((m) => (
          <View key={m.id} style={styles.mark}>
            <View style={[styles.badge, m.earned ? styles.badgeOn : styles.badgeOff]}>
              <Icon name="star.fill" size={16} tint={m.earned ? color.milestone : color.textTertiary} />
            </View>
            <Txt variant="caption" tone={m.earned ? 'secondary' : 'tertiary'} align="center" style={{ fontSize: 10, lineHeight: 12, fontWeight: '500', letterSpacing: 0 }}>
              {m.label}
            </Txt>
          </View>
        ))}
      </View>

      {prefs.goal || moments.length ? (
        <>
          <Section>{prefs.goal ? `Toward ${prefs.goal.toLowerCase()}` : 'Moments'}</Section>
          <Card style={{ padding: space.l, gap: space.m }}>
            {moments.length ? (
              moments.map((m) => (
                <View key={m.id} style={{ gap: 2 }}>
                  <Txt variant="callout">“{m.text}”</Txt>
                  <Txt variant="caption" tone="tertiary">
                    {sessionDate(m.at)}
                  </Txt>
                </View>
              ))
            ) : (
              <Txt variant="callout" tone="secondary">
                Steps you take and quieter moments you notice will gather here, in your words.
              </Txt>
            )}
            <Pressable accessibilityRole="button" onPress={() => router.push('/moment')} style={{ minHeight: 36, justifyContent: 'center' }}>
              <Txt variant="callout" style={{ color: color.milestone, fontWeight: '700' }}>
                Save a moment
              </Txt>
            </Pressable>
          </Card>
        </>
      ) : null}

      <Section>Your pain record</Section>
      <PrimaryButton label="Check in" detail="How much it hurts right now" onPress={() => router.push('/checkin')} />

      <Card style={styles.card}>
        <Txt variant="headline" style={{ marginBottom: space.l }}>
          Last 8 weeks
        </Txt>
        {progress.enough ? (
          <Chart days={progress.days} />
        ) : (
          <Txt variant="callout" tone="secondary">
            Not a picture yet. After check-ins on {MIN_DAYS_FOR_PICTURE} different days, your pain over the weeks appears here, beside the days you practised.
          </Txt>
        )}
        <Txt variant="callout" style={{ marginTop: space.l }}>
          {progress.summary}
        </Txt>
        {/* The sentence about what this is not belongs inside the card it qualifies (Pattern). */}
        <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.m }}>
          {PROGRESS_MEANING}
        </Txt>
      </Card>

      {recent.length ? (
        <>
          <Section>Check-ins</Section>
          <View style={styles.list}>
            {recent.map((c, i) => (
              <View key={c.id}>
                {i > 0 ? <Hairline style={{ marginLeft: space.l }} /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityHint="Asks before deleting"
                  onLongPress={() => remove(c)}
                  style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Txt variant="body" style={{ fontWeight: '500' }}>
                      {formatPain(c.pain)}
                    </Txt>
                    {placesText(c) ? (
                      <Txt variant="footnote" tone="secondary">
                        {placesText(c)}
                      </Txt>
                    ) : null}
                  </View>
                  <Txt variant="footnote" tone="tertiary">
                    {sessionDate(c.at)}
                  </Txt>
                </Pressable>
              </View>
            ))}
          </View>
          <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.m }}>
            Press and hold a check-in to delete it.
          </Txt>
        </>
      ) : null}
    </TitledScroll>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space.m, padding: space.l },
  grid: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: color.hairline },
  gridLabel: { position: 'absolute', right: 0, top: -16, fontSize: 10 },
  dot: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: color.text },
  practiceRow: { height: 14, marginTop: space.m },
  tick: { position: 'absolute', width: 3, height: 12, borderRadius: 2, backgroundColor: color.textTertiary },
  legend: { flexDirection: 'row', gap: space.xl, marginTop: space.m, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: HIT + 12, gap: space.m, paddingVertical: space.s, paddingHorizontal: space.l },
  list: { borderRadius: radius.m, backgroundColor: color.surface, overflow: 'hidden' },
  tiles: { flexDirection: 'row', gap: space.s },
  tile: { flex: 1, padding: space.m, paddingTop: space.l, gap: 2, borderRadius: radius.m, backgroundColor: color.surface },
  marks: { flexDirection: 'row', gap: space.xs, marginTop: space.l, padding: space.m, borderRadius: radius.m, backgroundColor: color.surface },
  mark: { flex: 1, alignItems: 'center', gap: space.xs },
  badge: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  badgeOn: { backgroundColor: color.milestoneSoft },
  badgeOff: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.hairline },
});

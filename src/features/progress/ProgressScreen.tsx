import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useData } from '@/data/store';
import { currentTz, dayKey, formatPain, MIN_DAYS_FOR_PICTURE, PAIN_MAX, type CheckIn } from '@/domain/checkin';
import { milestones, practiceStats } from '@/domain/engagement';
import { EMPTY_PROGRAM } from '@/domain/program';
import { buildProgress, PROGRESS_MEANING, type ProgressDay } from '@/domain/progress';
import { REGIONS } from '@/domain/regions';
import { Card, Hairline, Icon, PrimaryButton, SectionLabel, TitledScroll, Txt } from '@/design/components';
import { HIT, space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';
import { sessionDate } from '../shared/format';
import { ProgramPath } from '../shared/ProgramPath';

/**
 * Progress: the one place to look back. First the 28 days, filled in as they're done (this
 * was its own tab; one place is simpler). Then what you did — practice days, minutes,
 * lessons, milestones, the moments you saved — celebrated. Then the pain record, shown and
 * never judged: pain over weeks, beside the days practised, never mixed with the practice.
 * The picture is the person's to read; the screen says what it does not mean, and never
 * which way it went.
 * Colour stays neutral: no hue here carries a verdict.
 */

const CHART_H = 140;

function Chart({ days }: { days: ProgressDay[] }) {
  const styles = useStyles(makeStyles);
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
  const color = useColors();
  const styles = useStyles(makeStyles);
  const { checkIns, sessions, prefs, deleteCheckIn } = useData();
  const tz = currentTz();
  const progress = useMemo(() => buildProgress(checkIns, sessions, { tz }), [checkIns, sessions, tz]);
  const program = prefs.program ?? EMPTY_PROGRAM;
  const stats = useMemo(() => practiceStats(sessions, Date.now(), tz), [sessions, tz]);
  const marks = useMemo(() => milestones({ sessions, program, moments: prefs.moments?.length ?? 0, tz }), [sessions, program, prefs.moments, tz]);
  // What's been earned, and the one that comes next. A full row of greyed-out stars read as a
  // list of things not yet done; one next star is something to walk toward.
  const nextMark = marks.find((m) => !m.earned);
  const shownMarks = [...marks.filter((m) => m.earned), ...(nextMark ? [nextMark] : [])];
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
    <TitledScroll title="progress">
      <SectionLabel>your 28 days</SectionLabel>
      <ProgramPath program={program} todayKey={dayKey(Date.now(), tz)} />

      <SectionLabel style={{ marginTop: space.xxl }}>your practice</SectionLabel>
      {/* Three zeros before anything has happened say nothing; the numbers start with the first session. */}
      {stats.sessions > 0 ? (
        <View style={[styles.tiles, { marginBottom: space.xl }]}>
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
      ) : null}
      <View
        style={styles.marks}
        accessible
        accessibilityLabel={`Milestones: ${marks.filter((m) => m.earned).map((m) => m.label).join(', ') || 'none yet'}.${nextMark ? ` Next: ${nextMark.label}.` : ''}`}
      >
        {shownMarks.map((m) => (
          <View key={m.id} style={styles.mark}>
            <View style={[styles.badge, m.earned ? styles.badgeOn : styles.badgeOff]}>
              <Icon name="star.fill" size={16} tint={m.earned ? color.milestone : color.textTertiary} />
            </View>
            <Txt variant="footnote" tone={m.earned ? 'secondary' : 'tertiary'} align="center">
              {m.label}
            </Txt>
          </View>
        ))}
      </View>

      {prefs.goal || moments.length ? (
        <>
          <SectionLabel style={{ marginTop: space.xxl }}>{prefs.goal ? `Toward ${prefs.goal.toLowerCase()}` : 'Moments'}</SectionLabel>
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
            <Pressable accessibilityRole="button" onPress={() => router.push('/moment')} style={{ minHeight: HIT, justifyContent: 'center', alignSelf: 'flex-start' }}>
              <Txt variant="callout" style={{ color: color.milestone }}>
                Save a moment
              </Txt>
            </Pressable>
          </Card>
        </>
      ) : null}

      <SectionLabel style={{ marginTop: space.xxl }}>your pain record</SectionLabel>
      <PrimaryButton label="log pain now" detail="10 seconds · separate from practice" onPress={() => router.push('/checkin')} />

      <Card style={styles.card}>
        <SectionLabel>last 8 weeks</SectionLabel>
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
          <SectionLabel style={{ marginTop: space.xxl }}>check-ins</SectionLabel>
          <View>
            {recent.map((c, i) => (
              <View key={c.id}>
                {i > 0 ? <Hairline /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityHint="Asks before deleting"
                  onLongPress={() => remove(c)}
                  style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Txt variant="body">{formatPain(c.pain)}</Txt>
                    {placesText(c) ? (
                      <Txt variant="footnote" tone="tertiary">
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

const makeStyles = (color: Palette) =>
  StyleSheet.create({
  card: { marginTop: space.xl, padding: space.xl },
  grid: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: color.hairline },
  gridLabel: { position: 'absolute', right: 0, top: -16, fontSize: 10 },
  dot: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: color.text },
  practiceRow: { height: 14, marginTop: space.m },
  tick: { position: 'absolute', width: 3, height: 12, borderRadius: 2, backgroundColor: color.textTertiary },
  legend: { flexDirection: 'row', gap: space.xl, marginTop: space.m, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: HIT + 12, gap: space.m, paddingVertical: space.s },
  tiles: { flexDirection: 'row', gap: space.s },
  tile: { flex: 1, paddingTop: space.m, gap: space.xxs, borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.hairline },
  marks: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
  mark: { width: 76, alignItems: 'center', gap: space.xs },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  badgeOn: { backgroundColor: color.milestoneSoft },
  // The next milestone: a plain faint disc. No dashed outline — nothing here is "missing".
  badgeOff: { backgroundColor: color.surfaceStrong },
});

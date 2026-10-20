import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { useData } from '@/data/store';
import { currentTz, dayKey, formatPain, PAIN_MAX, type CheckIn } from '@/domain/checkin';
import { milestones, nextMilestone, practiceStats } from '@/domain/engagement';
import { postcards, postcardWeeks } from '@/domain/finish';
import { EMPTY_PROGRAM } from '@/domain/program';
import { buildProgress, PROGRESS_MEANING, whenToLookText, type Progress } from '@/domain/progress';
import { REGIONS } from '@/domain/regions';
import { Card, Hairline, Icon, OutlineButton, SectionLabel, SettingsGear, TitledScroll, Txt } from '@/design/components';
import { HIT, space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';
import { PostcardRows } from '../finish/Postcards';
import { sessionDate } from '../shared/format';
import { ProgramPath } from '../shared/ProgramPath';

/**
 * Progress: the one place to look back. People open it to ask "is this helping?" (Round 5),
 * so the pain record comes first: pain over the weeks, beside the days practiced, never mixed
 * with the practice, shown and never judged. Until there is a picture, the card says how close
 * it is, so the question has a path to an answer. Then what you did — practice days, minutes,
 * lessons, milestones, small wins — celebrated. Then the 28 days.
 * The picture is the person's to read; the screen says what it does not mean, and never
 * which way it went.
 * Colour stays neutral: no hue here carries a verdict.
 */

const CHART_H = 140;
/**
 * The scale's numbers sit in their own column to the right of the plot. Inside it, the latest
 * days — the ones people look at — landed on top of "5" and "10", and the last dot was cut in half.
 */
const AXIS_W = 22;

function Chart({ progress }: { progress: Progress }) {
  const styles = useStyles(makeStyles);
  const { days } = progress;
  const [w, setW] = useState(0);
  const plotW = Math.max(0, w - AXIS_W);
  const step = days.length > 1 ? plotW / (days.length - 1) : 0;
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const label = `Pain from ${progress.startLabel} to today. ${days.filter((d) => d.peak !== undefined).length} days with a check-in, ${days.filter((d) => d.practised).length} days practiced.`;
  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={label}>
      <View style={{ height: CHART_H }}>
        {[0, 5, 10].map((v) => (
          <View key={v} style={[styles.grid, { top: CHART_H - (v / PAIN_MAX) * CHART_H }]}>
            <Txt variant="caption" tone="tertiary" align="right" style={styles.gridLabel}>
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
      {/*
        The practice row is its own labelled strip under the chart, on the same days: side by
        side, never mixed. "days practiced" names it as a record of showing up, so a tick under
        a low dot doesn't read as the cause of it.
      */}
      <Txt variant="caption" tone="tertiary" style={styles.rowLabel}>
        days practiced
      </Txt>
      <View style={[styles.practiceRow, { width: plotW }]}>
        {w > 0 ? days.map((d, i) => (d.practised ? <View key={d.day} style={[styles.tick, { left: i * step - 1.5 }]} /> : null)) : null}
      </View>
      <View style={[styles.dates, { width: plotW }]}>
        <Txt variant="caption" tone="tertiary">
          {progress.startLabel}
        </Txt>
        <Txt variant="caption" tone="tertiary">
          {progress.endLabel}
        </Txt>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { position: 'relative' }]} />
          <Txt variant="footnote" tone="tertiary">
            highest pain that day
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
  const { saved } = useLocalSearchParams<{ saved?: string }>();
  const tz = currentTz();
  const progress = useMemo(() => buildProgress(checkIns, sessions, { tz }), [checkIns, sessions, tz]);
  const program = prefs.program ?? EMPTY_PROGRAM;
  const stats = useMemo(() => practiceStats(sessions, Date.now(), tz), [sessions, tz]);
  const marks = useMemo(() => milestones({ sessions, program, moments: prefs.moments?.length ?? 0, tz }), [sessions, program, prefs.moments, tz]);
  // What's been earned, and the one that comes next. A full row of greyed-out stars read as a
  // list of things not yet done; one next star is something to walk toward.
  // Quiet firsts (a return, a first night) are never offered as "next": a break is not a goal.
  const nextMark = nextMilestone(marks);
  const shownMarks = [...marks.filter((m) => m.earned), ...(nextMark ? [nextMark] : [])];
  // The places collection: a postcard for each program day done (domain/finish.ts), up to the week
  // in progress. Derived from the 28 days, so it has no storage of its own.
  const cards = useMemo(() => postcards(program), [program]);
  const placeWeeks = postcardWeeks(program);
  const earnedPlaces = cards.filter((c) => c.earned).length;
  const { width } = useWindowDimensions();
  // A zero is a count of nothing: "0 lessons" beside "3 practice days" reads as a gap to fill.
  const tiles = (
    [
      [stats.days, stats.days === 1 ? 'practice day' : 'practice days'],
      [stats.minutes, 'minutes'],
      [program.read.length, program.read.length === 1 ? 'lesson' : 'lessons'],
    ] as const
  ).filter(([n]) => n > 0);
  const moments = (prefs.moments ?? []).slice(0, 5);
  const recent = checkIns.filter((c) => !c.isSample).slice(0, 12);

  // A check-in saved from here comes back with ?saved=1: a quiet word, then gone. The record
  // card it lands on is the rest of the confirmation.
  useEffect(() => {
    if (saved !== '1') return;
    const t = setTimeout(() => router.setParams({ saved: undefined }), 4000);
    return () => clearTimeout(t);
  }, [saved]);

  const remove = (c: CheckIn) => {
    const go = () => void deleteCheckIn(c.id);
    if (Platform.OS === 'web') return go();
    Alert.alert('Delete this check-in?', `${formatPain(c.pain)}, ${sessionDate(c.at)}. It will be removed from this iPhone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: go },
    ]);
  };

  return (
    // The gear on every tab (Round 5): Settings was only findable from Today.
    <TitledScroll title="progress" right={<SettingsGear />}>
      {/* First, because "is this helping?" is what people open Progress to ask. */}
      <View style={styles.recordHead}>
        <SectionLabel style={{ marginBottom: 0 }}>your pain record</SectionLabel>
        {saved === '1' ? (
          <Txt variant="footnote" tone="secondary" accessibilityLiveRegion="polite">
            saved
          </Txt>
        ) : null}
      </View>
      <Card style={styles.card}>
        {progress.enough ? (
          <>
            <Chart progress={progress} />
            <Txt variant="callout" style={{ marginTop: space.l }}>
              {progress.summary}
            </Txt>
            {/* The sentence about what this is not belongs inside the card it qualifies (Pattern). */}
            <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.m }}>
              {PROGRESS_MEANING}
            </Txt>
          </>
        ) : (
          <Txt variant="callout" tone="secondary">
            {progress.untilPicture}
          </Txt>
        )}
        {/* "Is this helping?" gets a when, not a reading: no delta, no direction (round 5 retest). */}
        <Txt variant="footnote" tone="secondary" style={{ marginTop: space.m }}>
          {whenToLookText(program, dayKey(Date.now(), tz))}
        </Txt>
      </Card>
      {/* Secondary on purpose: the record is what's looked at here; logging is ten seconds, not the point of the screen. */}
      <OutlineButton label="log today’s pain" onPress={() => router.push({ pathname: '/checkin', params: { from: 'progress' } })} style={{ marginTop: space.l }} />

      <SectionLabel style={{ marginTop: space.xxxl }}>your practice</SectionLabel>
      {tiles.length ? (
        <View style={[styles.tiles, { marginBottom: space.xl }]}>
          {tiles.map(([n, label]) => (
            <View key={label} style={styles.tile}>
              <Txt variant="display">{String(n)}</Txt>
              <Txt variant="footnote" tone="secondary">
                {label}
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
            <Txt variant="footnote" tone={m.earned ? 'secondary' : 'tertiary'} align="center" style={{ textTransform: 'lowercase' }}>
              {m.label}
            </Txt>
          </View>
        ))}
      </View>

      {prefs.goal || moments.length ? (
        <>
          <SectionLabel style={{ marginTop: space.xxl }}>{prefs.goal ? `Toward ${prefs.goal.toLowerCase()}` : 'small wins'}</SectionLabel>
          <Card style={{ padding: space.l, gap: space.m }}>
            {moments.length ? (
              moments.map((m) => (
                <View key={m.id} style={{ gap: 2 }}>
                  <Txt variant="callout">“{m.text}”</Txt>
                  <Txt variant="caption" tone="tertiary" style={styles.lower}>
                    {sessionDate(m.at)}
                  </Txt>
                </View>
              ))
            ) : (
              <Txt variant="callout" tone="secondary">
                Small steps toward it, in your own words, gather here.
              </Txt>
            )}
            <Pressable accessibilityRole="button" onPress={() => router.push('/moment')} style={{ minHeight: HIT, justifyContent: 'center', alignSelf: 'flex-start' }}>
              <Txt variant="callout" style={{ color: color.milestone }}>
                note a small win
              </Txt>
            </Pressable>
          </Card>
        </>
      ) : null}

      <SectionLabel style={{ marginTop: space.xxxl }}>places</SectionLabel>
      <PostcardRows cards={cards.filter((c) => placeWeeks.includes(Math.ceil(c.day / 7) as 1 | 2 | 3 | 4))} width={Math.min(width, 560) - space.xl * 2} />
      <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.m }}>
        {earnedPlaces ? 'A place for each day of the program you practice.' : 'Each day of the program you practice adds a place here.'}
        {placeWeeks.length < 4 ? ` More arrive with week ${placeWeeks.length + 1}.` : ''}
      </Txt>

      <SectionLabel style={{ marginTop: space.xxxl }}>your 28 days</SectionLabel>
      <ProgramPath program={program} todayKey={dayKey(Date.now(), tz)} />

      {recent.length ? (
        <>
          <SectionLabel style={{ marginTop: space.xxxl }}>check-ins</SectionLabel>
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
                    {/* A glanced row, so lowercase: "8 · severe", "today · evening". The words are the scale's own. */}
                    <Txt variant="body" style={styles.lower}>
                      {formatPain(c.pain)}
                    </Txt>
                    {placesText(c) ? (
                      <Txt variant="footnote" tone="tertiary" style={styles.lower}>
                        {placesText(c)}
                      </Txt>
                    ) : null}
                  </View>
                  <Txt variant="footnote" tone="tertiary" style={styles.lower}>
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
  lower: { textTransform: 'lowercase' },
  recordHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space.m },
  card: { padding: space.xl },
  grid: { position: 'absolute', left: 0, right: AXIS_W, height: StyleSheet.hairlineWidth, backgroundColor: color.hairline },
  gridLabel: { position: 'absolute', right: -AXIS_W, width: AXIS_W - 4, top: -8, fontSize: 10, lineHeight: 15 },
  dot: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: color.text },
  rowLabel: { marginTop: space.l, marginBottom: space.xs },
  practiceRow: { height: 14 },
  dates: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.s },
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

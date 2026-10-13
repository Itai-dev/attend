import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useData } from '@/data/store';
import { currentTz, formatPain, MIN_DAYS_FOR_PICTURE, PAIN_MAX, type CheckIn } from '@/domain/checkin';
import { buildProgress, PROGRESS_MEANING, type ProgressDay } from '@/domain/progress';
import { REGIONS } from '@/domain/regions';
import { Card, Hairline, PrimaryButton, SectionLabel, TitledScroll, Txt } from '@/design/components';
import { color, HIT, space } from '@/design/theme';
import { sessionDate } from '../shared/format';

/**
 * Progress: pain over weeks, beside the days practised. The picture is the person's to read;
 * the screen draws it and says what it does not mean, and never says which way it went.
 * Colour stays neutral: no hue here carries a verdict.
 */

const CHART_H = 140;

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
  const { checkIns, sessions, deleteCheckIn } = useData();
  const progress = useMemo(() => buildProgress(checkIns, sessions, { tz: currentTz() }), [checkIns, sessions]);
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
    <TitledScroll title="Progress" onBack={() => router.back()}>
      <PrimaryButton label="Check in" detail="How much it hurts right now" onPress={() => router.push('/checkin')} />

      <Card style={styles.card}>
        <SectionLabel>Last 8 weeks</SectionLabel>
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
          <SectionLabel style={{ marginTop: space.xxl }}>Check-ins</SectionLabel>
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

const styles = StyleSheet.create({
  card: { marginTop: space.xl, padding: space.xl },
  grid: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: color.hairline },
  gridLabel: { position: 'absolute', right: 0, top: -16, fontSize: 10 },
  dot: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: color.text },
  practiceRow: { height: 14, marginTop: space.m },
  tick: { position: 'absolute', width: 3, height: 12, borderRadius: 2, backgroundColor: color.textTertiary },
  legend: { flexDirection: 'row', gap: space.xl, marginTop: space.m, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: HIT + 12, gap: space.m, paddingVertical: space.s },
});

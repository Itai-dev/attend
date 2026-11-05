import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { PAIN_MAX } from '@/domain/checkin';
import type { ProgressDay } from '@/domain/progress';
import { Txt } from '@/design/components';
import { color, space } from '@/design/theme';
import { heCount, isHe } from '@/i18n';

/**
 * The pain record over weeks: the highest pain each day as a dot, the days practised as ticks
 * underneath. Drawn, never judged — no line, no trend, no colour that carries a verdict.
 */

const CHART_H = 140;

export function PainChart({ days }: { days: ProgressDay[] }) {
  const [w, setW] = useState(0);
  const step = days.length > 1 ? w / (days.length - 1) : 0;
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const checked = days.filter((d) => d.peak !== undefined).length;
  const practised = days.filter((d) => d.practised).length;
  const label = isHe()
    ? `הכאב ב־${days.length} הימים האחרונים. צ׳ק־אין: ${heCount(checked, 'יום אחד', 'ימים', 'יומיים')}. תרגול: ${heCount(practised, 'יום אחד', 'ימים', 'יומיים')}.`
    : `Pain over the last ${days.length} days. ${checked} days with a check-in, ${practised} days practised.`;
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
            {isHe() ? 'הכאב הגבוה ביותר באותו יום' : 'Highest pain that day'}
          </Txt>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.tick, { position: 'relative' }]} />
          <Txt variant="footnote" tone="tertiary">
            {isHe() ? 'תרגול' : 'Practised'}
          </Txt>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: color.hairline },
  gridLabel: { position: 'absolute', right: 0, top: -16, fontSize: 10 },
  dot: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: color.text },
  practiceRow: { height: 14, marginTop: space.m },
  tick: { position: 'absolute', width: 3, height: 12, borderRadius: 2, backgroundColor: color.textTertiary },
  legend: { flexDirection: 'row', gap: space.xl, marginTop: space.m, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.s },
});

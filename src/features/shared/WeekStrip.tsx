import { StyleSheet, View } from 'react-native';
import type { WeekStripDay } from '@/domain/engagement';
import { Txt } from '@/design/components';
import { color, space } from '@/design/theme';
import { heCount, tr } from '@/i18n';

/**
 * This week, Monday to Sunday: a filled dot for each practice day. A day without practice
 * is an empty dot, never a mark of failure; the future is fainter still. Nothing here
 * resets, so there is no streak to lose.
 */
export function WeekStrip({ days }: { days: WeekStripDay[] }) {
  const done = days.filter((d) => d.practised).length;
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={tr(
        `This week: practised on ${done} ${done === 1 ? 'day' : 'days'}.`,
        // Counts practice only; a week without any yet is said plainly, never as a lack.
        done ? `השבוע תרגלתם ${heCount(done, 'יום אחד', 'ימים', 'יומיים')}.` : 'השבוע עוד אין תרגול.',
      )}
    >
      {days.map((d) => (
        <View key={d.day} style={styles.col}>
          <Txt variant="caption" tone={d.today ? 'primary' : 'tertiary'} style={d.today ? { fontWeight: '700' } : undefined}>
            {d.label}
          </Txt>
          <View style={[styles.dot, d.practised ? styles.on : d.today ? styles.today : d.future ? styles.future : styles.off]} />
        </View>
      ))}
    </View>
  );
}

const SIZE = 30;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { alignItems: 'center', gap: space.s, flex: 1 },
  dot: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  on: { backgroundColor: color.practice },
  today: { borderWidth: 1.5, borderColor: color.text },
  off: { borderWidth: 1.5, borderColor: color.hairline, borderStyle: 'dashed' },
  future: { backgroundColor: color.surface },
});

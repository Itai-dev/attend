import { StyleSheet, View } from 'react-native';
import type { WeekStripDay } from '@/domain/engagement';
import { Txt } from '@/design/components';
import { space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';

/**
 * This week, Monday to Sunday: a filled dot for each practice day, a ring around today. Every
 * other day — past or still to come — is the same plain faint dot, so a day without practice
 * looks exactly like a day that hasn't happened yet: nothing marks it as missed (no dash, no
 * outline). Nothing here resets, so there is no streak to lose.
 */
export function WeekStrip({ days }: { days: WeekStripDay[] }) {
  const styles = useStyles(makeStyles);
  const done = days.filter((d) => d.practised).length;
  return (
    <View style={styles.row} accessible accessibilityLabel={`This week: practised on ${done} ${done === 1 ? 'day' : 'days'}.`}>
      {days.map((d) => (
        <View key={d.day} style={styles.col}>
          <Txt variant="caption" tone={d.today ? 'primary' : 'tertiary'} style={d.today ? { fontWeight: '700' } : undefined}>
            {d.label}
          </Txt>
          <View style={[styles.dot, d.practised ? styles.on : d.today ? styles.today : styles.off]} />
        </View>
      ))}
    </View>
  );
}

const SIZE = 30;

const makeStyles = (color: Palette) =>
  StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { alignItems: 'center', gap: space.s, flex: 1 },
  dot: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  on: { backgroundColor: color.practice },
  today: { borderWidth: 1.5, borderColor: color.text },
  off: { backgroundColor: color.surfaceStrong },
});

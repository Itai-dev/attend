import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { currentDay, PROGRAM, type ProgramState } from '@/domain/program';
import { Txt } from '@/design/components';
import { HIT, radius, space, type Palette } from '@/design/theme';
import { useStyles } from '@/design/ThemeProvider';

/**
 * The 28 days as rows of seven, filled in as practice is done. A done day or today opens its
 * lesson again; later days wait. It counts showing up and nothing else: an empty square is
 * just a day not reached, never a day missed.
 *
 * In the first week only week 1 is drawn, and the rest is one line naming what comes next.
 * Twenty-one grey squares on day 1 read as a debt to work off, not a path.
 */
export function ProgramPath({ program, todayKey }: { program: ProgramState; todayKey: string }) {
  const styles = useStyles(makeStyles);
  const { day: today } = currentDay(program, todayKey);
  const anyDone = Object.keys(program.done).length > 0;
  const early = today <= 7;
  const weeks: Array<1 | 2 | 3 | 4> = early ? [1] : [1, 2, 3, 4];
  return (
    <View style={{ gap: space.l }}>
      {weeks.map((w) => {
        const days = PROGRAM.filter((d) => d.week === w);
        const open = days[0].day <= today;
        return (
          <View key={w} style={{ gap: space.s, opacity: open ? 1 : 0.6 }}>
            <Txt variant="footnote" tone={open ? 'secondary' : 'tertiary'} style={{ fontWeight: '500', textTransform: 'lowercase' }}>
              week {w}
            </Txt>
            <View style={styles.days}>
              {days.map((d) => {
                const done = !!program.done[d.day];
                const isToday = d.day === today && !done;
                const reachable = done || d.day <= today;
                return (
                  <Pressable
                    key={d.day}
                    disabled={!reachable}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !reachable }}
                    accessibilityLabel={`Day ${d.day}: ${d.lesson.title}. ${done ? 'Done.' : isToday ? 'Today.' : 'Not yet open.'}`}
                    onPress={() => router.push({ pathname: '/lesson/[day]', params: { day: String(d.day) } })}
                    style={[styles.day, done ? styles.dayDone : isToday ? styles.dayToday : styles.dayLater]}
                  >
                    <Txt variant="footnote" tone={done ? 'inverse' : isToday ? 'primary' : 'tertiary'} style={{ fontWeight: '600' }}>
                      {String(d.day)}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
      {early ? (
        <Txt variant="footnote" tone="tertiary" style={{ textTransform: 'lowercase' }}>
          then 21 more days, weeks 2 to 4
        </Txt>
      ) : null}
      {anyDone ? (
        <Txt variant="footnote" tone="tertiary">
          Tap a finished day to read its lesson again.
        </Txt>
      ) : null}
    </View>
  );
}

const makeStyles = (color: Palette) =>
  StyleSheet.create({
    days: { flexDirection: 'row', gap: space.s },
    day: { flex: 1, height: HIT, borderRadius: radius.s, alignItems: 'center', justifyContent: 'center' },
    dayDone: { backgroundColor: color.practice },
    dayToday: { borderWidth: 1.5, borderColor: color.text },
    dayLater: { backgroundColor: color.surface },
  });

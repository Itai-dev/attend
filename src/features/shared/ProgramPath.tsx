import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { currentDay, PROGRAM, programDay, WEEKS, type ProgramState } from '@/domain/program';
import { Txt } from '@/design/components';
import { radius, space, type Palette } from '@/design/theme';
import { useStyles } from '@/design/ThemeProvider';

/**
 * The 28 days as four rows of seven, filled in as practice is done. A done day or today
 * opens its lesson again; later days wait. It counts showing up and nothing else: an empty
 * square is just a day not reached, never a day missed.
 */
export function ProgramPath({ program, todayKey }: { program: ProgramState; todayKey: string }) {
  const styles = useStyles(makeStyles);
  const { day: today, finished } = currentDay(program, todayKey);
  return (
    <View style={{ gap: space.l }}>
      {([1, 2, 3, 4] as const).map((w) => {
        const days = PROGRAM.filter((d) => d.week === w);
        const open = days[0].day <= today;
        return (
          <View key={w} style={{ gap: space.s, opacity: open ? 1 : 0.6 }}>
            <Txt variant="footnote" tone={open ? 'secondary' : 'tertiary'} style={{ fontWeight: '500', textTransform: 'lowercase' }}>
              week {w} · {WEEKS[w].name}
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
      {!finished ? (
        <Txt variant="footnote" tone="tertiary">
          {program.done[today] ? 'Done today.' : `Next: day ${today}, ${programDay(today).lesson.title.toLowerCase()}.`} Tap a day to read its lesson again.
        </Txt>
      ) : null}
    </View>
  );
}

const makeStyles = (color: Palette) =>
  StyleSheet.create({
    days: { flexDirection: 'row', gap: space.s },
    day: { flex: 1, height: 36, borderRadius: radius.s, alignItems: 'center', justifyContent: 'center' },
    dayDone: { backgroundColor: color.practice },
    dayToday: { borderWidth: 1.5, borderColor: color.text },
    dayLater: { backgroundColor: color.surface },
  });

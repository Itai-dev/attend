import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useData } from '@/data/store';
import { currentTz, dayKey } from '@/domain/checkin';
import { PRESETS } from '@/domain/presets';
import { currentDay, EMPTY_PROGRAM, PROGRAM, PROGRAM_DAYS, PROGRAM_TITLE, programDay, WEEKS } from '@/domain/program';
import { Card, Icon, SectionLabel, TitledScroll, Txt } from '@/design/components';
import { color, radius, space } from '@/design/theme';
import { PresetCard } from '../shared/PresetCard';

/**
 * The program as a path: four weeks of seven days, filled in as practice is done. Done
 * days and today's day open their lesson; later days wait, and a week opens when the one
 * before it is reached. Below, the any-time sessions for flares, sleep and worry.
 */
export function ProgramScreen() {
  const { prefs } = useData();
  const program = prefs.program ?? EMPTY_PROGRAM;
  const { day: today } = currentDay(program, dayKey(Date.now(), currentTz()));
  const anytime = PRESETS.filter((p) => p.category !== 'familiar' || p.id === 'notice-10');

  return (
    <TitledScroll title="Program">
      <Txt variant="callout" tone="secondary" style={{ marginTop: -space.m }}>
        {PROGRAM_TITLE} · {PROGRAM_DAYS} days
      </Txt>

      <View style={{ gap: space.m, marginTop: space.xl }}>
        {([1, 2, 3, 4] as const).map((w) => {
          const days = PROGRAM.filter((d) => d.week === w);
          const doneCount = days.filter((d) => program.done[d.day]).length;
          const current = days.some((d) => d.day === today);
          const open = days[0].day <= today;
          return (
            <Card key={w} style={[styles.week, current && styles.weekNow, !open && { opacity: 0.75 }]}>
              <View style={styles.weekHead}>
                <View style={{ flex: 1 }}>
                  <Txt variant="headline">
                    Week {w} · {WEEKS[w].name}
                  </Txt>
                  {!open ? (
                    <Txt variant="footnote" tone="tertiary">
                      {WEEKS[w].about}
                    </Txt>
                  ) : null}
                </View>
                {open ? (
                  <Txt variant="footnote" style={{ color: doneCount === 7 ? color.practice : color.textSecondary }}>
                    {doneCount === 7 ? 'Complete' : `${doneCount} of 7`}
                  </Txt>
                ) : (
                  <Icon name="lock.fill" size={15} tint={color.textTertiary} />
                )}
              </View>
              {open ? (
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
              ) : null}
              {current ? (
                <View style={{ marginTop: space.s }}>
                  <Txt variant="footnote" tone="tertiary">
                    {program.done[today] ? 'Done today' : `Next · Day ${today}`}
                  </Txt>
                  <Txt variant="callout">
                    {programDay(today).lesson.title} · lesson + {programDay(today).practice.minutes} min practice
                  </Txt>
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>

      <SectionLabel style={{ marginTop: space.xxl }}>Any time</SectionLabel>
      <View style={{ gap: space.m }}>
        {anytime.map((p) => (
          <PresetCard key={p.id} preset={p} />
        ))}
      </View>
    </TitledScroll>
  );
}

const styles = StyleSheet.create({
  week: { padding: space.l, gap: space.m, borderRadius: radius.l },
  weekNow: { backgroundColor: 'rgba(168,220,196,0.07)', borderColor: 'rgba(168,220,196,0.3)' },
  weekHead: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  days: { flexDirection: 'row', gap: space.s },
  day: { flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dayDone: { backgroundColor: color.practice },
  dayToday: { borderWidth: 1.5, borderColor: color.text },
  dayLater: { backgroundColor: color.surface },
});

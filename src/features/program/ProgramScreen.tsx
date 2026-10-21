import { router } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { currentTz, dayKey } from '@/domain/checkin';
import { PRESETS } from '@/domain/presets';
import { currentDay, EMPTY_PROGRAM, PROGRAM, PROGRAM_DAYS, PROGRAM_TITLE, programDay, WEEKS, type ProgramDay } from '@/domain/program';
import { CATEGORY_ART, WEEK_ART } from '@/design/art';
import { Icon, Txt } from '@/design/components';
import { CoverArt, HeaderGradient, ListRow, Pill, PlayButton, Shelf, ShelfCard } from '@/design/media';
import { color, radius, space } from '@/design/theme';
import { startPreset } from '../shared/PresetCard';

/**
 * The program as an album: one cover, a play button that opens today's day, and the 28 days
 * as its tracks, grouped by week. Done days and today's day open their lesson; later days
 * wait, and a week opens when the one before it is reached. Below, the any-time sessions for
 * flares, sleep and worry, as a shelf.
 */

const COVER = 200;

function Leading({ done, today, reachable, day }: { done: boolean; today: boolean; reachable: boolean; day: number }) {
  return (
    <View style={styles.leading}>
      {done ? (
        <Icon name="checkmark.circle.fill" size={20} tint={color.practice} />
      ) : !reachable ? (
        <Icon name="lock.fill" size={13} tint={color.textTertiary} />
      ) : (
        <Txt variant="callout" style={{ fontWeight: '700', color: today ? color.accent : color.textSecondary }}>
          {String(day)}
        </Txt>
      )}
    </View>
  );
}

export function ProgramScreen() {
  const { prefs } = useData();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const program = prefs.program ?? EMPTY_PROGRAM;
  const { day: today, doneToday, finished } = currentDay(program, dayKey(Date.now(), currentTz()));
  const current = programDay(today);
  const doneCount = Object.keys(program.done).length;
  const anytime = PRESETS.filter((p) => p.category !== 'familiar' || p.id === 'notice-10');

  const open = (d: ProgramDay) => router.push({ pathname: '/lesson/[day]', params: { day: String(d.day) } });
  const play = () => {
    if (!program.read.includes(today) && !doneToday) open(current);
    else router.push({ pathname: '/before', params: { day: String(today) } });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
      <HeaderGradient art={WEEK_ART[current.week]} width={width} height={insets.top + COVER + 200} />

      <View style={{ paddingTop: insets.top + space.xl, alignItems: 'center' }}>
        <CoverArt art={WEEK_ART[current.week]} size={COVER} seed={28} style={styles.cover}>
          <Txt variant="caption" style={styles.coverKicker}>
            ATTEND
          </Txt>
          <View style={styles.coverFoot}>
            <Txt style={styles.coverNumber}>{String(PROGRAM_DAYS)}</Txt>
            <Txt variant="caption" style={{ color: color.text, letterSpacing: 2 }}>
              DAYS
            </Txt>
          </View>
        </CoverArt>
      </View>

      <View style={styles.head}>
        <Txt variant="title" accessibilityRole="header">
          {PROGRAM_TITLE}
        </Txt>
        <Txt variant="footnote" tone="secondary" style={{ marginTop: space.xs }}>
          Program · 4 weeks · {doneCount} of {PROGRAM_DAYS} done
        </Txt>
        <View style={styles.actions}>
          <View style={{ flex: 1 }}>
            <View style={styles.track} accessible accessibilityLabel={`${doneCount} of ${PROGRAM_DAYS} days done`}>
              <View style={[styles.fill, { width: `${(doneCount / PROGRAM_DAYS) * 100}%` }]} />
            </View>
            <Txt variant="footnote" tone="secondary" numberOfLines={1} style={{ marginTop: space.s }}>
              {finished ? 'All 28 days done' : doneToday ? `Day ${today} done · next opens tomorrow` : `Up next · Day ${today} · ${current.lesson.title}`}
            </Txt>
          </View>
          <PlayButton label={doneToday ? `Day ${today} again` : `Continue Day ${today}`} onPress={play} />
        </View>
      </View>

      {([1, 2, 3, 4] as const).map((w) => {
        const days = PROGRAM.filter((d) => d.week === w);
        const weekOpen = days[0].day <= today;
        const weekDone = days.filter((d) => program.done[d.day]).length;
        return (
          <View key={w} style={{ marginTop: space.xl }}>
            <View style={styles.weekHead}>
              <View style={{ flex: 1 }}>
                <Txt variant="title2" accessibilityRole="header">
                  Week {w} · {WEEKS[w].name}
                </Txt>
                <Txt variant="footnote" tone="secondary" style={{ marginTop: 2 }}>
                  {WEEKS[w].about}
                </Txt>
              </View>
              {weekOpen ? (
                <Txt variant="footnote" style={{ color: weekDone === 7 ? color.practice : color.textSecondary }}>
                  {weekDone === 7 ? 'Complete' : `${weekDone} of 7`}
                </Txt>
              ) : (
                <Icon name="lock.fill" size={14} tint={color.textTertiary} />
              )}
            </View>
            {days.map((d) => {
              const done = !!program.done[d.day];
              const isToday = d.day === today && !done;
              const reachable = done || d.day <= today;
              return (
                <View key={d.day} style={!reachable && { opacity: 0.5 }}>
                  <ListRow
                    leading={<Leading day={d.day} done={done} today={isToday} reachable={reachable} />}
                    title={d.lesson.title}
                    subtitle={`Lesson · ${d.practice.title}, ${d.practice.minutes} min`}
                    titleTone={reachable ? 'primary' : 'tertiary'}
                    right={isToday ? <Pill label="Today" on /> : undefined}
                    onPress={reachable ? () => open(d) : undefined}
                    label={`Day ${d.day}: ${d.lesson.title}. ${done ? 'Done.' : isToday ? 'Today.' : reachable ? '' : 'Not yet open.'}`}
                  />
                </View>
              );
            })}
          </View>
        );
      })}

      <Shelf title="Any time" style={{ marginTop: space.xxl }}>
        {anytime.map((p, i) => (
          <ShelfCard
            key={p.id}
            art={CATEGORY_ART[p.category]}
            seed={i + 1}
            title={p.title}
            subtitle={`${p.minutes} min · ${p.voiceName}`}
            onPress={() => startPreset(p)}
          />
        ))}
      </Shelf>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cover: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  coverKicker: { position: 'absolute', top: space.m, left: space.m, color: color.text, letterSpacing: 2, opacity: 0.85 },
  coverFoot: { position: 'absolute', left: space.m, bottom: space.m },
  coverNumber: { color: color.text, fontSize: 72, lineHeight: 72, fontWeight: '800', letterSpacing: -3 },
  head: { paddingHorizontal: space.l, marginTop: space.xl },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.l, marginTop: space.l },
  track: { height: 4, borderRadius: radius.pill, backgroundColor: color.surfaceStrong, overflow: 'hidden' },
  fill: { height: 4, borderRadius: radius.pill, backgroundColor: color.practice },
  weekHead: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingHorizontal: space.l, marginBottom: space.xs },
  leading: { width: 28, alignItems: 'center', justifyContent: 'center' },
});

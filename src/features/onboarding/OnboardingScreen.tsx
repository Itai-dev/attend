import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Prefs } from '@/data/types';
import { useData } from '@/data/store';
import { WHERE_REGIONS } from '@/domain/checkin';
import { EMPTY_PROGRAM, PROGRAM_DAYS, programTitle, WEEKS } from '@/domain/program';
import { REGIONS } from '@/domain/regions';
import type { BodyRegion } from '@/domain/types';
import { Chip, haptic, PrimaryButton, QuietButton, Txt } from '@/design/components';
import { CoverArt } from '@/design/media';
import { color, HIT, radius, space } from '@/design/theme';
import { requestReminderPermission, scheduleReminders } from '@/voice/reminders';
import { Enso } from '@/viz/Enso';

/**
 * The welcome: four screens, about a minute and a half. A promise (pain can change), how it
 * works (PRT's three ideas, in plain words), the person (where, how long, what they want
 * back), and a plan (when, and a reminder). It asks for a goal, never a pain score; the
 * first check-in comes after, as Day 1's first step.
 *
 * The goal matters most: it is what the program works toward and what Week 4 brings the
 * practice back to (docs/RESEARCH.md §4).
 */

const GOALS = ['Long walks', 'Playing with my kids', 'Sleeping through', 'Working without breaks', 'Sport', 'Time with friends'];
const DURATIONS: Array<{
  value: NonNullable<Prefs['painFor']>;
  label: string;
}> = [
  { value: 'months', label: 'Months' },
  { value: '1-3y', label: '1–3 yrs' },
  { value: '3-10y', label: '3–10 yrs' },
  { value: '10y+', label: '10+ yrs' },
];
const TIMES = [
  { id: 'morning', label: 'Morning', hour: 8, minute: 0 },
  { id: 'midday', label: 'Midday', hour: 13, minute: 0 },
  { id: 'evening', label: 'Evening', hour: 20, minute: 30 },
] as const;

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function hhmm(h: number, m: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { prefs, sessions, setPrefs } = useData();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(prefs.name ?? '');
  const [where, setWhere] = useState<BodyRegion | undefined>(prefs.place?.region);
  const [painFor, setPainFor] = useState<Prefs['painFor']>(prefs.painFor);
  const [goal, setGoal] = useState<string | undefined>(prefs.goal);
  const [ownGoal, setOwnGoal] = useState(prefs.goal && !GOALS.includes(prefs.goal) ? prefs.goal : '');
  const [writing, setWriting] = useState(!!ownGoal);
  const [time, setTime] = useState<(typeof TIMES)[number]['id']>('evening');
  const [remind, setRemind] = useState(prefs.reminder?.enabled ?? true);

  const finalGoal = writing ? ownGoal.trim() || undefined : goal;

  const finish = async () => {
    const t = TIMES.find((x) => x.id === time)!;
    const reminder = { enabled: remind, hour: t.hour, minute: t.minute };
    if (remind && !(await requestReminderPermission())) reminder.enabled = false;
    await setPrefs({
      onboarded: true,
      name: name.trim() || undefined,
      goal: finalGoal,
      painFor,
      place: where && where !== 'whole_body' ? { region: where } : undefined,
      reminder,
      // Running the welcome again keeps the program where it was.
      program: prefs.program ?? EMPTY_PROGRAM,
    });
    const last = sessions.filter((s) => !s.isSample).map((s) => s.startedAt);
    await scheduleReminders(reminder, last.length ? Math.max(...last) : undefined);
    router.replace('/');
    // Day 1 begins with the baseline check-in, so in four weeks there is a start to look back to.
    if (!prefs.program) setTimeout(() => router.push('/checkin'), 350);
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + space.l,
          paddingBottom: insets.bottom + space.l,
        },
      ]}
    >
      {step > 0 ? (
        <View style={styles.bars} accessibilityLabel={`Step ${step + 1} of 4`}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.bar, i <= step && { backgroundColor: color.accent }]} />
          ))}
        </View>
      ) : (
        <Txt
          variant="headline"
          style={{
            letterSpacing: 3.2,
            paddingHorizontal: space.l,
            fontWeight: '800',
          }}
        >
          ATTEND
        </Txt>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <Animated.View key="0" entering={FadeIn.duration(700)} style={{ flex: 1 }}>
            <View style={styles.orb}>
              <Enso width={240} height={240} mode="idle" dim={0.9} />
            </View>
            <Txt variant="display">Pain is real.{'\n'}And it can change.</Txt>
            <Txt variant="body" tone="secondary" style={{ marginTop: space.l }}>
              A few minutes a day of guided attention, eyes closed. A short program that helps you meet pain with less alarm.
            </Txt>
          </Animated.View>
        ) : null}

        {step === 1 ? (
          <Animated.View key="1" entering={FadeIn.duration(600)} style={{ gap: space.xl }}>
            <Txt variant="display">How Attend works</Txt>
            {[
              ['Pain that lasts keeps the alarm on', 'Long-lasting pain often involves a nervous system that stays on alert, long after an injury.'],
              ['Attention without alarm is a skill', 'Somatic tracking: noticing a sensation with curiosity instead of fear. It can be practised.'],
              ['A little, often', `A 2-minute lesson and a short practice a day, for ${PROGRAM_DAYS} days. You just listen.`],
            ].map(([title, body], i) => (
              <View key={title} style={styles.point}>
                <View style={styles.num}>
                  <Txt variant="callout" style={{ color: color.onAccent, fontWeight: '800' }}>
                    {String(i + 1)}
                  </Txt>
                </View>
                <View style={{ flex: 1, gap: space.xs }}>
                  <Txt variant="headline">{title}</Txt>
                  <Txt variant="callout" tone="secondary">
                    {body}
                  </Txt>
                </View>
              </View>
            ))}
            <View style={styles.note}>
              <Txt variant="footnote" tone="secondary">
                Attend is for pain you already know well. Anything new, changing or severe deserves a doctor’s look first.
              </Txt>
            </View>
          </Animated.View>
        ) : null}

        {step === 2 ? (
          <Animated.View key="2" entering={FadeIn.duration(600)}>
            <Txt variant="display">What should we call you?</Txt>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your first name"
              placeholderTextColor={color.textTertiary}
              accessibilityLabel="Your name"
              autoCapitalize="words"
              returnKeyType="done"
              maxLength={30}
              style={styles.input}
            />

            <Txt variant="title2" style={{ marginTop: space.xxl }}>
              Where does it hurt most?
            </Txt>
            <View style={styles.chips}>
              {WHERE_REGIONS.map((r) => (
                <Chip key={r} label={cap(REGIONS[r].label)} selected={where === r} onPress={() => setWhere(where === r ? undefined : r)} />
              ))}
            </View>

            <Txt variant="title2" style={{ marginTop: space.xxl }}>
              For how long?
            </Txt>
            <View style={styles.segment} accessibilityRole="radiogroup">
              {DURATIONS.map((d) => {
                const on = painFor === d.value;
                return (
                  <Pressable
                    key={d.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => {
                      haptic('select');
                      setPainFor(d.value);
                    }}
                    style={[styles.seg, on && { backgroundColor: color.accent }]}
                  >
                    <Txt variant="footnote" tone={on ? 'inverse' : 'secondary'} style={{ fontWeight: on ? '700' : '500' }}>
                      {d.label}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>

            <Txt variant="title2" style={{ marginTop: space.xxl }}>
              What do you want to get back to?
            </Txt>
            <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.xs }}>
              This is what Attend works toward with you.
            </Txt>
            <View style={styles.chips}>
              {GOALS.map((g) => (
                <Chip
                  key={g}
                  label={g}
                  selected={!writing && goal === g}
                  onPress={() => {
                    setWriting(false);
                    setGoal(goal === g ? undefined : g);
                  }}
                />
              ))}
              <Chip label="In my words…" selected={writing} onPress={() => setWriting(!writing)} />
            </View>
            {writing ? (
              <TextInput
                value={ownGoal}
                onChangeText={setOwnGoal}
                placeholder="Gardening on Saturdays"
                placeholderTextColor={color.textTertiary}
                accessibilityLabel="What you want to get back to"
                maxLength={60}
                autoFocus
                style={styles.input}
              />
            ) : null}
          </Animated.View>
        ) : null}

        {step === 3 ? (
          <Animated.View key="3" entering={FadeIn.duration(600)}>
            <Txt variant="display">Your plan</Txt>
            <CoverArt art="violet" seed={7} size={width - space.l * 2} height={196} rounded={radius.m} style={{ marginTop: space.l }}>
              <View style={styles.plan}>
                <Txt
                  variant="caption"
                  style={{
                    color: 'rgba(255,255,255,0.85)',
                    letterSpacing: 1.4,
                  }}
                >
                  {PROGRAM_DAYS} DAYS · A FEW MINUTES A DAY
                </Txt>
                <Txt variant="title">{programTitle()}</Txt>
                {finalGoal ? (
                  <Txt variant="footnote" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Toward: {finalGoal.charAt(0).toLowerCase() + finalGoal.slice(1)}
                  </Txt>
                ) : null}
                <View style={styles.weeks}>
                  {([1, 2, 3, 4] as const).map((w) => (
                    <View key={w} style={{ flex: 1, gap: space.xs }}>
                      <View style={[styles.weekBar, w > 1 && { opacity: 0.35 }]} />
                      <Txt variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
                        Wk {w}
                        {'\n'}
                        {WEEKS[w].name}
                      </Txt>
                    </View>
                  ))}
                </View>
              </View>
            </CoverArt>

            <Txt variant="title2" style={{ marginTop: space.xxl }}>
              When suits you best?
            </Txt>
            <View style={styles.times}>
              {TIMES.map((t) => {
                const on = time === t.id;
                return (
                  <Pressable
                    key={t.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => {
                      haptic('select');
                      setTime(t.id);
                    }}
                    style={[styles.time, on && styles.timeOn]}
                  >
                    <Txt variant="callout" tone={on ? 'inverse' : 'primary'} style={{ fontWeight: '600' }}>
                      {t.label}
                    </Txt>
                    <Txt variant="footnote" tone={on ? 'inverse' : 'tertiary'}>
                      {hhmm(t.hour, t.minute)}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.remind}>
              <View style={{ flex: 1 }}>
                <Txt variant="body">A gentle reminder</Txt>
                <Txt variant="footnote" tone="tertiary">
                  One a day. Never a nudge about missed days.
                </Txt>
              </View>
              <Switch value={remind} onValueChange={setRemind} trackColor={{ true: color.accent, false: color.surfacePressed }} thumbColor="#FFFFFF" accessibilityLabel="A gentle reminder" />
            </View>
            <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.l }}>
              Day 1 starts with a quick check-in, so in four weeks you can look back at where you began.
            </Txt>
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {step < 3 ? <PrimaryButton label={step === 0 ? 'Get started' : 'Continue'} onPress={() => setStep(step + 1)} /> : <PrimaryButton label="Start Day 1" onPress={finish} />}
        {step > 0 ? <QuietButton label="Back" style={{ alignSelf: 'center' }} onPress={() => setStep(step - 1)} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  bars: { flexDirection: 'row', gap: 6, paddingHorizontal: space.l },
  bar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: color.surfaceStrong,
  },
  content: { flexGrow: 1, padding: space.l, paddingTop: space.xxl },
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 260,
  },
  point: { flexDirection: 'row', gap: space.l },
  num: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    padding: space.l,
    borderRadius: radius.m,
    backgroundColor: color.surface,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s,
    marginTop: space.l,
  },
  segment: {
    flexDirection: 'row',
    gap: space.xs,
    padding: space.xs,
    marginTop: space.m,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
  },
  seg: {
    flex: 1,
    minHeight: HIT - 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  input: {
    marginTop: space.m,
    minHeight: HIT + 8,
    paddingHorizontal: space.l,
    borderRadius: radius.m,
    backgroundColor: color.surfaceStrong,
    color: color.text,
    fontSize: 17,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as never } : {}),
  },
  plan: { flex: 1, padding: space.l, gap: space.s, justifyContent: 'flex-end' },
  weeks: { flexDirection: 'row', gap: space.s, marginTop: space.s },
  weekBar: { height: 4, borderRadius: 2, backgroundColor: color.text },
  times: { flexDirection: 'row', gap: space.s, marginTop: space.m },
  time: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.m,
    backgroundColor: color.surface,
  },
  timeOn: { backgroundColor: color.accent },
  remind: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    marginTop: space.l,
    padding: space.l,
    borderRadius: radius.m,
    backgroundColor: color.surface,
  },
  footer: { paddingHorizontal: space.l, gap: space.s },
});

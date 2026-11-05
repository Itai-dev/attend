import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useData } from '@/data/store';
import { currentTz, MIN_DAYS_FOR_PICTURE } from '@/domain/checkin';
import { milestones, practiceStats } from '@/domain/engagement';
import { EMPTY_PROGRAM, PROGRAM_DAYS } from '@/domain/program';
import { buildProgress, progressMeaning } from '@/domain/progress';
import { Card, Icon, SettingsButton, TitledScroll, Txt } from '@/design/components';
import { color, HIT, radius, space } from '@/design/theme';
import { isHe, tr } from '@/i18n';
import { longDate } from '../shared/format';
import { PainChart } from './PainChart';

/**
 * The person's own tab, named for them (22 Oct 2026, after Headspace's profile): who they are,
 * what they've practised, the milestones, and their pain record — two halves that never mix.
 * Practice is celebrated; the pain record is drawn and not judged. No body map, no journey,
 * no list of past sessions: kept simple on purpose. Settings sit behind the gear.
 */

function Section({ children }: { children: string }) {
  return (
    <Txt variant="title2" accessibilityRole="header" style={{ marginTop: space.xxl, marginBottom: space.m }}>
      {children}
    </Txt>
  );
}

/** Until a name is given, the tab asks for one here, once, in place. */
function AskName() {
  const { setPrefs } = useData();
  const [name, setName] = useState('');
  const save = () => {
    const n = name.trim();
    if (n) void setPrefs({ name: n });
  };
  return (
    <Card style={{ padding: space.l, marginTop: space.l }}>
      <Txt variant="headline">{tr('What should we call you?', 'איך לקרוא לכם?')}</Txt>
      <TextInput
        value={name}
        onChangeText={setName}
        onSubmitEditing={save}
        onBlur={save}
        placeholder={tr('Your first name', 'שם פרטי')}
        placeholderTextColor={color.textTertiary}
        accessibilityLabel={tr('Your name', 'השם שלכם')}
        autoCapitalize="words"
        returnKeyType="done"
        maxLength={30}
        style={styles.input}
      />
    </Card>
  );
}

export function YouScreen() {
  const { sessions, checkIns, prefs } = useData();
  const tz = currentTz();
  const program = prefs.program ?? EMPTY_PROGRAM;
  const stats = useMemo(() => practiceStats(sessions, Date.now(), tz), [sessions, tz]);
  const marks = useMemo(() => milestones({ sessions, program, moments: prefs.moments?.length ?? 0, tz }), [sessions, program, prefs.moments, tz]);
  const progress = useMemo(() => buildProgress(checkIns, sessions, { tz }), [checkIns, sessions, tz]);
  const first = useMemo(() => {
    const own = sessions.filter((s) => !s.isSample).map((s) => s.startedAt);
    return own.length ? Math.min(...own) : undefined;
  }, [sessions]);
  const lastMoment = prefs.moments?.[0];
  const name = prefs.name?.trim();

  return (
    <TitledScroll title={name || tr('You', 'אני')} right={<SettingsButton />}>
      <View style={styles.who}>
        <View style={styles.avatar}>
          <Txt variant="title" style={{ color: color.onAccent }}>
            {(name?.[0] ?? '·').toUpperCase()}
          </Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="callout" tone="secondary">
            {first
              ? tr(`Practising since ${longDate(first)}`, `מתרגלים מאז ${longDate(first)}`)
              : tr('Your first practice is waiting on Today', 'התרגול הראשון מחכה בלשונית היום')}
          </Txt>
          {prefs.goal ? (
            <Txt variant="callout" style={{ color: color.milestone }}>
              {tr(`Toward ${prefs.goal.charAt(0).toLowerCase() + prefs.goal.slice(1)}`, `המטרה: ${prefs.goal}`)}
            </Txt>
          ) : null}
        </View>
      </View>

      {!name ? <AskName /> : null}

      <View style={styles.tiles}>
        {[
          [stats.days, stats.days === 1 ? tr('practice day', 'יום תרגול') : tr('practice days', 'ימי תרגול')],
          [stats.minutes, isHe() && stats.minutes === 1 ? 'דקה' : tr('minutes', 'דקות')],
          [`${Object.keys(program.done).length}/${PROGRAM_DAYS}`, tr('program days', 'ימים בתוכנית')],
        ].map(([n, label]) => (
          <View key={String(label)} style={styles.tile}>
            <Txt variant="title">{String(n)}</Txt>
            <Txt variant="footnote" tone="secondary">
              {String(label)}
            </Txt>
          </View>
        ))}
      </View>

      <Section>{tr('Milestones', 'אבני דרך')}</Section>
      <View style={styles.marks} accessible accessibilityLabel={`${tr('Milestones', 'אבני דרך')}: ${marks.filter((m) => m.earned).map((m) => m.label).join(', ') || tr('none yet', 'עוד אין')}.`}>
        {marks.map((m) => (
          <View key={m.id} style={styles.mark}>
            <View style={[styles.badge, m.earned ? styles.badgeOn : styles.badgeOff]}>
              <Icon name="star.fill" size={16} tint={m.earned ? color.milestone : color.textTertiary} />
            </View>
            <Txt variant="caption" tone={m.earned ? 'secondary' : 'tertiary'} align="center" style={{ fontSize: 10, lineHeight: 12, fontWeight: '500', letterSpacing: 0 }}>
              {m.label}
            </Txt>
          </View>
        ))}
      </View>

      {prefs.goal ? (
        <Card style={styles.goal}>
          <Txt variant="callout">
            {lastMoment
              ? tr(`Last moment you saved: “${lastMoment.text}”`, `הרגע האחרון ששמרתם: ${lastMoment.text}`)
              : tr('Did something toward it, however small? Save it as a moment.', 'עשיתם צעד לקראתה, אפילו קטן? אפשר לשמור אותו כרגע.')}
          </Txt>
          <Pressable accessibilityRole="button" onPress={() => router.push('/moment')} style={styles.link} hitSlop={8}>
            <Txt variant="callout" style={{ color: color.milestone, fontWeight: '600' }}>
              {tr('Save a moment', 'לשמור רגע')}
            </Txt>
          </Pressable>
        </Card>
      ) : null}

      <Section>{tr('Pain record', 'יומן הכאב')}</Section>
      <Card style={{ padding: space.l }}>
        {progress.enough ? (
          <PainChart days={progress.days} />
        ) : (
          <Txt variant="callout" tone="secondary">
            {tr(
              `Not a picture yet. After check-ins on ${MIN_DAYS_FOR_PICTURE} different days, your pain over the weeks appears here, beside the days you practised.`,
              `עוד אין תמונה. אחרי צ׳ק־אין ב־${MIN_DAYS_FOR_PICTURE} ימים שונים, הכאב לאורך השבועות יופיע כאן, לצד הימים שבהם תרגלתם.`,
            )}
          </Txt>
        )}
        <Txt variant="callout" style={{ marginTop: space.l }}>
          {progress.summary}
        </Txt>
        {/* The sentence about what this is not belongs inside the card it qualifies (Pattern). */}
        <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.m }}>
          {progressMeaning()}
        </Txt>
        <Pressable accessibilityRole="button" onPress={() => router.push('/checkin')} style={styles.link} hitSlop={8}>
          <Txt variant="callout" style={{ color: color.practice, fontWeight: '600' }}>
            {tr('Check in', 'לעשות צ׳ק־אין')}
          </Txt>
        </Pressable>
      </Card>
    </TitledScroll>
  );
}

const styles = StyleSheet.create({
  who: { flexDirection: 'row', alignItems: 'center', gap: space.l, marginTop: -space.s },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  input: {
    marginTop: space.m,
    minHeight: HIT + 4,
    paddingHorizontal: space.l,
    borderRadius: radius.m,
    backgroundColor: color.surfaceStrong,
    color: color.text,
    fontSize: 17,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as never } : {}),
  },
  tiles: { flexDirection: 'row', gap: space.s, marginTop: space.xl },
  tile: { flex: 1, padding: space.m, paddingTop: space.l, gap: 2, borderRadius: radius.m, backgroundColor: color.surface },
  marks: { flexDirection: 'row', gap: space.xs, padding: space.m, borderRadius: radius.m, backgroundColor: color.surface },
  mark: { flex: 1, alignItems: 'center', gap: space.xs },
  badge: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  badgeOn: { backgroundColor: color.milestoneSoft },
  badgeOff: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.hairline },
  goal: { marginTop: space.m, padding: space.l, borderRadius: radius.l, backgroundColor: color.milestoneSoft },
  link: { minHeight: 36, justifyContent: 'center', marginTop: space.s, alignSelf: 'flex-start' },
});

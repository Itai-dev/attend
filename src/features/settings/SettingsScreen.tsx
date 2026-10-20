import Constants from 'expo-constants';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDE_VOICES, hasRemote } from '@/config';
import { useData } from '@/data/store';
import type { BrainPref, InputModePref } from '@/data/types';
import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from '@/domain/access';
import { currentTz } from '@/domain/checkin';
import { practiceStats } from '@/domain/engagement';
import { backgroundFor, soundscape, SOUNDSCAPES } from '@/domain/soundscapes';
import { ChoiceRow as Choice, DisclosureRow, Hairline, QuietButton, RowGroup as Group, SectionLabel, Segmented, Txt } from '@/design/components';
import { HIT, radius, space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';
import { remindersAvailable, requestReminderPermission, scheduleReminders } from '@/voice/reminders';
import { speechModule } from '@/voice/speechModule';
import { previewVoice, stopPreview } from '@/voice/voicePreview';
import { clock12 } from '../shared/format';

/**
 * Settings, kept short. The guide's voice and the sound under practice first (the same prefs
 * practice settings saves), then the reminder and its time, appearance, privacy, what this is
 * not — and, in development builds only, the switches for testing without a microphone.
 * Every choice saves on tap; there is nothing to confirm.
 */

function confirm(title: string, message: string, action: string, run: () => void) {
  if (Platform.OS === 'web') return run();
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: run },
  ]);
}

/** A row that leaves the app: a page in the browser, or a new email. */
function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <Txt variant="body" style={styles.label}>
        {label}
      </Txt>
      <Txt variant="body" tone="tertiary" importantForAccessibility="no" accessibilityElementsHidden>
        →
      </Txt>
    </Pressable>
  );
}

// Shared with the welcome, so a time reads the same on both (studio round 5).
export { clock12 };

/** The reminder times on offer. A time set elsewhere (the welcome) still shows on the row. */
const REMINDER_TIMES = [
  { name: 'morning', hour: 8, minute: 0 },
  { name: 'midday', hour: 13, minute: 0 },
  { name: 'evening', hour: 20, minute: 30 },
  { name: 'night', hour: 22, minute: 0 },
] as const;

type Open = 'voice' | 'sound' | 'time' | null;

export function SettingsScreen() {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { prefs, setPrefs, deleteAll, deleteSamples, addSamples, hasSamples, sessions } = useData();
  const realCount = sessions.filter((s) => !s.isSample).length;
  const background = backgroundFor(prefs);
  // Sounds' "sound under practice ›" opens Settings with that list already open.
  const params = useLocalSearchParams<{ open?: string }>();
  const [open, setOpen] = useState<Open>(params.open === 'sound' || params.open === 'voice' ? params.open : null);
  const toggle = (k: Open) => setOpen(open === k ? null : k);
  useEffect(() => stopPreview, []);

  const voice = GUIDE_VOICES.find((v) => v.id === prefs.voiceId) ?? GUIDE_VOICES[0];
  const soundName = background === 'none' ? 'voice only' : (soundscape(background)?.name ?? '').toLowerCase();
  const reminder = prefs.reminder;
  const time = reminder ? clock12(reminder.hour, reminder.minute) : clock12(20, 30);

  const setReminderTime = async (hour: number, minute: number) => {
    const next = { enabled: true, hour, minute };
    await setPrefs({ reminder: next });
    await scheduleReminders(next, practiceStats(sessions, Date.now(), currentTz()).lastPractice, prefs.program);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.xxxl }}>
      <View style={styles.header}>
        <Txt variant="title" accessibilityRole="header">
          settings
        </Txt>
        <QuietButton label="Done" tone="primary" onPress={() => router.back()} />
      </View>

      {/* First, because it's what people came looking for (round 5: the guide's voice couldn't be found). */}
      <SectionLabel>Practice</SectionLabel>
      <Group>
        <DisclosureRow label="guide voice" value={voice.name.toLowerCase()} open={open === 'voice'} onPress={() => toggle('voice')} />
        {open === 'voice'
          ? GUIDE_VOICES.map((v) => (
              <View key={v.id}>
                <Hairline />
                <Choice
                  label={v.name}
                  detail={v.detail}
                  selected={v.id === voice.id}
                  onPress={() => {
                    setPrefs({ voiceId: v.id });
                    if (hasRemote) previewVoice(v.id);
                  }}
                />
              </View>
            ))
          : null}
        <Hairline />
        <DisclosureRow label="sound under practice" value={soundName} open={open === 'sound'} onPress={() => toggle('sound')} />
        {open === 'sound' ? (
          <>
            {SOUNDSCAPES.map((sc) => (
              <View key={sc.id}>
                <Hairline />
                <Choice label={sc.name} detail={sc.line} selected={background === sc.id} onPress={() => setPrefs({ background: sc.id })} />
              </View>
            ))}
            <Hairline />
            <Choice label="Voice only" detail="Only the guide’s voice" selected={background === 'none'} onPress={() => setPrefs({ background: 'none' })} />
          </>
        ) : null}
      </Group>

      <SectionLabel style={styles.section}>Daily reminder</SectionLabel>
      <Group>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Txt variant="body">a gentle reminder</Txt>
            <Txt variant="footnote" tone="tertiary">
              {!remindersAvailable()
                ? 'Needs the next app update.'
                : reminder?.enabled
                  ? `Every day at ${time}. Weekly after a few quiet days.`
                  : 'One a day, at a time you choose. Weekly after a few quiet days.'}
            </Txt>
          </View>
          <Switch
            value={!!reminder?.enabled}
            disabled={!remindersAvailable()}
            trackColor={{ true: color.practice }}
            accessibilityLabel="a gentle reminder"
            onValueChange={async (on) => {
              const base = prefs.reminder ?? { enabled: false, hour: 20, minute: 30 };
              const reminder = { ...base, enabled: on && (await requestReminderPermission()) };
              await setPrefs({ reminder });
              await scheduleReminders(reminder, practiceStats(sessions, Date.now(), currentTz()).lastPractice, prefs.program);
            }}
          />
        </View>
        {reminder?.enabled ? (
          <>
            <Hairline />
            <DisclosureRow label="time" value={time} open={open === 'time'} onPress={() => toggle('time')} />
            {open === 'time'
              ? REMINDER_TIMES.map((t) => (
                  <View key={t.name}>
                    <Hairline />
                    <Choice
                      label={t.name}
                      detail={clock12(t.hour, t.minute)}
                      selected={reminder.hour === t.hour && reminder.minute === t.minute}
                      onPress={() => setReminderTime(t.hour, t.minute)}
                    />
                  </View>
                ))
              : null}
          </>
        ) : null}
      </Group>

      <SectionLabel style={styles.section}>Appearance</SectionLabel>
      <Group>
        <Choice label="Automatic" detail="Light by day, dark at night, as the iPhone is" selected={(prefs.appearance ?? 'auto') === 'auto'} onPress={() => setPrefs({ appearance: 'auto' })} />
        <Hairline />
        <Choice label="Light" selected={prefs.appearance === 'light'} onPress={() => setPrefs({ appearance: 'light' })} />
        <Hairline />
        <Choice label="Dark" detail="Sessions are always dark" selected={prefs.appearance === 'dark'} onPress={() => setPrefs({ appearance: 'dark' })} />
      </Group>

      <SectionLabel style={styles.section}>Privacy</SectionLabel>
      <Group>
        <View style={styles.textBlock}>
          <Txt variant="callout" tone="secondary">
            Your sessions and check-ins are stored only on this iPhone. There is no account. Sessions are guided: they never use the microphone, and nothing you say is heard. Where the guide rests your attention comes from your latest check-in, read here on the phone. In the spoken welcome, what you say is turned into words on the device and the audio is never saved.
          </Txt>
          {/* Its own paragraph: the one thing that leaves the phone shouldn't sit mid-wall. */}
          {hasRemote ? (
            <Txt variant="callout" tone="secondary" style={{ marginTop: space.m }}>
              The guide’s lines are voiced through Attend’s voice service by ElevenLabs. The only thing about you in them is the body area a practice rests on, such as “your lower back”, with no name or account attached.
            </Txt>
          ) : null}
        </View>
        <Hairline />
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            confirm('Delete all sessions?', 'Every session and map on this iPhone will be removed. This can’t be undone.', 'Delete all', () => {
              deleteAll();
            })
          }
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Txt variant="body" style={[styles.label, { color: color.destructive }]}>
            Delete all sessions
          </Txt>
          <Txt variant="footnote" tone="tertiary">
            {realCount === 1 ? '1 session' : `${realCount} sessions`}
          </Txt>
        </Pressable>
      </Group>

      {__DEV__ ? (
        <>
          <SectionLabel style={styles.section}>Sample sessions</SectionLabel>
          <Group>
            <Pressable accessibilityRole="button" onPress={() => (hasSamples ? deleteSamples() : addSamples())} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
              <Txt variant="body" style={styles.label}>
                {hasSamples ? 'Remove sample sessions' : 'Show sample sessions'}
              </Txt>
            </Pressable>
          </Group>
        </>
      ) : null}

      <SectionLabel style={styles.section}>About</SectionLabel>
      <Group>
        <View style={styles.textBlock}>
          <Txt variant="callout" tone="secondary">
            Attend is a practice for familiar, long-standing sensations, built around somatic tracking: noticing a sensation with curiosity rather than fear. It isn’t a diagnostic tool and doesn’t replace medical care. If a symptom is new,
            changing quickly or severe, contact a medical professional. If it’s sudden or severe, call your local emergency number.
          </Txt>
          {/* Its own line, so it can be found at a glance (round 3, researcher: there was no crisis line). */}
          <Txt variant="callout" tone="secondary" style={{ marginTop: space.m }}>
            If you’re thinking about ending your life, call or text 988 (US), or find a line at findahelpline.com.
          </Txt>
          <Txt variant="callout" tone="secondary" style={{ marginTop: space.m }}>
            Close attention to the body doesn’t suit everyone. If a practice brings up old memories, panic, or a far-away feeling, open your eyes, look around the room, and stop. If you notice yourself checking your body more between practices, try a shorter practice, or just listen to a sound for a while.
          </Txt>
          <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.m }}>
            Version {Constants.expoConfig?.version ?? '0.1.0'}
          </Txt>
        </View>
        <Hairline />
        <LinkRow label="privacy policy" onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} />
        <Hairline />
        <LinkRow label="terms" onPress={() => Linking.openURL(TERMS_URL).catch(() => {})} />
        {SUPPORT_EMAIL ? (
          <>
            <Hairline />
            <LinkRow label="contact" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})} />
          </>
        ) : null}
      </Group>

      {__DEV__ ? <DeveloperSettings /> : null}
    </ScrollView>
  );
}

function DeveloperSettings() {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const { prefs, setPrefs } = useData();
  const dev = prefs.dev;
  const speech = !!speechModule();
  const set = (patch: Partial<typeof dev>) => setPrefs({ dev: { ...dev, ...patch } });
  return (
    <>
      <SectionLabel style={styles.section}>Developer</SectionLabel>
      <Group>
        <View style={styles.textBlock}>
          <Txt variant="footnote" tone="secondary" style={{ marginBottom: space.s }}>
            Listening
          </Txt>
          <Segmented<InputModePref>
            style={{ alignSelf: 'stretch' }}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'on-device', label: 'Mic' },
              { value: 'simulated', label: 'Simulated' },
              { value: 'dev-text', label: 'Typed' },
            ]}
            value={dev.inputMode}
            onChange={(v) => set({ inputMode: v })}
          />
          <Txt variant="footnote" tone="secondary" style={{ marginTop: space.l, marginBottom: space.s }}>
            Guide
          </Txt>
          <Segmented<BrainPref>
            style={{ alignSelf: 'stretch' }}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'local', label: 'Local' },
              { value: 'claude', label: 'Claude' },
            ]}
            value={dev.brain}
            onChange={(v) => set({ brain: v })}
          />
        </View>
        <Hairline />
        <View style={styles.row}>
          <Txt variant="body">Conversational sessions</Txt>
          <Switch value={!!dev.conversation} onValueChange={(v) => set({ conversation: v })} trackColor={{ true: color.practice }} />
        </View>
        <Hairline />
        <View style={styles.row}>
          <Txt variant="body">Debug panel in sessions</Txt>
          <Switch value={dev.panel} onValueChange={(v) => set({ panel: v })} trackColor={{ true: color.practice }} />
        </View>
        <Hairline />
        <View style={styles.row}>
          <Txt variant="body">Keep transcripts</Txt>
          <Switch value={dev.keepTranscripts} onValueChange={(v) => set({ keepTranscripts: v })} trackColor={{ true: color.practice }} />
        </View>
        <Hairline />
        <Pressable accessibilityRole="button" onPress={() => router.push('/body')} style={styles.row}>
          <Txt variant="body">Body map (conversation mode)</Txt>
        </Pressable>
        <Hairline />
        <Pressable accessibilityRole="button" onPress={() => router.push('/journey')} style={styles.row}>
          <Txt variant="body">Journey (conversation mode)</Txt>
        </Pressable>
        <Hairline />
        <Pressable accessibilityRole="button" onPress={() => setPrefs({ onboarded: false }).then(() => router.replace('/onboarding'))} style={styles.row}>
          <Txt variant="body">Replay the welcome</Txt>
        </Pressable>
        <Hairline />
        <View style={styles.textBlock}>
          <Txt variant="footnote" tone="tertiary">
            Speech module: {speech ? 'in this build' : 'not in this build (Expo Go / web)'}
            {'\n'}Guide service: {hasRemote ? 'configured' : 'not configured'}
          </Txt>
        </View>
        <Hairline />
      </Group>
    </>
  );
}

const makeStyles = (color: Palette) =>
  StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xl },
  section: { marginTop: space.xxl },
  // Row and choice labels are glanced at, so lowercase (AGENTS.md "App copy"); details stay sentence case.
  label: { textTransform: 'lowercase' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: HIT + 8, paddingHorizontal: space.l },
  textBlock: { padding: space.l },
  note: { marginTop: space.s, paddingHorizontal: space.xs },
});

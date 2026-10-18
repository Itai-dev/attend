import Constants from 'expo-constants';
import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hasRemote } from '@/config';
import { useData } from '@/data/store';
import type { BrainPref, InputModePref } from '@/data/types';
import { backgroundFor, SOUNDSCAPES } from '@/domain/soundscapes';
import { haptic, Hairline, QuietButton, SectionLabel, Segmented, Txt } from '@/design/components';
import { HIT, radius, space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';
import { remindersAvailable, requestReminderPermission, scheduleReminders } from '@/voice/reminders';
import { speechModule } from '@/voice/speechModule';

/**
 * Settings, kept short. Background sound, privacy, samples, what this is not — and, in
 * development builds only, the switches for testing without a microphone.
 */

function confirm(title: string, message: string, action: string, run: () => void) {
  if (Platform.OS === 'web') return run();
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: run },
  ]);
}

function Group({ children }: { children: ReactNode }) {
  const styles = useStyles(makeStyles);
  return <View style={styles.group}>{children}</View>;
}

function Choice({ label, detail, selected, disabled, onPress }: { label: string; detail?: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={() => {
        haptic('select');
        onPress();
      }}
      style={({ pressed }) => [styles.choice, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}
    >
      <View style={{ flex: 1 }}>
        <Txt variant="body">{label}</Txt>
        {detail ? (
          <Txt variant="footnote" tone="tertiary">
            {detail}
          </Txt>
        ) : null}
      </View>
      <View style={[styles.radio, selected && styles.radioOn]} />
    </Pressable>
  );
}

export function SettingsScreen() {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { prefs, setPrefs, deleteAll, deleteSamples, addSamples, hasSamples, sessions } = useData();
  const realCount = sessions.filter((s) => !s.isSample).length;
  const background = backgroundFor(prefs);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.xxxl }}>
      <View style={styles.header}>
        <Txt variant="title">Settings</Txt>
        <QuietButton label="Done" tone="primary" onPress={() => router.back()} />
      </View>

      <SectionLabel>Daily reminder</SectionLabel>
      <Group>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Txt variant="body">A gentle reminder</Txt>
            <Txt variant="footnote" tone="tertiary">
              {remindersAvailable() ? 'One a day. Never about missed days.' : 'Needs the next app update.'}
            </Txt>
          </View>
          <Switch
            value={!!prefs.reminder?.enabled}
            disabled={!remindersAvailable()}
            trackColor={{ true: color.practice }}
            accessibilityLabel="A gentle reminder"
            onValueChange={async (on) => {
              const base = prefs.reminder ?? { enabled: false, hour: 20, minute: 30 };
              const reminder = { ...base, enabled: on && (await requestReminderPermission()) };
              await setPrefs({ reminder });
              await scheduleReminders(reminder, undefined);
            }}
          />
        </View>
        {prefs.reminder?.enabled ? (
          <>
            <Hairline />
            <View style={styles.textBlock}>
              <Segmented<string>
                options={[
                  { value: '8:0', label: 'Morning' },
                  { value: '13:0', label: 'Midday' },
                  { value: '20:30', label: 'Evening' },
                ]}
                value={`${prefs.reminder.hour}:${prefs.reminder.minute}`}
                onChange={async (v) => {
                  const [hour, minute] = v.split(':').map(Number);
                  const reminder = { enabled: true, hour, minute };
                  await setPrefs({ reminder });
                  await scheduleReminders(reminder, undefined);
                }}
              />
            </View>
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

      <SectionLabel style={styles.section}>Sound under sessions</SectionLabel>
      <Group>
        {SOUNDSCAPES.map((sc) => (
          <View key={sc.id}>
            <Choice label={sc.name} detail={sc.line} selected={background === sc.id} onPress={() => setPrefs({ background: sc.id })} />
            <Hairline />
          </View>
        ))}
        <Choice label="Voice only" detail="Only the guide’s voice" selected={background === 'none'} onPress={() => setPrefs({ background: 'none' })} />
      </Group>

      <SectionLabel style={styles.section}>Privacy</SectionLabel>
      <Group>
        <View style={styles.textBlock}>
          <Txt variant="callout" tone="secondary">
            Your sessions and check-ins are stored only on this iPhone. There is no account. Sessions are guided: they never use the microphone, and nothing you say is heard. Where the guide rests your attention comes from your latest check-in, read here on the phone. In the spoken welcome, what you say is turned into words on the device and the audio is never saved.
            {hasRemote ? ' The guide’s lines are voiced through Attend’s voice service by ElevenLabs. The only thing about you in them is the body area a practice rests on, such as “your lower back”, with no name or account attached.' : ''}
          </Txt>
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
          <Txt variant="body" style={{ color: color.destructive }}>
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
              <Txt variant="body">{hasSamples ? 'Remove sample sessions' : 'Show sample sessions'}</Txt>
            </Pressable>
          </Group>
        </>
      ) : null}

      <SectionLabel style={styles.section}>About</SectionLabel>
      <Group>
        <View style={styles.textBlock}>
          <Txt variant="callout" tone="secondary">
            Attend is a practice for familiar, long-standing sensations, built around somatic tracking: noticing a sensation with curiosity rather than fear. It isn’t a diagnostic tool and doesn’t replace medical care. If a symptom is new,
            changing quickly or severe, contact a medical professional.
          </Txt>
          <Txt variant="callout" tone="secondary" style={{ marginTop: space.m }}>
            Close attention to the body doesn’t suit everyone. If a practice brings up old memories, panic, or a far-away feeling, open your eyes, look around the room, and stop. If you notice yourself checking your body more between practices, try a shorter practice, or just listen to a sound for a while.
          </Txt>
          <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.m }}>
            Version {Constants.expoConfig?.version ?? '0.1.0'}
          </Txt>
        </View>
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
  group: {
    borderRadius: radius.m,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    overflow: 'hidden',
  },
  choice: { flexDirection: 'row', alignItems: 'center', minHeight: HIT + 12, paddingHorizontal: space.l, paddingVertical: space.s, gap: space.m },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.4, borderColor: color.textTertiary },
  radioOn: { borderWidth: 5.5, borderColor: color.text },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: HIT + 8, paddingHorizontal: space.l },
  textBlock: { padding: space.l },
  note: { marginTop: space.s, paddingHorizontal: space.xs },
});

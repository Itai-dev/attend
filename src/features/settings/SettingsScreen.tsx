import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hasRemote } from '@/config';
import { useData } from '@/data/store';
import type { BrainPref, InputModePref } from '@/data/types';
import { haptic, Hairline, Icon, QuietButton, Segmented, Txt } from '@/design/components';
import { color, HIT, radius, space } from '@/design/theme';
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

/** Section titles are bold and full-size, as on Spotify's settings, not tiny caps. */
function Section({ children, first }: { children: string; first?: boolean }) {
  return (
    <Txt variant="title2" accessibilityRole="header" style={{ marginTop: first ? 0 : space.xxl, marginBottom: space.m }}>
      {children}
    </Txt>
  );
}

function Group({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

function Choice({ label, detail, selected, disabled, onPress }: { label: string; detail?: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={() => {
        haptic('select');
        onPress();
      }}
      style={({ pressed }) => [styles.choice, { opacity: disabled ? 0.4 : 1 }, pressed && { backgroundColor: color.surfaceStrong }]}
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
  const insets = useSafeAreaInsets();
  const { prefs, setPrefs, deleteAll, sessions } = useData();
  const [name, setName] = useState(prefs.name ?? '');
  const saveName = () => {
    if (name.trim() !== (prefs.name ?? '')) void setPrefs({ name: name.trim() || undefined });
  };
  const realCount = sessions.filter((s) => !s.isSample).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{
        padding: space.l,
        paddingTop: space.xl,
        paddingBottom: insets.bottom + space.xxxl,
      }}
    >
      <View style={styles.header}>
        <Txt variant="display" accessibilityRole="header">
          Settings
        </Txt>
        <QuietButton label="Done" tone="primary" onPress={() => router.back()} />
      </View>

      <Section first>You</Section>
      <Group>
        <View style={styles.row}>
          <Txt variant="body">Name</Txt>
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={saveName}
            onSubmitEditing={saveName}
            placeholder="Add your name"
            placeholderTextColor={color.textTertiary}
            accessibilityLabel="Your name"
            autoCapitalize="words"
            returnKeyType="done"
            maxLength={30}
            style={styles.nameInput}
          />
        </View>
        <Hairline />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.back();
            void setPrefs({ onboarded: false });
          }}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.surfaceStrong }]}
        >
          <View style={{ flex: 1 }}>
            <Txt variant="body">Your plan</Txt>
            <Txt variant="footnote" tone="tertiary">
              Where it hurts, your goal, your practice time
            </Txt>
          </View>
          <Icon name="chevron.right" size={14} tint={color.textTertiary} />
        </Pressable>
      </Group>

      <Section>Daily reminder</Section>
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
            trackColor={{ true: color.accent, false: color.surfacePressed }}
            thumbColor="#FFFFFF"
            accessibilityLabel="A gentle reminder"
            onValueChange={async (on) => {
              const base = prefs.reminder ?? {
                enabled: false,
                hour: 20,
                minute: 30,
              };
              const reminder = {
                ...base,
                enabled: on && (await requestReminderPermission()),
              };
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

      <Section>Background</Section>
      <Group>
        <Choice label="Soft background" detail="Nature, quietly under the voice: a stream, waves, rain or wind" selected={prefs.ambience !== false} onPress={() => setPrefs({ ambience: true })} />
        <Hairline />
        <Choice label="Silence" detail="Only the guide’s voice and the gong" selected={prefs.ambience === false} onPress={() => setPrefs({ ambience: false })} />
      </Group>

      <Section>Privacy</Section>
      <Group>
        <View style={styles.textBlock}>
          <Txt variant="callout" tone="secondary">
            Your sessions and check-ins are stored only on this iPhone. There is no account. Sessions are guided: they never use the microphone, and nothing you say is heard. Where the guide rests
            your attention comes from your latest check-in, read here on the phone. In the spoken welcome, what you say is turned into words on the device and the audio is never saved.
            {hasRemote ? ' The guide’s lines are voiced through Attend’s voice service by ElevenLabs. Nothing about you is sent with them.' : ''}
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
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.surfaceStrong }]}
        >
          <Txt variant="body" tone="secondary">
            Delete all sessions
          </Txt>
          <Txt variant="footnote" tone="tertiary">
            {realCount === 1 ? '1 session' : `${realCount} sessions`}
          </Txt>
        </Pressable>
      </Group>

      <Section>About</Section>
      <Group>
        <View style={styles.textBlock}>
          <Txt variant="callout" tone="secondary">
            Attend is a practice for familiar, long-standing sensations, built around somatic tracking. It isn’t a diagnostic tool and doesn’t replace medical care. If a symptom is new, changing
            quickly or severe, contact a medical professional.
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
  const { prefs, setPrefs } = useData();
  const dev = prefs.dev;
  const speech = !!speechModule();
  const set = (patch: Partial<typeof dev>) => setPrefs({ dev: { ...dev, ...patch } });
  return (
    <>
      <Section>Developer</Section>
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
          <Switch value={!!dev.conversation} onValueChange={(v) => set({ conversation: v })} trackColor={{ true: color.accent, false: color.surfacePressed }} thumbColor="#FFFFFF" />
        </View>
        <Hairline />
        <View style={styles.row}>
          <Txt variant="body">Debug panel in sessions</Txt>
          <Switch value={dev.panel} onValueChange={(v) => set({ panel: v })} trackColor={{ true: color.accent, false: color.surfacePressed }} thumbColor="#FFFFFF" />
        </View>
        <Hairline />
        <View style={styles.row}>
          <Txt variant="body">Keep transcripts</Txt>
          <Switch value={dev.keepTranscripts} onValueChange={(v) => set({ keepTranscripts: v })} trackColor={{ true: color.accent, false: color.surfacePressed }} thumbColor="#FFFFFF" />
        </View>
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

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.xl,
  },
  group: {
    borderRadius: radius.m,
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: HIT + 12,
    paddingHorizontal: space.l,
    paddingVertical: space.s,
    gap: space.m,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.4,
    borderColor: color.textTertiary,
  },
  radioOn: { borderWidth: 6, borderColor: color.accent },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: HIT + 8,
    paddingHorizontal: space.l,
    // A row with a second line (the reminder, "Your plan") outgrows minHeight; without this
    // its title sat flush against the top of the card.
    paddingVertical: space.m,
    gap: space.m,
  },
  textBlock: { padding: space.l },
  nameInput: { flex: 1, textAlign: 'right', color: color.text, fontSize: 16, minHeight: HIT, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as never } : {}) },
  note: { marginTop: space.s, paddingHorizontal: space.xs },
});

import Constants from 'expo-constants';
import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDE_VOICES, hasRemote } from '@/config';
import { useData } from '@/data/store';
import type { BrainPref, InputModePref } from '@/data/types';
import { haptic, Hairline, QuietButton, SectionLabel, Segmented, Txt } from '@/design/components';
import { color, HIT, radius, space } from '@/design/theme';
import { speechModule } from '@/voice/speechModule';

/**
 * Settings, kept short. Voice, privacy, samples, what this is not — and, in
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
  const insets = useSafeAreaInsets();
  const { prefs, setPrefs, deleteAll, deleteSamples, addSamples, hasSamples, sessions } = useData();
  const natural = prefs.voiceOutput === 'natural' && hasRemote;
  const realCount = sessions.filter((s) => !s.isSample).length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.xxxl }}>
      <View style={styles.header}>
        <Txt variant="title">Settings</Txt>
        <QuietButton label="Done" tone="primary" onPress={() => router.back()} />
      </View>

      <SectionLabel>Guide voice</SectionLabel>
      <Group>
        {GUIDE_VOICES.map((v, i) => (
          <View key={v.id}>
            {i > 0 ? <Hairline /> : null}
            <Choice
              label={v.name}
              detail={v.detail}
              disabled={!hasRemote}
              selected={natural && (prefs.voiceId ?? GUIDE_VOICES[0].id) === v.id}
              onPress={() => setPrefs({ voiceOutput: 'natural', voiceId: v.id })}
            />
          </View>
        ))}
        <Hairline />
        <Choice label="On-device voice" detail="Works offline" selected={!natural} onPress={() => setPrefs({ voiceOutput: 'system' })} />
      </Group>
      {!hasRemote ? (
        <Txt variant="footnote" tone="tertiary" style={styles.note}>
          Natural voices and the adaptive guide need the Attend service, which isn’t configured in this build. Sessions use the on-device voice and guide.
        </Txt>
      ) : null}

      <SectionLabel style={styles.section}>Privacy</SectionLabel>
      <Group>
        <View style={styles.textBlock}>
          <Txt variant="callout" tone="secondary">
            Your sessions are stored only on this iPhone. There is no account. What you say is turned into words on the device and the audio is never saved.
            {hasRemote ? ' To adapt the guide, the words of the session are sent to Attend’s guide service and not stored there.' : ''}
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
          <Txt variant="body" style={{ color: '#FFB4A8' }}>
            Delete all sessions
          </Txt>
          <Txt variant="footnote" tone="tertiary">
            {realCount === 1 ? '1 session' : `${realCount} sessions`}
          </Txt>
        </Pressable>
      </Group>

      <SectionLabel style={styles.section}>Sample sessions</SectionLabel>
      <Group>
        <Pressable accessibilityRole="button" onPress={() => (hasSamples ? deleteSamples() : addSamples())} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
          <Txt variant="body">{hasSamples ? 'Remove sample sessions' : 'Show sample sessions'}</Txt>
        </Pressable>
      </Group>

      <SectionLabel style={styles.section}>About</SectionLabel>
      <Group>
        <View style={styles.textBlock}>
          <Txt variant="callout" tone="secondary">
            Attend is a practice for familiar, long-standing sensations, built around somatic tracking. It isn’t a diagnostic tool and doesn’t replace medical care. If a symptom is new,
            changing quickly or severe, contact a medical professional.
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
          <Txt variant="body">Debug panel in sessions</Txt>
          <Switch value={dev.panel} onValueChange={(v) => set({ panel: v })} trackColor={{ true: '#8D99FF' }} />
        </View>
        <Hairline />
        <View style={styles.row}>
          <Txt variant="body">Keep transcripts</Txt>
          <Switch value={dev.keepTranscripts} onValueChange={(v) => set({ keepTranscripts: v })} trackColor={{ true: '#8D99FF' }} />
        </View>
        <Hairline />
        <View style={styles.textBlock}>
          <Txt variant="footnote" tone="tertiary">
            Speech module: {speech ? 'in this build' : 'not in this build (Expo Go / web)'}
            {'\n'}Guide service: {hasRemote ? 'configured' : 'not configured'}
          </Txt>
        </View>
        <Hairline />
        <Pressable accessibilityRole="button" onPress={() => setPrefs({ onboarded: false })} style={styles.row}>
          <Txt variant="body">Show onboarding again</Txt>
        </Pressable>
      </Group>
    </>
  );
}

const styles = StyleSheet.create({
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

import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hasRemote } from '@/config';
import { useData } from '@/data/store';
import type { BrainPref, InputModePref } from '@/data/types';
import { haptic, Hairline, Icon, QuietButton, Segmented, Txt } from '@/design/components';
import { color, HIT, radius, space } from '@/design/theme';
import { heCount, isHe, tr } from '@/i18n';
import { remindersAvailable, requestReminderPermission, scheduleReminders } from '@/voice/reminders';
import { speechModule } from '@/voice/speechModule';

/**
 * Settings, kept short. Background sound, privacy, samples, what this is not — and, in
 * development builds only, the switches for testing without a microphone.
 */

function confirm(title: string, message: string, action: string, run: () => void) {
  if (Platform.OS === 'web') return run();
  Alert.alert(title, message, [
    { text: tr('Cancel', 'ביטול'), style: 'cancel' },
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
          {tr('Settings', 'הגדרות')}
        </Txt>
        <QuietButton label={tr('Done', 'סיום')} tone="primary" onPress={() => router.back()} />
      </View>

      <Section first>{tr('You', 'אני')}</Section>
      <Group>
        <View style={styles.row}>
          <Txt variant="body">{tr('Name', 'שם')}</Txt>
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={saveName}
            onSubmitEditing={saveName}
            placeholder={tr('Add your name', 'להוסיף שם')}
            placeholderTextColor={color.textTertiary}
            accessibilityLabel={tr('Your name', 'השם שלכם')}
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
            <Txt variant="body">{tr('Your plan', 'ההתאמה האישית')}</Txt>
            <Txt variant="footnote" tone="tertiary">
              {tr('Where it hurts, your goal, your practice time', 'איפה כואב, המטרה, שעת התרגול')}
            </Txt>
          </View>
          <Icon name="chevron.right" size={14} tint={color.textTertiary} />
        </Pressable>
      </Group>

      <Section>{tr('Daily reminder', 'תזכורת יומית')}</Section>
      <Group>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Txt variant="body">{tr('A gentle reminder', 'תזכורת עדינה')}</Txt>
            <Txt variant="footnote" tone="tertiary">
              {remindersAvailable()
                ? tr('One a day. Never about missed days.', 'אחת ביום. אף פעם לא על ימים בלי תרגול.')
                : tr('Needs the next app update.', 'תגיע בעדכון הבא של האפליקציה.')}
            </Txt>
          </View>
          <Switch
            value={!!prefs.reminder?.enabled}
            disabled={!remindersAvailable()}
            trackColor={{ true: color.accent, false: color.surfacePressed }}
            thumbColor="#FFFFFF"
            accessibilityLabel={tr('A gentle reminder', 'תזכורת עדינה')}
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
                  { value: '8:0', label: tr('Morning', 'בוקר') },
                  { value: '13:0', label: tr('Midday', 'צהריים') },
                  { value: '20:30', label: tr('Evening', 'ערב') },
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

      <Section>{tr('Background', 'צלילי רקע')}</Section>
      <Group>
        <Choice
          label={tr('Soft background', 'צלילי טבע')}
          detail={tr('Nature, quietly under the voice: a stream, waves, rain or wind', 'טבע, בשקט מתחת לקול: נחל, גלים, גשם או רוח')}
          selected={prefs.ambience !== false}
          onPress={() => setPrefs({ ambience: true })}
        />
        <Hairline />
        <Choice
          label={tr('Silence', 'שקט')}
          detail={tr('Only the guide’s voice and the gong', 'רק הקול המנחה והגונג')}
          selected={prefs.ambience === false}
          onPress={() => setPrefs({ ambience: false })}
        />
      </Group>

      {Platform.OS !== 'web' ? <LanguageSetting /> : null}

      <Section>{tr('Privacy', 'פרטיות')}</Section>
      <Group>
        <View style={styles.textBlock}>
          {isHe() ? (
            // The same facts as the English, kept as accurate: change both together (AGENTS.md, Local-first).
            <Txt variant="callout" tone="secondary">
              התרגולים והצ׳ק־אינים נשמרים רק באייפון הזה. אין חשבון. התרגולים מונחים: הם אף פעם לא משתמשים במיקרופון, ושום דבר שנאמר לא נשמע. המקום שעליו הקול המנחה מכוון את
              תשומת הלב נלקח מהצ׳ק־אין האחרון, ונקרא כאן בטלפון. בברכה הקולית בהתחלה, מה שאומרים הופך למילים במכשיר עצמו, והשמע אף פעם לא נשמר.
              {hasRemote ? ' המשפטים של הקול המנחה מוקראים דרך שירות הקול של Attend, באמצעות ElevenLabs. שום דבר עליכם לא נשלח איתם.' : ''}
            </Txt>
          ) : (
            <Txt variant="callout" tone="secondary">
              Your sessions and check-ins are stored only on this iPhone. There is no account. Sessions are guided: they never use the microphone, and nothing you say is heard. Where the guide rests
              your attention comes from your latest check-in, read here on the phone. In the spoken welcome, what you say is turned into words on the device and the audio is never saved.
              {hasRemote ? ' The guide’s lines are voiced through Attend’s voice service by ElevenLabs. Nothing about you is sent with them.' : ''}
            </Txt>
          )}
        </View>
        <Hairline />
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            confirm(
              tr('Delete all sessions?', 'למחוק את כל התרגולים?'),
              tr('Every session and map on this iPhone will be removed. This can’t be undone.', 'כל התרגולים והמפות באייפון הזה יימחקו. אי אפשר לבטל את זה.'),
              tr('Delete all', 'למחוק הכול'),
              () => {
                deleteAll();
              },
            )
          }
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.surfaceStrong }]}
        >
          <Txt variant="body" tone="secondary">
            {tr('Delete all sessions', 'למחוק את כל התרגולים')}
          </Txt>
          <Txt variant="footnote" tone="tertiary">
            {isHe() ? heCount(realCount, 'תרגול אחד', 'תרגולים', 'שני תרגולים') : realCount === 1 ? '1 session' : `${realCount} sessions`}
          </Txt>
        </Pressable>
      </Group>

      <Section>{tr('About', 'אודות')}</Section>
      <Group>
        <View style={styles.textBlock}>
          <Txt variant="callout" tone="secondary">
            {isHe()
              ? 'Attend הוא תרגול לתחושות מוכרות שנמשכות זמן רב, שבנוי סביב מעקב סומטי. הוא לא כלי לאבחון ולא מחליף טיפול רפואי. אם תסמין חדש, משתנה מהר או חמור, כדאי לפנות לגורם רפואי.'
              : 'Attend is a practice for familiar, long-standing sensations, built around somatic tracking. It isn’t a diagnostic tool and doesn’t replace medical care. If a symptom is new, changing quickly or severe, contact a medical professional.'}
          </Txt>
          <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.m }}>
            {tr('Version', 'גרסה')} {Constants.expoConfig?.version ?? '0.1.0'}
          </Txt>
        </View>
      </Group>

      {__DEV__ ? <DeveloperSettings /> : null}
    </ScrollView>
  );
}

/**
 * The app's language is iOS's to choose (Settings → Attend → Language), not ours: iOS then
 * restarts the app and lays it out right to left, which an in-app switch couldn't do cleanly
 * (src/i18n/device.ts). So this row shows the current language and opens that page. The
 * section title carries both names, so someone who landed in the wrong language still finds it.
 */
function LanguageSetting() {
  return (
    <>
      <Section>{tr('Language · שפה', 'שפה · Language')}</Section>
      <Group>
        <Pressable
          accessibilityRole="button"
          accessibilityHint={tr('Opens Attend in iPhone Settings', 'פותח את Attend בהגדרות של האייפון')}
          onPress={() => {
            void Linking.openSettings();
          }}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.surfaceStrong }]}
        >
          <Txt variant="body">{tr('App language', 'שפת האפליקציה')}</Txt>
          <View style={styles.value}>
            <Txt variant="body" tone="tertiary">
              {isHe() ? 'עברית' : 'English'}
            </Txt>
            <Icon name="chevron.right" size={14} tint={color.textTertiary} />
          </View>
        </Pressable>
      </Group>
      <Txt variant="footnote" tone="tertiary" style={styles.note}>
        {tr(
          'The language is chosen in iPhone Settings → Attend → Language. Attend restarts in the new language.',
          'השפה נבחרת בהגדרות של האייפון: הגדרות ← Attend ← שפה. האפליקציה תיפתח מחדש בשפה החדשה.',
        )}
      </Txt>
    </>
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
  value: { flexDirection: 'row', alignItems: 'center', gap: space.s },
});

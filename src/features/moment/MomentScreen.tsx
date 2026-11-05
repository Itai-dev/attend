import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { newId } from '@/domain/ids';
import { haptic, IconButton, PrimaryButton, Txt } from '@/design/components';
import { color, radius, space } from '@/design/theme';
import { tr } from '@/i18n';

/**
 * A moment: something the person did toward their goal, or a time the pain was quieter than
 * they expected — in their own words. These become their own evidence (docs/RESEARCH.md §1,
 * §4). No rating, no amount, nothing derived.
 */
export function MomentScreen() {
  const insets = useSafeAreaInsets();
  const { prefs, setPrefs } = useData();
  const [text, setText] = useState('');
  const ready = text.trim().length > 0;

  const save = async () => {
    if (!ready) return;
    await setPrefs({
      moments: [{ id: newId('mo_'), at: Date.now(), text: text.trim() }, ...(prefs.moments ?? [])].slice(0, 200),
    });
    haptic('soft');
    router.back();
  };

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + space.l }]}>
      <View style={styles.top}>
        <IconButton icon="xmark" label={tr('Close', 'לסגור')} onPress={() => router.back()} tint={color.textSecondary} />
      </View>
      <View style={{ paddingHorizontal: space.l, flex: 1 }}>
        <Txt variant="display" accessibilityRole="header">
          {tr('Save a moment', 'לשמור רגע')}
        </Txt>
        <Txt variant="callout" tone="secondary" style={{ marginTop: space.s }}>
          {prefs.goal
            ? tr(
                `A step toward ${prefs.goal.charAt(0).toLowerCase() + prefs.goal.slice(1)}, or a time the pain was quieter than you expected.`,
                // The goal is shown as typed, between dashes: Hebrew can't fold any phrase into "toward".
                `צעד בדרך למטרה – ${prefs.goal} – או רגע שבו הכאב היה שקט יותר ממה שציפיתם.`,
              )
            : tr('A step you took, or a time the pain was quieter than you expected.', 'צעד שעשיתם, או רגע שבו הכאב היה שקט יותר ממה שציפיתם.')}
        </Txt>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={tr('Built Lego on the floor for half an hour', 'בניתי לגו על הרצפה חצי שעה')}
          placeholderTextColor={color.textTertiary}
          accessibilityLabel={tr('Your moment', 'הרגע שלכם')}
          multiline
          maxLength={160}
          autoFocus
          style={styles.input}
        />
        <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.s }}>
          {tr('Stays on this iPhone.', 'נשאר באייפון הזה.')}
        </Txt>
      </View>
      <View style={{ paddingHorizontal: space.l }}>
        <PrimaryButton label={tr('Save', 'לשמור')} disabled={!ready} style={{ opacity: ready ? 1 : 0.4 }} onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  top: { flexDirection: 'row', justifyContent: 'flex-end', padding: space.s },
  input: {
    marginTop: space.xl,
    minHeight: 120,
    padding: space.l,
    borderRadius: radius.m,
    backgroundColor: color.surfaceStrong,
    color: color.text,
    fontSize: 18,
    lineHeight: 25,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as never } : {}),
  },
});

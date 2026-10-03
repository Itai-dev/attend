import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QuietButton, Txt } from '@/design/components';
import { color, radius, space } from '@/design/theme';
import { useVoiceSession } from '@/voice/VoiceSessionProvider';

/**
 * DEVELOPER ONLY. Rendered solely when __DEV__ is true and the developer
 * setting is on. Shows what the guide said and heard, and lets a developer
 * type answers when the typed-input mode is selected. This is exactly the
 * transcript UI the product refuses to have, which is why it lives here.
 */
export function DevPanel() {
  const vs = useVoiceSession();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(true);
  if (!__DEV__) return null;

  return (
    <View style={[styles.panel, { top: insets.top + 56 }]}>
      <View style={styles.head}>
        <Txt variant="caption" tone="tertiary">
          DEV · {vs.labels.input} · {vs.labels.output} · {vs.labels.brain}
        </Txt>
        <QuietButton label={open ? 'Hide' : 'Show'} onPress={() => setOpen(!open)} />
      </View>
      {open ? (
        <>
          <ScrollView style={{ maxHeight: 220 }} ref={(r) => r?.scrollToEnd({ animated: false })}>
            {vs.debug.map((d, i) => (
              <Txt key={i} variant="footnote" tone={d.who === 'guide' ? 'secondary' : d.who === 'user' ? 'primary' : 'tertiary'}>
                {d.who === 'guide' ? '◦ ' : d.who === 'user' ? '› ' : '· '}
                {d.text}
              </Txt>
            ))}
          </ScrollView>
          {vs.devInput ? (
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type an answer and press return"
              placeholderTextColor={color.textTertiary}
              style={styles.input}
              returnKeyType="send"
              onSubmitEditing={() => {
                vs.devInput?.inject(text);
                setText('');
              }}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: space.m,
    right: space.m,
    padding: space.m,
    borderRadius: radius.m,
    backgroundColor: 'rgba(20,20,24,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: {
    marginTop: space.s,
    minHeight: 44,
    borderRadius: radius.s,
    paddingHorizontal: space.m,
    color: color.text,
    backgroundColor: color.surface,
  },
});

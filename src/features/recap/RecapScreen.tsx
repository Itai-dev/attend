import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { consolidateChanges } from '@/domain/bodyMap';
import type { Session } from '@/domain/types';
import { Hairline, IconButton, PrimaryButton, QuietButton, SampleBadge, Segmented, Txt } from '@/design/components';
import { color, radius, space } from '@/design/theme';
import { SESSION_TYPE_LABELS } from '@/engine/phases';
import { useVoiceSession } from '@/voice/VoiceSessionProvider';
import { BodyField } from '@/viz/BodyField';
import { preferredView, type View as FigureView } from '@/viz/bodyUniforms';
import { sessionDate } from '../shared/format';

/**
 * "Here's what you noticed."
 *
 * Opened straight after a session (reveal: the map fades in as the eyes
 * open) or from Journey (detail). The words are the recap's — built only from
 * what the person said — and the map is labelled as an interpretation.
 */

export function RecapRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Recap id={id} mode="reveal" />;
}

export function SessionDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Recap id={id} mode="detail" />;
}

function Recap({ id, mode }: { id: string; mode: 'reveal' | 'detail' }) {
  const { sessions, deleteSession } = useData();
  const vs = useVoiceSession();
  const session = sessions.find((s) => s.id === id);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [view, setView] = useState<FigureView>(() => (session ? preferredView(session.bodyMapEnd) : 'back'));
  const [showStart, setShowStart] = useState(false);
  const reveal = useSharedValue(mode === 'reveal' ? 0 : 1);

  useEffect(() => {
    if (mode === 'reveal') reveal.value = withDelay(700, withTiming(1, { duration: 2600, easing: Easing.out(Easing.cubic) }));
  }, [mode, reveal]);

  if (!session) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <Txt tone="secondary">This session is no longer here.</Txt>
        <QuietButton label="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const mapW = Math.min(width, 520);
  const mapH = Math.min(height * 0.56, mapW * 1.3);
  const special = session.outcome === 'safety_pause' || session.outcome === 'crisis_pause';

  const done = () => {
    vs.reset();
    // Back to the start: the app is used, then left. What was gathered waits behind "Lately".
    if (router.canDismiss()) router.dismissAll();
    else router.replace('/');
  };

  return (
    <View style={styles.root}>
      {mode === 'detail' ? (
        <Stack.Screen
          options={{
            headerShown: true,
            headerTransparent: true,
            headerTitle: '',
            headerTintColor: color.text,
            headerBackButtonDisplayMode: 'minimal',
            headerShadowVisible: false,
          }}
        />
      ) : null}
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + (mode === 'detail' ? 52 : space.xl), paddingBottom: insets.bottom + space.xxxl }}
      >
        <View style={styles.pad}>
          {mode === 'reveal' ? (
            <Animated.View entering={FadeIn.duration(1400)}>
              <Txt variant="display" accessibilityRole="header">
                Here’s what you noticed.
              </Txt>
            </Animated.View>
          ) : (
            <View style={styles.metaRow}>
              <Txt variant="footnote" tone="tertiary">
                {sessionDate(session.startedAt)} · {SESSION_TYPE_LABELS[session.sessionType].title}
              </Txt>
              {session.isSample ? <SampleBadge /> : null}
            </View>
          )}
        </View>

        {!special ? (
          <View style={{ alignItems: 'center', marginTop: space.l }}>
            <BodyField
              map={showStart ? session.bodyMapStart : session.bodyMapEnd}
              view={view}
              width={mapW}
              height={mapH}
              reveal={reveal}
            />
            <View style={styles.mapControls}>
              <Segmented
                options={[
                  { value: 'front', label: 'Front' },
                  { value: 'back', label: 'Back' },
                ]}
                value={view}
                onChange={setView}
              />
              {session.changes.some((c) => c.type !== 'stable') ? (
                <Segmented
                  options={[
                    { value: 'start', label: 'At first' },
                    { value: 'end', label: 'By the end' },
                  ]}
                  value={showStart ? 'start' : 'end'}
                  onChange={(v) => setShowStart(v === 'start')}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        <Animated.View entering={mode === 'reveal' ? FadeInDown.delay(1600).duration(1200) : undefined} style={[styles.pad, { marginTop: space.xl }]}>
          <Txt variant="title2" style={{ fontWeight: '400' }}>
            {session.title}
          </Txt>
          <Txt variant="body" tone="secondary" style={{ marginTop: space.m }}>
            {session.summary}
          </Txt>

          <Changes session={session} />

          {special ? (
            <View style={styles.care}>
              <Txt variant="callout" tone="secondary">
                {session.outcome === 'crisis_pause'
                  ? 'If you are in immediate danger, call your local emergency number. You can also find a free, confidential crisis line in your country at findahelpline.com.'
                  : 'If a symptom is severe, sudden or getting worse quickly, contact emergency services or a doctor now.'}
              </Txt>
            </View>
          ) : (
            <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.xl }}>
              The figure is a visual interpretation of what you described. It is not a scan or a measurement.
            </Txt>
          )}
        </Animated.View>

        <View style={[styles.pad, { marginTop: space.xxl }]}>
          {mode === 'reveal' ? (
            <PrimaryButton label="Done" onPress={done} />
          ) : (
            <QuietButton
              label="Delete this session"
              style={{ alignSelf: 'flex-start' }}
              onPress={() => {
                const go = async () => {
                  await deleteSession(session.id);
                  router.back();
                };
                if (Platform.OS === 'web') return void go();
                Alert.alert('Delete this session?', 'It will be removed from this iPhone.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: go },
                ]);
              }}
            />
          )}
        </View>
      </ScrollView>
      {mode === 'reveal' ? (
        <View style={[styles.close, { top: insets.top + space.s }]}>
          <IconButton icon="xmark" label="Close" onPress={done} tint={color.textSecondary} />
        </View>
      ) : null}
    </View>
  );
}

function Changes({ session }: { session: Session }) {
  const lines = useMemo(
    () =>
      consolidateChanges(session.changes)
        .filter((c) => c.type !== 'stable')
        .map((c) => c.description),
    [session.changes],
  );
  if (lines.length === 0) return null;
  return (
    <View style={{ marginTop: space.xl }}>
      <Hairline style={{ marginBottom: space.l }} />
      <Txt variant="caption" tone="tertiary" style={{ textTransform: 'uppercase', marginBottom: space.s }}>
        As you watched
      </Txt>
      {lines.map((l, i) => (
        <View key={i} style={styles.changeRow}>
          <View style={styles.changeDot} />
          <Txt variant="callout">{l}</Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  pad: { paddingHorizontal: space.xl },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  mapControls: { flexDirection: 'row', gap: space.s, marginTop: space.m, flexWrap: 'wrap', justifyContent: 'center' },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 30 },
  changeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: color.textTertiary },
  care: {
    marginTop: space.xl,
    padding: space.l,
    borderRadius: radius.m,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
  },
  close: { position: 'absolute', right: space.m },
});

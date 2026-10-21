import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { LISTEN_TIMERS, listenTimerFor, SOUNDS, soundFor, timerLabel, type ListenTimer, type SoundId } from '@/domain/sounds';
import { haptic, Hairline, PrimaryButton, QuietButton, Segmented, Txt } from '@/design/components';
import { color, HIT, radius, space } from '@/design/theme';
import { pauseListening, resumeListening, setListenTimer, startListening, stopListening, useListen } from '@/voice/listen';
import { Enso } from '@/viz/Enso';

/**
 * Sounds, a tab (21 Oct 2026, as on the three-tab design): just listen to a nature recording on
 * its own, no voice, on a timer. Chosen with the eyes open; once it plays there is nothing to
 * do, and it fades out on its own. It keeps playing on another tab or with the phone locked.
 *
 * Not practice: nothing here is recorded or counted toward the program (domain/sounds.ts).
 * Begin and Stop are words, like everywhere else in Attend, not a media player's icons.
 */

const TIMER_OPTIONS = LISTEN_TIMERS.map((m) => ({ value: String(m), label: m ? `${m} min` : '∞' }));

export function SoundsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { prefs, setPrefs } = useData();
  const live = useListen();
  const [picked, setPicked] = useState<SoundId>(live.id ?? soundFor(prefs.listen?.id).id);
  const [timer, setTimer] = useState<ListenTimer>(live.id ? live.timer : listenTimerFor(prefs.listen?.timer));
  const current = soundFor(live.id ?? picked);
  const shownTimer = live.id ? live.timer : timer;

  const remember = (id: SoundId, t: ListenTimer) => setPrefs({ listen: { id, timer: t } });

  const pick = (id: SoundId) => {
    haptic('select');
    setPicked(id);
    if (live.id) startListening(id); // crosses into the new sound
    remember(id, shownTimer);
  };

  const begin = () => {
    haptic('soft');
    startListening(picked, timer);
    remember(picked, timer);
  };

  const status = !live.id
    ? `${timer ? `${timer} minutes` : 'Until you stop'}, then it fades out`
    : !live.playing
      ? 'Paused'
      : `${current.name} · ${timerLabel(live.timer, live.timerElapsedMs)}`;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.l, paddingTop: insets.top + space.l, paddingBottom: insets.bottom + 120 }}>
        <Txt variant="display" accessibilityRole="header">
          Sounds
        </Txt>
        <Txt variant="callout" tone="secondary" style={{ marginTop: space.s }}>
          Just listen: no voice, just a place. It keeps playing with the screen locked and fades out on its own.
        </Txt>

        <Enso width={width - space.l * 2} height={150} mode={!live.id ? 'idle' : live.playing ? 'holding' : 'paused'} dim={live.id ? 1 : 0.5} style={{ marginVertical: space.l }} />

        <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel="Sound">
          {SOUNDS.map((s, i) => {
            const on = s.id === current.id;
            return (
              <View key={s.id}>
                {i ? <Hairline /> : null}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${s.name}. ${s.line}`}
                  onPress={() => pick(s.id)}
                  style={({ pressed }) => [styles.choice, pressed && { backgroundColor: color.surfaceStrong }]}
                >
                  <View style={{ flex: 1 }}>
                    <Txt variant="body">{s.name}</Txt>
                    <Txt variant="footnote" tone="tertiary">
                      {s.line}
                    </Txt>
                  </View>
                  <View style={[styles.radio, on && styles.radioOn]} />
                </Pressable>
              </View>
            );
          })}
        </View>

        <Segmented
          options={TIMER_OPTIONS}
          value={String(shownTimer)}
          onChange={(v) => {
            const t = listenTimerFor(Number(v));
            setTimer(t);
            if (live.id) setListenTimer(t);
            remember(current.id, t);
          }}
          style={{ marginTop: space.l }}
        />

        <Txt variant="footnote" tone="secondary" align="center" accessibilityLiveRegion="polite" style={{ marginTop: space.xl }}>
          {status}
        </Txt>
        {live.id ? (
          <View style={styles.controls}>
            <QuietButton label={live.playing ? 'Pause' : 'Resume'} tone="primary" onPress={() => (live.playing ? pauseListening() : resumeListening())} />
            <QuietButton label="Stop" onPress={() => stopListening()} />
          </View>
        ) : (
          <PrimaryButton label="Begin" onPress={begin} style={{ marginTop: space.m }} />
        )}

        <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.xl }}>
          Just for listening. It isn’t practice, and nothing is recorded.
        </Txt>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  group: { borderRadius: radius.m, backgroundColor: color.surface, overflow: 'hidden' },
  choice: { flexDirection: 'row', alignItems: 'center', minHeight: HIT + 12, paddingHorizontal: space.l, paddingVertical: space.s, gap: space.m },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.4, borderColor: color.textTertiary },
  radioOn: { borderWidth: 6, borderColor: color.accent },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: space.xxl, marginTop: space.s },
});

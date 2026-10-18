import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { LISTEN_TIMERS, soundscape, SOUNDSCAPES, timerLabel, type ListenTimer, type SoundscapeId } from '@/domain/soundscapes';
import { haptic, Icon, IconButton, Segmented, Txt } from '@/design/components';
import { color, HIT, radius, space } from '@/design/theme';
import { pauseListening, resumeListening, setListenTimer, startListening, stopListening, useListen } from '@/voice/listen';
import { Landscape, sceneSky } from '@/viz/Landscape';

/**
 * Just listen: a sound on its own, with a timer, for falling asleep, a loud evening, or a
 * few quiet minutes. Choose with the eyes open; once it plays there is nothing to do, and it
 * fades out on its own. It keeps playing if this screen is closed or the phone is locked.
 *
 * It is not practice: nothing here counts toward the program, and nothing is recorded.
 */

const TIMER_OPTIONS = LISTEN_TIMERS.map((m) => ({ value: String(m), label: m ? `${m}` : '∞' }));

export function ListenScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { prefs, setPrefs } = useData();
  const live = useListen();
  const [picked, setPicked] = useState<SoundscapeId>(live.id ?? prefs.listen?.id ?? 'rain');
  const [timer, setTimer] = useState<ListenTimer>(live.id ? live.timer : (prefs.listen?.timer ?? 20));
  const current = soundscape(live.id ?? picked)!;
  const playing = !!live.id && live.playing;
  const heroH = Math.round(height * 0.46);

  const remember = (id: SoundscapeId, t: ListenTimer) => setPrefs({ listen: { id, timer: t } });

  const pick = (id: SoundscapeId) => {
    haptic('select');
    setPicked(id);
    if (live.id) startListening(id); // crossfades into the new sound
    remember(id, timer);
  };

  const toggle = () => {
    haptic('soft');
    if (!live.id) {
      startListening(picked, timer);
      remember(picked, timer);
    } else if (live.playing) pauseListening();
    else resumeListening();
  };

  const status = !live.id ? `${timer ? `${timer} minutes` : 'Until you stop'} · fades out gently` : !live.playing ? 'Paused' : timerLabel(live.timer, live.timerElapsedMs);

  return (
    <View style={[styles.root, { backgroundColor: sceneSky(current.id) }]}>
      <Animated.View key={current.id} entering={FadeIn.duration(700)}>
        <Landscape scene={current.id} width={width} height={heroH} />
      </Animated.View>

      <View style={[styles.top, { paddingTop: insets.top + space.s }]}>
        <IconButton icon="chevron.down" label="Close. The sound keeps playing" onPress={() => router.back()} variant="filled" tint={color.text} />
        {live.id ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop the sound"
            hitSlop={8}
            onPress={() => {
              haptic('select');
              stopListening();
            }}
            style={styles.stop}
          >
            <Txt variant="footnote" style={{ fontWeight: '600' }}>
              Stop
            </Txt>
          </Pressable>
        ) : null}
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }} showsVerticalScrollIndicator={false}>
        <Txt variant="caption" style={styles.kicker}>
          JUST LISTEN
        </Txt>
        <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.xs }}>
          {current.name}
        </Txt>
        <Txt variant="callout" tone="secondary" style={{ marginTop: 2 }}>
          {current.line}
        </Txt>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sounds}
          style={{ marginHorizontal: -space.xl }}
          // Open with the chosen sound in view, not scrolled off the right edge.
          contentOffset={{ x: Math.max(0, SOUNDSCAPES.findIndex((s) => s.id === current.id) * (76 + space.m) - width / 3), y: 0 }}
        >
          {SOUNDSCAPES.map((s) => {
            const on = s.id === current.id;
            return (
              <Pressable
                key={s.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${s.name}. ${s.line}`}
                onPress={() => pick(s.id)}
                style={({ pressed }) => [styles.sound, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[styles.thumbRing, on && styles.thumbRingOn]}>
                  <Landscape scene={s.id} width={68} height={68} radius={radius.m} still />
                </View>
                <Txt variant="footnote" tone={on ? 'primary' : 'secondary'} align="center" numberOfLines={1} style={{ marginTop: space.xs, fontWeight: on ? '600' : '400' }}>
                  {s.name}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.timerRow}>
          <Txt variant="caption" tone="tertiary" style={{ letterSpacing: 1.2 }}>
            MINUTES
          </Txt>
          <Segmented
            fill
            options={TIMER_OPTIONS}
            value={String(live.id ? live.timer : timer)}
            onChange={(v) => {
              const t = Number(v) as ListenTimer;
              setTimer(t);
              if (live.id) setListenTimer(t);
              remember(current.id, t);
            }}
          />
        </View>

        <View style={styles.playRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pause' : live.id ? 'Resume' : `Play ${current.name}`}
            onPress={toggle}
            style={({ pressed }) => [styles.play, { paddingLeft: playing ? 0 : 3, transform: [{ scale: pressed ? 0.95 : 1 }] }]}
          >
            <Icon name={playing ? 'pause.fill' : 'play.fill'} size={26} tint={color.onAccent} />
          </Pressable>
          <Txt variant="footnote" tone="secondary" align="center" style={{ marginTop: space.m }} accessibilityLiveRegion="polite">
            {status}
          </Txt>
        </View>

        <Txt variant="footnote" tone="tertiary" align="center" style={{ marginTop: space.l }}>
          Keeps playing with the screen locked. Nothing is recorded.
        </Txt>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.l },
  stop: { minHeight: HIT, minWidth: HIT, paddingHorizontal: space.l, borderRadius: radius.pill, backgroundColor: 'rgba(13,22,21,0.45)', alignItems: 'center', justifyContent: 'center' },
  sheet: {
    flex: 1,
    marginTop: -radius.l,
    borderTopLeftRadius: radius.l,
    borderTopRightRadius: radius.l,
    backgroundColor: color.bg,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
  },
  kicker: { color: color.sky, letterSpacing: 1.4 },
  sounds: { gap: space.m, paddingHorizontal: space.xl, paddingVertical: space.l },
  sound: { width: 76, alignItems: 'center' },
  thumbRing: { padding: 2, borderRadius: radius.m + 3, borderWidth: 2, borderColor: 'transparent' },
  thumbRingOn: { borderColor: color.sky },
  timerRow: { gap: space.s },
  playRow: { alignItems: 'center', marginTop: space.xl },
  play: { width: 76, height: 76, borderRadius: 38, backgroundColor: color.text, alignItems: 'center', justifyContent: 'center' },
});

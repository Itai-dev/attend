import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { DEFAULT_BACKGROUND, LISTEN_TIMERS, migrateListenId, soundscape, SOUNDSCAPES, timerLabel, type ListenTimer, type SoundscapeId } from '@/domain/soundscapes';
import { haptic, IconButton, Segmented, Txt } from '@/design/components';
import { radius, space, type Palette } from '@/design/theme';
import { ForceDark, useColors, useStyles } from '@/design/ThemeProvider';
import { pauseListening, resumeListening, setListenTimer, startListening, stopListening, useListen } from '@/voice/listen';
import { Photo } from '@/design/Photo';

/**
 * Just listen: a sound on its own, with a timer, for falling asleep, a loud evening, or a
 * few quiet minutes. Choose with the eyes open; once it plays there is nothing to do, and it
 * fades out on its own. It keeps playing if this screen is closed or the phone is locked.
 *
 * It is not practice: nothing here counts toward the program, and nothing is recorded.
 *
 * Round 5: play, pause and stop are icons, not "pause →" and "stop →" (an arrow says "this goes
 * somewhere"), and from 21:00 to 05:00 the screen is dark and the photograph dimmed, for someone
 * reaching for a sound in a dark room.
 */

const TIMER_OPTIONS = LISTEN_TIMERS.map((m) => ({ value: String(m), label: m ? `${m}` : '∞' }));

/** Night, for this screen: when a bright photograph is the last thing someone wants to see. */
export function isNight(hour: number): boolean {
  return hour >= 21 || hour < 5;
}

/** Laid over the photograph at night, on top of its usual scrim: the place is still there, barely. */
const NIGHT_SCRIM = 'rgba(0,0,0,0.58)';

export function ListenScreen() {
  // Decided once on open, like the lesson: the screen doesn't change under someone at 20:59.
  const [night] = useState(() => isNight(new Date().getHours()));
  return night ? (
    <ForceDark>
      <ListenBody night />
    </ForceDark>
  ) : (
    <ListenBody night={false} />
  );
}

function ListenBody({ night }: { night: boolean }) {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { prefs, setPrefs } = useData();
  const live = useListen();
  const [picked, setPicked] = useState<SoundscapeId>(live.id ?? migrateListenId(prefs.listen?.id));
  const [timer, setTimer] = useState<ListenTimer>(live.id ? live.timer : (prefs.listen?.timer ?? 20));
  const current = soundscape(live.id ?? picked) ?? soundscape(DEFAULT_BACKGROUND)!;
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

  const status = !live.id ? `${timer ? `${timer} minutes` : 'until you stop'} · fades out gently` : !live.playing ? 'paused' : timerLabel(live.timer, live.timerElapsedMs);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }} showsVerticalScrollIndicator={false} bounces={false}>
        {/* The sound's place, full-bleed, its name set over it as Daisy sets a headline. */}
        <Animated.View key={current.id} entering={FadeIn.duration(700)}>
          <Photo scene={current.id} width={width} height={heroH} drift>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]} />
            {night ? <View style={[StyleSheet.absoluteFill, { backgroundColor: NIGHT_SCRIM }]} /> : null}
            <View style={styles.heroText}>
              <Txt variant="footnote" style={[styles.onImage, { fontWeight: '500', opacity: 0.9 }]}>
                just listen
              </Txt>
              <Txt variant="display" accessibilityRole="header" style={styles.onImage}>
                {current.name}
              </Txt>
              <Txt variant="callout" style={[styles.onImage, { opacity: 0.9, marginTop: 2 }]}>
                {current.line}
              </Txt>
            </View>
          </Photo>
        </Animated.View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sounds}
          // Open with the chosen sound in view, not scrolled off the right edge.
          contentOffset={{ x: Math.max(0, SOUNDSCAPES.findIndex((s) => s.id === current.id) * (THUMB_W + space.m) - width / 3), y: 0 }}
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
                <Photo scene={s.id} width={THUMB_W} height={THUMB_H} radius={radius.s} style={[on ? styles.thumbOn : undefined, night && !on ? { opacity: 0.6 } : undefined]} />
                <Txt variant="footnote" tone={on ? 'primary' : 'secondary'} numberOfLines={1} style={{ marginTop: space.s, fontWeight: on ? '600' : '400' }}>
                  {s.name}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.body}>
          <View style={styles.timerRow}>
            <Txt variant="footnote" tone="secondary" style={{ fontWeight: '500' }}>
              minutes
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

          <View style={styles.controls}>
            <Txt variant="footnote" tone="secondary" align="center" accessibilityLiveRegion="polite">
              {status}
            </Txt>
            <View style={styles.controlRow}>
              {/* Stop sits left of play, a spacer balances it on the right, so play stays centred. */}
              {live.id ? (
                <IconButton icon="stop.fill" label="Stop the sound" variant="filled" size={52} iconSize={16} tint={color.textSecondary} onPress={() => stopListening()} />
              ) : (
                <View style={styles.side} />
              )}
              <IconButton
                icon={playing ? 'pause.fill' : 'play.fill'}
                label={playing ? 'Pause' : live.id ? 'Resume' : `Play ${current.name}`}
                size={72}
                iconSize={26}
                tint={color.onAccent}
                style={{ backgroundColor: color.accent }}
                onPress={toggle}
              />
              <View style={styles.side} />
            </View>
          </View>

          <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.l }}>
            Keeps playing with the screen locked. Just for listening; nothing is tracked.
          </Txt>
        </View>
      </ScrollView>

      <View style={[styles.top, { paddingTop: insets.top + space.s }]}>
        <IconButton icon="chevron.down" label="Close. The sound keeps playing" onPress={() => router.back()} tint={color.onImage} style={styles.close} />
      </View>
    </View>
  );
}

const THUMB_W = 84;
const THUMB_H = 105;

const makeStyles = (color: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: color.bg },
    top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.l },
    close: { backgroundColor: 'rgba(5,8,9,0.25)', borderRadius: radius.s },
    heroText: { position: 'absolute', left: space.xl, right: space.xl, bottom: space.xl },
    onImage: { color: color.onImage, textShadowColor: 'rgba(5,8,9,0.3)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 1 } },
    sounds: { gap: space.m, paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.l },
    sound: { width: THUMB_W },
    thumbOn: { borderWidth: 2, borderColor: color.text },
    body: { paddingHorizontal: space.xl },
    timerRow: { gap: space.s },
    controls: { marginTop: space.xl, alignItems: 'center', gap: space.m },
    controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xl },
    side: { width: 52, height: 52 },
  });

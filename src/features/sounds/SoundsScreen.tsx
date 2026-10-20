import { router } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useData } from '@/data/store';
import { backgroundFor, backgroundLabel, DEFAULT_LISTEN_TIMER, SOUNDSCAPES, timerLabel, type SoundscapeId } from '@/domain/soundscapes';
import { haptic, Icon, SettingsGear, TitledScroll, Txt } from '@/design/components';
import { Photo, PhotoFade } from '@/design/Photo';
import { radius, space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';
import { startListening, useListen } from '@/voice/listen';
import { todaysPractice } from '../shared/start';

/**
 * Sounds: one tap plays. No choosing a timer first — the last one used (twenty minutes the
 * first time) applies, shown on every tile, and the player that opens can change it. For sleep,
 * a loud evening, or a few quiet minutes. Atmosphere only: never counted as practice, nothing
 * recorded. The sound under a practice is set in Settings (and practice settings); the row at
 * the foot links there rather than being a third place to set it.
 */
export function SoundsScreen() {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const { width } = useWindowDimensions();
  const { prefs, setPrefs } = useData();
  const live = useListen();
  // "matched · fireside", "soft rain", "no sound": the same words as Settings' row.
  const under = backgroundLabel(backgroundFor(prefs), todaysPractice(prefs));
  const tile = (width - space.xl * 2 - space.m) / 2;
  // The remembered timer, on every tile, so a tap's outcome is known before it's made.
  const timer = prefs.listen?.timer ?? DEFAULT_LISTEN_TIMER;
  const meta = timer ? `${timer} min · fades out` : 'until you stop';

  const play = (id: SoundscapeId) => {
    haptic('soft');
    const timer = prefs.listen?.timer ?? DEFAULT_LISTEN_TIMER;
    startListening(id, live.id ? live.timer : timer);
    setPrefs({ listen: { id, timer } });
    router.push('/listen');
  };

  return (
    <TitledScroll title="sounds" right={<SettingsGear />}>
      {/* Round 5: "can't sleep" started a voice when Tom wanted rain. Here there is no voice. */}
      <Txt variant="callout" tone="secondary" style={{ marginTop: -space.m, marginBottom: space.xl }}>
        No voice, just the place. Plays with the screen locked and fades out on its own.
      </Txt>
      <View style={styles.grid}>
        {SOUNDSCAPES.map((s) => {
          const on = live.id === s.id;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={on ? `${s.name}, playing. Open` : `${s.name}. ${s.line}. Plays now, ${meta}`}
              onPress={() => (on ? router.push('/listen') : play(s.id))}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <Photo scene={s.id} width={tile} height={Math.round(tile * 1.2)} radius={radius.s}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]} />
                <PhotoFade />
                {on ? (
                  <View style={styles.badge}>
                    <Icon name={live.playing ? 'speaker.wave.2.fill' : 'pause.fill'} size={12} tint={color.onImage} />
                    <Txt variant="caption" style={styles.onImage}>
                      {live.playing ? timerLabel(live.timer, live.timerElapsedMs) : 'paused'}
                    </Txt>
                  </View>
                ) : null}
                <View style={styles.tileText}>
                  <Txt variant="headline" style={[styles.onImage, styles.shadow, { textTransform: 'lowercase' }]}>
                    {s.name}
                  </Txt>
                  <Txt variant="footnote" numberOfLines={2} style={[styles.onImage, styles.shadow, { opacity: 0.9 }]}>
                    {s.line}
                  </Txt>
                  {/* Playing, the badge above says how long is left instead. */}
                  {on ? null : (
                    <Txt variant="caption" style={[styles.onImage, styles.shadow, { opacity: 0.75, marginTop: 2 }]}>
                      {meta}
                    </Txt>
                  )}
                </View>
              </Photo>
            </Pressable>
          );
        })}
      </View>
      {/* The sound under a practice is a different thing from these: one row, to the one place it's set. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Sound under practice: ${under.replace(' · ', ' to the practice, today ')}. Change in Settings`}
        onPress={() => router.push({ pathname: '/settings', params: { open: 'sound' } })}
        style={({ pressed }) => [styles.underRow, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Txt variant="callout" style={{ textTransform: 'lowercase' }}>
          sound under practice
        </Txt>
        <Txt variant="callout" tone="secondary" style={{ textTransform: 'lowercase' }}>
          {under} ›
        </Txt>
      </Pressable>
    </TitledScroll>
  );
}

const makeStyles = (color: Palette) =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
    underRow: {
      marginTop: space.xl,
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.l,
      borderRadius: radius.m,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.hairline,
      backgroundColor: color.surface,
    },
    tileText: { position: 'absolute', left: space.m, right: space.m, bottom: space.m, gap: 2 },
    onImage: { color: color.onImage },
    shadow: { textShadowColor: 'rgba(5,8,9,0.3)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 1 } },
    badge: {
      position: 'absolute',
      top: space.s,
      left: space.s,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs,
      paddingHorizontal: space.s,
      paddingVertical: 3,
      borderRadius: radius.s,
      backgroundColor: 'rgba(5,8,9,0.35)',
    },
  });

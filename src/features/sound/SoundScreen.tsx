import { router, useLocalSearchParams } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SOUND_ART } from '@/design/art';
import { haptic, IconButton, PrimaryButton, Txt } from '@/design/components';
import { CoverArt } from '@/design/media';
import { color, radius, space } from '@/design/theme';
import { soundById, SOUND_LENGTHS, sounds, type SoundLength } from '@/domain/sounds';
import { heCount, isHe, tr } from '@/i18n';
import { Soundscape } from '@/voice/soundscape';
import { BreathingField } from '@/viz/BreathingField';
import { clock } from '../shared/format';

/**
 * One nature sound, on its own. First a quiet choice of how long (or until stopped), then the
 * same moving orb as a session, a timer, pause and end. It opens and closes on the gong.
 * Not a practice: nothing is saved and nothing is counted.
 */
export function SoundScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const sound = soundById(id) ?? sounds()[0];
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [length, setLength] = useState<SoundLength>(20);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const scape = useRef<Soundscape | null>(null);
  const ending = useRef(false);

  // Leaving the screen any way at all lets the sound go.
  useEffect(
    () => () => {
      void scape.current?.stop(false);
      deactivateKeepAwake('attend-sound');
    },
    [],
  );

  useEffect(() => {
    if (!playing || paused) return;
    const t = setInterval(() => setElapsed((e) => e + 1000), 1000);
    return () => clearInterval(t);
  }, [playing, paused]);

  const finish = async () => {
    if (ending.current) return;
    ending.current = true;
    const s = scape.current;
    scape.current = null;
    await s?.stop(true);
    deactivateKeepAwake('attend-sound');
    router.back();
  };

  useEffect(() => {
    if (length > 0 && elapsed >= length * 60_000) void finish();
    // finish is stable enough for this: it runs once, guarded by `ending`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, length]);

  const begin = () => {
    haptic('soft');
    const s = new Soundscape(sound.id);
    scape.current = s;
    void s.start();
    activateKeepAwakeAsync('attend-sound').catch(() => {});
    setPlaying(true);
  };

  if (playing) {
    const left = length > 0 ? Math.max(0, length * 60_000 - elapsed) : elapsed;
    return (
      <View style={styles.root}>
        <StatusBar hidden />
        <BreathingField width={width} height={height} mode={paused ? 'paused' : 'idle'} style={StyleSheet.absoluteFill} />
        <View style={[styles.top, { paddingTop: insets.top + space.l }]} pointerEvents="none">
          <Txt variant="caption" tone="tertiary" style={[styles.status, isHe() && styles.statusHe]}>
            {paused ? tr('Paused', 'מושהה') : sound.title}
          </Txt>
          <Txt variant="caption" tone="tertiary" style={[styles.status, isHe() && styles.statusHe, { opacity: 0.6 }]}>
            {clock(left)}
          </Txt>
        </View>
        <View style={[styles.controls, { paddingBottom: insets.bottom + space.xl }]}>
          <IconButton
            icon={paused ? 'play.fill' : 'pause.fill'}
            label={paused ? tr('Resume', 'להמשיך') : tr('Pause', 'להשהות')}
            variant="filled"
            size={60}
            iconSize={20}
            tint={color.textSecondary}
            onPress={() => {
              if (paused) scape.current?.resume();
              else scape.current?.pause();
              setPaused(!paused);
            }}
          />
          <IconButton icon="xmark" label={tr('End', 'לסיים')} variant="filled" size={60} iconSize={18} tint={color.textSecondary} onPress={() => void finish()} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + space.l }]}>
      <View style={styles.close}>
        <IconButton icon="xmark" label={tr('Close', 'לסגור')} onPress={() => router.back()} tint={color.textSecondary} />
      </View>
      <Animated.View entering={FadeIn.duration(700)} style={styles.body}>
        <CoverArt art={SOUND_ART[sound.id]} seed={sound.title.length} size={Math.min(width - space.xl * 2, 320)} height={220} rounded={radius.l} />
        <Txt variant="display" align="center" style={{ marginTop: space.xl }}>
          {sound.title}
        </Txt>
        <Txt variant="callout" tone="secondary" align="center" style={{ marginTop: space.xs }}>
          {sound.detail} · {sound.place}
        </Txt>

        <View style={styles.lengths} accessibilityRole="radiogroup" accessibilityLabel={tr('How long', 'כמה זמן')}>
          {SOUND_LENGTHS.map((m) => (
            <Pressable
              key={m}
              accessibilityRole="radio"
              accessibilityState={{ checked: m === length }}
              accessibilityLabel={m ? tr(`${m} minutes`, heCount(m, 'דקה אחת', 'דקות')) : tr('Until I stop it', 'עד שאעצור')}
              onPress={() => {
                haptic('select');
                setLength(m);
              }}
              style={[styles.len, m === length && styles.lenOn]}
            >
              <Txt variant="callout" tone={m === length ? 'inverse' : 'secondary'} style={{ fontWeight: '600' }}>
                {m ? tr(`${m} min`, `${m} דק׳`) : '∞'}
              </Txt>
            </Pressable>
          ))}
        </View>
      </Animated.View>
      <View style={{ paddingHorizontal: space.xl }}>
        <PrimaryButton
          label={tr('Play', 'להשמיע')}
          detail={length ? tr(`${length} minutes`, heCount(length, 'דקה אחת', 'דקות')) : tr('Until you stop it', 'עד שתעצרו')}
          onPress={begin}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  close: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space.s, paddingTop: space.m },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  lengths: { flexDirection: 'row', gap: 4, padding: 3, marginTop: space.xxl, borderRadius: radius.pill, backgroundColor: color.surfaceStrong },
  len: { minWidth: 64, minHeight: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  lenOn: { backgroundColor: color.text },
  top: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', gap: 4 },
  status: { letterSpacing: 2, textTransform: 'uppercase', fontSize: 11 },
  // Hebrew has no capitals to make a small word quiet and legible; a touch larger does it instead.
  statusHe: { fontSize: 12 },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'center', gap: space.xxl },
});

import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming, type SharedValue } from 'react-native-reanimated';
import { Txt } from '@/design/components';
import { clockProgress, clockSpoken, clockText } from '@/domain/sessionClock';

/**
 * The time left, quietly (20 Oct 2026: "a timer in the session"). A small "6:12" under the status
 * word, and the progress the ring around the form draws (BreathingField `ring`).
 *
 * Its own component so that the once-a-second text is the only thing that re-renders: the
 * session screen and the form never do on its account. Paused time doesn't count (the engine's
 * clock leaves pauses out), so while paused the number simply stands still.
 *
 * Never loud: dim at rest, full only while the controls are showing (`emphasis` is their
 * opacity); tabular numerals so the width never shifts; no ticking animation, no colour change
 * near the end, no sound. Not a live region: VoiceOver reads it when it reaches it, never as it
 * changes.
 */

/** How visible the number is with the controls gone: legible at a glance, never the brightest thing. */
export const CLOCK_REST_OPACITY = 0.5;
const TICK_MS = 1000;

type Props = {
  /** Shown only while a session is under way: not while preparing, blocked or resting. */
  running: boolean;
  targetMs(): number;
  activeMs(): number;
  /** Written here, drawn by the ring: 0..1 of the plan practised. */
  progress: SharedValue<number>;
  /** Written here: the ring fades in with the clock and out with it. */
  presence: SharedValue<number>;
  /** The controls' opacity, 0..1. */
  emphasis: SharedValue<number>;
};

export function SessionClock({ running, targetMs, activeMs, progress, presence, emphasis }: Props) {
  const [text, setText] = useState<string | undefined>();
  const [spoken, setSpoken] = useState<string | undefined>();

  useEffect(() => {
    if (!running) {
      setText(undefined);
      presence.value = withTiming(0, { duration: 1200 });
      return;
    }
    let first = true;
    const tick = () => {
      const target = targetMs();
      const active = activeMs();
      setText(clockText(target, active));
      setSpoken(clockSpoken(target, active));
      const p = clockProgress(target, active);
      // Linear over the second until the next reading: the ring creeps, it never steps.
      progress.value = first ? p : withTiming(p, { duration: TICK_MS, easing: Easing.linear });
      presence.value = withTiming(target > 0 ? 1 : 0, { duration: 1200 });
      first = false;
    };
    tick();
    const t = setInterval(tick, TICK_MS);
    return () => clearInterval(t);
    // targetMs/activeMs read the provider's runner on demand; the interval is per run, not per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const style = useAnimatedStyle(() => ({ opacity: CLOCK_REST_OPACITY + (1 - CLOCK_REST_OPACITY) * emphasis.value }));

  if (!text) return null;
  return (
    <Animated.View style={style}>
      <Txt variant="caption" tone="secondary" style={styles.clock} accessibilityLabel={spoken}>
        {text}
      </Txt>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clock: { fontSize: 13, letterSpacing: 0.4, fontWeight: '400', fontVariant: ['tabular-nums'] },
});

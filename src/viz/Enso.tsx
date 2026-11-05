import type { StyleProp, ViewStyle } from 'react-native';
import type { BreathMode } from './BreathingField';
import { EclipseField } from './EclipseField';

/**
 * The mark on the app's other screens (welcome, lesson, before, after): the ring of grain
 * from the icon (5 Nov 2026; before, a brush ensō left a little open). It breathes very slowly
 * and fades when paused; it moves with the voice only in the session. The name stays so the
 * screens that place it read as before.
 */

type Props = {
  width: number;
  height: number;
  mode: BreathMode;
  /** 0..1 overall strength. */
  dim?: number;
  style?: StyleProp<ViewStyle>;
};

export function Enso({ width, height, mode, dim = 1, style }: Props) {
  return <EclipseField width={width} height={height} mode={mode} dim={dim} size={0.3} style={style} />;
}

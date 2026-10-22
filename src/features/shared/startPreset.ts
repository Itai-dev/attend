import { router } from 'expo-router';
import type { Preset } from '@/domain/presets';

/** Any-time sessions go through Before too, so where attention rests is chosen with the eyes open. */
export function startPreset(p: Pick<Preset, 'id'>) {
  router.push({ pathname: '/before', params: { preset: p.id } });
}

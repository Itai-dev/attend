import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { Preset, PresetCategory } from '@/domain/presets';
import { CATEGORY_ART } from '@/design/art';
import { Card, Txt } from '@/design/components';
import { CoverArt, PlayButton } from '@/design/media';
import { fieldColor, space } from '@/design/theme';

/** Each category's colour: from the field palette, soft and cool-to-warm, never red. */
export const CATEGORY_COLOR: Record<PresetCategory, string> = {
  familiar: fieldColor.lilac,
  flare: fieldColor.apricot,
  sleep: fieldColor.dusk,
  worry: fieldColor.seaglass,
};

/** Any-time sessions go through Before too, so where attention rests is chosen with the eyes open. */
export function startPreset(p: Pick<Preset, 'id'>) {
  router.push({ pathname: '/before', params: { preset: p.id } });
}

/** The category's cover art: the same face wherever the session appears. */
export function PresetArt({ category, size, seed }: { category: PresetCategory; size: number; seed?: number }) {
  return <CoverArt art={CATEGORY_ART[category]} size={size} seed={seed} />;
}

/** One ready-made session as a row: cover, title, length and voice, and a play button. One tap begins it. */
export function PresetCard({ preset, featured, seed }: { preset: Preset; featured?: boolean; seed?: number }) {
  const art = featured ? 88 : 64;
  return (
    <Card
      label={`${preset.title}. ${preset.minutes} minutes, ${preset.voiceName}'s voice. Begins a session.`}
      onPress={() => startPreset(preset)}
      style={styles.card}
    >
      <PresetArt category={preset.category} size={art} seed={seed} />
      <View style={styles.text}>
        <Txt variant={featured ? 'title2' : 'headline'} numberOfLines={2}>
          {preset.title}
        </Txt>
        {featured ? (
          <Txt variant="footnote" tone="secondary" numberOfLines={2} style={{ marginTop: 2 }}>
            {preset.blurb}
          </Txt>
        ) : null}
        <Txt variant="footnote" tone="secondary" style={{ marginTop: space.xs }}>
          {preset.minutes} min · {preset.voiceName}
        </Txt>
      </View>
      <PlayButton size={40} label={`Begin ${preset.title}`} onPress={() => startPreset(preset)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.s, paddingRight: space.l },
  text: { flex: 1 },
});

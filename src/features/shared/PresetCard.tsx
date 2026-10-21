import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { Preset, PresetCategory } from '@/domain/presets';
import { Card, Icon, Txt } from '@/design/components';
import { color, fieldColor, radius, space } from '@/design/theme';

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

/** A soft orb on a tinted square: the category, at a glance. */
export function PresetArt({ category, size }: { category: PresetCategory; size: number }) {
  const c = CATEGORY_COLOR[category];
  return (
    <View style={[styles.art, { width: size, height: size, backgroundColor: `${c}1F` }]}>
      <View style={{ width: size * 0.62, height: size * 0.62, borderRadius: size, backgroundColor: `${c}55` }} />
      <View style={{ position: 'absolute', width: size * 0.34, height: size * 0.34, borderRadius: size, backgroundColor: `${c}AA` }} />
    </View>
  );
}

/** One ready-made session: its colour, title, length and voice. One tap opens it on Before. */
export function PresetCard({ preset, featured }: { preset: Preset; featured?: boolean }) {
  const art = featured ? 92 : 76;
  return (
    <Card
      label={`${preset.title}. ${preset.minutes} minutes, ${preset.voiceName}'s voice.`}
      onPress={() => startPreset(preset)}
      style={styles.card}
    >
      <PresetArt category={preset.category} size={art} />
      <View style={styles.text}>
        <Txt variant={featured ? 'title2' : 'headline'} numberOfLines={3}>
          {preset.title}
        </Txt>
        {featured ? (
          <Txt variant="footnote" tone="secondary" numberOfLines={2} style={{ marginTop: 2 }}>
            {preset.blurb}
          </Txt>
        ) : null}
        <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.xs }}>
          {preset.minutes} min · {preset.voiceName}
        </Txt>
      </View>
      <Icon name="chevron.right" size={14} tint={color.textTertiary} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.l, padding: space.m, paddingRight: space.l },
  art: { borderRadius: radius.m, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  text: { flex: 1 },
});

import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { Preset, PresetCategory } from '@/domain/presets';
import { Card, Icon, Txt } from '@/design/components';
import { radius, space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';
import { Photo, type SceneId } from '@/design/Photo';


/** Any-time sessions go through Before too, so where attention rests is chosen with the eyes open. */
export function startPreset(p: Pick<Preset, 'id'>) {
  router.push({ pathname: '/before', params: { preset: p.id } });
}

/**
 * Each category's photograph: settled dusk for the familiar practice, waves that come and go
 * for a flare, a night sky for sleep, moving water for worry. Calm places, never a picture of pain.
 */
const CATEGORY_SCENE: Record<PresetCategory, SceneId> = {
  familiar: 'dusk',
  flare: 'ocean',
  sleep: 'evening',
  worry: 'stream',
};

/** A small photograph: the category, at a glance. */
export function PresetArt({ category, size }: { category: PresetCategory; size: number }) {
  return <Photo scene={CATEGORY_SCENE[category]} width={size} height={Math.round(size * 1.15)} radius={radius.s} />;
}

/** One ready-made session: art, title, length and voice, and a play button. One tap begins it. */
export function PresetCard({ preset, featured }: { preset: Preset; featured?: boolean }) {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const art = featured ? 92 : 76;
  return (
    <Card
      label={`${preset.title}. ${preset.minutes} minutes, ${preset.voiceName}'s voice. Begins a session.`}
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
      <View style={styles.play}>
        <Icon name="play.fill" size={14} tint={color.onAccent} />
      </View>
    </Card>
  );
}

const makeStyles = (color: Palette) =>
  StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.l, padding: space.m, paddingRight: space.l },
  text: { flex: 1 },
  play: { width: 40, height: 40, borderRadius: 3, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
});

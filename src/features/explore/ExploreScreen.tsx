import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PRESET_CATEGORIES, PRESETS, type PresetCategory } from '@/domain/presets';
import { haptic, SectionLabel, TitledScroll, Txt } from '@/design/components';
import { color, radius, space } from '@/design/theme';
import { CATEGORY_COLOR, PresetCard } from '../shared/PresetCard';

/**
 * Explore: every ready-made session, by what it's for. A category narrows the list; tapping
 * it again shows everything. Each session already has its length and voice, so one tap
 * begins it. A short list on purpose — these are ways into one practice, not a library.
 */
export function ExploreScreen() {
  const [category, setCategory] = useState<PresetCategory | undefined>();
  const shown = useMemo(() => PRESETS.filter((p) => !category || p.category === category), [category]);
  const [featured, ...rest] = shown;

  return (
    <TitledScroll title="Explore">
      <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="What it’s for">
        {PRESET_CATEGORIES.map((c) => {
          const selected = c.id === category;
          return (
            <Pressable
              key={c.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${c.title}. ${c.detail}`}
              onPress={() => {
                haptic('select');
                setCategory(selected ? undefined : c.id);
              }}
              style={({ pressed }) => [styles.tile, selected && styles.tileOn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.swatch, { backgroundColor: CATEGORY_COLOR[c.id] }]} />
              <View style={{ flex: 1 }}>
                <Txt variant="headline">{c.title}</Txt>
                <Txt variant="footnote" tone="tertiary">
                  {c.detail}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </View>

      {featured ? (
        <>
          <SectionLabel style={styles.section}>{category ? PRESET_CATEGORIES.find((c) => c.id === category)!.title : 'Featured'}</SectionLabel>
          <PresetCard preset={featured} featured />
        </>
      ) : null}
      {rest.length ? (
        <>
          <SectionLabel style={styles.section}>{category ? 'More' : 'All sessions'}</SectionLabel>
          <View style={{ gap: space.m }}>
            {rest.map((p) => (
              <PresetCard key={p.id} preset={p} />
            ))}
          </View>
        </>
      ) : null}
    </TitledScroll>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    minHeight: 72,
    paddingHorizontal: space.l,
    borderRadius: radius.m,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
  },
  tileOn: { backgroundColor: color.surfaceStrong, borderColor: color.textTertiary },
  swatch: { width: 14, height: 14, borderRadius: 7, opacity: 0.85 },
  section: { marginTop: space.xxl },
});

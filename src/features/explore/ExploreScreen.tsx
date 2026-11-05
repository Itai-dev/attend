import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useData } from '@/data/store';
import { CATEGORY_ART, SOUND_ART, type ArtKey } from '@/design/art';
import { haptic, SettingsButton, TitledScroll, Txt } from '@/design/components';
import { CoverArt, Pill } from '@/design/media';
import { space, radius } from '@/design/theme';
import { presetCategories, presets, recommendedPreset, type Preset } from '@/domain/presets';
import { sounds } from '@/domain/sounds';
import { heCount, tr } from '@/i18n';
import { startPreset } from '../shared/startPreset';

/**
 * Explore, after Headspace's (22 Oct 2026): two things to find, sessions and sounds, as
 * colour tiles to browse rather than a list to read. Sessions are grouped by what they're
 * for, each a shelf you swipe; sounds are the four nature recordings on their own.
 */

const ON_ART = '#FFFFFF';
const ON_ART_SOFT = 'rgba(255,255,255,0.82)';

function Tile({ art, seed, width, height, title, detail, label, onPress }: { art: ArtKey; seed: number; width: number; height: number; title: string; detail: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic('select');
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <CoverArt art={art} seed={seed} size={width} height={height} rounded={radius.l}>
        <View style={styles.tileText}>
          <Txt variant="headline" style={{ color: ON_ART }} numberOfLines={2}>
            {title}
          </Txt>
          <Txt variant="footnote" style={{ color: ON_ART_SOFT, marginTop: 2 }} numberOfLines={1}>
            {detail}
          </Txt>
        </View>
      </CoverArt>
    </Pressable>
  );
}

function presetLabel(p: Preset) {
  return tr(`${p.title}. ${p.minutes} minutes, ${p.voiceName}'s voice.`, `${p.title}. ${heCount(p.minutes, 'דקה אחת', 'דקות')}, בקול של ${p.voiceName}.`);
}

function min(n: number) {
  return tr(`${n} min`, `${n} דק׳`);
}

export function ExploreScreen() {
  const { width } = useWindowDimensions();
  const { prefs } = useData();
  const [tab, setTab] = useState<'sessions' | 'sounds'>('sessions');
  const full = width - space.l * 2;
  const shelfTile = Math.min(168, full * 0.46);
  const half = (full - space.m) / 2;
  const featured = recommendedPreset({ focus: prefs.focus, minutes: prefs.sessionMinutes === 7 ? undefined : prefs.sessionMinutes });

  return (
    <TitledScroll title={tr('Explore', 'גילוי')} right={<SettingsButton />}>
      <View style={styles.pills}>
        <Pill label={tr('Sessions', 'תרגולים')} on={tab === 'sessions'} onPress={() => setTab('sessions')} />
        <Pill label={tr('Sounds', 'צלילים')} on={tab === 'sounds'} onPress={() => setTab('sounds')} />
      </View>

      {tab === 'sessions' ? (
        <Animated.View key="sessions" entering={FadeIn.duration(400)}>
          <Tile
            art={CATEGORY_ART[featured.category]}
            seed={3}
            width={full}
            height={200}
            title={featured.title}
            detail={`${min(featured.minutes)} · ${featured.blurb}`}
            label={`${tr('Suggested for you.', 'הצעה בשבילכם.')} ${presetLabel(featured)}`}
            onPress={() => startPreset(featured)}
          />

          {presetCategories().map((c) => {
            const items = presets().filter((p) => p.category === c.id);
            return (
              <View key={c.id} style={{ marginTop: space.xxl }}>
                <Txt variant="title2" accessibilityRole="header">
                  {c.title}
                </Txt>
                <Txt variant="footnote" tone="secondary" style={{ marginBottom: space.m }}>
                  {c.detail}
                </Txt>
                {/* A shelf runs to the screen's edge, as in Headspace: the cut-off tile says there is more. */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shelf} contentContainerStyle={styles.shelfContent}>
                  {items.map((p, i) => (
                    <Tile
                      key={p.id}
                      art={CATEGORY_ART[p.category]}
                      seed={i + 5}
                      width={shelfTile}
                      height={shelfTile * 1.15}
                      title={p.title}
                      detail={`${min(p.minutes)} · ${p.voiceName}`}
                      label={presetLabel(p)}
                      onPress={() => startPreset(p)}
                    />
                  ))}
                </ScrollView>
              </View>
            );
          })}
        </Animated.View>
      ) : (
        <Animated.View key="sounds" entering={FadeIn.duration(400)}>
          <Txt variant="callout" tone="secondary" style={{ marginBottom: space.l }}>
            {tr('Nature on its own, no voice. To rest with, sleep to, or keep you company.', 'רק טבע, בלי קול מנחה. לנוח, להירדם, או שיהיה איתכם ברקע.')}
          </Txt>
          <View style={styles.grid}>
            {sounds().map((s, i) => (
              <Tile
                key={s.id}
                art={SOUND_ART[s.id]}
                seed={i + 11}
                width={half}
                height={half * 1.25}
                title={s.title}
                detail={s.detail}
                label={`${s.title}. ${s.detail}.`}
                onPress={() => router.push({ pathname: '/sound', params: { id: s.id } })}
              />
            ))}
          </View>
        </Animated.View>
      )}
    </TitledScroll>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', gap: space.s, marginTop: -space.s, marginBottom: space.l },
  tileText: { flex: 1, justifyContent: 'flex-end', padding: space.l },
  shelf: { marginHorizontal: -space.l },
  shelfContent: { gap: space.m, paddingHorizontal: space.l },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
});

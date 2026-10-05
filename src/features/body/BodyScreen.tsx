import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useData } from '@/data/store';
import { descriptorInfo } from '@/domain/lexicon';
import { labelPlace } from '@/domain/regions';
import type { BodyRegion, Session, Side } from '@/domain/types';
import { Hairline, SectionLabel, Segmented, TitledScroll, Txt } from '@/design/components';
import { color, radius, space } from '@/design/theme';
import { BodyField } from '@/viz/BodyField';
import { compositeMap, preferredView, type View as FigureView } from '@/viz/bodyUniforms';
import { shortDate } from '../shared/format';

/**
 * Body: the accumulated map — everywhere the practice has gone, recent
 * places brighter — and the places returned to, described in the person's
 * own words. No counts of pain, no heat-map of "worst areas".
 */

type Place = { region: BodyRegion; side?: Side; sessions: number; words: string[]; lately?: string; lastAt: number };

function placesFrom(sessions: Session[]): Place[] {
  const by = new Map<string, Place>();
  const sorted = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  for (const s of sorted) {
    const p = s.bodyMapEnd.sensations.find((x) => x.primary) ?? s.bodyMapEnd.sensations[0];
    if (!p || p.region === 'whole_body') continue;
    const key = `${p.region}|${p.side ?? ''}`;
    const prev = by.get(key) ?? { region: p.region, side: p.side, sessions: 0, words: [], lastAt: 0 };
    prev.sessions++;
    for (const w of [...p.descriptors].reverse()) if (!prev.words.includes(w)) prev.words.push(w);
    prev.lately = s.oneLiner;
    prev.lastAt = s.startedAt;
    by.set(key, prev);
  }
  return [...by.values()].sort((a, b) => b.lastAt - a.lastAt);
}

/** The accumulated map and the places returned to; also shown inside Lately (without the recent strip). */
export function BodyContent({ showRecent = true }: { showRecent?: boolean }) {
  const { sessions } = useData();
  const { width } = useWindowDimensions();
  const composite = useMemo(() => compositeMap(sessions), [sessions]);
  const [view, setView] = useState<FigureView>(() => preferredView(composite.map));
  const places = useMemo(() => placesFrom(sessions), [sessions]);
  const recent = sessions.filter((s) => s.bodyMapEnd.sensations.length > 0).slice(0, 6);
  const mapW = Math.min(width - space.xl * 2, 480);

  return (
    <>
      <Txt variant="callout" tone="secondary" style={{ marginTop: showRecent ? -space.m : 0, marginBottom: space.l }}>
        Everywhere you’ve attended to. Recent sessions glow brighter.
      </Txt>
      <View style={styles.mapCard}>
        <BodyField map={composite.map} weights={composite.weights} view={view} width={mapW} height={mapW * 1.25} />
      </View>
      <Segmented
        style={{ marginTop: space.m }}
        options={[
          { value: 'front', label: 'Front' },
          { value: 'back', label: 'Back' },
        ]}
        value={view}
        onChange={setView}
      />

      {places.length > 0 ? (
        <>
          <SectionLabel style={{ marginTop: space.xxl }}>Places you’ve returned to</SectionLabel>
          {places.map((p, i) => (
            <View key={`${p.region}|${p.side}`}>
              {i > 0 ? <Hairline /> : null}
              <View style={styles.place}>
                <Txt variant="headline" style={{ fontWeight: '500' }}>
                  {capitalize(labelPlace(p.region, p.side))}
                </Txt>
                <Txt variant="footnote" tone="tertiary" style={{ marginTop: 2 }}>
                  {p.sessions === 1 ? 'One session' : `${p.sessions} sessions`}
                  {p.words.length ? ` · ${p.words.slice(0, 4).map((w) => descriptorInfo(w)?.word ?? w).join(', ')}` : ''}
                </Txt>
                {p.lately ? (
                  <Txt variant="callout" tone="secondary" style={{ marginTop: space.s }}>
                    Last time: {lowerFirst(p.lately)}
                  </Txt>
                ) : null}
              </View>
            </View>
          ))}
        </>
      ) : (
        <Txt variant="callout" tone="secondary" style={{ marginTop: space.xxl }}>
          After your first session, the places you notice will appear here.
        </Txt>
      )}

      {showRecent && recent.length > 0 ? (
        <>
          <SectionLabel style={{ marginTop: space.xxl }}>Recent sessions</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.m }}>
            {recent.map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityLabel={`${shortDate(s.startedAt)}: ${s.oneLiner}`}
                onPress={() => router.push({ pathname: '/journey/[id]', params: { id: s.id } })}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <View style={styles.recentCard}>
                  <BodyField map={s.bodyMapEnd} view={preferredView(s.bodyMapEnd)} width={96} height={150} animated={false} accessibilityLabel="" />
                </View>
                <Txt variant="caption" tone="tertiary" style={{ marginTop: space.s }}>
                  {shortDate(s.startedAt)}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}
    </>
  );
}

export function BodyScreen() {
  return (
    <TitledScroll title="Body">
      <BodyContent />
    </TitledScroll>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function lowerFirst(s: string) {
  return s.startsWith('The ') || s.startsWith('You ') || s.startsWith('Today') ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

const styles = StyleSheet.create({
  mapCard: {
    alignSelf: 'center',
    borderRadius: radius.l,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
  },
  place: { paddingVertical: space.l },
  recentCard: { borderRadius: radius.s, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: color.hairline },
});

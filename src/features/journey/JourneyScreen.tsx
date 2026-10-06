import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useData } from '@/data/store';
import { primarySensation } from '@/domain/bodyMap';
import { analyzeJourney } from '@/domain/journey';
import type { Session } from '@/domain/types';
import { Hairline, QuietButton, SampleBadge, SectionLabel, TitledScroll, Txt } from '@/design/components';
import { color, radius, space } from '@/design/theme';
import { BodyField } from '@/viz/BodyField';
import { preferredView } from '@/viz/bodyUniforms';
import { sessionDate, shortDate } from '../shared/format';

/**
 * Journey: how the experience has moved across sessions — in words built
 * from what was said, and in maps you can see change, with no number
 * anywhere. Each statement carries its own evidence.
 */

export function JourneyScreen() {
  const { sessions, hasSamples, deleteSamples } = useData();
  const { width } = useWindowDimensions();
  const analysis = useMemo(() => analyzeJourney(sessions), [sessions]);
  const withMaps = sessions.filter((s) => s.bodyMapEnd.sensations.length > 0);
  const earliest = withMaps[withMaps.length - 1];
  const latest = withMaps[0];
  const pairW = (Math.min(width, 520) - space.xl * 2 - space.m) / 2;

  return (
    <TitledScroll title="Journey" onBack={() => router.back()}>
      {hasSamples ? (
        <View style={styles.banner}>
          <Txt variant="footnote" tone="secondary" style={{ flex: 1 }}>
            These are sample sessions, to show how Journey works.
          </Txt>
          <QuietButton label="Remove" tone="primary" onPress={() => deleteSamples()} />
        </View>
      ) : null}

      <SectionLabel>{analysis.spanLabel}</SectionLabel>
      {earliest && latest && earliest.id !== latest.id ? (
        <View
          style={styles.pair}
          accessible
          accessibilityLabel={`Your earliest map, from ${shortDate(earliest.startedAt)}, beside your latest, from ${shortDate(latest.startedAt)}.`}
        >
          <ThenNow session={earliest} label="Earlier" width={pairW} />
          <ThenNow session={latest} label="Lately" width={pairW} />
        </View>
      ) : null}

      {analysis.insights.length > 0 ? (
        analysis.insights.slice(0, 4).map((ins, i) => (
          <View key={ins.id} style={i === 0 ? styles.lead : styles.insight}>
            {i > 0 ? <Hairline style={{ marginBottom: space.l }} /> : null}
            <Txt variant={i === 0 ? 'title2' : 'body'} style={{ fontWeight: i === 0 ? '300' : '400' }}>
              {ins.text}
            </Txt>
            <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.s }}>
              {ins.evidence}
            </Txt>
          </View>
        ))
      ) : (
        <Txt variant="title2" tone="secondary" style={{ fontWeight: '300', marginTop: space.l }}>
          {analysis.placeholder}
        </Txt>
      )}

      <SectionLabel style={{ marginTop: space.xxl }}>Sessions</SectionLabel>
      {sessions.length === 0 ? (
        <Txt variant="callout" tone="secondary">
          Sessions appear here after you finish them.
        </Txt>
      ) : (
        <View>
          {sessions.map((s, i) => (
            <SessionRow key={s.id} session={s} first={i === 0} last={i === sessions.length - 1} />
          ))}
        </View>
      )}
    </TitledScroll>
  );
}

function ThenNow({ session, label, width }: { session: Session; label: string; width: number }) {
  return (
    <Pressable onPress={() => router.push({ pathname: '/journey/[id]', params: { id: session.id } })} style={{ width }} accessibilityElementsHidden>
      <View style={styles.pairCard}>
        <BodyField map={session.bodyMapEnd} view={preferredView(session.bodyMapEnd)} width={width} height={width * 1.25} animated={false} scale={1.65} />
      </View>
      <Txt variant="caption" tone="tertiary" style={{ marginTop: space.s, textTransform: 'uppercase' }}>
        {label} · {shortDate(session.startedAt)}
      </Txt>
    </Pressable>
  );
}

function SessionRow({ session, first, last }: { session: Session; first: boolean; last: boolean }) {
  const p = primarySensation(session.bodyMapEnd);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sessionDate(session.startedAt)}. ${session.title} ${session.oneLiner}${session.isSample ? ' Sample session.' : ''}`}
      onPress={() => router.push({ pathname: '/journey/[id]', params: { id: session.id } })}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={styles.rail}>
        <View style={[styles.railLine, first && { top: 46 }, last && { bottom: '50%' }]} />
        <View style={styles.thumb}>
          <BodyField
            map={session.bodyMapEnd}
            view={p ? preferredView(session.bodyMapEnd) : 'front'}
            width={58}
            height={96}
            animated={false}
            accessibilityLabel=""
          />
        </View>
      </View>
      <View style={{ flex: 1, paddingVertical: space.m }}>
        <View style={styles.metaRow}>
          <Txt variant="footnote" tone="tertiary">
            {sessionDate(session.startedAt)}
          </Txt>
          {session.isSample ? <SampleBadge /> : null}
        </View>
        <Txt variant="headline" style={{ marginTop: 3, fontWeight: '500' }}>
          {session.oneLiner}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingLeft: space.l,
    paddingRight: space.xs,
    paddingVertical: space.xs,
    borderRadius: radius.m,
    backgroundColor: color.surface,
    marginBottom: space.xl,
  },
  lead: { marginTop: space.xl, marginBottom: space.xl },
  insight: { marginBottom: space.l },
  pair: { flexDirection: 'row', gap: space.m, marginTop: space.xs },
  pairCard: { borderRadius: radius.m, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: color.hairline },
  row: { flexDirection: 'row', gap: space.l, alignItems: 'center' },
  rail: { width: 58, alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center' },
  railLine: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: color.hairline },
  thumb: { borderRadius: radius.s, overflow: 'hidden', marginVertical: space.s },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.s },
});

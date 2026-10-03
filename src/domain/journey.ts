import { consolidateChanges, primarySensation } from './bodyMap';
import { descriptorInfo } from './lexicon';
import { speakPlace } from './regions';
import type { BodyRegion, Session, SensationChangeType, Side } from './types';

/**
 * Progress without numbers.
 *
 * Journey answers "is anything changing?" using only the language and maps
 * the person produced. There is no score here, hidden or shown: no scalar is
 * computed to draw a line, and nothing is averaged across sessions into a
 * verdict. Each statement is a comparison of what was SAID early on with what
 * has been said lately, and carries its own evidence sentence so the person
 * can see what it rests on.
 *
 * Thresholds are deliberately conservative. With too few sessions, Journey
 * says so instead of finding a pattern in noise.
 */

export const MIN_SESSIONS_FOR_PATTERNS = 4;
export const MIN_SESSIONS_FOR_ANY = 3;
/** A shift has to be at least this large (as a share of sessions) to be mentioned. */
const MIN_SHIFT = 0.25;

export type JourneyInsight = {
  id: 'variability' | 'acceptance' | 'language' | 'stable' | 'focus';
  text: string;
  evidence: string;
  homeLine: string;
};

export type JourneyAnalysis = {
  enoughData: boolean;
  sessionCount: number;
  spanLabel: string;
  insights: JourneyInsight[];
  placeholder?: string;
};

const VARIABILITY_TYPES: SensationChangeType[] = [
  'moved',
  'spread',
  'contracted',
  'boundary_softened',
  'shape_shift',
  'temporal_shift',
  'quality_shift',
  'softened',
];

type Features = {
  fixed: boolean;
  sharplyDefined: boolean;
  variability: boolean;
  acceptance: boolean;
  region?: BodyRegion;
  side?: Side;
  descriptors: string[];
};

function featuresOf(s: Session): Features | undefined {
  const start = primarySensation(s.bodyMapStart) ?? primarySensation(s.bodyMapEnd);
  if (!start) return undefined;
  const end = s.bodyMapEnd.sensations.find((x) => x.id === start.id) ?? start;
  const changes = consolidateChanges(s.changes).filter((c) => c.sensationId === start.id && c.type !== 'stable');
  const variability =
    changes.some((c) => VARIABILITY_TYPES.includes(c.type)) ||
    end.temporalQuality === 'changing' ||
    end.temporalQuality === 'intermittent';
  const spatialChange = changes.some((c) => ['moved', 'spread', 'contracted', 'boundary_softened', 'shape_shift'].includes(c.type));
  return {
    fixed: start.movement?.type === 'static' && !spatialChange,
    sharplyDefined: start.edge === 'clear' || start.shape === 'focused',
    variability,
    acceptance: s.signals.acceptance,
    region: start.region,
    side: start.side,
    descriptors: [...new Set([...start.descriptors, ...end.descriptors])],
  };
}

function count<T>(xs: T[], pred: (x: T) => boolean): number {
  return xs.reduce((n, x) => n + (pred(x) ? 1 : 0), 0);
}

function mostCommon<T>(xs: T[]): { value: T; count: number } | undefined {
  const m = new Map<T, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  let best: { value: T; count: number } | undefined;
  for (const [value, n] of m) if (!best || n > best.count) best = { value, count: n };
  return best;
}

function spanLabel(first: number, now: number): string {
  const days = (now - first) / 86_400_000;
  if (days < 10) return 'Over the last few days';
  if (days < 21) return 'Over the last couple of weeks';
  if (days < 60) return 'Over the last few weeks';
  return 'Over the last few months';
}

function sessions(n: number): string {
  return n === 1 ? '1 session' : `${n} sessions`;
}

export function analyzeJourney(all: Session[], now = Date.now()): JourneyAnalysis {
  const eligible = all
    .filter((s) => s.outcome === 'completed' || s.outcome === 'ended_early')
    .map((s) => ({ s, f: featuresOf(s) }))
    .filter((x): x is { s: Session; f: Features } => !!x.f)
    .sort((a, b) => a.s.startedAt - b.s.startedAt);

  const n = eligible.length;
  const label = n ? spanLabel(eligible[0].s.startedAt, now) : 'So far';

  if (n < MIN_SESSIONS_FOR_ANY) {
    return {
      enoughData: false,
      sessionCount: n,
      spanLabel: label,
      insights: [],
      placeholder:
        n === 0
          ? 'Your Journey begins with your first session.'
          : `After a few more sessions, this is where you’ll see how the way you describe sensations shifts over time. Based on ${sessions(n)} so far.`,
    };
  }

  const insights: JourneyInsight[] = [];
  const fs = eligible.map((x) => x.f);
  const half = Math.min(5, Math.floor(n / 2));
  const early = fs.slice(0, Math.max(half, Math.ceil(n / 2))).slice(0, 5);
  const recent = fs.slice(-half);

  const regionTop = mostCommon(fs.map((f) => `${f.region}|${f.side ?? ''}`));
  const [topRegion, topSide] = (regionTop?.value ?? '|').split('|') as [BodyRegion, Side | ''];
  const recentWords = recent.flatMap((f) => f.descriptors);
  const nounRecent = mostCommon(recentWords)?.value;
  const nounWord = nounRecent ? descriptorInfo(nounRecent)?.noun ?? nounRecent : 'sensation';

  if (n >= MIN_SESSIONS_FOR_PATTERNS && recent.length >= 2) {
    // 1. From fixed toward variable.
    const earlyFixed = count(early, (f) => f.fixed);
    const earlyVar = count(early, (f) => f.variability);
    const recentVar = count(recent, (f) => f.variability);
    const earlySharp = count(early, (f) => f.fixed && f.sharplyDefined);
    if (
      earlyFixed / early.length >= 0.5 &&
      recentVar / recent.length >= 0.5 &&
      recentVar / recent.length - earlyVar / early.length >= MIN_SHIFT
    ) {
      insights.push({
        id: 'variability',
        text: `Earlier sessions often described the sensation as fixed${earlySharp >= earlyFixed / 2 ? ' and sharply defined' : ''}. More recently, you’ve described more movement and variability.`,
        evidence: `Fixed in ${earlyFixed} of your first ${sessions(early.length)}. Moving or changing in ${recentVar} of your last ${recent.length}.`,
        homeLine: topRegion
          ? `Lately, the ${nounWord} you’ve described in ${speakPlace(topRegion, topSide || undefined)} has been less fixed.`
          : `Lately, the sensations you’ve described have been less fixed.`,
      });
    }

    // 2. Meeting it without needing it gone.
    const earlyAcc = count(early, (f) => f.acceptance);
    const recentAcc = count(recent, (f) => f.acceptance);
    if (recentAcc >= 2 && recentAcc / recent.length - earlyAcc / early.length >= MIN_SHIFT) {
      insights.push({
        id: 'acceptance',
        text: "You’ve increasingly been able to observe sensations without immediately trying to make them stop.",
        evidence: `You described letting it be in ${recentAcc} of your last ${sessions(recent.length)}, and in ${earlyAcc} of your first ${early.length}.`,
        homeLine: "Lately, you’ve been able to stay with sensations without rushing to stop them.",
      });
    }

    // 3. The words themselves.
    const earlyTop = mostCommon(early.flatMap((f) => f.descriptors));
    const recentTop = mostCommon(recentWords);
    if (earlyTop && recentTop && earlyTop.value !== recentTop.value && earlyTop.count >= 2 && recentTop.count >= 2) {
      insights.push({
        id: 'language',
        text: `Early on, the word you used most was “${earlyTop.value}”. Lately, “${recentTop.value}” comes up more.`,
        evidence: `“${earlyTop.value}” in ${earlyTop.count} of your first ${sessions(early.length)}; “${recentTop.value}” in ${recentTop.count} of your last ${recent.length}.`,
        homeLine: `Lately, you’ve been describing it as “${recentTop.value}” more than “${earlyTop.value}”.`,
      });
    }

    // 4. Nothing changing is a finding too, said plainly.
    const anyVar = count(fs, (f) => f.variability);
    if (insights.length === 0 && anyVar / n < MIN_SHIFT) {
      insights.push({
        id: 'stable',
        text: "Across these sessions, the sensation has mostly stayed the same. You’ve kept returning to it all the same.",
        evidence: `Mostly unchanged in ${n - anyVar} of ${sessions(n)}.`,
        homeLine: "Lately, the sensation has mostly stayed the same, and you’ve kept practising with it.",
      });
    }
  }

  // 5. Where the practice has mostly been.
  if (regionTop && topRegion && regionTop.count / n >= 0.6) {
    insights.push({
      id: 'focus',
      text: `Most of your sessions have centred on ${speakPlace(topRegion, topSide || undefined)}.`,
      evidence: `${regionTop.count} of ${sessions(n)}.`,
      homeLine: `Most of your practice has been with ${speakPlace(topRegion, topSide || undefined)}.`,
    });
  }

  return {
    enoughData: n >= MIN_SESSIONS_FOR_PATTERNS,
    sessionCount: n,
    spanLabel: label,
    insights,
    placeholder:
      insights.length === 0
        ? `No clear pattern yet across ${sessions(n)}. That can take time, and some weeks there simply isn’t one.`
        : undefined,
  };
}

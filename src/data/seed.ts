import { describeChange } from '../domain/bodyMap';
import { buildRecap } from '../domain/recap';
import type {
  BodyMapState,
  BodySensation,
  SensationChange,
  SensationChangeType,
  Session,
  SessionOutcome,
  SessionSignals,
  SessionType,
} from '../domain/types';

/**
 * Sample sessions, so Journey and Body can be seen before there is any real
 * history. They tell a plausible four-week story — a fixed, sharply defined
 * tightness in the left side of the neck that, over time, is described with
 * more movement and less alarm — and they are labelled as samples
 * everywhere they appear, and removable in one tap.
 *
 * Titles, summaries and one-liners are produced by the same recap code real
 * sessions use, so the samples cannot say anything a real session could not.
 */

const DAY = 86_400_000;

type Spec = {
  daysAgo: number;
  hour: number;
  minutes: number;
  type: SessionType;
  start: Array<Partial<BodySensation> & Pick<BodySensation, 'region'>>;
  /** Patches to the primary sensation by the end of the session. */
  end?: Partial<BodySensation>;
  changes: Array<{ type: SensationChangeType; from?: Partial<BodySensation>; to?: Partial<BodySensation> }>;
  signals: Partial<SessionSignals>;
  outcome?: SessionOutcome;
};

const SPECS: Spec[] = [
  {
    daysAgo: 26,
    hour: 21,
    minutes: 7,
    type: 'notice',
    start: [{ region: 'neck', side: 'left', descriptors: ['sharp', 'tight'], shape: 'focused', edge: 'clear', movement: { type: 'static' } }],
    changes: [{ type: 'stable' }],
    signals: { urgeToFix: true, observedSeconds: 150 },
  },
  {
    daysAgo: 22,
    hour: 8,
    minutes: 6,
    type: 'notice',
    start: [{ region: 'neck', side: 'left', descriptors: ['pressure', 'tight'], shape: 'focused', edge: 'clear', movement: { type: 'static' } }],
    changes: [{ type: 'stable' }],
    signals: { urgeToFix: true, observedSeconds: 170 },
  },
  {
    daysAgo: 18,
    hour: 19,
    minutes: 6,
    type: 'flare',
    start: [{ region: 'lower_back', side: 'center', descriptors: ['aching', 'heavy'], shape: 'diffuse', edge: 'soft', movement: { type: 'static' } }],
    changes: [{ type: 'stable' }],
    signals: { familiarConfirmed: true, observedSeconds: 140 },
  },
  {
    daysAgo: 14,
    hour: 22,
    minutes: 8,
    type: 'notice',
    start: [{ region: 'neck', side: 'left', descriptors: ['tight'], shape: 'focused', edge: 'clear', movement: { type: 'static' } }],
    end: { descriptors: ['pulling', 'tight'] },
    changes: [{ type: 'quality_shift', from: { descriptors: ['tight'] }, to: { descriptors: ['pulling', 'tight'] } }],
    signals: { observedSeconds: 190 },
  },
  {
    daysAgo: 10,
    hour: 23,
    minutes: 9,
    type: 'sleep',
    start: [{ region: 'neck', side: 'left', descriptors: ['pressure'], shape: 'area', edge: 'clear', movement: { type: 'static' } }],
    end: { edge: 'soft' },
    changes: [
      { type: 'boundary_softened', from: { edge: 'clear' }, to: { edge: 'soft' } },
      { type: 'softened' },
    ],
    signals: { acceptance: true, observedSeconds: 230 },
  },
  {
    daysAgo: 5,
    hour: 18,
    minutes: 7,
    type: 'notice',
    start: [
      { region: 'neck', side: 'left', descriptors: ['pulling', 'tight'], shape: 'focused', edge: 'clear', movement: { type: 'static' } },
      { region: 'shoulder', side: 'left', descriptors: ['tight'] },
    ],
    end: { movement: { type: 'moving', direction: 'up', destinationRegion: 'head_back' } },
    changes: [{ type: 'moved', from: { movement: { type: 'static' } }, to: { movement: { type: 'moving', direction: 'up', destinationRegion: 'head_back' } } }],
    signals: { acceptance: true, urgeToFix: true, observedSeconds: 210 },
  },
  {
    daysAgo: 1,
    hour: 9,
    minutes: 8,
    type: 'notice',
    start: [{ region: 'neck', side: 'left', descriptors: ['pulling', 'tight'], shape: 'focused', edge: 'clear', movement: { type: 'static' } }],
    end: { movement: { type: 'moving', direction: 'up', destinationRegion: 'head_back' }, edge: 'soft', shape: 'diffuse' },
    changes: [
      { type: 'moved', from: { movement: { type: 'static' } }, to: { movement: { type: 'moving', direction: 'up', destinationRegion: 'head_back' } } },
      { type: 'boundary_softened', from: { edge: 'clear' }, to: { edge: 'soft' } },
    ],
    signals: { acceptance: true, observedSeconds: 260 },
  },
];

const BASE_SIGNALS: SessionSignals = {
  acceptance: false,
  urgeToFix: false,
  fear: false,
  familiarConfirmed: false,
  observedSeconds: 180,
  utterances: 9,
};

export function buildSampleSessions(now = Date.now()): Session[] {
  return SPECS.map((spec, i) => {
    const dayStart = new Date(now - spec.daysAgo * DAY);
    dayStart.setHours(spec.hour, (i * 13) % 60, 0, 0);
    const startedAt = dayStart.getTime();
    const endedAt = startedAt + spec.minutes * 60_000 + 23_000;
    const id = `sample_${i + 1}`;

    const sensations: BodySensation[] = spec.start.map((s, j) => ({
      id: `${id}_${j}`,
      descriptors: [],
      userLanguage: [],
      primary: j === 0,
      ...s,
    }));
    const bodyMapStart: BodyMapState = { sensations };
    const bodyMapEnd: BodyMapState = {
      sensations: sensations.map((s) => (s.primary ? { ...s, ...(spec.end ?? {}) } : { ...s })),
    };
    const primaryId = sensations[0].id;
    const changes: SensationChange[] = spec.changes.map((c, k) => ({
      sensationId: primaryId,
      type: c.type,
      fromState: c.from ?? {},
      toState: c.to ?? {},
      description: describeChange(c.type, c.from ?? {}, c.to ?? {}),
      at: 150_000 + k * 40_000,
    }));
    const signals = { ...BASE_SIGNALS, ...spec.signals };
    const outcome = spec.outcome ?? 'completed';
    const recap = buildRecap({ sessionType: spec.type, outcome, bodyMapStart, bodyMapEnd, changes, signals });
    return {
      id,
      startedAt,
      endedAt,
      sessionType: spec.type,
      title: recap.title,
      summary: recap.summary,
      oneLiner: recap.oneLiner,
      bodyMapStart,
      bodyMapEnd,
      changes,
      outcome,
      signals,
      createdAt: endedAt,
      isSample: true,
    };
  });
}

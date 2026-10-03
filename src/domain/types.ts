/**
 * The vocabulary of the whole product, with no React and no Expo in it.
 *
 * Everything the guide hears is reduced to these shapes, everything the body
 * map draws is read from them, and everything Journey says is derived from
 * them. Keeping them platform-free is what lets the engine, the extractor and
 * the recap be tested in plain Node.
 */

export type SessionType = 'notice' | 'flare' | 'sleep' | 'fear';

/**
 * Regions are deliberately coarse. They are where a person would point, not
 * anatomy. "Base of my skull" and "back of my head" are the same place to the
 * guide and to the map.
 */
export type BodyRegion =
  | 'head'
  | 'head_back'
  | 'forehead'
  | 'temple'
  | 'eye'
  | 'jaw'
  | 'face'
  | 'neck'
  | 'throat'
  | 'shoulder'
  | 'upper_back'
  | 'mid_back'
  | 'lower_back'
  | 'sacrum'
  | 'spine'
  | 'chest'
  | 'ribs'
  | 'abdomen'
  | 'pelvis'
  | 'hip'
  | 'glute'
  | 'arm'
  | 'upper_arm'
  | 'elbow'
  | 'forearm'
  | 'wrist'
  | 'hand'
  | 'leg'
  | 'thigh'
  | 'knee'
  | 'calf'
  | 'shin'
  | 'ankle'
  | 'foot'
  | 'whole_body';

export type Side = 'left' | 'right' | 'center' | 'bilateral';

export type MovementType = 'static' | 'moving' | 'spreading' | 'contracting' | 'unknown';
export type Direction = 'up' | 'down' | 'inward' | 'outward' | 'across';
export type Shape = 'focused' | 'diffuse' | 'line' | 'area' | 'unknown';
export type TemporalQuality = 'constant' | 'pulsing' | 'intermittent' | 'changing' | 'unknown';
export type Edge = 'clear' | 'soft' | 'unknown';

/**
 * The visual family a sensation is drawn with. These are aesthetic metaphors
 * chosen for the body map, never a claim about what is happening in tissue
 * or nerves.
 */
export type QualityFamily =
  | 'contract' // tightness, squeezing
  | 'press' // pressure
  | 'pull' // pulling, stretching, twisting
  | 'warm' // warmth, burning
  | 'grain' // buzzing, tingling
  | 'pulse' // throbbing
  | 'point' // sharp
  | 'heavy' // heaviness, aching
  | 'mute' // numbness
  | 'cold'
  | 'unknown';

export type BodySensation = {
  id: string;
  region: BodyRegion;
  side?: Side;
  /** Canonical descriptor words, most recent first ("pulling", "tight"). */
  descriptors: string[];
  movement?: {
    type: MovementType;
    direction?: Direction;
    destinationRegion?: BodyRegion;
    destinationSide?: Side;
  };
  shape?: Shape;
  edge?: Edge;
  temporalQuality?: TemporalQuality;
  /** The person's own phrases, verbatim, so the guide and the recap can use their words. */
  userLanguage: string[];
  /** Whether this is the sensation the session was mostly about. */
  primary?: boolean;
};

export type BodyMapState = {
  sensations: BodySensation[];
};

export type SensationChangeType =
  | 'moved'
  | 'spread'
  | 'contracted'
  | 'quality_shift'
  | 'softened'
  | 'intensified'
  | 'boundary_softened'
  | 'boundary_sharpened'
  | 'shape_shift'
  | 'temporal_shift'
  | 'stable';

export type SensationChange = {
  sensationId: string;
  type: SensationChangeType;
  description: string;
  fromState: Partial<BodySensation>;
  toState: Partial<BodySensation>;
  /** Milliseconds since session start. */
  at?: number;
};

export type SessionOutcome = 'completed' | 'ended_early' | 'safety_pause' | 'crisis_pause';

/**
 * What the session revealed about how the person met the sensation, as
 * opposed to what the sensation was. Journey is built from these, so each one
 * must be something the person actually said, never an inference about mood.
 */
export type SessionSignals = {
  /** They said something like "I can let it be" / "just watching it". */
  acceptance: boolean;
  /** They said they wanted it to stop / were trying to fix it. */
  urgeToFix: boolean;
  /** They named fear or worry. */
  fear: boolean;
  /** They confirmed the sensation is familiar. */
  familiarConfirmed: boolean;
  /** Seconds spent in the observe / reappraise phases. */
  observedSeconds: number;
  /** Number of spoken answers. */
  utterances: number;
};

export type Session = {
  id: string;
  startedAt: number;
  endedAt: number;
  sessionType: SessionType;
  title: string;
  summary: string;
  /** The single sentence Journey shows. */
  oneLiner: string;
  bodyMapStart: BodyMapState;
  bodyMapEnd: BodyMapState;
  changes: SensationChange[];
  outcome: SessionOutcome;
  signals: SessionSignals;
  createdAt: number;
  /** Seeded demo data. Shown with a label and removable in one tap. */
  isSample?: boolean;
};

export type Speaker = 'guide' | 'user' | 'silence';

export type SessionMoment = {
  id: string;
  sessionId: string;
  timestamp: number;
  phase: string;
  speaker: Speaker;
  bodySensations: BodySensation[];
  /** Implementation data. Not persisted unless the developer setting asks for it. */
  internalTranscript?: string;
};

export const EMPTY_SIGNALS: SessionSignals = {
  acceptance: false,
  urgeToFix: false,
  fear: false,
  familiarConfirmed: false,
  observedSeconds: 0,
  utterances: 0,
};

export const EMPTY_MAP: BodyMapState = { sensations: [] };

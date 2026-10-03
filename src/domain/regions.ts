import type { BodyRegion, Side } from './types';

/**
 * Where a region sits on the abstract figure, and how the guide says it.
 *
 * Figure space: the figure is 1 unit tall (crown at y=0, soles at y=1) and
 * centred on x=0. `x` is the distance from the midline for the person's LEFT
 * side; the visualisation mirrors it for right, and flips it for front vs
 * back (the person's left is on the viewer's right from the front).
 */
export type RegionInfo = {
  label: string;
  /** "your neck", "the back of your head" */
  phrase: string;
  /** Paired limbs and joints: "your left knee". */
  paired: boolean;
  /** Midline regions that can still be felt on one side: "the left side of your neck". */
  sided: boolean;
  /** Broad regions the guide may gently ask to narrow ("where in your back?"). */
  broad: boolean;
  view: 'front' | 'back' | 'both';
  x: number;
  y: number;
  radius: number;
};

export const REGIONS: Record<BodyRegion, RegionInfo> = {
  head: { label: 'head', phrase: 'your head', paired: false, sided: true, broad: true, view: 'both', x: 0.03, y: 0.06, radius: 0.05 },
  head_back: { label: 'back of the head', phrase: 'the back of your head', paired: false, sided: true, broad: false, view: 'back', x: 0.02, y: 0.1, radius: 0.04 },
  forehead: { label: 'forehead', phrase: 'your forehead', paired: false, sided: true, broad: false, view: 'front', x: 0.018, y: 0.045, radius: 0.032 },
  temple: { label: 'temple', phrase: 'your temple', paired: true, sided: false, broad: false, view: 'front', x: 0.043, y: 0.062, radius: 0.022 },
  eye: { label: 'eye', phrase: 'your eye', paired: true, sided: false, broad: false, view: 'front', x: 0.02, y: 0.072, radius: 0.016 },
  jaw: { label: 'jaw', phrase: 'your jaw', paired: false, sided: true, broad: false, view: 'front', x: 0.032, y: 0.112, radius: 0.026 },
  face: { label: 'face', phrase: 'your face', paired: false, sided: true, broad: false, view: 'front', x: 0.02, y: 0.08, radius: 0.04 },
  neck: { label: 'neck', phrase: 'your neck', paired: false, sided: true, broad: false, view: 'back', x: 0.016, y: 0.158, radius: 0.03 },
  throat: { label: 'throat', phrase: 'your throat', paired: false, sided: false, broad: false, view: 'front', x: 0, y: 0.158, radius: 0.026 },
  shoulder: { label: 'shoulder', phrase: 'your shoulder', paired: true, sided: false, broad: false, view: 'both', x: 0.108, y: 0.205, radius: 0.038 },
  upper_back: { label: 'upper back', phrase: 'your upper back', paired: false, sided: true, broad: false, view: 'back', x: 0.052, y: 0.255, radius: 0.055 },
  mid_back: { label: 'middle of the back', phrase: 'the middle of your back', paired: false, sided: true, broad: false, view: 'back', x: 0.045, y: 0.335, radius: 0.06 },
  lower_back: { label: 'lower back', phrase: 'your lower back', paired: false, sided: true, broad: false, view: 'back', x: 0.042, y: 0.435, radius: 0.06 },
  sacrum: { label: 'base of the spine', phrase: 'the base of your spine', paired: false, sided: false, broad: false, view: 'back', x: 0, y: 0.5, radius: 0.034 },
  spine: { label: 'spine', phrase: 'your spine', paired: false, sided: false, broad: true, view: 'back', x: 0, y: 0.32, radius: 0.04 },
  chest: { label: 'chest', phrase: 'your chest', paired: false, sided: true, broad: false, view: 'front', x: 0.045, y: 0.262, radius: 0.06 },
  ribs: { label: 'ribs', phrase: 'your ribs', paired: false, sided: true, broad: false, view: 'both', x: 0.082, y: 0.33, radius: 0.04 },
  abdomen: { label: 'stomach', phrase: 'your stomach', paired: false, sided: true, broad: false, view: 'front', x: 0.03, y: 0.405, radius: 0.058 },
  pelvis: { label: 'pelvis', phrase: 'your pelvis', paired: false, sided: true, broad: false, view: 'front', x: 0.04, y: 0.5, radius: 0.055 },
  hip: { label: 'hip', phrase: 'your hip', paired: true, sided: false, broad: false, view: 'both', x: 0.09, y: 0.5, radius: 0.038 },
  glute: { label: 'glute', phrase: 'your glute', paired: true, sided: false, broad: false, view: 'back', x: 0.055, y: 0.535, radius: 0.044 },
  arm: { label: 'arm', phrase: 'your arm', paired: true, sided: false, broad: true, view: 'both', x: 0.152, y: 0.37, radius: 0.05 },
  upper_arm: { label: 'upper arm', phrase: 'your upper arm', paired: true, sided: false, broad: false, view: 'both', x: 0.14, y: 0.29, radius: 0.034 },
  elbow: { label: 'elbow', phrase: 'your elbow', paired: true, sided: false, broad: false, view: 'both', x: 0.155, y: 0.365, radius: 0.026 },
  forearm: { label: 'forearm', phrase: 'your forearm', paired: true, sided: false, broad: false, view: 'both', x: 0.165, y: 0.435, radius: 0.028 },
  wrist: { label: 'wrist', phrase: 'your wrist', paired: true, sided: false, broad: false, view: 'both', x: 0.174, y: 0.505, radius: 0.02 },
  hand: { label: 'hand', phrase: 'your hand', paired: true, sided: false, broad: false, view: 'both', x: 0.18, y: 0.545, radius: 0.027 },
  leg: { label: 'leg', phrase: 'your leg', paired: true, sided: false, broad: true, view: 'both', x: 0.062, y: 0.72, radius: 0.07 },
  thigh: { label: 'thigh', phrase: 'your thigh', paired: true, sided: false, broad: false, view: 'both', x: 0.06, y: 0.63, radius: 0.048 },
  knee: { label: 'knee', phrase: 'your knee', paired: true, sided: false, broad: false, view: 'front', x: 0.065, y: 0.73, radius: 0.033 },
  calf: { label: 'calf', phrase: 'your calf', paired: true, sided: false, broad: false, view: 'back', x: 0.064, y: 0.83, radius: 0.038 },
  shin: { label: 'shin', phrase: 'your shin', paired: true, sided: false, broad: false, view: 'front', x: 0.064, y: 0.83, radius: 0.033 },
  ankle: { label: 'ankle', phrase: 'your ankle', paired: true, sided: false, broad: false, view: 'both', x: 0.06, y: 0.925, radius: 0.024 },
  foot: { label: 'foot', phrase: 'your foot', paired: true, sided: false, broad: false, view: 'both', x: 0.068, y: 0.962, radius: 0.028 },
  whole_body: { label: 'whole body', phrase: 'your whole body', paired: false, sided: false, broad: false, view: 'both', x: 0, y: 0.45, radius: 0.5 },
};

/**
 * Phrase → region, longest phrases first so "lower back" wins over "back" and
 * "back of my head" wins over "head". Plurals imply both sides.
 */
export const REGION_LEXICON: Array<{ re: RegExp; region: BodyRegion; plural?: boolean }> = [
  { re: /\b(back of (my|the) head|base of (my|the) skull|back of (my|the) skull|occipital)\b/, region: 'head_back' },
  { re: /\b(top of (my|the) head|crown of (my|the) head)\b/, region: 'head' },
  { re: /\b(between (my|the) shoulder ?blades)\b/, region: 'upper_back' },
  { re: /\b(shoulder ?blades)\b/, region: 'upper_back', plural: true },
  { re: /\b(shoulder ?blade|scapula)\b/, region: 'upper_back' },
  { re: /\b(lower back|low back|lumbar|small of (my|the) back|bottom of (my|the) back)\b/, region: 'lower_back' },
  { re: /\b(upper back|top of (my|the) back)\b/, region: 'upper_back' },
  { re: /\b(middle of (my|the) back|mid[- ]?back|midback)\b/, region: 'mid_back' },
  { re: /\b(tailbone|tail bone|coccyx|sacrum|base of (my|the) spine)\b/, region: 'sacrum' },
  { re: /\b(upper arms)\b/, region: 'upper_arm', plural: true },
  { re: /\b(upper arm|bicep|tricep)\b/, region: 'upper_arm' },
  { re: /\b(forearms)\b/, region: 'forearm', plural: true },
  { re: /\b(forearm)\b/, region: 'forearm' },
  { re: /\b(whole body|entire body|all over|everywhere)\b/, region: 'whole_body' },
  { re: /\b(temples)\b/, region: 'temple', plural: true },
  { re: /\b(temple)\b/, region: 'temple' },
  { re: /\b(forehead|brow)\b/, region: 'forehead' },
  { re: /\b(eyes)\b/, region: 'eye', plural: true },
  { re: /\b(eye|eye socket)\b/, region: 'eye' },
  { re: /\b(jaw|jaws|tmj|teeth)\b/, region: 'jaw' },
  { re: /\b(face|cheek|cheeks)\b/, region: 'face' },
  { re: /\b(throat)\b/, region: 'throat' },
  { re: /\b(neck|nape)\b/, region: 'neck' },
  { re: /\b(shoulders|traps)\b/, region: 'shoulder', plural: true },
  { re: /\b(shoulder|trap|trapezius)\b/, region: 'shoulder' },
  { re: /\b(spine|vertebrae)\b/, region: 'spine' },
  { re: /\b(chest|sternum|breastbone)\b/, region: 'chest' },
  { re: /\b(ribs|rib cage|ribcage|rib)\b/, region: 'ribs' },
  { re: /\b(stomach|belly|abdomen|tummy|gut)\b/, region: 'abdomen' },
  { re: /\b(pelvis|pelvic|groin)\b/, region: 'pelvis' },
  { re: /\b(hips)\b/, region: 'hip', plural: true },
  { re: /\b(hip)\b/, region: 'hip' },
  { re: /\b(glutes|buttocks|sit bones)\b/, region: 'glute', plural: true },
  { re: /\b(glute|buttock|butt|bum|sit bone)\b/, region: 'glute' },
  { re: /\b(elbows)\b/, region: 'elbow', plural: true },
  { re: /\b(elbow)\b/, region: 'elbow' },
  { re: /\b(wrists)\b/, region: 'wrist', plural: true },
  { re: /\b(wrist)\b/, region: 'wrist' },
  { re: /\b(hands|fingers|palms)\b/, region: 'hand', plural: true },
  { re: /\b(hand|finger|thumb|palm|knuckles)\b/, region: 'hand' },
  { re: /\b(arms)\b/, region: 'arm', plural: true },
  { re: /\b(arm)\b/, region: 'arm' },
  { re: /\b(thighs|hamstrings|quads)\b/, region: 'thigh', plural: true },
  { re: /\b(thigh|hamstring|quad)\b/, region: 'thigh' },
  { re: /\b(knees)\b/, region: 'knee', plural: true },
  { re: /\b(knee|kneecap)\b/, region: 'knee' },
  { re: /\b(calves)\b/, region: 'calf', plural: true },
  { re: /\b(calf)\b/, region: 'calf' },
  { re: /\b(shins)\b/, region: 'shin', plural: true },
  { re: /\b(shin)\b/, region: 'shin' },
  { re: /\b(ankles)\b/, region: 'ankle', plural: true },
  { re: /\b(ankle)\b/, region: 'ankle' },
  { re: /\b(feet|toes|soles)\b/, region: 'foot', plural: true },
  { re: /\b(foot|toe|heel|sole|arch of my foot)\b/, region: 'foot' },
  { re: /\b(legs)\b/, region: 'leg', plural: true },
  { re: /\b(leg)\b/, region: 'leg' },
  { re: /\b(head|headache|skull)\b/, region: 'head' },
  { re: /\b(back|backache)\b/, region: 'mid_back' },
];

/** How the guide refers to a place, in the second person. */
export function speakPlace(region: BodyRegion, side?: Side): string {
  const info = REGIONS[region];
  if (region === 'whole_body') return info.phrase;
  if (side === 'bilateral') {
    if (info.paired) return `both ${pluralLabel(info.label)}`;
    return `both sides of ${info.phrase}`;
  }
  if (side === 'left' || side === 'right') {
    if (info.paired) return info.phrase.replace('your ', `your ${side} `);
    if (info.sided) return `the ${side} side of ${info.phrase}`;
  }
  if (side === 'center' && info.sided) return `the middle of ${info.phrase}`;
  return info.phrase;
}

/** Short label without the possessive, for compact UI: "left shoulder", "neck". */
export function labelPlace(region: BodyRegion, side?: Side): string {
  return speakPlace(region, side)
    .replace(/^the /, '')
    .replace(/^your /, '')
    .replace(/ your /g, ' the ');
}

function pluralLabel(label: string): string {
  if (label.endsWith('f')) return label.slice(0, -1) + 'ves';
  if (label === 'foot') return 'feet';
  return label + 's';
}

/** Regions that sit on the body's midline cannot be "left" without a side qualifier. */
export function isLateralCapable(region: BodyRegion): boolean {
  const info = REGIONS[region];
  return info.paired || info.sided;
}

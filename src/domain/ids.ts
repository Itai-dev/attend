let counter = 0;

/** Locally unique ids. Nothing leaves the device, so collision-resistance across devices is not a goal. */
export function newId(prefix = ''): string {
  counter = (counter + 1) % 1_000_000;
  const rand = Math.floor(Math.random() * 1e9).toString(36);
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${rand}`;
}

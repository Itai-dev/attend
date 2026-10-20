import { File, Paths } from 'expo-file-system';

/**
 * The last guide script and ElevenLabs agent settings the server sent, kept on the phone.
 *
 * Both used to live only in memory. After a relaunch with no network the app fell back to the
 * bundled words and the default voice — neither of which was what the cache had been filled
 * with — so every cached line missed and the guide stayed silent. Read back at launch, the
 * session asks for exactly the lines (and the voice folder) it saved last time.
 *
 * Only what the server sent is stored here: the guide's own words and voice settings, nothing
 * the person said or entered. It never leaves the phone.
 */

const SCRIPT = 'guide-script.json';
const AGENTS = 'guide-agents.json';

function read(name: string): unknown {
  try {
    const f = new File(Paths.document, name);
    if (!f.exists) return undefined;
    return JSON.parse(f.textSync());
  } catch {
    // Missing, unreadable, or web: the bundled script and defaults stand.
    return undefined;
  }
}

function write(name: string, value: unknown) {
  try {
    const f = new File(Paths.document, name);
    if (!f.exists) f.create({ intermediates: true });
    f.write(JSON.stringify(value));
  } catch {
    // Not saved this time; the next successful fetch tries again.
  }
}

export const savedScript = () => read(SCRIPT);
export const saveScript = (script: unknown) => write(SCRIPT, script);

export function savedAgents<T>(): Record<string, T> {
  const v = read(AGENTS);
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, T>) : {};
}
export const saveAgents = (agents: unknown) => write(AGENTS, agents);

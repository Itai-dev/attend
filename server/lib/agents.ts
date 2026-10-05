// The ElevenLabs agents that hold the guide's voice and tone, one per session type.
// Edit them in the ElevenLabs dashboard (Agents → "Attend — …"): Voice (voice, speed,
// stability), System prompt (tone guidance for how lines are worded) and First message
// (the session's opening line). The app reads them at the start of each session.
// IDs aren't secrets; ATTEND_AGENT_<TYPE> overrides one without a code change.
export const AGENTS: Record<string, string> = {
  notice: process.env.ATTEND_AGENT_NOTICE ?? 'agent_0001m467n2qnez0arhj1p246venx',
  flare: process.env.ATTEND_AGENT_FLARE ?? 'agent_7601m467njxqffja48w7s4ay53r1',
  sleep: process.env.ATTEND_AGENT_SLEEP ?? 'agent_9901m467nw81e4day3bteh66j65a',
  fear: process.env.ATTEND_AGENT_FEAR ?? 'agent_2601m467p3hdfgks314a53q9y92e',
};

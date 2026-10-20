import type { Session } from '@/domain/types';
import { FinishFlow } from '../finish/FinishFlow';

/**
 * After a guided session. It used to be one screen (the minutes, this week's dots, the optional
 * tap, any milestone, tomorrow); since 20 Oct 2026 it is the finish flow: a completion moment
 * over the day's place, then at most a milestone and one closing card (features/finish,
 * domain/finish.ts). A sleep practice that ran its course never comes here: it ends in rest.
 */
export function AfterScreen({ session }: { session: Session }) {
  return <FinishFlow session={session} />;
}

import { forceDark } from '@/design/ThemeProvider';
import { SessionDetailRoute } from '@/features/recap/RecapScreen';

/** Always dark: eyes open onto this screen in a dim room (design/theme.ts). */
export default forceDark(SessionDetailRoute);

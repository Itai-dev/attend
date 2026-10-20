import { forceDark } from '@/design/ThemeProvider';
import { RecapRoute } from '@/features/recap/RecapScreen';

/** Always dark: eyes open onto this screen in a dim room (design/theme.ts). */
export default forceDark(RecapRoute);

import { Share } from 'react-native';
import { sharePageHtml, sharePageText, type ShareInput } from '@/domain/share';

/**
 * Hand the share page to the iOS share sheet as a PDF (5 Nov 2026). The person picks where
 * it goes; the app never does. expo-print and expo-sharing are native modules, required
 * inside try/catch like the speech module, so a build that predates them still launches and
 * falls back to sharing the same facts as text.
 */

type PrintModule = typeof import('expo-print');
type SharingModule = typeof import('expo-sharing');

let print: PrintModule | null | undefined;
let sharing: SharingModule | null | undefined;

function modules(): { print: PrintModule; sharing: SharingModule } | null {
  if (print === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      print = require('expo-print') as PrintModule;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      sharing = require('expo-sharing') as SharingModule;
    } catch {
      print = null;
      sharing = null;
    }
  }
  return print && sharing ? { print, sharing } : null;
}

/** A4 in points at 72 ppi, the unit expo-print uses. */
const A4 = { width: 595, height: 842 };

/** Resolves true when a sheet was shown; false when nothing could be shared or the person cancelled. */
export async function sharePage(input: ShareInput): Promise<boolean> {
  const m = modules();
  if (m) {
    try {
      if (await m.sharing.isAvailableAsync()) {
        const { uri } = await m.print.printToFileAsync({ html: sharePageHtml(input), ...A4 });
        await m.sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
        return true;
      }
    } catch {
      // Fall through to the text sheet below.
    }
  }
  try {
    const result = await Share.share({ message: sharePageText(input) });
    return result.action === Share.sharedAction;
  } catch {
    return false;
  }
}

import { getLocales } from 'expo-localization';
import { setLang } from './index';

/**
 * Imported first (index.js), before any screen or table reads the language. iOS reports the
 * language it runs this app in first: the phone's, or Attend's own pick in Settings.
 */
try {
  setLang(getLocales()[0]?.languageCode === 'he' ? 'he' : 'en');
} catch {
  // A build without the module: English.
}

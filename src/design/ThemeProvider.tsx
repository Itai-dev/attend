import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { dark, light, type Palette } from './theme';

/**
 * Light by day and dark at night, following the phone (or the choice in Settings). Screens
 * read colours through useColors() and build their styles with useStyles(), so a change of
 * appearance redraws them in place.
 */

export type AppearancePref = 'auto' | 'light' | 'dark';

const ThemeCtx = createContext<Palette>(light);

export function ThemeProvider({ appearance = 'auto', children }: { appearance?: AppearancePref; children: ReactNode }) {
  const system = useColorScheme();
  const scheme = appearance === 'auto' ? (system === 'dark' ? 'dark' : 'light') : appearance;
  return <ThemeCtx.Provider value={scheme === 'dark' ? dark : light}>{children}</ThemeCtx.Provider>;
}

/** The eyes-closed screens (session, recap, body map) are dark whatever the appearance. */
export function ForceDark({ children }: { children: ReactNode }) {
  return <ThemeCtx.Provider value={dark}>{children}</ThemeCtx.Provider>;
}

export function useColors(): Palette {
  return useContext(ThemeCtx);
}

/** Styles that depend on the palette, rebuilt only when it changes. */
export function useStyles<T>(make: (color: Palette) => T): T {
  const c = useColors();
  return useMemo(() => make(c), [make, c]);
}

/** A route component wrapped in ForceDark. */
export function forceDark<P extends object>(Screen: (p: P) => ReactNode) {
  return function DarkScreen(p: P) {
    return (
      <ForceDark>
        <Screen {...p} />
      </ForceDark>
    );
  };
}

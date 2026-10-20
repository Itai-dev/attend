import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Postcard as PostcardData, ProgramPlace } from '@/domain/finish';
import { radius, type Palette } from '@/design/theme';
import { useStyles } from '@/design/ThemeProvider';
import { PlaceImage } from './PlaceImage';

/** Postcards are a little taller than wide, like a print. */
export const POSTCARD_ASPECT = 1.25;

/**
 * One place, as a small print with a paper edge. An unearned one is a quiet empty frame: the
 * same faint surface as a day not reached on the program path. No outline, no dash, no date —
 * nothing marks it as missed.
 */
export function Postcard({ place, earned = true, width, style }: { place: ProgramPlace; earned?: boolean; width: number; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles(makeStyles);
  const height = Math.round(width * POSTCARD_ASPECT);
  if (!earned) return <View style={[styles.empty, { width, height }, style]} />;
  const edge = width < 48 ? 2 : 3;
  return (
    <View style={[styles.print, { padding: edge }, style]}>
      <PlaceImage photo={place.photo} focus={place.focus} width={width - edge * 2} height={height - edge * 2} radius={1} />
    </View>
  );
}

/**
 * Postcards in rows of seven, a week a row. Used by the places collection on Progress and by the
 * closing cards (a week's chapter, the 28 days).
 */
export function PostcardRows({ cards, width, gap = 6 }: { cards: PostcardData[]; width: number; gap?: number }) {
  const w = Math.floor((width - gap * 6) / 7);
  const rows: PostcardData[][] = [];
  for (let i = 0; i < cards.length; i += 7) rows.push(cards.slice(i, i + 7));
  return (
    <View style={{ gap }}>
      {rows.map((row) => (
        <View key={row[0].day} style={{ flexDirection: 'row', gap }}>
          {row.map((c) => (
            <View key={c.day} accessible accessibilityLabel={c.earned ? `Day ${c.day}: ${c.name}.` : `Day ${c.day}: not yet.`}>
              <Postcard place={c} earned={c.earned} width={w} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const makeStyles = (color: Palette) =>
  StyleSheet.create({
    // Paper by day, a soft warm grey at night: a print, never a bright white tile in a dim room.
    print: { backgroundColor: color.scheme === 'dark' ? '#D9D5CE' : '#FFFFFF', borderRadius: 2, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    empty: { backgroundColor: color.surfaceStrong, borderRadius: radius.s },
  });

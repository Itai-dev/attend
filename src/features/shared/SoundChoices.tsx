import { View } from 'react-native';
import { soundscape, SOUNDSCAPES, type BackgroundPref, type SoundscapeId } from '@/domain/soundscapes';
import { ChoiceRow, Hairline } from '@/design/components';

/**
 * The sound under practice, as a list: practice settings and Settings show the same one, since
 * they set the same pref. "Matched to the practice" first, because it is the default and the
 * one most people keep (20 Oct 2026); its detail says what today's practice gets, so the choice
 * is never a mystery. Then the sounds, then "No sound".
 */
export function SoundChoices({ selected, today, onChoose }: { selected: BackgroundPref; today: SoundscapeId; onChoose: (p: BackgroundPref) => void }) {
  return (
    <>
      <Hairline />
      <ChoiceRow
        label="Matched to the practice"
        detail={`Today: ${(soundscape(today)?.name ?? '').toLowerCase()}`}
        selected={selected === 'matched'}
        onPress={() => onChoose('matched')}
      />
      {SOUNDSCAPES.map((sc) => (
        <View key={sc.id}>
          <Hairline />
          <ChoiceRow label={sc.name} detail={sc.line} selected={selected === sc.id} onPress={() => onChoose(sc.id)} />
        </View>
      ))}
      <Hairline />
      <ChoiceRow label="No sound" detail="Only the guide’s voice" selected={selected === 'none'} onPress={() => onChoose('none')} />
    </>
  );
}

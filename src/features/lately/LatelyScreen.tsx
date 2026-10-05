import { router } from 'expo-router';
import { QuietButton, SectionLabel, TitledScroll } from '@/design/components';
import { space } from '@/design/theme';
import { BodyContent } from '../body/BodyScreen';
import { JourneyContent } from '../journey/JourneyScreen';

/**
 * Lately: everything the practice has gathered, in one quiet place behind the start screen —
 * how things have moved (Journey) and where attention has gone (Body). There when wanted,
 * never the reason to open the app.
 */
export function LatelyScreen() {
  return (
    <TitledScroll title="Lately" right={<QuietButton label="Done" tone="primary" onPress={() => router.back()} />}>
      <JourneyContent />
      <SectionLabel style={{ marginTop: space.xxl }}>Where you’ve attended</SectionLabel>
      <BodyContent showRecent={false} />
    </TitledScroll>
  );
}

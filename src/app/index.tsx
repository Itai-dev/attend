import { Redirect } from 'expo-router';
import { useData } from '@/data/store';
import { HomeScreen } from '@/features/home/HomeScreen';

/** One screen, no tabs: the start of a session. Journey and Body live behind "Lately". */
export default function Index() {
  const { prefs } = useData();
  if (!prefs.onboarded) return <Redirect href="/onboarding" />;
  return <HomeScreen />;
}

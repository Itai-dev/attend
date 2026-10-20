import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import {
  DEFAULT_PLAN,
  paywallHeading,
  PAYWALL_LEGAL,
  PAYWALL_LINES,
  paywallBody,
  plan as planById,
  PLANS,
  PRIVACY_URL,
  PURCHASE_COPY,
  TERMS_URL,
  trialTimeline,
  type PaywallFrom,
  type PlanId,
} from '@/domain/access';
import { currentTz } from '@/domain/checkin';
import { practiceStats } from '@/domain/engagement';
import { haptic, IconButton, PrimaryButton, QuietButton, Txt } from '@/design/components';
import { Photo } from '@/design/Photo';
import { HIT, radius, space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';
import { prices as storePrices, purchase, redeemCode, restore, trialEligible as storeTrialEligible, type PurchaseResult } from '@/voice/purchases';

/**
 * Attend Plus (docs/launch/paywall.md §1). Opened from "begin day 8", a locked one-tap practice,
 * or Settings — never after a session, a check-in, or near the pain record, and the word "pain"
 * appears nowhere on it.
 *
 * It asks once and lets go: "not now" goes straight back, with no second ask. No countdown, no
 * "limited time", nothing about what the person might lose. The billed price sits under the
 * button at body size, as readable as the word "free" (Apple rejects paywalls where it isn't).
 *
 * Light or dark like the rest of the app; not forceDark — this is read with the eyes open.
 */

type Status = { line: string; retry?: boolean } | null;

function fromParam(v: string | undefined): PaywallFrom {
  return v === 'settings' || v === 'practice' ? v : 'day8';
}

export function PlusScreen() {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{ from?: string }>();
  const from = fromParam(params.from);
  const { sessions, prefs } = useData();

  const [selected, setSelected] = useState<PlanId>(DEFAULT_PLAN);
  const [storePrice, setStorePrice] = useState<Partial<Record<PlanId, string>>>({});
  const [eligible, setEligible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  // The store's localized prices replace the founding fallbacks as soon as they arrive.
  useEffect(() => {
    let live = true;
    storePrices().then((p) => live && setStorePrice(p)).catch(() => {});
    storeTrialEligible().then((e) => live && setEligible(e)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const now = useMemo(() => Date.now(), []);
  const tz = currentTz();
  const practiced = useMemo(() => practiceStats(sessions, now, tz).days, [sessions, now, tz]);
  const priceOf = (id: PlanId) => storePrice[id] ?? planById(id).fallbackPrice;

  const chosen = planById(selected);
  const price = priceOf(selected);
  const trial = selected === 'yearly' && eligible;
  const timeline = trial ? trialTimeline(now, tz, price, { reminders: !!prefs.reminder?.enabled }) : null;

  const settle = (r: PurchaseResult, kind: 'buy' | 'restore') => {
    if (r.ok) {
      // TODO(lead): keep r.record on the device (Prefs.plus) so entitlementFrom() sees it offline.
      // Paywall.md: straight into Day 8's lesson, no celebration screen.
      if (from === 'day8') router.replace({ pathname: '/lesson/[day]', params: { day: '8' } });
      else router.back();
      return;
    }
    if (r.reason === 'cancelled') setStatus(null); // Back at the paywall, unchanged, no message.
    else if (r.reason === 'unavailable') setStatus({ line: PURCHASE_COPY.unavailable });
    else if (r.reason === 'nothing') setStatus({ line: PURCHASE_COPY.nothingToRestore });
    else setStatus({ line: PURCHASE_COPY.failed, retry: kind === 'buy' });
  };

  const run = async (kind: 'buy' | 'restore' | 'redeem') => {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const r = kind === 'buy' ? await purchase(selected) : kind === 'restore' ? await restore() : await redeemCode();
      settle(r, kind === 'buy' ? 'buy' : 'restore');
    } catch {
      setStatus({ line: PURCHASE_COPY.failed, retry: kind === 'buy' });
    } finally {
      setBusy(false);
    }
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const heroH = Math.round(height * 0.34);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }} showsVerticalScrollIndicator={false}>
        {/* The Week 2 photograph: a place at first light. Never a body. */}
        <Photo scene="dawn" height={heroH} drift>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]} />
          {/* On the photograph, so it scrolls away with it rather than floating over the plans. */}
          <View style={[styles.top, { paddingTop: insets.top + space.s }]}>
            <IconButton icon="chevron.down" label="Not now" onPress={close} tint={color.onImage} style={styles.closeBtn} />
          </View>
          <View style={styles.heroText}>
            <Txt variant="footnote" style={[styles.onImage, { fontWeight: '500', opacity: 0.9 }]}>
              attend plus
            </Txt>
            <Txt variant="display" accessibilityRole="header" style={styles.onImage}>
              {paywallHeading(from)}
            </Txt>
          </View>
        </Photo>

        <View style={styles.body}>
          <Txt variant="body">{paywallBody(from, practiced)}</Txt>

          <View style={styles.lines}>
            {PAYWALL_LINES.map((l) => (
              <View key={l} style={styles.line}>
                <View style={styles.mark} />
                <Txt variant="callout" style={{ flex: 1 }}>
                  {l}
                </Txt>
              </View>
            ))}
          </View>

          <View accessibilityRole="radiogroup" style={styles.plans}>
            {PLANS.map((p) => {
              const on = p.id === selected;
              const detail = p.detail(priceOf(p.id), eligible);
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={[p.label, p.note, detail].filter(Boolean).join('. ')}
                  onPress={() => {
                    if (!on) haptic('select');
                    setSelected(p.id);
                    setStatus(null);
                  }}
                  style={({ pressed }) => [styles.plan, on && styles.planOn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.planLabel}>
                      <Txt variant="headline" style={{ textTransform: 'lowercase' }}>
                        {p.label}
                      </Txt>
                      {p.note ? (
                        <Txt variant="footnote" tone="secondary" style={{ fontWeight: '500' }}>
                          {p.note}
                        </Txt>
                      ) : null}
                    </View>
                    <Txt variant="callout" tone="secondary" style={{ marginTop: 2 }}>
                      {detail}
                    </Txt>
                  </View>
                  <View style={[styles.radio, on && styles.radioOn]} />
                </Pressable>
              );
            })}
          </View>

          {timeline ? (
            <View style={styles.timeline} accessibilityLabel={timeline.map((t) => `${t.when}: ${t.what}`).join('. ')}>
              {timeline.map((t, i) => (
                <View key={t.when} style={styles.step}>
                  <View style={styles.rail}>
                    <View style={[styles.dot, i === 0 && styles.dotNow]} />
                    {i < timeline.length - 1 ? <View style={styles.railLine} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: i < timeline.length - 1 ? space.l : 0 }}>
                    <Txt variant="headline">{t.when}</Txt>
                    <Txt variant="callout" tone="secondary" style={{ marginTop: 1 }}>
                      {t.what}
                    </Txt>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <PrimaryButton label={chosen.button(eligible)} onPress={() => run('buy')} disabled={busy} style={{ marginTop: space.xl, opacity: busy ? 0.6 : 1 }} />
          {/* The billed price: same size as body text, never fainter than "free". */}
          <Txt variant="body" style={{ marginTop: space.m }}>
            {chosen.billing(price, eligible)}
          </Txt>

          {status ? (
            <View style={styles.status} accessibilityLiveRegion="polite">
              <Txt variant="callout" tone="secondary">
                {status.line}
              </Txt>
              {status.retry ? <QuietButton label="try again" tone="primary" onPress={() => run('buy')} style={{ paddingHorizontal: 0 }} /> : null}
            </View>
          ) : null}

          <QuietButton label="not now" onPress={close} style={styles.notNow} />

          <View style={styles.links}>
            <FooterLink label="restore purchases" onPress={() => run('restore')} />
            <Dot />
            <FooterLink label="redeem a code" onPress={() => run('redeem')} />
            <Dot />
            <FooterLink label="terms" onPress={() => Linking.openURL(TERMS_URL).catch(() => {})} />
            <Dot />
            <FooterLink label="privacy" onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} />
          </View>

          <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.l }}>
            {PAYWALL_LEGAL}
          </Txt>
        </View>
      </ScrollView>

    </View>
  );
}

function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={{ top: 14, bottom: 14, left: 6, right: 6 }} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
      <Txt variant="footnote" tone="secondary" style={{ textDecorationLine: 'underline' }}>
        {label}
      </Txt>
    </Pressable>
  );
}

function Dot() {
  return (
    <Txt variant="footnote" tone="tertiary" importantForAccessibility="no" accessibilityElementsHidden>
      ·
    </Txt>
  );
}

const makeStyles = (color: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: color.bg },
    heroText: { position: 'absolute', left: space.xl, right: space.xl, bottom: space.xl },
    onImage: { color: color.onImage },
    top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.l },
    // The same close as Just listen's: nearly square, on the photograph.
    closeBtn: { backgroundColor: 'rgba(5,8,9,0.25)', borderRadius: radius.s },
    body: { paddingHorizontal: space.xl, paddingTop: space.xl },
    lines: { marginTop: space.xl, gap: space.m },
    line: { flexDirection: 'row', alignItems: 'flex-start', gap: space.m },
    // A small ring, the app's mark at rest: a quiet bullet, never a tick or a lock.
    mark: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: color.practice, marginTop: 6 },
    plans: { marginTop: space.xxl, gap: space.s },
    plan: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 64,
      paddingHorizontal: space.l,
      paddingVertical: space.m,
      borderRadius: radius.s,
      borderWidth: 1,
      borderColor: color.hairline,
      backgroundColor: color.surface,
    },
    planOn: { borderColor: color.text },
    planLabel: { flexDirection: 'row', alignItems: 'baseline', gap: space.s },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: color.hairline, marginLeft: space.m },
    radioOn: { borderWidth: 6, borderColor: color.text, backgroundColor: color.bg },
    timeline: { marginTop: space.xl, paddingLeft: space.xs },
    step: { flexDirection: 'row', gap: space.m },
    rail: { width: 12, alignItems: 'center', paddingTop: 6 },
    dot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: color.textSecondary, backgroundColor: color.bg },
    dotNow: { backgroundColor: color.practice, borderColor: color.practice },
    railLine: { flex: 1, width: StyleSheet.hairlineWidth * 2, backgroundColor: color.hairline, marginTop: space.xs },
    status: { marginTop: space.l, gap: space.xs },
    notNow: { alignSelf: 'center', marginTop: space.l, minHeight: HIT, paddingHorizontal: space.l },
    links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: space.s, marginTop: space.l },
  });

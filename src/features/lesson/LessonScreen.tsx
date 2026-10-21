import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useData } from "@/data/store";
import { EMPTY_PROGRAM, markRead, programDay, WEEKS } from "@/domain/program";
import { WEEK_ART } from "@/design/art";
import {
  haptic,
  IconButton,
  PrimaryButton,
  QuietButton,
  Txt,
} from "@/design/components";
import { CoverArt, HeaderGradient } from "@/design/media";
import { color, radius, space } from "@/design/theme";

/**
 * A lesson, told like a story: the week's colour behind it, progress bars along the top,
 * one idea per card in big type, then straight into the day's practice.
 * Education alone barely changes pain; paired with practice it does better
 * (docs/RESEARCH.md §2), so the last card's button is the practice, not "done".
 */
export function LessonScreen() {
  const { day: dayParam } = useLocalSearchParams<{ day: string }>();
  const day = programDay(Number(dayParam) || 1);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { prefs, setPrefs } = useData();
  const art = WEEK_ART[day.week];
  const [i, setI] = useState(0);
  const cards = day.lesson.cards;
  const card = cards[i];
  const last = i === cards.length - 1;

  const finish = async () => {
    await setPrefs({
      program: markRead(prefs.program ?? EMPTY_PROGRAM, day.day),
    });
    router.replace({ pathname: "/before", params: { day: String(day.day) } });
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + space.m,
          paddingBottom: insets.bottom + space.l,
        },
      ]}
    >
      <HeaderGradient art={art} width={width} height={height * 0.7} />
      <View
        style={styles.bars}
        accessibilityLabel={`Card ${i + 1} of ${cards.length}`}
      >
        {cards.map((_, k) => (
          <View
            key={k}
            style={[styles.bar, k <= i && { backgroundColor: color.text }]}
          />
        ))}
      </View>
      <View style={styles.top}>
        <Txt variant="footnote" style={{ fontWeight: "700" }}>
          Day {day.day} · Week {day.week} · {WEEKS[day.week].name}
        </Txt>
        <IconButton
          icon="xmark"
          label="Close"
          onPress={() => router.back()}
          tint={color.text}
        />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {i === 0 ? (
          <View style={styles.cover}>
            <CoverArt art={art} seed={day.day} size={112} rounded={radius.s}>
              <Txt variant="caption" style={styles.coverKicker}>
                LESSON
              </Txt>
              <Txt variant="display" style={styles.coverDay}>
                {String(day.day)}
              </Txt>
            </CoverArt>
          </View>
        ) : null}
        {i === 0 ? (
          <Txt variant="display" accessibilityRole="header">
            {day.lesson.title}
          </Txt>
        ) : null}
        <Animated.View
          key={i}
          entering={FadeIn.duration(400)}
          style={{ gap: space.l, marginTop: i === 0 ? space.l : space.xl }}
        >
          {card.text.map((p) => (
            <Txt key={p} variant="title2" style={styles.text}>
              {p}
            </Txt>
          ))}
          {card.notice ? (
            <View style={styles.notice}>
              <Txt variant="caption" style={{ color: color.practice }}>
                NOTICE
              </Txt>
              <Txt variant="body" style={{ marginTop: space.xs }}>
                {card.notice}
              </Txt>
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        {last ? (
          <PrimaryButton
            label="Start the practice"
            detail={`${day.practice.title} · ${day.practice.minutes} min`}
            onPress={finish}
          />
        ) : (
          <PrimaryButton
            label="Next"
            onPress={() => {
              haptic("select");
              setI(i + 1);
            }}
          />
        )}
        {i > 0 ? (
          <QuietButton
            label="Back"
            style={{ alignSelf: "center" }}
            onPress={() => setI(i - 1)}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  bars: { flexDirection: "row", gap: 4, paddingHorizontal: space.l },
  bar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: space.l,
    paddingRight: space.xs,
  },
  body: {
    flexGrow: 1,
    paddingHorizontal: space.l,
    paddingTop: space.l,
    paddingBottom: space.xxl,
  },
  cover: {
    marginBottom: space.xl,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  coverKicker: {
    position: "absolute",
    left: space.m,
    top: space.m,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 1.4,
  },
  coverDay: {
    position: "absolute",
    left: space.m,
    bottom: space.s,
    fontSize: 44,
    lineHeight: 48,
  },
  text: { fontWeight: "600", lineHeight: 29 },
  notice: {
    padding: space.l,
    borderRadius: radius.m,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  footer: { paddingHorizontal: space.l, gap: space.s },
});

# Attend in Hebrew (27 Oct 2026)

How the Hebrew version is written. It follows the product rules in `AGENTS.md` (they are not
relaxed by translation) and the microcopy practice of Kinneret Yifrah's *מיקרוקופי – המדריך
המלא*: write the interface as one calm person talking to another, in the Hebrew people speak.

The Hebrew version is a rewrite, not a translation. Keep what each line *does* (its job,
its length, its restraint), not its English words. If a literal rendering sounds like a
translation, it is wrong.

## Who reads it

Someone with long-lasting pain, often tired, often between other things. They open the app
to practise for a few minutes and leave. Every word costs them attention.

## The voice

- **Calm, sparse, warm, confident.** Short sentences. One idea per sentence.
- **Everyday spoken Hebrew**, not literary and not clinical. "כדאי", not "מומלץ ביותר".
  "אפשר", not "ניתן" (except where "אפשר" would be ambiguous).
- **No exclamation marks, no emoji, no hype.** Nothing "מדהים", nothing "כל הכבוד".
- **No translationese.** Not "תרגישו חופשי", not "זה בסדר להרגיש", not "קחו את הזמן שלכם"
  when "אין לחץ" or "לאט" says it. Not "בצע", "הקש" or "לחץ על" in body text.
- The app has no "I". It rarely says "we"; when it must, "אנחנו" is fine. Mostly it just says
  the thing.

## Gender: never guess the person's

Hebrew forces a gender on every "you". The app never chooses one for the person
(Yifrah, chapter on inclusive language). Use, in this order:

1. **Neutral phrasing** — no "you" at all: "אפשר להתחיל מחר", "התרגול הבא מחכה", "אין מה להשלים".
2. **Infinitive for buttons, links and actions**: "להתחיל", "להמשיך", "לשמור", "להתחיל את יום 1",
   "לחזור". Never "התחל" / "התחילי".
3. **Plural address (אתם)** when a sentence must speak to the person: "שימו לב", "כשתרצו",
   "מה תרצו לעשות?", "בחרו". This is the standard inclusive form in Hebrew apps and in
   recorded guided practice.

Never slash forms (את/ה, בחר/י), never "המשתמש", never singular imperatives. The person's own
words (their name, their goal) are shown as they typed them.

Forms in the past or about the person ("you began") become neutral or plural:
"התחלתם", "הצעד הראשון נעשה", "תרגלתם גם בהתלקחות".

## Buttons, titles, empty states, errors

- A button says what will happen, as an infinitive: "לשמור", "להתחיל את התרגול", not "אישור".
- Titles are short noun phrases or questions: "התוכנית שלכם", "איפה הכי כואב?".
- Empty state: what is here, and the one next step. "עוד אין תרגולים. התרגול הראשון מחכה בלשונית היום."
- Error: what happened and what to do, with no blame and no drama.
  "לא הצלחנו להגיע לקול המנחה. אפשר לנסות שוב בעוד רגע."
- Accessibility labels are Hebrew too, written the same way.

## Punctuation and typography

- Gershayim and geresh are the Hebrew marks: ״ and ׳ (צ׳ק־אין, א׳, ב׳). Not " and '.
- Maqaf ־ joins compounds (צ׳ק־אין, דו־צדדי). A spaced en dash – for a break in a sentence.
- Numbers stay digits in the UI ("5 דקות", "יום 1"). Counts agree in gender and number:
  "דקה אחת", "2 דקות", "יום אחד", "יומיים", "3 ימים", "שבוע אחד", "שבועיים".
- Time is 24-hour: 08:00, 20:30.
- The brand stays Latin: Attend. Mixed-direction text is fine; don't wrap it in quotes.
- No capital-letter styling exists in Hebrew: an English UPPERCASE label becomes normal
  Hebrew, usually a bit bolder or smaller, never transliterated.

## The guide's spoken script

Spoken by ElevenLabs, eyes closed. Everything above applies, plus:

- **Plural imperatives** ("עצמו את העיניים", "שימו לב", "הניחו לנשימה"). Calm, never commanding.
- **Short lines, commas for breath.** The number after each line is the silence that follows;
  keep the English silences.
- **Say it the way it will be heard.** No abbreviations, no gershayim, no digits: write
  numbers as words. No parentheses, no slashes, no English words.
- **Niqqud only where a word could be misread aloud** (and only on that word), e.g. a word the
  voice might stress or vocalise wrongly. Unpointed text is the default.
- Placeholders stay exactly as they are: `{place}` becomes a definite Hebrew place such as
  "הכתף השמאלית" or "הגב התחתון", so write it where a definite noun fits: "אל {place}",
  "ב{place}" is wrong (the article would be lost); write "באזור של {place}" or "אל {place}".
- Never "בטוח", "אין שום דבר רע", "זה רק המוח", "שפיר", no praise, no thanks, no apology for
  pain, no "אני שומע אתכם". The guide never decides a sensation is harmless.
- The guide has no gender of its own: avoid first person entirely ("נמשיך", "נעצור כאן").

## Words we use (glossary)

| English | Hebrew |
| --- | --- |
| practice (noun) / a session | תרגול |
| to practise | לתרגל |
| lesson | שיעור |
| the program | התוכנית |
| Day 1, Week 2 | יום 1, שבוע 2 |
| check-in | צ׳ק־אין |
| pain record | יומן הכאב |
| sensation | תחושה |
| somatic tracking | מעקב סומטי |
| attention | תשומת לב |
| milestones | אבני דרך |
| goal | מטרה |
| a moment (saved toward the goal) | רגע |
| reminder | תזכורת |
| settings | הגדרות |
| Today (tab) | היום |
| Explore (tab) | גילוי |
| the guide (the voice) | הקול המנחה, or just "הקול" |
| background sound | צלילי רקע |
| flare | התלקחות |
| eyes closed | בעיניים עצומות |
| alarm (the nervous system's) | אזעקה |
| nervous system | מערכת העצבים |

## Pain words

The pain number is what the person entered, 0–10, with five words (from Pattern). In
Hebrew the five words describe the pain, never the person: no "אתם בסדר".

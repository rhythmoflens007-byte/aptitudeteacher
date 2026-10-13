import type { TutorGender } from "./tutor";

/*
 * The playful tutor's animation "brain", in the spirit of Duolingo's character rigs.
 *
 * Layers, from highest priority down:
 *   1. word cues      — a number word shows that many fingers, "not" shakes the head, praise pops the brows
 *   2. sentence cues  — the AI's emotion tag plus keywords (in English, Hindi, Tamil and Telugu) pick an
 *                       expression and a gesture for each sentence as it is spoken
 *   3. mood reactions — celebrate a correct answer, "oops" then encourage after a wrong one, think, listen
 *   4. idle life      — a greeting wave, breathing, blinks, glances, and small playful moments
 * Every target is blended with springs, so moving between states always looks smooth.
 */

export type Mood = "neutral" | "happy" | "thinking" | "listening" | "concerned";
export type HandShape = "open" | "fist" | "point" | "two" | "three" | "four" | "thumb" | "ok";
export type Emotion = "excited" | "proud" | "encouraging" | "curious" | "careful" | "empathetic" | "playful" | "thinking" | "neutral";

/* ---------------- Mouth shapes ---------------- */

export type MouthKey = "rest" | "MBP" | "A" | "E" | "I" | "O" | "U" | "FV" | "L" | "S" | "CH" | "GRIN";
export type MouthParams = { w: number; open: number; round: number; teeth: number; bite: number };

export const MOUTHS: Record<MouthKey, MouthParams> = {
  rest: { w: 1, open: 0, round: 0, teeth: 0, bite: 0 },
  MBP: { w: 0.9, open: 0, round: 0.12, teeth: 0, bite: 0 },
  A: { w: 1.05, open: 1, round: 0, teeth: 0.5, bite: 0 },
  E: { w: 1.22, open: 0.5, round: 0, teeth: 0.8, bite: 0 },
  I: { w: 1.3, open: 0.28, round: 0, teeth: 1, bite: 0 },
  O: { w: 0.78, open: 0.78, round: 0.85, teeth: 0.2, bite: 0 },
  U: { w: 0.62, open: 0.32, round: 1, teeth: 0, bite: 0 },
  FV: { w: 1.02, open: 0.18, round: 0, teeth: 1, bite: 1 },
  L: { w: 1.05, open: 0.45, round: 0, teeth: 0.75, bite: 0 },
  S: { w: 1.15, open: 0.14, round: 0, teeth: 1, bite: 0 },
  CH: { w: 0.82, open: 0.34, round: 0.55, teeth: 0.85, bite: 0 },
  GRIN: { w: 1.28, open: 0.2, round: 0, teeth: 1, bite: 0 },
};

/* ---------------- Faces ---------------- */

export type Face = {
  smile: number;
  squint: number;
  browRaise: number;
  browInner: number;
  /** Extra lift on the viewer-right brow, for a quizzical look. */
  browAsym: number;
  mouthShift: number;
  eyeWide: number;
};

type Expression =
  | "neutral"
  | "happy"
  | "excited"
  | "proud"
  | "laugh"
  | "encouraging"
  | "curious"
  | "careful"
  | "empathetic"
  | "playful"
  | "thinking"
  | "surprised"
  | "concerned"
  | "listening"
  | "oops";

const face = (f: Partial<Face>): Face => ({ smile: 0.3, squint: 0, browRaise: 0, browInner: 0, browAsym: 0, mouthShift: 0, eyeWide: 0, ...f });

const EXPRESSIONS: Record<Expression, Face> = {
  neutral: face({}),
  happy: face({ smile: 0.85, squint: 0.3, browRaise: 2 }),
  excited: face({ smile: 1, squint: 0.2, browRaise: 4, eyeWide: 0.12 }),
  proud: face({ smile: 0.95, squint: 0.5, browRaise: 1 }),
  laugh: face({ smile: 1, squint: 0.75, browRaise: 2.5 }),
  encouraging: face({ smile: 0.7, browRaise: 2.5, browInner: 3 }),
  curious: face({ smile: 0.15, browRaise: 2, browAsym: 4.5 }),
  careful: face({ smile: -0.05, browRaise: 1, browAsym: 3, browInner: -4 }),
  empathetic: face({ smile: 0.15, browRaise: 1.5, browInner: 9 }),
  playful: face({ smile: 0.8, squint: 0.2, browAsym: 2.5, mouthShift: 3 }),
  thinking: face({ smile: -0.05, squint: 0.1, browRaise: 1, browInner: -5, mouthShift: 4 }),
  surprised: face({ smile: 0.1, browRaise: 5.5, eyeWide: 0.28 }),
  concerned: face({ smile: -0.45, browRaise: 1.5, browInner: 9 }),
  listening: face({ smile: 0.35, browRaise: 2.5, browInner: 3 }),
  oops: face({ smile: -0.25, browRaise: 4, browInner: 6, eyeWide: 0.16, mouthShift: -3 }),
};

/* ---------------- Poses and gestures ---------------- */

/** One arm, described from the arm hanging at the side. Degrees. */
export type ArmPose = {
  /** Swing out from the body; negative crosses in front. */
  s: number;
  /** Upper-arm foreshortening when reaching toward the viewer (1 = none). */
  f: number;
  /** Elbow bend, bringing the forearm inward and up; negative bends outward. */
  e: number;
  /** Wrist bend. */
  w: number;
  hand: HandShape;
};

export type BodyPose = {
  /** Viewer's left arm (the tutor's right). */
  l: ArmPose;
  /** Viewer's right arm (the tutor's left). */
  r: ArmPose;
  tilt: number;
  lookUp: number;
  turn: number;
  shrug: number;
  lean: number;
};

const arm = (s: number, f: number, e: number, w: number, hand: HandShape): ArmPose => ({ s, f, e, w, hand });
const REST = arm(5, 1, 8, 0, "open");
const pose = (l: ArmPose, r: ArmPose, extra: Partial<Omit<BodyPose, "l" | "r">> = {}): BodyPose => ({ l, r, tilt: 0, lookUp: 0, turn: 0, shrug: 0, lean: 0, ...extra });

/** A gesture is a pose that may move over time; `t` is seconds since it started. */
type Gesture = (t: number) => BodyPose;
const still = (p: BodyPose): Gesture => () => p;
const COUNT_HANDS: HandShape[] = ["point", "point", "two", "three", "four", "open"];

const G = {
  rest: still(pose(REST, REST)),
  // Open palms angled up and out, as if offering an idea (not crossed at the waist).
  present: still(pose(REST, arm(26, 0.8, -146, -6, "open"), { lean: 1, tilt: 2 })),
  pointUp: still(pose(REST, arm(22, 0.8, 150, 0, "point"), { tilt: -2, lookUp: 1 })),
  palmRaise: still(pose(arm(20, 0.8, -150, 0, "open"), REST, { tilt: 3, turn: -2 })),
  chest: still(pose(arm(-8, 0.7, 125, 10, "open"), arm(24, 0.9, 70, -25, "open"), { tilt: 2 })),
  count:
    (n: number): Gesture =>
    (t) =>
      pose(REST, arm(35, 0.75, -145 + Math.sin(t * 6) * 3, 0, COUNT_HANDS[Math.max(1, Math.min(5, n))]), { tilt: 3, lookUp: 1 }),
  clap: ((t) => {
    const beat = Math.sin(t * 16) * 9;
    // Hands meet in front of the chest, where a clap reads clearly.
    return pose(arm(-4, 0.62, 128 + beat, 5, "open"), arm(-4, 0.62, 128 + beat, 5, "open"), { lean: 1.5 });
  }) as Gesture,
  fistPump: ((t) => pose(REST, arm(35, 0.75, -150 + Math.abs(Math.sin(t * 8)) * 25, 0, "fist"), { tilt: 4, lookUp: 2 })) as Gesture,
  jazzHands: ((t) =>
    pose(arm(20, 0.8, -150, Math.sin(t * 18) * 14, "open"), arm(35, 0.75, -145, Math.sin(t * 18 + 1) * 14, "open"), { lookUp: 2, shrug: 0.4 })) as Gesture,
  // Raised beside the shoulder, like counting, so the thumb and the OK sign are actually visible.
  thumbs: still(pose(REST, arm(30, 0.75, -142, -4, "thumb"), { tilt: 3 })),
  ok: still(pose(REST, arm(30, 0.75, -142, 0, "ok"), { tilt: 3 })),
  templeTap: ((t) => pose(REST, arm(-10, 0.35, 165 + Math.abs(Math.sin(t * 7)) * 6, 25, "point"), { tilt: -4 })) as Gesture,
  fingerWag: ((t) => pose(REST, arm(22, 0.8, 150, Math.sin(t * 11) * 18, "point"), { tilt: -3 })) as Gesture,
  weigh: ((t) =>
    // "On one hand… on the other": both palms up, bobbing in turn.
    pose(arm(22, 0.8, -138 + Math.sin(t * 3.5) * 12, -8, "open"), arm(30, 0.78, -138 - Math.sin(t * 3.5) * 12, -8, "open"), { tilt: Math.sin(t * 3.5) * 3 })) as Gesture,
  together: still(pose(arm(8, 0.8, 115, 0, "fist"), arm(8, 0.8, 115, 0, "fist"), { lean: 1.5 })),
  shrug: still(pose(arm(40, 0.9, 55, -45, "open"), arm(40, 0.9, 55, -45, "open"), { tilt: 5, shrug: 1.6 })),
  listen: still(pose(arm(-4, 0.9, 60, 10, "fist"), arm(-4, 0.9, 60, 10, "fist"), { tilt: 5, lean: 1.5 })),
  thinkChin: ((t) => pose(arm(-12, 0.75, 92, 0, "fist"), arm(-25, 0.55, 145, 20 + Math.sin(t * 2.2) * 6, "fist"), { tilt: -4, lookUp: 3, turn: 3 })) as Gesture,
  wave: ((t) => pose(REST, arm(35, 0.75, -145 + Math.sin(t * 10) * 14, 0, "open"), { tilt: 4 })) as Gesture,
  hairTuck: still(pose(arm(-10, 0.35, 165, 25, "open"), REST, { tilt: 5 })),
  chinStroke: ((t) => pose(REST, arm(-25, 0.55, 145, 20 + Math.sin(t * 6) * 10, "fist"), { tilt: -2, lookUp: 1 })) as Gesture,
};

/* ---------------- Words and sentences (English, Hindi, Tamil, Telugu) ---------------- */

const PRAISE =
  /\b(great|awesome|excellent|well done|perfect|brilliant|nice|super|fantastic|amazing|correct|nailed)\b|बहुत बढ़िया|शाबाश|बढ़िया|शानदार|सही|कमाल|சூப்பர்|அருமை|சரி|நன்று|அற்புதம்|பிரமாதம்|అద్భుతం|చాలా బాగుంది|సరైన|బాగుంది|శభాష్|సూపర్/i;
const CAREFUL = /\b(careful|but|however|remember|note|watch out|don't forget|trap|mistake|avoid)\b|ध्यान|लेकिन|याद रखें|सावधान|परंतु|गलती|கவனம்|ஆனால்|நினைவில்|தவறு|జాగ్రత్త|కానీ|గుర్తుంచుకో|గమనించండి|పొరపాటు/i;
const TIP = /\b(tip|shortcut|trick|secret|hack|quick way)\b|शॉर्टकट|ट्रिक|टिप|तरकीब|குறுக்குவழி|டிப்ஸ்|உத்தி|ரகசியம்|షార్ట్‌కట్|చిట్కా|ట్రిక్|రహస్యం/i;
const JOIN = /\b(add|plus|sum|together|combine|total)\b|जोड़|मिलाकर|कुल|கூட்டு|சேர்த்து|மொத்தம்|కలిపి|కూడిక|మొత్తం/i;
const SPLIT = /\b(divide|split|share|minus|subtract|difference|compare|versus)\b|भाग|घटा|अंतर|तुलना|வகு|கழி|வேறுபாடு|ஒப்பிடு|భాగించు|తీసివేయ|తేడా|పోల్చు/i;
const EMPATHY = /\b(don't worry|no worries|it's okay|happens|tricky|tough)\b|चिंता मत|कोई बात नहीं|கவலைப்பட வேண்டாம்|பரவாயில்லை|చింతించకండి|పర్వాలేదు/i;

const ORDINALS: [RegExp, number][] = [
  [/^\s*(1[.)]|first\b|step 1|पहला|पहले|सबसे पहले|முதல்|முதலில்|మొదట|మొదటి)/i, 1],
  [/^\s*(2[.)]|second\b|step 2|दूसरा|இரண்டாவது|రెండవ)/i, 2],
  [/^\s*(3[.)]|third\b|step 3|तीसरा|மூன்றாவது|మూడవ)/i, 3],
  [/^\s*(4[.)]|fourth\b|step 4|चौथा|நான்காவது|నాలుగవ)/i, 4],
  [/^\s*(5[.)]|fifth\b|step 5|पाँचवाँ|ஐந்தாவது|ఐదవ)/i, 5],
];

const NUMBER_WORDS: Record<string, number> = {
  "1": 1, one: 1, एक: 1, ஒன்று: 1, ఒకటి: 1,
  "2": 2, two: 2, दो: 2, இரண்டு: 2, రెండు: 2,
  "3": 3, three: 3, तीन: 3, மூன்று: 3, మూడు: 3,
  "4": 4, four: 4, चार: 4, நான்கு: 4, నాలుగు: 4,
  "5": 5, five: 5, पाँच: 5, पांच: 5, ஐந்து: 5, ఐదు: 5,
};
const NEGATION = /^(not|no|never|wrong|incorrect|isn't|don't|can't|nope|नहीं|गलत|இல்லை|வேண்டாம்|தவறு|కాదు|లేదు|తప్పు)$/i;
const PRAISE_WORD = /^(great|awesome|perfect|brilliant|super|amazing|excellent|शाबाश|बढ़िया|சூப்பர்|அருமை|అద్భుతం|సూపర్|శభాష్)$/i;

type Cue = { expr: Expression; gesture: Gesture; wink?: boolean; bounce?: boolean };

const EMOTION_CUE: Record<Emotion, Cue> = {
  excited: { expr: "excited", gesture: G.jazzHands, bounce: true },
  proud: { expr: "proud", gesture: G.thumbs },
  encouraging: { expr: "encouraging", gesture: G.ok },
  curious: { expr: "curious", gesture: G.present },
  careful: { expr: "careful", gesture: G.fingerWag },
  empathetic: { expr: "empathetic", gesture: G.chest },
  playful: { expr: "playful", gesture: G.palmRaise, wink: true },
  thinking: { expr: "thinking", gesture: G.thinkChin },
  neutral: { expr: "neutral", gesture: G.present },
};

const EXPLAIN_CYCLE: Gesture[] = [G.present, G.palmRaise, G.chest, G.pointUp, G.weigh];
const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

/** Chooses the body language for one sentence from its emotion tag and its words. */
export function cueForSentence(sentence: string, emotion: string | null, cycle: number): Cue {
  const text = sentence.trim();
  const tagged = emotion && emotion in EMOTION_CUE ? EMOTION_CUE[emotion as Emotion] : null;

  for (const [pattern, n] of ORDINALS) if (pattern.test(text)) return { expr: tagged?.expr ?? "encouraging", gesture: G.count(n) };
  if (PRAISE.test(text)) return { expr: tagged?.expr ?? pick<Expression>(["proud", "excited", "happy"]), gesture: pick([G.clap, G.thumbs, G.fistPump]), bounce: true };
  if (TIP.test(text)) return { expr: "playful", gesture: G.templeTap, wink: true };
  if (CAREFUL.test(text)) return { expr: tagged?.expr ?? "careful", gesture: pick([G.fingerWag, G.palmRaise]) };
  if (EMPATHY.test(text)) return { expr: "empathetic", gesture: G.chest };
  if (JOIN.test(text)) return { expr: tagged?.expr ?? "encouraging", gesture: G.together };
  if (SPLIT.test(text)) return { expr: tagged?.expr ?? "curious", gesture: G.weigh };
  if (tagged) return tagged;
  if (/[?？]\s*$/.test(text)) return { expr: "curious", gesture: G.present };
  if (/!\s*$/.test(text)) return { expr: "excited", gesture: pick([G.jazzHands, G.fistPump]), bounce: true };
  return { expr: "happy", gesture: EXPLAIN_CYCLE[cycle % EXPLAIN_CYCLE.length] };
}

/* ---------------- Text-driven lip-sync ---------------- */

const LABIAL = /[mbpपबमफभபமపబమఫభ]/i;
const VOWEL_A = /[aआाअஆாఆా]/i;
const VOWEL_O = /[oओोஓோఓో]/i;
const VOWEL_U = /[uwqउऊुूஉஊுூఉఊుూ]/i;
const VOWEL_E = /[eएेஎஏெேఎఏెే]/i;
const VOWEL_I = /[iyइईिीஇஈிீఇఈిీ]/i;
const FRICATIVE = /[fvफ]/i;
const SIBILANT = /[szcxसशषஸஶషసశ]/i;
const TONGUE = /[ltdnrतदनलटडणதநலடணరతదనలటడణ]/i;

/** Splits a spoken word into a sequence of mouth shapes, roughly one per sound. */
export function mouthTrack(word: string): MouthKey[] {
  const text = word.normalize("NFC").replace(/[^\p{L}\p{M}\d]/gu, "");
  const track: MouthKey[] = [];
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    const ch = text[i];
    let key: MouthKey | null = null;
    let step = 1;
    if (/^(ch|sh)/i.test(rest)) {
      key = "CH";
      step = 2;
    } else if (/^j/i.test(rest)) key = "CH";
    else if (/^th/i.test(rest)) {
      key = "L";
      step = 2;
    } else if (LABIAL.test(ch)) key = "MBP";
    else if (FRICATIVE.test(ch)) key = "FV";
    else if (VOWEL_O.test(ch)) key = "O";
    else if (VOWEL_U.test(ch)) key = "U";
    else if (VOWEL_E.test(ch)) key = "E";
    else if (VOWEL_I.test(ch)) key = "I";
    else if (VOWEL_A.test(ch)) key = "A";
    else if (SIBILANT.test(ch)) key = "S";
    else if (TONGUE.test(ch)) key = "L";
    else if (/\d/.test(ch)) key = "A";
    else if (/\p{L}/u.test(ch)) key = /[a-z]/i.test(ch) ? "E" : "A";
    if (key && track[track.length - 1] !== key) track.push(key);
    i += step;
  }
  return track.length ? track : ["A"];
}

const FALLBACK_CYCLE: MouthKey[] = ["A", "L", "E", "MBP", "O", "S", "A", "I", "rest", "U", "E", "L"];

/* ---------------- The rig ---------------- */

const damp = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt));

type ArmState = { s: number; f: number; e: number; w: number; hand: HandShape };
type Action = { gesture: Gesture; expr: Expression; start: number; until: number; mouth?: MouthKey };

export type RigInput = {
  gender: TutorGender;
  speaking: boolean;
  mood: Mood;
  word: string;
  wordTick: number;
  sentence: string;
  sentenceTick: number;
  emotion: string | null;
  /** Where the viewer's pointer is relative to the tutor, -1..1 per axis, or null when idle. */
  pointer: { x: number; y: number } | null;
  reducedMotion: boolean;
};

export class TutorRig {
  l: ArmState = { ...REST };
  r: ArmState = { ...REST };
  tilt = 0;
  lookUp = 0;
  turn = 0;
  shrug = 0;
  lean = 0;
  breathe = 0;
  sway = 0;
  bounce = 0;
  nod = 0;
  blink = 0;
  wink = 0;
  gazeX = 0;
  gazeY = 0;
  face: Face = { ...EXPRESSIONS.neutral };
  mouth: MouthParams = { ...MOUTHS.rest };

  private time = 0;
  private turnBase = 0;
  private bounceV = 0;
  private beat = 0;
  private browPop = 0;
  private shake = 0;
  private winkUntil = -1;
  private sentenceCue: Cue | null = null;
  private sentenceStart = 0;
  private sentenceCount = 0;
  private wordAction: Action | null = null;
  private moodAction: Action | null;
  private idleAction: Action | null = null;
  private idleAt = 7;
  private lastWord: number;
  private lastSentence: number;
  private lastMood: Mood = "neutral";
  private blinkAt = 1.6;
  private doubleBlink = false;
  private saccadeAt = 0.8;
  private saccade = { x: 0, y: 0 };
  private track: MouthKey[] = [];
  private trackStart = 0;
  private trackStep = 0.075;
  private lastWordAt = -10;

  constructor(wordTick: number, sentenceTick: number) {
    this.lastWord = wordTick;
    this.lastSentence = sentenceTick;
    // Every tutor says hello with a wave when it first appears.
    this.moodAction = { gesture: G.wave, expr: "excited", start: 0, until: 2.3, mouth: "GRIN" };
  }

  private impulseBounce(strength = 90) {
    this.bounceV = -strength;
  }

  step(dt: number, input: RigInput) {
    const t = (this.time += dt);
    const calm = input.reducedMotion;

    /* --- sentence cues --- */
    if (input.sentenceTick !== this.lastSentence) {
      this.lastSentence = input.sentenceTick;
      this.sentenceCue = cueForSentence(input.sentence, input.emotion, this.sentenceCount++);
      this.sentenceStart = t;
      if (this.sentenceCue.wink && !calm) this.winkUntil = t + 0.45;
      if (this.sentenceCue.bounce && !calm) this.impulseBounce(70);
    }

    /* --- word cues and the lip-sync track --- */
    if (input.wordTick !== this.lastWord) {
      this.lastWord = input.wordTick;
      this.lastWordAt = t;
      this.beat = 1;
      this.track = mouthTrack(input.word);
      this.trackStart = t;
      this.trackStep = Math.min(0.11, Math.max(0.055, (input.word.length * 0.072) / Math.max(1, this.track.length)));
      const clean = input.word.replace(/[^\p{L}\p{M}\d']/gu, "").toLowerCase();
      const count = NUMBER_WORDS[clean];
      if (count) this.wordAction = { gesture: G.count(count), expr: "encouraging", start: t, until: t + 1.1 };
      else if (NEGATION.test(clean) && !calm) this.shake = 1;
      else if (PRAISE_WORD.test(clean)) {
        this.browPop = 1;
        if (!calm) this.impulseBounce(45);
      } else if (Math.random() < 0.18) this.browPop = 1;
    }
    if (this.wordAction && t > this.wordAction.until) this.wordAction = null;

    /* --- mood reactions --- */
    if (input.mood !== this.lastMood) {
      this.lastMood = input.mood;
      if (input.mood === "happy") {
        // Celebrate: a clap and jazz hands with a laugh, then a proud thumbs-up.
        this.moodAction = { gesture: (s) => (s < 0.8 ? G.clap(s) : G.jazzHands(s)), expr: "laugh", start: t, until: t + 1.7, mouth: "GRIN" };
        if (!calm) this.impulseBounce(110);
      } else if (input.mood === "concerned") {
        // A playful "oops" shrug, then open, encouraging hands.
        this.moodAction = { gesture: G.shrug, expr: "oops", start: t, until: t + 1.2 };
      } else if (input.mood !== "neutral") {
        this.moodAction = null;
      }
    }
    if (this.moodAction && t > this.moodAction.until) this.moodAction = null;

    /* --- idle life --- */
    const idle = !input.speaking && input.mood === "neutral" && !this.moodAction && !calm;
    if (idle && t > this.idleAt && !this.idleAction) {
      const tuck = input.gender === "female" ? G.hairTuck : G.chinStroke;
      const choice = pick([
        { gesture: G.rest, expr: "happy" as Expression, length: 1.8 },
        { gesture: tuck, expr: "playful" as Expression, length: 1.6 },
        { gesture: G.rest, expr: "curious" as Expression, length: 1.5 },
        { gesture: G.present, expr: "encouraging" as Expression, length: 1.4 },
      ]);
      this.idleAction = { gesture: choice.gesture, expr: choice.expr, start: t, until: t + choice.length };
      if (choice.expr === "playful") this.winkUntil = t + 0.4;
      if (choice.expr === "curious") this.saccade = { x: pick([-0.8, 0.8]), y: -0.3 };
    }
    if (this.idleAction && (t > this.idleAction.until || !idle)) {
      this.idleAction = null;
      this.idleAt = t + 6 + Math.random() * 6;
    }

    /* --- choose the target pose and face --- */
    const moodBase: Record<Mood, [Gesture, Expression]> = {
      neutral: [G.rest, "neutral"],
      happy: [G.thumbs, "proud"],
      thinking: [G.thinkChin, "thinking"],
      listening: [G.listen, "listening"],
      concerned: [G.present, "encouraging"],
    };
    let gesture: Gesture;
    let expr: Expression;
    let gestureStart = 0;
    let mouthOverride: MouthKey | undefined;

    if (input.speaking && this.wordAction) {
      gesture = this.wordAction.gesture;
      gestureStart = this.wordAction.start;
      expr = this.sentenceCue?.expr ?? this.wordAction.expr;
    } else if (input.speaking && this.sentenceCue) {
      gesture = this.sentenceCue.gesture;
      expr = this.sentenceCue.expr;
      gestureStart = this.sentenceStart;
    } else if (input.speaking) {
      gesture = G.present;
      expr = "happy";
    } else if (this.moodAction) {
      gesture = this.moodAction.gesture;
      expr = this.moodAction.expr;
      gestureStart = this.moodAction.start;
      mouthOverride = this.moodAction.mouth;
    } else if (this.idleAction) {
      gesture = this.idleAction.gesture;
      expr = this.idleAction.expr;
      gestureStart = this.idleAction.start;
    } else {
      [gesture, expr] = moodBase[input.mood];
    }
    if (calm && gesture === G.wave) gesture = G.rest;

    const target = gesture(t - gestureStart);
    const snappy = gesture === G.wave || gesture === G.fingerWag || gesture === G.fistPump || gesture === G.jazzHands || this.moodAction?.expr === "laugh";
    const armRate = snappy ? 16 : 8;
    for (const side of ["l", "r"] as const) {
      const cur = this[side];
      const goal = target[side];
      cur.s = damp(cur.s, goal.s, armRate, dt);
      cur.f = damp(cur.f, goal.f, armRate, dt);
      cur.e = damp(cur.e, goal.e + (input.speaking ? this.beat * 8 : 0), snappy ? 24 : armRate, dt);
      cur.w = damp(cur.w, goal.w, snappy ? 22 : armRate, dt);
      // Swap hand shapes once the arm is most of the way there, so they don't pop mid-swing.
      if (Math.abs(cur.e - goal.e) < 35) cur.hand = goal.hand;
    }

    // Listening includes gentle periodic nods; a "no" word shakes the head.
    const listeningNod = input.mood === "listening" && !input.speaking && !calm ? Math.max(0, Math.sin(t * 3.4)) * 1.6 : 0;
    this.shake = damp(this.shake, 0, 3.2, dt);
    const shakeTurn = calm ? 0 : Math.sin(t * 17) * this.shake * 5;

    this.tilt = damp(this.tilt, target.tilt, 5, dt);
    this.lookUp = damp(this.lookUp, target.lookUp, 5, dt);
    this.turnBase = damp(this.turnBase, target.turn, 5, dt);
    this.turn = this.turnBase + shakeTurn;
    this.shrug = damp(this.shrug, target.shrug, 7, dt);
    this.lean = damp(this.lean, target.lean, 4, dt);

    /* --- life: breathing, sway, bounce, beats --- */
    this.breathe = calm ? 0 : Math.sin(t * 1.7);
    this.sway = calm ? 0 : Math.sin(t * 0.55) * 0.7 + Math.sin(t * 1.3) * 0.25;
    this.bounceV += (-this.bounce * 260 - this.bounceV * 13) * dt;
    this.bounce += this.bounceV * dt;
    this.beat = damp(this.beat, 0, 8, dt);
    this.browPop = damp(this.browPop, 0, 6, dt);
    this.nod = (input.speaking && !calm ? this.beat * 2.4 : 0) + listeningNod;

    /* --- blinking (with the occasional double blink) and winks --- */
    if (t > this.blinkAt + 0.15) {
      this.blinkAt = t + (this.doubleBlink ? 0.18 : 1.8 + Math.random() * 3.6);
      this.doubleBlink = !this.doubleBlink && Math.random() < 0.18;
    }
    const closing = t > this.blinkAt && t < this.blinkAt + 0.15;
    this.blink = damp(this.blink, closing ? 1 : 0, closing ? 60 : 30, dt);
    this.wink = damp(this.wink, t < this.winkUntil ? 1 : 0, 26, dt);

    /* --- gaze: follow the pointer, otherwise natural saccades --- */
    if (t > this.saccadeAt) {
      this.saccadeAt = t + 0.9 + Math.random() * 2.6;
      this.saccade = input.speaking || calm ? { x: (Math.random() - 0.5) * 0.3, y: (Math.random() - 0.5) * 0.2 } : { x: (Math.random() - 0.5) * 0.9, y: (Math.random() - 0.5) * 0.5 };
    }
    let gx = this.saccade.x;
    let gy = this.saccade.y;
    if (expr === "thinking") {
      gx = 0.7;
      gy = -0.8;
    } else if (input.pointer && !input.speaking && !this.idleAction) {
      gx = input.pointer.x;
      gy = input.pointer.y;
    }
    this.gazeX = damp(this.gazeX, gx, 18, dt);
    this.gazeY = damp(this.gazeY, gy, 18, dt);

    /* --- face --- */
    const goal = EXPRESSIONS[expr];
    const softer = input.speaking ? 0.55 : 1;
    this.face.smile = damp(this.face.smile, input.speaking ? 0.2 + goal.smile * 0.5 : goal.smile, 6, dt);
    this.face.squint = damp(this.face.squint, goal.squint * softer, 7, dt);
    this.face.browRaise = damp(this.face.browRaise, goal.browRaise + this.browPop * 3, 9, dt);
    this.face.browInner = damp(this.face.browInner, goal.browInner, 7, dt);
    this.face.browAsym = damp(this.face.browAsym, goal.browAsym, 7, dt);
    this.face.mouthShift = damp(this.face.mouthShift, input.speaking ? 0 : goal.mouthShift, 6, dt);
    this.face.eyeWide = damp(this.face.eyeWide, goal.eyeWide, 8, dt);

    /* --- mouth --- */
    let key: MouthKey = "rest";
    if (input.speaking) {
      const index = Math.floor((t - this.trackStart) / this.trackStep);
      if (index < this.track.length) key = this.track[index];
      else if (t - this.lastWordAt > 0.6) key = FALLBACK_CYCLE[Math.floor(t / 0.105) % FALLBACK_CYCLE.length];
    } else if (expr === "laugh") key = Math.sin(t * 14) > 0 ? "A" : "GRIN";
    else if (mouthOverride) key = mouthOverride;
    else if (expr === "excited" || expr === "happy" || expr === "proud") key = "GRIN";
    else if (expr === "oops") key = "O";
    const goalMouth = MOUTHS[key];
    const rate = input.speaking || expr === "laugh" ? 28 : 12;
    this.mouth.w = damp(this.mouth.w, goalMouth.w, rate, dt);
    this.mouth.open = damp(this.mouth.open, goalMouth.open, rate, dt);
    this.mouth.round = damp(this.mouth.round, goalMouth.round, rate, dt);
    this.mouth.teeth = damp(this.mouth.teeth, goalMouth.teeth, rate, dt);
    this.mouth.bite = damp(this.mouth.bite, goalMouth.bite, rate, dt);
  }
}

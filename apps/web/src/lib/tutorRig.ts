import type { TutorGender } from "./tutor";

/*
 * Animation "brain" for the 2D tutor, in the spirit of Duolingo's character rigs:
 * a small state machine (idle, greeting, talking gestures, mood reactions) whose
 * targets are blended with critically damped springs, plus text-driven lip-sync,
 * blinking, eye saccades, breathing and word-beat emphasis. It is renderer-agnostic:
 * TutorFigure reads the numbers each frame and moves the SVG parts.
 */

export type Mood = "neutral" | "happy" | "thinking" | "listening" | "concerned";
export type HandShape = "open" | "fist" | "point" | "thumb";

/** Mouth shapes (visemes). Parameters are blended, so transitions between them are smooth morphs. */
export type MouthKey = "rest" | "MBP" | "A" | "E" | "I" | "O" | "U" | "FV" | "L" | "S" | "CH";
export type MouthParams = { w: number; open: number; round: number; teeth: number; bite: number };

export const MOUTHS: Record<MouthKey, MouthParams> = {
  rest: { w: 1, open: 0, round: 0, teeth: 0, bite: 0 },
  MBP: { w: 0.92, open: 0, round: 0.1, teeth: 0, bite: 0 },
  A: { w: 1.05, open: 1, round: 0, teeth: 0.5, bite: 0 },
  E: { w: 1.22, open: 0.5, round: 0, teeth: 0.8, bite: 0 },
  I: { w: 1.3, open: 0.28, round: 0, teeth: 1, bite: 0 },
  O: { w: 0.78, open: 0.78, round: 0.85, teeth: 0.2, bite: 0 },
  U: { w: 0.62, open: 0.32, round: 1, teeth: 0, bite: 0 },
  FV: { w: 1.02, open: 0.18, round: 0, teeth: 1, bite: 1 },
  L: { w: 1.05, open: 0.45, round: 0, teeth: 0.75, bite: 0 },
  S: { w: 1.15, open: 0.14, round: 0, teeth: 1, bite: 0 },
  CH: { w: 0.82, open: 0.34, round: 0.55, teeth: 0.85, bite: 0 },
};

/** One arm, described from arms hanging at the side. Degrees. */
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

export type Face = { smile: number; squint: number; browRaise: number; browInner: number; mouthShift: number };

const arm = (s: number, f: number, e: number, w: number, hand: HandShape): ArmPose => ({ s, f, e, w, hand });

const REST = arm(5, 1, 8, 0, "open");
const pose = (l: ArmPose, r: ArmPose, extra: Partial<Omit<BodyPose, "l" | "r">> = {}): BodyPose => ({
  l,
  r,
  tilt: 0,
  lookUp: 0,
  turn: 0,
  shrug: 0,
  lean: 0,
  ...extra,
});

/** Explaining gestures, cycled one per spoken sentence. */
const GESTURES: BodyPose[] = [
  // Presenting with both open palms
  pose(arm(18, 0.85, 112, -10, "open"), arm(18, 0.85, 112, -10, "open"), { lean: 1 }),
  // Index finger raised: "the key idea is..."
  pose(REST, arm(22, 0.8, 150, 0, "point"), { tilt: -2, lookUp: -1 }),
  // Open palm raised beside the shoulder: "look at it this way"
  pose(arm(20, 0.8, -150, 0, "open"), REST, { tilt: 3, turn: -2 }),
  // Hand on chest, sincere
  pose(arm(-8, 0.7, 125, 10, "open"), arm(24, 0.9, 70, -25, "open"), { tilt: 2 }),
  // Counting on fingers
  pose(arm(10, 0.8, 105, -5, "open"), arm(14, 0.8, 120, 0, "point"), { lean: 1, lookUp: 1 }),
];

const MOOD_POSES: Record<Mood, BodyPose> = {
  neutral: pose(REST, REST),
  happy: pose(REST, arm(28, 0.7, 160, 10, "thumb"), { tilt: 3 }),
  thinking: pose(arm(-12, 0.75, 92, 0, "fist"), arm(-25, 0.55, 145, 20, "fist"), { tilt: -4, lookUp: 3, turn: 3 }),
  listening: pose(arm(-4, 0.9, 60, 10, "fist"), arm(-4, 0.9, 60, 10, "fist"), { tilt: 5, lean: 1.5 }),
  concerned: pose(arm(30, 0.9, 70, -30, "open"), arm(30, 0.9, 70, -30, "open"), { tilt: 4, shrug: 1 }),
};

const MOOD_FACES: Record<Mood, Face> = {
  neutral: { smile: 0.25, squint: 0, browRaise: 0, browInner: 0, mouthShift: 0 },
  happy: { smile: 0.95, squint: 0.35, browRaise: 2, browInner: 0, mouthShift: 0 },
  thinking: { smile: -0.05, squint: 0.1, browRaise: 1, browInner: -5, mouthShift: 4 },
  listening: { smile: 0.35, squint: 0, browRaise: 2.5, browInner: 3, mouthShift: 0 },
  concerned: { smile: -0.45, squint: 0, browRaise: 1.5, browInner: 9, mouthShift: 0 },
};

/* ---------------- Text-driven lip-sync ---------------- */

const LABIAL = /[mbpपबमफभপবমফভਪਬਮਫਭપબમફભபமపబమఫభಪಬಮಫಭപബമഫഭپبم]/i;
const VOWEL_A = /[aआाअআাਆਾઆાஆாఆాಆಾആാآا]/i;
const VOWEL_O = /[oओोোওਓੋઓોஓோఓోಓೋഓോو]/i;
const VOWEL_U = /[uwqउऊुूউঊুূਉਊੁੂઉઊુૂஉஊுூఉఊుూಉಊುೂഉഊുൂ]/i;
const VOWEL_E = /[eएेএেਏੇએેஎஏெேఎఏెేಎಏೆೇഎഏെേ]/i;
const VOWEL_I = /[iyइईिीইঈিীਇਈਿੀઇઈિીஇஈிீఇఈిీಇಈಿೀഇഈിീی]/i;
const FRICATIVE = /[fvफ]/i;
const SIBILANT = /[szcxसशषসশষਸਸ਼સશષஸஶషసశಸಶಷസശഷسش]/i;
const TONGUE = /[ltdnrतदनलटडणরতদনলটডণਤਦਨਲਟਡਣતદનલટડણதநலடணరతదనలటడణತದನಲಟಡಣതദനലടഡണتدنلر]/i;
const DIGRAPH_CH = /^(ch|sh|j)/i;

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
    if (DIGRAPH_CH.test(rest)) {
      key = "CH";
      step = rest[0].toLowerCase() === "j" ? 1 : 2;
    } else if (/^th/i.test(rest)) {
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
    else if (/\p{L}/u.test(ch)) {
      // Other consonants (and Indic consonants with an inherent "a") open the jaw slightly.
      key = /[a-z]/i.test(ch) ? "E" : "A";
    }
    if (key && track[track.length - 1] !== key) track.push(key);
    i += step;
  }
  return track.length ? track : ["A"];
}

const FALLBACK_CYCLE: MouthKey[] = ["A", "L", "E", "MBP", "O", "S", "A", "I", "rest", "U", "E", "L"];

/* ---------------- Spring helpers ---------------- */

const damp = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt));

type ArmState = { s: number; f: number; e: number; w: number; hand: HandShape };

export type RigInput = {
  gender: TutorGender;
  speaking: boolean;
  mood: Mood;
  wordTick: number;
  word: string;
  gestureTick: number;
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
  gazeX = 0;
  gazeY = 0;
  face: Face = { ...MOOD_FACES.neutral };
  mouth: MouthParams = { ...MOUTHS.rest };

  private time = 0;
  private born = 0;
  private bounceV = 0;
  private beat = 0;
  private browPop = 0;
  private gesture = 0;
  private lastWord: number;
  private lastGesture: number;
  private lastMood: Mood = "neutral";
  private blinkAt = 1.6;
  private doubleBlink = false;
  private saccadeAt = 0.8;
  private saccade = { x: 0, y: 0 };
  private track: MouthKey[] = [];
  private trackStart = 0;
  private trackStep = 0.075;
  private lastWordAt = -10;

  constructor(wordTick: number, gestureTick: number) {
    this.lastWord = wordTick;
    this.lastGesture = gestureTick;
  }

  step(dt: number, input: RigInput) {
    const t = (this.time += dt);
    const calm = input.reducedMotion;

    /* --- events --- */
    if (input.wordTick !== this.lastWord) {
      this.lastWord = input.wordTick;
      this.lastWordAt = t;
      this.beat = 1;
      this.track = mouthTrack(input.word);
      this.trackStart = t;
      // Spread the sounds over a natural word length (browser voices speak ~13 characters per second).
      this.trackStep = Math.min(0.11, Math.max(0.055, (input.word.length * 0.072) / Math.max(1, this.track.length)));
      if (Math.random() < 0.22) this.browPop = 1;
    }
    if (input.gestureTick !== this.lastGesture) {
      this.lastGesture = input.gestureTick;
      this.gesture = (this.gesture + 1 + Math.floor(Math.random() * (GESTURES.length - 1))) % GESTURES.length;
    }
    if (input.mood !== this.lastMood) {
      if (input.mood === "happy" && !calm) this.bounceV = -95;
      this.lastMood = input.mood;
    }

    /* --- choose the target pose --- */
    const greeting = !calm && !input.speaking && t - this.born < 2.4 && input.mood !== "thinking";
    let target: BodyPose = input.speaking ? GESTURES[this.gesture] : MOOD_POSES[input.mood];
    if (greeting) {
      target = { ...MOOD_POSES.neutral, r: arm(35, 0.75, -145 + Math.sin(t * 10) * 14, 0, "open"), tilt: 4 };
    }

    const armRate = greeting ? 16 : 7;
    for (const side of ["l", "r"] as const) {
      const cur = this[side];
      const goal = target[side];
      cur.s = damp(cur.s, goal.s, armRate, dt);
      cur.f = damp(cur.f, goal.f, armRate, dt);
      cur.e = damp(cur.e, goal.e + (input.speaking ? this.beat * 9 : 0), greeting ? 26 : armRate, dt);
      cur.w = damp(cur.w, goal.w, armRate, dt);
      // Swap hand shapes once the arm is most of the way there, so they don't pop mid-swing.
      if (Math.abs(cur.e - goal.e) < 30) cur.hand = goal.hand;
    }

    this.tilt = damp(this.tilt, target.tilt, 5, dt);
    this.lookUp = damp(this.lookUp, target.lookUp, 5, dt);
    this.turn = damp(this.turn, target.turn, 5, dt);
    this.shrug = damp(this.shrug, target.shrug, 6, dt);
    this.lean = damp(this.lean, target.lean, 4, dt);

    /* --- life: breathing, sway, bounce, beats --- */
    this.breathe = calm ? 0 : Math.sin(t * 1.7);
    this.sway = calm ? 0 : Math.sin(t * 0.55) * 0.7 + Math.sin(t * 1.3) * 0.25;
    this.bounceV += (-this.bounce * 260 - this.bounceV * 14) * dt;
    this.bounce += this.bounceV * dt;
    this.beat = damp(this.beat, 0, 8, dt);
    this.browPop = damp(this.browPop, 0, 6, dt);
    this.nod = input.speaking && !calm ? this.beat * 2.2 : damp(this.nod, 0, 6, dt);

    /* --- blinking (with the occasional double blink) --- */
    if (t > this.blinkAt + 0.15) {
      this.blinkAt = t + (this.doubleBlink ? 0.18 : 1.8 + Math.random() * 3.6);
      this.doubleBlink = !this.doubleBlink && Math.random() < 0.18;
    }
    const closing = t > this.blinkAt && t < this.blinkAt + 0.15;
    this.blink = damp(this.blink, closing ? 1 : 0, closing ? 60 : 30, dt);

    /* --- gaze: follow the pointer, otherwise small natural saccades --- */
    if (t > this.saccadeAt) {
      this.saccadeAt = t + 0.9 + Math.random() * 2.6;
      this.saccade = input.speaking || calm ? { x: (Math.random() - 0.5) * 0.3, y: (Math.random() - 0.5) * 0.2 } : { x: (Math.random() - 0.5) * 0.9, y: (Math.random() - 0.5) * 0.5 };
    }
    let gx = this.saccade.x;
    let gy = this.saccade.y;
    if (input.mood === "thinking" && !input.speaking) {
      gx = 0.7;
      gy = -0.8;
    } else if (input.pointer && !input.speaking) {
      gx = input.pointer.x;
      gy = input.pointer.y;
    }
    this.gazeX = damp(this.gazeX, gx, 18, dt);
    this.gazeY = damp(this.gazeY, gy, 18, dt);

    /* --- face --- */
    const moodFace = MOOD_FACES[input.mood];
    const speakingFace: Face = { ...moodFace, smile: 0.2 + moodFace.smile * 0.45, squint: moodFace.squint * 0.5, mouthShift: 0 };
    const goalFace = input.speaking ? speakingFace : greeting ? MOOD_FACES.happy : moodFace;
    this.face.smile = damp(this.face.smile, goalFace.smile, 6, dt);
    this.face.squint = damp(this.face.squint, goalFace.squint, 6, dt);
    this.face.browRaise = damp(this.face.browRaise, goalFace.browRaise + this.browPop * 3, 9, dt);
    this.face.browInner = damp(this.face.browInner, goalFace.browInner, 6, dt);
    this.face.mouthShift = damp(this.face.mouthShift, goalFace.mouthShift, 6, dt);

    /* --- mouth --- */
    let key: MouthKey = "rest";
    if (input.speaking) {
      const index = Math.floor((t - this.trackStart) / this.trackStep);
      if (index < this.track.length) key = this.track[index];
      else if (t - this.lastWordAt > 0.6) {
        // Some voices never report word boundaries: fall back to a natural talking rhythm.
        key = FALLBACK_CYCLE[Math.floor(t / 0.105) % FALLBACK_CYCLE.length];
      }
    } else if (greeting) key = "E";
    const goalMouth = MOUTHS[key];
    const rate = input.speaking ? 28 : 12;
    this.mouth.w = damp(this.mouth.w, goalMouth.w, rate, dt);
    this.mouth.open = damp(this.mouth.open, goalMouth.open, rate, dt);
    this.mouth.round = damp(this.mouth.round, goalMouth.round, rate, dt);
    this.mouth.teeth = damp(this.mouth.teeth, goalMouth.teeth, rate, dt);
    this.mouth.bite = damp(this.mouth.bite, goalMouth.bite, rate, dt);
  }
}

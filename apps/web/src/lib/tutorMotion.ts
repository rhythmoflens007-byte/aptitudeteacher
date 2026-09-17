import { MathUtils } from "three";
import type { Mood } from "@/components/Avatar";
import type { Viseme } from "./speech";
import type { TutorGender } from "./tutor";

// Poses are renderer-independent. Arm "a" is the tutor's left arm (viewer's right), "b" the right arm.
// Angles in radians, measured from arms hanging at the sides:
//   sx: swing (negative = forward)   sz: raise away from the body   ex: elbow bend (negative = forward)
//   ez: forearm towards the body     wx: wrist flex                 wy: palm twist
export type Hand = "relaxed" | "open" | "point" | "fist" | "thumb";
export type Arm = { sx: number; sz: number; ex: number; ez: number; wx: number; wy: number; hand: Hand };
export type Pose = { a: Arm; b: Arm; lean: number; tilt: number; lookUp: number; shrug: number };

export const FINGERS: Record<Hand, { index: number; others: number; thumb: number }> = {
  relaxed: { index: 0.45, others: 0.65, thumb: 0.35 },
  open: { index: 0.05, others: 0.1, thumb: 0.05 },
  point: { index: 0, others: 1.75, thumb: 1.1 },
  fist: { index: 1.75, others: 1.75, thumb: 1.1 },
  thumb: { index: 1.75, others: 1.75, thumb: -0.25 },
};

export const MOUTH: Record<Viseme, [number, number]> = {
  rest: [1, 0],
  open: [1, 0.95],
  wide: [1.35, 0.45],
  round: [0.7, 0.8],
};

const arm = (sx: number, sz: number, ex: number, ez: number, hand: Hand, wx = 0, wy = 0): Arm => ({ sx, sz, ex, ez, wx, wy, hand });

const REST = arm(0.04, 0.1, -0.12, 0.05, "relaxed");
const AKIMBO = arm(0.25, 0.68, -0.15, 1.85, "relaxed", 0.25);
const POCKET = arm(0.15, 0.2, -0.35, 0.4, "fist");

function idle(gender: TutorGender): Pose {
  return gender === "female"
    ? { a: REST, b: AKIMBO, lean: 0, tilt: 0.03, lookUp: 0, shrug: 0 }
    : { a: POCKET, b: REST, lean: 0, tilt: -0.02, lookUp: 0, shrug: 0 };
}

const EXPLAIN: ((gender: TutorGender) => Pose)[] = [
  // Both palms open, presenting the idea
  () => ({ a: arm(-0.75, 0.55, -1.0, 0.1, "open", -0.3, 1.1), b: arm(-0.75, 0.55, -1.0, 0.1, "open", -0.3, 1.1), lean: 0.05, tilt: 0, lookUp: 0, shrug: 0 }),
  // Index finger up: "first..."
  (g) => ({ a: arm(-0.35, 0.5, -2.0, 0.1, "point"), b: g === "female" ? AKIMBO : arm(-0.25, 0.15, -0.9, 0.6, "relaxed"), lean: 0.02, tilt: -0.05, lookUp: 0.04, shrug: 0 }),
  // Sweeping open hand to the side
  (g) => ({ a: idle(g).a, b: arm(-0.95, 0.9, -0.45, 0, "open", -0.2, -1.0), lean: 0.03, tilt: 0.06, lookUp: 0, shrug: 0 }),
  // Hand to chest, other hand open
  () => ({ a: arm(-0.45, 0.05, -1.95, 0.85, "open", 0.2), b: arm(-0.45, 0.65, -0.8, 0, "open", 0, -0.8), lean: 0.04, tilt: 0.04, lookUp: 0, shrug: 0 }),
  // Counting on the fingers
  () => ({ a: arm(-0.7, 0.45, -1.45, 0.3, "point"), b: arm(-0.7, 0.45, -1.3, 0.45, "open", 0, 0.8), lean: 0.06, tilt: -0.03, lookUp: -0.03, shrug: 0 }),
];

function moodPose(mood: Mood, gender: TutorGender): Pose {
  switch (mood) {
    case "thinking":
      return { a: arm(-0.95, 0.12, -2.35, 0.45, "fist", 0.3), b: arm(-0.35, 0.05, -1.45, 1.05, "relaxed"), lean: -0.02, tilt: -0.1, lookUp: 0.14, shrug: 0 };
    case "listening":
      return { a: arm(-0.35, 0.05, -1.15, 0.95, "relaxed"), b: arm(-0.35, 0.05, -1.15, 0.95, "relaxed"), lean: 0.07, tilt: 0.1, lookUp: 0, shrug: 0 };
    case "happy":
      return { ...idle(gender), a: arm(-0.35, 0.45, -1.95, 0.1, "thumb") };
    case "concerned":
      return { a: arm(-0.4, 0.55, -1.25, -0.3, "open", -0.4, 1.3), b: arm(-0.4, 0.55, -1.25, -0.3, "open", -0.4, 1.3), lean: 0.03, tilt: 0.09, lookUp: 0, shrug: 0.06 };
    default:
      return idle(gender);
  }
}

export type ArmState = { sx: number; sz: number; ex: number; ez: number; wx: number; wy: number; index: number; others: number; thumb: number };

export type MotionInput = {
  gender: TutorGender;
  speaking: boolean;
  viseme: Viseme;
  wordTick: number;
  gestureTick: number;
  mood: Mood;
};

/** Frame-by-frame body language shared by every tutor renderer: gestures, beats, blinks and mouth shapes. */
export class TutorMotion {
  arms: ArmState[] = [0, 1].map(() => ({ sx: 0, sz: 0.1, ex: -0.1, ez: 0, wx: 0, wy: 0, index: 0.4, others: 0.6, thumb: 0.3 }));
  lean = 0;
  tilt = 0;
  lookUp = 0;
  shrug = 0;
  beat = 0;
  blink = 0;
  mouthW = 1;
  mouthH = 0;
  sway = 0;
  private born = -1;
  private blinkAt = 2.5;
  private gesture = 0;
  private lastWord: number;
  private lastGesture: number;

  constructor(wordTick: number, gestureTick: number) {
    this.lastWord = wordTick;
    this.lastGesture = gestureTick;
  }

  step(t: number, delta: number, input: MotionInput, reducedMotion: boolean) {
    const damp = MathUtils.damp;
    if (this.born < 0) this.born = t;

    if (input.wordTick !== this.lastWord) {
      this.lastWord = input.wordTick;
      this.beat = 1;
    }
    this.beat = damp(this.beat, 0, 7, delta);
    if (input.gestureTick !== this.lastGesture) {
      this.lastGesture = input.gestureTick;
      this.gesture = (this.gesture + 1 + Math.floor(Math.random() * (EXPLAIN.length - 1))) % EXPLAIN.length;
    }

    const waving = t - this.born < 2.6 && !input.speaking;
    let pose = input.speaking ? EXPLAIN[this.gesture](input.gender) : moodPose(input.mood, input.gender);
    if (waving) pose = { ...idle(input.gender), a: arm(-0.15, 2.55, -0.35, Math.sin(t * 9) * 0.35, "open", 0, -0.3), tilt: 0.08 };

    [pose.a, pose.b].forEach((target, i) => {
      const cur = this.arms[i];
      const rate = waving && i === 0 ? 14 : 6;
      cur.sx = damp(cur.sx, target.sx, rate, delta);
      cur.sz = damp(cur.sz, target.sz, rate, delta);
      cur.ex = damp(cur.ex, target.ex + (input.speaking ? -0.16 * this.beat : 0), rate, delta);
      cur.ez = damp(cur.ez, target.ez, waving && i === 0 ? 20 : rate, delta);
      cur.wx = damp(cur.wx, target.wx, rate, delta);
      cur.wy = damp(cur.wy, target.wy, rate, delta);
      const f = FINGERS[target.hand];
      cur.index = damp(cur.index, f.index, 10, delta);
      cur.others = damp(cur.others, f.others, 10, delta);
      cur.thumb = damp(cur.thumb, f.thumb, 10, delta);
    });

    this.lean = damp(this.lean, pose.lean, 4, delta);
    this.tilt = damp(this.tilt, pose.tilt, 4, delta);
    this.lookUp = damp(this.lookUp, pose.lookUp, 4, delta);
    this.shrug = damp(this.shrug, pose.shrug, 5, delta);
    this.sway = reducedMotion ? 0 : Math.sin(t * 0.8);

    if (t > this.blinkAt + 0.14) this.blinkAt = t + 2 + Math.random() * 3.5;
    this.blink = damp(this.blink, t > this.blinkAt && t < this.blinkAt + 0.14 ? 1 : 0, 45, delta);

    let [w, h] = MOUTH.rest;
    if (input.speaking) {
      if (this.beat > 0.35) [w, h] = MOUTH[input.viseme];
      else {
        const syllable = Math.abs(Math.sin(t * 11)) * (0.55 + 0.45 * Math.sin(t * 3.7));
        w = 1 + syllable * 0.15;
        h = 0.1 + syllable * 0.6;
      }
    }
    this.mouthW = damp(this.mouthW, w, 22, delta);
    this.mouthH = damp(this.mouthH, h, 22, delta);
  }
}

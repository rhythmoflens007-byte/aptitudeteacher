"use client";

import { useEffect, useId, useRef } from "react";
import type { TutorGender } from "@/lib/tutor";
import { HandShape, Mood, MouthParams, TutorRig } from "@/lib/tutorRig";

export type Framing = "full" | "portrait";

type Props = {
  gender: TutorGender;
  speaking: boolean;
  mood: Mood;
  word: string;
  wordTick: number;
  sentence: string;
  sentenceTick: number;
  emotion: string | null;
  framing: Framing;
  className?: string;
};

/* Waist-up illustration on a 360 × 440 canvas; the head is centred on x = 180. */
const VIEWBOX: Record<Framing, string> = { full: "40 50 280 350", portrait: "90 58 180 204" };

const PALETTE = {
  // Asha: Iris blazer over a Coral top, gold earrings.
  female: {
    skin: "#b8795a",
    skinShade: "#9a5f45",
    skinLight: "#cb9070",
    lips: "#a23f45",
    hair: "#1c1411",
    hairLight: "#3d2c25",
    top: "#5b5bf5",
    topShade: "#4643d6",
    lapel: "#7473ff",
    inner: "#ff6b5c",
    innerShade: "#e2503f",
    cuff: "#ff6b5c",
    accent: "#ffc53d",
    brow: 2.6,
  },
  // Arjun: Lagoon sweater over a white collared shirt, glasses.
  male: {
    skin: "#a36a4b",
    skinShade: "#86533a",
    skinLight: "#b67e5e",
    lips: "#8a4238",
    hair: "#15100e",
    hairLight: "#32271f",
    top: "#16c2c2",
    topShade: "#0f9fa0",
    lapel: "#3fd3d3",
    inner: "#ffffff",
    innerShade: "#dde3ea",
    cuff: "#ffffff",
    accent: "#ffc53d",
    brow: 4.2,
  },
};

const INK = "#1a0f10";
const EYE_L = { x: 162, y: 154 };
const EYE_R = { x: 198, y: 154 };
const MOUTH = { x: 180, y: 197 };
const SHOULDER_L = { x: 126, y: 278 };
const SHOULDER_R = { x: 234, y: 278 };
const UPPER = 88;
const FOREARM = 72;
const HAND_SHAPES: HandShape[] = ["open", "fist", "point", "two", "three", "four", "thumb", "ok"];

function mouthPath(m: MouthParams, smile: number, shift: number) {
  const cx = MOUTH.x + shift;
  const cy = MOUTH.y;
  const hw = 12.5 * m.w * (1 - 0.3 * m.round) * (1 + Math.max(0, smile) * 0.08);
  const corner = cy - smile * 3.4;
  const upper = cy - 0.8 - m.open * 1.6 + smile * 2.6 - m.round * 1.4;
  const lower = cy - 0.3 + (m.bite ? m.open * 4 : m.open * 13) + smile * 3.6 + m.round * 2.2;
  return {
    d: `M${cx - hw} ${corner} C${cx - hw * 0.5} ${upper - 1.2} ${cx + hw * 0.5} ${upper - 1.2} ${cx + hw} ${corner} C${cx + hw * 0.62} ${lower} ${cx - hw * 0.62} ${lower} ${cx - hw} ${corner} Z`,
    cx,
    hw,
    upper,
    lower,
  };
}

function Finger({ x, length, fill, shade }: { x: number; length: number; fill: string; shade: string }) {
  return <rect x={x} y="14" width="5.6" height={length} rx="2.8" fill={fill} stroke={shade} strokeWidth="1" />;
}

function Hand({ shape, fill, shade }: { shape: HandShape; fill: string; shade: string }) {
  const fist = <path d="M-11 -2 C-13 12 -12 22 -6 26 C0 29 8 27 11 20 C13 12 12 4 11 -2 Z" fill={fill} stroke={shade} strokeWidth="1" />;
  if (shape === "fist")
    return (
      <g>
        {fist}
        <path d="M-7 14 Q0 17 7 14" stroke={shade} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </g>
    );
  if (shape === "point" || shape === "two" || shape === "three" || shape === "four") {
    const count = { point: 1, two: 2, three: 3, four: 4 }[shape];
    const fingers = [
      { x: -5.8, length: 30 },
      { x: 0.2, length: 28 },
      { x: -11.8, length: 24 },
      { x: 5.7, length: 22 },
    ].slice(0, count);
    return (
      <g>
        {fingers.map((item) => (
          <Finger key={item.x} x={item.x} length={item.length} fill={fill} shade={shade} />
        ))}
        {fist}
      </g>
    );
  }
  if (shape === "thumb")
    return (
      <g>
        {fist}
        <rect x="5" y="6" width="9" height="32" rx="4.5" fill={fill} stroke={shade} strokeWidth="1" />
        <path d="M-8 12 Q-2 14 4 12 M-8 18 Q-2 20 4 18" stroke={shade} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </g>
    );
  if (shape === "ok")
    return (
      <g>
        <Finger x={-3.5} length={26} fill={fill} shade={shade} />
        <Finger x={2.5} length={28} fill={fill} shade={shade} />
        <Finger x={8} length={22} fill={fill} shade={shade} />
        {fist}
        <circle cx="-8" cy="22" r="5.5" fill="none" stroke={fill} strokeWidth="4" />
        <circle cx="-8" cy="22" r="5.5" fill="none" stroke={shade} strokeWidth="1" />
      </g>
    );
  return (
    <g stroke={shade} strokeWidth="1">
      <rect x="-4.5" y="-2" width="6" height="18" rx="3" fill={fill} transform="translate(-9 8) rotate(28)" />
      <rect x="-10.5" y="18" width="5.2" height="16" rx="2.6" fill={fill} />
      <rect x="-5" y="20" width="5.2" height="19" rx="2.6" fill={fill} />
      <rect x="0.5" y="20" width="5.2" height="18" rx="2.6" fill={fill} />
      <rect x="5.8" y="18" width="4.8" height="14" rx="2.4" fill={fill} />
      <path d="M-11 -2 C-12 8 -12 18 -10 24 L10 24 C12 18 12 8 11 -2 Z" fill={fill} />
    </g>
  );
}

type ArmRefs = {
  group: React.RefObject<SVGGElement | null>;
  upper: React.RefObject<SVGGElement | null>;
  elbow: React.RefObject<SVGGElement | null>;
  hand: React.RefObject<SVGGElement | null>;
  hands: React.RefObject<Partial<Record<HandShape, SVGGElement | null>>>;
};

function Arm({
  side,
  colors,
  groupRef,
  upperRef,
  elbowRef,
  handRef,
  handRefs,
}: {
  side: "l" | "r";
  colors: (typeof PALETTE)["female"];
  groupRef: ArmRefs["group"];
  upperRef: ArmRefs["upper"];
  elbowRef: ArmRefs["elbow"];
  handRef: ArmRefs["hand"];
  handRefs: ArmRefs["hands"];
}) {
  const shoulder = side === "l" ? SHOULDER_L : SHOULDER_R;
  return (
    <g ref={groupRef} transform={`translate(${shoulder.x} ${shoulder.y})`}>
      <g ref={upperRef}>
        <path d="M-18 -4 C-18 -18 18 -18 18 -4 L16 88 C16 97 -16 97 -16 88 Z" fill={colors.top} stroke={colors.topShade} strokeWidth="1.5" />
        <path d={side === "l" ? "M-15 6 L-13 84" : "M15 6 L13 84"} stroke={colors.topShade} strokeWidth="5" strokeLinecap="round" opacity="0.6" />
      </g>
      <g ref={elbowRef} transform={`translate(0 ${UPPER})`}>
        <circle r="15.5" fill={colors.top} />
        <path d="M-15 -4 L15 -4 L13 66 L-13 66 Z" fill={colors.top} stroke={colors.topShade} strokeWidth="1.5" />
        <rect x="-13.5" y="60" width="27" height="10" rx="3" fill={colors.cuff} stroke={colors.innerShade} strokeWidth="1" />
        <g ref={handRef} transform={`translate(0 ${FOREARM})`}>
          <g transform={side === "r" ? "scale(-1.2 1.2)" : "scale(1.2)"}>
            {HAND_SHAPES.map((shape) => (
              <g
                key={shape}
                ref={(el) => {
                  handRefs.current[shape] = el;
                }}
                style={{ display: shape === "open" ? undefined : "none" }}
              >
                <Hand shape={shape} fill={colors.skin} shade={colors.skinShade} />
              </g>
            ))}
          </g>
        </g>
      </g>
    </g>
  );
}

/**
 * The 2D tutor: a layered vector illustration moved by TutorRig every animation frame.
 * Transforms are written straight to the SVG nodes, so animating never re-renders React.
 */
export default function TutorFigure({ gender, speaking, mood, word, wordTick, sentence, sentenceTick, emotion, framing, className = "" }: Props) {
  const c = PALETTE[gender];
  const female = gender === "female";
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const svg = useRef<SVGSVGElement>(null);
  const body = useRef<SVGGElement>(null);
  const torso = useRef<SVGGElement>(null);
  const headBack = useRef<SVGGElement>(null);
  const head = useRef<SVGGElement>(null);
  const eyeL = useRef<SVGGElement>(null);
  const eyeR = useRef<SVGGElement>(null);
  const irisL = useRef<SVGGElement>(null);
  const irisR = useRef<SVGGElement>(null);
  const browL = useRef<SVGPathElement>(null);
  const browR = useRef<SVGPathElement>(null);
  const mouth = useRef<SVGPathElement>(null);
  const mouthClip = useRef<SVGPathElement>(null);
  const teeth = useRef<SVGRectElement>(null);
  const tongue = useRef<SVGEllipseElement>(null);
  const cheeks = useRef<SVGGElement>(null);
  const armLGroup = useRef<SVGGElement>(null);
  const armLUpper = useRef<SVGGElement>(null);
  const armLElbow = useRef<SVGGElement>(null);
  const armLHand = useRef<SVGGElement>(null);
  const armLHands = useRef<Partial<Record<HandShape, SVGGElement | null>>>({});
  const armRGroup = useRef<SVGGElement>(null);
  const armRUpper = useRef<SVGGElement>(null);
  const armRElbow = useRef<SVGGElement>(null);
  const armRHand = useRef<SVGGElement>(null);
  const armRHands = useRef<Partial<Record<HandShape, SVGGElement | null>>>({});

  // Latest props, read by the animation loop without restarting it.
  const input = useRef({ gender, speaking, mood, word, wordTick, sentence, sentenceTick, emotion });
  useEffect(() => {
    input.current = { gender, speaking, mood, word, wordTick, sentence, sentenceTick, emotion };
  }, [gender, speaking, mood, word, wordTick, sentence, sentenceTick, emotion]);

  useEffect(() => {
    const root = svg.current;
    if (!root) return;
    const rig = new TutorRig(input.current.wordTick, input.current.sentenceTick);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const shownHand: Record<"l" | "r", HandShape> = { l: "open", r: "open" };
    const arms: Record<"l" | "r", ArmRefs> = {
      l: { group: armLGroup, upper: armLUpper, elbow: armLElbow, hand: armLHand, hands: armLHands },
      r: { group: armRGroup, upper: armRUpper, elbow: armRElbow, hand: armRHand, hands: armRHands },
    };
    let pointer: { x: number; y: number } | null = null;
    let pointerAt = 0;
    let visible = true;
    let frame = 0;
    let last = performance.now();
    const f2 = (n: number) => n.toFixed(2);

    const onPointer = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      const x = (e.clientX - (rect.left + rect.width / 2)) / Math.max(320, window.innerWidth / 2);
      const y = (e.clientY - (rect.top + rect.height * 0.3)) / Math.max(320, window.innerHeight / 2);
      pointer = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
      pointerAt = performance.now();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    });
    observer.observe(root);

    function draw() {
      const f = input.current;
      const shrugY = -rig.shrug * 5 - rig.breathe * 0.6;
      body.current?.setAttribute("transform", `translate(0 ${f2(rig.breathe * 0.5 + rig.bounce)}) rotate(${f2(rig.sway + rig.lean)} 180 440)`);
      torso.current?.setAttribute("transform", `translate(0 ${f2(shrugY)})`);
      const headT = `translate(${f2(rig.turn * 0.9)} ${f2(-rig.lookUp + rig.nod + shrugY * 0.4)}) rotate(${f2(rig.tilt)} 180 226)`;
      head.current?.setAttribute("transform", headT);
      headBack.current?.setAttribute("transform", headT);

      const wide = 1 + rig.face.eyeWide;
      const openR = Math.max(0.08, 1 - rig.blink * 0.92 - rig.face.squint * 0.3) * wide;
      const openL = Math.max(0.06, openR - rig.wink * 0.95 * wide);
      eyeL.current?.setAttribute("transform", `translate(${EYE_L.x} ${EYE_L.y}) scale(${f2(wide)} ${openL.toFixed(3)})`);
      eyeR.current?.setAttribute("transform", `translate(${EYE_R.x} ${EYE_R.y}) scale(${f2(wide)} ${openR.toFixed(3)})`);
      const iris = `translate(${f2(rig.gazeX * 4.2 + rig.turn * 0.4)} ${f2(rig.gazeY * 2.2 - rig.lookUp * 0.5)})`;
      irisL.current?.setAttribute("transform", iris);
      irisR.current?.setAttribute("transform", iris);

      const raise = -rig.face.browRaise;
      const thinkingLift = f.mood === "thinking" && !f.speaking ? -2.5 : 0;
      browL.current?.setAttribute("transform", `translate(${EYE_L.x} ${f2(140 + raise + rig.wink * 2)}) rotate(${f2(-rig.face.browInner)})`);
      browR.current?.setAttribute("transform", `translate(${EYE_R.x} ${f2(140 + raise - rig.face.browAsym + thinkingLift)}) rotate(${f2(rig.face.browInner - rig.face.browAsym * 1.2)})`);

      const m = mouthPath(rig.mouth, rig.face.smile, rig.face.mouthShift);
      mouth.current?.setAttribute("d", m.d);
      mouthClip.current?.setAttribute("d", m.d);
      teeth.current?.setAttribute("x", f2(m.cx - m.hw));
      teeth.current?.setAttribute("width", f2(m.hw * 2));
      teeth.current?.setAttribute("y", f2(m.upper - 3));
      teeth.current?.setAttribute("height", f2(Math.max(0, 2.5 + rig.mouth.teeth * 4.5 + rig.mouth.bite * 2)));
      tongue.current?.setAttribute("cx", f2(m.cx));
      tongue.current?.setAttribute("cy", f2(m.lower - 1));
      tongue.current?.setAttribute("rx", f2(m.hw * 0.55));
      tongue.current?.setAttribute("opacity", Math.min(1, rig.mouth.open * 1.4).toFixed(2));
      cheeks.current?.setAttribute("opacity", (0.14 + Math.max(0, rig.face.smile) * 0.2).toFixed(3));

      for (const side of ["l", "r"] as const) {
        const a = rig[side];
        const refs = arms[side];
        const dir = side === "l" ? 1 : -1;
        const shoulder = side === "l" ? SHOULDER_L : SHOULDER_R;
        refs.group.current?.setAttribute("transform", `translate(${shoulder.x} ${f2(shoulder.y + shrugY)}) rotate(${f2(dir * a.s)})`);
        refs.upper.current?.setAttribute("transform", `scale(1 ${a.f.toFixed(3)})`);
        refs.elbow.current?.setAttribute("transform", `translate(0 ${f2(UPPER * a.f)}) rotate(${f2(-dir * a.e)})`);
        refs.hand.current?.setAttribute("transform", `translate(0 ${FOREARM}) rotate(${f2(-dir * a.w)})`);
        if (shownHand[side] !== a.hand) {
          const hands = refs.hands.current;
          const previous = hands[shownHand[side]];
          const next = hands[a.hand];
          if (previous) previous.style.display = "none";
          if (next) next.style.display = "";
          shownHand[side] = a.hand;
        }
      }
    }

    function tick(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      rig.step(dt, { ...input.current, pointer: pointer && now - pointerAt < 3500 ? pointer : null, reducedMotion: reduce.matches });
      draw();
      frame = visible && !document.hidden ? requestAnimationFrame(tick) : 0;
    }

    const onVisibility = () => {
      if (!document.hidden && visible && !frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // The loop reads refs only, so it starts exactly once per mount.
  }, []);

  const eye = (ref: React.RefObject<SVGGElement | null>, irisRef: React.RefObject<SVGGElement | null>, id: string, pos: { x: number; y: number }, mirror: boolean) => (
    <g ref={ref} transform={`translate(${pos.x} ${pos.y})`}>
      <clipPath id={id}>
        <path d="M-11 0 C-6 -6.8 6 -6.8 11 -0.6 C6 5 -6 5.2 -11 0 Z" />
      </clipPath>
      <path d="M-11 0 C-6 -6.8 6 -6.8 11 -0.6 C6 5 -6 5.2 -11 0 Z" fill="#f8f4ef" />
      <g clipPath={`url(#${id})`}>
        <g ref={irisRef}>
          <circle r="5.1" fill={female ? "#4a2e1d" : "#3a2619"} />
          <circle r="2.4" fill={INK} />
          <circle cx="-1.6" cy="-1.8" r="1.4" fill="#fff" opacity="0.95" />
          <circle cx="1.8" cy="1.4" r="0.7" fill="#fff" opacity="0.6" />
        </g>
        <path d="M-12 -7 L12 -7 L12 -2.5 C6 -5 -6 -5 -12 -1.5 Z" fill={c.skinShade} opacity="0.3" />
      </g>
      <path d="M-12 0.4 C-6 -7.6 6 -7.6 12 -0.6" stroke={INK} strokeWidth={female ? 2.4 : 2} fill="none" strokeLinecap="round" />
      {female && <path d={mirror ? "M-11.5 -0.5 L-14.5 -3.5" : "M11.5 -0.8 L14.5 -3.8"} stroke={INK} strokeWidth="1.8" strokeLinecap="round" />}
      <path d="M-10 -8 C-4 -12.5 5 -12.5 10 -8.5" stroke={c.skinShade} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M-8.5 4 C-3 6.5 3 6.5 8.5 3.8" stroke={c.skinShade} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6" />
    </g>
  );

  const label = speaking
    ? "Your tutor is explaining"
    : mood === "thinking"
      ? "Your tutor is thinking"
      : mood === "listening"
        ? "Your tutor is listening"
        : mood === "happy"
          ? "Your tutor is celebrating"
          : "Your tutor";

  return (
    <svg ref={svg} viewBox={VIEWBOX[framing]} className={`h-full w-full ${className}`} role="img" aria-label={label}>
      <defs>
        <clipPath id={`${uid}-mouth`}>
          <path ref={mouthClip} d={mouthPath({ w: 1, open: 0, round: 0, teeth: 0, bite: 0 }, 0.3, 0).d} />
        </clipPath>
      </defs>

      <g ref={body}>
        {/* Hair behind the head */}
        <g ref={headBack}>
          {female ? (
            <>
              <path d="M134 158 C128 102 150 82 180 82 C210 82 232 102 226 158 C224 174 220 184 214 190 L146 190 C140 184 136 174 134 158 Z" fill={c.hair} />
              <ellipse cx="198" cy="78" rx="22" ry="17" fill={c.hair} />
              <path d="M184 70 C192 62 206 62 214 70" stroke={c.hairLight} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8" />
              <path d="M177 86 C186 80 204 80 214 86" stroke={c.accent} strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <path d="M138 150 C134 110 152 88 180 88 C208 88 226 110 222 150 Z" fill={c.hair} />
          )}
        </g>

        {/* Neck */}
        <path d="M163 190 L197 190 L197 246 L180 280 L163 246 Z" fill={c.skin} />
        <path d="M163 204 Q180 232 197 204 L197 224 Q180 244 163 224 Z" fill={c.skinShade} opacity="0.7" />

        {/* Torso */}
        <g ref={torso}>
          <g transform="translate(0 -14)">
            {female ? (
              <>
                <path d="M152 262 L166 258 L180 294 L194 258 L208 262 L218 470 L142 470 Z" fill={c.inner} />
                <path d="M166 258 L180 294 L194 258" stroke={c.innerShade} strokeWidth="2" fill="none" strokeLinejoin="round" />
                <path d="M167 262 Q180 286 193 262" stroke={c.accent} strokeWidth="1.6" fill="none" />
                <circle cx="180" cy="283" r="3" fill={c.accent} />
                <path d="M92 470 L99 318 C101 290 118 274 146 266 L166 257 L180 336 L194 257 L214 266 C242 274 259 290 261 318 L268 470 Z" fill={c.top} />
                <path d="M99 318 C101 298 110 286 124 278 L126 470 L92 470 Z" fill={c.topShade} />
                <path d="M261 318 C259 298 250 286 236 278 L234 470 L268 470 Z" fill={c.topShade} />
                <path d="M166 257 L180 336 L171 344 L147 298 L155 283 L145 272 Z" fill={c.lapel} />
                <path d="M194 257 L180 336 L189 344 L213 298 L205 283 L215 272 Z" fill={c.lapel} />
                <circle cx="180" cy="376" r="3.6" fill={c.topShade} />
                <path d="M204 400 L238 398" stroke={c.topShade} strokeWidth="2" strokeLinecap="round" />
                <path d="M206 306 l5 -9 l5 9 l-5 9 z" fill={c.accent} />
              </>
            ) : (
              <>
                {/* Shirt with collar, under a V-neck sweater */}
                <path d="M156 250 L204 250 L214 470 L146 470 Z" fill={c.inner} />
                <path d="M164 250 L180 272 L168 284 L152 262 Z" fill={c.innerShade} />
                <path d="M196 250 L180 272 L192 284 L208 262 Z" fill={c.innerShade} />
                <path d="M165 252 L180 270 L167 280 L156 262 Z" fill={c.inner} />
                <path d="M195 252 L180 270 L193 280 L204 262 Z" fill={c.inner} />
                <path d="M92 470 L99 318 C101 290 118 272 150 264 L180 322 L210 264 C242 272 259 290 261 318 L268 470 Z" fill={c.top} />
                <path d="M150 264 L180 322 L210 264 L216 267 L180 336 L144 267 Z" fill={c.lapel} />
                <path d="M99 318 C101 298 110 286 124 278 L126 470 L92 470 Z" fill={c.topShade} />
                <path d="M261 318 C259 298 250 286 236 278 L234 470 L268 470 Z" fill={c.topShade} />
                <path d="M120 360 C150 370 210 370 240 360 M118 380 C150 390 210 390 242 380" stroke={c.topShade} strokeWidth="2" fill="none" opacity="0.45" />
                <path d="M216 300 l5 -9 l5 9 l-5 9 z" fill={c.accent} />
              </>
            )}
          </g>
        </g>

        {/* Head */}
        <g ref={head}>
          <ellipse cx="137" cy="158" rx="7.5" ry="12.5" fill={c.skin} />
          <ellipse cx="223" cy="158" rx="7.5" ry="12.5" fill={c.skin} />
          <path d="M136 158 Q139 152 141 160" stroke={c.skinShade} strokeWidth="1.6" fill="none" />
          <path d="M224 158 Q221 152 219 160" stroke={c.skinShade} strokeWidth="1.6" fill="none" />
          <path d="M138 146 C138 108 156 94 180 94 C204 94 222 108 222 146 C222 176 214 196 202 208 C194 216 187 221 180 221 C173 221 166 216 158 208 C146 196 138 176 138 146 Z" fill={c.skin} />
          <path d="M217 124 C223 142 223 164 217 184 C211 200 201 212 188 219 C202 202 212 180 213 156 C214 142 215 132 217 124 Z" fill={c.skinShade} opacity="0.3" />
          <path d="M150 126 C156 116 166 110 176 110" stroke={c.skinLight} strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.35" />

          {female ? (
            <>
              <path d="M137 150 C133 106 152 84 184 84 C214 84 231 106 225 146 C219 124 206 108 186 105 C167 104 158 116 149 128 C144 135 140 142 137 150 Z" fill={c.hair} />
              <path d="M160 94 C176 88 198 90 212 104" stroke={c.hairLight} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
              <path d="M140 138 C140 150 139 166 142 176" stroke={c.hair} strokeWidth="5" fill="none" strokeLinecap="round" />
              <circle cx="137" cy="173" r="3.2" fill={c.accent} />
              <circle cx="223" cy="173" r="3.2" fill={c.accent} />
              <circle cx="180" cy="134" r="2" fill={c.inner} />
            </>
          ) : (
            <>
              <path d="M136 144 C130 102 150 78 182 78 C214 78 232 98 226 140 C224 126 216 112 204 106 C188 99 170 102 162 110 C156 103 147 107 142 116 C138 124 137 134 136 144 Z" fill={c.hair} />
              <path d="M164 90 C180 84 200 86 214 98" stroke={c.hairLight} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
              <path d="M138 138 L144 138 L143 162 L139 160 Z" fill={c.hair} />
              <path d="M222 138 L216 138 L217 162 L221 160 Z" fill={c.hair} />
              <path d="M140 166 C142 190 156 212 172 221 C176 223 184 223 188 221 C204 212 218 190 220 166 C216 188 206 205 192 210 C186 206 174 206 168 210 C154 205 144 188 140 166 Z" fill={c.hair} opacity="0.3" />
              <path d="M166 188 C172 183.5 178 185.5 180 186.5 C182 185.5 188 183.5 194 188 C190 191.5 184 191 180 190 C176 191 170 191.5 166 188 Z" fill={c.hair} opacity="0.6" />
            </>
          )}

          <g ref={cheeks} opacity="0.18">
            <ellipse cx="151" cy="178" rx="9.5" ry="5.5" fill="#ff6b5c" />
            <ellipse cx="209" cy="178" rx="9.5" ry="5.5" fill="#ff6b5c" />
          </g>

          <path d="M181 158 C179 170 175 178 173 182 C176 187 184 187.5 188 184" stroke={c.skinShade} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M175 185 Q180 188 186 185" stroke={c.skinShade} strokeWidth="1.2" fill="none" opacity="0.6" />

          {eye(eyeL, irisL, `${uid}-eyeL`, EYE_L, true)}
          {eye(eyeR, irisR, `${uid}-eyeR`, EYE_R, false)}

          <path ref={browL} d="M-13 3 C-6 -3.5 5 -4.5 13 -0.5" transform={`translate(${EYE_L.x} 140)`} stroke={c.hair} strokeWidth={c.brow} fill="none" strokeLinecap="round" />
          <path ref={browR} d="M-13 -0.5 C-5 -4.5 6 -3.5 13 3" transform={`translate(${EYE_R.x} 140)`} stroke={c.hair} strokeWidth={c.brow} fill="none" strokeLinecap="round" />

          {!female && (
            <g stroke="#23232b" strokeWidth="2.4" fill="rgb(255 255 255 / 0.08)">
              <rect x="147" y="143" width="30" height="22" rx="9" />
              <rect x="183" y="143" width="30" height="22" rx="9" />
              <path d="M177 152 Q180 149 183 152" fill="none" />
              <path d="M147 151 L139 149 M213 151 L221 149" fill="none" />
            </g>
          )}

          {/* Mouth */}
          <path ref={mouth} d={mouthPath({ w: 1, open: 0, round: 0, teeth: 0, bite: 0 }, 0.3, 0).d} fill="#3a1418" stroke={c.lips} strokeWidth="2.6" strokeLinejoin="round" />
          <g clipPath={`url(#${uid}-mouth)`}>
            <rect ref={teeth} x="167" y="193" width="26" height="3" rx="1.5" fill="#f6f2ec" />
            <ellipse ref={tongue} cx="180" cy="200" rx="7" ry="4" fill="#d9636a" opacity="0" />
          </g>
        </g>

        {/* Arms */}
        <Arm side="l" colors={c} groupRef={armLGroup} upperRef={armLUpper} elbowRef={armLElbow} handRef={armLHand} handRefs={armLHands} />
        <Arm side="r" colors={c} groupRef={armRGroup} upperRef={armRUpper} elbowRef={armRElbow} handRef={armRHand} handRefs={armRHands} />
      </g>
    </svg>
  );
}

"use client";

import { Canvas, ThreeElements, useFrame, useThree } from "@react-three/fiber";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Viseme } from "@/lib/speech";
import type { TutorGender } from "@/lib/tutor";
import { TutorMotion } from "@/lib/tutorMotion";
import type { Mood } from "./Avatar";
import TutorVRM from "./TutorVRM";

export type Framing = "full" | "portrait";

export type Tutor3DProps = {
  gender: TutorGender;
  speaking: boolean;
  viseme: Viseme;
  wordTick: number;
  gestureTick: number;
  mood: Mood;
  framing: Framing;
};

// ---------------------------------------------------------------------------------------------
// Proportions (world units, ground at y = 0, character faces +z towards the camera)
// ---------------------------------------------------------------------------------------------
const HIP_Y = 1.55;
const SPINE = 1.22;
const SHOULDER = { x: 0.5, y: 1.1 };
const UPPER_ARM = 0.58;
const FOREARM = 0.54;
const THIGH = 0.78;
const SHIN = 0.72;

const LOOK: Record<TutorGender, Record<string, string>> = {
  female: {
    skin: "#e2a37e",
    hair: "#2e1b14",
    top: "#e3a52b",
    trousers: "#efe5cf",
    shoes: "#7c1f3a",
    accent: "#8c2447",
    lips: "#c3313f",
  },
  male: {
    skin: "#d99b74",
    hair: "#1d1512",
    top: "#9cc6e8",
    vest: "#7a2c3b",
    trousers: "#3e4552",
    shoes: "#5a3a22",
    accent: "#2b2b2b",
    lips: "#9a4b42",
  },
};

// ---------------------------------------------------------------------------------------------
// Toon materials, shared geometry and ink outlines
// ---------------------------------------------------------------------------------------------
type Kit = {
  toon: (color: string) => THREE.MeshToonMaterial;
  ink: THREE.MeshBasicMaterial;
  sphere: THREE.SphereGeometry;
  cap: (radius: number, length: number) => THREE.CapsuleGeometry;
  dome: THREE.SphereGeometry;
  torus: THREE.TorusGeometry;
  arc: (radius: number, tube: number) => THREE.TorusGeometry;
  cylinder: (top: number, bottom: number, height: number) => THREE.CylinderGeometry;
};

const KitContext = createContext<Kit | null>(null);

function useKitFactory(): Kit {
  const kit = useMemo(() => {
    const gradient = new THREE.DataTexture(new Uint8Array([95, 95, 95, 255, 185, 185, 185, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
    gradient.minFilter = THREE.NearestFilter;
    gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
    const materials = new Map<string, THREE.MeshToonMaterial>();
    const geometries = new Map<string, THREE.BufferGeometry>();
    const cached = <T extends THREE.BufferGeometry>(key: string, make: () => T) => {
      if (!geometries.has(key)) geometries.set(key, make());
      return geometries.get(key) as T;
    };
    return {
      gradient,
      materials,
      geometries,
      toon: (color: string) => {
        if (!materials.has(color)) materials.set(color, new THREE.MeshToonMaterial({ color, gradientMap: gradient }));
        return materials.get(color)!;
      },
      ink: new THREE.MeshBasicMaterial({ color: "#24170f", side: THREE.BackSide }),
      sphere: cached("sphere", () => new THREE.SphereGeometry(1, 40, 28)),
      torus: cached("torus", () => new THREE.TorusGeometry(0.2, 0.035, 12, 40)),
      dome: cached("dome", () => new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2)),
      cap: (r: number, l: number) => cached(`cap${r}:${l}`, () => new THREE.CapsuleGeometry(r, l, 8, 20)),
      arc: (r: number, t: number) => cached(`arc${r}:${t}`, () => new THREE.TorusGeometry(r, t, 10, 32, Math.PI)),
      cylinder: (top: number, bottom: number, h: number) => cached(`cyl${top}:${bottom}:${h}`, () => new THREE.CylinderGeometry(top, bottom, h, 32)),
    };
  }, []);

  useEffect(
    () => () => {
      kit.gradient.dispose();
      kit.ink.dispose();
      kit.materials.forEach((m) => m.dispose());
      kit.geometries.forEach((g) => g.dispose());
    },
    [kit],
  );
  return kit;
}

type PartProps = Omit<ThreeElements["mesh"], "geometry" | "material"> & { geo: THREE.BufferGeometry; color: string; ink?: number };

/** A toon-shaded mesh with an inverted-hull outline, so every shape reads like an inked cartoon. */
function Part({ geo, color, ink = 0.06, children, ...props }: PartProps) {
  const kit = useContext(KitContext)!;
  return (
    <mesh geometry={geo} material={kit.toon(color)} {...props}>
      {ink > 0 && <mesh geometry={geo} material={kit.ink} scale={1 + ink} />}
      {children}
    </mesh>
  );
}

// ---------------------------------------------------------------------------------------------

const modelChecks = new Map<string, Promise<boolean>>();

/** Custom characters are optional files in public/tutors; the built-in tutor is used when they are absent. */
function modelExists(url: string) {
  if (!modelChecks.has(url)) {
    modelChecks.set(
      url,
      fetch(url, { method: "HEAD" })
        .then((res) => res.ok && !(res.headers.get("content-type") ?? "").includes("text/html"))
        .catch(() => false),
    );
  }
  return modelChecks.get(url)!;
}

export default function Tutor3D(props: Tutor3DProps) {
  const url = `/tutors/${props.gender}.vrm`;
  const [model, setModel] = useState<{ url: string; usable: boolean } | null>(null);
  const onFail = useCallback(() => setModel({ url, usable: false }), [url]);

  useEffect(() => {
    let current = true;
    modelExists(url).then((usable) => current && setModel({ url, usable }));
    return () => {
      current = false;
    };
  }, [url]);

  const ready = model?.url === url;
  return (
    <Canvas dpr={[1, 1.75]} camera={{ fov: 30, position: [0, 2.2, 11.5] }} gl={{ antialias: true, alpha: true, powerPreference: "low-power" }} style={{ background: "transparent" }} aria-hidden>
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 6, 6]} intensity={2.2} />
      <directionalLight position={[-4, 3, -3]} intensity={0.6} color="#ffd9b0" />
      {ready && model.usable && <TutorVRM key={url} url={url} onFail={onFail} {...props} />}
      {ready && !model.usable && (
        <>
          <CameraRig framing={props.framing} />
          <Figure key={props.gender} {...props} />
        </>
      )}
    </Canvas>
  );
}

function CameraRig({ framing }: { framing: Framing }) {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    if (framing === "full") {
      camera.position.set(0, 2.3, 11.8);
      camera.lookAt(0, 2.2, 0);
    } else {
      camera.position.set(0, 3.25, 6.6);
      camera.lookAt(0, 3.05, 0);
    }
    camera.updateProjectionMatrix();
  }, [camera, framing]);
  return null;
}

type ArmRig = { shoulder: THREE.Group | null; elbow: THREE.Group | null; wrist: THREE.Group | null; index: THREE.Group | null; others: THREE.Group[]; thumb: THREE.Group | null };

function Figure({ gender, speaking, viseme, wordTick, gestureTick, mood }: Tutor3DProps) {
  const kit = useKitFactory();
  const c = LOOK[gender];
  const female = gender === "female";

  const root = useRef<THREE.Group>(null);
  const hips = useRef<THREE.Group>(null);
  const spine = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const knees = useRef<(THREE.Group | null)[]>([]);
  const eyes = useRef<(THREE.Group | null)[]>([]);
  const pupils = useRef<(THREE.Group | null)[]>([]);
  const brows = useRef<(THREE.Mesh | null)[]>([]);
  const mouthInner = useRef<THREE.Mesh>(null);
  const smile = useRef<THREE.Mesh>(null);
  const rigs = useRef<ArmRig[]>([0, 1].map(() => ({ shoulder: null, elbow: null, wrist: null, index: null, others: [], thumb: null })));

  const reducedMotion = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  const motion = useRef(new TutorMotion(wordTick, gestureTick));
  const yaw = useRef(0);

  useFrame(({ clock, pointer }, delta) => {
    const t = clock.elapsedTime;
    const m = motion.current;
    const damp = THREE.MathUtils.damp;
    const still = reducedMotion ? 0 : 1;
    m.step(t, delta, { gender, speaking, viseme, wordTick, gestureTick, mood }, reducedMotion);

    m.arms.forEach((cur, i) => {
      const side = i === 0 ? 1 : -1;
      const rig = rigs.current[i];
      rig.shoulder?.rotation.set(cur.sx, 0, side * cur.sz);
      rig.elbow?.rotation.set(cur.ex, 0, -side * cur.ez);
      rig.wrist?.rotation.set(cur.wx, side * cur.wy, 0);
      if (rig.index) rig.index.rotation.z = -side * cur.index;
      for (const finger of rig.others) finger.rotation.z = -side * cur.others;
      if (rig.thumb) rig.thumb.rotation.z = -side * cur.thumb * 0.9;
      if (rig.shoulder) rig.shoulder.position.y = SHOULDER.y + m.shrug;
    });

    // Weight shift and breathing
    const sway = m.sway;
    if (hips.current) {
      hips.current.position.x = sway * 0.035;
      hips.current.rotation.z = sway * 0.025;
    }
    legs.current.forEach((leg, i) => {
      if (leg) leg.rotation.z = -sway * 0.025 + (i === 0 ? -0.02 : 0.02);
    });
    knees.current.forEach((knee, i) => {
      if (knee) knee.rotation.x = (female ? (i === 1 ? 0.2 : 0.02) : 0.04) + Math.max(0, i === 0 ? sway : -sway) * 0.05;
    });
    if (spine.current) {
      spine.current.rotation.set(m.lean + Math.sin(t * 1.5) * 0.01 * still, (speaking ? Math.sin(t * 0.9) * 0.08 : 0) * still, -sway * 0.03);
      spine.current.scale.y = 1 + Math.sin(t * 1.5) * 0.008 * still;
    }

    if (head.current) {
      yaw.current = damp(yaw.current, THREE.MathUtils.clamp(pointer.x, -1, 1) * 0.35 * still + (mood === "thinking" ? 0.2 : 0), 3, delta);
      const nod = speaking ? Math.sin(t * 4.8) * 0.035 * still + m.beat * 0.05 : 0;
      head.current.rotation.set(-m.lookUp - THREE.MathUtils.clamp(pointer.y, -1, 1) * 0.12 * still + nod, yaw.current, m.tilt + Math.sin(t * 0.6) * 0.02 * still);
    }

    for (const eye of eyes.current) if (eye) eye.scale.y = 1 - m.blink * 0.9;
    for (const pupil of pupils.current) {
      if (!pupil) continue;
      pupil.position.x = damp(pupil.position.x, mood === "thinking" ? 0.03 : THREE.MathUtils.clamp(pointer.x, -1, 1) * 0.03, 8, delta);
      pupil.position.y = damp(pupil.position.y, mood === "thinking" ? 0.045 : THREE.MathUtils.clamp(pointer.y, -1, 1) * 0.03, 8, delta);
    }
    const browLift = mood === "thinking" || mood === "listening" ? 0.04 : mood === "happy" ? 0.02 : 0;
    brows.current.forEach((brow, i) => {
      if (!brow) return;
      const side = i === 0 ? 1 : -1;
      const worry = mood === "concerned" ? 0.28 : mood === "thinking" && i === 0 ? -0.2 : 0;
      brow.position.y = damp(brow.position.y, 0.27 + browLift + (speaking ? m.beat * 0.025 : 0), 8, delta);
      brow.rotation.z = damp(brow.rotation.z, Math.PI / 2 + side * worry, 8, delta);
    });

    if (mouthInner.current) {
      mouthInner.current.visible = m.mouthH > 0.04;
      mouthInner.current.scale.set(0.085 * m.mouthW, 0.075 * Math.max(0.01, m.mouthH), 0.04);
    }
    if (smile.current) {
      const closed = Math.max(0, 1 - m.mouthH * 3);
      const curve = mood === "concerned" ? -0.4 : mood === "thinking" ? 0.3 : mood === "happy" ? 1.1 : 0.75;
      smile.current.visible = closed > 0.05;
      smile.current.scale.set(damp(smile.current.scale.x, 1 * closed + 0.001, 14, delta), damp(smile.current.scale.y, curve * closed + 0.001, 14, delta), 1);
    }
    if (root.current) root.current.position.y = Math.sin(t * 1.5) * 0.008 * still;
  });

  const bindArm = (i: number, key: keyof Omit<ArmRig, "others">) => (g: THREE.Group | null) => {
    rigs.current[i][key] = g;
  };

  return (
    <KitContext.Provider value={kit}>
      <group ref={root}>
        {/* ---------------- Hips and legs ---------------- */}
        <group ref={hips} position={[0, HIP_Y, 0]}>
          <Part geo={kit.sphere} color={c.trousers} scale={[female ? 0.44 : 0.47, 0.3, 0.32]} position={[0, 0.02, 0]} />
          {[1, -1].map((side, i) => (
            <group
              key={`leg${side}`}
              position={[side * 0.2, -0.05, 0]}
              ref={(g) => {
                legs.current[i] = g;
              }}
            >
              <Part geo={kit.cap(female ? 0.15 : 0.17, THIGH - 0.2)} color={c.trousers} position={[0, -THIGH / 2, 0]} />
              <group
                position={[0, -THIGH, 0]}
                ref={(g) => {
                  knees.current[i] = g;
                }}
              >
                <Part geo={kit.cap(female ? 0.13 : 0.15, SHIN - 0.14)} color={c.trousers} position={[0, -SHIN / 2, 0]} />
                {female && <Part geo={kit.sphere} color={c.skin} scale={[0.09, 0.06, 0.1]} position={[0, -SHIN + 0.04, 0.03]} ink={0.1} />}
                <Part geo={kit.sphere} color={c.shoes} scale={[0.13, female ? 0.07 : 0.085, 0.25]} position={[0, -SHIN - 0.02, 0.1]} />
              </group>
            </group>
          ))}
        </group>

        {/* ---------------- Torso, arms and head ---------------- */}
        <group ref={spine} position={[0, HIP_Y, 0]}>
          {female ? (
            <>
              <Part geo={kit.cylinder(0.34, 0.52, 1.25)} color={c.top} position={[0, 0.5, 0]} scale={[1, 1, 0.7]} />
              <Part geo={kit.sphere} color={c.top} position={[0, 1.02, 0]} scale={[0.5, 0.26, 0.34]} />
              <Part geo={kit.sphere} color={c.skin} position={[0, 1.1, 0.14]} scale={[0.15, 0.1, 0.14]} ink={0} />
              <mesh geometry={kit.torus} material={kit.toon(c.accent)} position={[0, 1.15, 0.05]} rotation={[Math.PI / 2 + 0.25, 0, 0]} scale={[1, 0.85, 1]} />
            </>
          ) : (
            <>
              <Part geo={kit.cylinder(0.44, 0.46, 1.18)} color={c.top} position={[0, 0.58, 0]} scale={[1, 1, 0.7]} />
              <Part geo={kit.cylinder(0.455, 0.475, 0.92)} color={c.vest} position={[0, 0.46, 0.01]} scale={[1, 1, 0.72]} />
              <Part geo={kit.sphere} color={c.top} position={[0, 1.06, 0]} scale={[0.55, 0.26, 0.36]} />
              <Part geo={kit.cylinder(0.48, 0.48, 0.07)} color={c.accent} position={[0, 0.02, 0]} scale={[1, 1, 0.72]} ink={0.04} />
              {[1, -1].map((side) => (
                <Part key={`collar${side}`} geo={kit.sphere} color="#f4f8fb" position={[side * 0.1, 1.17, 0.22]} rotation={[0.4, 0, side * 0.6]} scale={[0.1, 0.05, 0.03]} ink={0.12} />
              ))}
            </>
          )}

          {[1, -1].map((side, i) => (
            <group key={`arm${side}`} position={[side * SHOULDER.x, SHOULDER.y, 0]} ref={bindArm(i, "shoulder")}>
              <Part geo={kit.cap(female ? 0.1 : 0.12, UPPER_ARM - 0.12)} color={c.top} position={[0, -UPPER_ARM / 2, 0]} />
              <group position={[0, -UPPER_ARM, 0]} ref={bindArm(i, "elbow")}>
                <Part geo={kit.cap(female ? 0.078 : 0.09, FOREARM - 0.1)} color={c.skin} position={[0, -FOREARM / 2, 0]} />
                {!female && <Part geo={kit.cylinder(0.125, 0.125, 0.1)} color={c.top} position={[0, -0.02, 0]} ink={0.05} />}
                <group position={[0, -FOREARM, 0]} ref={bindArm(i, "wrist")}>
                  <Part geo={kit.sphere} color={c.skin} position={[0, -0.08, 0]} scale={[0.05, 0.09, 0.075]} ink={0.12} />
                  {[
                    { z: 0.05, len: 0.07, index: true },
                    { z: 0.017, len: 0.08 },
                    { z: -0.017, len: 0.07 },
                    { z: -0.047, len: 0.05 },
                  ].map((finger, f) => (
                    <group
                      key={f}
                      position={[0, -0.155, finger.z]}
                      ref={(g) => {
                        if (!g) return;
                        if (finger.index) rigs.current[i].index = g;
                        else rigs.current[i].others[f - 1] = g;
                      }}
                    >
                      <Part geo={kit.cap(0.019, finger.len)} color={c.skin} position={[0, -finger.len / 2 - 0.015, 0]} ink={0.16} />
                    </group>
                  ))}
                  <group position={[-side * 0.02, -0.05, 0.07]} rotation={[0.55, 0, 0]} ref={bindArm(i, "thumb")}>
                    <Part geo={kit.cap(0.021, 0.055)} color={c.skin} position={[0, -0.045, 0]} ink={0.16} />
                  </group>
                </group>
              </group>
            </group>
          ))}

          <group position={[0, SPINE, 0]}>
            <Part geo={kit.cylinder(0.12, 0.14, 0.32)} color={c.skin} position={[0, 0.06, 0]} ink={0.05} />
            <group ref={head} position={[0, 0.16, 0]}>
              <group position={[0, 0.6, 0]}>
                <Part geo={kit.sphere} color={c.skin} scale={female ? [0.56, 0.62, 0.55] : [0.6, 0.63, 0.57]} ink={0.035} />
                {[1, -1].map((side) => (
                  <Part key={`ear${side}`} geo={kit.sphere} color={c.skin} position={[side * 0.55, -0.02, -0.03]} scale={[0.06, 0.11, 0.06]} ink={0.1} />
                ))}

                {/* Eyes */}
                {[1, -1].map((side, i) => (
                  <group
                    key={`eye${side}`}
                    position={[side * 0.17, 0.08, 0.46]}
                    ref={(g) => {
                      eyes.current[i] = g;
                    }}
                  >
                    <Part geo={kit.sphere} color="#fffdf8" scale={[0.115, 0.135, 0.08]} ink={0.09} />
                    <group
                      ref={(g) => {
                        pupils.current[i] = g;
                      }}
                    >
                      <Part geo={kit.sphere} color="#1b120e" position={[0, 0, 0.075]} scale={[0.035, 0.04, 0.02]} ink={0} />
                      <mesh geometry={kit.sphere} position={[0.012, 0.016, 0.092]} scale={0.009}>
                        <meshBasicMaterial color="#ffffff" />
                      </mesh>
                    </group>
                    {female && (
                      <Part geo={kit.cap(0.012, 0.06)} color="#1b120e" position={[side * 0.1, 0.1, 0.02]} rotation={[0, 0, side * 0.9]} ink={0} />
                    )}
                  </group>
                ))}

                {/* Brows */}
                {[1, -1].map((side, i) => (
                  <Part
                    key={`brow${side}`}
                    geo={kit.cap(female ? 0.014 : 0.024, 0.11)}
                    color={c.hair}
                    position={[side * 0.17, 0.27, 0.5]}
                    rotation={[0.2, 0, Math.PI / 2]}
                    ink={0}
                    ref={(m: THREE.Mesh | null) => {
                      brows.current[i] = m;
                    }}
                  />
                ))}

                {/* Nose */}
                <Part geo={kit.sphere} color={c.skin} position={[0, -0.07, 0.54]} scale={[0.055, 0.07, 0.065]} ink={0.12} />

                {/* Mouth */}
                <group position={[0, -0.28, 0.47]} rotation={[-0.25, 0, 0]}>
                  <mesh ref={smile} geometry={kit.arc(0.085, 0.017)} material={kit.toon(c.lips)} rotation={[0, 0, Math.PI]} />
                  <mesh ref={mouthInner} geometry={kit.sphere} material={kit.toon("#3b1216")} visible={false}>
                    <mesh geometry={kit.sphere} material={kit.ink} scale={1.12} />
                    <mesh geometry={kit.sphere} material={kit.toon("#f7f1e8")} position={[0, 0.55, 0.5]} scale={[0.75, 0.35, 0.5]} />
                  </mesh>
                </group>

                {female ? (
                  <>
                    {[1, -1].map((side) => (
                      <mesh key={`blush${side}`} geometry={kit.sphere} position={[side * 0.33, -0.13, 0.41]} scale={[0.07, 0.04, 0.02]}>
                        <meshBasicMaterial color="#ef8a86" transparent opacity={0.45} depthWrite={false} />
                      </mesh>
                    ))}
                    <Part geo={kit.sphere} color="#b3263a" position={[0, 0.31, 0.53]} scale={0.022} ink={0} />
                    {[1, -1].map((side) => (
                      <Part key={`earring${side}`} geo={kit.sphere} color="#e3b341" position={[side * 0.56, -0.15, 0]} scale={0.035} ink={0.15} />
                    ))}
                    {/* Hair: crown, side-swept fringe, fullness at the back and a high bun */}
                    <Part geo={kit.dome} color={c.hair} position={[0, 0.03, -0.02]} rotation={[-0.55, 0, 0]} scale={[0.6, 0.67, 0.59]} ink={0.04} />
                    <Part geo={kit.sphere} color={c.hair} position={[-0.17, 0.43, 0.4]} rotation={[0.55, 0, 0.45]} scale={[0.33, 0.13, 0.18]} ink={0.06} />
                    <Part geo={kit.sphere} color={c.hair} position={[0, -0.04, -0.2]} scale={[0.57, 0.6, 0.42]} ink={0.04} />
                    <Part geo={kit.sphere} color={c.hair} position={[0, 0.74, -0.2]} scale={0.21} ink={0.08} />
                  </>
                ) : (
                  <>
                    {/* Hair with a side part, sideburns, a trimmed beard and moustache */}
                    <Part geo={kit.dome} color={c.hair} position={[0, 0.05, -0.03]} rotation={[-0.72, 0, 0]} scale={[0.62, 0.66, 0.6]} ink={0.04} />
                    <Part geo={kit.sphere} color={c.hair} position={[0.12, 0.5, 0.36]} rotation={[0.6, 0, -0.35]} scale={[0.34, 0.12, 0.24]} ink={0.06} />
                    {[1, -1].map((side) => (
                      <Part key={`burn${side}`} geo={kit.sphere} color={c.hair} position={[side * 0.53, 0.05, 0.1]} scale={[0.04, 0.14, 0.08]} ink={0.08} />
                    ))}
                    <Part geo={kit.sphere} color={c.hair} position={[0, -0.5, 0.33]} rotation={[0.3, 0, 0]} scale={[0.16, 0.12, 0.14]} ink={0.08} />
                    <mesh geometry={kit.arc(0.075, 0.024)} material={kit.toon(c.hair)} position={[0, -0.21, 0.52]} rotation={[-0.25, 0, 0]} scale={[1.1, 0.55, 1]} />
                  </>
                )}
              </group>
            </group>
          </group>
        </group>
      </group>
    </KitContext.Provider>
  );
}

"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Viseme } from "@/lib/speech";
import type { TutorGender } from "@/lib/tutor";
import type { Mood } from "./Avatar";

export type Tutor3DProps = {
  gender: TutorGender;
  speaking: boolean;
  viseme: Viseme;
  wordTick: number;
  mood: Mood;
};

// Target mouth opening per viseme: [width, height]. Height 0 means lips closed.
const MOUTH: Record<Viseme, [number, number]> = {
  rest: [1, 0],
  open: [1, 0.9],
  wide: [1.35, 0.45],
  round: [0.72, 0.75],
};

const BROWS: Record<Mood, { lift: number; tilt: number }> = {
  neutral: { lift: 0, tilt: 0 },
  happy: { lift: 0.025, tilt: 0.06 },
  thinking: { lift: 0.06, tilt: -0.14 },
  listening: { lift: 0.06, tilt: 0.05 },
  concerned: { lift: 0.02, tilt: -0.24 },
};

export default function Tutor3D(props: Tutor3DProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, -0.1, 6.4], fov: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ background: "transparent" }}
      aria-hidden
    >
      <hemisphereLight args={["#fff4e8", "#34473f", 0.9]} />
      <directionalLight position={[2.5, 3.5, 5]} intensity={2.1} color="#fff1e0" />
      <directionalLight position={[-4, 1, 3]} intensity={0.8} color="#cdeee0" />
      <directionalLight position={[-1.5, 2.5, -5]} intensity={2.6} color="#f59a4e" />
      <directionalLight position={[2, -1, -4]} intensity={1.2} color="#6ee0b3" />
      <Figure {...props} />
    </Canvas>
  );
}

function useHeadGeometry() {
  return useMemo(() => {
    // An egg-shaped profile, fuller at the cranium and tapering to the chin, spun into a head.
    // Listed chin-first so the lathe faces point outwards.
    const profile = new THREE.SplineCurve(
      [
        [0.001, 1.08],
        [0.4, 1.02],
        [0.7, 0.86],
        [0.88, 0.58],
        [0.93, 0.24],
        [0.9, -0.08],
        [0.83, -0.38],
        [0.7, -0.64],
        [0.5, -0.86],
        [0.26, -0.99],
        [0.001, -1.03],
      ]
        .reverse()
        .map(([r, y]) => new THREE.Vector2(r, y)),
    );
    const geometry = new THREE.LatheGeometry(profile.getPoints(48), 72);
    geometry.computeVertexNormals();
    return geometry;
  }, []);
}

function Figure({ gender, speaking, viseme, wordTick, mood }: Tutor3DProps) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group[]>([]);
  const irises = useRef<THREE.Group[]>([]);
  const brows = useRef<THREE.Mesh[]>([]);
  const mouthOpen = useRef<THREE.Group>(null);
  const mouthInner = useRef<THREE.Mesh>(null);
  const teeth = useRef<THREE.Mesh>(null);
  const smile = useRef<THREE.Mesh>(null);
  const cheeks = useRef<THREE.MeshStandardMaterial[]>([]);
  const headGeometry = useHeadGeometry();

  const anim = useRef({ blinkAt: 2, mouthW: 1, mouthH: 0, lastTick: wordTick, lastWordAt: -10 });
  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const female = gender === "female";
  const materials = useMemo(
    () => ({
      skin: new THREE.MeshPhysicalMaterial({ color: "#d99f79", roughness: 0.62, sheen: 0.5, sheenColor: new THREE.Color("#ffcfb3"), sheenRoughness: 0.6 }),
      skinShade: new THREE.MeshPhysicalMaterial({ color: "#c88c67", roughness: 0.7 }),
      hair: new THREE.MeshPhysicalMaterial({ color: "#221512", roughness: 0.5, sheen: 1, sheenColor: new THREE.Color("#7a5543"), sheenRoughness: 0.3, clearcoat: 0.15 }),
      eyeWhite: new THREE.MeshPhysicalMaterial({ color: "#fbf8f3", roughness: 0.12, clearcoat: 1 }),
      iris: new THREE.MeshPhysicalMaterial({ color: "#4a2c1a", roughness: 0.15, clearcoat: 1 }),
      pupil: new THREE.MeshStandardMaterial({ color: "#0b0706", roughness: 0.1 }),
      glint: new THREE.MeshBasicMaterial({ color: "#ffffff" }),
      lip: new THREE.MeshPhysicalMaterial({ color: female ? "#b4545a" : "#a8625c", roughness: 0.4, clearcoat: female ? 0.5 : 0.1 }),
      mouth: new THREE.MeshStandardMaterial({ color: "#3a1216", roughness: 0.9 }),
      teeth: new THREE.MeshStandardMaterial({ color: "#f7f1e8", roughness: 0.35 }),
      frame: new THREE.MeshPhysicalMaterial({ color: "#2a211e", roughness: 0.35, metalness: 0.5, clearcoat: 0.6 }),
      lens: new THREE.MeshStandardMaterial({ color: "#dff6ff", roughness: 0, transparent: true, opacity: 0.08, depthWrite: false }),
      clothes: new THREE.MeshPhysicalMaterial({ color: female ? "#178a63" : "#24506e", roughness: 0.75, sheen: 0.6, sheenColor: new THREE.Color(female ? "#9fe0c6" : "#9cc7e6") }),
      accent: new THREE.MeshPhysicalMaterial({ color: female ? "#e2761f" : "#f3efe6", roughness: 0.6, sheen: 0.5, sheenColor: new THREE.Color("#ffd9b0") }),
      gold: new THREE.MeshPhysicalMaterial({ color: "#d9a441", metalness: 1, roughness: 0.25 }),
      bindi: new THREE.MeshPhysicalMaterial({ color: "#b3263a", roughness: 0.3, clearcoat: 1 }),
    }),
    [female],
  );

  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);
  useEffect(() => () => headGeometry.dispose(), [headGeometry]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const a = anim.current;
    const damp = THREE.MathUtils.damp;
    const motion = reducedMotion ? 0 : 1;
    const { pointer } = state;

    if (root.current) root.current.position.y = -0.2 + Math.sin(t * 1.4) * 0.02 * motion;
    if (torso.current) torso.current.scale.set(1 + Math.sin(t * 1.4) * 0.006 * motion, 1 + Math.sin(t * 1.4) * 0.012 * motion, 1);

    if (head.current) {
      const talkNod = speaking ? Math.sin(t * 5.2) * 0.03 + Math.sin(t * 2.3) * 0.02 : 0;
      const targetY = (pointer.x * 0.32 + Math.sin(t * 0.45) * 0.05) * motion + (mood === "thinking" ? 0.2 : 0);
      const targetX =
        (-pointer.y * 0.15 + talkNod) * motion + (mood === "thinking" ? -0.13 : mood === "listening" ? 0.07 : mood === "concerned" ? 0.06 : 0);
      const targetZ = mood === "listening" ? 0.1 : mood === "thinking" ? -0.08 : Math.sin(t * 0.6) * 0.02 * motion;
      head.current.rotation.y = damp(head.current.rotation.y, targetY, 4, delta);
      head.current.rotation.x = damp(head.current.rotation.x, targetX, 4, delta);
      head.current.rotation.z = damp(head.current.rotation.z, targetZ, 3, delta);
    }

    if (t > a.blinkAt + 0.15) a.blinkAt = t + 2.2 + Math.random() * 3.3;
    const blinking = t > a.blinkAt && t < a.blinkAt + 0.15;
    for (const eye of eyes.current) if (eye) eye.scale.y = damp(eye.scale.y, blinking ? 0.08 : 1, 45, delta);

    const lookX = mood === "thinking" ? 0.04 : THREE.MathUtils.clamp(pointer.x, -1, 1) * 0.03;
    const lookY = mood === "thinking" ? 0.04 : THREE.MathUtils.clamp(pointer.y, -1, 1) * 0.022;
    for (const iris of irises.current) {
      if (!iris) continue;
      iris.position.x = damp(iris.position.x, lookX, 8, delta);
      iris.position.y = damp(iris.position.y, lookY, 8, delta);
    }

    const brow = BROWS[mood];
    brows.current.forEach((b, i) => {
      if (!b) return;
      const side = i === 0 ? -1 : 1;
      b.position.y = damp(b.position.y, 0.42 + brow.lift + (speaking ? Math.max(0, Math.sin(t * 3.1)) * 0.018 : 0), 6, delta);
      b.rotation.z = damp(b.rotation.z, Math.PI / 2 - side * brow.tilt, 6, delta);
    });

    // Lip-sync: word-boundary events set the shape; a speech rhythm covers voices that don't send them.
    if (wordTick !== a.lastTick) {
      a.lastTick = wordTick;
      a.lastWordAt = t;
    }
    let [w, h] = MOUTH.rest;
    if (speaking) {
      const sinceWord = t - a.lastWordAt;
      if (sinceWord < 0.45) {
        [w, h] = sinceWord < 0.18 ? MOUTH[viseme] : [1, 0.2];
      } else {
        const syllable = Math.abs(Math.sin(t * 11)) * (0.55 + 0.45 * Math.sin(t * 3.7));
        w = 1 + syllable * 0.15;
        h = 0.08 + syllable * 0.7;
      }
    }
    a.mouthW = damp(a.mouthW, w, 22, delta);
    a.mouthH = damp(a.mouthH, h, 22, delta);
    const open = a.mouthH;
    if (mouthOpen.current) mouthOpen.current.scale.set(a.mouthW, 1, 1);
    if (mouthInner.current) {
      mouthInner.current.visible = open > 0.03;
      mouthInner.current.scale.set(1, Math.max(0.001, open), 1);
    }
    if (teeth.current) {
      teeth.current.visible = open > 0.12;
      teeth.current.scale.y = Math.min(1, open * 1.6);
    }

    if (smile.current) {
      const closed = Math.max(0, 1 - open * 4);
      const curve = mood === "happy" ? 1 : mood === "concerned" ? -0.35 : mood === "thinking" ? 0.25 : 0.6;
      const width = mood === "happy" ? 1.1 : 0.9;
      smile.current.scale.x = damp(smile.current.scale.x, width * (closed * 0.9 + 0.1), 12, delta);
      smile.current.scale.y = damp(smile.current.scale.y, curve * closed + 0.02, 12, delta);
    }
    for (const c of cheeks.current) if (c) c.opacity = damp(c.opacity, mood === "happy" ? 0.38 : 0.14, 5, delta);
  });

  return (
    <group ref={root}>
      {/* Shoulders and clothing */}
      <group ref={torso} position={[0, -2.45, -0.15]}>
        <mesh material={materials.clothes} scale={[1.5, 0.85, 0.82]}>
          <capsuleGeometry args={[1, 0.9, 16, 40]} />
        </mesh>
        {female ? (
          <mesh material={materials.accent} position={[0.12, 0.12, 0.72]} rotation={[0.25, 0, -0.95]}>
            <capsuleGeometry args={[0.16, 2.2, 8, 24]} />
          </mesh>
        ) : (
          <group position={[0, 0.72, 0.52]}>
            {[-1, 1].map((side) => (
              <mesh key={side} material={materials.accent} position={[side * 0.2, 0, 0.02]} rotation={[0.35, 0, side * 0.6]}>
                <boxGeometry args={[0.44, 0.16, 0.06]} />
              </mesh>
            ))}
          </group>
        )}
      </group>

      {/* Neck */}
      <mesh material={materials.skinShade} position={[0, -1.35, -0.1]}>
        <cylinderGeometry args={[0.32, 0.4, 0.9, 32]} />
      </mesh>

      <group ref={head}>
        <mesh geometry={headGeometry} material={materials.skin} scale={[0.92, 1, 0.9]} />
        {[-1, 1].map((side) => (
          <mesh key={`ear${side}`} material={materials.skin} position={[side * 0.86, 0.02, -0.08]} scale={[0.12, 0.22, 0.1]}>
            <sphereGeometry args={[1, 24, 24]} />
          </mesh>
        ))}

        {/* Eyes */}
        {[-1, 1].map((side, i) => (
          <group
            key={`eye${side}`}
            position={[side * 0.31, 0.14, 0.75]}
            ref={(g) => {
              if (g) eyes.current[i] = g;
            }}
          >
            <mesh material={materials.eyeWhite} scale={[0.145, 0.115, 0.07]}>
              <sphereGeometry args={[1, 32, 32]} />
            </mesh>
            <group
              ref={(g) => {
                if (g) irises.current[i] = g;
              }}
            >
              <mesh material={materials.iris} position={[0, 0, 0.058]} scale={[0.078, 0.078, 0.025]}>
                <sphereGeometry args={[1, 24, 24]} />
              </mesh>
              <mesh material={materials.pupil} position={[0, 0, 0.078]} scale={[0.036, 0.036, 0.012]}>
                <sphereGeometry args={[1, 16, 16]} />
              </mesh>
              <mesh material={materials.glint} position={[0.026, 0.028, 0.09]} scale={0.013}>
                <sphereGeometry args={[1, 8, 8]} />
              </mesh>
            </group>
            {/* Upper lash line */}
            <mesh material={materials.hair} position={[0, 0.012, 0.035]} rotation={[0.2, 0, 0]} scale={[1, 0.95, 1]}>
              <torusGeometry args={[0.132, female ? 0.013 : 0.008, 8, 24, Math.PI]} />
            </mesh>
          </group>
        ))}

        {/* Eyebrows */}
        {[-1, 1].map((side, i) => (
          <mesh
            key={`brow${side}`}
            material={materials.hair}
            position={[side * 0.31, 0.42, 0.8]}
            rotation={[0.3, side * 0.2, Math.PI / 2]}
            ref={(m) => {
              if (m) brows.current[i] = m;
            }}
          >
            <capsuleGeometry args={[female ? 0.022 : 0.036, 0.22, 6, 12]} />
          </mesh>
        ))}

        {/* Nose */}
        <mesh material={materials.skin} position={[0, -0.12, 0.86]} scale={[0.085, 0.14, 0.1]}>
          <sphereGeometry args={[1, 24, 24]} />
        </mesh>
        <mesh material={materials.skinShade} position={[0, -0.22, 0.86]} scale={[0.1, 0.045, 0.07]}>
          <sphereGeometry args={[1, 16, 16]} />
        </mesh>

        {/* Mouth: a thin smile when closed, an opening that follows the speech when talking */}
        <group position={[0, -0.46, 0.8]} rotation={[-0.15, 0, 0]}>
          <mesh ref={smile} material={materials.lip} position={[0, 0.03, 0]} rotation={[0, 0, Math.PI]} scale={[0.9, 0.6, 0.6]}>
            <torusGeometry args={[0.12, 0.019, 10, 40, Math.PI]} />
          </mesh>
          <group ref={mouthOpen}>
            <mesh ref={mouthInner} material={materials.mouth} scale={[1, 0.001, 1]}>
              <sphereGeometry args={[0.12, 32, 16, 0, Math.PI * 2, 0, Math.PI]} />
            </mesh>
            <mesh ref={teeth} material={materials.teeth} position={[0, 0.035, 0.05]} scale={[1, 0.001, 1]}>
              <boxGeometry args={[0.15, 0.035, 0.03]} />
            </mesh>
          </group>
        </group>

        {/* Cheeks */}
        {[-1, 1].map((side, i) => (
          <mesh key={`cheek${side}`} position={[side * 0.48, -0.2, 0.67]} rotation={[0, side * 0.5, 0]} scale={[0.15, 0.085, 0.04]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial
              ref={(m: THREE.MeshStandardMaterial | null) => {
                if (m) cheeks.current[i] = m;
              }}
              color="#e8837a"
              transparent
              opacity={0.14}
              depthWrite={false}
            />
          </mesh>
        ))}

        {/* Glasses */}
        <group position={[0, 0.14, 0.86]}>
          {[-1, 1].map((side) => (
            <group key={`lens${side}`} position={[side * 0.31, 0, 0]}>
              <mesh material={materials.frame}>
                <torusGeometry args={[0.175, 0.013, 12, 48]} />
              </mesh>
              <mesh material={materials.lens}>
                <circleGeometry args={[0.17, 32]} />
              </mesh>
            </group>
          ))}
          <mesh material={materials.frame} position={[0, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.011, 0.011, 0.28, 8]} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={`arm${side}`} material={materials.frame} position={[side * 0.5, 0.02, -0.42]} rotation={[Math.PI / 2, 0, side * 0.08]}>
              <cylinderGeometry args={[0.01, 0.01, 0.85, 8]} />
            </mesh>
          ))}
        </group>

        {female ? <FemaleHair materials={materials} /> : <MaleHair materials={materials} />}
      </group>
    </group>
  );
}

type Materials = Record<string, THREE.Material>;

function FemaleHair({ materials }: { materials: Materials }) {
  return (
    <group>
      {/* Crown, tilted back so the hairline sits well above the brows */}
      <mesh material={materials.hair} position={[0, 0.08, -0.04]} rotation={[-0.62, 0, 0]} scale={[1.05, 1.1, 1.05]}>
        <sphereGeometry args={[1.0, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
      </mesh>
      {/* Volume behind the head and hair falling past the ears */}
      <mesh material={materials.hair} position={[0, -0.2, -0.3]} scale={[0.98, 1.06, 0.72]}>
        <sphereGeometry args={[1, 48, 32]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`fall${side}`} material={materials.hair} position={[side * 0.83, -0.2, -0.12]} rotation={[0.15, 0, side * -0.1]} scale={[0.14, 0.66, 0.4]}>
          <sphereGeometry args={[1, 24, 24]} />
        </mesh>
      ))}
      {/* Bun */}
      <mesh material={materials.hair} position={[0, 0.72, -0.82]} scale={[0.38, 0.36, 0.34]}>
        <sphereGeometry args={[1, 32, 32]} />
      </mesh>
      <mesh material={materials.bindi} position={[0, 0.3, 0.9]} scale={[0.038, 0.038, 0.015]}>
        <sphereGeometry args={[1, 16, 16]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`earring${side}`} material={materials.gold} position={[side * 0.87, -0.26, -0.02]}>
          <sphereGeometry args={[0.045, 16, 16]} />
        </mesh>
      ))}
    </group>
  );
}

function MaleHair({ materials }: { materials: Materials }) {
  return (
    <group>
      <mesh material={materials.hair} position={[0, 0.1, -0.06]} rotation={[-0.72, 0, 0]} scale={[1.03, 1.08, 1.04]}>
        <sphereGeometry args={[1.0, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
      </mesh>
      {/* Side-swept front */}
      <mesh material={materials.hair} position={[0.12, 0.86, 0.4]} rotation={[0.75, 0.1, -0.25]} scale={[0.62, 0.2, 0.34]}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`burn${side}`} material={materials.hair} position={[side * 0.84, 0.16, 0.08]} scale={[0.06, 0.2, 0.12]}>
          <sphereGeometry args={[1, 16, 16]} />
        </mesh>
      ))}
    </group>
  );
}

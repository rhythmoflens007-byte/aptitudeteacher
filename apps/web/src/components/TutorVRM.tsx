"use client";

import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MotionInput, TutorMotion } from "@/lib/tutorMotion";
import type { Framing } from "./Tutor3D";

const FINGERS = ["Index", "Middle", "Ring", "Little"] as const;
const SEGMENTS = ["Proximal", "Intermediate", "Distal"] as const;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

type Props = MotionInput & { url: string; framing: Framing; onFail: () => void };

/** A VRoid/VRM character driven by the same speech, gestures and moods as the built-in tutors. */
export default function TutorVRM({ url, framing, onFail, ...input }: Props) {
  const camera = useThree((s) => s.camera);
  const [vrm, setVrm] = useState<VRM | null>(null);
  const motion = useRef(new TutorMotion(input.wordTick, input.gestureTick));
  const expressions = useRef<Record<string, number>>({});
  const yaw = useRef(0);
  const lookTarget = useMemo(() => new THREE.Object3D(), []);
  const headHeight = useRef(1.4);
  const reducedMotion = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useEffect(() => {
    let cancelled = false;
    let loaded: VRM | null = null;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      url,
      (gltf) => {
        const model = gltf.userData.vrm as VRM | undefined;
        if (!model) return onFail();
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.combineSkeletons(gltf.scene);
        VRMUtils.rotateVRM0(model);
        model.scene.traverse((object) => {
          object.frustumCulled = false;
        });
        if (cancelled) return VRMUtils.deepDispose(model.scene);
        if (model.lookAt) model.lookAt.target = lookTarget;
        loaded = model;
        setVrm(model);
      },
      undefined,
      () => {
        if (!cancelled) onFail();
      },
    );
    return () => {
      cancelled = true;
      if (loaded) VRMUtils.deepDispose(loaded.scene);
    };
  }, [url, onFail, lookTarget]);

  // Frame the camera from the model's own proportions, since every VRoid character is a different height.
  useLayoutEffect(() => {
    if (!vrm) return;
    vrm.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(vrm.scene);
    const height = box.max.y - box.min.y;
    const head = vrm.humanoid.getNormalizedBoneNode("head");
    const headY = head ? head.getWorldPosition(new THREE.Vector3()).y : box.min.y + height * 0.9;
    headHeight.current = headY;
    const halfFov = THREE.MathUtils.degToRad(30 / 2);
    const [centerY, visible] = framing === "full" ? [box.min.y + height * 0.5, height * 1.12] : [headY - height * 0.1, height * 0.5];
    const distance = visible / 2 / Math.tan(halfFov);
    camera.position.set(0, centerY + height * 0.02, distance);
    camera.lookAt(0, centerY, 0);
    camera.updateProjectionMatrix();
  }, [vrm, framing, camera]);

  useFrame(({ clock, pointer }, delta) => {
    if (!vrm) return;
    const t = clock.elapsedTime;
    const m = motion.current;
    const damp = THREE.MathUtils.damp;
    const still = reducedMotion ? 0 : 1;
    m.step(t, delta, input, reducedMotion);
    const bone = (name: string) => vrm.humanoid.getNormalizedBoneNode(name as Parameters<typeof vrm.humanoid.getNormalizedBoneNode>[0]);

    // Arms: normalized VRM bones rest in a T-pose, so lower the arms to the sides before applying the pose.
    m.arms.forEach((arm, i) => {
      const s = i === 0 ? 1 : -1;
      const side = i === 0 ? "left" : "right";
      bone(`${side}UpperArm`)?.rotation.set(arm.sx, 0, -s * (Math.PI / 2 - 0.12 - arm.sz));
      bone(`${side}LowerArm`)?.rotation.set(0, s * arm.ex, -s * arm.ez);
      bone(`${side}Hand`)?.rotation.set(s * arm.wy * 0.6, 0, -s * arm.wx * 0.5);
      bone(`${side}Shoulder`)?.rotation.set(0, 0, s * m.shrug * 2);
      for (const finger of FINGERS) {
        const curl = finger === "Index" ? arm.index : arm.others;
        for (const segment of SEGMENTS) bone(`${side}${finger}${segment}`)?.rotation.set(0, 0, -s * curl * 0.62);
      }
      bone(`${side}ThumbProximal`)?.rotation.set(0, s * arm.thumb * 0.45, 0);
    });

    const breathe = Math.sin(t * 1.5) * 0.012 * still;
    bone("hips")?.rotation.set(0, 0, m.sway * 0.02);
    bone("spine")?.rotation.set(m.lean + breathe, (input.speaking ? Math.sin(t * 0.9) * 0.06 : 0) * still, -m.sway * 0.025);
    bone("chest")?.rotation.set(breathe, 0, 0);

    yaw.current = damp(yaw.current, THREE.MathUtils.clamp(pointer.x, -1, 1) * 0.3 * still + (input.mood === "thinking" ? 0.18 : 0), 3, delta);
    const nod = input.speaking ? Math.sin(t * 4.8) * 0.03 * still + m.beat * 0.05 : 0;
    bone("neck")?.rotation.set(nod * 0.4, yaw.current * 0.35, m.tilt * 0.4);
    bone("head")?.rotation.set(-m.lookUp + nod * 0.6 - THREE.MathUtils.clamp(pointer.y, -1, 1) * 0.08 * still, yaw.current * 0.65, m.tilt * 0.6);

    lookTarget.position.set(pointer.x * 0.8, headHeight.current + pointer.y * 0.4 + (input.mood === "thinking" ? 0.4 : 0), 2.5);

    // Lip-sync: blend the model's own vowel mouth shapes from the current opening and width.
    const open = m.mouthH;
    const wide = clamp01((m.mouthW - 1) * 3);
    const round = clamp01((1 - m.mouthW) * 3);
    const target: Record<string, number> = {
      aa: open * clamp01(1 - wide - round),
      ee: open * wide,
      ih: open * wide * 0.35,
      ou: open * round,
      oh: open * round * 0.5,
      blink: m.blink,
      happy: input.mood === "happy" ? (input.speaking ? 0.15 : 0.55) : input.speaking ? 0.1 : 0.2,
      sad: input.mood === "concerned" ? 0.4 : 0,
      relaxed: input.mood === "listening" ? 0.45 : 0,
      surprised: input.mood === "thinking" ? 0.15 : 0,
    };
    const manager = vrm.expressionManager;
    for (const [name, value] of Object.entries(target)) {
      const rate = name === "blink" || name.length === 2 ? 30 : 5;
      const weight = damp(expressions.current[name] ?? 0, value, rate, delta);
      expressions.current[name] = weight;
      manager?.setValue(name, weight);
    }

    vrm.update(delta);
  });

  return vrm ? <primitive object={vrm.scene} /> : null;
}

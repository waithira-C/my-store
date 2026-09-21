"use client";

import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { AuthField } from "./AuthFocusContext";
import { usePointerDrag } from "./usePointerDrag";

/**
 * Each field is a lighting *story*, not a random reshuffle. The "focus shift"
 * the brief asks for is done with fog density plus key-light position rather
 * than a depth-of-field pass -- that avoids a postprocessing dependency and an
 * extra render target, and a hazy backlit still life is a better metaphor for
 * a password field anyway.
 */
type Pose = {
  key: [number, number, number];
  keyColor: string;
  keyIntensity: number;
  camera: [number, number, number];
  target: [number, number, number];
  fog: number;
  rim: number;
};

const POSES: Record<"idle" | "name" | "email" | "password", Pose> = {
  idle: {
    key: [3.0, 4.0, 4.0],
    keyColor: "#fff4e6",
    keyIntensity: 2.2,
    camera: [0, 0.55, 5.2],
    target: [0, 0.1, 0],
    fog: 0.055,
    rim: 0.35,
  },
  // Light sweeps in from the left and the scene opens up: "introduce yourself".
  name: {
    key: [-2.2, 3.4, 4.6],
    keyColor: "#fff0dc",
    keyIntensity: 2.6,
    camera: [-0.5, 0.75, 4.7],
    target: [-0.35, 0.25, 0],
    fog: 0.05,
    rim: 0.5,
  },
  // Swings right and sharpens, camera steps in: "the address".
  email: {
    key: [4.2, 3.0, 3.2],
    keyColor: "#ffe9cf",
    keyIntensity: 3.0,
    camera: [0.45, 0.35, 4.3],
    target: [0.2, 0.05, 0],
    fog: 0.045,
    rim: 0.6,
  },
  // Key goes behind and cool, haze doubles, objects fall to near-silhouette.
  password: {
    key: [1.2, 5.2, -1.5],
    keyColor: "#e8ecff",
    keyIntensity: 1.5,
    camera: [0, 0.2, 3.6],
    target: [0, -0.05, 0],
    fog: 0.11,
    rim: 0.15,
  },
};

/** ~300ms to settle, frame-rate independent. */
const LAMBDA = 3.5;

function useMugGeometry() {
  return useMemo(() => {
    // Outer wall up, over the rim, then back down the inner wall, so the mug
    // reads as a vessel rather than a solid cylinder.
    const profile = [
      new THREE.Vector2(0.0, -0.62),
      new THREE.Vector2(0.34, -0.62),
      new THREE.Vector2(0.4, -0.57),
      new THREE.Vector2(0.42, -0.3),
      new THREE.Vector2(0.43, 0.05),
      new THREE.Vector2(0.42, 0.3),
      new THREE.Vector2(0.415, 0.36),
      new THREE.Vector2(0.375, 0.36),
      new THREE.Vector2(0.38, 0.3),
      new THREE.Vector2(0.385, -0.3),
      new THREE.Vector2(0.36, -0.48),
      new THREE.Vector2(0.0, -0.5),
    ];
    return new THREE.LatheGeometry(profile, 64);
  }, []);
}

export function StillLife({ activeField }: { activeField: AuthField }) {
  const domElement = useThree((state) => state.gl.domElement);
  const { state: drag, settle } = usePointerDrag(domElement);

  const groupRef = useRef<THREE.Group>(null);
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const rimRef = useRef<THREE.DirectionalLight>(null);
  const idleSpin = useRef(0);
  const lookAt = useRef(new THREE.Vector3(0, 0.1, 0));
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const mugGeometry = useMugGeometry();

  // Real product art on the framed print -- no new assets needed. colorSpace
  // is set declaratively via map-colorSpace below rather than by mutating the
  // texture, which is a value returned from a hook.
  const printTexture = useLoader(THREE.TextureLoader, "/images/giclee.jpg");

  useFrame((state, delta) => {
    const pose = POSES[activeField ?? "idle"];
    const damp = THREE.MathUtils.damp;
    const blend = 1 - Math.exp(-LAMBDA * delta);

    const key = keyRef.current;
    if (key) {
      key.position.set(
        damp(key.position.x, pose.key[0], LAMBDA, delta),
        damp(key.position.y, pose.key[1], LAMBDA, delta),
        damp(key.position.z, pose.key[2], LAMBDA, delta),
      );
      key.intensity = damp(key.intensity, pose.keyIntensity, LAMBDA, delta);
      key.color.lerp(tmpColor.set(pose.keyColor), blend);
    }

    if (rimRef.current) {
      rimRef.current.intensity = damp(
        rimRef.current.intensity,
        pose.rim,
        LAMBDA,
        delta,
      );
    }

    const fog = state.scene.fog as THREE.FogExp2 | null;
    if (fog) fog.density = damp(fog.density, pose.fog, LAMBDA, delta);

    // Camera: pose + hover parallax, composed in one place so they cannot fight.
    const d = drag.current;
    state.camera.position.set(
      damp(
        state.camera.position.x,
        pose.camera[0] + d.hoverX * 0.12,
        LAMBDA,
        delta,
      ),
      damp(
        state.camera.position.y,
        pose.camera[1] - d.hoverY * 0.08,
        LAMBDA,
        delta,
      ),
      damp(state.camera.position.z, pose.camera[2], LAMBDA, delta),
    );
    lookAt.current.set(
      damp(lookAt.current.x, pose.target[0], LAMBDA, delta),
      damp(lookAt.current.y, pose.target[1], LAMBDA, delta),
      damp(lookAt.current.z, pose.target[2], LAMBDA, delta),
    );
    state.camera.lookAt(lookAt.current);

    // Idle drift plus spring-back. The damping itself lives in the hook so
    // the drag state is only written where it is constructed.
    if (!d.dragging) idleSpin.current += delta * 0.06;
    settle(delta, damp);

    const group = groupRef.current;
    if (group) {
      group.rotation.y = damp(
        group.rotation.y,
        d.yaw + idleSpin.current,
        6,
        delta,
      );
      group.rotation.x = damp(group.rotation.x, d.pitch, 6, delta);
    }
  });

  return (
    <>
      <ambientLight intensity={0.22} color="#efe4d6" />
      <directionalLight
        ref={keyRef}
        position={POSES.idle.key}
        color={POSES.idle.keyColor}
        intensity={POSES.idle.keyIntensity}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-bias={-0.0006}
      />
      {/* Clay rim light: separates the silhouette from the dark ground. */}
      <directionalLight
        ref={rimRef}
        position={[-3.5, 1.2, -3]}
        color="#c96a3c"
        intensity={POSES.idle.rim}
      />

      <group ref={groupRef}>
        {/* Ceramic mug -- the hero. Matte glaze, one soft specular band. */}
        <mesh geometry={mugGeometry} position={[0, -0.15, 0]} castShadow>
          <meshPhysicalMaterial
            color="#e8e0d4"
            roughness={0.52}
            clearcoat={0.18}
            clearcoatRoughness={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0.5, -0.12, 0]} castShadow>
          <torusGeometry args={[0.2, 0.036, 14, 40]} />
          <meshPhysicalMaterial
            color="#e8e0d4"
            roughness={0.52}
            clearcoat={0.18}
            clearcoatRoughness={0.4}
          />
        </mesh>

        {/* Framed print, leaning slightly behind and to the left. */}
        <group position={[-1.18, 0.3, -0.85]} rotation={[0, 0.42, 0]}>
          <mesh position={[0, 0, -0.03]} castShadow>
            <boxGeometry args={[1.22, 1.57, 0.05]} />
            <meshStandardMaterial color="#f2eee6" roughness={0.95} />
          </mesh>
          <mesh>
            <planeGeometry args={[1.05, 1.4]} />
            <meshStandardMaterial
              map={printTexture}
              map-colorSpace={THREE.SRGBColorSpace}
              roughness={0.9}
            />
          </mesh>
        </group>

        {/* Brass pen, lying on the ground. */}
        <group position={[0.92, -0.63, 0.55]} rotation={[0, 0, 1.45]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.028, 0.022, 1.35, 16]} />
            <meshStandardMaterial
              color="#b08a4e"
              metalness={0.9}
              roughness={0.32}
            />
          </mesh>
          <mesh position={[0, -0.74, 0]} castShadow>
            <coneGeometry args={[0.022, 0.14, 16]} />
            <meshStandardMaterial
              color="#c9a468"
              metalness={0.9}
              roughness={0.28}
            />
          </mesh>
        </group>
      </group>

      {/* Ground plane: catches the contact shadows that sell the whole thing. */}
      <mesh
        position={[0, -0.78, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[12, 64]} />
        <meshStandardMaterial color="#14110e" roughness={1} />
      </mesh>
    </>
  );
}

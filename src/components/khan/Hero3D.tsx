'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

/* ---------- Gold coin face texture (Bitcoin ₿) ---------- */
function makeCoinFaceTexture(label: string, bg1: string, bg2: string, fg: string) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // radial gold gradient
  const grad = ctx.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size / 2);
  grad.addColorStop(0, bg1);
  grad.addColorStop(1, bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // outer ring
  ctx.strokeStyle = fg;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 26, 0, Math.PI * 2);
  ctx.stroke();

  // tick marks around the ring
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 6;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const x1 = size / 2 + Math.cos(a) * (size / 2 - 44);
    const y1 = size / 2 + Math.sin(a) * (size / 2 - 44);
    const x2 = size / 2 + Math.cos(a) * (size / 2 - 62);
    const y2 = size / 2 + Math.sin(a) * (size / 2 - 62);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  // center symbol
  ctx.globalAlpha = 1;
  ctx.fillStyle = fg;
  ctx.font = `700 ${size * 0.52}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, size / 2, size / 2 + size * 0.02);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------- Ridged edge texture ---------- */
function makeEdgeTexture(base: string, ridge: string) {
  const w = 1024, h = 64;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = ridge;
  for (let x = 0; x < w; x += 16) ctx.fillRect(x, 0, 8, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.x = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------- One coin (body + ridged edge + two faces) ---------- */
function Coin({
  label, radius = 1, thickness = 0.14, colors,
}: {
  label: string; radius?: number; thickness?: number;
  colors: { bg1: string; bg2: string; fg: string; edge1: string; edge2: string };
}) {
  const face = useMemo(() => makeCoinFaceTexture(label, colors.bg1, colors.bg2, colors.fg), [label, colors]);
  const edge = useMemo(() => makeEdgeTexture(colors.edge1, colors.edge2), [colors]);

  return (
    <group>
      {/* faces */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[radius, radius, thickness, 96]} />
        <meshStandardMaterial color="#E8B84B" metalness={0.55} roughness={0.3} envMapIntensity={1.2} />
      </mesh>
      {/* top face plate — cylinder rotated [PI/2,0,0] means caps face ±Z */}
      <mesh position={[0, 0, thickness / 2 + 0.002]}>
        <circleGeometry args={[radius * 0.995, 96]} />
        <meshStandardMaterial map={face} metalness={0.35} roughness={0.42} />
      </mesh>
      {/* bottom face plate */}
      <mesh position={[0, 0, -thickness / 2 - 0.002]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[radius * 0.995, 96]} />
        <meshStandardMaterial map={face} metalness={0.35} roughness={0.42} />
      </mesh>
      {/* ridged edge */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 1.001, radius * 1.001, thickness * 0.98, 96, 1, true]} />
        <meshStandardMaterial map={edge} color="#FFFFFF" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

/* ---------- Orbiting satellite coin ---------- */
function Orbiter({
  radius, speed, tilt, phase, size, label, colors,
}: {
  radius: number; speed: number; tilt: number; phase: number;
  size: number; label: string; colors: { bg1: string; bg2: string; fg: string; edge1: string; edge2: string };
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + phase;
    if (!ref.current) return;
    ref.current.position.set(Math.cos(t) * radius, Math.sin(t * 1.4) * radius * 0.18, Math.sin(t) * radius);
    ref.current.rotation.y = t;
    ref.current.rotation.x = tilt;
  });
  return (
    <group ref={ref} scale={size}>
      <Coin label={label} thickness={0.16} colors={colors} />
    </group>
  );
}

/* ---------- Particle starfield ---------- */
function Particles({ count = 420 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 3.2 + Math.random() * 4.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.cos(phi) * 0.6;
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.045;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#3FE0D0" transparent opacity={0.75} sizeAttenuation />
    </points>
  );
}

/* ---------- Orbit rings ---------- */
function Ring({ radius, tilt, color, opacity }: { radius: number; tilt: number; color: string; opacity: number }) {
  return (
    <mesh rotation={[Math.PI / 2 + tilt, 0, tilt * 0.6]}>
      <torusGeometry args={[radius, 0.006, 12, 128]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

/* ---------- The whole scene with mouse parallax ---------- */
function Scene() {
  const group = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((state, delta) => {
    if (!group.current) return;
    // main coin spins on a stylish tilted axis so the face is always partly visible
    group.current.rotation.y += delta * 0.55;
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, 0, delta * 2);
    // gentle mouse parallax on the parent rig
    const rig = group.current.parent!;
    rig.rotation.y = THREE.MathUtils.lerp(rig.rotation.y, pointer.current.x * 0.22, 0.04);
    rig.rotation.x = THREE.MathUtils.lerp(rig.rotation.x, pointer.current.y * 0.12, 0.04);
    state.camera.lookAt(0, 0, 0);
  });

  const gold = { bg1: '#F6D879', bg2: '#B8860B', fg: '#5C3A00', edge1: '#E8B84B', edge2: '#8A6508' };
  const silver = { bg1: '#E8ECF4', bg2: '#7E8AA6', fg: '#232B3A', edge1: '#C7CFDE', edge2: '#5A6478' };
  const teal = { bg1: '#8FF7EC', bg2: '#0E8C7F', fg: '#03302B', edge1: '#57D9CB', edge2: '#08665C' };
  const violet = { bg1: '#C9B8FF', bg2: '#5B3FD1', fg: '#1B0F52', edge1: '#9F86F2', edge2: '#3D2A8F' };

  return (
    <group>
      <group ref={group} rotation={[0.42, 0, 0.08]}>
        <Float speed={2.2} rotationIntensity={0.16} floatIntensity={0.9}>
          <Coin label="₿" thickness={0.16} colors={gold} />
        </Float>
        <Ring radius={1.55} tilt={0.42} color="#C9A24B" opacity={0.5} />
        <Ring radius={1.95} tilt={-0.3} color="#3FE0D0" opacity={0.4} />
        <Ring radius={2.35} tilt={0.62} color="#C9A24B" opacity={0.25} />
      </group>

      <Orbiter radius={1.62} speed={0.85} tilt={0.42} phase={0.6} size={0.24} label="Ξ" colors={silver} />
      <Orbiter radius={2.0} speed={-0.6} tilt={-0.3} phase={2.2} size={0.2} label="◎" colors={teal} />
      <Orbiter radius={2.42} speed={0.45} tilt={0.62} phase={4.0} size={0.17} label="◆" colors={violet} />

      <Particles />
    </group>
  );
}

export default function Hero3D() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex aspect-square w-full max-w-[460px] items-center justify-center rounded-full border border-[#232E45] bg-gradient-to-br from-[#151F33] to-[#0A0F1C]">
        <span className="font-serif text-7xl text-[#C9A24B]">₿</span>
      </div>
    );
  }

  return (
    <div className="relative aspect-square w-full max-w-[460px] mx-auto">
      <div className="pointer-events-none absolute inset-[-12%] rounded-full bg-[radial-gradient(circle,rgba(63,224,208,0.16)_0%,rgba(201,162,75,0.12)_45%,transparent_72%)] blur-md" />
      <Canvas
        camera={{ position: [0, 0.6, 4.6], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%' }}
        aria-label="Interactive 3D Bitcoin model — rotating gold coin with orbiting crypto satellites"
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[4, 5, 3]} intensity={2.6} color="#FFE9B0" />
        <directionalLight position={[-4, -2, -3]} intensity={1.4} color="#3FE0D0" />
        <pointLight position={[0, 2.4, 2.4]} intensity={22} color="#C9A24B" />
        <pointLight position={[0, -2, 2]} intensity={8} color="#FFFFFF" />
        <spotLight position={[0, 5, 0]} angle={0.5} penumbra={1} intensity={1.8} color="#FFFFFF" />
        <Scene />
      </Canvas>
    </div>
  );
}

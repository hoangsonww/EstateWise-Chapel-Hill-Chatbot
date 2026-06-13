"use client";

/**
 * Scene3D — a fixed, full-page WebGL backdrop for the landing page.
 *
 * Constraints honored:
 *  - Procedural geometry only. No binary assets (.glb/.gltf/.hdr/.exr/textures).
 *  - Lives behind the entire page (not just hero/CTA) via a fixed, pointer-events:none layer.
 *  - Reacts to cursor movement (parallax + tilt) and scroll (dolly, spin).
 *  - Dark-only (the landing renders dark regardless of the saved preference).
 *  - Adapts to the device: low / mobile / desktop performance tiers, so it stays
 *    smooth on phones and weak GPUs. Honors prefers-reduced-motion, pauses while
 *    the tab is hidden, and falls back to the CSS backdrop when WebGL is absent.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ----------------------------------------------------------------------------
 * Shared live input (pointer + scroll). Stored in a ref so updates never
 * trigger React re-renders; the render loop reads `.current` each frame.
 * -------------------------------------------------------------------------- */
type LiveInput = {
  // Normalized pointer in [-1, 1].
  px: number;
  py: number;
  // Scroll progress in [0, 1] across the whole document.
  scroll: number;
  reduced: boolean;
};

const InputContext = createContext<React.MutableRefObject<LiveInput> | null>(
  null,
);

function useInput() {
  const ref = useContext(InputContext);
  if (!ref) throw new Error("useInput must be used inside Scene3D");
  return ref;
}

/* ----------------------------------------------------------------------------
 * Palettes — every color is a literal, derived from the active theme.
 * -------------------------------------------------------------------------- */
type Palette = {
  fog: THREE.Color;
  particles: THREE.Color[];
  core: THREE.Color;
  crystals: THREE.Color[];
  grid: THREE.Color;
  lightA: THREE.Color;
  lightB: THREE.Color;
  ambient: number;
};

function makePalette(isDark: boolean): Palette {
  if (isDark) {
    return {
      fog: new THREE.Color("#070b18"),
      particles: ["#38bdf8", "#818cf8", "#22d3ee", "#a78bfa", "#34d399"].map(
        (c) => new THREE.Color(c),
      ),
      core: new THREE.Color("#6366f1"),
      crystals: ["#22d3ee", "#a78bfa", "#34d399", "#60a5fa"].map(
        (c) => new THREE.Color(c),
      ),
      grid: new THREE.Color("#1e3a8a"),
      lightA: new THREE.Color("#60a5fa"),
      lightB: new THREE.Color("#f472b6"),
      ambient: 0.45,
    };
  }
  return {
    fog: new THREE.Color("#dbe5f7"),
    particles: ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#6366f1"].map(
      (c) => new THREE.Color(c),
    ),
    core: new THREE.Color("#6366f1"),
    crystals: ["#0ea5e9", "#6366f1", "#10b981", "#0891b2"].map(
      (c) => new THREE.Color(c),
    ),
    grid: new THREE.Color("#94a3b8"),
    lightA: new THREE.Color("#93c5fd"),
    lightB: new THREE.Color("#fbcfe8"),
    ambient: 0.85,
  };
}

const damp = THREE.MathUtils.damp;

/* ----------------------------------------------------------------------------
 * Performance tiers. Weak GPUs cannot afford continuous per-vertex CPU updates,
 * PBR materials, many lights, antialiasing, or a high device-pixel-ratio — so
 * each tier dials those down. `cpuDrift`/`cpuWarp` gate the per-frame vertex
 * loops (the most expensive CPU work); when off, motion comes from cheap group
 * transforms instead.
 * -------------------------------------------------------------------------- */
type Tier = "low" | "mobile" | "desktop";

type Perf = {
  particles: number;
  crystals: number;
  grid: boolean;
  gridDiv: number;
  pbr: boolean;
  lights: number;
  dprMax: number;
  antialias: boolean;
  cpuDrift: boolean;
  cpuWarp: boolean;
};

const PERF: Record<Tier, Perf> = {
  desktop: {
    particles: 3400,
    crystals: 11,
    grid: true,
    gridDiv: 40,
    pbr: true,
    lights: 3,
    dprMax: 1.75,
    antialias: true,
    cpuDrift: true,
    cpuWarp: true,
  },
  mobile: {
    particles: 1100,
    crystals: 7,
    grid: true,
    gridDiv: 26,
    pbr: false,
    lights: 2,
    dprMax: 1.4,
    antialias: false,
    cpuDrift: false,
    cpuWarp: true,
  },
  low: {
    particles: 420,
    crystals: 4,
    grid: false,
    gridDiv: 0,
    pbr: false,
    lights: 1,
    dprMax: 1,
    antialias: false,
    cpuDrift: false,
    cpuWarp: false,
  },
};

// Pick a tier from device capabilities. Touch devices map to mobile; constrained
// ones (few cores / little memory / very small screens) map to low.
function detectTier(): Tier {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;
  const cores = nav.hardwareConcurrency || 0;
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  const constrained = (mem !== null && mem <= 4) || (cores > 0 && cores <= 4);

  if (coarse) return w < 480 || constrained ? "low" : "mobile";
  return w < 768 ? "mobile" : "desktop";
}

/* ----------------------------------------------------------------------------
 * Starfield — instanced point cloud drifting through space.
 * -------------------------------------------------------------------------- */
function Starfield({
  palette,
  count,
  cpuDrift,
}: {
  palette: Palette;
  count: number;
  cpuDrift: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const rx = useRef(0);
  const ry = useRef(0);
  const input = useInput();

  const { positions, colors, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const spread = 36;
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * spread * 1.6;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread - 6;
      const c = palette.particles[i % palette.particles.length];
      const tint = 0.6 + Math.random() * 0.4;
      colors[i * 3 + 0] = c.r * tint;
      colors[i * 3 + 1] = c.g * tint;
      colors[i * 3 + 2] = c.b * tint;
      speeds[i] = 0.4 + Math.random() * 1.2;
    }
    return { positions, colors, speeds };
  }, [count, palette]);

  useFrame((state, delta) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const { px, py, scroll, reduced } = input.current;
    const dt = Math.min(delta, 0.05);
    const t = reduced ? 0 : state.clock.elapsedTime;

    // Per-vertex drift is the heaviest CPU work; only run it where affordable.
    // Otherwise the field still moves via the cheap rotation below.
    if (!reduced && cpuDrift) {
      const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const rise = (0.35 + scroll * 0.9) * dt;
      for (let i = 0; i < count; i++) {
        let y = arr[i * 3 + 1] + speeds[i] * rise;
        if (y > 19) y = -19;
        arr[i * 3 + 1] = y;
      }
      pos.needsUpdate = true;
    }

    // Continuous spin + scroll drift keeps the field alive even with no pointer
    // (touch devices), with smoothed cursor parallax layered on top.
    ry.current = damp(ry.current, px * 0.25, 3, dt);
    rx.current = damp(rx.current, -py * 0.18, 3, dt);
    pts.rotation.y = t * 0.015 + scroll * 0.5 + ry.current;
    pts.rotation.x = rx.current;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ----------------------------------------------------------------------------
 * WireCore — a large slowly rotating wireframe icosahedron framing the scene.
 * -------------------------------------------------------------------------- */
function WireCore({ palette }: { palette: Palette }) {
  const groupRef = useRef<THREE.Group>(null);
  const input = useInput();

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const { px, py, scroll, reduced } = input.current;
    const dt = Math.min(delta, 0.05);
    const t = reduced ? 0 : state.clock.elapsedTime;
    g.rotation.y = t * 0.05 + scroll * Math.PI * 1.2 + px * 0.4;
    g.rotation.x = damp(g.rotation.x, py * 0.3 + scroll * 0.6, 2.5, dt);
    const s = 1 + scroll * 0.35;
    g.scale.setScalar(damp(g.scale.x, s, 3, dt));
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <icosahedronGeometry args={[5.4, 1]} />
        <meshBasicMaterial
          color={palette.core}
          wireframe
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh scale={0.62}>
        <icosahedronGeometry args={[5.4, 0]} />
        <meshBasicMaterial
          color={palette.crystals[0]}
          wireframe
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ----------------------------------------------------------------------------
 * CrystalCluster — faceted low-poly gems orbiting the center. Reads as
 * architectural / real-estate "facets". Reacts to pointer tilt + scroll spin.
 * -------------------------------------------------------------------------- */
type CrystalSpec = {
  position: [number, number, number];
  scale: number;
  detail: number;
  color: THREE.Color;
  wire: boolean;
  spin: number;
  orbit: number;
};

function CrystalCluster({
  palette,
  count,
  pbr,
}: {
  palette: Palette;
  count: number;
  pbr: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const input = useInput();

  const specs = useMemo<CrystalSpec[]>(() => {
    const arr: CrystalSpec[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 3.2 + (i % 3) * 1.15;
      const height = Math.sin(i * 1.7) * 2.4;
      arr.push({
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius - 2,
        ],
        scale: 0.55 + (i % 4) * 0.22,
        detail: i % 5 === 0 ? 1 : 0,
        color: palette.crystals[i % palette.crystals.length],
        wire: i % 3 === 0,
        spin: 0.15 + (i % 3) * 0.12,
        orbit: i % 2 === 0 ? 1 : -1,
      });
    }
    return arr;
  }, [count, palette]);

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const { px, py, scroll, reduced } = input.current;
    const dt = Math.min(delta, 0.05);
    const t = reduced ? 0 : state.clock.elapsedTime;

    // Whole cluster orbits slowly and tilts toward the cursor.
    g.rotation.y = t * 0.08 + scroll * Math.PI * 0.8;
    g.rotation.x = damp(g.rotation.x, py * 0.45, 2.5, dt);
    g.rotation.z = damp(g.rotation.z, -px * 0.3, 2.5, dt);

    // Per-gem self rotation.
    g.children.forEach((child, i) => {
      const spec = specs[i];
      if (!spec) return;
      child.rotation.x = t * spec.spin * spec.orbit;
      child.rotation.y = t * spec.spin;
    });
  });

  return (
    <group ref={groupRef}>
      {specs.map((spec, i) => (
        <mesh key={i} position={spec.position} scale={spec.scale}>
          <icosahedronGeometry args={[1, spec.detail]} />
          {spec.wire ? (
            <meshBasicMaterial
              color={spec.color}
              wireframe
              transparent
              opacity={0.55}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          ) : pbr ? (
            <meshStandardMaterial
              color={spec.color}
              emissive={spec.color}
              emissiveIntensity={0.35}
              metalness={0.45}
              roughness={0.18}
              flatShading
              transparent
              opacity={0.92}
            />
          ) : (
            // Cheap lit material for weak GPUs — keeps the faceted look without
            // the cost of PBR (metalness/roughness/IBL).
            <meshLambertMaterial
              color={spec.color}
              emissive={spec.color}
              emissiveIntensity={0.4}
              flatShading
              transparent
              opacity={0.92}
            />
          )}
        </mesh>
      ))}
    </group>
  );
}

/* ----------------------------------------------------------------------------
 * GridFloor — a warped line grid giving an architectural "horizon".
 * -------------------------------------------------------------------------- */
function GridFloor({
  palette,
  divisions,
  cpuWarp,
}: {
  palette: Palette;
  divisions: number;
  cpuWarp: boolean;
}) {
  const lineRef = useRef<THREE.LineSegments>(null);
  const input = useInput();

  const { geometry, base } = useMemo(() => {
    const size = 48;
    const div = divisions;
    const half = size / 2;
    const step = size / div;
    const verts: number[] = [];
    for (let i = 0; i <= div; i++) {
      const p = -half + i * step;
      // lines parallel to X
      verts.push(-half, 0, p, half, 0, p);
      // lines parallel to Z
      verts.push(p, 0, -half, p, 0, half);
    }
    const arr = new Float32Array(verts);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return { geometry, base: arr.slice() };
  }, [divisions]);

  useFrame((state, delta) => {
    const line = lineRef.current;
    if (!line) return;
    const { scroll, reduced } = input.current;
    const dt = Math.min(delta, 0.05);
    const t = reduced ? 0 : state.clock.elapsedTime;

    if (!reduced && cpuWarp) {
      const pos = line.geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        const x = base[i];
        const z = base[i + 2];
        arr[i + 1] =
          Math.sin(x * 0.35 + t * 0.6) * 0.6 +
          Math.cos(z * 0.3 + t * 0.4) * 0.6;
      }
      pos.needsUpdate = true;
    }
    line.position.z = damp(line.position.z, -2 + scroll * 10, 2, dt);
  });

  return (
    <lineSegments
      ref={lineRef}
      geometry={geometry}
      position={[0, -7, -2]}
      rotation={[0, 0, 0]}
    >
      <lineBasicMaterial
        color={palette.grid}
        transparent
        opacity={0.22}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

/* ----------------------------------------------------------------------------
 * Rig — drives the camera with cursor parallax and scroll dolly.
 * -------------------------------------------------------------------------- */
function Rig() {
  const input = useInput();
  const { camera } = useThree();

  useFrame((_, delta) => {
    const { px, py, scroll } = input.current;
    const dt = Math.min(delta, 0.05);
    const targetX = px * 2.4;
    const targetY = 0.4 + py * 1.6;
    const targetZ = 11 - scroll * 2.6;
    camera.position.x = damp(camera.position.x, targetX, 3, dt);
    camera.position.y = damp(camera.position.y, targetY, 3, dt);
    camera.position.z = damp(camera.position.z, targetZ, 2.5, dt);
    camera.lookAt(0, scroll * -1.2, -2);
  });

  return null;
}

/* ----------------------------------------------------------------------------
 * Experience — the full scene graph.
 * -------------------------------------------------------------------------- */
function Experience({ palette, perf }: { palette: Palette; perf: Perf }) {
  const { scene } = useThree();

  useEffect(() => {
    scene.fog = new THREE.FogExp2(palette.fog.getHex(), 0.028);
    return () => {
      scene.fog = null;
    };
  }, [scene, palette]);

  return (
    <>
      <ambientLight intensity={palette.ambient} />
      <directionalLight
        position={[6, 8, 6]}
        intensity={1.1}
        color={palette.lightA}
      />
      {perf.lights >= 2 && (
        <pointLight
          position={[-7, -3, 4]}
          intensity={1.4}
          color={palette.lightB}
        />
      )}
      {perf.lights >= 3 && (
        <pointLight position={[0, 0, 2]} intensity={0.8} color={palette.core} />
      )}

      <Rig />
      <WireCore palette={palette} />
      <CrystalCluster palette={palette} count={perf.crystals} pbr={perf.pbr} />
      <Starfield
        palette={palette}
        count={perf.particles}
        cpuDrift={perf.cpuDrift}
      />
      {perf.grid && (
        <GridFloor
          palette={palette}
          divisions={perf.gridDiv}
          cpuWarp={perf.cpuWarp}
        />
      )}
    </>
  );
}

/* ----------------------------------------------------------------------------
 * Scene3D — public component. Owns the fixed layer, input listeners, theme
 * detection, and the Canvas.
 * -------------------------------------------------------------------------- */
export default function Scene3D() {
  const inputRef = useRef<LiveInput>({
    px: 0,
    py: 0,
    scroll: 0,
    reduced: false,
  });
  const [tier, setTier] = useState<Tier>("desktop");
  const [enabled, setEnabled] = useState(true);
  // Pause the render loop while the tab is hidden to save battery/GPU.
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");

  // Capability + motion preferences.
  useEffect(() => {
    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyReduced = () => {
      inputRef.current.reduced = reducedMq.matches;
    };
    applyReduced();
    reducedMq.addEventListener("change", applyReduced);

    const resize = () => setTier(detectTier());
    resize();
    window.addEventListener("resize", resize);

    const onVis = () => setFrameloop(document.hidden ? "never" : "always");
    document.addEventListener("visibilitychange", onVis);

    // Bail out entirely if WebGL is unavailable.
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!gl) setEnabled(false);
    } catch {
      setEnabled(false);
    }

    return () => {
      reducedMq.removeEventListener("change", applyReduced);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Pointer + scroll listeners (passive, throttled by rAF read in the loop).
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      inputRef.current.px = (e.clientX / window.innerWidth) * 2 - 1;
      inputRef.current.py = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      inputRef.current.scroll = max > 0 ? window.scrollY / max : 0;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Landing page is dark-only.
  const palette = useMemo(() => makePalette(true), []);
  const perf = PERF[tier];

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* CSS base wash — visible instantly and behind the transparent canvas. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#05070f] via-[#070b18] to-[#0b0a14]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(56,189,248,0.16),transparent_55%),radial-gradient(circle_at_80%_85%,rgba(167,139,250,0.16),transparent_55%)]" />

      {enabled && (
        <InputContext.Provider value={inputRef}>
          <Canvas
            // Remount when the tier changes so antialias (a creation-only GL
            // option) and DPR are rebuilt for the new device profile.
            key={tier}
            className="!absolute inset-0"
            frameloop={frameloop}
            dpr={[1, perf.dprMax]}
            gl={{
              alpha: true,
              antialias: perf.antialias,
              powerPreference: "high-performance",
            }}
            camera={{ position: [0, 0.4, 11], fov: 60 }}
            onCreated={({ gl }) => gl.setClearAlpha(0)}
          >
            <Experience palette={palette} perf={perf} />
          </Canvas>
        </InputContext.Provider>
      )}

      {/* Soft vignette to keep text legible over the busiest center area. */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_45%,rgba(5,7,15,0.5)_100%)]" />
    </div>
  );
}

// motion.js — how the streetwear *floats*. This is the soul of the piece.
//
// Two layers:
//   1. ambientFloat()  — always-on idle motion (bob + slow tumble). Done for you.
//   2. scrollPhysics() — how the SCROLL VELOCITY pushes the objects around.
//                        THIS IS YOUR CONTRIBUTION (see the TODO below).
//
// Each product carries `userData.floatSeed` so no two move in lockstep.

// Smoothed scroll velocity, updated by main.js each frame. Positive = scrolling
// down the corridor, negative = back up. Magnitude ~0..3 in practice.
export const scrollState = { velocity: 0 };

// Layer 1 — ambient idle motion. Gentle, eternal, museum-quiet.
function ambientFloat(product, t, seed) {
  product.position.y = product.userData.baseY + Math.sin(t * 0.7 + seed) * 0.18;
  product.rotation.y = t * 0.18 + seed;                 // slow continuous turn
  product.rotation.x = Math.sin(t * 0.4 + seed) * 0.08; // subtle nodding tilt
}

// Layer 2 — scroll-reactive physics.  <<< YOUR CODE GOES HERE >>>
//
// Goal: make the objects feel like they have MASS and DRAG — when the user
// scrolls fast, the products should lag, sway, and settle, like a pendant
// swinging on a chain inside a moving elevator. When scroll stops, they ease
// back to rest. This is what separates "premium cinematic" from "spinning cube".
//
// You're given:
//   product : the THREE.Object3D (read product.userData.sway = current angle)
//   v       : smoothed scroll velocity this frame (signed, ~ -3..3)
//   dt      : seconds since last frame (~0.016)
//
// Design choices that are genuinely yours to make:
//   • STIFFNESS — how hard it springs back to center (low = loose & dreamy,
//     high = tight & snappy). Try 4..14.
//   • DAMPING   — how fast the wobble dies (low = oscillates for ages / chaotic,
//     high = overdamped / dead). Try 1..6.
//   • how scroll velocity maps to force (linear? clamped? squared for drama?)
//   • which axis the sway drives (rotation.z reads as a hanging pendulum;
//     position.x reads as drift/parallax).
//
// A spring-damper integrator is a great fit:
//     force = -STIFFNESS * sway  -  DAMPING * swayVel  +  (scroll push)
//     swayVel += force * dt;  sway += swayVel * dt
//
// "Luxury silk" tuning: soft overshoot, ~0.6s settle. Dropping STIFFNESS or
// raising DAMPING makes it more underwater; the inverse makes it athletic.
const STIFFNESS = 8.0;
const DAMPING   = 3.0;
const PUSH      = 0.55;
// Signed-square mapping: slow drift stays calm, hard flicks hit dramatically.
// Clamp absolute velocity so a frame-spike (tab refocus) can't catapult the object.
function force(v) {
  const clamped = Math.max(-3, Math.min(3, v));
  return Math.sign(clamped) * clamped * clamped * PUSH;
}
function scrollPhysics(product, v, dt) {
  // Per-product phase: same physics, different timing, so the swarm desyncs.
  const seed = product.userData.floatSeed ?? 0;
  const mass = 0.85 + 0.30 * Math.sin(seed * 1.7);   // 0.55..1.15, varies springback
  const k = STIFFNESS / mass;
  const c = DAMPING   / Math.sqrt(mass);
  // Clamp dt — tab-switches return dt of seconds, which would explode integration.
  const h = Math.min(dt, 1 / 30);

  // Sway state (pendulum angle, primary read).
  let s  = product.userData.sway    ?? 0;
  let sv = product.userData.swayVel ?? 0;
  const fS = -k * s - c * sv + force(v);
  sv += fS * h;
  s  += sv * h;
  product.userData.sway    = s;
  product.userData.swayVel = sv;

  // Drift state (lateral parallax, secondary read — weaker, slightly slower).
  let d  = product.userData.drift    ?? 0;
  let dv = product.userData.driftVel ?? 0;
  const fD = -k * 0.6 * d - c * 1.2 * dv + force(v) * 0.35;
  dv += fD * h;
  d  += dv * h;
  product.userData.drift    = d;
  product.userData.driftVel = dv;

  // Apply: rotation.z = pendulum, position.x = drift (additive — preserve baseX).
  if (product.userData.baseX === undefined) product.userData.baseX = product.position.x;
  product.rotation.z = s;
  product.position.x = product.userData.baseX + d * 0.7;
}

// Public entry point — main.js calls this for every product each frame.
export function updateProduct(product, t, dt) {
  if (product.userData.baseY === undefined) product.userData.baseY = product.position.y;
  const seed = product.userData.floatSeed ?? 0;
  ambientFloat(product, t, seed);
  scrollPhysics(product, scrollState.velocity, dt);

  // Finale cluster gets an extra orbital flourish.
  if (product.userData.cluster) product.rotation.y = t * 0.12;
}

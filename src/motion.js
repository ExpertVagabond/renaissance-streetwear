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
function scrollPhysics(product, v, dt) {
  // --- placeholder so the scene runs: a flat, lifeless lean. Replace me. ---
  const target = v * 0.12;
  product.userData.sway = (product.userData.sway ?? 0) + (target - (product.userData.sway ?? 0)) * 0.08;
  product.rotation.z = product.userData.sway;

  // TODO(you): implement the spring-damper above for real weight & overshoot.
  // Tune STIFFNESS / DAMPING until a hard flick makes it swing past center and
  // settle — that overshoot is the whole illusion of mass.
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

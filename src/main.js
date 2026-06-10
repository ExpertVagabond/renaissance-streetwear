// main.js — orchestration. Boots the stage, builds the world, runs the loop.
import * as THREE from 'three';
import { createStage, updateDust } from './scene.js';
import { buildWorld } from './world.js';
import { initScroll } from './scroll.js';
import { updateProduct, scrollState } from './motion.js';

const canvas = document.getElementById('stage');
const veil = document.getElementById('veil');
const veilBar = veil.querySelector('.veil__bar i');
const roomIndexEl = document.getElementById('roomIndex');

// --- Asset loading feedback (TextureLoader/GLTFLoader use this manager) ---
THREE.DefaultLoadingManager.onProgress = (_url, loaded, total) => {
  veilBar.style.width = `${Math.round((loaded / total) * 100)}%`;
};
function revealGallery() {
  veilBar.style.width = '100%';
  veil.classList.add('hidden');
}
// Hide the veil whether assets resolve or a CDN image 404s — never trap the user.
THREE.DefaultLoadingManager.onLoad = revealGallery;
setTimeout(revealGallery, 4000); // safety net

// --- Build everything ---
const stage = createStage(canvas);
const world = buildWorld(stage.scene);

const totalRooms = world.rooms.length - 1; // finale isn't numbered in the HUD
function setRoom(i) {
  const shown = Math.min(i, totalRooms);
  roomIndexEl.textContent =
    `${String(shown).padStart(2, '0')} / ${String(totalRooms).padStart(2, '0')}`;
}

const lenis = initScroll({
  camera: stage.camera,
  rooms: world.rooms,
  spacing: world.spacing,
  onRoom: setRoom,
});

// --- Render loop ---
const clock = new THREE.Clock();
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function frame() {
  requestAnimationFrame(frame);
  const t = clock.getElapsedTime();
  const dt = Math.min(clock.getDelta(), 0.05); // clamp after tab-switch stalls

  // Smooth Lenis's instantaneous velocity so the physics doesn't jitter.
  const raw = lenis?.velocity ?? 0;
  scrollState.velocity += (raw - scrollState.velocity) * 0.15;

  if (!reduceMotion) {
    for (const product of world.products) updateProduct(product, t, dt);
    updateDust(stage.dust, t);

    // Living light: the key lamp flickers like a candle.
    stage.lights.key.intensity = 60 + Math.sin(t * 7.3) * 4 + Math.sin(t * 13.1) * 2;
  }

  stage.composer.render();
}
frame();

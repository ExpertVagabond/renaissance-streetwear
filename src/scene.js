// scene.js — the WebGL stage: renderer, camera, atmosphere, post-processing.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  // Warm umber fog — distant rooms dissolve into candle-lit haze.
  const fogColor = new THREE.Color('#1a120c');
  scene.background = fogColor;
  scene.fog = new THREE.FogExp2(fogColor, 0.018);

  const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / window.innerHeight,
    0.1,
    400,
  );
  camera.position.set(0, 1.2, 12);

  // ---- Lighting: chiaroscuro. One warm key, a cool fill, a gilded rim. ----
  const ambient = new THREE.AmbientLight('#3a2a1c', 0.6);
  scene.add(ambient);

  const key = new THREE.PointLight('#ffd9a0', 60, 60, 2);
  key.position.set(4, 6, 6);
  scene.add(key);

  const rim = new THREE.PointLight('#c9a24b', 40, 50, 2);
  rim.position.set(-6, 2, -4);
  scene.add(rim);

  const fill = new THREE.DirectionalLight('#5a6b8a', 0.4);
  fill.position.set(-3, -2, 5);
  scene.add(fill);

  // ---- Floating dust motes: a Points cloud drifting in the volume ----
  const dust = createDust();
  scene.add(dust);

  // ---- Post-processing: bloom for the gilded, candle-glow look ----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.85,  // strength
    0.7,   // radius
    0.18,  // threshold — only bright highlights bloom
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---- Resize handling ----
  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  return { renderer, scene, camera, composer, dust, lights: { key, rim, fill } };
}

// A cloud of slow-drifting particles. Each gets a random base position; we
// animate them gently in the render loop (see main.js).
function createDust(count = 1400) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 2] = -Math.random() * 90 + 10;
    speeds[i] = 0.2 + Math.random() * 0.8;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));

  const mat = new THREE.PointsMaterial({
    color: '#e8c982',
    size: 0.06,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

// Called each frame to make the dust breathe.
export function updateDust(dust, t) {
  const pos = dust.geometry.attributes.position;
  const spd = dust.geometry.attributes.speed;
  for (let i = 0; i < pos.count; i++) {
    const base = pos.array[i * 3 + 1];
    pos.array[i * 3 + 1] = base + Math.sin(t * spd.array[i] + i) * 0.004;
  }
  pos.needsUpdate = true;
  dust.rotation.y = t * 0.01;
}

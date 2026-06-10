// world.js — builds the gallery: painting backdrops + floating streetwear,
// arranged as a corridor of "rooms" receding down the -Z axis.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ROOM_SPACING = 18;        // distance between rooms along -Z
const texLoader = new THREE.TextureLoader();
texLoader.crossOrigin = 'anonymous';
const gltfLoader = new GLTFLoader();

// Public-domain renaissance paintings, served straight from upload.wikimedia.org
// which sends `Access-Control-Allow-Origin: *` so the bitmap is usable as a WebGL
// texture. (Special:FilePath would 302-redirect, and the redirect hop lacks the
// CORS header — the browser blocks that, so we use the direct hashed thumb URLs.)
const UP = 'https://upload.wikimedia.org/wikipedia/commons/thumb';
const ROOMS = [
  {
    painting: `${UP}/0/0b/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg/1280px-Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg`,
    tint: '#f0d8b0', build: buildSneaker, model: 'venus-sneaker',
  },
  {
    painting: `${UP}/5/5b/Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg/1280px-Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg`,
    tint: '#cfe0e8', build: buildSkateboard, model: 'adam-board',
  },
  {
    painting: `${UP}/9/93/Leonardo_da_Vinci_-_Annunciazione_-_Google_Art_Project.jpg/1280px-Leonardo_da_Vinci_-_Annunciazione_-_Google_Art_Project.jpg`,
    tint: '#e0d2b8', build: buildShoppingBag, model: 'annunciation-bag',
  },
  {
    painting: `${UP}/0/08/Leonardo_da_Vinci_%281452-1519%29_-_The_Last_Supper_%281495-1498%29.jpg/1280px-Leonardo_da_Vinci_%281452-1519%29_-_The_Last_Supper_%281495-1498%29.jpg`,
    tint: '#d8c4a0', build: buildSneaker, model: 'last-supper-sneaker',
  },
  {
    painting: `${UP}/0/0b/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg/1280px-Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg`,
    tint: '#f0d8b0', build: buildFinaleCluster, model: 'finale',
  },
];

export function buildWorld(scene) {
  const products = [];   // animated objects
  const rooms = [];      // { group, z, index }

  ROOMS.forEach((room, i) => {
    const z = -i * ROOM_SPACING;
    const group = new THREE.Group();
    group.position.z = z;

    // --- Backdrop: the painting on a softly-lit plane, gilt-framed ---
    const backdrop = buildBackdrop(room.painting, room.tint);
    backdrop.position.set(0, 1.2, -7);
    group.add(backdrop);

    // --- Product: procedural placeholder, upgraded by GLTF if present ---
    const product = room.build();
    product.position.set(0, 1.0, 0);
    product.userData.floatSeed = i * 1.37;     // phase offset so rooms differ
    group.add(product);
    products.push(product);

    tryLoadModel(room.model, product);

    scene.add(group);
    rooms.push({ group, z, index: i });
  });

  return { products, rooms, spacing: ROOM_SPACING };
}

// Painting plane + emissive backlight glow + thin gold frame.
function buildBackdrop(url, tint) {
  const g = new THREE.Group();
  const W = 11, H = 7;

  const mat = new THREE.MeshStandardMaterial({
    color: '#1a130c',
    emissive: new THREE.Color(tint),
    emissiveIntensity: 0.12,
    roughness: 0.9,
    metalness: 0.0,
  });
  texLoader.load(
    url,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      mat.map = tex;
      mat.emissiveMap = tex;
      mat.emissiveIntensity = 0.35;
      mat.color.set('#ffffff');
      mat.needsUpdate = true;
    },
    undefined,
    () => { /* keep the warm fallback plane on error */ },
  );
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat);
  g.add(plane);

  // Gilt frame
  const frameMat = new THREE.MeshStandardMaterial({ color: '#c9a24b', metalness: 1, roughness: 0.35 });
  const t = 0.25;
  const bars = [
    [W + t * 2, t, 0, H / 2 + t / 2], [W + t * 2, t, 0, -H / 2 - t / 2],
    [t, H, W / 2 + t / 2, 0],        [t, H, -W / 2 - t / 2, 0],
  ];
  bars.forEach(([bw, bh, x, y]) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.3), frameMat);
    bar.position.set(x, y, 0.05);
    g.add(bar);
  });
  return g;
}

// Register the basenames of real exports you've dropped in src/models/ here.
// Anything NOT listed keeps its procedural placeholder (and skips a 404).
//   e.g.  const AVAILABLE_MODELS = new Set(['venus-sneaker', 'adam-board']);
const AVAILABLE_MODELS = new Set([]);

// If a real Blender/Spline export exists, swap it in for the placeholder.
function tryLoadModel(name, placeholder) {
  if (!AVAILABLE_MODELS.has(name)) return; // no file shipped → keep placeholder
  gltfLoader.load(
    `./src/models/${name}.glb`,
    (gltf) => {
      const model = gltf.scene;
      // Normalize scale to the placeholder's footprint.
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3(); box.getSize(size);
      const target = 2.4 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(target);
      placeholder.clear();
      placeholder.add(model);
    },
    undefined,
    () => { /* no model file — procedural placeholder stays */ },
  );
}

/* ----------------------------------------------------------------------------
 * Procedural streetwear placeholders. Stylized, gold-accented, deliberately
 * sculptural so the scene reads as intentional until real GLTFs land.
 * ------------------------------------------------------------------------- */

function matte(color, metal = 0.1, rough = 0.6) {
  return new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough });
}

function buildSneaker() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.4, 8, 16), matte('#f4ece0', 0.05, 0.5));
  body.rotation.z = Math.PI / 2;
  body.scale.set(1, 0.7, 0.9);
  g.add(body);
  const sole = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 1.1), matte('#c9a24b', 0.9, 0.3));
  sole.position.y = -0.55;
  g.add(sole);
  const swoosh = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 8, 20, Math.PI), matte('#5a1f1a', 0.2, 0.5));
  swoosh.position.set(0.1, 0, 0.46);
  swoosh.rotation.z = -0.4;
  g.add(swoosh);
  return g;
}

function buildSkateboard() {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.9), matte('#3a2416', 0.1, 0.7));
  // gentle concave illusion via rounded ends
  const ends = [-1.6, 1.6];
  ends.forEach((x) => {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.9, 16, 1, false, 0, Math.PI), matte('#3a2416', 0.1, 0.7));
    cap.rotation.x = Math.PI / 2; cap.rotation.z = Math.PI / 2;
    cap.position.set(x, 0, 0);
    cap.scale.set(0.27, 1, 1);
    g.add(cap);
  });
  g.add(deck);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.13, 0.18), matte('#c9a24b', 0.9, 0.3));
  stripe.position.y = 0.005; g.add(stripe);
  [-1.0, 1.0].forEach((x) => {
    const truck = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 1.0), matte('#c9a24b', 1, 0.3));
    truck.position.set(x, -0.18, 0); g.add(truck);
    [-0.4, 0.4].forEach((z) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 18), matte('#f4ece0', 0.1, 0.5));
      wheel.rotation.x = Math.PI / 2; wheel.position.set(x, -0.32, z); g.add(wheel);
    });
  });
  g.rotation.x = -0.25;
  return g;
}

function buildShoppingBag() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 1.1), matte('#efe6d4', 0.05, 0.85));
  g.add(body);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.12, 1.16), matte('#c9a24b', 0.9, 0.3));
  lip.position.y = 1.0; g.add(lip);
  // rope handles
  [-0.4, 0.4].forEach((x) => {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 8, 24, Math.PI), matte('#3a2416', 0.2, 0.6));
    handle.position.set(x, 1.05, 0); g.add(handle);
  });
  return g;
}

// The finale: a slow orbiting cluster of all three archetypes.
function buildFinaleCluster() {
  const g = new THREE.Group();
  const a = buildSneaker(); a.scale.setScalar(0.6); a.position.set(-2, 0.5, -1); g.add(a);
  const b = buildSkateboard(); b.scale.setScalar(0.6); b.position.set(2, -0.5, 0); g.add(b);
  const c = buildShoppingBag(); c.scale.setScalar(0.6); c.position.set(0, 0, 1.5); g.add(c);
  g.userData.cluster = true;
  return g;
}

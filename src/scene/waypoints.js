import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

/**
 * Procedural planet waypoints with unique terrain and orbiting satellites.
 * Satellites use the loaded Satellite2.obj model with PBR textures.
 * Each section gets a distinct planet character:
 *   home      — Earth-like (ocean + green landmass)
 *   about     — Lush jungle world (teal ocean + dense green)
 *   services  — Volcanic/desert (lava flows + rocky terrain)
 *   software  — Crystalline tech world (purple + glowing circuits)
 *   portfolio — Exotic pink/coral alien world
 *   contact   — Ice world (frozen oceans + glaciers)
 */

// ── Preload satellite model + textures ─────────────────
let _satelliteTemplate = null;
let _satelliteReady = false;
let _pendingSatellites = []; // satellites waiting for model to load

const textureLoader = new THREE.TextureLoader();
const satTextures = {
  albedo: textureLoader.load('/models/satellite/textures/Satellite2_albedo.jpg'),
  metallic: textureLoader.load('/models/satellite/textures/Satellite2_metallic.jpg'),
  normal: textureLoader.load('/models/satellite/textures/Satellite2_normal.png'),
  roughness: textureLoader.load('/models/satellite/textures/Satellite2_roughness.jpg'),
};

function _applyModelToSatellite(group, color) {
  // Remove all children except the blinker light
  const blinker = group.children.find(c => c.userData && c.userData.isBlinker);
  const toRemove = group.children.filter(c => c !== blinker);
  toRemove.forEach(c => group.remove(c));

  // Clone and add the loaded model
  const clone = _satelliteTemplate.clone();
  clone.traverse((child) => {
    if (child.isMesh) {
      child.material = child.material.clone();
      child.material.emissive = new THREE.Color(color);
      child.material.emissiveIntensity = 0.15;
    }
  });
  group.add(clone);
}

const objLoader = new OBJLoader();
objLoader.load(
  '/models/satellite/source/Satellite2.obj',
  (obj) => {
    // Apply PBR material to every mesh
    obj.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: satTextures.albedo,
          metalnessMap: satTextures.metallic,
          metalness: 1.0,
          normalMap: satTextures.normal,
          roughnessMap: satTextures.roughness,
          roughness: 1.0,
        });
      }
    });

    // Normalize size — target ~0.3 units span
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const s = 0.3 / maxDim;
    obj.scale.setScalar(s);

    // Center
    const center = new THREE.Vector3();
    box.getCenter(center);
    obj.position.sub(center.multiplyScalar(s));

    _satelliteTemplate = obj;
    _satelliteReady = true;

    // Retroactively replace all pending procedural satellites with the loaded model
    _pendingSatellites.forEach(({ group, color }) => {
      _applyModelToSatellite(group, color);
    });
    _pendingSatellites = [];

    console.log('✦ Satellite OBJ model loaded — replaced all procedural satellites');
  },
  undefined,
  (err) => {
    console.warn('⚠ Could not load satellite OBJ, keeping procedural fallback:', err.message);
  }
);

// ── Planet shader (procedural surface) ─────────────────
const planetVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Simplex-style noise baked into the fragment shader
const planetFragmentShader = `
  uniform vec3 uColor1;     // ocean / base
  uniform vec3 uColor2;     // land / secondary
  uniform vec3 uColor3;     // accent (ice caps, lava, glow)
  uniform float uTime;
  uniform float uSeed;
  uniform float uStyle;     // 0=earthlike 1=volcanic 2=ice 3=crystal 4=alien

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  // Simple 3D hash noise
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 pos = vPosition * 3.0 + uSeed;

    // Continent noise
    float n = fbm(pos * 1.2);
    float n2 = fbm(pos * 2.5 + 10.0);
    float n3 = fbm(pos * 0.8 + 20.0);

    // Ice caps at poles
    float pole = abs(vNormal.y);
    float iceCap = smoothstep(0.75, 0.9, pole);

    vec3 col;

    if (uStyle < 0.5) {
      // Earthlike — ocean vs land
      float land = smoothstep(0.42, 0.48, n);
      col = mix(uColor1, uColor2, land);
      // Mountain highlights on land
      float mountain = smoothstep(0.6, 0.7, n2) * land;
      col = mix(col, uColor2 * 1.4, mountain * 0.4);
      // Ice caps
      col = mix(col, uColor3, iceCap);
    } else if (uStyle < 1.5) {
      // Volcanic — dark rock with lava veins
      float rock = fbm(pos * 3.0);
      col = mix(uColor1, uColor2, rock);
      // Lava cracks
      float lava = smoothstep(0.48, 0.50, sin(n * 20.0) * 0.5 + 0.5);
      col = mix(col, uColor3, lava * 0.7);
      // Crater-like dark spots
      float crater = smoothstep(0.6, 0.62, n2);
      col = mix(col, uColor1 * 0.3, crater * 0.5);
    } else if (uStyle < 2.5) {
      // Ice world — frozen terrain
      float ice = fbm(pos * 1.5);
      col = mix(uColor1, uColor2, ice);
      // Glacier cracks
      float crack = smoothstep(0.45, 0.47, sin(n * 15.0) * 0.5 + 0.5);
      col = mix(col, uColor3, crack * 0.5);
      // Extra ice everywhere
      col = mix(col, uColor3, iceCap * 0.8 + 0.2);
    } else if (uStyle < 3.5) {
      // Crystal/tech — circuit-like patterns
      float circuit = smoothstep(0.48, 0.50, sin(n * 25.0) * 0.5 + 0.5);
      float circuit2 = smoothstep(0.48, 0.50, sin(n2 * 20.0) * 0.5 + 0.5);
      col = mix(uColor1, uColor2, n);
      // Glowing grid lines
      float glow = max(circuit, circuit2) * (0.7 + 0.3 * sin(uTime * 2.0));
      col = mix(col, uColor3, glow * 0.8);
    } else {
      // Alien / exotic — swirling organic
      float swirl = fbm(pos * 1.8 + vec3(n * 2.0));
      col = mix(uColor1, uColor2, swirl);
      float spots = smoothstep(0.55, 0.58, n2);
      col = mix(col, uColor3, spots * 0.6);
      // Faint bioluminescent pulse
      col += uColor3 * 0.1 * (0.5 + 0.5 * sin(uTime * 1.5 + n * 10.0));
    }

    // Atmosphere rim lighting
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    rim = pow(rim, 3.0);
    col += mix(uColor1, uColor3, 0.5) * rim * 0.6;

    // Simple diffuse shading
    float diffuse = max(dot(vNormal, normalize(vec3(1.0, 0.5, 0.8))), 0.0);
    col *= 0.4 + 0.6 * diffuse;

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── Atmosphere glow shader ────────────────────────────
const atmosphereVertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 uAtmoColor;
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
    gl_FragColor = vec4(uAtmoColor, intensity * 0.6);
  }
`;

// ── Cloud / weather layer shader ─────────────────────
const cloudVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const cloudFragmentShader = `
  uniform float uTime;
  uniform float uSeed;
  uniform float uWeatherType;   // 0=calm clouds, 1=storm, 2=violent storm
  uniform vec3  uCloudColor;
  uniform float uCoverage;      // 0.0–1.0 how much cloud cover
  uniform float uLightning;     // 0.0–1.0 current lightning flash
  uniform vec3  uLightningPos;  // normalized surface point of strike

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 pos = vPosition * 3.0 + uSeed + 100.0;  // offset from planet seed

    // Scrolling wind — clouds drift across the surface
    float windSpeed = 0.02 + uWeatherType * 0.03;
    vec3 windOffset = vec3(uTime * windSpeed, 0.0, uTime * windSpeed * 0.7);

    // Base cloud pattern
    float clouds = fbm(pos * 1.5 + windOffset);

    // Storm swirl effect — rotating vortex for storms
    if (uWeatherType > 0.5) {
      float swirlSpeed = 0.08 * uWeatherType;
      float angle = uTime * swirlSpeed;
      float lat = asin(clamp(vNormal.y, -1.0, 1.0));
      float lon = atan(vNormal.z, vNormal.x);

      // Storm eye near equator — swirling bands
      float stormLat = sin(uSeed * 2.0) * 0.4;
      float stormLon = cos(uSeed * 3.0) * 3.14;
      float distToStorm = length(vec2(lat - stormLat, lon - stormLon));
      float stormInfluence = smoothstep(1.5, 0.2, distToStorm);

      // Spiral cloud bands
      float spiral = sin(lon * 3.0 + lat * 5.0 + angle * 4.0) * 0.5 + 0.5;
      clouds = mix(clouds, clouds * 0.5 + spiral * 0.5, stormInfluence);

      // Denser clouds in storms
      clouds = mix(clouds, clouds * 1.3 + 0.1, stormInfluence * uWeatherType * 0.4);
    }

    // Apply coverage threshold
    float threshold = 1.0 - uCoverage;
    float alpha = smoothstep(threshold, threshold + 0.15, clouds);

    // Wispy edges
    alpha *= smoothstep(threshold - 0.05, threshold + 0.2, clouds);

    // Cloud brightness — diffuse lighting
    float diffuse = max(dot(vNormal, normalize(vec3(1.0, 0.5, 0.8))), 0.0);
    vec3 col = uCloudColor * (0.6 + 0.4 * diffuse);

    // Lightning flash — localized bright spot on storm clouds
    if (uLightning > 0.01) {
      float distToStrike = length(vNormal - uLightningPos);
      float spotFalloff = smoothstep(0.9, 0.0, distToStrike);  // tight radial falloff
      float flash = uLightning * spotFalloff * alpha;
      col = mix(col, vec3(1.0, 1.0, 0.95), flash * 0.85);
      alpha = min(1.0, alpha + flash * 0.4);
    }

    // Atmospheric scattering at rim
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    alpha *= 1.0 - pow(rim, 3.0) * 0.5;

    gl_FragColor = vec4(col, alpha * 0.65);
  }
`;

/**
 * Create a satellite — uses loaded OBJ model if available, procedural fallback otherwise.
 * If model isn't loaded yet, creates procedural and queues for replacement once model arrives.
 */
function createSatellite(color) {
  const group = new THREE.Group();
  group.userData.satColor = color;

  if (_satelliteReady && _satelliteTemplate) {
    // Model already loaded — use it directly
    const clone = _satelliteTemplate.clone();
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.emissive = new THREE.Color(color);
        child.material.emissiveIntensity = 0.15;
      }
    });
    group.add(clone);
  } else {
    // Procedural fallback — will be replaced when model loads
    const bodyGeo = new THREE.BoxGeometry(0.12, 0.06, 0.06);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x888899, emissive: color, emissiveIntensity: 0.3, metalness: 0.8, roughness: 0.3,
    });
    group.add(new THREE.Mesh(bodyGeo, bodyMat));

    const panelGeo = new THREE.PlaneGeometry(0.2, 0.08);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x2244aa, emissive: color, emissiveIntensity: 0.15, metalness: 0.9, roughness: 0.2, side: THREE.DoubleSide,
    });
    const panelL = new THREE.Mesh(panelGeo, panelMat);
    panelL.position.x = -0.16;
    panelL.rotation.y = Math.PI / 2;
    group.add(panelL);
    const panelR = new THREE.Mesh(panelGeo, panelMat);
    panelR.position.x = 0.16;
    panelR.rotation.y = Math.PI / 2;
    group.add(panelR);

    // Queue for replacement once model loads
    _pendingSatellites.push({ group, color });
  }

  // Blinking light on top (always added)
  const lightGeo = new THREE.SphereGeometry(0.015, 6, 6);
  const lightMat = new THREE.MeshBasicMaterial({ color: color });
  const light = new THREE.Mesh(lightGeo, lightMat);
  light.position.y = 0.13;
  light.userData.isBlinker = true;
  group.add(light);

  return group;
}

/**
 * Create a quest beacon — a thin pole planted on the planet surface with a glowing orb on top.
 * Designed to look like a signal beacon / antenna stick.
 */
function _createQuestPin(color) {
  const pinGroup = new THREE.Group();
  const c = new THREE.Color(color);

  // ── Pole / stick (thin cylinder) ─────────────────────
  const poleGeo = new THREE.CylinderGeometry(0.03, 0.05, 2.0, 6);
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x667788,
    emissive: c,
    emissiveIntensity: 0.15,
    metalness: 0.8,
    roughness: 0.3,
  });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 1.0;  // half pole height
  pinGroup.add(pole);

  // ── Base ring (sits on the surface) ──────────────────
  const baseGeo = new THREE.TorusGeometry(0.15, 0.03, 6, 12);
  const baseMat = new THREE.MeshStandardMaterial({
    color: c,
    emissive: c,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.7,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.rotation.x = Math.PI / 2;
  base.position.y = 0.02;
  pinGroup.add(base);

  // ── Glowing orb on top ───────────────────────────────
  const orbGeo = new THREE.SphereGeometry(0.2, 12, 12);
  const orbMat = new THREE.MeshStandardMaterial({
    color: c,
    emissive: c,
    emissiveIntensity: 1.0,
    metalness: 0.2,
    roughness: 0.1,
    transparent: true,
    opacity: 0.95,
  });
  const orb = new THREE.Mesh(orbGeo, orbMat);
  orb.position.y = 2.1;
  orb.userData.isBeaconOrb = true;
  pinGroup.add(orb);

  // ── Pulse halo ring around orb ───────────────────────
  const ringGeo = new THREE.TorusGeometry(0.35, 0.025, 8, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: c,
    transparent: true,
    opacity: 0.4,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 2.1;
  ring.userData.isRing = true;
  pinGroup.add(ring);

  // ── Point light for glow ─────────────────────────────
  const glow = new THREE.PointLight(color, 1.5, 8);
  glow.position.y = 2.1;
  pinGroup.add(glow);

  // Mark all child meshes as quest pin parts for raycasting
  pinGroup.traverse(child => {
    if (child.isMesh) {
      child.userData.isQuestPin = true;
    }
  });

  return pinGroup;
}

export function createWaypoints(scene) {
  const waypointData = [
    {
      name: 'home', pos: [0, 0, 0], color: 0x4488ff,
      color1: [0.1, 0.25, 0.55],   // deep ocean
      color2: [0.2, 0.55, 0.15],   // green land
      color3: [0.9, 0.95, 1.0],    // ice caps
      style: 0, seed: 1.0, satellites: 2,
      weather: { type: 0, coverage: 0.45, cloudColor: [0.9, 0.92, 0.95], lightning: false },
    },
    {
      name: 'about', pos: [60, 10, -35], color: 0x44ffaa,
      color1: [0.05, 0.3, 0.35],   // teal ocean
      color2: [0.1, 0.6, 0.25],    // jungle green
      color3: [0.5, 1.0, 0.7],     // bright highlights
      style: 0, seed: 7.0, satellites: 3,
      weather: { type: 1, coverage: 0.55, cloudColor: [0.8, 0.85, 0.8], lightning: true },
    },
    {
      name: 'services', pos: [-50, -20, -85], color: 0xff8844,
      color1: [0.25, 0.12, 0.08],  // dark rock
      color2: [0.45, 0.2, 0.1],    // brown terrain
      color3: [1.0, 0.4, 0.05],    // lava orange
      style: 1, seed: 13.0, satellites: 2,
      weather: { type: 2, coverage: 0.6, cloudColor: [0.5, 0.3, 0.2], lightning: true },
    },
    {
      name: 'software', pos: [30, 40, -155], color: 0xaa44ff,
      color1: [0.15, 0.05, 0.3],   // deep purple
      color2: [0.25, 0.1, 0.45],   // mid purple
      color3: [0.6, 0.3, 1.0],     // glowing violet
      style: 3, seed: 19.0, satellites: 4,
      weather: { type: 0, coverage: 0.3, cloudColor: [0.7, 0.6, 0.9], lightning: false },
    },
    {
      name: 'portfolio', pos: [-80, -10, -225], color: 0xff4488,
      color1: [0.35, 0.08, 0.2],   // dark coral
      color2: [0.7, 0.2, 0.4],     // pink land
      color3: [1.0, 0.5, 0.7],     // bright pink
      style: 4, seed: 31.0, satellites: 2,
      weather: { type: 1, coverage: 0.5, cloudColor: [0.9, 0.7, 0.8], lightning: false },
    },
    {
      name: 'contact', pos: [0, 60, -305], color: 0x44ddff,
      color1: [0.15, 0.25, 0.4],   // frozen ocean
      color2: [0.5, 0.65, 0.75],   // ice terrain
      color3: [0.85, 0.95, 1.0],   // bright ice
      style: 2, seed: 37.0, satellites: 1,
      weather: { type: 2, coverage: 0.7, cloudColor: [0.75, 0.8, 0.85], lightning: true },
    },
  ];

  const waypoints = [];

  waypointData.forEach((data) => {
    const { name, pos, color, color1, color2, color3, style, seed, satellites, weather } = data;
    const group = new THREE.Group();
    group.position.set(pos[0], pos[1], pos[2]);

    // ── Planet sphere ──────────────────────────────────
    const planetGeo = new THREE.SphereGeometry(2.0, 64, 64);
    const planetMat = new THREE.ShaderMaterial({
      vertexShader: planetVertexShader,
      fragmentShader: planetFragmentShader,
      uniforms: {
        uColor1: { value: new THREE.Vector3(...color1) },
        uColor2: { value: new THREE.Vector3(...color2) },
        uColor3: { value: new THREE.Vector3(...color3) },
        uTime:   { value: 0 },
        uSeed:   { value: seed },
        uStyle:  { value: style },
      },
    });
    const planet = new THREE.Mesh(planetGeo, planetMat);
    planet.userData.isPlanet = true;
    group.add(planet);

    // ── Atmosphere glow ────────────────────────────────
    const atmoGeo = new THREE.SphereGeometry(2.25, 32, 32);
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms: {
        uAtmoColor: { value: new THREE.Color(color) },
      },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const atmosphere = new THREE.Mesh(atmoGeo, atmoMat);
    group.add(atmosphere);

    // ── Cloud / weather layer ──────────────────────────
    if (weather) {
      const cloudGeo = new THREE.SphereGeometry(2.08, 48, 48);
      const cloudMat = new THREE.ShaderMaterial({
        vertexShader: cloudVertexShader,
        fragmentShader: cloudFragmentShader,
        uniforms: {
          uTime:        { value: 0 },
          uSeed:        { value: seed },
          uWeatherType: { value: weather.type },
          uCloudColor:  { value: new THREE.Vector3(...weather.cloudColor) },
          uCoverage:    { value: weather.coverage },
          uLightning:   { value: 0.0 },
          uLightningPos: { value: new THREE.Vector3(0, 1, 0) },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
      });
      const cloudLayer = new THREE.Mesh(cloudGeo, cloudMat);
      cloudLayer.userData.isCloudLayer = true;
      cloudLayer.userData.hasLightning = weather.lightning;
      cloudLayer.userData.weatherType = weather.type;
      cloudLayer.userData.lightningTimer = 2 + seed;   // stagger initial timing
      cloudLayer.userData.lightningIntensity = 0;
      group.add(cloudLayer);
    }

    // ── Orbiting satellites ────────────────────────────
    for (let i = 0; i < satellites; i++) {
      const sat = createSatellite(color);
      const orbitRadius = 2.8 + i * 0.6;
      const orbitSpeed = 0.3 + i * 0.15;
      const startAngle = (Math.PI * 2 / satellites) * i;

      // Randomized orbit tilt — use seed + index for deterministic but varied angles
      const tiltSeed = seed * 7.3 + i * 13.7;
      const tiltX = (Math.sin(tiltSeed) * 0.5 + 0.5) * Math.PI * 0.6 + Math.PI * 0.2; // 36°–108° range
      const tiltZ = Math.cos(tiltSeed * 2.1) * Math.PI * 0.4; // ±72°

      // Pivot for orbiting
      const pivot = new THREE.Group();
      pivot.rotation.x = tiltX;
      pivot.rotation.z = tiltZ;
      sat.position.set(
        Math.cos(startAngle) * orbitRadius,
        0,
        Math.sin(startAngle) * orbitRadius
      );
      sat.userData.orbitRadius = orbitRadius;
      sat.userData.orbitSpeed = orbitSpeed;
      sat.userData.startAngle = startAngle;
      pivot.add(sat);
      pivot.userData.isPivot = true;
      group.add(pivot);
    }

    // ── Soft point light ──────────────────────────────
    const wpLight = new THREE.PointLight(color, 0.8, 25);
    group.add(wpLight);

    // ── Quest Pins (2-3 per planet, wrapped in rotating pivot) ──
    {
      const pinCount = 2 + Math.floor((seed * 3.7) % 2);  // 2 or 3 pins per planet
      const pinPivot = new THREE.Group();
      pinPivot.userData.isQuestPinPivot = true;
      pinPivot.userData.section = name;

      for (let pi = 0; pi < pinCount; pi++) {
        const pin = _createQuestPin(color);
        // Spread pins at different lat/lon offsets on camera-facing hemisphere
        const beaconLat = (((seed * 1.7 + pi * 2.1) % 0.8) - 0.4);      // ±0.4 rad from equator
        const beaconLon = (((seed * 2.3 + pi * 1.5) % 1.2) - 0.6);      // ±0.6 rad from center-front
        const r = 2.02;
        pin.position.set(
          r * Math.cos(beaconLat) * Math.sin(beaconLon),
          r * Math.sin(beaconLat),
          r * Math.cos(beaconLat) * Math.cos(beaconLon)
        );
        // Orient outward from center
        pin.lookAt(0, 0, 0);
        pin.rotateX(Math.PI / 2);

        pin.traverse(child => {
          if (child.isMesh) {
            child.userData.isQuestPin = true;
            child.userData.section = name;
          }
        });

        pinPivot.add(pin);
      }

      pinPivot.visible = false;          // hidden until a quest is available
      group.add(pinPivot);
    }

    group.userData = { name };
    scene.add(group);
    waypoints.push(group);
  });

  return waypoints;
}

/**
 * Update planet shaders and satellite orbits each frame
 */
export function animateWaypoints(waypoints, elapsed) {
  const dt = 0.016;  // approximate delta for lightning timers
  waypoints.forEach((group) => {
    // Slow planet rotation
    group.children.forEach((child) => {
      if (child.userData && child.userData.isPlanet) {
        child.rotation.y = elapsed * 0.05;
        if (child.material.uniforms) {
          child.material.uniforms.uTime.value = elapsed;
        }
      }

      // ── Cloud / weather layer animation ──────────────
      if (child.userData && child.userData.isCloudLayer) {
        // Slow independent rotation (clouds drift)
        child.rotation.y = elapsed * 0.03;

        if (child.material.uniforms) {
          child.material.uniforms.uTime.value = elapsed;

          // Lightning flash system
          if (child.userData.hasLightning) {
            child.userData.lightningTimer -= dt;

            if (child.userData.lightningTimer <= 0) {
              // Fire a lightning flash at a random surface spot
              child.userData.lightningIntensity = 0.8 + Math.random() * 0.2;
              // Random point on the unit sphere for strike location
              const theta = Math.random() * Math.PI * 2;
              const phi = Math.acos(2 * Math.random() - 1);
              child.material.uniforms.uLightningPos.value.set(
                Math.sin(phi) * Math.cos(theta),
                Math.cos(phi),
                Math.sin(phi) * Math.sin(theta)
              );
              // Random interval: storms flash more often
              const minInterval = child.userData.weatherType >= 2 ? 1.5 : 3.0;
              const maxInterval = child.userData.weatherType >= 2 ? 5.0 : 10.0;
              child.userData.lightningTimer = minInterval + Math.random() * (maxInterval - minInterval);

              // Double-flash chance (30%) — nearby spot
              if (Math.random() < 0.3) {
                const curPos = child.material.uniforms.uLightningPos.value.clone();
                setTimeout(() => {
                  child.userData.lightningIntensity = 0.6 + Math.random() * 0.3;
                  // Offset slightly from original strike
                  child.material.uniforms.uLightningPos.value.copy(
                    curPos.add(new THREE.Vector3(
                      (Math.random() - 0.5) * 0.3,
                      (Math.random() - 0.5) * 0.3,
                      (Math.random() - 0.5) * 0.3
                    )).normalize()
                  );
                }, 120);
              }
            }

            // Decay lightning intensity
            child.userData.lightningIntensity *= 0.85;
            if (child.userData.lightningIntensity < 0.01) child.userData.lightningIntensity = 0;
            child.material.uniforms.uLightning.value = child.userData.lightningIntensity;
          }
        }
      }

      // Rotate satellite pivots
      if (child.userData && child.userData.isPivot) {
        child.children.forEach((sat) => {
          if (sat.userData && sat.userData.orbitRadius) {
            const angle = sat.userData.startAngle + elapsed * sat.userData.orbitSpeed;
            sat.position.x = Math.cos(angle) * sat.userData.orbitRadius;
            sat.position.z = Math.sin(angle) * sat.userData.orbitRadius;
            sat.rotation.y = angle;

            // Blink satellite light
            sat.children.forEach((part) => {
              if (part.userData && part.userData.isBlinker) {
                part.visible = Math.sin(elapsed * 4 + sat.userData.startAngle * 10) > 0.3;
              }
            });
          }
        });
      }

      // ── Animate quest pin pivot (rotate with planet) ──
      if (child.userData && child.userData.isQuestPinPivot && child.visible) {
        // Rotate the pivot at the same speed as the planet
        child.rotation.y = elapsed * 0.05;

        // Pulse effects on each beacon inside the pivot
        child.children.forEach(pin => {
          pin.children.forEach(part => {
            if (part.userData && part.userData.isRing) {
              const pulse = 0.3 + 0.15 * Math.sin(elapsed * 3.0);
              part.material.opacity = pulse;
              part.scale.setScalar(1.0 + 0.1 * Math.sin(elapsed * 2.0));
            }
            if (part.userData && part.userData.isBeaconOrb) {
              const glow = 0.6 + 0.35 * Math.sin(elapsed * 2.5);
              part.material.emissiveIntensity = glow;
            }
          });
        });
      }
    });
  });
}

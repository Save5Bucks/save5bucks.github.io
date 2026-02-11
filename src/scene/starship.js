import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

/**
 * STARSHIP HUB — ARC-170 Starfighter  ★  ALIVE EDITION
 * 
 * Loads the ARC-170 FBX model and applies holographic neon shader.
 * Falls back to procedural geometry if the model fails to load.
 * 
 * EFFECTS:
 * - Hologram scan lines, fresnel glow, flicker on all meshes
 * - Engine exhaust particle trails
 * - Reactor core energy pulse
 * - Deflector shield shimmer sphere
 * - Dynamic banking / flight response during transitions
 * - Random holographic glitch bursts
 * 
 * Offset to the lower-right of the viewport so it doesn't block content.
 */

// ── Hologram Shader (matches characterFactory) ──────────
function createHoloMaterial(color = 0x4488ff) {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0.85 },
      uGlitch: { value: 0.0 },
    },
    vertexShader: `
      uniform float uGlitch;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vPosition = position;
        vNormal = normalMatrix * normal;
        vec3 pos = position;
        // Glitch displacement
        if (uGlitch > 0.0) {
          float slice = step(0.5, fract(position.y * 20.0 + uTime * 50.0));
          pos.x += slice * uGlitch * 0.3 * sin(uTime * 100.0);
          pos.z += slice * uGlitch * 0.15 * cos(uTime * 77.0);
        }
        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uGlitch;
      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        // Scan lines
        float scanLine = sin(vPosition.y * 40.0 + uTime * 2.0) * 0.5 + 0.5;
        scanLine = smoothstep(0.3, 0.7, scanLine);

        // Fresnel edge glow
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float fresnel = 1.0 - abs(dot(viewDir, normalize(vNormal)));
        fresnel = pow(fresnel, 2.0);

        // Flicker
        float flicker = 0.9 + sin(uTime * 15.0) * 0.05 + sin(uTime * 23.0) * 0.05;

        // Glitch color distortion
        vec3 glitchColor = uColor;
        if (uGlitch > 0.0) {
          float band = step(0.4, fract(vPosition.y * 15.0 + uTime * 30.0));
          glitchColor = mix(uColor, vec3(1.0, 0.2, 0.5), band * uGlitch * 0.7);
          flicker *= (0.5 + 0.5 * sin(uTime * 80.0));
        }

        // Combine
        float alpha = (0.35 + scanLine * 0.3 + fresnel * 0.5) * uOpacity * flicker;

        vec3 finalColor = glitchColor + vec3(0.1, 0.1, 0.2) * scanLine;

        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
  });
}

function createWireMaterial(color = 0x4488ff) {
  return new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
}

function createGlowMaterial(color = 0x44aaff) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.85,
  });
}

// ── Shield Shimmer Shader ───────────────────────────────
function createShieldMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.08 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vNormal = normalMatrix * normal;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      varying vec2 vUv;

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float fresnel = 1.0 - abs(dot(viewDir, normalize(vNormal)));
        fresnel = pow(fresnel, 3.0);

        // Hex-grid pattern
        float hexScale = 12.0;
        vec2 hexUv = vUv * hexScale;
        float hex = abs(sin(hexUv.x * 3.14159) * sin(hexUv.y * 3.14159));
        hex = smoothstep(0.0, 0.15, hex);

        // Traveling energy ripples
        float ripple1 = sin(vWorldPosition.y * 8.0 + uTime * 3.0) * 0.5 + 0.5;
        float ripple2 = sin(vWorldPosition.x * 6.0 - uTime * 2.5) * 0.5 + 0.5;
        float ripple = ripple1 * ripple2;

        // Color shifts between blue and cyan
        vec3 color = mix(vec3(0.27, 0.53, 1.0), vec3(0.27, 1.0, 0.67), fresnel + ripple * 0.3);

        float alpha = (fresnel * 0.7 + hex * 0.1 + ripple * 0.15) * uOpacity;
        alpha *= (0.8 + sin(uTime * 4.0) * 0.2);

        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
}

// ── Engine Exhaust Particle System ──────────────────────
const EXHAUST_COUNT = 80; // particles per engine

function createExhaustSystem(ship, enginePos, color, spread) {
  const positions = new Float32Array(EXHAUST_COUNT * 3);
  const velocities = new Float32Array(EXHAUST_COUNT * 3);
  const lifetimes = new Float32Array(EXHAUST_COUNT);
  const maxLifetimes = new Float32Array(EXHAUST_COUNT);
  const sizes = new Float32Array(EXHAUST_COUNT);

  for (let i = 0; i < EXHAUST_COUNT; i++) {
    resetParticle(i, positions, velocities, lifetimes, maxLifetimes, sizes, enginePos, spread);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
    },
    vertexShader: `
      attribute float size;
      varying float vAlpha;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (120.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
        vAlpha = size; // size decays with lifetime, use as alpha proxy
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float glow = 1.0 - d * d;
        float alpha = glow * vAlpha * 0.7;
        gl_FragColor = vec4(uColor * (1.0 + glow * 0.5), alpha);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  ship.add(points);

  return {
    points,
    positions,
    velocities,
    lifetimes,
    maxLifetimes,
    sizes,
    origin: enginePos.clone(),
    spread,
  };
}

function resetParticle(i, positions, velocities, lifetimes, maxLifetimes, sizes, origin, spread) {
  const i3 = i * 3;
  positions[i3] = origin.x + (Math.random() - 0.5) * spread;
  positions[i3 + 1] = origin.y + (Math.random() - 0.5) * spread;
  positions[i3 + 2] = origin.z;

  velocities[i3] = (Math.random() - 0.5) * 0.15;
  velocities[i3 + 1] = (Math.random() - 0.5) * 0.15;
  velocities[i3 + 2] = 0.4 + Math.random() * 0.8; // exhaust shoots backward (+z in ship space, ship faces -z)

  const lt = 0.4 + Math.random() * 0.8;
  maxLifetimes[i] = lt;
  lifetimes[i] = Math.random() * lt; // stagger start
  sizes[i] = 0.1 + Math.random() * 0.15;
}

// ── Build the ship ──────────────────────────────────────
export function createStarship(scene, camera) {
  const ship = new THREE.Group();

  const holoColor = 0x4488ff;
  const engineColor = 0x44aaff;

  // ── Setup (position BEFORE model loads so ship exists) ─
  ship.scale.set(0.7, 0.7, 0.7);
  ship.rotation.y = Math.PI;

  // Self-illumination
  const selfLight = new THREE.PointLight(0x4488ff, 1.5, 12);
  selfLight.position.set(0, 0, 0);
  ship.add(selfLight);

  scene.add(ship);

  // Store data for follow logic
  ship.userData.targetPos = new THREE.Vector3();
  ship.userData.basePos = new THREE.Vector3();
  ship.userData.prevPos = new THREE.Vector3();
  ship.userData.velocity = new THREE.Vector3();
  ship.userData.isTransitioning = false;
  ship.userData.exhaustSystems = [];
  ship.userData.modelLoaded = false;

  // Glitch state
  ship.userData.glitchTimer = 0;
  ship.userData.glitchIntensity = 0;
  ship.userData.nextGlitch = 3 + Math.random() * 8;

  // Start at home sector offset
  const homePos = new THREE.Vector3(0, 0, 5);
  const homeLook = new THREE.Vector3(0, 0, 0);
  computeShipOffset(ship, homePos, homeLook);
  ship.position.copy(ship.userData.targetPos);
  ship.userData.basePos.copy(ship.userData.targetPos);
  ship.userData.prevPos.copy(ship.userData.targetPos);

  // ── Load ARC-170 FBX model ────────────────────────────
  const loader = new FBXLoader();
  loader.load(
    '/models/arc-170-starfighter-pathfinder/source/ArcPathfinder.fbx',
    (fbx) => {
      // Measure loaded model to normalize its scale
      const box = new THREE.Box3().setFromObject(fbx);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const targetSize = 1.5; // desired ship span in scene units
      const scaleFactor = targetSize / maxDim;
      fbx.scale.setScalar(scaleFactor);

      // Center the model
      const center = new THREE.Vector3();
      box.getCenter(center);
      fbx.position.sub(center.multiplyScalar(scaleFactor));

      // Apply hologram shader to every mesh
      const holoMat = createHoloMaterial(holoColor);
      const wireMat = createWireMaterial(holoColor);

      fbx.traverse((child) => {
        if (child.isMesh) {
          child.material = holoMat;

          // Add wireframe overlay clone
          const wireClone = child.clone();
          wireClone.material = wireMat;
          wireClone.userData._wireOverlay = true;
          child.parent.add(wireClone);
        }
      });

      // Store the model container for later access
      fbx.userData.isModelRoot = true;
      ship.add(fbx);
      ship.userData.modelLoaded = true;

      // ── Add effects now that model is loaded ──────────

      // Reactor Core
      const coreGeo = new THREE.IcosahedronGeometry(0.15, 1);
      const coreMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec3 vPos;
          void main() {
            float pulse = sin(uTime * 4.0) * 0.5 + 0.5;
            float innerGlow = 1.0 - length(vPos) * 4.0;
            innerGlow = max(innerGlow, 0.0);
            vec3 color = mix(vec3(0.3, 0.5, 1.0), vec3(0.3, 1.0, 0.7), pulse);
            float alpha = (0.5 + pulse * 0.5) * (0.3 + innerGlow * 0.7);
            gl_FragColor = vec4(color * 1.5, alpha);
          }
        `,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.userData.isCore = true;
      ship.add(core);

      const coreLight = new THREE.PointLight(0x44aaff, 0.8, 4);
      coreLight.userData.isCoreLight = true;
      ship.add(coreLight);

      // Deflector Shield
      const shieldRadius = targetSize * 0.7;
      const shieldGeo = new THREE.IcosahedronGeometry(shieldRadius, 2);
      const shield = new THREE.Mesh(shieldGeo, createShieldMaterial());
      shield.userData.isShield = true;
      ship.add(shield);

      // Engine exhaust — position behind the model (aft)
      const exhaustZ = size.z * scaleFactor * 0.45;
      const exhaustSpreadX = size.x * scaleFactor * 0.15;
      ship.userData.exhaustSystems = [
        createExhaustSystem(ship, new THREE.Vector3(-exhaustSpreadX, 0, exhaustZ), 0x44ccff, 0.06),
        createExhaustSystem(ship, new THREE.Vector3(exhaustSpreadX, 0, exhaustZ), 0x44ccff, 0.06),
        createExhaustSystem(ship, new THREE.Vector3(0, 0, exhaustZ * 0.9), 0x66ddff, 0.08),
      ];

      // Engine glow circles at exhaust points
      const glowGeo = new THREE.CircleGeometry(0.12, 12);
      [[-exhaustSpreadX, 0, exhaustZ], [exhaustSpreadX, 0, exhaustZ], [0, 0, exhaustZ * 0.9]].forEach(pos => {
        const glow = new THREE.Mesh(glowGeo, createGlowMaterial(engineColor).clone());
        glow.position.set(pos[0], pos[1], pos[2]);
        glow.userData.isEngineGlow = true;
        ship.add(glow);

        const eLight = new THREE.PointLight(engineColor, 0.8, 5);
        eLight.position.set(pos[0], pos[1], pos[2] + 0.1);
        ship.add(eLight);
      });

      // Nav lights at wing tips and nose/tail
      const halfSpan = size.x * scaleFactor * 0.45;
      const halfLen = size.z * scaleFactor * 0.45;
      const navLights = [
        { pos: [0, 0.2, -halfLen], color: 0x44ff44 },    // nose
        { pos: [0, -0.1, halfLen * 0.8], color: 0xff4444 }, // tail
        { pos: [-halfSpan, 0, 0], color: 0xff4488 },      // port wing
        { pos: [halfSpan, 0, 0], color: 0x44ffaa },        // starboard wing
      ];
      navLights.forEach(({ pos, color }) => {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 6, 4),
          createGlowMaterial(color)
        );
        dot.position.set(pos[0], pos[1], pos[2]);
        dot.userData.isNavLight = true;
        ship.add(dot);

        const pLight = new THREE.PointLight(color, 0.3, 2);
        pLight.position.set(pos[0], pos[1], pos[2]);
        pLight.userData.isNavLight = true;
        ship.add(pLight);
      });

      console.log('✦ ARC-170 Starfighter loaded — hologram shader applied');
    },
    undefined,
    (err) => {
      console.warn('⚠ Could not load ARC-170 FBX, building procedural fallback:', err.message);
      buildProceduralShip(ship, holoColor, engineColor);
    }
  );

  return ship;
}

/**
 * Procedural fallback ship if FBX fails to load.
 */
function buildProceduralShip(ship, holoColor, engineColor) {
  const accentColor = 0x44ffaa;
  const holoMat = createHoloMaterial(holoColor);
  const wireMat = createWireMaterial(holoColor);

  // Hull
  const hullGeo = new THREE.CylinderGeometry(0.3, 0.15, 2.5, 8, 1);
  const hull = new THREE.Mesh(hullGeo, holoMat);
  hull.rotation.x = Math.PI / 2;
  ship.add(hull);
  const hullWire = new THREE.Mesh(hullGeo, wireMat);
  hullWire.rotation.x = Math.PI / 2;
  ship.add(hullWire);

  // Bridge
  const bridgeGeo = new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const bridge = new THREE.Mesh(bridgeGeo, createHoloMaterial(accentColor));
  bridge.material.uniforms.uOpacity.value = 0.5;
  bridge.position.set(0, 0.25, -0.4);
  ship.add(bridge);

  // Wings
  const wingGeo = new THREE.BoxGeometry(1.8, 0.03, 0.6);
  const wings = new THREE.Mesh(wingGeo, holoMat);
  wings.position.set(0, -0.05, 0.2);
  ship.add(wings);

  // Engines
  const engineGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.6, 8);
  const engineHolo = createHoloMaterial(0x2244aa);
  const glowMat = createGlowMaterial(engineColor);
  [-1, 0, 1].forEach(side => {
    const x = side * 0.6;
    const engine = new THREE.Mesh(engineGeo, engineHolo);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(x, -0.05, 0.8);
    ship.add(engine);

    const glow = new THREE.Mesh(new THREE.CircleGeometry(side === 0 ? 0.13 : 0.1, 12), glowMat.clone());
    glow.position.set(x, -0.05, side === 0 ? 1.17 : 1.12);
    glow.userData.isEngineGlow = true;
    ship.add(glow);
  });

  // Reactor core
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.12, 1),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec3 vPos; void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float uTime; varying vec3 vPos; void main(){ float p=sin(uTime*4.0)*0.5+0.5; float g=max(1.0-length(vPos)*5.0,0.0); vec3 c=mix(vec3(0.3,0.5,1.0),vec3(0.3,1.0,0.7),p); gl_FragColor=vec4(c*1.5,(0.5+p*0.5)*(0.3+g*0.7)); }`,
    })
  );
  core.userData.isCore = true;
  ship.add(core);
  const coreLight = new THREE.PointLight(0x44aaff, 0.8, 4);
  coreLight.userData.isCoreLight = true;
  ship.add(coreLight);

  // Shield
  const shield = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 2), createShieldMaterial());
  shield.userData.isShield = true;
  ship.add(shield);

  // Exhaust
  ship.userData.exhaustSystems = [
    createExhaustSystem(ship, new THREE.Vector3(-0.6, -0.05, 1.15), 0x44ccff, 0.08),
    createExhaustSystem(ship, new THREE.Vector3(0.6, -0.05, 1.15), 0x44ccff, 0.08),
    createExhaustSystem(ship, new THREE.Vector3(0, -0.05, 1.2), 0x66ddff, 0.1),
  ];

  // Nav lights
  [[0, 0.3, -1.2, 0x44ff44], [0, -0.15, 1.1, 0xff4444], [-0.9, 0, 0.2, 0xff4488], [0.9, 0, 0.2, 0x44ffaa]].forEach(([x,y,z,c]) => {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), createGlowMaterial(c));
    dot.position.set(x, y, z);
    dot.userData.isNavLight = true;
    ship.add(dot);
    const pl = new THREE.PointLight(c, 0.3, 2);
    pl.position.set(x, y, z);
    pl.userData.isNavLight = true;
    ship.add(pl);
  });

  ship.userData.modelLoaded = true;
}

// ── Ship follow offset (lower-right, in front of camera) ─────
const FOLLOW_OFFSET        = { right: 5, down: -1.5, forward: 4 };
const COMBAT_FOLLOW_OFFSET = { right: 0, down: -0.8, forward: 5 };

// ── Mouse aim state (NDC -1…1) ───────────────────────────
const _mouseAim = { x: 0, y: 0 };
const _mouseSmoothed = { x: 0, y: 0 };
let _combatActive = false;

/** Call from main.js every frame with smoothed mouseNDC (-1…1). */
export function setShipMouse(mx, my) {
  _mouseAim.x = mx;
  _mouseAim.y = my;
}

/** Tell the ship whether combat is active — aims harder toward mouse. */
export function setShipCombat(active) {
  _combatActive = active;
}

// ── Flight path state ────────────────────────────────────
const SHIP_FLIGHT_DUR = 2.6;     // total seconds for ship to fly the path
export { SHIP_FLIGHT_DUR };
let _flightProgress = 0;         // 0…1
let _flightStartPos = new THREE.Vector3();
let _flightEndPos   = new THREE.Vector3();

// Smoothed flight-direction quaternion for nose-pointing
const _flightQuat = new THREE.Quaternion();
const _idleQuat   = new THREE.Quaternion();
const _targetQuat = new THREE.Quaternion();
const _lookMatrix = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);

/** Easing for the ship path (accel → cruise → decel). */
function easeShipPath(t) {
  // Smooth-start / smooth-stop (ease-in-out quintic for snappier flight)
  return t < 0.5
    ? 16 * t * t * t * t * t
    : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

/**
 * Compute where the ship should park relative to a camera position.
 */
function computeShipOffset(ship, cameraPos, lookAt) {
  const dir = new THREE.Vector3().subVectors(lookAt, cameraPos).normalize();
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();

  if (right.length() < 0.01) {
    right.set(1, 0, 0);
  }

  const off = _combatActive ? COMBAT_FOLLOW_OFFSET : FOLLOW_OFFSET;

  ship.userData.targetPos
    .copy(cameraPos)
    .add(right.multiplyScalar(off.right))
    .addScaledVector(new THREE.Vector3(0, 1, 0), off.down)
    .addScaledVector(dir, off.forward);
}

/**
 * Tell the ship to fly to a new section's camera position.
 */
export function setShipTarget(ship, targetCameraPos, targetLookAt) {
  if (!ship) return;
  // Snapshot where the ship is right now
  _flightStartPos.copy(ship.userData.basePos);
  _flightProgress = 0;

  // Compute destination offset
  computeShipOffset(ship, targetCameraPos, targetLookAt);
  _flightEndPos.copy(ship.userData.targetPos);

  ship.userData.isTransitioning = true;
}

/**
 * Animate the starship — call every frame.
 * Smooth follow, dynamic banking, exhaust particles, reactor pulse,
 * shield shimmer, hologram glitch, energy conduits, engine glow, nav blink.
 */
export function animateStarship(ship, elapsed, delta) {
  if (!ship) return;
  const dt = delta || 0.016;

  // ── Smooth follow to target (time-based flight path) ───
  if (ship.userData.isTransitioning) {
    _flightProgress += dt / SHIP_FLIGHT_DUR;
    if (_flightProgress >= 1) {
      _flightProgress = 1;
      ship.userData.isTransitioning = false;
    }
    const eased = easeShipPath(Math.min(_flightProgress, 1));
    ship.userData.basePos.lerpVectors(_flightStartPos, _flightEndPos, eased);
  }

  // ── Compute velocity for banking ──────────────────────
  ship.userData.velocity.subVectors(ship.userData.basePos, ship.userData.prevPos);
  ship.userData.prevPos.copy(ship.userData.basePos);
  const speed = ship.userData.velocity.length();

  // ── Idle motion layered on top of base position ───────
  const bobY = Math.sin(elapsed * 0.8) * 0.06;
  const bobX = Math.cos(elapsed * 0.5) * 0.03;
  const bobZ = Math.sin(elapsed * 0.6 + 1.0) * 0.02;

  ship.position.copy(ship.userData.basePos);
  ship.position.y += bobY;
  ship.position.x += bobX;
  ship.position.z += bobZ;

  // ── Dynamic banking (bank into turns) ─────────────────
  const lateralV = ship.userData.velocity.x;
  const verticalV = ship.userData.velocity.y;
  const bankRoll = THREE.MathUtils.clamp(lateralV * -8, -0.6, 0.6);
  const bankPitch = THREE.MathUtils.clamp(verticalV * -4, -0.3, 0.3);

  // ── Mouse aim tracking (smooth follow) ────────────────
  const aimLerp = (_combatActive ? 8.0 : 3.0) * dt;
  _mouseSmoothed.x += (_mouseAim.x - _mouseSmoothed.x) * Math.min(aimLerp, 1);
  _mouseSmoothed.y += (_mouseAim.y - _mouseSmoothed.y) * Math.min(aimLerp, 1);

  if (ship.userData.isTransitioning && speed > 0.01) {
    // ── FLIGHT MODE: nose points along velocity ─────────
    const velDir = ship.userData.velocity.clone().normalize();
    // Build a lookAt matrix from velocity direction
    const lookTarget = ship.position.clone().add(velDir);
    _lookMatrix.lookAt(ship.position, lookTarget, _up);
    _targetQuat.setFromRotationMatrix(_lookMatrix);
    // Slerp toward flight direction for smooth transition
    _flightQuat.slerp(_targetQuat, Math.min(8 * dt, 1));

    // Apply flight quaternion + bank roll for extra flair
    ship.quaternion.copy(_flightQuat);
    ship.rotateZ(bankRoll * 1.5); // exaggerated banking during flight
  } else {
    // ── IDLE MODE: gentle drift + mouse aim ─────────────
    // During combat, mouse aim is much stronger so the ship
    // visually tracks where the player is pointing.
    const idleYaw = Math.sin(elapsed * 0.3) * 0.08;
    const idlePitch = Math.sin(elapsed * 0.4) * 0.03;
    const idleRoll = Math.cos(elapsed * 0.35) * 0.02;

    const yawStrength   = _combatActive ? -0.7 : -0.25;
    const pitchStrength = _combatActive ?  0.45 :  0.15;

    const mouseYaw   = _mouseSmoothed.x * yawStrength;
    const mousePitch = _mouseSmoothed.y * pitchStrength;

    ship.rotation.y = Math.PI + idleYaw + mouseYaw;
    ship.rotation.x = idlePitch + mousePitch;
    ship.rotation.z = idleRoll + (_combatActive ? _mouseSmoothed.x * 0.1 : 0);

    // Keep flight quat in sync with idle rotation for smooth handoff
    _flightQuat.copy(ship.quaternion);
  }

  // ── Update hologram shader time + glitch ──────────────
  // Glitch burst system
  ship.userData.glitchTimer += dt;
  if (ship.userData.glitchTimer >= ship.userData.nextGlitch) {
    ship.userData.glitchIntensity = 0.6 + Math.random() * 0.4;
    ship.userData.glitchTimer = 0;
    ship.userData.nextGlitch = 4 + Math.random() * 10;
  }
  // Glitch decays quickly
  ship.userData.glitchIntensity *= (1 - dt * 6);
  if (ship.userData.glitchIntensity < 0.01) ship.userData.glitchIntensity = 0;
  const glitchVal = ship.userData.glitchIntensity;

  ship.traverse((child) => {
    if (child.isMesh && child.material.isShaderMaterial && child.material.uniforms?.uTime) {
      child.material.uniforms.uTime.value = elapsed;
      if (child.material.uniforms.uGlitch) {
        child.material.uniforms.uGlitch.value = glitchVal;
      }
    }
  });

  // ── ★ Reactor Core pulse ──────────────────────────────
  ship.traverse((child) => {
    if (child.userData.isCore) {
      const pulse = Math.sin(elapsed * 4.0) * 0.5 + 0.5;
      child.rotation.x = elapsed * 1.5;
      child.rotation.y = elapsed * 1.1;
      child.scale.setScalar(0.8 + pulse * 0.4);
    }
    if (child.userData.isCoreLight) {
      child.intensity = 0.4 + Math.sin(elapsed * 4.0) * 0.4;
      child.color.setHSL(0.55 + Math.sin(elapsed * 2.0) * 0.05, 0.8, 0.6);
    }
  });

  // ── ★ Shield shimmer rotation ─────────────────────────
  ship.traverse((child) => {
    if (child.userData.isShield) {
      child.rotation.y = elapsed * 0.15;
      child.rotation.x = elapsed * 0.1;
      // Brighter during transitions
      const shieldBoost = ship.userData.isTransitioning ? 0.15 : 0.08;
      child.material.uniforms.uOpacity.value = shieldBoost;
    }
  });

  // ── Engine glow pulse ─────────────────────────────────
  // Engines burn hotter during transitions
  const engineBoost = ship.userData.isTransitioning ? 1.5 : 1.0;
  ship.traverse((child) => {
    if (child.isMesh && child.userData.isEngineGlow) {
      const base = 0.6 + Math.sin(elapsed * 3) * 0.25;
      child.material.opacity = base * engineBoost;
      child.scale.setScalar((1 + Math.sin(elapsed * 4) * 0.08) * (engineBoost * 0.7 + 0.3));
    }
  });

  // ── ★ Exhaust particle simulation ─────────────────────
  const exhaustThrust = ship.userData.isTransitioning ? 2.0 : 1.0;
  if (ship.userData.exhaustSystems) {
    ship.userData.exhaustSystems.forEach(sys => {
      const { positions, velocities, lifetimes, maxLifetimes, sizes } = sys;

      for (let i = 0; i < EXHAUST_COUNT; i++) {
        const i3 = i * 3;
        lifetimes[i] += dt * exhaustThrust;

        if (lifetimes[i] >= maxLifetimes[i]) {
          resetParticle(i, positions, velocities, lifetimes, maxLifetimes, sizes, sys.origin, sys.spread);
        } else {
          const t = lifetimes[i] / maxLifetimes[i]; // 0→1 over lifetime

          // Move particle
          positions[i3] += velocities[i3] * dt * exhaustThrust;
          positions[i3 + 1] += velocities[i3 + 1] * dt * exhaustThrust;
          positions[i3 + 2] += velocities[i3 + 2] * dt * exhaustThrust;

          // Spread out over time
          velocities[i3] += (Math.random() - 0.5) * 0.02;
          velocities[i3 + 1] += (Math.random() - 0.5) * 0.02;

          // Size decays with lifetime
          sizes[i] = (1 - t) * (0.1 + Math.random() * 0.02);
        }
      }

      sys.points.geometry.attributes.position.needsUpdate = true;
      sys.points.geometry.attributes.size.needsUpdate = true;
    });
  }

  // ── Nav light blink ───────────────────────────────────
  ship.traverse((child) => {
    if (child.userData.isNavLight) {
      if (child.isMesh) {
        child.material.opacity = 0.5 + Math.sin(elapsed * 2.5 + child.position.x * 10) * 0.4;
      }
      if (child.isPointLight) {
        child.intensity = 0.2 + Math.sin(elapsed * 2.5 + child.position.x * 10) * 0.15;
      }
    }
  });
}

import * as THREE from 'three';

/**
 * SPACE EFFECTS
 * 
 * Adds life and visual interest between sectors:
 * - Scattered mini-nebulae (colorful gas clouds)
 * - Shooting stars / comets that streak across the scene
 * - Starlink-style satellites that drift and tumble
 * 
 * All built from geometry — no external assets.
 */

// ── Shared noise for nebula clouds ──────────────────────
const nebulaCloudShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uOpacity;
    varying vec2 vUv;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                         -0.577350269189626, 0.024390243902439);
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
        + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
      m = m * m;
      m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 uv = vUv;
      float t = uTime * 0.02;
      float n1 = snoise(uv * 3.0 + t) * 0.5 + 0.5;
      float n2 = snoise(uv * 5.0 - t * 0.8) * 0.5 + 0.5;
      float combined = n1 * 0.6 + n2 * 0.4;

      vec3 color = mix(uColor1, uColor2, n1);
      float alpha = combined * uOpacity;

      // Soft circular falloff
      float dist = length(uv - 0.5) * 2.0;
      alpha *= smoothstep(1.0, 0.3, dist);

      gl_FragColor = vec4(color, alpha);
    }
  `,
};

// ── Mini Nebulae ────────────────────────────────────────
const nebulaConfigs = [
  // Between home and about
  { pos: [30, 15, -15],  rot: [0.2, 0.4, 0],   size: 80,  c1: 0x1a0033, c2: 0x330066, opacity: 0.1 },
  { pos: [45, -5, -20],  rot: [0.5, -0.3, 0.2], size: 50,  c1: 0x001a33, c2: 0x003366, opacity: 0.08 },
  // Between about and services
  { pos: [10, -5, -55],  rot: [0.1, 0.8, 0.3],  size: 100, c1: 0x0d001a, c2: 0x1a0044, opacity: 0.12 },
  { pos: [-20, 0, -60],  rot: [-0.2, 0.5, 0],   size: 60,  c1: 0x331a00, c2: 0x662200, opacity: 0.06 },
  // Between services and software
  { pos: [-10, 10, -115], rot: [0.3, -0.6, 0.1], size: 90,  c1: 0x001a1a, c2: 0x003333, opacity: 0.1 },
  { pos: [15, 25, -130],  rot: [0.7, 0.2, -0.3], size: 70,  c1: 0x0a0022, c2: 0x220044, opacity: 0.08 },
  // Between software and portfolio
  { pos: [-25, 15, -185], rot: [-0.4, 0.3, 0.5], size: 110, c1: 0x1a0011, c2: 0x330022, opacity: 0.1 },
  { pos: [-55, 0, -200],  rot: [0.2, -0.7, 0],   size: 65,  c1: 0x000d1a, c2: 0x001a33, opacity: 0.07 },
  // Between portfolio and contact
  { pos: [-40, 30, -260], rot: [0.6, 0.1, -0.2], size: 85,  c1: 0x110022, c2: 0x220044, opacity: 0.09 },
  { pos: [0, 45, -280],   rot: [-0.3, 0.6, 0.4], size: 75,  c1: 0x001a0d, c2: 0x00331a, opacity: 0.08 },
  // Extra scattered deep ones
  { pos: [80, -30, -100],  rot: [0.4, 0.9, 0],   size: 120, c1: 0x0d0022, c2: 0x1a0044, opacity: 0.06 },
  { pos: [-90, 40, -170],  rot: [-0.5, -0.4, 0.3], size: 95, c1: 0x001a22, c2: 0x003344, opacity: 0.07 },
];

export function createSpaceNebulae(scene) {
  const nebulae = [];

  nebulaConfigs.forEach(cfg => {
    const geo = new THREE.PlaneGeometry(cfg.size, cfg.size);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(cfg.c1) },
        uColor2: { value: new THREE.Color(cfg.c2) },
        uOpacity: { value: cfg.opacity },
      },
      vertexShader: nebulaCloudShader.vertexShader,
      fragmentShader: nebulaCloudShader.fragmentShader,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    mesh.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
    scene.add(mesh);
    nebulae.push(mesh);
  });

  return nebulae;
}

// ── Shooting Stars / Comets ─────────────────────────────
const MAX_COMETS = 5;
const comets = [];

export function createComets(scene) {
  for (let i = 0; i < MAX_COMETS; i++) {
    const group = new THREE.Group();

    // Bright head
    const headGeo = new THREE.SphereGeometry(0.15, 6, 4);
    const headMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    group.add(head);

    // Glow around head
    const glowGeo = new THREE.SphereGeometry(0.4, 8, 4);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x88aaff,
      transparent: true,
      opacity: 0,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    // Tail (stretched cone)
    const tailGeo = new THREE.ConeGeometry(0.08, 4, 4);
    const tailMat = new THREE.MeshBasicMaterial({
      color: 0x6688cc,
      transparent: true,
      opacity: 0,
    });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.z = 2;
    group.add(tail);

    group.visible = false;
    scene.add(group);

    comets.push({
      group,
      headMat,
      glowMat,
      tailMat,
      active: false,
      timer: Math.random() * 15 + 5, // Random start delay
      lifetime: 0,
      maxLife: 0,
      startPos: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
    });
  }

  return comets;
}

function launchComet(comet, cameraPos) {
  // Spawn in a random area near-ish the camera
  const range = 200;
  comet.startPos.set(
    cameraPos.x + (Math.random() - 0.5) * range,
    cameraPos.y + (Math.random() - 0.5) * range * 0.5,
    cameraPos.z + (Math.random() - 0.5) * range - 50,
  );

  // Random direction, mostly lateral
  comet.velocity.set(
    (Math.random() - 0.5) * 80,
    (Math.random() - 0.3) * 30,
    (Math.random() - 0.5) * 60,
  );

  comet.group.position.copy(comet.startPos);

  // Orient so the tail (+Z child) trails behind the direction of travel
  // lookAt points -Z toward target, so we look OPPOSITE to velocity
  const lookTarget = comet.startPos.clone().sub(comet.velocity);
  comet.group.lookAt(lookTarget);

  comet.lifetime = 0;
  comet.maxLife = 1.5 + Math.random() * 2;
  comet.active = true;
  comet.group.visible = true;
}

export function animateComets(comets, elapsed, delta, cameraPos) {
  comets.forEach(comet => {
    if (!comet.active) {
      comet.timer -= delta;
      if (comet.timer <= 0) {
        launchComet(comet, cameraPos);
        comet.timer = 8 + Math.random() * 20; // Next spawn
      }
      return;
    }

    comet.lifetime += delta;
    const t = comet.lifetime / comet.maxLife;

    if (t >= 1) {
      comet.active = false;
      comet.group.visible = false;
      return;
    }

    // Move
    comet.group.position.addScaledVector(comet.velocity, delta);

    // Fade in then out
    const fade = t < 0.1 ? t / 0.1 : t > 0.6 ? (1 - t) / 0.4 : 1;
    comet.headMat.opacity = fade * 0.9;
    comet.glowMat.opacity = fade * 0.3;
    comet.tailMat.opacity = fade * 0.4;
  });
}


// ── Starlink Satellites ─────────────────────────────────
const MAX_SATELLITES = 12;

export function createSatellites(scene) {
  const satellites = [];

  for (let i = 0; i < MAX_SATELLITES; i++) {
    const group = new THREE.Group();

    // Main body (small rectangular bus)
    const bodyGeo = new THREE.BoxGeometry(0.2, 0.05, 0.4);
    const bodyMat = new THREE.MeshBasicMaterial({
      color: 0x8899aa,
      transparent: true,
      opacity: 0.6,
      wireframe: true,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // Solar panel (flat wide rectangle on each side)
    const panelGeo = new THREE.PlaneGeometry(1.2, 0.3);
    const panelMat = new THREE.MeshBasicMaterial({
      color: 0x2244aa,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });

    const panelL = new THREE.Mesh(panelGeo, panelMat);
    panelL.position.set(-0.7, 0, 0);
    panelL.rotation.y = 0;
    group.add(panelL);

    const panelR = new THREE.Mesh(panelGeo, panelMat.clone());
    panelR.position.set(0.7, 0, 0);
    group.add(panelR);

    // Tiny blinking light on antenna
    const antGeo = new THREE.SphereGeometry(0.02, 4, 3);
    const antMat = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.8,
    });
    const ant = new THREE.Mesh(antGeo, antMat);
    ant.position.set(0, 0.05, 0.2);
    group.add(ant);

    // Solar panel wireframe highlight
    const panelWireL = new THREE.Mesh(panelGeo, new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    }));
    panelWireL.position.copy(panelL.position);
    group.add(panelWireL);

    const panelWireR = panelWireL.clone();
    panelWireR.position.copy(panelR.position);
    group.add(panelWireR);

    // Random position scattered across the space route
    group.position.set(
      (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 100 + 20,    // Mostly above
      Math.random() * -350,                  // Along the z-corridor
    );

    // Random initial rotation
    group.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );

    group.scale.setScalar(0.4 + Math.random() * 0.3);

    scene.add(group);

    satellites.push({
      group,
      antMat,
      tumbleSpeed: {
        x: (Math.random() - 0.5) * 0.3,
        y: (Math.random() - 0.5) * 0.4,
        z: (Math.random() - 0.5) * 0.2,
      },
      driftSpeed: (Math.random() - 0.5) * 0.5,
      phaseOffset: Math.random() * Math.PI * 2,
    });
  }

  return satellites;
}

export function animateSatellites(satellites, elapsed) {
  satellites.forEach(sat => {
    // Slow tumble
    sat.group.rotation.x += sat.tumbleSpeed.x * 0.01;
    sat.group.rotation.y += sat.tumbleSpeed.y * 0.01;
    sat.group.rotation.z += sat.tumbleSpeed.z * 0.01;

    // Gentle drift
    sat.group.position.x += Math.sin(elapsed * 0.1 + sat.phaseOffset) * 0.005;
    sat.group.position.y += Math.cos(elapsed * 0.08 + sat.phaseOffset) * 0.003;

    // Antenna blink
    sat.antMat.opacity = 0.3 + Math.sin(elapsed * 3 + sat.phaseOffset) * 0.5;
  });
}

import * as THREE from 'three';

/**
 * Holographic wireframe character factory
 * Builds geometric characters for each race with gender variations
 * All characters have glowing wireframe + scan line shader effect
 */

// ── Hologram Material ────────────────────────────────────
function createHoloMaterial(color = 0x44ffaa) {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0.7 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vPosition = position;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vNormal;

      void main() {
        // Scan lines
        float scanLine = sin(vPosition.y * 30.0 + uTime * 2.0) * 0.5 + 0.5;
        scanLine = smoothstep(0.3, 0.7, scanLine);

        // Fresnel edge glow
        vec3 viewDir = normalize(cameraPosition - vPosition);
        float fresnel = 1.0 - abs(dot(viewDir, vNormal));
        fresnel = pow(fresnel, 2.0);

        // Flicker
        float flicker = 0.9 + sin(uTime * 15.0) * 0.05 + sin(uTime * 23.0) * 0.05;

        // Combine
        float alpha = (0.3 + scanLine * 0.3 + fresnel * 0.6) * uOpacity * flicker;

        // Color with slight scan line tint
        vec3 finalColor = uColor + vec3(0.1, 0.1, 0.2) * scanLine;

        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
  });
}

// Wireframe overlay material
function createWireMaterial(color = 0x44ffaa) {
  return new THREE.MeshBasicMaterial({
    color: color,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
  });
}

// Glow point light for character
function addCharacterGlow(group, color = 0x44ffaa) {
  const light = new THREE.PointLight(color, 1.5, 8);
  light.position.set(0, 1, 1);
  group.add(light);

  // Ground glow ring
  const ringGeo = new THREE.RingGeometry(0.8, 1.2, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -1.5;
  group.add(ring);
}

// ── Race Builders ────────────────────────────────────────

/**
 * HUMANOID — Classic human silhouette
 * Proportional body, upright stance
 */
function buildHumanoid(gender, color) {
  const group = new THREE.Group();
  const holo = createHoloMaterial(color);
  const wire = createWireMaterial(color);

  // Head
  const headGeo = new THREE.SphereGeometry(0.3, 12, 8);
  const head = new THREE.Mesh(headGeo, holo);
  const headWire = new THREE.Mesh(headGeo, wire);
  head.position.y = 1.65;
  headWire.position.y = 1.65;
  group.add(head, headWire);

  // Neck
  const neckGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.15, 8);
  const neck = new THREE.Mesh(neckGeo, holo);
  neck.position.y = 1.3;
  group.add(neck);

  // Torso
  const torsoWidth = gender === 'female' ? 0.32 : 0.38;
  const torsoGeo = new THREE.BoxGeometry(torsoWidth * 2, 0.7, 0.22, 4, 4, 2);
  const torso = new THREE.Mesh(torsoGeo, holo);
  const torsoWire = new THREE.Mesh(torsoGeo, wire);
  torso.position.y = 0.85;
  torsoWire.position.y = 0.85;
  group.add(torso, torsoWire);

  // Hips
  const hipWidth = gender === 'female' ? 0.35 : 0.3;
  const hipGeo = new THREE.BoxGeometry(hipWidth * 2, 0.25, 0.2, 3, 2, 2);
  const hip = new THREE.Mesh(hipGeo, holo);
  hip.position.y = 0.4;
  group.add(hip);

  // Arms
  const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.65, 6);
  [-1, 1].forEach(side => {
    const arm = new THREE.Mesh(armGeo, holo);
    arm.position.set(side * 0.5, 0.95, 0);
    arm.rotation.z = side * 0.15;
    group.add(arm);

    // Forearm
    const forearm = new THREE.Mesh(armGeo, holo);
    forearm.position.set(side * 0.55, 0.35, 0);
    forearm.rotation.z = side * 0.05;
    group.add(forearm);
  });

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.7, 6);
  [-1, 1].forEach(side => {
    const leg = new THREE.Mesh(legGeo, holo);
    leg.position.set(side * 0.2, -0.05, 0);
    group.add(leg);

    const shin = new THREE.Mesh(legGeo, holo);
    shin.position.set(side * 0.2, -0.75, 0);
    group.add(shin);
  });

  addCharacterGlow(group, color);
  group.position.y = 0;
  return group;
}

/**
 * ALIENOID — Tall, elongated, otherworldly
 * Large head, thin limbs, long fingers implied
 */
function buildAlienoid(gender, color) {
  const group = new THREE.Group();
  const holo = createHoloMaterial(color);
  const wire = createWireMaterial(color);

  // Large elongated head
  const headGeo = new THREE.SphereGeometry(0.4, 12, 8);
  const head = new THREE.Mesh(headGeo, holo);
  const headWire = new THREE.Mesh(headGeo, wire);
  head.scale.set(0.9, 1.2, 0.85);
  head.position.y = 1.9;
  headWire.scale.copy(head.scale);
  headWire.position.copy(head.position);
  group.add(head, headWire);

  // Large eyes (indentations via small spheres)
  const eyeGeo = new THREE.SphereGeometry(0.12, 8, 6);
  const eyeMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.6 });
  [-1, 1].forEach(side => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(side * 0.18, 1.95, 0.3);
    eye.scale.set(1.3, 0.7, 0.5);
    group.add(eye);
  });

  // Thin neck
  const neckGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.25, 6);
  const neck = new THREE.Mesh(neckGeo, holo);
  neck.position.y = 1.5;
  group.add(neck);

  // Slim torso
  const torsoWidth = gender === 'female' ? 0.25 : 0.28;
  const torsoGeo = new THREE.CylinderGeometry(torsoWidth, torsoWidth * 0.8, 0.8, 8);
  const torso = new THREE.Mesh(torsoGeo, holo);
  const torsoWire = new THREE.Mesh(torsoGeo, wire);
  torso.position.y = 1.0;
  torsoWire.position.y = 1.0;
  group.add(torso, torsoWire);

  // Long thin arms
  const armGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.8, 6);
  [-1, 1].forEach(side => {
    const arm = new THREE.Mesh(armGeo, holo);
    arm.position.set(side * 0.35, 1.0, 0);
    arm.rotation.z = side * 0.2;
    group.add(arm);

    const forearm = new THREE.Mesh(armGeo, holo);
    forearm.position.set(side * 0.45, 0.25, 0);
    forearm.rotation.z = side * 0.1;
    group.add(forearm);

    // Long fingers
    const fingerGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4);
    for (let f = -1; f <= 1; f++) {
      const finger = new THREE.Mesh(fingerGeo, holo);
      finger.position.set(side * 0.48 + f * 0.03, -0.15, 0);
      group.add(finger);
    }
  });

  // Thin legs
  const legGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.7, 6);
  [-1, 1].forEach(side => {
    const leg = new THREE.Mesh(legGeo, holo);
    leg.position.set(side * 0.15, 0.2, 0);
    group.add(leg);

    const shin = new THREE.Mesh(legGeo, holo);
    shin.position.set(side * 0.15, -0.5, 0);
    group.add(shin);
  });

  addCharacterGlow(group, color);
  return group;
}

/**
 * CATIOD — Feline humanoid
 * Cat ears, tail, sleek body
 */
function buildCatiod(gender, color) {
  const group = new THREE.Group();
  const holo = createHoloMaterial(color);
  const wire = createWireMaterial(color);

  // Head (slightly angular)
  const headGeo = new THREE.SphereGeometry(0.28, 10, 8);
  const head = new THREE.Mesh(headGeo, holo);
  const headWire = new THREE.Mesh(headGeo, wire);
  head.scale.set(1, 0.9, 0.9);
  head.position.y = 1.6;
  headWire.scale.copy(head.scale);
  headWire.position.copy(head.position);
  group.add(head, headWire);

  // Cat ears
  const earGeo = new THREE.ConeGeometry(0.1, 0.22, 4);
  [-1, 1].forEach(side => {
    const ear = new THREE.Mesh(earGeo, holo);
    ear.position.set(side * 0.2, 1.85, 0);
    ear.rotation.z = side * 0.2;
    group.add(ear);
  });

  // Snout
  const snoutGeo = new THREE.SphereGeometry(0.08, 6, 4);
  const snout = new THREE.Mesh(snoutGeo, holo);
  snout.position.set(0, 1.52, 0.25);
  snout.scale.set(1, 0.7, 0.8);
  group.add(snout);

  // Neck
  const neckGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.15, 6);
  const neck = new THREE.Mesh(neckGeo, holo);
  neck.position.y = 1.35;
  group.add(neck);

  // Sleek torso
  const torsoWidth = gender === 'female' ? 0.28 : 0.32;
  const torsoGeo = new THREE.CylinderGeometry(torsoWidth, torsoWidth * 0.85, 0.7, 8);
  const torso = new THREE.Mesh(torsoGeo, holo);
  const torsoWire = new THREE.Mesh(torsoGeo, wire);
  torso.position.y = 0.9;
  torsoWire.position.y = 0.9;
  group.add(torso, torsoWire);

  // Arms
  const armGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.6, 6);
  [-1, 1].forEach(side => {
    const arm = new THREE.Mesh(armGeo, holo);
    arm.position.set(side * 0.4, 0.95, 0);
    arm.rotation.z = side * 0.15;
    group.add(arm);

    const forearm = new THREE.Mesh(armGeo, holo);
    forearm.position.set(side * 0.45, 0.4, 0);
    group.add(forearm);

    // Claws
    const clawGeo = new THREE.ConeGeometry(0.015, 0.08, 4);
    for (let c = -1; c <= 1; c++) {
      const claw = new THREE.Mesh(clawGeo, holo);
      claw.position.set(side * 0.46 + c * 0.025, 0.08, 0);
      claw.rotation.z = Math.PI;
      group.add(claw);
    }
  });

  // Legs (digitigrade hint)
  const legGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.55, 6);
  [-1, 1].forEach(side => {
    const leg = new THREE.Mesh(legGeo, holo);
    leg.position.set(side * 0.18, 0.2, 0);
    group.add(leg);

    const shin = new THREE.Mesh(legGeo, holo);
    shin.position.set(side * 0.18, -0.35, 0.05);
    shin.rotation.x = -0.1;
    group.add(shin);
  });

  // Tail
  const tailSegments = 8;
  for (let i = 0; i < tailSegments; i++) {
    const t = i / tailSegments;
    const tailGeo = new THREE.SphereGeometry(0.035 - t * 0.015, 6, 4);
    const tailBall = new THREE.Mesh(tailGeo, holo);
    tailBall.position.set(
      0,
      0.5 + Math.sin(t * 2) * 0.3,
      -0.2 - t * 0.5
    );
    group.add(tailBall);
  }

  addCharacterGlow(group, color);
  return group;
}

/**
 * DOGIOD — Canine humanoid
 * Dog ears, snout, tail, sturdy build
 */
function buildDogiod(gender, color) {
  const group = new THREE.Group();
  const holo = createHoloMaterial(color);
  const wire = createWireMaterial(color);

  // Head (rounder than cat)
  const headGeo = new THREE.SphereGeometry(0.3, 10, 8);
  const head = new THREE.Mesh(headGeo, holo);
  const headWire = new THREE.Mesh(headGeo, wire);
  head.position.y = 1.6;
  headWire.position.copy(head.position);
  group.add(head, headWire);

  // Floppy ears
  const earGeo = new THREE.SphereGeometry(0.08, 6, 4);
  [-1, 1].forEach(side => {
    const ear = new THREE.Mesh(earGeo, holo);
    ear.scale.set(0.6, 1.2, 0.4);
    ear.position.set(side * 0.28, 1.7, 0);
    ear.rotation.z = side * 0.6;
    group.add(ear);
  });

  // Snout (more pronounced)
  const snoutGeo = new THREE.BoxGeometry(0.15, 0.12, 0.2, 3, 2, 2);
  const snout = new THREE.Mesh(snoutGeo, holo);
  snout.position.set(0, 1.5, 0.3);
  group.add(snout);

  // Nose
  const noseGeo = new THREE.SphereGeometry(0.04, 6, 4);
  const noseMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.set(0, 1.52, 0.42);
  group.add(nose);

  // Neck (thicker)
  const neckGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.15, 6);
  const neck = new THREE.Mesh(neckGeo, holo);
  neck.position.y = 1.32;
  group.add(neck);

  // Stocky torso
  const torsoWidth = gender === 'female' ? 0.33 : 0.4;
  const torsoGeo = new THREE.BoxGeometry(torsoWidth * 2, 0.75, 0.28, 4, 4, 2);
  const torso = new THREE.Mesh(torsoGeo, holo);
  const torsoWire = new THREE.Mesh(torsoGeo, wire);
  torso.position.y = 0.85;
  torsoWire.position.y = 0.85;
  group.add(torso, torsoWire);

  // Sturdy arms
  const armGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.6, 6);
  [-1, 1].forEach(side => {
    const arm = new THREE.Mesh(armGeo, holo);
    arm.position.set(side * 0.5, 0.95, 0);
    arm.rotation.z = side * 0.12;
    group.add(arm);

    const forearm = new THREE.Mesh(armGeo, holo);
    forearm.position.set(side * 0.54, 0.4, 0);
    group.add(forearm);
  });

  // Hips
  const hipGeo = new THREE.BoxGeometry(0.65, 0.2, 0.24, 3, 2, 2);
  const hip = new THREE.Mesh(hipGeo, holo);
  hip.position.y = 0.4;
  group.add(hip);

  // Sturdy legs
  const legGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.65, 6);
  [-1, 1].forEach(side => {
    const leg = new THREE.Mesh(legGeo, holo);
    leg.position.set(side * 0.2, 0.0, 0);
    group.add(leg);

    const shin = new THREE.Mesh(legGeo, holo);
    shin.position.set(side * 0.2, -0.65, 0);
    group.add(shin);
  });

  // Wagging tail (upward curve)
  const tailSegments = 6;
  for (let i = 0; i < tailSegments; i++) {
    const t = i / tailSegments;
    const tailGeo = new THREE.SphereGeometry(0.04 - t * 0.015, 6, 4);
    const tailBall = new THREE.Mesh(tailGeo, holo);
    tailBall.position.set(
      0,
      0.5 + t * 0.4,
      -0.2 - t * 0.35
    );
    group.add(tailBall);
  }

  addCharacterGlow(group, color);
  return group;
}

// ── Public API ───────────────────────────────────────────

const raceColors = {
  humanoid: 0x44aaff,
  alienoid: 0x44ffaa,
  catiod:   0xff88ff,
  dogiod:   0xffaa44,
};

const raceBuilders = {
  humanoid: buildHumanoid,
  alienoid: buildAlienoid,
  catiod:   buildCatiod,
  dogiod:   buildDogiod,
};

/**
 * Create a holographic character
 * @param {string} race — humanoid, alienoid, catiod, dogiod
 * @param {string} gender — male, female, alien
 * @returns {THREE.Group}
 */
export function createCharacter(race, gender = 'male') {
  const builder = raceBuilders[race] || buildHumanoid;
  const color = raceColors[race] || 0x44ffaa;
  return builder(gender, color);
}

/**
 * Update all hologram shader uniforms (call in animation loop)
 */
export function updateCharacterShaders(characterGroup, time) {
  characterGroup.traverse((child) => {
    if (child.isMesh && child.material.uniforms && child.material.uniforms.uTime) {
      child.material.uniforms.uTime.value = time;
    }
  });
}

export { raceColors };

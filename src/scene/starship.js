import * as THREE from 'three';

/**
 * STARSHIP HUB — Holographic Neon Mesh
 * 
 * The player's vessel that flies alongside the camera between sectors.
 * Built with the same hologram shader as the character models —
 * scan lines, fresnel edge glow, flicker, and wireframe overlay.
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
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vPosition = position;
        vNormal = normalMatrix * normal;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;
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

        // Combine
        float alpha = (0.35 + scanLine * 0.3 + fresnel * 0.5) * uOpacity * flicker;

        vec3 finalColor = uColor + vec3(0.1, 0.1, 0.2) * scanLine;

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

// ── Build the ship ──────────────────────────────────────
export function createStarship(scene, camera) {
  const ship = new THREE.Group();

  const holoColor = 0x4488ff;
  const engineColor = 0x44aaff;
  const accentColor = 0x44ffaa;

  const holoMat = createHoloMaterial(holoColor);
  const wireMat = createWireMaterial(holoColor);

  // ── Hull (main body) ─────────────────────────────────
  const hullGeo = new THREE.CylinderGeometry(0.3, 0.15, 2.5, 8, 1);
  const hull = new THREE.Mesh(hullGeo, holoMat);
  hull.rotation.x = Math.PI / 2;
  ship.add(hull);

  const hullWire = new THREE.Mesh(hullGeo, wireMat);
  hullWire.rotation.x = Math.PI / 2;
  ship.add(hullWire);

  // ── Bridge (cockpit dome) ────────────────────────────
  const bridgeGeo = new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const bridgeHolo = createHoloMaterial(accentColor);
  bridgeHolo.uniforms.uOpacity.value = 0.5;
  const bridge = new THREE.Mesh(bridgeGeo, bridgeHolo);
  bridge.position.set(0, 0.25, -0.4);
  ship.add(bridge);

  const bridgeWire = new THREE.Mesh(bridgeGeo, createWireMaterial(accentColor));
  bridgeWire.position.set(0, 0.25, -0.4);
  ship.add(bridgeWire);

  const bridgeLight = new THREE.PointLight(accentColor, 0.6, 4);
  bridgeLight.position.set(0, 0.4, -0.4);
  ship.add(bridgeLight);

  // ── Wings / Struts ───────────────────────────────────
  const wingGeo = new THREE.BoxGeometry(1.8, 0.03, 0.6, 1, 1, 1);
  const wings = new THREE.Mesh(wingGeo, holoMat);
  wings.position.set(0, -0.05, 0.2);
  ship.add(wings);

  const wingsWire = new THREE.Mesh(wingGeo, wireMat);
  wingsWire.position.set(0, -0.05, 0.2);
  ship.add(wingsWire);

  const finGeo = new THREE.BoxGeometry(0.05, 0.3, 0.35);
  [-1, 1].forEach(side => {
    const fin = new THREE.Mesh(finGeo, holoMat);
    fin.position.set(side * 0.9, 0.1, 0.2);
    fin.rotation.z = side * -0.3;
    ship.add(fin);

    const finW = new THREE.Mesh(finGeo, wireMat);
    finW.position.set(side * 0.9, 0.1, 0.2);
    finW.rotation.z = side * -0.3;
    ship.add(finW);
  });

  // ── Engine Nacelles ──────────────────────────────────
  const engineGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.6, 8);
  const engineHolo = createHoloMaterial(0x2244aa);
  const glowMat = createGlowMaterial(engineColor);
  const glowGeo = new THREE.CircleGeometry(0.1, 12);

  [-1, 1].forEach(side => {
    const engine = new THREE.Mesh(engineGeo, engineHolo);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(side * 0.6, -0.05, 0.8);
    ship.add(engine);

    const engineW = new THREE.Mesh(engineGeo, createWireMaterial(0x2244aa));
    engineW.rotation.x = Math.PI / 2;
    engineW.position.set(side * 0.6, -0.05, 0.8);
    ship.add(engineW);

    const glow = new THREE.Mesh(glowGeo, glowMat.clone());
    glow.position.set(side * 0.6, -0.05, 1.12);
    glow.userData.isEngineGlow = true;
    ship.add(glow);

    const eLight = new THREE.PointLight(engineColor, 0.8, 5);
    eLight.position.set(side * 0.6, -0.05, 1.2);
    ship.add(eLight);
  });

  // Center engine (larger)
  const cEngineGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.5, 8);
  const cEngine = new THREE.Mesh(cEngineGeo, engineHolo);
  cEngine.rotation.x = Math.PI / 2;
  cEngine.position.set(0, -0.05, 0.9);
  ship.add(cEngine);

  const cEngineW = new THREE.Mesh(cEngineGeo, createWireMaterial(0x2244aa));
  cEngineW.rotation.x = Math.PI / 2;
  cEngineW.position.set(0, -0.05, 0.9);
  ship.add(cEngineW);

  const centerGlow = new THREE.Mesh(new THREE.CircleGeometry(0.13, 12), glowMat.clone());
  centerGlow.position.set(0, -0.05, 1.17);
  centerGlow.userData.isEngineGlow = true;
  ship.add(centerGlow);

  const cEngineLight = new THREE.PointLight(engineColor, 1, 6);
  cEngineLight.position.set(0, -0.05, 1.3);
  ship.add(cEngineLight);

  // ── Running Lights (neon dots) ───────────────────────
  const navLights = [
    { pos: [0, 0.3, -1.2], color: 0x44ff44 },
    { pos: [0, -0.15, 1.1], color: 0xff4444 },
    { pos: [-0.9, 0, 0.2], color: 0xff4488 },
    { pos: [0.9, 0, 0.2], color: 0x44ffaa },
  ];

  navLights.forEach(({ pos, color }) => {
    const dotGeo = new THREE.SphereGeometry(0.03, 6, 4);
    const dotMat = createGlowMaterial(color);
    dotMat.opacity = 0.9;
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.set(pos[0], pos[1], pos[2]);
    dot.userData.isNavLight = true;
    ship.add(dot);

    const pLight = new THREE.PointLight(color, 0.3, 2);
    pLight.position.set(pos[0], pos[1], pos[2]);
    pLight.userData.isNavLight = true;
    ship.add(pLight);
  });

  // ── Antenna / Sensor Spire ───────────────────────────
  const antennaGeo = new THREE.CylinderGeometry(0.008, 0.005, 0.4, 4);
  const antenna = new THREE.Mesh(antennaGeo, createHoloMaterial(accentColor));
  antenna.position.set(0, 0.45, -0.3);
  ship.add(antenna);

  const antennaTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 6, 4),
    createGlowMaterial(0xff4444)
  );
  antennaTip.position.set(0, 0.65, -0.3);
  antennaTip.userData.isNavLight = true;
  ship.add(antennaTip);

  // ── Setup ────────────────────────────────────────────
  ship.scale.set(0.9, 0.9, 0.9);
  ship.rotation.y = Math.PI;

  // Self-illumination — so the ship glows in deep space
  const selfLight = new THREE.PointLight(0x4488ff, 1.5, 12);
  selfLight.position.set(0, 0, 0);
  ship.add(selfLight);

  scene.add(ship);

  // Store data for follow logic + raycasting
  ship.userData.targetPos = new THREE.Vector3();
  ship.userData.basePos = new THREE.Vector3();
  ship.userData.isTransitioning = false;

  // Start at home sector offset
  const homePos = new THREE.Vector3(0, 0, 5);
  const homeLook = new THREE.Vector3(0, 0, 0);
  computeShipOffset(ship, homePos, homeLook);
  ship.position.copy(ship.userData.targetPos);
  ship.userData.basePos.copy(ship.userData.targetPos);

  return ship;
}

// ── Ship follow offset (lower-right, in front of camera) ─────
// right = how far to the right of camera
// down  = how far below camera (negative = down)
// forward = how far toward the lookAt direction (positive = in front)
const FOLLOW_OFFSET = { right: 3, down: -1.5, forward: 6 };

/**
 * Compute where the ship should park relative to a camera position.
 */
function computeShipOffset(ship, cameraPos, lookAt) {
  const dir = new THREE.Vector3().subVectors(lookAt, cameraPos).normalize();
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();

  // If right vector is degenerate (camera looking straight up/down), pick a fallback
  if (right.length() < 0.01) {
    right.set(1, 0, 0);
  }

  ship.userData.targetPos
    .copy(cameraPos)
    .add(right.multiplyScalar(FOLLOW_OFFSET.right))
    .addScaledVector(new THREE.Vector3(0, 1, 0), FOLLOW_OFFSET.down)
    .addScaledVector(dir, FOLLOW_OFFSET.forward);
}

/**
 * Tell the ship to fly to a new section's camera position.
 * Called from navigateTo() in main.js.
 */
export function setShipTarget(ship, targetCameraPos, targetLookAt) {
  if (!ship) return;
  computeShipOffset(ship, targetCameraPos, targetLookAt);
  ship.userData.isTransitioning = true;
}

/**
 * Animate the starship — call every frame.
 * Smooth follow, hologram shader, engine pulse, shield spin, nav blink.
 */
export function animateStarship(ship, elapsed, delta) {
  if (!ship) return;

  // ── Smooth follow to target ───────────────────────────
  if (ship.userData.isTransitioning) {
    const target = ship.userData.targetPos;
    const lerpSpeed = 1.6 * (delta || 0.016);
    ship.userData.basePos.lerp(target, Math.min(lerpSpeed, 1));

    if (ship.userData.basePos.distanceTo(target) < 0.05) {
      ship.userData.basePos.copy(target);
      ship.userData.isTransitioning = false;
    }
  }

  // ── Idle motion layered on top of base position ───────
  const bobY = Math.sin(elapsed * 0.8) * 0.06;
  const bobX = Math.cos(elapsed * 0.5) * 0.03;

  ship.position.copy(ship.userData.basePos);
  ship.position.y += bobY;
  ship.position.x += bobX;

  // Gentle yaw / pitch / roll drift
  ship.rotation.y = Math.PI + Math.sin(elapsed * 0.3) * 0.08;
  ship.rotation.x = Math.sin(elapsed * 0.4) * 0.03;
  ship.rotation.z = Math.cos(elapsed * 0.35) * 0.02;

  // ── Update hologram shader time ───────────────────────
  ship.traverse((child) => {
    if (child.isMesh && child.material.isShaderMaterial && child.material.uniforms?.uTime) {
      child.material.uniforms.uTime.value = elapsed;
    }
  });

  // ── Engine glow pulse ─────────────────────────────────
  ship.traverse((child) => {
    if (child.isMesh && child.userData.isEngineGlow) {
      child.material.opacity = 0.6 + Math.sin(elapsed * 3) * 0.25;
      child.scale.setScalar(1 + Math.sin(elapsed * 4) * 0.08);
    }
  });

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

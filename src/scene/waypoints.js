import * as THREE from 'three';

/**
 * Creates glowing 3D waypoint markers at each section location
 * These act as "beacons" the camera flies toward
 */
export function createWaypoints(scene) {
  const waypointData = [
    { name: 'home',      pos: [0, 0, 0],         color: 0x4488ff },
    { name: 'about',     pos: [60, 10, -35],      color: 0x44ffaa },
    { name: 'services',  pos: [-50, -20, -85],    color: 0xff8844 },
    { name: 'software',  pos: [30, 40, -155],     color: 0xaa44ff },
    { name: 'portfolio', pos: [-80, -10, -225],   color: 0xff4488 },
    { name: 'contact',   pos: [0, 60, -305],      color: 0x44ddff },
  ];

  const waypoints = [];

  waypointData.forEach(({ name, pos, color }) => {
    const group = new THREE.Group();
    group.position.set(pos[0], pos[1], pos[2]);

    // Inner core — glowing icosahedron
    const coreGeo = new THREE.IcosahedronGeometry(1.5, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.2,
      wireframe: true,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // Outer ring
    const ringGeo = new THREE.TorusGeometry(3, 0.08, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Second ring at an angle
    const ring2 = ring.clone();
    ring2.rotation.x = Math.PI / 3;
    ring2.rotation.z = Math.PI / 4;
    group.add(ring2);

    // Point light at waypoint
    const wpLight = new THREE.PointLight(color, 1, 30);
    group.add(wpLight);

    group.userData = { name };
    scene.add(group);
    waypoints.push(group);
  });

  return waypoints;
}

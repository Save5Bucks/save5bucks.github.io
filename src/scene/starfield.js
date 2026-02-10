import * as THREE from 'three';

/**
 * Creates a multi-layered starfield with varying star sizes and colors
 */
export function createStarfield(scene) {
  const starsGroup = new THREE.Group();

  // Layer 1: Distant small stars
  const starCount1 = 8000;
  const starGeo1 = new THREE.BufferGeometry();
  const positions1 = new Float32Array(starCount1 * 3);
  const colors1 = new Float32Array(starCount1 * 3);

  for (let i = 0; i < starCount1; i++) {
    const i3 = i * 3;
    positions1[i3]     = (Math.random() - 0.5) * 2000;
    positions1[i3 + 1] = (Math.random() - 0.5) * 2000;
    positions1[i3 + 2] = (Math.random() - 0.5) * 2000;

    // Slight color variation (blue-white)
    const shade = 0.7 + Math.random() * 0.3;
    colors1[i3]     = shade * 0.8;
    colors1[i3 + 1] = shade * 0.85;
    colors1[i3 + 2] = shade;
  }

  starGeo1.setAttribute('position', new THREE.BufferAttribute(positions1, 3));
  starGeo1.setAttribute('color', new THREE.BufferAttribute(colors1, 3));

  const starMat1 = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
  });

  const stars1 = new THREE.Points(starGeo1, starMat1);
  starsGroup.add(stars1);

  // Layer 2: Brighter, closer stars
  const starCount2 = 2000;
  const starGeo2 = new THREE.BufferGeometry();
  const positions2 = new Float32Array(starCount2 * 3);
  const colors2 = new Float32Array(starCount2 * 3);

  for (let i = 0; i < starCount2; i++) {
    const i3 = i * 3;
    positions2[i3]     = (Math.random() - 0.5) * 1500;
    positions2[i3 + 1] = (Math.random() - 0.5) * 1500;
    positions2[i3 + 2] = (Math.random() - 0.5) * 1500;

    // Color variety: blue, white, pale gold
    const type = Math.random();
    if (type < 0.5) {
      colors2[i3]     = 0.8;
      colors2[i3 + 1] = 0.9;
      colors2[i3 + 2] = 1.0;
    } else if (type < 0.8) {
      colors2[i3]     = 1.0;
      colors2[i3 + 1] = 0.95;
      colors2[i3 + 2] = 0.8;
    } else {
      colors2[i3]     = 0.6;
      colors2[i3 + 1] = 0.7;
      colors2[i3 + 2] = 1.0;
    }
  }

  starGeo2.setAttribute('position', new THREE.BufferAttribute(positions2, 3));
  starGeo2.setAttribute('color', new THREE.BufferAttribute(colors2, 3));

  const starMat2 = new THREE.PointsMaterial({
    size: 1.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
  });

  const stars2 = new THREE.Points(starGeo2, starMat2);
  starsGroup.add(stars2);

  // Layer 3: Rare bright stars with glow
  const starCount3 = 200;
  const starGeo3 = new THREE.BufferGeometry();
  const positions3 = new Float32Array(starCount3 * 3);

  for (let i = 0; i < starCount3; i++) {
    const i3 = i * 3;
    positions3[i3]     = (Math.random() - 0.5) * 1200;
    positions3[i3 + 1] = (Math.random() - 0.5) * 1200;
    positions3[i3 + 2] = (Math.random() - 0.5) * 1200;
  }

  starGeo3.setAttribute('position', new THREE.BufferAttribute(positions3, 3));

  const starMat3 = new THREE.PointsMaterial({
    size: 2.5,
    color: 0xaaccff,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: true,
  });

  const stars3 = new THREE.Points(starGeo3, starMat3);
  starsGroup.add(stars3);

  scene.add(starsGroup);
  return starsGroup;
}

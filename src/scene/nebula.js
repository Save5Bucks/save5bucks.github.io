import * as THREE from 'three';

/**
 * Creates volumetric nebula clouds using custom shader material
 */
export function createNebula(scene) {
  const nebulaGeo = new THREE.PlaneGeometry(600, 600, 1, 1);

  const nebulaMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color(0x0a0a2e) },
      uColor2: { value: new THREE.Color(0x1a0533) },
      uColor3: { value: new THREE.Color(0x002244) },
    },
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
      uniform vec3 uColor3;
      varying vec2 vUv;

      // Simplex-like noise
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
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
        float t = uTime * 0.03;

        float n1 = snoise(uv * 2.0 + t) * 0.5 + 0.5;
        float n2 = snoise(uv * 4.0 - t * 0.7) * 0.5 + 0.5;
        float n3 = snoise(uv * 1.5 + vec2(t * 0.5, -t * 0.3)) * 0.5 + 0.5;

        float combined = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

        vec3 color = mix(uColor1, uColor2, n1);
        color = mix(color, uColor3, n2 * 0.5);

        float alpha = combined * 0.15;
        alpha *= smoothstep(0.0, 0.3, uv.x) * smoothstep(1.0, 0.7, uv.x);
        alpha *= smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.7, uv.y);

        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  const nebulaMesh = new THREE.Mesh(nebulaGeo, nebulaMat);
  nebulaMesh.position.set(0, 0, -200);
  scene.add(nebulaMesh);

  // Second nebula layer at different angle
  const nebula2 = nebulaMesh.clone();
  nebula2.material = nebulaMat.clone();
  nebula2.material.uniforms.uColor1.value = new THREE.Color(0x1a0022);
  nebula2.material.uniforms.uColor2.value = new THREE.Color(0x000a33);
  nebula2.material.uniforms.uColor3.value = new THREE.Color(0x0d001a);
  nebula2.position.set(-100, 30, -350);
  nebula2.rotation.set(0.3, 0.5, 0.1);
  scene.add(nebula2);

  return nebulaMesh;
}

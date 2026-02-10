import * as THREE from 'three';
import { createStarfield } from './scene/starfield.js';
import { createNebula } from './scene/nebula.js';
import { createWaypoints } from './scene/waypoints.js';
import { AudioSystem } from './audio/audioSystem.js';
import { pageContent } from './content/pages.js';

// ── Scene Setup ──────────────────────────────────────────
const canvas = document.getElementById('space-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// ── Lighting ─────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0x4488ff, 2, 500);
pointLight.position.set(0, 50, 0);
scene.add(pointLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
directionalLight.position.set(50, 100, 50);
scene.add(directionalLight);

// ── Scene Elements ───────────────────────────────────────
const starfield = createStarfield(scene);
const nebula = createNebula(scene);
const waypoints = createWaypoints(scene);

// ── Audio ────────────────────────────────────────────────
const audio = new AudioSystem();

// ── Camera State ─────────────────────────────────────────
camera.position.set(0, 0, 5);
const cameraTarget = new THREE.Vector3(0, 0, 5);
const cameraLookTarget = new THREE.Vector3(0, 0, 0);
let currentSection = 'home';
let isTransitioning = false;
const transitionDuration = 2.0; // seconds
let transitionProgress = 0;
let transitionStart = new THREE.Vector3();
let transitionEnd = new THREE.Vector3();
let lookStart = new THREE.Vector3();
let lookEnd = new THREE.Vector3();

// Mouse parallax
const mouse = { x: 0, y: 0 };
const mouseSmooth = { x: 0, y: 0 };

// ── Section positions in 3D space ────────────────────────
const sectionPositions = {
  home:      { camera: new THREE.Vector3(0, 0, 5),      lookAt: new THREE.Vector3(0, 0, 0) },
  about:     { camera: new THREE.Vector3(60, 10, -30),   lookAt: new THREE.Vector3(60, 10, -35) },
  services:  { camera: new THREE.Vector3(-50, -20, -80), lookAt: new THREE.Vector3(-50, -20, -85) },
  software:  { camera: new THREE.Vector3(30, 40, -150),  lookAt: new THREE.Vector3(30, 40, -155) },
  portfolio: { camera: new THREE.Vector3(-80, -10, -220),lookAt: new THREE.Vector3(-80, -10, -225) },
  contact:   { camera: new THREE.Vector3(0, 60, -300),   lookAt: new THREE.Vector3(0, 60, -305) },
};

// ── Navigation ───────────────────────────────────────────
function navigateTo(section) {
  if (isTransitioning || section === currentSection) return;

  isTransitioning = true;
  transitionProgress = 0;

  transitionStart.copy(camera.position);
  transitionEnd.copy(sectionPositions[section].camera);

  lookStart.copy(cameraLookTarget);
  lookEnd.copy(sectionPositions[section].lookAt);

  currentSection = section;
  audio.playNavigate();

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === section);
  });

  // Update location indicator
  document.getElementById('location-name').textContent = section.toUpperCase();

  // Hide content during transition
  const contentOverlay = document.getElementById('content-overlay');
  contentOverlay.classList.remove('visible');

  // Show content after transition
  setTimeout(() => {
    document.getElementById('content-inner').innerHTML = pageContent[section] || '';
    contentOverlay.classList.add('visible');
    audio.playArrive();
  }, transitionDuration * 1000);
}

// ── Easing ───────────────────────────────────────────────
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Event Listeners ──────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    audio.init(); // Unlock audio on first interaction
    navigateTo(btn.dataset.target);
  });
});

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Scroll-based navigation
const sectionOrder = ['home', 'about', 'services', 'software', 'portfolio', 'contact'];
let scrollCooldown = false;

window.addEventListener('wheel', (e) => {
  if (scrollCooldown || isTransitioning) return;
  scrollCooldown = true;
  setTimeout(() => scrollCooldown = false, 1500);

  audio.init();

  const currentIndex = sectionOrder.indexOf(currentSection);
  if (e.deltaY > 0 && currentIndex < sectionOrder.length - 1) {
    navigateTo(sectionOrder[currentIndex + 1]);
  } else if (e.deltaY < 0 && currentIndex > 0) {
    navigateTo(sectionOrder[currentIndex - 1]);
  }
});

// Keyboard navigation
window.addEventListener('keydown', (e) => {
  if (isTransitioning) return;
  audio.init();

  const currentIndex = sectionOrder.indexOf(currentSection);
  if ((e.key === 'ArrowDown' || e.key === 'ArrowRight') && currentIndex < sectionOrder.length - 1) {
    navigateTo(sectionOrder[currentIndex + 1]);
  } else if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && currentIndex > 0) {
    navigateTo(sectionOrder[currentIndex - 1]);
  }
});

// ── Loading ──────────────────────────────────────────────
const loadingScreen = document.getElementById('loading-screen');
setTimeout(() => {
  loadingScreen.classList.add('hidden');
  document.getElementById('content-inner').innerHTML = pageContent['home'] || '';
  document.getElementById('content-overlay').classList.add('visible');
}, 2500);

// ── Animation Loop ───────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Smooth mouse
  mouseSmooth.x += (mouse.x - mouseSmooth.x) * 0.05;
  mouseSmooth.y += (mouse.y - mouseSmooth.y) * 0.05;

  // Camera transition
  if (isTransitioning) {
    transitionProgress += delta / transitionDuration;
    if (transitionProgress >= 1) {
      transitionProgress = 1;
      isTransitioning = false;
    }

    const t = easeInOutCubic(transitionProgress);
    camera.position.lerpVectors(transitionStart, transitionEnd, t);
    cameraLookTarget.lerpVectors(lookStart, lookEnd, t);
  }

  // Mouse parallax
  const parallaxOffset = new THREE.Vector3(
    mouseSmooth.x * 0.5,
    mouseSmooth.y * 0.3,
    0
  );

  const finalLook = cameraLookTarget.clone().add(parallaxOffset);
  camera.lookAt(finalLook);

  // Animate starfield
  if (starfield) {
    starfield.rotation.y += delta * 0.01;
    starfield.rotation.x += delta * 0.005;
  }

  // Animate nebula
  if (nebula && nebula.material.uniforms) {
    nebula.material.uniforms.uTime.value = elapsed;
  }

  // Animate waypoints
  waypoints.forEach((wp, i) => {
    wp.rotation.y += delta * 0.5;
    wp.position.y += Math.sin(elapsed * 0.5 + i) * 0.002;
  });

  // Pulse point light
  pointLight.intensity = 2 + Math.sin(elapsed * 0.5) * 0.5;
  pointLight.position.copy(camera.position).add(new THREE.Vector3(0, 20, -10));

  renderer.render(scene, camera);
}

animate();

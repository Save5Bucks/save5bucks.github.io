import * as THREE from 'three';
import { createStarfield } from './scene/starfield.js';
import { createNebula } from './scene/nebula.js';
import { createWaypoints } from './scene/waypoints.js';
import { createStarship, animateStarship, setShipTarget } from './scene/starship.js';
import { createSpaceNebulae, createComets, animateComets, createSatellites, animateSatellites } from './scene/spaceEffects.js';
import { AudioSystem } from './audio/audioSystem.js';
import { pageContent } from './content/pages.js';
import { CharacterCreator } from './game/characterCreator.js';
import { hasCharacter, loadCharacter, trackProgress, deleteCharacter } from './game/saveSystem.js';
import { Narrator } from './game/narrator.js';
import { IntroCrawl } from './game/introCrawl.js';

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
const starship = createStarship(scene, camera);

// ── Space Effects (scattered nebulae, comets, satellites) ─
const spaceNebulae = createSpaceNebulae(scene);
const comets = createComets(scene);
const satellites = createSatellites(scene);

// ── Space Shroud (hides 3D until reveal) ─────────────────
const shroud = document.getElementById('space-shroud');
// Shroud starts hidden (display:none in CSS). 
// It becomes visible only when revealSpace() is called.

function revealSpace() {
  // Show the hidden layers — canvas and HUD
  canvas.style.display = 'block';
  document.getElementById('hud').style.display = 'block';

  // Show shroud (blast doors closed), then animate them open
  shroud.classList.add('active');

  // Play a dramatic reveal sound
  audio.init();
  audio.playReveal();

  // Small delay so the shroud renders before animating open
  requestAnimationFrame(() => {
    // Trigger the iris-open / blast-door animation
    shroud.classList.add('revealing');
  });

  // Show HUD elements as panels open
  setTimeout(() => {
    document.getElementById('hud').classList.add('hud-visible');
  }, 1000);

  // Remove shroud from DOM after animation completes
  setTimeout(() => {
    shroud.classList.remove('active');
    shroud.classList.add('revealed');
  }, 2200);
}

// ── Audio ────────────────────────────────────────────────
const audio = new AudioSystem();

// ── Narrator ─────────────────────────────────────────────
const narrator = new Narrator(audio);

// ── Ship Panel (board your starship to view stats) ───────
const shipBtn = document.getElementById('ship-btn');
const shipPanel = document.getElementById('ship-panel');
const shipPanelClose = document.getElementById('ship-panel-close');
const shipPanelReset = document.getElementById('ship-panel-reset');

const allSectors = ['home', 'about', 'services', 'software', 'portfolio', 'contact'];

function formatClassName(cls) {
  if (cls === 'homeowner') return 'Home Owner';
  if (cls === 'businessowner') return 'Business Owner';
  if (cls === 'serverowner') return 'Server Owner';
  return cls;
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function openShipPanel() {
  const char = loadCharacter();
  if (!char) return;

  // Populate stats
  document.getElementById('stat-name').textContent = char.name || '—';
  document.getElementById('stat-race').textContent = (char.race || '—').toUpperCase();
  document.getElementById('stat-class').textContent = formatClassName(char.class);
  document.getElementById('stat-gender').textContent = (char.gender || '—').toUpperCase();

  const explored = char.sectorsExplored || ['home'];
  document.getElementById('stat-sectors').textContent = `${explored.length} / ${allSectors.length}`;
  document.getElementById('stat-visits').textContent = char.visits || 1;
  document.getElementById('stat-created').textContent = formatDate(char.createdAt);
  document.getElementById('stat-lastseen').textContent = formatDate(char.lastVisit || char.createdAt);

  // Sector tags
  const sectorList = document.getElementById('stat-sector-list');
  sectorList.innerHTML = '';
  allSectors.forEach(s => {
    const tag = document.createElement('span');
    tag.className = explored.includes(s) ? 'sector-tag' : 'sector-tag undiscovered';
    tag.textContent = s.toUpperCase();
    sectorList.appendChild(tag);
  });

  shipPanel.classList.add('open');
  audio.playClick();
}

function closeShipPanel() {
  shipPanel.classList.remove('open');
}

shipBtn.addEventListener('click', () => {
  audio.init();
  openShipPanel();
});

shipPanelClose.addEventListener('click', closeShipPanel);

shipPanel.addEventListener('click', (e) => {
  // Click backdrop to close
  if (e.target === shipPanel) closeShipPanel();
});

shipPanelReset.addEventListener('click', () => {
  if (confirm('This will delete your pilot and all exploration data. Are you sure?')) {
    deleteCharacter();
    closeShipPanel();
    location.reload();
  }
});

// Escape to close
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && shipPanel.classList.contains('open')) {
    closeShipPanel();
  }
});

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
let playerCharacter = null;

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

  // Tell the starship to fly to the new sector
  setShipTarget(starship, sectionPositions[section].camera, sectionPositions[section].lookAt);

  // Track exploration progress
  trackProgress(section);

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

    // Narrator speaks about this section
    narrator.onSectionArrive(section);

    // ~30% chance the Void comments on a passing satellite after section narration
    if (Math.random() < 0.3) {
      setTimeout(() => narrator.speakStarlinkQuip(), 8000);
    }
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
let hoveringContent = false;

// Track when mouse is over the content panel so scroll navigates the panel, not the site
const contentOverlayEl = document.getElementById('content-overlay');
contentOverlayEl.addEventListener('mouseenter', () => { hoveringContent = true; });
contentOverlayEl.addEventListener('mouseleave', () => { hoveringContent = false; });

window.addEventListener('wheel', (e) => {
  if (hoveringContent) return; // let the panel scroll naturally
  if (scrollCooldown || isTransitioning || shipPanel.classList.contains('open')) return;
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
  if (isTransitioning || shipPanel.classList.contains('open')) return;
  audio.init();

  const currentIndex = sectionOrder.indexOf(currentSection);
  if ((e.key === 'ArrowDown' || e.key === 'ArrowRight') && currentIndex < sectionOrder.length - 1) {
    navigateTo(sectionOrder[currentIndex + 1]);
  } else if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && currentIndex > 0) {
    navigateTo(sectionOrder[currentIndex - 1]);
  }
});

// ── Loading & Character Gate ─────────────────────────────
const loadingScreen = document.getElementById('loading-screen');

function startSite(character) {
  playerCharacter = character;
  loadingScreen.classList.add('hidden');

  // Initialize narrator with character data
  narrator.setCharacter(character);
  audio.init();

  // ── DRAMATIC SPACE REVEAL (skip if already revealed) ──
  if (!shroud.classList.contains('revealed')) {
    revealSpace();
  }

  // Personalize home page with character info (show after reveal)
  setTimeout(() => {
    const personalizedHome = pageContent['home'].replace(
      'Building the Future — One Pixel at a Time',
      `Welcome back, <span style="color:var(--color-secondary)">${character.name}</span> — ${character.race.charAt(0).toUpperCase() + character.race.slice(1)} ${character.class === 'homeowner' ? 'Home Owner' : character.class === 'businessowner' ? 'Business Owner' : 'Server Owner'}`
    );

    document.getElementById('content-inner').innerHTML = personalizedHome;
    document.getElementById('content-overlay').classList.add('visible');
  }, 1800); // Content appears as shroud finishes opening
}

// Check if returning visitor
if (hasCharacter()) {
  const savedChar = loadCharacter();
  // Brief pause, then reveal space + narrate
  setTimeout(() => {
    startSite(savedChar);
    setTimeout(() => narrator.speak('returning'), 3000);
  }, 1000);
} else {
  // First visit — play Star Wars–style intro crawl, then character creator
  loadingScreen.classList.add('hidden');

  const introCrawl = new IntroCrawl(audio);
  introCrawl.play().then(() => {
    // Crawl finished or skipped → fade to character creator
    // Shroud stays ACTIVE — 3D space remains hidden behind solid background
    // Character creator appears on top of the solid dark shroud

    const creator = new CharacterCreator((character) => {
      // ── Step 1: Initialize character transition (solid bg, no 3D yet) ──
      loadingScreen.querySelector('.loader-text').textContent = `Initializing ${character.name}...`;
      loadingScreen.classList.remove('hidden');

      // ── Step 2: After init transition, blast-door space reveal ──
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        revealSpace();

        // ── Step 3: After blast doors open, start the site ──
        setTimeout(() => {
          startSite(character);
          // Welcome narration after space is revealed
          setTimeout(() => narrator.speak('welcome'), 3500);
        }, 2200); // wait for blast-door reveal to finish
      }, 2500); // hold "Initializing..." for 2.5s
    });
  });
}

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

  // Animate starship
  animateStarship(starship, elapsed, delta);

  // Animate space effects
  spaceNebulae.forEach(n => {
    if (n.material.uniforms) n.material.uniforms.uTime.value = elapsed;
  });
  animateComets(comets, elapsed, delta, camera.position);
  animateSatellites(satellites, elapsed);

  // Pulse point light
  pointLight.intensity = 2 + Math.sin(elapsed * 0.5) * 0.5;
  pointLight.position.copy(camera.position).add(new THREE.Vector3(0, 20, -10));

  renderer.render(scene, camera);
}

animate();

import * as THREE from 'three';
import { createStarfield } from './scene/starfield.js';
import { createNebula } from './scene/nebula.js';
import { createWaypoints, animateWaypoints } from './scene/waypoints.js';
import { createStarship, animateStarship, setShipTarget, setShipMouse, setShipCombat, SHIP_FLIGHT_DUR } from './scene/starship.js';
import { createSpaceNebulae, createComets, animateComets, createSatellites, animateSatellites } from './scene/spaceEffects.js';
import { AudioSystem } from './audio/audioSystem.js';
import { pageContent } from './content/pages.js';
import { CharacterCreator } from './game/characterCreator.js';
import { hasCharacter, loadCharacter, trackProgress, deleteCharacter, xpForLevel, spendStatPoint } from './game/saveSystem.js';
import { Narrator } from './game/narrator.js';
import { IntroCrawl } from './game/introCrawl.js';
import { QuestSystem } from './game/questSystem.js';
import { CombatSystem } from './game/combatSystem.js';
import { initContactForm } from './game/contactForm.js';

import { createCharacter, updateCharacterShaders } from './characters/characterFactory.js';

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

// ── Quest & Combat Systems ───────────────────────────────
// (audio and narrator created below, so we initialize these later)
let questSystem = null;
let combatSystem = null;
let mouseDown = false;

window.addEventListener('mousedown', () => { mouseDown = true; });
window.addEventListener('mouseup',   () => { mouseDown = false; });

// ── Quest Pin Click Detection ────────────────────────────
const pinRaycaster = new THREE.Raycaster();
const pinMouseVec = new THREE.Vector2();

window.addEventListener('click', (e) => {
  if (!questSystem || !waypoints) return;
  if (isTransitioning) return;
  if (combatSystem?.active) return;

  pinMouseVec.x = (e.clientX / window.innerWidth)  * 2 - 1;
  pinMouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;

  pinRaycaster.setFromCamera(pinMouseVec, camera);

  // Collect all visible quest pin meshes
  const pinMeshes = [];
  waypoints.forEach(group => {
    group.children.forEach(child => {
      if (child.userData?.isQuestPinPivot && child.visible) {
        child.traverse(c => { if (c.isMesh) pinMeshes.push(c); });
      }
    });
  });

  if (pinMeshes.length === 0) return;

  const hits = pinRaycaster.intersectObjects(pinMeshes, false);
  if (hits.length > 0) {
    // Walk up to find the pin group with .section
    let obj = hits[0].object;
    while (obj && !obj.userData?.section) obj = obj.parent;
    if (obj?.userData?.section) {
      audio.init();
      audio.playClick();
      questSystem.triggerQuest(obj.userData.section);
    }
  }
});

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

// Initialize quest & combat systems now that audio/narrator exist
questSystem = new QuestSystem(audio, narrator);
combatSystem = new CombatSystem(scene, camera, starship, audio, narrator);

// ── Ship Panel (board your starship to view stats) ───────
const shipBtn = document.getElementById('ship-btn');
const shipPanel = document.getElementById('ship-panel');
const shipPanelClose = document.getElementById('ship-panel-close');
const shipPanelReset = document.getElementById('ship-panel-reset');

// ── Ship Panel character hologram preview ────────────────
let shipPreviewScene, shipPreviewCamera, shipPreviewRenderer, shipPreviewChar;
let shipPreviewActive = false;

function initShipPreview() {
  if (shipPreviewScene) return; // already initialised

  const canvas = document.getElementById('ship-char-canvas');
  if (!canvas) return;

  shipPreviewScene = new THREE.Scene();
  shipPreviewCamera = new THREE.PerspectiveCamera(50, 260 / 320, 0.1, 100);
  shipPreviewCamera.position.set(0, 1, 4);
  shipPreviewCamera.lookAt(0, 0.8, 0);

  shipPreviewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  shipPreviewRenderer.setSize(260, 320);
  shipPreviewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  shipPreviewRenderer.setClearColor(0x000000, 0);

  const ambient = new THREE.AmbientLight(0x222244, 0.5);
  shipPreviewScene.add(ambient);
  const point = new THREE.PointLight(0x4488ff, 2, 20);
  point.position.set(2, 3, 3);
  shipPreviewScene.add(point);
}

function updateShipPreviewCharacter(race, gender) {
  if (!shipPreviewScene) return;
  if (shipPreviewChar) shipPreviewScene.remove(shipPreviewChar);
  shipPreviewChar = createCharacter(race || 'humanoid', gender || 'male');
  shipPreviewScene.add(shipPreviewChar);
}

function animateShipPreview(elapsed) {
  if (!shipPreviewActive || !shipPreviewRenderer) return;
  if (shipPreviewChar) {
    shipPreviewChar.rotation.y = Math.sin(elapsed * 0.5) * 0.5;
    updateCharacterShaders(shipPreviewChar, elapsed);
  }
  shipPreviewRenderer.render(shipPreviewScene, shipPreviewCamera);
}

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

  // Initialise & update character hologram preview
  initShipPreview();
  updateShipPreviewCharacter(char.race, char.gender);
  shipPreviewActive = true;

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

  // Combat & progression stats
  const level = char.level || 1;
  const xp = char.xp || 0;
  document.getElementById('stat-level').textContent = level;
  document.getElementById('stat-xp').textContent = `${xp} / ${xpForLevel(level)}`;
  document.getElementById('stat-points').textContent = char.statPoints || 0;
  document.getElementById('stat-kills').textContent = char.combatKills || 0;
  document.getElementById('stat-quests').textContent = char.questsCompleted || 0;
  document.getElementById('stat-gun-damage').textContent = char.gunDamage || 1;
  document.getElementById('stat-gun-speed').textContent = char.gunSpeed || 1;

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

  // Sync combat toggle with current state
  const combatToggle = document.getElementById('combat-toggle-input');
  if (combatToggle) {
    combatToggle.checked = !combatSystem.retreated;
  }

  // Narrator explains the ship panel (dismiss any active narration first)
  if (narrator) {
    const combatUnlocked = explored.length >= allSectors.length;
    setTimeout(() => {
      if (narrator.isActive) narrator._dismiss();
      if (!combatUnlocked) {
        narrator.speakShipCardLine('exploration');
      } else if ((char.statPoints || 0) > 0) {
        narrator.speakShipCardLine('statPoints');
      } else {
        narrator.speakShipCardLine('general');
      }
    }, 1500);
  }
}

function closeShipPanel() {
  shipPanel.classList.remove('open');
  shipPreviewActive = false;
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

// Combat on/off toggle
document.getElementById('combat-toggle-input').addEventListener('change', (e) => {
  combatSystem.retreated = !e.target.checked;
  audio.playClick();
});

// Upgrade buttons (+/- for gun damage / speed)
document.querySelectorAll('.upgrade-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const stat = btn.dataset.stat;
    const dir = parseInt(btn.dataset.dir, 10);
    if (dir === 1) {
      // Spend a stat point to increase
      if (spendStatPoint(stat)) {
        audio.playClick();
        openShipPanel(); // refresh displayed values
        updateHudStats(); // refresh HUD bar + badge
      }
    }
    // dir === -1 is display-only (no downgrade), button is decorative
  });
});

// Escape to close
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && shipPanel.classList.contains('open')) {
    closeShipPanel();
  }
});

// ── Pilot HUD — Live XP / Level / Stats ──────────────────
const hudLevel    = document.getElementById('hud-level');
const hudXpText   = document.getElementById('hud-xp-text');
const hudXpFill   = document.getElementById('hud-xp-fill');
const hudKills    = document.getElementById('hud-kills');
const hudQuests   = document.getElementById('hud-quests');
const statBadge   = document.getElementById('stat-point-badge');
const xpToastBox  = document.getElementById('xp-toast-container');

function updateHudStats() {
  const char = loadCharacter();
  if (!char) return;

  const level = char.level || 1;
  const xp    = char.xp || 0;
  const needed = xpForLevel(level);
  const pct    = Math.min((xp / needed) * 100, 100);

  hudLevel.textContent   = level;
  hudXpText.textContent  = `${xp} / ${needed} XP`;
  hudXpFill.style.width  = `${pct}%`;
  hudKills.textContent   = char.combatKills || 0;
  hudQuests.textContent  = char.questsCompleted || 0;

  // Stat point badge on SHIP button
  const points = char.statPoints || 0;
  if (points > 0) {
    statBadge.textContent = points;
    statBadge.classList.add('visible');
  } else {
    statBadge.classList.remove('visible');
  }
}

function showXpToast(amount, leveled, newLevel) {
  const toast = document.createElement('div');
  toast.className = 'xp-toast';
  toast.textContent = `+${amount} XP`;
  xpToastBox.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);

  if (leveled) {
    const lvlToast = document.createElement('div');
    lvlToast.className = 'xp-toast level-up';
    lvlToast.textContent = `▲ LEVEL ${newLevel}`;
    setTimeout(() => {
      xpToastBox.appendChild(lvlToast);
      setTimeout(() => lvlToast.remove(), 2200);
    }, 300);
  }

  // Refresh the HUD after a beat so the bar animates
  setTimeout(() => updateHudStats(), 50);
}

// Expose globally so quest & combat systems can call it
window._onXpGain = (amount, leveled, newLevel) => {
  showXpToast(amount, leveled, newLevel);
};

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

// ── Cinematic Flyby Camera ──────────────────────────────
// Phases: 0 = idle, 1 = chase (camera swoops behind ship),
//         2 = follow (ride behind ship to destination),
//         3 = settle (ease from chase to final section camera)
let flybyPhase = 0;
const FLYBY_CHASE_DUR  = 0.6;                    // swoop behind ship
const FLYBY_FOLLOW_DUR = SHIP_FLIGHT_DUR - 0.4;  // ride with ship (matches ship flight)
const FLYBY_SETTLE_DUR = 1.0;                     // ease to final cam
const FLYBY_TOTAL = FLYBY_CHASE_DUR + FLYBY_FOLLOW_DUR + FLYBY_SETTLE_DUR;

let flybyTimer = 0;
let flybyChaseCamStart = new THREE.Vector3();
let flybyChaseOffset = new THREE.Vector3();  // offset behind/above ship
let flybySettleStart = new THREE.Vector3();
let flybySettleLookStart = new THREE.Vector3();

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
  // Block navigation during active combat
  if (combatSystem?.active) return;

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

  // ── Start cinematic flyby ──────────────────────────────
  flybyPhase = 1;
  flybyTimer = 0;
  flybyChaseCamStart.copy(camera.position);

  // Track exploration progress (check before saving to detect new discoveries)
  const charBefore = loadCharacter();
  const exploredBefore = charBefore?.sectorsExplored || ['home'];
  const isNewSector = !exploredBefore.includes(section);
  trackProgress(section);

  // Check if ALL sectors are now explored (combat unlock milestone)
  const charAfter = loadCharacter();
  const exploredAfter = charAfter?.sectorsExplored || [];
  const allExplored = allSectors.every(s => exploredAfter.includes(s));

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === section);
  });

  // Update location indicator
  document.getElementById('location-name').textContent = section.toUpperCase();

  // Hide content during transition
  const contentOverlay = document.getElementById('content-overlay');
  contentOverlay.classList.remove('visible');

  // Content appears after the flyby finishes (slightly after settle begins)
  setTimeout(() => {
    document.getElementById('content-inner').innerHTML = pageContent[section] || '';
    contentOverlay.classList.add('visible');
    audio.playArrive();

    // Wire up contact form when navigating to that section
    if (section === 'contact') initContactForm();

    // Narrator speaks about this section
    narrator.onSectionArrive(section);

    // Exploration milestone narration
    if (isNewSector && section !== 'home') {
      const sectorCount = exploredAfter.length;
      const remaining = allSectors.length - sectorCount;

      if (allExplored) {
        // All sectors explored — combat unlock announcement
        setTimeout(() => {
          narrator.speakOnce('allSectorsExplored',
            'You have charted every sector of this station, pilot. The void stirs with approval… but so does something else. Hostile signatures are now within range. Prepare yourself.'
          );
        }, 15000);
      } else if (sectorCount === 2) {
        // First new sector discovered (besides home)
        setTimeout(() => {
          narrator.speakOnce('firstSectorDiscovered',
            `A new sector charted. ${remaining} remain unexplored. The void rewards those who venture further, pilot.`
          );
        }, 15000);
      } else if (remaining > 0 && remaining <= 2) {
        // Almost done
        setTimeout(() => {
          narrator.speakOnce('almostExplored_' + sectorCount,
            `Only ${remaining} sector${remaining > 1 ? 's' : ''} left undiscovered. Complete your survey of the station… something awaits those who see it all.`
          );
        }, 15000);
      }
    }

    // Offer a quest after narrator finishes (delay so it doesn't overlap)
    setTimeout(() => {
      if (questSystem) questSystem.onSectionArrive(section);
    }, 6000);

    // ~30% chance the Void comments on a passing satellite after section narration
    if (Math.random() < 0.3) {
      setTimeout(() => narrator.speakStarlinkQuip(), 8000);
    }
  }, (FLYBY_TOTAL - 0.3) * 1000);
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

  // Quest pin hover cursor
  if (questSystem && waypoints && !isTransitioning && !combatSystem?.active) {
    pinMouseVec.x = mouse.x;
    pinMouseVec.y = mouse.y;
    pinRaycaster.setFromCamera(pinMouseVec, camera);
    const pinMeshes = [];
    waypoints.forEach(group => {
      group.children.forEach(child => {
        if (child.userData?.isQuestPinPivot && child.visible) {
          child.traverse(c => { if (c.isMesh) pinMeshes.push(c); });
        }
      });
    });
    const hovering = pinMeshes.length > 0 && pinRaycaster.intersectObjects(pinMeshes, false).length > 0;
    canvas.style.cursor = hovering ? 'pointer' : '';
  }
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

  // Populate pilot HUD with saved stats
  updateHudStats();

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

  // Smooth mouse (faster during combat for responsive aiming)
  const mouseLerp = (combatSystem?.active) ? 0.5 : 0.05;
  mouseSmooth.x += (mouse.x - mouseSmooth.x) * mouseLerp;
  mouseSmooth.y += (mouse.y - mouseSmooth.y) * mouseLerp;

  // Feed mouse aim to starship
  setShipMouse(mouseSmooth.x, mouseSmooth.y);
  setShipCombat(combatSystem?.active || false);

  // ── Cinematic Flyby Camera System ─────────────────────
  if (isTransitioning && flybyPhase > 0) {
    flybyTimer += delta;

    // Helper: ship's current world position
    const shipPos = starship ? starship.position.clone() : transitionEnd.clone();

    if (flybyPhase === 1) {
      // Phase 1 — CHASE: swoop camera behind/above the ship
      const t1 = Math.min(flybyTimer / FLYBY_CHASE_DUR, 1);
      const e1 = easeInOutCubic(t1);

      // Compute a "behind ship" position: offset behind flight direction
      const flightDir = new THREE.Vector3().subVectors(transitionEnd, transitionStart).normalize();
      flybyChaseOffset.copy(flightDir).multiplyScalar(-6).add(new THREE.Vector3(0, 2.5, 0));
      const chaseCamTarget = shipPos.clone().add(flybyChaseOffset);

      camera.position.lerpVectors(flybyChaseCamStart, chaseCamTarget, e1);
      cameraLookTarget.lerpVectors(lookStart, shipPos, e1);

      if (t1 >= 1) { flybyPhase = 2; flybyTimer = 0; }
    } else if (flybyPhase === 2) {
      // Phase 2 — FOLLOW: camera rides behind ship as it flies
      const t2 = Math.min(flybyTimer / FLYBY_FOLLOW_DUR, 1);

      // Stick behind the ship with the chase offset
      const chaseCam = shipPos.clone().add(flybyChaseOffset);
      camera.position.copy(chaseCam);
      cameraLookTarget.copy(shipPos);

      if (t2 >= 1) {
        flybyPhase = 3;
        flybyTimer = 0;
        flybySettleStart.copy(camera.position);
        flybySettleLookStart.copy(cameraLookTarget);
      }
    } else if (flybyPhase === 3) {
      // Phase 3 — SETTLE: ease from chase cam to final section camera
      const t3 = Math.min(flybyTimer / FLYBY_SETTLE_DUR, 1);
      const e3 = easeInOutCubic(t3);

      camera.position.lerpVectors(flybySettleStart, transitionEnd, e3);
      cameraLookTarget.lerpVectors(flybySettleLookStart, lookEnd, e3);

      if (t3 >= 1) {
        flybyPhase = 0;
        isTransitioning = false;
        camera.position.copy(transitionEnd);
        cameraLookTarget.copy(lookEnd);
      }
    }
  }

  // Mouse parallax
  const parallaxOffset = new THREE.Vector3(
    mouseSmooth.x * 0.5,
    mouseSmooth.y * 0.3,
    0
  );

  // During combat camera transition or engagement, look at the arena target
  if (combatSystem?.camTransitioning || combatSystem?.engaged) {
    const t = easeInOutCubic(Math.min(combatSystem.camTransProgress, 1));
    const combatLookBase = combatSystem.camTransDir === 1
      ? cameraLookTarget.clone().lerp(combatSystem.camArenaLook, t)
      : combatSystem.camArenaLook.clone().lerp(cameraLookTarget, t);
    if (combatSystem.engaged && !combatSystem.camTransitioning) {
      combatLookBase.copy(combatSystem.camArenaLook);
    }
    combatLookBase.add(parallaxOffset);
    camera.lookAt(combatLookBase);
  } else {
    const finalLook = cameraLookTarget.clone().add(parallaxOffset);
    camera.lookAt(finalLook);
  }

  // Animate starfield
  if (starfield) {
    starfield.rotation.y += delta * 0.01;
    starfield.rotation.x += delta * 0.005;
  }

  // Animate nebula
  if (nebula && nebula.material.uniforms) {
    nebula.material.uniforms.uTime.value = elapsed;
  }

  // Animate waypoints (planets + orbiting satellites + quest pins)
  animateWaypoints(waypoints, elapsed);

  // Animate ship panel character hologram preview
  animateShipPreview(elapsed);

  // ── Quest Pin Visibility ──────────────────────────────
  if (questSystem && !isTransitioning) {
    waypoints.forEach(group => {
      group.children.forEach(child => {
        if (child.userData?.isQuestPinPivot) {
          const section = child.userData.section;
          child.visible = questSystem.hasQuestAvailable(section);
        }
      });
    });
  }

  // Animate starship
  animateStarship(starship, elapsed, delta);

  // Update combat system (pass raw mouse for precise aim)
  if (combatSystem) {
    combatSystem.update(delta, elapsed, { x: mouse.x, y: mouse.y }, mouseDown);
  }

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

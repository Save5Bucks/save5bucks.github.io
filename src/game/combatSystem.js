/**
 * COMBAT SYSTEM — Random space encounters  v2
 *
 * Features:
 *  • Random red enemy ARC-170 (FBX) ships appear (max 1, ≥60 s cooldown).
 *  • Camera transitions to an open-space arena away from planets.
 *  • Red vignette + ENGAGE / RETREAT buttons on encounter start.
 *  • Player fires from ship toward mouse aim. Enemy fires back.
 *  • Player takes visual hits (screen shake, flash) but never dies.
 *  • XP + stat upgrades on kill.
 *
 * Exports:
 *   CombatSystem — class, needs (scene, camera, ship, audio, narrator)
 *   Must call .update(delta, elapsed, mouseNDC, mouseDown) every frame
 */

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { awardXP, incrementStat, loadCharacter } from './saveSystem.js';
import { setShipTarget } from '../scene/starship.js';

// ── Config ──────────────────────────────────────────────
const ENCOUNTER_COOLDOWN = 60;
const ENCOUNTER_CHANCE   = 0.15;
const ENEMY_BASE_HP      = 3;
const BASE_FIRE_RATE     = 0.45;
const PROJECTILE_SPEED   = 120;
const PROJECTILE_LIFE    = 2.5;
const HIT_RANGE          = 1.8;
const XP_PER_KILL        = 30;

// All sections that must be explored before combat unlocks
const ALL_SECTORS = ['home', 'about', 'services', 'software', 'portfolio', 'contact'];

// Camera arena
const ARENA_OFFSET = new THREE.Vector3(0, 200, -500);
const CAM_TRANSITION_DUR = 1.6;

// Enemy fire
const ENEMY_FIRE_INTERVAL_MIN = 1.5;
const ENEMY_FIRE_INTERVAL_MAX = 3.5;
const ENEMY_PROJECTILE_SPEED  = 40;

// ── Helpers ─────────────────────────────────────────────
const rand = (a, b) => a + Math.random() * (b - a);

// ── Reusable scratch objects (avoid per-frame allocations) ────
const _scratchVec  = new THREE.Vector3();
const _scratchVec2 = new THREE.Vector3();
const _raycaster   = new THREE.Raycaster();
const _aimNDC      = new THREE.Vector2();

// ── Easing ──────────────────────────────────────────────
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class CombatSystem {
  constructor(scene, camera, ship, audio, narrator) {
    this.scene    = scene;
    this.camera   = camera;
    this.ship     = ship;
    this.audio    = audio;
    this.narrator = narrator;

    // ── State ───────────────────────────────────────────
    this.active       = false;
    this.engaged      = false;
    this.retreated    = false;          // set true on retreat — stops encounter loop permanently
    this.cooldownTimer = 10;
    this.checkTimer    = 0;
    this.fireCooldown  = 0;

    // ── Camera transition ───────────────────────────────
    this.camTransitioning = false;
    this.camTransDir      = 0;     // 1 = to arena, -1 = back
    this.camTransProgress = 0;
    this.camOrigPos       = new THREE.Vector3();
    this.camOrigLook      = new THREE.Vector3();
    this.camArenaPos      = new THREE.Vector3();
    this.camArenaLook     = new THREE.Vector3();

    // ── Enemy ───────────────────────────────────────────
    this.enemy       = null;
    this.enemyGroup  = new THREE.Group();
    this.scene.add(this.enemyGroup);
    this.enemyModel  = null;
    this._loadEnemyModel();

    // ── Projectiles ─────────────────────────────────────
    this.projectiles      = [];
    this.projectilePool   = [];
    this.enemyProjectiles = [];
    this.enemyProjPool    = [];

    // ── Explosions ──────────────────────────────────────
    this.explosionParts = [];

    // ── Narrator combat callouts ────────────────────────
    this._hitNarratorCooldown = 0;
    this._killCount = 0;

    this._hitLines = [
      'Shields absorbing fire… stay focused, pilot.',
      'They graze your hull. Retaliate!',
      'Impact detected. Show them your resolve.',
      'A glancing blow. The void does not flinch — neither should you.',
      'Warning — incoming fire. Adjust your trajectory.',
      'Pain is temporary, pilot. Victory is eternal.',
      'They dare strike at you? End them.',
    ];

    this._killLines = [
      'Target destroyed. +%XP% XP credited to your log.',
      'Hostile neutralized. The void claims another.',
      'Debris scatters across the sector. Well done, pilot.',
      'Another threat silenced. +%XP% XP to your record.',
      'Clean kill. The stars remember your precision.',
      'Enemy vessel eliminated. The sector is yours.',
    ];

    this._levelUpLines = [
      'Power surges through your vessel — you have reached Level %LVL%!',
      'LEVEL %LVL%! The void trembles at your ascension, pilot.',
      'Your potential deepens… Level %LVL% achieved. Spend your points wisely.',
      'A new threshold crossed — Level %LVL%. The galaxy takes notice.',
      'Level %LVL%! With each victory, you forge yourself anew.',
    ];

    // ── HUD ─────────────────────────────────────────────
    this._buildHUD();
  }

  // ══════════════════════════════════════════════════════
  //  LOAD FBX MODEL (cached, cloned per encounter)
  // ══════════════════════════════════════════════════════
  _loadEnemyModel() {
    const loader = new FBXLoader();
    loader.load(
      '/models/arc-170-starfighter-pathfinder/source/ArcPathfinder.fbx',
      (fbx) => {
        const box  = new THREE.Box3().setFromObject(fbx);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 2.0 / maxDim;
        fbx.scale.setScalar(scale);

        const center = new THREE.Vector3();
        box.getCenter(center);
        fbx.position.sub(center.multiplyScalar(scale));

        const redMat = new THREE.MeshStandardMaterial({
          color: 0xff2222,
          emissive: 0xff0000,
          emissiveIntensity: 0.5,
          metalness: 0.7,
          roughness: 0.3,
          transparent: true,
          opacity: 0.92,
        });
        fbx.traverse((c) => { if (c.isMesh) c.material = redMat.clone(); });

        this.enemyModel = fbx;
      },
      undefined,
      (err) => console.warn('CombatSystem: FBX load failed, using fallback', err),
    );
  }

  // ══════════════════════════════════════════════════════
  //  HUD — HP bar, vignette, engage/retreat, hit flash
  // ══════════════════════════════════════════════════════
  _buildHUD() {
    // HP bar
    const bar = document.createElement('div');
    bar.id = 'enemy-hp-bar';
    bar.className = 'enemy-hp-bar';
    bar.innerHTML = `
      <div class="enemy-hp-label">HOSTILE</div>
      <div class="enemy-hp-track"><div class="enemy-hp-fill"></div></div>
    `;
    document.getElementById('hud').appendChild(bar);
    this.hpBar  = bar;
    this.hpFill = bar.querySelector('.enemy-hp-fill');

    // Red vignette
    const vig = document.createElement('div');
    vig.className = 'combat-vignette';
    document.body.appendChild(vig);
    this.vignette = vig;

    // Canvas ref for screen shake
    this.canvas = document.getElementById('space-canvas');
    this._shakeIntensity = 0;

    // Engage / Retreat panel
    const panel = document.createElement('div');
    panel.className = 'combat-prompt';
    panel.innerHTML = `
      <div class="combat-prompt-inner">
        <div class="combat-prompt-icon">⚠</div>
        <div class="combat-prompt-title">HOSTILE CONTACT</div>
        <div class="combat-prompt-sub">An enemy vessel has entered the sector.</div>
        <div class="combat-prompt-buttons">
          <button class="combat-btn combat-engage"><i class="bi bi-crosshair"></i> ENGAGE</button>
          <button class="combat-btn combat-retreat"><i class="bi bi-arrow-return-left"></i> RETREAT</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
    this.promptPanel = panel;
    panel.querySelector('.combat-engage').addEventListener('click', () => this._onEngage());
    panel.querySelector('.combat-retreat').addEventListener('click', () => this._onRetreat());

    // Hit flash overlay
    const flash = document.createElement('div');
    flash.className = 'combat-hit-flash';
    document.body.appendChild(flash);
    this.hitFlash = flash;
  }

  // ══════════════════════════════════════════════════════
  //  CAMERA TRANSITION
  // ══════════════════════════════════════════════════════
  _beginCameraToArena() {
    this.camOrigPos.copy(this.camera.position);
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.camOrigLook.copy(this.camera.position).add(dir);

    this.camArenaPos.copy(this.camera.position).add(ARENA_OFFSET);
    this.camArenaLook.copy(this.camArenaPos).add(new THREE.Vector3(0, 0, -5));

    // Also reposition enemy into the arena
    if (this.enemy) {
      const arenaCenter = this.camArenaPos.clone().add(new THREE.Vector3(0, 0, -15));
      const spawnPos = arenaCenter.clone()
        .add(new THREE.Vector3(rand(-6, 6), rand(2, 6), rand(-8, -3)));
      this.enemy.group.position.copy(spawnPos);
      this.enemy.spawnPos.copy(spawnPos);
    }

    this.camTransitioning = true;
    this.camTransDir      = 1;
    this.camTransProgress = 0;

    // Fly the player ship to the arena too
    setShipTarget(this.ship, this.camArenaPos, this.camArenaLook);
  }

  _beginCameraReturn() {
    this.camTransitioning = true;
    this.camTransDir      = -1;
    this.camTransProgress = 0;

    // Fly the player ship back to the original position
    setShipTarget(this.ship, this.camOrigPos, this.camOrigLook);
  }

  // ══════════════════════════════════════════════════════
  //  ENGAGE / RETREAT
  // ══════════════════════════════════════════════════════
  _onEngage() {
    this.engaged = true;
    this.promptPanel.classList.remove('visible');
    this._beginCameraToArena();
    if (this.narrator) {
      this.narrator.speakCombatLine('engage');
    }
  }

  _onRetreat() {
    this.promptPanel.classList.remove('visible');
    this.vignette.classList.remove('visible');
    this.hpBar.classList.remove('visible');
    document.body.classList.remove('combat-active');
    if (this.enemy) {
      this.enemyGroup.remove(this.enemy.group);
      this.enemy.group.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material?.dispose) c.material.dispose();
      });
    }
    this.enemy      = null;
    this.active     = false;
    this.engaged    = false;
    this.retreated  = true;              // permanently stop encounter loop
    this.cooldownTimer = ENCOUNTER_COOLDOWN;

    // Clean enemy projectiles
    this.enemyProjectiles.forEach(p => { this.scene.remove(p.mesh); p.mesh.visible = false; });
    this.enemyProjectiles = [];

    if (this.narrator) {
      this.narrator.speakCombatLine('retreat');
    }
  }

  // ══════════════════════════════════════════════════════
  //  SPAWN ENEMY
  // ══════════════════════════════════════════════════════
  _spawnEnemy() {
    this.vignette.classList.add('visible');
    this.promptPanel.classList.add('visible');
    this.engaged = false;
    document.body.classList.add('combat-active');

    const group = new THREE.Group();

    if (this.enemyModel) {
      const clone = this.enemyModel.clone();
      clone.traverse((c) => { if (c.isMesh && c.material) c.material = c.material.clone(); });
      group.add(clone);
    } else {
      this._addFallbackMesh(group);
    }

    // Temp position (will be moved to arena on engage)
    const spawnPos = this.camera.position.clone()
      .add(ARENA_OFFSET)
      .add(new THREE.Vector3(rand(-6, 6), rand(2, 6), rand(-15, -5)));
    group.position.copy(spawnPos);

    // Engine glow
    const engineGeo = new THREE.SphereGeometry(0.35, 6, 4);
    const engineMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.8 });
    const engine = new THREE.Mesh(engineGeo, engineMat);
    engine.position.z = 1.2;
    group.add(engine);

    // Self-light
    const light = new THREE.PointLight(0xff2200, 1.5, 15);
    group.add(light);

    this.enemyGroup.add(group);

    const mats = [];
    group.traverse(c => { if (c.isMesh && c.material?.emissiveIntensity !== undefined) mats.push(c.material); });

    // Scale enemy HP with player level — doubles each level
    const char = loadCharacter();
    const playerLevel = char?.level || 1;
    const scaledHP = ENEMY_BASE_HP * Math.pow(2, playerLevel - 1);

    this.enemy = {
      group,
      mats,
      engineMat,
      hp: scaledHP,
      maxHp: scaledHP,
      alive: true,
      spawnPos: spawnPos.clone(),
      // ── Randomized fighter flight ─────────────────────
      flightVel: new THREE.Vector3(rand(-2, 2), rand(-1, 1), rand(-2, 2)),
      flightAccel: new THREE.Vector3(),
      maneuverTimer: rand(1.5, 3.5),    // time until next direction change
      speedScale: rand(0.6, 1.2),       // overall speed multiplier
      bankAngle: 0,                      // visual roll
      strafeDir: Math.random() < 0.5 ? 1 : -1,
      diveTimer: 0,                     // for occasional dive/climb bursts
      hitFlash: 0,
      fireTimer: rand(ENEMY_FIRE_INTERVAL_MIN, ENEMY_FIRE_INTERVAL_MAX),
    };

    this.active = true;
    this.hpBar.classList.add('visible');
    this._updateHPBar();

    if (this.audio) { this.audio.init(); this.audio.playAlert?.(); }
    if (this.narrator) {
      this.narrator.speakCombatLine('spawn');
    }
  }

  _addFallbackMesh(group) {
    const bodyGeo = new THREE.ConeGeometry(0.6, 3, 4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 0.4,
      metalness: 0.7, roughness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);
    const wingGeo = new THREE.BoxGeometry(3, 0.05, 1.2);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xcc1111, emissive: 0x660000, emissiveIntensity: 0.3,
      metalness: 0.6, roughness: 0.4,
    });
    group.add(new THREE.Mesh(wingGeo, wingMat));
  }

  // ══════════════════════════════════════════════════════
  //  FIRE — player projectile from ship toward mouse
  // ══════════════════════════════════════════════════════
  _fire(mouseNDC) {
    const char = loadCharacter();
    const gunSpeed = char?.gunSpeed || 1;
    const fireRate = BASE_FIRE_RATE / (1 + (gunSpeed - 1) * 0.25);
    if (this.fireCooldown > 0) return;
    this.fireCooldown = fireRate;

    _aimNDC.set(mouseNDC.x, mouseNDC.y);
    _raycaster.setFromCamera(_aimNDC, this.camera);
    const aimPoint = _scratchVec.copy(_raycaster.ray.origin)
      .addScaledVector(_raycaster.ray.direction, 100);
    const origin = this.ship ? _scratchVec2.copy(this.ship.position) : _scratchVec2.copy(_raycaster.ray.origin);
    const dir = aimPoint.sub(origin).normalize();

    // Offset spawn slightly forward so bullet clears the ship immediately
    const spawnPos = origin.addScaledVector(dir, 1.5);

    let mesh;
    if (this.projectilePool.length > 0) {
      mesh = this.projectilePool.pop();
      mesh.visible = true;
    } else {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 4, 3),
        new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.9 }),
      );
    }
    mesh.position.copy(spawnPos);
    this.scene.add(mesh);
    this.projectiles.push({ mesh, velocity: dir.clone().multiplyScalar(PROJECTILE_SPEED), life: PROJECTILE_LIFE });
    if (this.audio) this.audio.playLaser?.();
  }

  // ══════════════════════════════════════════════════════
  //  ENEMY FIRE — red projectile toward player ship
  // ══════════════════════════════════════════════════════
  _enemyFire() {
    if (!this.enemy?.alive || !this.ship) return;
    const origin = this.enemy.group.position.clone();
    const target = this.ship.position.clone();
    const dir = target.sub(origin).normalize();

    let mesh;
    if (this.enemyProjPool.length > 0) {
      mesh = this.enemyProjPool.pop();
      mesh.visible = true;
    } else {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 4, 3),
        new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.9 }),
      );
    }
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.enemyProjectiles.push({
      mesh,
      velocity: dir.multiplyScalar(ENEMY_PROJECTILE_SPEED),
      life: PROJECTILE_LIFE,
    });
    if (this.audio) this.audio.playLaser?.();
  }

  // ══════════════════════════════════════════════════════
  //  PLAYER HIT — visual only (shake + flash)
  // ══════════════════════════════════════════════════════
  _playerHit() {
    this._shakeIntensity = 6;
    this.hitFlash.classList.add('active');
    setTimeout(() => this.hitFlash.classList.remove('active'), 200);
    if (this.audio) this.audio.playHit?.();

    // Narrator combat callout (throttled — max once per 8s)
    if (this.narrator && this._hitNarratorCooldown <= 0) {
      this._hitNarratorCooldown = 8;
      setTimeout(() => this.narrator.speakCombatLine('hit'), 400);
    }
  }

  // ══════════════════════════════════════════════════════
  //  EXPLOSION
  // ══════════════════════════════════════════════════════
  _explode(position) {
    const count = 30;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(rand(0.08, 0.25), 4, 3);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(rand(0, 0.1), 1, rand(0.4, 0.7)),
        transparent: true, opacity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      this.scene.add(mesh);
      this.explosionParts.push({
        mesh,
        velocity: new THREE.Vector3(rand(-10, 10), rand(-10, 10), rand(-10, 10)),
        life: rand(0.5, 1.5),
        maxLife: rand(0.5, 1.5),
      });
    }
  }

  // ══════════════════════════════════════════════════════
  //  KILL ENEMY
  // ══════════════════════════════════════════════════════
  _killEnemy() {
    this.enemy.alive = false;
    this._explode(this.enemy.group.position.clone());
    this.enemyGroup.remove(this.enemy.group);
    this.enemy.group.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material?.dispose) c.material.dispose();
    });

    const result = awardXP(XP_PER_KILL);
    incrementStat('combatKills');
    this.hpBar.classList.remove('visible');
    if (this.audio) this.audio.playExplosion?.();

    // Notify HUD
    if (window._onXpGain) window._onXpGain(XP_PER_KILL, result.leveled, result.newLevel);

    if (this.narrator) {
      this._killCount++;
      setTimeout(() => this.narrator.speakCombatLine('kill'), 800);

      // Separate level-up congratulation after the kill line
      if (result.leveled) {
        const lvlKey = 'combatLevelUp_' + result.newLevel;
        const lvlLine = this._levelUpLines[Math.floor(Math.random() * this._levelUpLines.length)]
          .replace('%LVL%', result.newLevel);
        setTimeout(() => this.narrator.speakOnce(lvlKey, lvlLine), 4500);
      }
    }

    // Return camera after a beat
    setTimeout(() => {
      this.vignette.classList.remove('visible');
      document.body.classList.remove('combat-active');
      this._beginCameraReturn();
    }, 1500);

    // Clean enemy projectiles
    this.enemyProjectiles.forEach(p => { this.scene.remove(p.mesh); p.mesh.visible = false; this.enemyProjPool.push(p.mesh); });
    this.enemyProjectiles = [];

    this.enemy      = null;
    this.active     = false;
    this.engaged    = false;
    this.cooldownTimer = ENCOUNTER_COOLDOWN;
  }

  _updateHPBar() {
    if (!this.enemy) return;
    const pct = Math.max(0, this.enemy.hp / this.enemy.maxHp) * 100;
    this.hpFill.style.width = pct + '%';
  }

  // ══════════════════════════════════════════════════════
  //  MAIN UPDATE  (call every frame)
  // ══════════════════════════════════════════════════════
  update(delta, elapsed, mouseNDC, mouseDown) {

    // Clamp delta to prevent physics explosions on tab-switch / lag spikes
    const dt = Math.min(delta, 0.1);

    // ── Camera transition ───────────────────────────────
    if (this.camTransitioning) {
      this.camTransProgress += delta / CAM_TRANSITION_DUR;
      if (this.camTransProgress >= 1) {
        this.camTransProgress = 1;
        this.camTransitioning = false;
      }
      const t = easeInOutCubic(Math.min(this.camTransProgress, 1));
      if (this.camTransDir === 1) {
        this.camera.position.lerpVectors(this.camOrigPos, this.camArenaPos, t);
      } else {
        this.camera.position.lerpVectors(this.camArenaPos, this.camOrigPos, t);
      }
    }

    // ── Encounter spawn logic ───────────────────────────
    if (!this.active) {
      // Player retreated — stop all future encounters
      if (this.retreated) return;

      // Combat is locked until the player has explored every sector
      const char = loadCharacter();
      const explored = char?.sectorsExplored || [];
      const combatUnlocked = ALL_SECTORS.every(s => explored.includes(s));
      if (!combatUnlocked) return;  // skip all combat logic

      this.cooldownTimer -= delta;
      if (this.cooldownTimer <= 0) {
        this.checkTimer += delta;
        if (this.checkTimer >= 1) {
          this.checkTimer = 0;
          if (Math.random() < ENCOUNTER_CHANCE) {
            this._spawnEnemy();
          }
        }
      }
    }

    // ── Fire cooldown ───────────────────────────────────
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    // ── Narrator hit callout cooldown ───────────────────
    if (this._hitNarratorCooldown > 0) this._hitNarratorCooldown -= dt;

    // ── Player shooting (only after engaging) ───────────
    if (this.active && this.engaged && this.enemy?.alive && mouseDown) {
      this._fire(mouseNDC);
    }

    // ── Update enemy ────────────────────────────────────
    if (this.enemy?.alive && this.engaged) {
      const e = this.enemy;

      // ── Maneuver timer: pick new random direction periodically ──
      e.maneuverTimer -= dt;
      if (e.maneuverTimer <= 0) {
        e.maneuverTimer = rand(1.8, 4.5);
        e.strafeDir = Math.random() < 0.5 ? 1 : -1;
        e.speedScale = rand(0.5, 1.4);

        // New random acceleration impulse
        e.flightAccel.set(
          rand(-3, 3) * e.strafeDir,
          rand(-1.5, 1.5),
          rand(-2, 2),
        );

        // Occasional dive/climb burst
        if (Math.random() < 0.3) {
          e.diveTimer = rand(0.5, 1.2);
          e.flightAccel.y += (Math.random() < 0.5 ? 1 : -1) * rand(2, 4);
        }
      }

      // Dive burst countdown
      if (e.diveTimer > 0) {
        e.diveTimer -= dt;
      } else {
        // Gentle gravity back toward spawn height
        const yDiff = e.spawnPos.y - e.group.position.y;
        e.flightAccel.y += yDiff * 0.3;
      }

      // Soft leash: steer back toward spawn area when drifting too far
      _scratchVec2.subVectors(e.spawnPos, e.group.position);
      const driftDist = _scratchVec2.length();
      if (driftDist > 8) {
        _scratchVec2.normalize().multiplyScalar((driftDist - 8) * 0.4);
        e.flightAccel.add(_scratchVec2);
      }

      // Apply acceleration to velocity (capped)
      e.flightVel.addScaledVector(e.flightAccel, dt);
      const maxSpeed = 4.0 * e.speedScale;
      if (e.flightVel.length() > maxSpeed) {
        e.flightVel.normalize().multiplyScalar(maxSpeed);
      }

      // Smooth exponential damping (frame-rate independent)
      const damping = Math.exp(-1.5 * dt);
      e.flightVel.multiplyScalar(damping);

      // Move
      e.group.position.addScaledVector(e.flightVel, dt);

      // ── Face the player with banking ──────────────────
      _scratchVec2.subVectors(this.camera.position, e.group.position).normalize();
      _scratchVec.copy(e.group.position).add(_scratchVec2);
      e.group.lookAt(_scratchVec);

      // Visual roll/bank based on lateral velocity
      const localRight = _scratchVec.set(1, 0, 0).applyQuaternion(e.group.quaternion);
      const lateralSpeed = e.flightVel.dot(localRight);
      const targetBank = THREE.MathUtils.clamp(lateralSpeed * -0.4, -0.6, 0.6);
      e.bankAngle += (targetBank - e.bankAngle) * (1 - Math.exp(-5 * dt));
      e.group.rotateZ(e.bankAngle);

      // Hit flash decay
      if (e.hitFlash > 0) {
        e.hitFlash -= dt * 4;
        const intensity = 0.5 + e.hitFlash * 3;
        e.mats.forEach(m => { m.emissiveIntensity = intensity; });
      } else {
        e.mats.forEach(m => { m.emissiveIntensity = 0.5; });
      }

      e.engineMat.opacity = 0.6 + Math.sin(elapsed * 8) * 0.3;

      // ── Enemy fires at player ─────────────────────────
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        this._enemyFire();
        e.fireTimer = rand(ENEMY_FIRE_INTERVAL_MIN, ENEMY_FIRE_INTERVAL_MAX);
      }
    }

    // ── Update player projectiles ───────────────────────
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.visible = false;
        this.projectilePool.push(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }
      p.mesh.position.addScaledVector(p.velocity, dt);

      if (this.enemy?.alive) {
        // Distance check from bullet to enemy group center
        this.enemy.group.getWorldPosition(_scratchVec);
        if (p.mesh.position.distanceTo(_scratchVec) < HIT_RANGE) {
          const char = loadCharacter();
          const dmg = char?.gunDamage || 1;
          this.enemy.hp -= dmg;
          this.enemy.hitFlash = 1;
          this._updateHPBar();

          this.scene.remove(p.mesh);
          p.mesh.visible = false;
          this.projectilePool.push(p.mesh);
          this.projectiles.splice(i, 1);

          if (this.audio) this.audio.playHit?.();
          if (this.enemy.hp <= 0) this._killEnemy();
          continue;
        }
      }
    }

    // ── Update enemy projectiles ────────────────────────
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const p = this.enemyProjectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.visible = false;
        this.enemyProjPool.push(p.mesh);
        this.enemyProjectiles.splice(i, 1);
        continue;
      }
      p.mesh.position.addScaledVector(p.velocity, dt);

      if (this.ship) {
        const dist = p.mesh.position.distanceTo(this.ship.position);
        if (dist < 2.5) {
          this.scene.remove(p.mesh);
          p.mesh.visible = false;
          this.enemyProjPool.push(p.mesh);
          this.enemyProjectiles.splice(i, 1);
          this._playerHit();
          continue;
        }
      }
    }

    // ── Update explosion particles ──────────────────────
    for (let i = this.explosionParts.length - 1; i >= 0; i--) {
      const ep = this.explosionParts[i];
      ep.life -= dt;
      if (ep.life <= 0) {
        this.scene.remove(ep.mesh);
        ep.mesh.geometry.dispose();
        ep.mesh.material.dispose();
        this.explosionParts.splice(i, 1);
        continue;
      }
      ep.mesh.position.addScaledVector(ep.velocity, dt);
      ep.mesh.material.opacity = Math.max(0, ep.life / ep.maxLife);
      ep.velocity.multiplyScalar(Math.exp(-3 * dt));
    }

    // ── Screen shake decay ──────────────────────────────
    if (this._shakeIntensity > 0) {
      this._shakeIntensity *= Math.exp(-10 * dt);
      if (this._shakeIntensity < 0.05) this._shakeIntensity = 0;
      const sx = (Math.random() - 0.5) * this._shakeIntensity;
      const sy = (Math.random() - 0.5) * this._shakeIntensity;
      this.canvas.style.transform = `translate(${sx}px, ${sy}px)`;
    } else {
      this.canvas.style.transform = '';
    }
  }

  // ══════════════════════════════════════════════════════
  //  CLEANUP
  // ══════════════════════════════════════════════════════
  dispose() {
    this.projectiles.forEach(p => this.scene.remove(p.mesh));
    this.enemyProjectiles.forEach(p => this.scene.remove(p.mesh));
    this.explosionParts.forEach(ep => this.scene.remove(ep.mesh));
    if (this.enemy?.group) this.enemyGroup.remove(this.enemy.group);
    this.scene.remove(this.enemyGroup);
  }
}

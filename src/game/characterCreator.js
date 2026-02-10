import * as THREE from 'three';
import { createCharacter, updateCharacterShaders, raceColors } from '../characters/characterFactory.js';
import { saveCharacter, createDefaultCharacter } from '../game/saveSystem.js';
import { AudioSystem } from '../audio/audioSystem.js';

/**
 * Character Creation System
 * Multi-step holographic character creator
 * Steps: Gender → Race → Class → Name → Enter Space
 */
export class CharacterCreator {
  constructor(onComplete) {
    this.onComplete = onComplete;
    this.audio = new AudioSystem();
    this.character = createDefaultCharacter();
    this.currentStep = 0;
    this.previewScene = null;
    this.previewCamera = null;
    this.previewRenderer = null;
    this.previewCharacter = null;
    this.animationId = null;
    this.clock = new THREE.Clock();

    this.steps = ['gender', 'race', 'class', 'name'];
    this._buildUI();
    this._initPreviewScene();
    this._showStep(0);
    this._animate();
  }

  // ── Preview Scene (mini Three.js scene for character preview) ──
  _initPreviewScene() {
    this.previewScene = new THREE.Scene();
    this.previewCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.previewCamera.position.set(0, 1, 4);
    this.previewCamera.lookAt(0, 0.8, 0);

    const canvas = document.getElementById('character-preview-canvas');
    this.previewRenderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.previewRenderer.setSize(300, 400);
    this.previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.previewRenderer.setClearColor(0x000000, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0x222244, 0.5);
    this.previewScene.add(ambient);

    const point = new THREE.PointLight(0x4488ff, 2, 20);
    point.position.set(2, 3, 3);
    this.previewScene.add(point);

    // Initial character
    this._updatePreview();
  }

  _updatePreview() {
    // Remove old character
    if (this.previewCharacter) {
      this.previewScene.remove(this.previewCharacter);
    }

    this.previewCharacter = createCharacter(this.character.race, this.character.gender);
    this.previewScene.add(this.previewCharacter);
  }

  _animate() {
    this.animationId = requestAnimationFrame(() => this._animate());
    const elapsed = this.clock.getElapsedTime();

    if (this.previewCharacter) {
      this.previewCharacter.rotation.y = Math.sin(elapsed * 0.5) * 0.5;
      updateCharacterShaders(this.previewCharacter, elapsed);
    }

    if (this.previewRenderer && this.previewScene && this.previewCamera) {
      this.previewRenderer.render(this.previewScene, this.previewCamera);
    }
  }

  // ── UI Construction ────────────────────────────────────
  _buildUI() {
    const overlay = document.createElement('div');
    overlay.id = 'character-creator';
    overlay.innerHTML = `
      <h1 class="cc-welcome">WELCOME TRAVELER</h1>
      <div class="cc-container">
        <div class="cc-left">
          <canvas id="character-preview-canvas" width="300" height="400"></canvas>
          <div class="cc-preview-label">HOLOGRAM PREVIEW</div>
        </div>

        <div class="cc-right">
          <div class="cc-header">
            <h1 class="cc-title">IDENTITY CONFIGURATION</h1>
            <div class="cc-steps-indicator">
              <span class="cc-step-dot active" data-step="0"></span>
              <span class="cc-step-dot" data-step="1"></span>
              <span class="cc-step-dot" data-step="2"></span>
              <span class="cc-step-dot" data-step="3"></span>
            </div>
          </div>

          <!-- Step 0: Gender -->
          <div class="cc-step" data-step="0">
            <h2 class="cc-step-title">SELECT FORM</h2>
            <p class="cc-step-desc">Choose your physical configuration</p>
            <div class="cc-options">
              <button class="cc-option" data-value="male">
                <span class="cc-option-icon"><i class="bi bi-gender-male"></i></span>
                <span class="cc-option-label">Male</span>
              </button>
              <button class="cc-option" data-value="female">
                <span class="cc-option-icon"><i class="bi bi-gender-female"></i></span>
                <span class="cc-option-label">Female</span>
              </button>
              <button class="cc-option" data-value="alien">
                <span class="cc-option-icon"><i class="bi bi-gender-ambiguous"></i></span>
                <span class="cc-option-label">Non-Binary</span>
              </button>
            </div>
          </div>

          <!-- Step 1: Race -->
          <div class="cc-step" data-step="1" style="display:none;">
            <h2 class="cc-step-title">SELECT SPECIES</h2>
            <p class="cc-step-desc">Choose your origin species</p>
            <div class="cc-options">
              <button class="cc-option" data-value="humanoid">
                <span class="cc-option-icon"><i class="bi bi-person-fill"></i></span>
                <span class="cc-option-label">Humanoid</span>
                <span class="cc-option-desc">Balanced &amp; adaptive</span>
              </button>
              <button class="cc-option" data-value="alienoid">
                <span class="cc-option-icon"><i class="bi bi-bug-fill"></i></span>
                <span class="cc-option-label">Alienoid</span>
                <span class="cc-option-desc">Tall &amp; enigmatic</span>
              </button>
              <button class="cc-option" data-value="catiod">
                <span class="cc-option-icon"><i class="bi bi-alexa"></i></span>
                <span class="cc-option-label">Catiod</span>
                <span class="cc-option-desc">Agile &amp; perceptive</span>
              </button>
              <button class="cc-option" data-value="dogiod">
                <span class="cc-option-icon"><i class="bi bi-reddit"></i></span>
                <span class="cc-option-label">Dogiod</span>
                <span class="cc-option-desc">Loyal &amp; resilient</span>
              </button>
            </div>
          </div>

          <!-- Step 2: Class -->
          <div class="cc-step" data-step="2" style="display:none;">
            <h2 class="cc-step-title">SELECT DIRECTIVE</h2>
            <p class="cc-step-desc">What brings you to deep space?</p>
            <div class="cc-options">
              <button class="cc-option" data-value="homeowner">
                <span class="cc-option-icon"><i class="bi bi-house-door-fill"></i></span>
                <span class="cc-option-label">Home Owner</span>
                <span class="cc-option-desc">Personal project seeker</span>
              </button>
              <button class="cc-option" data-value="businessowner">
                <span class="cc-option-icon"><i class="bi bi-building-fill"></i></span>
                <span class="cc-option-label">Business Owner</span>
                <span class="cc-option-desc">Enterprise commander</span>
              </button>
              <button class="cc-option" data-value="serverowner">
                <span class="cc-option-icon"><i class="bi bi-hdd-rack-fill"></i></span>
                <span class="cc-option-label">Server Owner</span>
                <span class="cc-option-desc">Infrastructure architect</span>
              </button>
            </div>
          </div>

          <!-- Step 3: Name -->
          <div class="cc-step" data-step="3" style="display:none;">
            <h2 class="cc-step-title">DESIGNATION</h2>
            <p class="cc-step-desc">Enter your callsign, traveler</p>
            <div class="cc-name-input-wrap">
              <input
                type="text"
                id="cc-name-input"
                class="cc-name-input"
                placeholder="Enter callsign..."
                maxlength="20"
                autocomplete="off"
              />
            </div>
            <button id="cc-launch-btn" class="cc-launch-btn" disabled>
              <span class="cc-launch-text">LAUNCH INTO THE VOID</span>
              <span class="cc-launch-arrow"><i class="bi bi-rocket-takeoff-fill"></i></span>
            </button>
          </div>

          <!-- Navigation -->
          <div class="cc-nav">
            <button id="cc-back-btn" class="cc-nav-btn" style="visibility:hidden;"><i class="bi bi-chevron-left"></i> BACK</button>
            <button id="cc-next-btn" class="cc-nav-btn cc-next-btn" style="display:none;">NEXT <i class="bi bi-chevron-right"></i></button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this._bindEvents();
  }

  // ── Event Binding ──────────────────────────────────────
  _bindEvents() {
    // Option buttons (gender, race, class)
    document.querySelectorAll('.cc-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.audio.init();
        this.audio.playClick();

        const step = this.steps[this.currentStep];
        const value = btn.dataset.value;

        // Update selection
        if (step === 'gender') this.character.gender = value;
        if (step === 'race') this.character.race = value;
        if (step === 'class') this.character.class = value;

        // Highlight selected
        btn.closest('.cc-options').querySelectorAll('.cc-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        // Update preview
        this._updatePreview();

        // Show NEXT button now that a selection is made (not on name step)
        if (this.currentStep < this.steps.length - 1) {
          document.getElementById('cc-next-btn').style.display = '';
        }
      });
    });

    // Back button
    document.getElementById('cc-back-btn').addEventListener('click', () => {
      this.audio.init();
      this.audio.playClick();
      this._prevStep();
    });

    // Next button
    document.getElementById('cc-next-btn').addEventListener('click', () => {
      this.audio.init();
      this.audio.playClick();
      this._nextStep();
    });

    // Name input
    const nameInput = document.getElementById('cc-name-input');
    const launchBtn = document.getElementById('cc-launch-btn');

    nameInput.addEventListener('input', () => {
      const name = nameInput.value.trim().toUpperCase();
      nameInput.value = nameInput.value.toUpperCase();
      this.character.name = name;
      launchBtn.disabled = name.length < 1;
    });

    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.character.name.trim().length > 0) {
        this._launch();
      }
    });

    // Launch button
    launchBtn.addEventListener('click', () => {
      this._launch();
    });
  }

  // ── Step Navigation ────────────────────────────────────
  _showStep(index) {
    document.querySelectorAll('.cc-step').forEach(el => {
      el.style.display = 'none';
    });
    const stepEl = document.querySelector(`.cc-step[data-step="${index}"]`);
    if (stepEl) stepEl.style.display = 'block';

    // Update dots
    document.querySelectorAll('.cc-step-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i <= index);
      dot.classList.toggle('current', i === index);
    });

    // Back button visibility
    const backBtn = document.getElementById('cc-back-btn');
    backBtn.style.visibility = index > 0 ? 'visible' : 'hidden';

    // NEXT button: hide on step change, hide on name step (step 3)
    const nextBtn = document.getElementById('cc-next-btn');
    if (index >= this.steps.length - 1) {
      // Name step — no NEXT button, uses LAUNCH instead
      nextBtn.style.display = 'none';
    } else {
      // Check if this step already has a selection
      const stepEl2 = document.querySelector(`.cc-step[data-step="${index}"]`);
      const hasSelection = stepEl2 && stepEl2.querySelector('.cc-option.selected');
      nextBtn.style.display = hasSelection ? '' : 'none';
    }

    // Focus name input on last step
    if (index === 3) {
      setTimeout(() => document.getElementById('cc-name-input').focus(), 300);
    }
  }

  _nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.audio.playNavigate();
      this._showStep(this.currentStep);
    }
  }

  _prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this._showStep(this.currentStep);
    }
  }

  // ── Launch ─────────────────────────────────────────────
  _launch() {
    if (!this.character.name.trim()) return;

    this.audio.init();
    this.audio.playNavigate();

    // Save to cookies
    saveCharacter(this.character);

    // Animate out
    const creator = document.getElementById('character-creator');
    creator.classList.add('cc-exit');

    // Cleanup after animation
    setTimeout(() => {
      cancelAnimationFrame(this.animationId);
      if (this.previewRenderer) {
        this.previewRenderer.dispose();
      }
      creator.remove();
      this.onComplete(this.character);
    }, 1500);
  }

  /**
   * Destroy the creator (for returning visitors)
   */
  destroy() {
    cancelAnimationFrame(this.animationId);
    if (this.previewRenderer) this.previewRenderer.dispose();
    const el = document.getElementById('character-creator');
    if (el) el.remove();
  }
}

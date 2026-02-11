/**
 * THE GREAT VOID — Narrator Engine
 * 
 * Typewriter dialogue system with:
 * - Character-by-character text reveal
 * - Sequential line progression
 * - Audio cues per character typed
 * - Auto-advance with pause between lines
 * - Click to skip/advance
 * - Contextual triggers per section
 */

import { getDialogue, getStarlinkQuip, getCombatLine, getShipCardLine, getGeneralLine } from './dialogueScripts.js';

export class Narrator {
  constructor(audioSystem) {
    this.audio = audioSystem;
    this.character = null;
    this.isActive = false;
    this.currentLines = [];
    this.currentLineIndex = 0;
    this.currentCharIndex = 0;
    this.typeTimer = null;
    this.pauseTimer = null;
    this.typeSpeed = 35;          // ms per character
    this.linePause = 2000;        // ms pause between lines
    this.hasSpoken = {};          // track which sections have been narrated
    this.onComplete = null;
    this.isTyping = false;
    this.isMuted = false;

    this._buildUI();
    this._bindEvents();
  }

  // ── UI ─────────────────────────────────────────────────
  _buildUI() {
    const el = document.createElement('div');
    el.id = 'narrator';
    el.innerHTML = `
      <div class="narrator-frame">
        <div class="narrator-header">
          <span class="narrator-source">THE GREAT VOID</span>
          <span class="narrator-signal"><i class="bi bi-broadcast"></i> SIGNAL ACTIVE</span>
        </div>
        <div class="narrator-body">
          <p id="narrator-text"><span id="narrator-typed"></span><span id="narrator-cursor" class="narrator-cursor">▌</span></p>
        </div>
        <div class="narrator-footer">
          <span class="narrator-hint">Click to continue</span>
          <div class="narrator-footer-actions">
            <button id="narrator-mute" class="narrator-mute-btn" title="Mute narrator sounds">
              <i class="bi bi-volume-up-fill"></i>
            </button>
            <button id="narrator-skip" class="narrator-skip-btn">SKIP <i class="bi bi-skip-forward-fill"></i></button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
  }

  _bindEvents() {
    const narratorEl = document.getElementById('narrator');

    // Click to advance or skip typing
    narratorEl.addEventListener('click', (e) => {
      // Don't advance if clicking skip or mute button
      if (e.target.id === 'narrator-skip' || e.target.closest('#narrator-skip')) return;
      if (e.target.id === 'narrator-mute' || e.target.closest('#narrator-mute')) return;
      this._handleAdvance();
    });

    // Skip button — dismiss entirely
    document.getElementById('narrator-skip').addEventListener('click', () => {
      this._dismiss();
    });

    // Mute button — toggle narrator sounds
    const muteBtn = document.getElementById('narrator-mute');
    muteBtn.addEventListener('click', () => {
      this.isMuted = !this.isMuted;
      muteBtn.innerHTML = this.isMuted
        ? '<i class="bi bi-volume-mute-fill"></i>'
        : '<i class="bi bi-volume-up-fill"></i>';
      muteBtn.classList.toggle('muted', this.isMuted);
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (!this.isActive) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this._handleAdvance();
      }
      if (e.key === 'Escape') {
        this._dismiss();
      }
    });
  }

  // ── Public API ─────────────────────────────────────────

  /**
   * Set the player character data for token replacement
   */
  setCharacter(character) {
    this.character = character;
  }

  /**
   * Speak a dialogue sequence by key (e.g. 'welcome', 'about', 'services')
   * Each call gets a fresh random variant, so repeat visits sound different.
   * @param {string} key — dialogue script key
   * @param {function} onComplete — callback when all lines are done
   */
  speak(key, onComplete = null) {
    const lines = getDialogue(key, this.character);
    if (!lines.length) return;

    this.currentLines = lines;
    this.currentLineIndex = 0;
    this.currentCharIndex = 0;
    this.onComplete = onComplete;
    this.isActive = true;

    // Show narrator
    const narratorEl = document.getElementById('narrator');
    narratorEl.classList.add('visible');
    document.getElementById('narrator-typed').textContent = '';

    // Play narrator arrival sound
    this._playVoidSound();

    // Start typing first line
    this._typeLine();
  }

  /**
   * Trigger section narration (called when navigating to a section)
   */
  onSectionArrive(section) {
    // Small delay so the camera transition settles
    setTimeout(() => {
      this.speak(section);
    }, 500);
  }

  /**
   * Speak a one-off line (raw string, not from dialogueScripts).
   * Won't interrupt active narration. Uses key for dedup.
   */
  speakOnce(key, text) {
    if (this.isActive) return;
    if (this.hasSpoken[key]) return;
    this.hasSpoken[key] = true;

    this.currentLines = [text];
    this.currentLineIndex = 0;
    this.currentCharIndex = 0;
    this.onComplete = null;
    this.isActive = true;

    const narratorEl = document.getElementById('narrator');
    narratorEl.classList.add('visible');
    document.getElementById('narrator-typed').textContent = '';

    this._playVoidSound();
    this._typeLine();
  }

  /**
   * Speak a random Starlink satellite quip.
   * Won't fire if narrator is already talking.
   */
  speakStarlinkQuip() {
    if (this.isActive || !this.character) return;

    const lines = getStarlinkQuip(this.character);
    if (!lines.length) return;

    this.currentLines = lines;
    this.currentLineIndex = 0;
    this.currentCharIndex = 0;
    this.onComplete = null;
    this.isActive = true;

    const narratorEl = document.getElementById('narrator');
    narratorEl.classList.add('visible');
    document.getElementById('narrator-typed').textContent = '';

    this._playVoidSound();
    this._typeLine();
  }

  /**
   * Speak a combat-state line by event type.
   * @param {'spawn'|'engage'|'retreat'|'kill'|'hit'|'ambient'} event
   */
  speakCombatLine(event) {
    if (this.isActive || !this.character) return;
    const line = getCombatLine(event, this.character);
    if (!line) return;

    this.currentLines = [line];
    this.currentLineIndex = 0;
    this.currentCharIndex = 0;
    this.onComplete = null;
    this.isActive = true;

    const narratorEl = document.getElementById('narrator');
    narratorEl.classList.add('visible');
    document.getElementById('narrator-typed').textContent = '';

    this._playVoidSound();
    this._typeLine();
  }

  /**
   * Speak a ship-card-state line by sub-topic.
   * @param {'general'|'xp'|'combat'|'quests'|'statPoints'|'exploration'} topic
   */
  speakShipCardLine(topic) {
    if (this.isActive || !this.character) return;
    const line = getShipCardLine(topic, this.character);
    if (!line) return;

    this.currentLines = [line];
    this.currentLineIndex = 0;
    this.currentCharIndex = 0;
    this.onComplete = null;
    this.isActive = true;

    const narratorEl = document.getElementById('narrator');
    narratorEl.classList.add('visible');
    document.getElementById('narrator-typed').textContent = '';

    this._playVoidSound();
    this._typeLine();
  }

  /**
   * Speak a random general/ambient cosmic musing.
   */
  speakGeneralLine() {
    if (this.isActive || !this.character) return;
    const line = getGeneralLine(this.character);
    if (!line) return;

    this.currentLines = [line];
    this.currentLineIndex = 0;
    this.currentCharIndex = 0;
    this.onComplete = null;
    this.isActive = true;

    const narratorEl = document.getElementById('narrator');
    narratorEl.classList.add('visible');
    document.getElementById('narrator-typed').textContent = '';

    this._playVoidSound();
    this._typeLine();
  }

  // ── Internal ───────────────────────────────────────────

  _handleAdvance() {
    if (!this.isActive) return;

    if (this.isTyping) {
      // Skip to end of current line
      this._finishLine();
    } else {
      // Advance to next line
      this._nextLine();
    }
  }

  _typeLine() {
    if (this.currentLineIndex >= this.currentLines.length) {
      this._dismiss();
      return;
    }

    const line = this.currentLines[this.currentLineIndex];
    const textEl = document.getElementById('narrator-typed');
    textEl.textContent = '';
    this.currentCharIndex = 0;
    this.isTyping = true;

    clearInterval(this.typeTimer);
    this.typeTimer = setInterval(() => {
      if (this.currentCharIndex < line.length) {
        textEl.textContent += line[this.currentCharIndex];
        this.currentCharIndex++;

        // Subtle typing sound every few characters
        if (this.currentCharIndex % 3 === 0) {
          this._playTypeTick();
        }
      } else {
        // Line complete
        clearInterval(this.typeTimer);
        this.isTyping = false;

        // Auto-advance after pause (if more lines)
        if (this.currentLineIndex < this.currentLines.length - 1) {
          this.pauseTimer = setTimeout(() => {
            this._nextLine();
          }, this.linePause);
        }
      }
    }, this.typeSpeed);
  }

  _finishLine() {
    clearInterval(this.typeTimer);
    clearTimeout(this.pauseTimer);

    const line = this.currentLines[this.currentLineIndex];
    document.getElementById('narrator-typed').textContent = line;
    this.isTyping = false;
  }

  _nextLine() {
    clearTimeout(this.pauseTimer);
    this.currentLineIndex++;

    if (this.currentLineIndex >= this.currentLines.length) {
      this._dismiss();
    } else {
      this._typeLine();
    }
  }

  _dismiss() {
    clearInterval(this.typeTimer);
    clearTimeout(this.pauseTimer);
    this.isActive = false;
    this.isTyping = false;

    const narratorEl = document.getElementById('narrator');
    narratorEl.classList.remove('visible');
    narratorEl.classList.add('dismissing');

    setTimeout(() => {
      narratorEl.classList.remove('dismissing');
    }, 600);

    if (this.onComplete) {
      this.onComplete();
      this.onComplete = null;
    }
  }

  // ── Audio ──────────────────────────────────────────────

  _playVoidSound() {
    if (this.isMuted || !this.audio || !this.audio.ctx) return;
    const ctx = this.audio.ctx;
    const now = ctx.currentTime;

    // Deep resonant hum
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 1.5);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.03, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.5);

    // Ethereal high tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.exponentialRampToValueAtTime(440, now + 1.0);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.0075, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    // Stereo pan sweep
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(-0.5, now);
    panner.pan.linearRampToValueAtTime(0.5, now + 1.0);

    osc2.connect(gain2).connect(panner).connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 1.0);
  }

  _playTypeTick() {
    if (this.isMuted || !this.audio || !this.audio.ctx) return;
    const ctx = this.audio.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200 + Math.random() * 400, now);
    gain.gain.setValueAtTime(0.00125, now);
    gain.gain.exponentialRampToValueAtTime(0.000125, now + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

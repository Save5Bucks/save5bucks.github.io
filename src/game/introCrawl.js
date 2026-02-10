/**
 * INTRO CRAWL — Star Wars–Style Opening
 * 
 * A perspective-scrolling text crawl that plays once on the
 * very first site visit, before the character creator.
 * Tells Tim's story rewritten as a deep-space transmission log.
 * 
 * Returns a Promise that resolves when the crawl finishes
 * naturally or is skipped by the user.
 */

export class IntroCrawl {
  constructor(audio) {
    this.audio = audio;
    this.el = null;
    this._resolve = null;
    this._musicPlaying = false;
    this._musicNodes = null;
  }

  /**
   * Show the crawl. Returns a promise that resolves when done/skipped.
   */
  play() {
    return new Promise((resolve) => {
      this._resolve = resolve;
      this._buildDOM();
      this._bindEvents();
      this._startStarfield();
      // Audio starts after user clicks the "begin" prompt (autoplay policy)
    });
  }

  // ── DOM ──────────────────────────────────────────────
  _buildDOM() {
    const el = document.createElement('div');
    el.id = 'intro-crawl';
    el.innerHTML = `
      <!-- Starfield canvas -->
      <canvas id="intro-stars"></canvas>

      <!-- Click-to-begin gate (provides user gesture for audio) -->
      <div class="crawl-begin-gate">
        <div class="crawl-begin-icon"><i class="bi bi-broadcast"></i></div>
        <div class="crawl-begin-text">INCOMING TRANSMISSION</div>
        <button class="crawl-begin-btn">
          <i class="bi bi-play-fill"></i> BEGIN TRANSMISSION
        </button>
      </div>

      <!-- "A long time ago…" tagline (hidden until gate is dismissed) -->
      <div class="crawl-tagline crawl-paused">
        From the outer reaches of deep space…<br>
        a transmission was received.
      </div>

      <!-- Perspective crawl (paused until gate is dismissed) -->
      <div class="crawl-perspective crawl-paused">
        <div class="crawl-content crawl-paused">

          <h1 class="crawl-title">
            <span class="crawl-subtitle">Transmission Log</span>
            FLINN BUILT
          </h1>

          <div class="crawl-divider"></div>

          <p class="crawl-text">
            In a distant sector of the digital frontier,
            a signal began transmitting — a signal forged from
            over <strong>fifteen years</strong> of building in the physical world
            and the boundless architecture of code.
          </p>

          <p class="crawl-text">
            The transmission originates from <em>Tim Flinn</em>,
            an engineer trained at the <strong>DeVry Institute
            of Computer Engineering</strong>, who first learned to
            command crews across construction sites before
            turning his gaze toward the stars.
          </p>

          <div class="crawl-divider"></div>

          <p class="crawl-text">
            From the steel and concrete of <strong>construction
            management</strong> — coordinating crews, commanding
            budgets, estimating costs, and erecting residential
            and commercial structures that defy gravity —
            he discovered a parallel universe: one built
            entirely from <strong>light and logic</strong>.
          </p>

          <p class="crawl-text">
            He began forging <strong>business applications</strong>
            that brought order to chaos, publishing
            <strong>mobile applications</strong> to devices across
            the known galaxy, and hosting <strong>multiplayer
            game servers</strong> where travelers from every
            system could gather, compete, and build
            communities that span the cosmos.
          </p>

          <div class="crawl-divider"></div>

          <p class="crawl-text">
            But the signal carries more. He wired
            <strong>surveillance networks</strong> that watch over
            commercial outposts in the darkness.
            He laid <strong>networking infrastructure</strong>
            that connects distant stations across the void.
            He tuned <strong>audio systems</strong> that fill
            every corridor of commercial space with sound.
          </p>

          <p class="crawl-text">
            In the realm of games, he forged
            <strong>custom mods and scripted features</strong>
            that reshaped entire digital worlds —
            running communities that keep players
            engaged and connected across the frontier.
          </p>

          <div class="crawl-divider"></div>

          <p class="crawl-text">
            Now, from the bridge of his starship,
            he combines <strong>technical precision</strong> with
            <strong>practical problem-solving</strong> — building
            solutions that span both the physical
            and the digital frontier.
          </p>

          <p class="crawl-text">
            You have intercepted this transmission.
            <strong>Your journey begins now.</strong>
          </p>

          <div class="crawl-divider"></div>
          <div class="crawl-divider"></div>

        </div>
      </div>

      <!-- Skip button (hidden until gate is dismissed) -->
      <button class="crawl-skip crawl-paused">
        SKIP <i class="bi bi-skip-forward-fill"></i>
      </button>

      <!-- Music toggle (hidden until gate is dismissed) -->
      <button class="crawl-music-btn crawl-paused" title="Toggle music">
        <i class="bi bi-volume-up-fill"></i>
      </button>
    `;

    document.body.appendChild(el);
    this.el = el;
  }

  // ── Events ───────────────────────────────────────────
  _bindEvents() {
    // ── "Begin Transmission" gate ──────────────────────
    // This click IS the user gesture that unlocks AudioContext
    const gate = this.el.querySelector('.crawl-begin-gate');
    const beginBtn = this.el.querySelector('.crawl-begin-btn');

    const startTransmission = () => {
      // Fade out the gate
      gate.classList.add('gate-exit');
      setTimeout(() => gate.remove(), 800);

      // Unfreeze all paused elements (tagline, crawl, skip, music btn)
      this.el.querySelectorAll('.crawl-paused').forEach(el => {
        el.classList.remove('crawl-paused');
      });

      // Start heartbeat — this click IS the user gesture, so AudioContext works
      this._startMusic();
    };

    beginBtn.addEventListener('click', startTransmission);

    // Skip button
    this.el.querySelector('.crawl-skip').addEventListener('click', () => {
      this._finish();
    });

    // Music toggle
    const musicBtn = this.el.querySelector('.crawl-music-btn');
    musicBtn.addEventListener('click', () => {
      if (this._musicPlaying) {
        this._stopMusic();
        musicBtn.innerHTML = '<i class="bi bi-volume-mute-fill"></i>';
      } else {
        this._startMusic();
        musicBtn.innerHTML = '<i class="bi bi-volume-up-fill"></i>';
      }
    });

    // Auto-finish when the SCROLL animation ends (not any other animation)
    const content = this.el.querySelector('.crawl-content');
    content.addEventListener('animationend', (e) => {
      if (e.animationName === 'crawlScroll') {
        setTimeout(() => this._finish(), 2000);
      }
    });
  }

  // ── Starfield (simple canvas dots) ───────────────────
  _startStarfield() {
    const canvas = this.el.querySelector('#intro-stars');
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const stars = [];
    for (let i = 0; i < 400; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.5 + 0.3,
        speed: Math.random() * 0.3 + 0.05,
        alpha: Math.random() * 0.6 + 0.4,
      });
    }

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 200, 255, ${s.alpha})`;
        ctx.fill();

        // Drift downward slowly (gives impression of moving through space)
        s.y += s.speed;
        if (s.y > h) { s.y = 0; s.x = Math.random() * w; }

        // Twinkle
        s.alpha += (Math.random() - 0.5) * 0.02;
        s.alpha = Math.max(0.2, Math.min(1, s.alpha));
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    this._starfieldCleanup = () => cancelAnimationFrame(raf);

    window.addEventListener('resize', () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    });
  }

  // ── Faint Heartbeat in Bass ────────────────────────────
  _startMusic() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();

      // Resume context (browsers suspend it without user gesture)
      if (ac.state === 'suspended') ac.resume();

      const master = ac.createGain();
      master.gain.setValueAtTime(0, ac.currentTime);
      master.gain.linearRampToValueAtTime(0.35, ac.currentTime + 3);
      master.connect(ac.destination);

      // Low-pass filter to keep it deep and subby
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 80;
      lp.Q.value = 1;
      lp.connect(master);

      const t = ac.currentTime;

      // Heartbeat: two-thud pattern (lub-DUB)
      // Slow, ominous pace — ~43 BPM
      const heartInterval = 1.4;
      const totalBeats = 75;

      const scheduleHeartbeat = (startTime) => {
        // "Lub" — softer first thud
        const lub = ac.createOscillator();
        const lubG = ac.createGain();
        lub.type = 'sine';
        lub.frequency.setValueAtTime(42, startTime);
        lub.frequency.exponentialRampToValueAtTime(22, startTime + 0.18);
        lubG.gain.setValueAtTime(0.22, startTime);
        lubG.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
        lub.connect(lubG);
        lubG.connect(lp);
        lub.start(startTime);
        lub.stop(startTime + 0.35);

        // "DUB" — slightly louder second thud, 0.3s after
        const dub = ac.createOscillator();
        const dubG = ac.createGain();
        dub.type = 'sine';
        dub.frequency.setValueAtTime(35, startTime + 0.3);
        dub.frequency.exponentialRampToValueAtTime(18, startTime + 0.55);
        dubG.gain.setValueAtTime(0.30, startTime + 0.3);
        dubG.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
        dub.connect(dubG);
        dubG.connect(lp);
        dub.start(startTime + 0.3);
        dub.stop(startTime + 0.65);
      };

      // Schedule all heartbeats
      for (let i = 0; i < totalBeats; i++) {
        scheduleHeartbeat(t + 2 + i * heartInterval);
      }

      this._musicNodes = { ac, master };
      this._musicPlaying = true;
    } catch (e) {
      console.warn('Heartbeat audio failed:', e);
    }
  }

  _stopMusic() {
    if (!this._musicNodes) return;
    const { ac, master } = this._musicNodes;
    master.gain.linearRampToValueAtTime(0, ac.currentTime + 2);
    setTimeout(() => {
      try { ac.close(); } catch (_) {}
    }, 2500);
    this._musicPlaying = false;
  }

  // ── Cleanup & resolve ────────────────────────────────
  _finish() {
    if (!this.el) return;

    this._stopMusic();
    if (this._starfieldCleanup) this._starfieldCleanup();

    this.el.classList.add('exiting');
    setTimeout(() => {
      this.el.remove();
      this.el = null;
      if (this._resolve) {
        this._resolve();
        this._resolve = null;
      }
    }, 1600);
  }
}

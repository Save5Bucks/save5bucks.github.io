/**
 * QUEST SYSTEM — Planet-based challenges
 *
 * Random quest points appear near planets. When the player navigates
 * to a section, a quest may be offered (chance-based, not every visit).
 * Quests are trivia, math puzzles, and word scrambles.
 * Completing a quest awards XP.
 */

import { awardXP, incrementStat, loadCharacter } from './saveSystem.js';

// ── Quest Pool ──────────────────────────────────────────
// Each quest has: question, type, answer (string, lowercase-trimmed),
// choices (for multiple-choice), and xp reward.

const questPool = [
  // ══════════════ SPACE (10) ══════════════
  { type: 'space', question: 'What planet is known as the Red Planet?', choices: ['Venus', 'Mars', 'Jupiter', 'Saturn'], answer: 'mars', xp: 25 },
  { type: 'space', question: 'What is the closest star to Earth?', choices: ['Proxima Centauri', 'Sirius', 'The Sun', 'Alpha Centauri'], answer: 'the sun', xp: 25 },
  { type: 'space', question: 'How many planets are in our solar system?', choices: ['7', '8', '9', '10'], answer: '8', xp: 20 },
  { type: 'space', question: 'What galaxy do we live in?', choices: ['Andromeda', 'Milky Way', 'Triangulum', 'Whirlpool'], answer: 'milky way', xp: 20 },
  { type: 'space', question: 'What force keeps planets in orbit around the Sun?', choices: ['Magnetism', 'Gravity', 'Friction', 'Radiation'], answer: 'gravity', xp: 25 },
  { type: 'space', question: 'What is the largest planet in our solar system?', choices: ['Saturn', 'Neptune', 'Jupiter', 'Uranus'], answer: 'jupiter', xp: 20 },
  { type: 'space', question: 'What element does the Sun primarily fuse?', choices: ['Helium', 'Oxygen', 'Carbon', 'Hydrogen'], answer: 'hydrogen', xp: 30 },
  { type: 'space', question: 'What year did Apollo 11 land on the Moon?', choices: ['1965', '1969', '1972', '1968'], answer: '1969', xp: 25 },
  { type: 'space', question: "What is the name of Saturn's largest moon?", choices: ['Europa', 'Titan', 'Ganymede', 'Callisto'], answer: 'titan', xp: 30 },
  { type: 'space', question: 'What is a light-year a measure of?', choices: ['Time', 'Distance', 'Speed', 'Brightness'], answer: 'distance', xp: 25 },

  // ══════════════ MATH (10) ══════════════
  { type: 'math', question: 'What is 7 × 8?', choices: ['54', '56', '58', '64'], answer: '56', xp: 15 },
  { type: 'math', question: 'What is 144 ÷ 12?', choices: ['11', '12', '13', '14'], answer: '12', xp: 15 },
  { type: 'math', question: 'What is 15²?', choices: ['215', '225', '235', '250'], answer: '225', xp: 20 },
  { type: 'math', question: 'What is √169?', choices: ['11', '12', '13', '14'], answer: '13', xp: 20 },
  { type: 'math', question: 'What is 3⁴?', choices: ['27', '64', '81', '108'], answer: '81', xp: 25 },
  { type: 'math', question: 'If a ship travels 300 km in 2 hours, what is its speed?', choices: ['100 km/h', '125 km/h', '150 km/h', '200 km/h'], answer: '150 km/h', xp: 20 },
  { type: 'math', question: 'What is 17 × 6?', choices: ['96', '102', '108', '112'], answer: '102', xp: 15 },
  { type: 'math', question: 'What is 2¹⁰?', choices: ['512', '1024', '2048', '256'], answer: '1024', xp: 25 },
  { type: 'math', question: 'What is the area of a circle with radius 7? (use π ≈ 22/7)', choices: ['144', '154', '164', '176'], answer: '154', xp: 30 },
  { type: 'math', question: 'If x + 5 = 12, what is x?', choices: ['5', '6', '7', '8'], answer: '7', xp: 15 },

  // ══════════════ SCIENCE (10) ══════════════
  { type: 'science', question: 'What is the chemical symbol for water?', choices: ['HO', 'H₂O', 'OH₂', 'H₃O'], answer: 'h₂o', xp: 15 },
  { type: 'science', question: 'What is the speed of light (approx)?', choices: ['300,000 km/s', '150,000 km/s', '500,000 km/s', '100,000 km/s'], answer: '300,000 km/s', xp: 25 },
  { type: 'science', question: 'What particle has a positive charge?', choices: ['Electron', 'Neutron', 'Proton', 'Photon'], answer: 'proton', xp: 20 },
  { type: 'science', question: 'What is absolute zero in Celsius?', choices: ['-273.15°C', '-100°C', '-459.67°C', '0°C'], answer: '-273.15°c', xp: 30 },
  { type: 'science', question: 'What gas do plants absorb from the atmosphere?', choices: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], answer: 'carbon dioxide', xp: 15 },
  { type: 'science', question: 'What is the hardest natural substance on Earth?', choices: ['Titanium', 'Quartz', 'Diamond', 'Graphene'], answer: 'diamond', xp: 20 },
  { type: 'science', question: 'How many bones does an adult human have?', choices: ['186', '206', '226', '246'], answer: '206', xp: 20 },
  { type: 'science', question: 'What type of energy does the Sun emit?', choices: ['Kinetic', 'Chemical', 'Electromagnetic', 'Nuclear only'], answer: 'electromagnetic', xp: 25 },
  { type: 'science', question: 'What is Newton\'s second law expressed as?', choices: ['E = mc²', 'F = ma', 'V = IR', 'PV = nRT'], answer: 'f = ma', xp: 25 },
  { type: 'science', question: 'What element has the atomic number 1?', choices: ['Helium', 'Lithium', 'Carbon', 'Hydrogen'], answer: 'hydrogen', xp: 15 },

  // ══════════════ CONSTRUCTION (10) ══════════════
  { type: 'construction', question: 'What does PSI stand for in pressure measurement?', choices: ['Pressure Systems Index', 'Pounds per Square Inch', 'Power Signal Input', 'Pressure Standard Indicator'], answer: 'pounds per square inch', xp: 20 },
  { type: 'construction', question: 'What is the standard thickness of residential drywall?', choices: ['3/8"', '1/2"', '5/8"', '3/4"'], answer: '1/2"', xp: 25 },
  { type: 'construction', question: 'How many feet are in a standard 2×4 stud?', choices: ['8 feet', '10 feet', '12 feet', '6 feet'], answer: '8 feet', xp: 20 },
  { type: 'construction', question: 'What is the minimum slope for a drainage pipe?', choices: ['1/8" per foot', '1/4" per foot', '1/2" per foot', '1" per foot'], answer: '1/4" per foot', xp: 30 },
  { type: 'construction', question: 'What tool measures if a surface is perfectly horizontal?', choices: ['Plumb Bob', 'Level', 'Square', 'Tape Measure'], answer: 'level', xp: 15 },
  { type: 'construction', question: 'What does OSHA stand for?', choices: ['Office of Safety & Health Admin', 'Occupational Safety & Health Admin', 'Operational Standards for Housing Assoc', 'Occupational Standards for Hazard Assess'], answer: 'occupational safety & health admin', xp: 20 },
  { type: 'construction', question: 'What is rebar made of?', choices: ['Aluminum', 'Steel', 'Iron', 'Copper'], answer: 'steel', xp: 15 },
  { type: 'construction', question: 'How many square feet are in a "square" of roofing?', choices: ['50', '100', '150', '200'], answer: '100', xp: 25 },
  { type: 'construction', question: 'What is the typical curing time for concrete?', choices: ['7 days', '14 days', '28 days', '48 hours'], answer: '28 days', xp: 25 },
  { type: 'construction', question: 'What type of foundation sits on top of the ground?', choices: ['Basement', 'Crawl Space', 'Slab-on-Grade', 'Pier'], answer: 'slab-on-grade', xp: 20 },

  // ══════════════ NETWORKING (10) ══════════════
  { type: 'networking', question: 'What does IP stand for?', choices: ['Internet Protocol', 'Internal Processing', 'Internet Port', 'Integrated Platform'], answer: 'internet protocol', xp: 15 },
  { type: 'networking', question: 'What port does HTTPS use by default?', choices: ['80', '443', '8080', '22'], answer: '443', xp: 20 },
  { type: 'networking', question: 'What does DNS resolve?', choices: ['MAC to IP', 'Domain to IP', 'IP to Port', 'URL to File'], answer: 'domain to ip', xp: 20 },
  { type: 'networking', question: 'What layer of the OSI model handles routing?', choices: ['Layer 1', 'Layer 2', 'Layer 3', 'Layer 4'], answer: 'layer 3', xp: 25 },
  { type: 'networking', question: 'What is the max number of hosts in a /24 subnet?', choices: ['128', '254', '256', '512'], answer: '254', xp: 25 },
  { type: 'networking', question: 'What protocol does SSH use?', choices: ['UDP', 'TCP', 'ICMP', 'FTP'], answer: 'tcp', xp: 20 },
  { type: 'networking', question: 'What does a firewall primarily do?', choices: ['Speeds up traffic', 'Filters traffic', 'Encrypts data', 'Stores packets'], answer: 'filters traffic', xp: 15 },
  { type: 'networking', question: 'What is the loopback IP address?', choices: ['192.168.0.1', '10.0.0.1', '127.0.0.1', '0.0.0.0'], answer: '127.0.0.1', xp: 20 },
  { type: 'networking', question: 'What does DHCP assign to devices?', choices: ['MAC Address', 'DNS Name', 'IP Address', 'SSL Certificate'], answer: 'ip address', xp: 20 },
  { type: 'networking', question: 'What cable standard supports 10 Gbps Ethernet?', choices: ['Cat5', 'Cat5e', 'Cat6', 'Cat6a'], answer: 'cat6a', xp: 30 },

  // ══════════════ CODING (10) ══════════════
  { type: 'coding', question: 'What does HTML stand for?', choices: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Mail Language', 'Home Tool Markup Language'], answer: 'hyper text markup language', xp: 15 },
  { type: 'coding', question: 'What keyword declares a constant in JavaScript?', choices: ['var', 'let', 'const', 'static'], answer: 'const', xp: 15 },
  { type: 'coding', question: 'What data structure uses FIFO (First In, First Out)?', choices: ['Stack', 'Queue', 'Tree', 'Graph'], answer: 'queue', xp: 20 },
  { type: 'coding', question: 'What does API stand for?', choices: ['Application Programming Interface', 'Automated Protocol Integration', 'Application Process Interaction', 'Advanced Programming Input'], answer: 'application programming interface', xp: 20 },
  { type: 'coding', question: 'In Big O notation, what is the time complexity of binary search?', choices: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'], answer: 'o(log n)', xp: 30 },
  { type: 'coding', question: 'What does CSS stand for?', choices: ['Computer Style Sheets', 'Cascading Style Sheets', 'Creative Style System', 'Coded Style Syntax'], answer: 'cascading style sheets', xp: 15 },
  { type: 'coding', question: 'Which language is primarily used for iOS development?', choices: ['Kotlin', 'Java', 'Swift', 'C#'], answer: 'swift', xp: 20 },
  { type: 'coding', question: 'What does Git primarily manage?', choices: ['Databases', 'Networks', 'Version Control', 'Cloud Servers'], answer: 'version control', xp: 15 },
  { type: 'coding', question: 'What is the result of typeof null in JavaScript?', choices: ['"null"', '"undefined"', '"object"', '"boolean"'], answer: '"object"', xp: 25 },
  { type: 'coding', question: 'What HTTP status code means "Not Found"?', choices: ['200', '301', '404', '500'], answer: '404', xp: 15 },
];

// Shuffle utility
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Quest System Class ──────────────────────────────────
export class QuestSystem {
  constructor(audio, narrator) {
    this.audio = audio;
    this.narrator = narrator;
    this.activeQuest = null;
    this._availableSections = new Set(
      ['home', 'about', 'services', 'software', 'portfolio', 'contact']
    );  // all sections start with available quest pins
    this.questChance = 0.4;               // 40% chance per section visit
    this.usedQuests = new Set();          // avoid repeats within a session

    this._questPinLines = [
      'A signal pulses nearby, pilot. A challenge awaits — seek the beacon above the planet.',
      'I sense a transmission on this world… a trial for the worthy. Find the glowing marker.',
      'The stars have placed a challenge in your path. Approach the beacon, if you dare.',
      'A quest beacon shimmers above this planet, {name}. Will you test yourself?',
      'There — a signal from the surface. Someone… or something… has left a challenge for you.',
      'The void has placed a trial here. Look for the diamond of light above the planet.',
    ];

    this._buildUI();
  }

  // ── Build the quest modal DOM ─────────────────────────
  _buildUI() {
    const overlay = document.createElement('div');
    overlay.id = 'quest-overlay';
    overlay.className = 'quest-overlay';
    overlay.innerHTML = `
      <div class="quest-modal">
        <div class="quest-header">
          <div class="quest-icon"><i class="bi bi-broadcast-pin"></i></div>
          <h2 class="quest-title">INCOMING TRANSMISSION</h2>
          <div class="quest-type"></div>
        </div>
        <div class="quest-divider"></div>
        <p class="quest-question"></p>
        <div class="quest-choices"></div>
        <div class="quest-result"></div>
        <div class="quest-actions">
          <button class="quest-btn quest-decline">DECLINE</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    this.overlay = overlay;
    this.modal = overlay.querySelector('.quest-modal');
    this.questionEl = overlay.querySelector('.quest-question');
    this.choicesEl = overlay.querySelector('.quest-choices');
    this.resultEl = overlay.querySelector('.quest-result');
    this.typeEl = overlay.querySelector('.quest-type');
    this.declineBtn = overlay.querySelector('.quest-decline');

    this.declineBtn.addEventListener('click', () => this._close());
  }

  // ── Attempt to trigger a quest on section arrival ─────
  onSectionArrive(section) {
    if (this.activeQuest) return;               // already showing one

    // Mark this section as having a quest available (pin will show)
    this._availableSections.add(section);

    // Narrator announces the quest beacon (delayed so section narration goes first)
    if (this.narrator) {
      const line = this._questPinLines[Math.floor(Math.random() * this._questPinLines.length)];
      const key = 'questAvail_' + section + '_' + Date.now();
      setTimeout(() => {
        this.narrator.speakOnce(key, line);
      }, 12000);   // 12s delay — after section narration + satellite quip window
    }
  }

  /** Check if a quest pin should be shown for the given section */
  hasQuestAvailable(section) {
    return this._availableSections.has(section) && !this.activeQuest;
  }

  /** Trigger quest from pin click (or direct call) */
  triggerQuest(section) {
    if (this.activeQuest) return;

    // Pick an unused quest
    const available = questPool.filter((_, i) => !this.usedQuests.has(i));
    if (available.length === 0) {
      this.usedQuests.clear();
      return;
    }

    const pool = shuffle(available.map((q) => ({ ...q, _origIndex: questPool.indexOf(q) })));
    const quest = pool[0];

    this.activeQuest = quest;
    this._activeSection = section;         // track which section triggered
    this._availableSections.delete(section); // consume this section's pin
    this._show(quest);
  }

  // ── Display the quest modal ───────────────────────────
  _show(quest) {
    const typeLabels = {
      space: 'SPACE TRIVIA',
      math: 'CALCULATION',
      science: 'SCIENCE',
      construction: 'CONSTRUCTION',
      networking: 'NETWORKING',
      coding: 'CODING',
    };
    this.typeEl.textContent = typeLabels[quest.type] || 'CHALLENGE';
    this.questionEl.textContent = quest.question;
    this.resultEl.textContent = '';
    this.resultEl.className = 'quest-result';
    this.declineBtn.style.display = '';

    // Build choice buttons
    this.choicesEl.innerHTML = '';
    quest.choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'quest-choice-btn';
      btn.textContent = choice;
      btn.addEventListener('click', () => this._answer(choice, quest));
      this.choicesEl.appendChild(btn);
    });

    this.overlay.classList.add('visible');
    if (this.audio) { this.audio.init(); this.audio.playClick(); }
  }

  // ── Handle answer ─────────────────────────────────────
  _answer(chosen, quest) {
    const correct = chosen.trim().toLowerCase() === quest.answer.toLowerCase();

    // Disable all choice buttons
    this.choicesEl.querySelectorAll('.quest-choice-btn').forEach(btn => {
      btn.disabled = true;
      if (btn.textContent.trim().toLowerCase() === quest.answer.toLowerCase()) {
        btn.classList.add('correct');
      } else if (btn.textContent === chosen && !correct) {
        btn.classList.add('wrong');
      }
    });

    this.declineBtn.style.display = 'none';

    if (correct) {
      const result = awardXP(quest.xp);
      incrementStat('questsCompleted');
      this.usedQuests.add(quest._origIndex);

      // Notify HUD
      if (window._onXpGain) window._onXpGain(quest.xp, result.leveled, result.newLevel);

      let msg = `CORRECT! +${quest.xp} XP`;
      if (result.leveled) msg += ` — LEVEL UP! You are now level ${result.newLevel}!`;
      this.resultEl.textContent = msg;
      this.resultEl.className = 'quest-result success';

      if (this.audio) this.audio.playArrive();
      if (this.narrator) {
        const questKey = 'questComplete_' + Date.now();
        setTimeout(() => {
          this.narrator.speakOnce(questKey,
            'Well done, traveler. The stars note your wisdom.'
          );
        }, 1500);

        // Separate level-up congratulation
        if (result.leveled) {
          const lvlLines = [
            `Power surges through your vessel — you have reached Level ${result.newLevel}!`,
            `LEVEL ${result.newLevel}! The void trembles at your ascension, pilot.`,
            `Your potential deepens… Level ${result.newLevel} achieved. Spend your points wisely.`,
            `A new threshold crossed — Level ${result.newLevel}. The galaxy takes notice.`,
          ];
          const lvlLine = lvlLines[Math.floor(Math.random() * lvlLines.length)];
          const lvlKey = 'questLevelUp_' + result.newLevel;
          setTimeout(() => this.narrator.speakOnce(lvlKey, lvlLine), 5000);
        }
      }
    } else {
      this.resultEl.textContent = `INCORRECT. The answer was: ${quest.choices.find(c => c.trim().toLowerCase() === quest.answer.toLowerCase()) || quest.answer}`;
      this.resultEl.className = 'quest-result failure';
      if (this.audio) this.audio.playClick();
    }

    // Auto-close after a few seconds
    setTimeout(() => this._close(), correct ? 3000 : 2500);
  }

  // ── Close modal ───────────────────────────────────────
  _close() {
    this.overlay.classList.remove('visible');
    this.activeQuest = null;
    this._activeSection = null;
  }
}

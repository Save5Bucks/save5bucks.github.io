/* ------------------------------
   Bubbles – Full Update
   - Fullscreen viewport
   - Scoreboard auto-scales (no scroll)
   - Accurate bounds + resize handling
------------------------------ */

const languages = [
  'Lua','Python','Java','JavaScript','C#','C++','MySQL','MariaDB','HTML','CSS','Visual Basic','XAML',
  '3DS Max','AI','Day Z','GTA V','The Isle','Rust','Valheim','Ark','Node JS','React JS','Angular JS',
  'Vue JS','Express JS','Photo Shop','Arma Reforger','Atlas','VPS','Dedicated Servers','Wix','Project Zomboid'
].sort();

// DOM refs
const viewport   = document.getElementById('bubbles-viewport');
const container  = document.getElementById('bubble-container');
const titleEl    = document.getElementById('title');
const scoreboard = document.getElementById('scoreboard');
const scoreList  = document.getElementById('score-list');

let containerRect = viewport.getBoundingClientRect();
let titleRect     = titleEl.getBoundingClientRect();
let scoreboardRect= scoreboard.getBoundingClientRect();
const bubbles     = [];

// Canvas for measuring text (keep in sync with CSS font)
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
ctx.font = '16px "Courier New", monospace';

// Scores
const scores = {};
languages.forEach(lang => (scores[lang] = 0));

/* ---------- Helpers ---------- */

// Expose title height as a CSS variable for CSS positioning if needed
function updateTitleHeightVar() {
  const h = titleEl.getBoundingClientRect().height || 60;
  document.documentElement.style.setProperty('--title-h', h + 'px');
}

// Scale the scoreboard list so it fits its box without an inner scrollbar
function fitScoreboard() {
  const header = scoreboard.querySelector('h3');
  const headerH = header ? header.getBoundingClientRect().height : 0;

  const availableH = scoreboard.clientHeight - headerH - 10; // 10 = padding buffer
  // Reset scaling first
  scoreList.style.transform = 'scale(1)';
  scoreList.style.height = 'auto';
  scoreList.style.width = '100%';

  const naturalH = scoreList.scrollHeight;

  if (naturalH <= availableH) return; // fits already

  const scale = Math.max(0.55, availableH / naturalH); // clamp to keep readable
  scoreList.style.transform = `scale(${scale})`;
  // Expand logical width/height so scaled content doesn’t clip
  scoreList.style.width  = (100 / scale) + '%';
  scoreList.style.height = (availableH / scale) + 'px';
}

// Recompute rects and enforce bounds
function updateRectsAndBounds() {
  containerRect  = viewport.getBoundingClientRect();
  titleRect      = titleEl.getBoundingClientRect();
  scoreboardRect = scoreboard.getBoundingClientRect();
  updateTitleHeightVar();
  fitScoreboard();
  bubbles.forEach(keepInBounds);
}

// Position bubble’s DOM element from its center coords
function updatePosition(b) {
  b.element.style.left = `${b.x - b.radius}px`;
  b.element.style.top  = `${b.y - b.radius}px`;
}

// Keep bubbles inside the playfield, respecting title + scoreboard footprints
function keepInBounds(b) {
  // left wall is scoreboard width + gutter
  const leftBound = (scoreboardRect.width || 0) + 10;
  const rightBound = containerRect.width;
  const topBound = titleRect.height;
  const bottomBound = containerRect.height;

  b.x = Math.max(b.radius + leftBound, Math.min(b.x, rightBound - b.radius));
  b.y = Math.max(b.radius + topBound, Math.min(b.y, bottomBound - b.radius));
}

// Bubble-bubble collision (elastic swap and score tick)
function checkBubbleCollision(b1, b2) {
  const dx = b2.x - b1.x;
  const dy = b2.y - b1.y;
  const dist = Math.hypot(dx, dy);
  const minDist = b1.radius + b2.radius;

  if (dist < minDist) {
    // Flash border
    b1.element.classList.add('colliding');
    b2.element.classList.add('colliding');
    setTimeout(() => {
      b1.element.classList.remove('colliding');
      b2.element.classList.remove('colliding');
    }, 100);

    // Score
    scores[b1.name]++; scores[b2.name]++;
    updateScoreboard();

    // Separate overlapping
    const nx = dx / (dist || 1);
    const ny = dy / (dist || 1);
    const overlap = minDist - dist;
    const moveX = nx * overlap / 2;
    const moveY = ny * overlap / 2;
    b1.x -= moveX; b1.y -= moveY;
    b2.x += moveX; b2.y += moveY;

    // Swap velocities (simple elastic)
    const v1x = b1.vx, v1y = b1.vy;
    b1.vx = b2.vx; b1.vy = b2.vy;
    b2.vx = v1x;   b2.vy = v1y;
  }
}

// Bounce off title band
function checkTitleCollision(b) {
  const topBand = titleRect.height;
  if (b.y - b.radius < topBand) {
    b.y = topBand + b.radius;
    b.vy = Math.abs(b.vy);
  }
}

// Bounce off scoreboard side
function checkScoreboardCollision(b) {
  const leftWall = (scoreboardRect.width || 0) + 10;
  if (b.x - b.radius < leftWall) {
    b.x = leftWall + b.radius;
    b.vx = Math.abs(b.vx);
  }
}

// Render scoreboard list, then fit to available height
function updateScoreboard() {
  scoreList.innerHTML = '';
  languages.forEach(lang => {
    const li = document.createElement('li');
    li.textContent = `${lang}: ${scores[lang]}`;
    scoreList.appendChild(li);
  });
  fitScoreboard();
}

/* ---------- Init ---------- */

// Draw initial (0) scoreboard so scoreboardRect is accurate before placing bubbles
updateScoreboard();
updateRectsAndBounds();

// Create bubbles
languages.forEach(lang => {
  const textWidth = ctx.measureText(lang).width;
  const size = Math.max(28, textWidth + 10); // min size for legibility

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerText = lang;
  bubble.style.width = `${size}px`;
  bubble.style.height = `${size}px`;
  bubble.style.fontSize = '16px';

  // Random starting position within bounds (respect title + scoreboard)
  const leftBound = (scoreboardRect.width || 0) + 10;
  const rightBound = containerRect.width;
  const topBound = titleRect.height;
  const bottomBound = containerRect.height;

  const startX = Math.random() * (rightBound - leftBound - size) + leftBound + size / 2;
  const startY = Math.random() * (bottomBound - topBound - size) + topBound + size / 2;

  const b = {
    element: bubble,
    x: startX,
    y: startY,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    radius: size / 2,
    isDragging: false,
    name: lang
  };
  bubbles.push(b);
  container.appendChild(bubble);
  updatePosition(b);

  // Dragging (mouse)
  let offsetX = 0, offsetY = 0;
  bubble.addEventListener('mousedown', e => {
    b.isDragging = true;
    offsetX = e.clientX - b.x;
    offsetY = e.clientY - b.y;
    b.vx = 0; b.vy = 0;
  });
  document.addEventListener('mousemove', e => {
    if (!b.isDragging) return;
    b.x = e.clientX - offsetX;
    b.y = e.clientY - offsetY;
    keepInBounds(b);
    updatePosition(b);
  });
  document.addEventListener('mouseup', () => {
    if (!b.isDragging) return;
    b.isDragging = false;
    b.vx = (Math.random() - 0.5) * 2;
    b.vy = (Math.random() - 0.5) * 2;
  });
});

// Resize handling: recompute rects, refit scoreboard, keep bubbles valid
window.addEventListener('resize', updateRectsAndBounds);

/* ---------- Animation Loop ---------- */
function animate() {
  for (const b of bubbles) {
    if (b.isDragging) continue;

    b.x += b.vx;
    b.y += b.vy;

    // Walls (right & bottom)
    if (b.x + b.radius > containerRect.width) {
      b.x = containerRect.width - b.radius; b.vx = -b.vx;
    }
    if (b.y + b.radius > containerRect.height) {
      b.y = containerRect.height - b.radius; b.vy = -b.vy;
    }

    checkTitleCollision(b);
    checkScoreboardCollision(b);
    keepInBounds(b);
    updatePosition(b);
  }

  // Pairwise collisions
  for (let i = 0; i < bubbles.length; i++) {
    for (let j = i + 1; j < bubbles.length; j++) {
      checkBubbleCollision(bubbles[i], bubbles[j]);
    }
  }

  requestAnimationFrame(animate);
}
animate();

/**
 * Cookie-based save system for character data and progression
 */

const COOKIE_NAME = 'flinnbuilt_character';
const COOKIE_DAYS = 365;

/**
 * Save character data to cookie
 */
export function saveCharacter(data) {
  const json = JSON.stringify(data);
  const encoded = encodeURIComponent(json);
  const expires = new Date(Date.now() + COOKIE_DAYS * 864e5).toUTCString();
  document.cookie = `${COOKIE_NAME}=${encoded}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Load character data from cookie
 * @returns {object|null} Character data or null if not found
 */
export function loadCharacter() {
  const cookies = document.cookie.split('; ');
  const match = cookies.find(c => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;

  try {
    const value = match.split('=').slice(1).join('=');
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return null;
  }
}

/**
 * Check if a character has been created
 */
export function hasCharacter() {
  return loadCharacter() !== null;
}

/**
 * Delete character data
 */
export function deleteCharacter() {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/**
 * Default character template
 */
export function createDefaultCharacter() {
  return {
    name: '',
    gender: 'male',
    race: 'humanoid',
    class: 'homeowner',
    createdAt: Date.now(),
    visits: 1,
    sectorsExplored: ['home'],
    // ── RPG Stats ──
    xp: 0,
    level: 1,
    statPoints: 0,        // earned on level-up, spent on upgrades
    combatKills: 0,
    questsCompleted: 0,
    gunDamage: 1,         // base damage per shot
    gunSpeed: 1,          // fire-rate tier (1 = slow, higher = faster)
  };
}

/**
 * XP required for the next level (exponential curve)
 */
export function xpForLevel(level) {
  return Math.floor(80 * Math.pow(1.4, level - 1));
}

/**
 * Award XP to the character. Auto-levels up and grants stat points.
 * Returns { leveled: bool, newLevel: number, xpGained: number }
 */
export function awardXP(amount) {
  const char = loadCharacter();
  if (!char) return { leveled: false };

  // Ensure fields exist for legacy saves
  char.xp = (char.xp || 0) + amount;
  char.level = char.level || 1;
  char.statPoints = char.statPoints || 0;

  let leveled = false;
  let needed = xpForLevel(char.level);
  while (char.xp >= needed) {
    char.xp -= needed;
    char.level++;
    char.statPoints += 2;
    leveled = true;
    needed = xpForLevel(char.level);
  }

  saveCharacter(char);
  return { leveled, newLevel: char.level, xpGained: amount };
}

/**
 * Spend one stat point on a given stat ('gunDamage' or 'gunSpeed').
 * Returns true if successful.
 */
export function spendStatPoint(stat) {
  const char = loadCharacter();
  if (!char || (char.statPoints || 0) < 1) return false;
  if (stat !== 'gunDamage' && stat !== 'gunSpeed') return false;

  char[stat] = (char[stat] || 1) + 1;
  char.statPoints--;
  saveCharacter(char);
  return true;
}

/**
 * Increment a numeric field on the character (e.g. 'combatKills', 'questsCompleted')
 */
export function incrementStat(field) {
  const char = loadCharacter();
  if (!char) return;
  char[field] = (char[field] || 0) + 1;
  saveCharacter(char);
}

/**
 * Update visit count and explored sectors
 */
export function trackProgress(sector) {
  const char = loadCharacter();
  if (!char) return;

  char.visits = (char.visits || 0) + 1;
  if (!char.sectorsExplored) char.sectorsExplored = [];
  if (!char.sectorsExplored.includes(sector)) {
    char.sectorsExplored.push(sector);
  }
  char.lastVisit = Date.now();

  saveCharacter(char);
}

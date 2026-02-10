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
  };
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

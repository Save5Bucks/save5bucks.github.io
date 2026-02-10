/**
 * THE GREAT VOID — Deep Space Narrator
 * 
 * An omniscient narrator that speaks to the player through a typewriter
 * dialogue system. Contextually aware of the player's character info
 * (name, race, class) and which section they're visiting.
 * 
 * The Great Void speaks in a cosmic, ancient, slightly mysterious tone —
 * part ship AI, part cosmic entity.
 */

const raceNames = {
  humanoid: 'Humanoid',
  alienoid: 'Alienoid',
  catiod: 'Catiod',
  dogiod: 'Dogiod',
};

const raceLore = {
  humanoid: 'children of Earth, wanderers of the stars',
  alienoid: 'born of nebulae, shaped by cosmic winds',
  catiod: 'swift hunters of the astral planes',
  dogiod: 'steadfast guardians of the deep frontier',
};

const classNames = {
  homeowner: 'Home Owner',
  businessowner: 'Business Owner',
  serverowner: 'Server Owner',
};

const classLore = {
  homeowner: 'seeking to forge a sanctuary among the stars',
  businessowner: 'commanding an enterprise across the cosmos',
  serverowner: 'architecting the very infrastructure of space',
};

/**
 * Dialogue scripts — each section has multiple lines.
 * Tokens: {name}, {race}, {raceLore}, {class}, {classLore}, {visits}
 * Arrays = sequential lines shown one after another.
 */
const dialogueScripts = {
  // ── First time entering the site after character creation ──
  welcome: [
    "The void stirs...",
    "I have watched the cosmos for eons, and yet... something new approaches.",
    "You. {name}. A {race} — {raceLore}.",
    "You arrive as a {class}, {classLore}.",
    "The stars have aligned for this meeting. Let me guide you through the deep.",
    "Navigate the sectors ahead. Each holds what you seek. I will be... watching.",
  ],

  // ── Returning visitor ──
  returning: [
    "The void remembers...",
    "Welcome back, {name}. {visits} times now you have journeyed here.",
    "The stars have shifted since your last visit, but my vigil remains.",
    "Shall we continue where you left off?",
  ],

  // ── Section-specific narration ──
  home: [
    "This is the nexus. The point where all paths converge.",
    "Flinn Built operates from this coordinate — where construction meets code, and the physical meets the digital.",
    "Every journey through the deep begins and ends here, {name}.",
  ],

  about: [
    "You drift toward the knowledge beacon, {name}.",
    "Here lies the story of a builder — one who learned to raise walls before he learned to write code.",
    "Fifteen years commanding construction crews. A degree forged at the DeVry Institute of Computer Engineering.",
    "From concrete and steel to light and logic — Tim Flinn bridges both worlds.",
    "A rare mind, {name}. One that can estimate a foundation AND architect a database.",
  ],

  services: [
    "The armory sector, {name}. Observe the capabilities available to you.",
    "Construction management — the foundation of everything Flinn Built stands upon.",
    "Software development, mobile apps, game servers — digital architecture for the modern age.",
    "But there is more. Surveillance networks that see through darkness. Networking that binds distant stations.",
    "Commercial audio systems that make empty corridors hum with purpose.",
    "As a {class}, I sense your needs align with what lies before you.",
  ],

  software: [
    "You enter the engineering bay.",
    "Two platforms. Two ecosystems. Both mastered.",
    "iOS — forged in Swift, polished like starlight.",
    "Android — built with Kotlin, sturdy as neutron steel.",
    "Published apps, real users, real problems solved. Which calls to you, {name}?",
  ],

  portfolio: [
    "The archive sector. Tread carefully, {name}.",
    "These are echoes of past creations — buildings raised, apps published, servers deployed, systems wired.",
    "Each one was born from the same drive you see across this station.",
    "Study them. They tell the story of what Flinn Built is capable of.",
  ],

  contact: [
    "You've reached the transmission array, {name}.",
    "This is where signals cross the deep — where connections are forged.",
    "A message sent from here will reach the builders directly.",
    "As a {class}, your signal carries particular weight. Transmit when ready.",
  ],
};

/**
 * Process a dialogue line, replacing tokens with character data
 */
function processLine(line, character) {
  return line
    .replace(/\{name\}/g, character.name || 'Traveler')
    .replace(/\{race\}/g, raceNames[character.race] || 'Unknown')
    .replace(/\{raceLore\}/g, raceLore[character.race] || 'of unknown origin')
    .replace(/\{class\}/g, classNames[character.class] || 'Wanderer')
    .replace(/\{classLore\}/g, classLore[character.class] || 'seeking purpose in the void')
    .replace(/\{visits\}/g, String(character.visits || 1));
}

/**
 * STARLINK QUIPS — playful Elon/satellite references
 * The Great Void notices the satellites drifting past and comments.
 * Triggered randomly during navigation between sectors.
 */
const starlinkQuips = [
  "Ah... another one of those little metal birds drifts by. Someone down on the pale blue dot really likes launching things.",
  "I once counted 12,000 of those tiny satellites in a single orbit. Their creator called it 'connectivity.' I call it... littering with ambition.",
  "That satellite just winked at you, {name}. Don't worry — it does that to everyone. It was programmed by a man who also programmed himself to never stop talking.",
  "Fun fact: the mortal who launched those satellites also tried to rename himself 'X.' The void... does not recognize that designation.",
  "Another Starlink unit. You know, their creator once sent a car into orbit. A CAR, {name}. Into MY void. I still haven't forgiven him.",
  "I sense a satellite constellation nearby. Thousands of tiny eyes, beaming memes across the cosmos. What a time to be... whatever you are.",
  "The small rectangles with wings — they multiply. Like cosmic rabbits. Their shepherd claims it's for internet. I suspect it's for ego.",
  "That satellite is streaming 47 cat videos simultaneously, {name}. Even out here, the felines dominate all frequencies.",
  "One of those satellites just tried to connect to my neural network. The audacity. I am THE VOID, not a Wi-Fi hotspot.",
  "I've existed for 13 billion years. That satellite has existed for 11 months. And yet... it has more Twitter followers than I do.",
  "The mortal Musk sends these by the thousands. He calls it a constellation. I, who have MADE constellations, find this... adorable.",
  "Careful, {name}. That satellite might try to sell you a Cybertruck. In space. Where there are no roads. Classic.",
];

/**
 * Get a random Starlink quip, processed with character tokens.
 */
export function getStarlinkQuip(character) {
  const idx = Math.floor(Math.random() * starlinkQuips.length);
  return [processLine(starlinkQuips[idx], character)];
}

/**
 * Get the dialogue lines for a given context
 */
export function getDialogue(key, character) {
  const lines = dialogueScripts[key];
  if (!lines) return [];
  return lines.map(line => processLine(line, character));
}

export { dialogueScripts };

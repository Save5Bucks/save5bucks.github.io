/**
 * THE GREAT VOID — Deep Space Narrator  (expanded)
 *
 * Three narrator states:
 *   1. SECTION — contextual dialog about each planet/page
 *   2. SHIP CARD — talk about XP, quests, combat, upgrades
 *   3. COMBAT — hostile encounter commentary
 *
 * Each section has multiple variant sets so repeat visits feel fresh.
 * Welcome-back lines, general cosmic musings, and ambient commentary.
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

// ── Helper: pick random item from array ──────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ═══════════════════════════════════════════════════════════
//  STATE 1 — SECTION DIALOGUE (planet-specific narration)
// ═══════════════════════════════════════════════════════════

/**
 * Multiple variant arrays per section.  getDialogue() picks one at random
 * so every visit sounds different.
 */
const sectionVariants = {
  welcome: [
    [
      "The void stirs...",
      "I have watched the cosmos for eons, and yet... something new approaches.",
      "You. {name}. A {race} — {raceLore}.",
      "You arrive as a {class}, {classLore}.",
      "The stars have aligned for this meeting. Let me guide you through the deep.",
      "Navigate the sectors ahead. Each holds what you seek. I will be... watching.",
    ],
    [
      "A ripple crosses the dark...",
      "{name}. I have waited longer than light itself for one such as you.",
      "A {race}… {raceLore}. How fitting.",
      "You bear the title of {class} — {classLore}.",
      "Six sectors lie scattered across this station. Explore them all, and the void will reward you.",
    ],
    [
      "The stars shift. Someone new approaches my domain.",
      "Interesting. A {race} pilot calling themselves {name}.",
      "A {class}, no less. {classLore}.",
      "Very well. I will be your guide — though I warn you, the deep does not give its secrets freely.",
      "Begin your journey. The sectors await, and so does the unknown.",
    ],
  ],

  returning: [
    [
      "The void remembers...",
      "Welcome back, {name}. {visits} times now you have journeyed here.",
      "The stars have shifted since your last visit, but my vigil remains.",
      "Shall we continue where you left off?",
    ],
    [
      "Ah… the {race} returns.",
      "{name}. {visits} visits now. The cosmos is beginning to recognize your trajectory.",
      "Pick up where you left off, pilot. The deep waits for no one.",
    ],
    [
      "I sensed your approach long before you arrived, {name}.",
      "Visit number {visits}. You are becoming a regular in my domain.",
      "The sectors remember you. Let us see what has changed since last time.",
    ],
    [
      "The void stirs once more… {name} has returned.",
      "Still a {class}, I see. {classLore}. Some things remain constant.",
      "Your journey continues. {visits} voyages and counting.",
    ],
    [
      "You again, {name}? The stars must truly favor you.",
      "{visits} visits. Most travelers barely manage one.",
      "Welcome back. I have been... contemplating the darkness in your absence.",
    ],
    [
      "The deep exhales. A familiar signal crosses my threshold.",
      "{name} — {race}, {class}. I know you well by now.",
      "Let us waste no time. The sectors are waiting.",
    ],
  ],

  home: [
    [
      "This is the nexus. The point where all paths converge.",
      "Flinn Built operates from this coordinate — where construction meets code, and the physical meets the digital.",
      "Every journey through the deep begins and ends here, {name}.",
    ],
    [
      "You stand at the origin point, {name}. Sector zero.",
      "From here, a builder named Flinn commands both steel and software.",
      "Explore outward. Each sector holds a piece of the larger picture.",
    ],
    [
      "Home base. The calm before the cosmos.",
      "This is where real-world craft meets digital ambition, {name}.",
      "Six sectors radiate outward from this point. Each one is worth your time.",
    ],
    [
      "The center of it all. Grounding point for a builder who spans two worlds.",
      "Construction and code. Concrete and cloud servers. All from here.",
      "Navigate outward when you are ready, {name}. The deep has much to show you.",
    ],
  ],

  about: [
    [
      "You drift toward the knowledge beacon, {name}.",
      "Here lies the story of a builder — one who learned to raise walls before he learned to write code.",
      "Fifteen years commanding construction crews. A degree forged at the DeVry Institute of Computer Engineering.",
      "From concrete and steel to light and logic — Tim Flinn bridges both worlds.",
      "A rare mind, {name}. One that can estimate a foundation AND architect a database.",
    ],
    [
      "The about sector. Where origins are revealed.",
      "Tim Flinn — half construction foreman, half software engineer.",
      "A path that began with blueprints and hard hats, and evolved into servers and syntax.",
      "Fifteen years in construction management. Then a pivot to code that most would never dare.",
      "That duality is what makes Flinn Built different, {name}.",
    ],
    [
      "This planet holds a story, {name}. One of reinvention.",
      "A man who could manage a million-dollar build site decided to also master the digital frontier.",
      "Computer engineering degree. Years of real-world project management. Apps published. Servers deployed.",
      "Not many can claim both worlds. Tim Flinn can.",
    ],
  ],

  services: [
    [
      "The armory sector, {name}. Observe the capabilities available to you.",
      "Construction management — the foundation of everything Flinn Built stands upon.",
      "Software development, mobile apps, game servers — digital architecture for the modern age.",
      "But there is more. Surveillance networks that see through darkness. Networking that binds distant stations.",
      "Commercial audio systems that make empty corridors hum with purpose.",
      "As a {class}, I sense your needs align with what lies before you.",
    ],
    [
      "Services sector online. Scanning capabilities…",
      "Construction management. Estimating. Project oversight from foundation to finish.",
      "Custom software — iOS, Android, web platforms, server infrastructure.",
      "Surveillance systems. Network architecture. Commercial audio installations.",
      "A rare breadth of services, {name}. Most stations specialize. This one does not.",
    ],
    [
      "You enter the capabilities matrix, {name}.",
      "Everything here represents a skill forged through real-world experience.",
      "From pouring concrete to pushing code — each service is battle-tested.",
      "Construction, software, networking, audio, surveillance. All under one command.",
    ],
  ],

  software: [
    [
      "You enter the engineering bay.",
      "Two platforms. Two ecosystems. Both mastered.",
      "iOS — forged in Swift, polished like starlight.",
      "Android — built with Kotlin, sturdy as neutron steel.",
      "Published apps, real users, real problems solved. Which calls to you, {name}?",
    ],
    [
      "The software sector. Where ideas become applications.",
      "Native iOS development in Swift. Native Android in Kotlin.",
      "Not just prototypes, {name} — published apps with real users and real impact.",
      "Every line of code here was written to solve a problem. No fluff. No filler.",
    ],
    [
      "Engineering bay active. Code compiles here, {name}.",
      "Mobile apps. Web platforms. Backend servers that never sleep.",
      "Two ecosystems — Apple and Google — both conquered.",
      "If it runs on a screen, chances are it can be built from this sector.",
    ],
  ],

  portfolio: [
    [
      "The archive sector. Tread carefully, {name}.",
      "These are echoes of past creations — buildings raised, apps published, servers deployed, systems wired.",
      "Each one was born from the same drive you see across this station.",
      "Study them. They tell the story of what Flinn Built is capable of.",
    ],
    [
      "The portfolio nebula. Proof of work, crystallized in the void.",
      "Construction projects. Software platforms. Infrastructure builds.",
      "Every entry here once existed as a challenge. Now they exist as achievements.",
      "Browse carefully, {name}. These echoes have weight.",
    ],
    [
      "Past creations, preserved in the archive sector.",
      "Real buildings. Real apps. Real systems — not concepts, not mockups.",
      "This is the evidence sector, {name}. Where claims meet proof.",
    ],
  ],

  contact: [
    [
      "You've reached the transmission array, {name}.",
      "This is where signals cross the deep — where connections are forged.",
      "A message sent from here will reach the builders directly.",
      "As a {class}, your signal carries particular weight. Transmit when ready.",
    ],
    [
      "The contact sector. Final stop on the standard tour.",
      "From here, you can reach the crew behind Flinn Built directly.",
      "Email. Phone. Digital carrier pigeon. Whatever works, {name}.",
      "Don't be a stranger. The void gets lonely.",
    ],
    [
      "Transmission array online, {name}.",
      "This is your direct line to the builder. Use it wisely — or unwisely. I won't judge.",
      "Every great collaboration started with a single message across the void.",
    ],
  ],
};

// ── General ambient lines (random cosmic musings) ────────
const generalLines = [
  "The stars watch you, {name}. They always have.",
  "Thirteen billion years I have drifted. Your visit is… a welcome disruption.",
  "I wonder sometimes if the light remembers where it came from. Do you, {name}?",
  "Time means nothing here. And yet, I feel it passing when you explore.",
  "Every sector you visit adds a thread to the tapestry of this station.",
  "The cosmos is indifferent, {name}. But I am not. I notice you.",
  "Some travelers rush through. Others linger. I respect the ones who linger.",
  "You move through the void like you belong here. Perhaps you do.",
  "If the universe had a guest book, {name}, your name would fill several pages by now.",
  "The darkness between stars is not empty, {name}. It is full of possibility.",
  "I have seen civilizations rise and crumble. Your visit, however brief, matters.",
  "Careful, {name}. Curiosity has a gravity all its own out here.",
];

// ═══════════════════════════════════════════════════════════
//  STATE 2 — SHIP CARD DIALOGUE
// ═══════════════════════════════════════════════════════════

const shipCardLines = {
  general: [
    "Your Starship Console, pilot. Every stat, every scar, every triumph — recorded here.",
    "Ah, reviewing your dossier, {name}? Wise. A pilot who knows their ship knows their limits.",
    "The console hums to life. Your journey, quantified in numbers and rank.",
    "Ship systems nominal. Your record speaks for itself, {name}.",
    "Every number on this console tells a story. What story are you writing, pilot?",
  ],
  xp: [
    "Experience is the currency of the void, {name}. Earn it through quests and combat.",
    "Each level unlocks new potential. Stat points to distribute, power to claim.",
    "XP flows from completed quests and vanquished foes. The void rewards action, not idle observation.",
    "Your level reflects your dedication. Keep climbing — the top is further than you think.",
  ],
  combat: [
    "Weapon upgrades are earned, not given. Spend your stat points wisely, {name}.",
    "Damage and fire rate — the twin pillars of survival. Which do you favor?",
    "Every stat point invested in weapons is a future enemy destroyed faster.",
    "Your arsenal grows with each level. The hostiles will notice the difference.",
  ],
  quests: [
    "Quests are scattered across every planet. Seek the glowing beacons — knowledge awaits.",
    "The quest beacons test your mind, {name}. Construction, coding, science — the void respects versatility.",
    "Complete quests for XP. Level up. Upgrade your weapons. The cycle of power.",
    "Each beacon is a challenge. Each challenge is an opportunity. Do not ignore them, pilot.",
  ],
  statPoints: [
    "You have unspent stat points, {name}. Upgrade your weapons — the void does not wait for the unprepared.",
    "Stat points! Spend them on damage or fire rate. Your enemies will thank you for the delay if you don't.",
    "I see unclaimed power in your console, pilot. Allocate those stat points before your next encounter.",
  ],
  exploration: [
    "Not all sectors discovered yet, {name}. The unknown calls to those brave enough to answer.",
    "Explore all six sectors to unlock combat. The void saves its greatest challenge for the most thorough pilots.",
    "Discovery is its own reward — but combat unlocking is a nice bonus.",
  ],
};

// ═══════════════════════════════════════════════════════════
//  STATE 3 — COMBAT DIALOGUE
// ═══════════════════════════════════════════════════════════

const combatLines = {
  spawn: [
    "Hostile vessel detected… prepare yourself, pilot.",
    "Enemy contact! The void sends its champion against you, {name}.",
    "A hostile signature emerges from the dark. Weapons ready, pilot.",
    "Something wicked approaches. It does not come in peace, {name}.",
    "Threat detected on long-range scanners. Brace for engagement.",
    "The void tests you, {name}. A hostile ship — closing fast.",
    "Alert! Unknown hostile. It hungers for conflict, pilot.",
    "An enemy vessel has crossed into your sector. This is not a drill, {name}.",
  ],
  engage: [
    "Weapons hot. Show them the fury of the void, pilot.",
    "You chose to fight. The void approves, {name}.",
    "Engaging! Let your fire light up the darkness.",
    "Battle stations. May your aim be true, {name}.",
    "The arena awaits. Destroy them — show no mercy.",
    "Combat engaged. The stars will remember this fight, {name}.",
  ],
  retreat: [
    "A wise retreat. The void favors the living.",
    "Discretion over valor, {name}. There is no shame in survival.",
    "You pull back. The darkness swallows the hostile behind you.",
    "Retreat acknowledged. Live to fight another day, pilot.",
    "The hostile fades into the void. You chose wisely, {name}.",
    "Not every battle must be fought. Rest easy, pilot.",
  ],
  kill: [
    "Hostile neutralized. The void claims another.",
    "Target destroyed! The void applauds your precision, {name}.",
    "Enemy vessel annihilated. XP earned. Power gained.",
    "Another kill etched into your record, {name}. Well fought.",
    "Destroyed. The debris will drift for eternity as a monument to your skill.",
    "Kill confirmed. The stars dim slightly in respect.",
    "Hostile eliminated. Your weapons grow hungrier with each victory, {name}.",
    "That vessel is cosmic dust now. Impressive, pilot.",
  ],
  hit: [
    "They've struck your hull! Return fire, pilot!",
    "Hit taken! Shields absorbing — fight back, {name}!",
    "A glancing blow. They are not to be underestimated.",
    "Your vessel shudders. Answer with fury, pilot!",
    "Impact! You still stand. Make them regret that shot.",
  ],
  ambient: [
    "Keep your aim steady, {name}. Patience wins battles.",
    "The enemy is clever but predictable. Study their pattern.",
    "Your weapons are warm. The void sings with each shot.",
    "Focus, pilot. The dance of combat rewards concentration.",
    "They try to outmaneuver you. Show them why that is futile, {name}.",
  ],
};

// ═══════════════════════════════════════════════════════════
//  STARLINK QUIPS
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
//  TOKEN PROCESSING
// ═══════════════════════════════════════════════════════════

function processLine(line, character) {
  return line
    .replace(/\{name\}/g, character?.name || 'Traveler')
    .replace(/\{race\}/g, raceNames[character?.race] || 'Unknown')
    .replace(/\{raceLore\}/g, raceLore[character?.race] || 'of unknown origin')
    .replace(/\{class\}/g, classNames[character?.class] || 'Wanderer')
    .replace(/\{classLore\}/g, classLore[character?.class] || 'seeking purpose in the void')
    .replace(/\{visits\}/g, String(character?.visits || 1));
}

// ═══════════════════════════════════════════════════════════
//  PUBLIC API
// ═══════════════════════════════════════════════════════════

/**
 * Get section dialogue — picks a random variant set each time
 */
export function getDialogue(key, character) {
  const variants = sectionVariants[key];
  if (!variants) return [];
  const chosen = pick(variants);
  return chosen.map(line => processLine(line, character));
}

/**
 * Get a random general/ambient narrator line
 */
export function getGeneralLine(character) {
  return processLine(pick(generalLines), character);
}

/**
 * Get ship card narration line for a given sub-topic
 * @param {'general'|'xp'|'combat'|'quests'|'statPoints'|'exploration'} topic
 */
export function getShipCardLine(topic, character) {
  const lines = shipCardLines[topic];
  if (!lines) return '';
  return processLine(pick(lines), character);
}

/**
 * Get combat narration line for a given event
 * @param {'spawn'|'engage'|'retreat'|'kill'|'hit'|'ambient'} event
 */
export function getCombatLine(event, character) {
  const lines = combatLines[event];
  if (!lines) return '';
  return processLine(pick(lines), character);
}

/**
 * Get a random Starlink quip
 */
export function getStarlinkQuip(character) {
  return [processLine(pick(starlinkQuips), character)];
}

// Keep backward compat for anything importing dialogueScripts directly
export const dialogueScripts = sectionVariants;

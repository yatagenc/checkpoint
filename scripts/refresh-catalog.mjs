/** Build-time research utility. The app never calls Steam at runtime. */
import { writeFile, mkdir } from "node:fs/promises";

const selections = [
  [
    "elden-ring",
    1245620,
    "Explore a fallen kingdom, build your own fighting style, and follow curiosity across the Lands Between.",
    ["Open world", "Fantasy", "Challenging"],
  ],
  [
    "red-dead-redemption-2",
    1174180,
    "Ride with an outlaw gang as the American frontier changes around them. A sprawling western shaped by loyalty, survival, and the cost of a fading way of life.",
    ["Open world", "Western", "Story rich"],
  ],
  [
    "the-witcher-3",
    292030,
    "Follow Geralt of Rivia through war-torn landscapes in search of someone close to him. Monster contracts and difficult choices fill the roads between villages.",
    ["Open world", "Fantasy", "Story rich"],
  ],
  [
    "cyberpunk-2077",
    1091500,
    "Find your place in Night City as a mercenary caught in a struggle over identity and power. Shape your approach with cyberware, conversation, stealth, and combat.",
    ["Open world", "Sci-fi", "Story rich"],
  ],
  [
    "baldurs-gate-3",
    1086940,
    "Gather a party and navigate a fantasy adventure built around choice. Turn-based encounters and branching conversations leave room for unexpected solutions.",
    ["Fantasy", "Turn-based", "Party based"],
  ],
  [
    "god-of-war",
    1593500,
    "Travel through a world of Norse myth with Kratos and his son Atreus. A personal journey unfolds through exploration and close-quarters combat.",
    ["Mythology", "Story rich", "Third person"],
  ],
  [
    "the-last-of-us",
    1888930,
    "Journey across a changed United States with Joel and Ellie. Explore abandoned places and navigate tense encounters in a story of survival and human connection.",
    ["Survival", "Story rich", "Post-apocalyptic"],
  ],
  [
    "hollow-knight",
    367520,
    "Descend into a forgotten kingdom beneath a quiet town. Explore interwoven caverns, learn precise combat, and uncover the traces of a lost civilization.",
    ["Metroidvania", "Exploration", "Challenging"],
  ],
  [
    "sekiro",
    814380,
    "Follow a shinobi through a fantastical vision of Sengoku-era Japan. Deflection, movement, and observation are central to its demanding sword fights.",
    ["Challenging", "Ninja", "Third person"],
  ],
  [
    "grand-theft-auto-v",
    271590,
    "Explore Los Santos through three intersecting criminal lives. A sprawling city and surrounding countryside form the stage for missions, driving, and heists.",
    ["Open world", "Crime", "Third person"],
  ],
  [
    "hades",
    1145360,
    "Attempt to escape the Greek underworld with help from the Olympian gods. Each run combines changing abilities with a story that continues between attempts.",
    ["Roguelike", "Mythology", "Isometric"],
  ],
  [
    "resident-evil-4",
    2050650,
    "Enter a remote European village on a rescue mission as Leon Kennedy. This remake reworks the original survival horror adventure with modern combat and exploration.",
    ["Survival horror", "Remake", "Third person"],
  ],
  [
    "ghost-of-tsushima",
    2215430,
    "Travel across Tsushima as Jin Sakai during a Mongol invasion. Swordplay, stealth, and quiet exploration shape a samurai story.",
    ["Open world", "Samurai", "Third person"],
  ],
  [
    "disco-elysium",
    632470,
    "Investigate a murder in a city full of competing histories and voices. Conversations, choices, and your own unruly thoughts drive this detective role-playing adventure.",
    ["Detective", "Narrative", "Isometric"],
  ],
  [
    "celeste",
    504230,
    "Climb a mountain one screen at a time. Precise platforming and a personal story explore perseverance, uncertainty, and finding your footing.",
    ["Platformer", "Pixel art", "Challenging"],
  ],
  [
    "stardew-valley",
    413150,
    "Turn an inherited farm into a home at your own pace. Grow crops, explore the valley, and get to know the people around you.",
    ["Farming", "Cozy", "Pixel art"],
  ],
  [
    "portal-2",
    620,
    "Solve spatial puzzles using a device that connects distant surfaces. Explore a deserted testing facility with a sharp sense of humor and a separate cooperative campaign.",
    ["Puzzle", "Sci-fi", "Co-op"],
  ],
  [
    "portal",
    400,
    "Think in portals as you move through a series of unusual test chambers. A compact puzzle adventure where space itself becomes your tool.",
    ["Puzzle", "Sci-fi", "First person"],
  ],
  [
    "half-life-2",
    220,
    "Return as Gordon Freeman in a world under occupation. Physics-driven encounters and environmental storytelling carry a first-person journey through city streets and beyond.",
    ["Sci-fi", "First person", "Story rich"],
  ],
  [
    "skyrim",
    489830,
    "Explore a northern province of Tamriel in this Special Edition of Skyrim. Choose your skills, follow quests, and discover stories beyond the main path.",
    ["Open world", "Fantasy", "Exploration"],
  ],
  [
    "dark-souls-iii",
    374320,
    "Enter a decaying fantasy world of interconnected paths and demanding encounters. Learn from each setback and shape a character around your preferred approach.",
    ["Dark fantasy", "Challenging", "Third person"],
  ],
  [
    "death-stranding",
    1850570,
    "Reconnect isolated settlements by carrying cargo across a fractured landscape. Route planning, balance, and shared structures turn travel into the heart of the adventure.",
    ["Exploration", "Sci-fi", "Atmospheric"],
  ],
  [
    "control",
    870780,
    "Investigate an otherworldly federal bureau as Jesse Faden. Shifting architecture, supernatural abilities, and scattered records reveal a strange institutional mystery.",
    ["Supernatural", "Third person", "Mystery"],
  ],
  [
    "outer-wilds",
    753640,
    "Explore a small solar system caught in a repeating moment. Follow clues across unusual planets, learning how its places and histories fit together.",
    ["Exploration", "Space", "Mystery"],
  ],
  [
    "subnautica",
    264710,
    "Survive beneath the ocean of an alien planet. Gather resources, build shelters, and venture deeper to discover what lies below.",
    ["Survival", "Underwater", "Exploration"],
  ],
  [
    "doom-eternal",
    782330,
    "Push through a demon invasion with fast movement and an arsenal of specialized weapons. Combat rewards managing resources and staying on the move.",
    ["First person", "Fast paced", "Demons"],
  ],
  [
    "dead-cells",
    588650,
    "Fight through a changing island in a run-based action platformer. Experiment with weapons and routes as repeated attempts reveal more of its world.",
    ["Roguelike", "Metroidvania", "Pixel art"],
  ],
  [
    "slay-the-spire",
    646570,
    "Build a deck as you climb a branching series of encounters. Each card, relic, and route choice changes the shape of your next battle.",
    ["Deckbuilding", "Roguelike", "Turn-based"],
  ],
  [
    "civilization-vi",
    289070,
    "Guide a civilization across the ages through exploration, research, diplomacy, and war. Plan cities across the map and pursue different routes to victory.",
    ["Strategy", "Turn-based", "Historical"],
  ],
  [
    "terraria",
    105600,
    "Dig, build, and explore a world of underground discoveries. Gather materials and prepare for increasingly demanding encounters in a sandbox adventure.",
    ["Sandbox", "Crafting", "Pixel art"],
  ],
  [
    "no-mans-sky",
    275850,
    "Travel between planets in a vast science-fiction universe. Explore strange environments, build bases, and choose your own path through space.",
    ["Space", "Exploration", "Survival"],
  ],
  [
    "it-takes-two",
    1426210,
    "Work together through an adventure designed for two players. Each chapter introduces new cooperative mechanics as a transformed couple tries to find a way forward.",
    ["Co-op", "Platformer", "Puzzle"],
  ],
  [
    "ori-and-the-will-of-the-wisps",
    1057090,
    "Explore a luminous world as Ori in a movement-focused adventure. New abilities open paths through forests, ruins, and carefully staged encounters.",
    ["Metroidvania", "Platformer", "Atmospheric"],
  ],
  [
    "stray",
    1332010,
    "Navigate a walled city from a cat’s point of view. Explore rooftops and alleys, solve environmental puzzles, and meet its robotic inhabitants.",
    ["Cats", "Exploration", "Atmospheric"],
  ],
  [
    "balatro",
    2379780,
    "Build powerful card combinations in a poker-inspired roguelike. Jokers and upgrades reshape the rules as you work toward higher scoring hands.",
    ["Deckbuilding", "Roguelike", "Strategy"],
  ],
  [
    "clair-obscur-expedition-33",
    1903340,
    "Join an expedition in a painterly fantasy world. Turn-based battles incorporate timed actions while exploration reveals the story of a threatened society.",
    ["Fantasy", "Turn-based", "Story rich"],
  ],
];

async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response.json();
}
async function imageExists(url) {
  if (!url || !url.startsWith("https://")) return false;
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(12000),
    });
    return (
      response.ok &&
      (response.headers.get("content-type") ?? "").startsWith("image/")
    );
  } catch {
    return false;
  }
}
const platformNames = {
  windows: ["pc", "PC (Windows)", "PC"],
  mac: ["mac", "macOS", "Mac"],
  linux: ["linux", "Linux", "Linux"],
};
const output = [];
for (const [id, appId, description, tags] of selections) {
  const response = await json(
    `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english&cc=us`,
  );
  const data = response[appId]?.data;
  if (!response[appId]?.success || !data)
    throw new Error(`No metadata for ${id}`);
  const store = `https://store.steampowered.com/app/${appId}/`;
  const candidate = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`;
  const coverUrl = (await imageExists(candidate))
    ? candidate
    : (await imageExists(data.header_image))
      ? data.header_image
      : null;
  const screenshots = [];
  for (const [index, shot] of (data.screenshots ?? []).slice(0, 3).entries()) {
    if (await imageExists(shot.path_full))
      screenshots.push({
        url: shot.path_full,
        alt: `${data.name} — promotional screenshot ${index + 1}`,
      });
  }
  const backgroundUrl = screenshots[0]?.url ?? null;
  // Steam dates describe this storefront edition, not necessarily the game's debut.
  // Date-only storefront strings must not be interpreted in the host timezone.
  const date = Date.parse(`${data.release_date?.date ?? ""} UTC`);
  const releaseDate = Number.isNaN(date)
    ? null
    : new Date(date).toISOString().slice(0, 10);
  const metric = data.metacritic;
  output.push({
    id,
    slug: id,
    title: data.name,
    coverUrl,
    backgroundUrl,
    description,
    releaseDate,
    releaseDateNote: "Steam edition release",
    developer: data.developers?.join(", ") || null,
    publisher: data.publishers?.join(", ") || null,
    platforms: Object.entries(data.platforms ?? {})
      .filter(([key, value]) => value && key in platformNames)
      .map(([key]) => {
        const [id, name, abbreviation] = platformNames[key];
        return { id, name, abbreviation };
      }),
    genres: (data.genres ?? []).map((genre) => genre.description),
    tags,
    screenshots,
    metacritic:
      metric?.score > 0 && metric.url?.startsWith("https://")
        ? { score: metric.score, url: metric.url, platform: "PC" }
        : null,
    communityRating: null,
    estimatedPlaytimeHours: null,
    externalLinks: [
      { label: "Steam store", url: store },
      ...(data.website?.startsWith("https://")
        ? [{ label: "Official website", url: data.website }]
        : []),
    ],
    source: {
      name: "Steam store",
      url: store,
      verifiedAt: "2026-10-16",
      note: "Local demo snapshot. Dates, platforms and critic scores refer to the Steam/PC edition; tags and descriptions are Checkpoint editorial copy.",
    },
  });
  console.log(
    `${output.length}/${selections.length} ${data.name}: cover=${!!coverUrl}, screenshots=${screenshots.length}, critic=${metric?.score ?? "unavailable"}`,
  );
}
await mkdir("src/data", { recursive: true });
await writeFile(
  "src/data/catalog.json",
  JSON.stringify(output, null, 2) + "\n",
);
console.log("Wrote verified local snapshot to src/data/catalog.json");

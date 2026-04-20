export const DEFAULT_CUSTOMIZATION = {
  robeColor: 0x6fa0ff,
  sleeveColor: 0x6fa0ff,
  trimColor: 0xd4b072,
  hatColor: 0x2a2242,
  skinColor: 0xdab58e,
  sigilType: "none",
  sigilColor: 0xe7d4aa,
  eyeGlowMode: "none",
  eyeGlowColor: 0x8cd7ff,
  hatHeight: 0.38,
  hatRadius: 0.2,
  faceVariant: "calm",
  poseVariant: "neutral",
  mirrorFrame: "brass",
  collarColor: 0x5a3f2a,
  focusType: "none",
  focusColor: 0xc99641,
  focusFinish: "brass",
  familiarType: "none",
  familiarColor: 0xb39cf4,
  charmType: "none",
  charmColor: 0xf4d89a,
};

export const MIRROR_FRAME_OPTIONS = [
  { id: "brass", name: "Brass" },
  { id: "violet", name: "Violet" },
  { id: "thorn", name: "Thorn" },
];

export const EYE_GLOW_OPTIONS = [
  { id: "none", name: "None" },
  { id: "soft", name: "Soft" },
  { id: "bright", name: "Bright" },
];

export const FOCUS_FINISH_OPTIONS = [
  { id: "brass", name: "Brass" },
  { id: "oak", name: "Oak" },
  { id: "ivory", name: "Ivory" },
  { id: "obsidian", name: "Obsidian" },
];

export const WIZARD_TITLES = [
  { id: "fresh-wizard", name: "Fresh Wizard", unlock: null },
  { id: "backroom-menace", name: "Backroom Menace", unlock: { type: "totalRoundWins", value: 5, label: "Win 5 rounds" } },
  { id: "licensed-menace", name: "Licensed Menace", unlock: { type: "runsCleared", value: 1, label: "Clear 1 run" } },
  { id: "daily-menace", name: "Daily Menace", unlock: { type: "dailyRuns", value: 3, label: "Play 3 daily runs" } },
  { id: "table-legend", name: "Table Legend", unlock: { type: "runsCleared", value: 3, label: "Clear 3 runs" } },
];

const FAMILIAR_BOUTIQUE_FLAVOR = {
  none: {
    title: "Creeping Moon Outfitters",
    copy: "A cramped little boutique behind the tavern wall, with too many candles, one breathing mirror, and a tailor who never blinks at cursed velvet.",
    shopIntro: "The mirror keeps its opinions to itself. Suspicious behavior for a mirror in this neighborhood.",
  },
  bat: {
    title: "Ledger Bat Perch",
    copy: "A little bat hangs upside down over the fitting mirror and chitters every time you try on something too expensive for your current gold.",
    shopIntro: "The bat approves of dramatic sleeves and anything that looks mildly fraudulent.",
  },
  toad: {
    title: "Rain Toad Basin",
    copy: "A damp stone basin sits under the mirror while a toad watches every outfit choice like it already knows which one loses at cards.",
    shopIntro: "The toad prefers heavy collars, patient hats, and a complete lack of rushing.",
  },
  candle: {
    title: "Candle Skull Nook",
    copy: "A floating skull candle circles the mirror and throws hot little shadows over every robe like the store itself is gossiping.",
    shopIntro: "The skull likes things with brass trim and the kind of confidence that should probably be taxed.",
  },
  moth: {
    title: "Velvet Moth Rail",
    copy: "A moth the size of a hand drifts through the fitting circle, landing only on the pieces that look a little haunted in good taste.",
    shopIntro: "The moth goes for soft glow, strange silks, and accessories that seem older than the tavern.",
  },
};

const LOADOUT_BARKS = {
  default: {
    category: "deception",
    roundStart: [
      "Let's pretend this was always the plan.",
      "If this goes wrong, I'm calling it style.",
    ],
    win: [
      "That looked extremely intentional from my side of the table.",
      "Good. The outfit did its job.",
    ],
    lose: [
      "I blame the room, the lighting, and several people here.",
      "That hand was clearly a rough draft.",
    ],
    tie: [
      "Fine. We can both be suspiciously correct.",
    ],
    tables: {
      "backroom-tavern": [
        "The tavern's in a generous mood. I do not trust it.",
      ],
      "crooked-casino": [
        "This room smells like polished wood and bad incentives.",
      ],
      "audit-chamber": [
        "Everything in here looks legally binding. Terrible sign.",
      ],
    },
  },
  bat: {
    category: "deception",
    roundStart: [
      "The bat says keep lying until it works.",
      "If anyone asks, my familiar saw me shuffle honestly.",
    ],
    win: [
      "The bat loved that. Disturbing endorsement.",
      "Nothing like winning with airborne paperwork support.",
    ],
    lose: [
      "The bat is judging the line I took. Fair.",
      "That was not my familiar's best scouting work.",
    ],
    tie: [
      "The bat wanted a cleaner ending than that.",
    ],
    tables: {
      "backroom-tavern": [
        "The bat likes this ceiling. Too many hiding spots.",
      ],
      "crooked-casino": [
        "The bat says this casino counts cards worse than it counts exits.",
      ],
      "audit-chamber": [
        "The bat has already filed three complaints about this lighting.",
      ],
    },
  },
  toad: {
    category: "defense",
    roundStart: [
      "The toad says wait. Annoying, but often correct.",
      "Patience. The toad insists on making this slower.",
    ],
    win: [
      "The toad blinked once. That is basically applause.",
      "Excellent. Slow, damp, and correct.",
    ],
    lose: [
      "The toad hated that. I could feel it in my bones.",
      "I rushed it. The toad was visibly embarrassed for me.",
    ],
    tie: [
      "The toad can live with a draw. I cannot.",
    ],
    tables: {
      "backroom-tavern": [
        "The toad likes the damp under this table. Great. Horrible, but great.",
      ],
      "crooked-casino": [
        "The toad thinks this casino is too loud to be respectable.",
      ],
      "audit-chamber": [
        "The toad respects this room's commitment to paperwork and frostbite.",
      ],
    },
  },
  candle: {
    category: "chaos",
    roundStart: [
      "The skull says set something metaphorically on fire.",
      "My familiar wants a disaster with clean execution.",
    ],
    win: [
      "The skull flame got taller. That's probably praise.",
      "Good. Even the candle approves of that mess.",
    ],
    lose: [
      "The skull made a noise. I choose not to unpack it.",
      "That was not a flattering angle for me or the fire.",
    ],
    tie: [
      "The skull wanted a bigger ending. Honestly, same.",
    ],
    tables: {
      "backroom-tavern": [
        "The skull says this tavern is one curtain away from a legend.",
      ],
      "crooked-casino": [
        "The skull flame likes the casino. Bad sign for the casino.",
      ],
      "audit-chamber": [
        "The skull is trying very hard not to laugh in this chamber.",
      ],
    },
  },
  moth: {
    category: "chaos",
    roundStart: [
      "The moth picked this outfit, so if I fail it's basically collaborative.",
      "The moth says chase the glow and deal with the consequences later.",
    ],
    win: [
      "The moth landed on the winning sleeve. Obviously.",
      "That had perfect haunted-shop energy.",
    ],
    lose: [
      "The moth left. Understandable.",
      "I lost the line and the moth knew it first.",
    ],
    tie: [
      "The moth tolerates ambiguity better than I do.",
    ],
    tables: {
      "backroom-tavern": [
        "The moth likes the candle smoke in here far too much.",
      ],
      "crooked-casino": [
        "The moth thinks this casino glow is tacky. Correct, but rude.",
      ],
      "audit-chamber": [
        "The moth keeps trying to warm itself on the audit lights. Grim image.",
      ],
    },
  },
};

const SPELL_FAMILIAR_PREFIX = {
  bat: "Ledger",
  toad: "Rain",
  candle: "Cinder",
  moth: "Velvet",
};

const TITLE_VICTORY_FLAVOR = {
  "fresh-wizard": {
    round: "Fresh Wizard Victory",
    run: "Fresh Wizard Clears The Tavern",
  },
  "backroom-menace": {
    round: "Backroom Menace Wins Again",
    run: "Backroom Menace Owns The House",
  },
  "licensed-menace": {
    round: "Licensed Menace At Work",
    run: "Licensed Menace Clears The Books",
  },
  "daily-menace": {
    round: "Daily Menace Cashes Out",
    run: "Daily Menace Runs The Ladder",
  },
  "table-legend": {
    round: "Table Legend Victory",
    run: "Table Legend Finishes The Circuit",
  },
};

export const CUSTOMIZATION_SWATCHES = {
  robeColor: [
    { id: "sky", name: "Sky", value: 0x6fa0ff },
    { id: "plum", name: "Plum", value: 0x70404e },
    { id: "moss", name: "Moss", value: 0x4a6a45 },
    { id: "midnight", name: "Midnight", value: 0x31375e },
    { id: "ember", name: "Ember", value: 0x8a4b38 },
  ],
  hatColor: [
    { id: "ink", name: "Ink", value: 0x2a2242 },
    { id: "mulberry", name: "Mulberry", value: 0x4f2d52 },
    { id: "oak", name: "Oak", value: 0x4c2d27 },
    { id: "moss", name: "Moss", value: 0x36452f },
    { id: "bone", name: "Bone", value: 0x857461 },
  ],
  trimColor: [
    { id: "brass", name: "Brass", value: 0xd4b072 },
    { id: "bone", name: "Bone", value: 0xe5d5b6 },
    { id: "silver", name: "Silver", value: 0xbfc8d6 },
    { id: "wine", name: "Wine", value: 0x8d5064 },
    { id: "verdigris", name: "Verdigris", value: 0x6ea79d },
  ],
  skinColor: [
    { id: "fair", name: "Fair", value: 0xf0d2b1 },
    { id: "warm", name: "Warm", value: 0xdab58e },
    { id: "tan", name: "Tan", value: 0xb98664 },
    { id: "deep", name: "Deep", value: 0x7f583f },
    { id: "emberborn", name: "Emberborn", value: 0xa46f56 },
  ],
  charmColor: [
    { id: "gold", name: "Gold", value: 0xf4d89a },
    { id: "violet", name: "Violet", value: 0xb39cf4 },
    { id: "mint", name: "Mint", value: 0x8fe0c4 },
    { id: "ember", name: "Ember", value: 0xf0a06b },
    { id: "ice", name: "Ice", value: 0xb4e3ff },
  ],
  collarColor: [
    { id: "oak", name: "Oak", value: 0x5a3f2a },
    { id: "plum", name: "Plum", value: 0x6f4259 },
    { id: "night", name: "Night", value: 0x29314d },
    { id: "moss", name: "Moss", value: 0x486048 },
    { id: "bone", name: "Bone", value: 0xcdbda4 },
  ],
  focusColor: [
    { id: "brass", name: "Brass", value: 0xc99641 },
    { id: "ember", name: "Ember", value: 0xdb7a52 },
    { id: "ice", name: "Ice", value: 0x8cd7ff },
    { id: "violet", name: "Violet", value: 0xaa8ff2 },
    { id: "jade", name: "Jade", value: 0x6fb68e },
  ],
  eyeGlowColor: [
    { id: "ice", name: "Ice", value: 0x8cd7ff },
    { id: "ember", name: "Ember", value: 0xff9b57 },
    { id: "violet", name: "Violet", value: 0xb28fff },
    { id: "jade", name: "Jade", value: 0x7de7b3 },
    { id: "gold", name: "Gold", value: 0xf4d89a },
  ],
  familiarColor: [
    { id: "violet", name: "Violet", value: 0xb39cf4 },
    { id: "ember", name: "Ember", value: 0xf0a06b },
    { id: "ice", name: "Ice", value: 0xb4e3ff },
    { id: "jade", name: "Jade", value: 0x8fe0c4 },
    { id: "gold", name: "Gold", value: 0xf4d89a },
  ],
};

export function defaultCustomizationOverrides() {
  return {
    faceVariant: "calm",
    poseVariant: "neutral",
    eyeGlowMode: "none",
    mirrorFrame: "brass",
    focusFinish: "brass",
  };
}

export const COSMETIC_ITEMS = [
  {
    id: "robe-apprentice",
    slot: "robe",
    name: "Apprentice Blues",
    price: 0,
    ownedByDefault: true,
    description: "The default backroom robe. Cheap, honest, and only lightly singed.",
    style: {
      robeColor: 0x6fa0ff,
      sleeveColor: 0x6fa0ff,
    },
  },
  {
    id: "robe-cinder",
    slot: "robe",
    name: "Cinder Velvet",
    price: 32,
    description: "Burnt plum velvet with a little too much self-regard.",
    style: {
      robeColor: 0x70404e,
      sleeveColor: 0x7b4958,
    },
  },
  {
    id: "robe-moss",
    slot: "robe",
    name: "Moss Sermon",
    price: 44,
    description: "A swampy green robe stitched by someone who definitely heard whispers.",
    style: {
      robeColor: 0x4a6a45,
      sleeveColor: 0x5d7d56,
    },
  },
  {
    id: "robe-midnight",
    slot: "robe",
    name: "Midnight Ledger",
    price: 58,
    description: "Ink-dark cloth for wizards who want to look expensive and unapproachable.",
    style: {
      robeColor: 0x31375e,
      sleeveColor: 0x445181,
    },
  },
  {
    id: "hat-backroom",
    slot: "hat",
    name: "Backroom Cone",
    price: 0,
    ownedByDefault: true,
    description: "The standard issue hat. Pointy enough to count.",
    style: {
      hatColor: 0x2a2242,
      hatHeight: 0.38,
      hatRadius: 0.2,
    },
  },
  {
    id: "hat-moonspire",
    slot: "hat",
    name: "Moonspire",
    price: 30,
    description: "Taller, thinner, and much more likely to scrape a chandelier.",
    style: {
      hatColor: 0x342554,
      hatHeight: 0.52,
      hatRadius: 0.17,
    },
  },
  {
    id: "hat-crook",
    slot: "hat",
    name: "Crooked Peak",
    price: 40,
    description: "A bent, suspicious hat for dishonest winners and dramatic losers.",
    style: {
      hatColor: 0x4c2d27,
      hatHeight: 0.44,
      hatRadius: 0.24,
    },
  },
  {
    id: "trim-plain",
    slot: "trim",
    name: "Plain Hem",
    price: 0,
    ownedByDefault: true,
    description: "No extra flourish. Respectable by accident.",
    style: {
      trimColor: 0xd4b072,
    },
  },
  {
    id: "trim-brass",
    slot: "trim",
    name: "Brass Stitching",
    price: 26,
    description: "Warm metal trim that makes every sleeve look more deliberate.",
    style: {
      trimColor: 0xc99641,
    },
  },
  {
    id: "trim-bone",
    slot: "trim",
    name: "Bone Script",
    price: 38,
    description: "Pale trim with a slightly ritual feel. Lovely. Disturbing.",
    style: {
      trimColor: 0xe5d5b6,
    },
  },
  {
    id: "collar-plain",
    slot: "collar",
    name: "Plain Mantle",
    price: 0,
    ownedByDefault: true,
    description: "A modest collar piece that keeps the robe from looking unfinished.",
    style: {
      collarColor: 0x5a3f2a,
    },
  },
  {
    id: "collar-royal",
    slot: "collar",
    name: "Royal Mantle",
    price: 34,
    description: "A broad velvet shoulder mantle for wizards who want the room to know they arrived.",
    style: {
      collarColor: 0x6f4259,
    },
  },
  {
    id: "collar-ice",
    slot: "collar",
    name: "Audit Mantle",
    price: 0,
    unlock: { type: "runsCleared", value: 1, label: "Clear 1 run" },
    description: "A sharp blue collar trimmed like it was approved by an especially judgmental ledger.",
    style: {
      collarColor: 0x445b83,
    },
  },
  {
    id: "charm-none",
    slot: "charm",
    name: "No Charm",
    price: 0,
    ownedByDefault: true,
    description: "Travel light. Fear is free.",
    style: {
      charmType: "none",
    },
  },
  {
    id: "charm-orbit",
    slot: "charm",
    name: "Orbit Sigil",
    price: 46,
    description: "A tiny orbiting rune that says you win enough to be annoying about it.",
    style: {
      charmType: "orbit",
      charmColor: 0xe0c16b,
    },
  },
  {
    id: "charm-raven",
    slot: "charm",
    name: "Paper Raven",
    price: 54,
    description: "A flat familiar cut from black card and bad intentions.",
    style: {
      charmType: "raven",
      charmColor: 0xb39cf4,
    },
  },
  {
    id: "sigil-none",
    slot: "sigil",
    name: "No Sigil",
    price: 0,
    ownedByDefault: true,
    description: "A clean face, no prophecy, no extra glowing nonsense.",
    style: {
      sigilType: "none",
    },
  },
  {
    id: "sigil-brow",
    slot: "sigil",
    name: "Brow Rune",
    price: 28,
    description: "A thin little forehead mark like you signed something magical without reading it.",
    style: {
      sigilType: "brow",
      sigilColor: 0xe7d4aa,
    },
  },
  {
    id: "sigil-split",
    slot: "sigil",
    name: "Split Star",
    price: 0,
    unlock: { type: "totalRoundWins", value: 12, label: "Win 12 rounds" },
    description: "Two slashed star marks under the eyes for wizards with suspiciously good stories.",
    style: {
      sigilType: "split",
      sigilColor: 0xb28fff,
    },
  },
  {
    id: "sigil-crown",
    slot: "sigil",
    name: "Crown Script",
    price: 0,
    unlock: { type: "runsCleared", value: 2, label: "Clear 2 runs" },
    description: "A little crown of script over the brow that makes every win look premeditated.",
    style: {
      sigilType: "crown",
      sigilColor: 0xf4d89a,
    },
  },
  {
    id: "focus-none",
    slot: "focus",
    name: "Empty Hands",
    price: 0,
    ownedByDefault: true,
    description: "No staff, no orb, no book. Just raw confidence and poor judgment.",
    style: {
      focusType: "none",
    },
  },
  {
    id: "focus-staff",
    slot: "focus",
    name: "Crooked Staff",
    price: 42,
    description: "A bent little staff that makes every pose look more official.",
    style: {
      focusType: "staff",
      focusColor: 0xc99641,
    },
  },
  {
    id: "focus-orb",
    slot: "focus",
    name: "Pocket Orb",
    price: 50,
    description: "A glowing orb for wizards who prefer to point at problems instead of solving them.",
    style: {
      focusType: "orb",
      focusColor: 0x8cd7ff,
    },
  },
  {
    id: "focus-grimoire",
    slot: "focus",
    name: "Ledger Grimoire",
    price: 0,
    unlock: { type: "totalRoundWins", value: 8, label: "Win 8 rounds" },
    description: "A floating book that suggests you've done this often enough to become concerning.",
    style: {
      focusType: "book",
      focusColor: 0xaa8ff2,
    },
  },
  {
    id: "familiar-none",
    slot: "familiar",
    name: "No Familiar",
    price: 0,
    ownedByDefault: true,
    description: "No witness, no helper, no tiny magical accomplice.",
    style: {
      familiarType: "none",
    },
  },
  {
    id: "familiar-bat",
    slot: "familiar",
    name: "Ledger Bat",
    price: 36,
    description: "A sharp little bat that flutters like it knows your debts.",
    style: {
      familiarType: "bat",
      familiarColor: 0xb39cf4,
    },
  },
  {
    id: "familiar-toad",
    slot: "familiar",
    name: "Rain Toad",
    price: 58,
    description: "A damp toad with perfect stillness and terrible opinions.",
    style: {
      familiarType: "toad",
      familiarColor: 0x8fe0c4,
    },
  },
  {
    id: "familiar-candle",
    slot: "familiar",
    name: "Candle Skull",
    price: 0,
    unlock: { type: "totalRoundWins", value: 10, label: "Win 10 rounds" },
    description: "A tiny floating skull with a candle flame and no indoor voice.",
    style: {
      familiarType: "candle",
      familiarColor: 0xf0a06b,
    },
  },
  {
    id: "familiar-moth",
    slot: "familiar",
    name: "Velvet Moth",
    price: 0,
    unlock: { type: "dailyRuns", value: 2, label: "Play 2 daily runs" },
    description: "A velvet moth that only lands on robes with excellent bad judgment.",
    style: {
      familiarType: "moth",
      familiarColor: 0xf4d89a,
    },
  },
];

export function defaultOwnedCosmetics() {
  return COSMETIC_ITEMS.filter((item) => item.ownedByDefault).map((item) => item.id);
}

export function defaultEquippedCosmetics() {
  return {
    robe: "robe-apprentice",
    hat: "hat-backroom",
    trim: "trim-plain",
    collar: "collar-plain",
    sigil: "sigil-none",
    charm: "charm-none",
    focus: "focus-none",
    familiar: "familiar-none",
  };
}

export function getCosmeticItem(itemId) {
  return COSMETIC_ITEMS.find((item) => item.id === itemId) ?? null;
}

export function resolveCustomizationStyle(equipped = {}) {
  const style = { ...DEFAULT_CUSTOMIZATION };
  Object.values(equipped).forEach((itemId) => {
    const item = getCosmeticItem(itemId);
    if (item?.style) {
      Object.assign(style, item.style);
    }
  });
  return style;
}

export function resolveCustomizationStyleWithOverrides(equipped = {}, overrides = {}) {
  return {
    ...resolveCustomizationStyle(equipped),
    ...(overrides ?? {}),
  };
}

export function getOwnedCosmetics(profile) {
  return new Set(profile?.ownedCosmetics ?? defaultOwnedCosmetics());
}

export function isCosmeticUnlocked(item, profile) {
  if (!item?.unlock) {
    return true;
  }

  if (item.unlock.type === "runsCleared") {
    return (profile?.runsCleared ?? 0) >= item.unlock.value;
  }
  if (item.unlock.type === "totalRoundWins") {
    return (profile?.totalRoundWins ?? 0) >= item.unlock.value;
  }
  if (item.unlock.type === "dailyRuns") {
    return (profile?.dailyRuns ?? 0) >= item.unlock.value;
  }
  return true;
}

export function isTitleUnlocked(title, profile) {
  if (!title?.unlock) {
    return true;
  }
  if (title.unlock.type === "runsCleared") {
    return (profile?.runsCleared ?? 0) >= title.unlock.value;
  }
  if (title.unlock.type === "totalRoundWins") {
    return (profile?.totalRoundWins ?? 0) >= title.unlock.value;
  }
  if (title.unlock.type === "dailyRuns") {
    return (profile?.dailyRuns ?? 0) >= title.unlock.value;
  }
  return true;
}

export function defaultSelectedTitle() {
  return "fresh-wizard";
}

export function getFamiliarBoutiqueFlavor(source = {}) {
  const style = source.familiarType ? source : resolveCustomizationStyle(source);
  return FAMILIAR_BOUTIQUE_FLAVOR[style?.familiarType ?? "none"] ?? FAMILIAR_BOUTIQUE_FLAVOR.none;
}

export function getWizardLoadoutFlavor(equipped = {}, overrides = {}) {
  const style = resolveCustomizationStyleWithOverrides(equipped, overrides);
  const baseFlavor = LOADOUT_BARKS[style.familiarType] ?? LOADOUT_BARKS.default;
  const focusTag = style.focusType === "book"
    ? "The book keeps pretending this counts as research."
    : style.focusType === "staff"
      ? "The staff makes every bad idea look briefly official."
      : style.focusType === "orb"
        ? "The orb is glowing like it knows something actionable."
        : null;
  const sigilTag = style.sigilType === "crown"
    ? "The crown script is being louder than necessary."
    : style.sigilType === "split"
      ? "The split sigil looks like it already survived an argument."
      : style.sigilType === "brow"
        ? "The brow rune adds a very specific kind of menace."
        : null;

  return {
    ...baseFlavor,
    wardrobe: getFamiliarBoutiqueFlavor(style),
    aside: [focusTag, sigilTag].filter(Boolean),
  };
}

export function getWizardShopkeeperReaction(equipped = {}, overrides = {}, selectedTitle = defaultSelectedTitle()) {
  const style = resolveCustomizationStyleWithOverrides(equipped, overrides);
  const title = WIZARD_TITLES.find((entry) => entry.id === selectedTitle)?.name ?? "Fresh Wizard";
  const familiar = style.familiarType === "none"
    ? "The tailor squints at you like they expected a familiar and feel mildly cheated."
    : style.familiarType === "bat"
      ? "The tailor keeps asking the bat not to eat the receipts."
      : style.familiarType === "toad"
        ? "The tailor has placed a polite towel down for the toad and is pretending this is normal."
        : style.familiarType === "candle"
          ? "The tailor has accepted the floating candle skull much faster than they should have."
          : "The tailor watches the moth like it might approve the whole collection on your behalf.";
  const finish = style.focusType === "staff"
    ? "They tap the staff against a boot rack and call it a strong silhouette."
    : style.focusType === "book"
      ? "They keep dusting the book like it outranks the rest of the room."
      : style.focusType === "orb"
        ? "They hold the orb at arm's length and admit it does improve the line of the outfit."
        : "They say the empty-hand look is bold, which is tailor talk for risky.";
  return `${title}. ${familiar} ${finish}`;
}

export function getSpellFlavor(equipped = {}, overrides = {}, spell = null) {
  const style = resolveCustomizationStyleWithOverrides(equipped, overrides);
  const familiarPrefix = SPELL_FAMILIAR_PREFIX[style.familiarType] ?? null;
  const displayName = familiarPrefix ? `${familiarPrefix} ${spell?.name ?? "Spell"}` : (spell?.name ?? "Spell");
  const channelText = style.focusType === "staff"
    ? "The spell jumps off the crooked staff like it paid rent."
    : style.focusType === "book"
      ? "The spell arrives with the smug certainty of a footnote."
      : style.focusType === "orb"
        ? "The spell rolls through the orb and comes out looking expensive."
        : "The spell leaves your sleeve the old-fashioned way: suspiciously.";
  const sigilText = style.sigilType === "crown"
    ? "The forehead script acts like it approved the cast in advance."
    : style.sigilType === "split"
      ? "The split sigil flares like this argument has happened before."
      : style.sigilType === "brow"
        ? "The brow rune twitches like it has strong editorial notes."
        : null;
  return {
    displayName,
    extraText: [channelText, sigilText].filter(Boolean).join(" "),
  };
}

export function getVictoryTitleFlavor(selectedTitle = defaultSelectedTitle(), runClear = false) {
  const entry = TITLE_VICTORY_FLAVOR[selectedTitle] ?? TITLE_VICTORY_FLAVOR[defaultSelectedTitle()];
  return runClear ? entry.run : entry.round;
}

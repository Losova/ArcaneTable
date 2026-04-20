import {
  assignSpells,
  getSpellById,
  SPELL_CATEGORY_COLORS,
  SPELL_LIBRARY,
} from "./spells.js";
import { getSpellFlavor } from "./customization.js";

const SUITS = ["Moons", "Stars", "Flames", "Tides"];
const SUIT_SYMBOLS = {
  Moons: "☾",
  Stars: "✦",
  Flames: "♢",
  Tides: "≈",
};
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const GAME_TYPES = {
  poker: "poker",
  uno: "uno",
};
const UNO_COLORS = ["Crimson", "Gold", "Leaf", "Azure"];
const UNO_COLOR_SYMBOLS = {
  Crimson: "R",
  Gold: "Y",
  Leaf: "G",
  Azure: "B",
  Wild: "W",
};
const UNO_NUMBER_VALUES = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const UNO_ACTION_VALUES = ["Skip", "Reverse", "+2"];
const UNO_WILD_VALUES = ["Wild", "+4"];
const PHASES = [
  {
    name: "Arcane Ante",
    description: "Three private cards are dealt. Everyone antes, then the first betting pass begins.",
  },
  {
    name: "First Rune",
    description: "The first shared rune card flips face-up and sparks a fresh betting pass.",
  },
  {
    name: "Second Rune",
    description: "A second rune hits the felt. Pairs, straights, and flushes start getting petty.",
  },
  {
    name: "Final Rune",
    description: "The last shared rune appears. One more betting pass before everybody argues at showdown.",
  },
  {
    name: "Showdown",
    description: "Everyone still standing reveals. Best 3-card hand wins, unless Patch Notes says otherwise.",
  },
];

const TABLE_EVENTS = [
  {
    id: "house-special",
    name: "House Special",
    description: "The tavern throws 2 chips into the pot to make the room more irresponsible.",
    category: "economy",
    apply(game) {
      game.state.pot += 2;
    },
  },
  {
    id: "cheap-seats",
    name: "Cheap Seats",
    description: "The crowd is broke. Raises are only 1 chip this round.",
    category: "economy",
    apply(game) {
      game.state.raiseAmount = 1;
    },
  },
  {
    id: "high-rollers",
    name: "High Rollers",
    description: "The room gets loud. Raises are 3 chips this round.",
    category: "chaos",
    apply(game) {
      game.state.raiseAmount = 3;
    },
  },
  {
    id: "lucky-lantern",
    name: "Lucky Lantern",
    description: "A cursed chandelier blesses everyone with 1 bonus mana.",
    category: "defense",
    apply(game) {
      game.state.players.forEach((player) => {
        player.mana += 1;
      });
    },
  },
  {
    id: "open-tab",
    name: "Open Tab",
    description: "The barkeep slides every wizard 2 extra chips and regrets it immediately.",
    category: "economy",
    apply(game) {
      game.state.players.forEach((player) => {
        player.stack += 2;
      });
    },
  },
];

const TABLE_BANTER = {
  bluff: {
    round: [
      "If anyone asks, I definitely earned these cards.",
      "The best strategy is confidence and a little fraud.",
    ],
    rune: [
      "A new rune? Excellent. More things to lie about.",
      "Look at that. Fresh material for bad decisions.",
    ],
    showdown: [
      "If I lose, please describe it as performance art.",
      "I would like the record to show I looked incredible doing this.",
    ],
  },
  frost: {
    round: [
      "I have audited this table and remain disappointed.",
      "Let's keep the chaos itemized, please.",
    ],
    rune: [
      "The probabilities have shifted. Naturally, for the worse.",
      "Good. More data. More reasons to distrust everyone.",
    ],
    showdown: [
      "Showdown is just accounting with emotional consequences.",
      "Somebody is about to misunderstand variance in public.",
    ],
  },
  chaos: {
    round: [
      "I licked one of the chips. It knows secrets now.",
      "If I win, the rules were good. If I lose, the rules were targeted.",
    ],
    rune: [
      "That rune looks unstable. I love it already.",
      "The table made a noise. I trust it completely.",
    ],
    showdown: [
      "Showdown time. Nobody breathe normal.",
      "If this works, I meant it. If not, same.",
    ],
  },
};

const PERSONALITY_MOODS = {
  bluff: "deception",
  frost: "defense",
  chaos: "chaos",
};

const DAILY_MODIFIERS = [
  {
    id: "bonus-orb",
    name: "Bonus Orb",
    description: "Everyone starts each round with +1 mana.",
  },
  {
    id: "packed-spellbook",
    name: "Packed Spellbook",
    description: "Everyone draws 1 extra spell each round.",
  },
  {
    id: "rich-seats",
    name: "Rich Seats",
    description: "Everyone gets +2 chips at the start of each round.",
  },
  {
    id: "crooked-ante",
    name: "Crooked Ante",
    description: "Antes cost 2 chips instead of 1.",
  },
  {
    id: "cheap-magic",
    name: "Cheap Magic",
    description: "The first spell each round costs 1 less mana for everyone.",
  },
  {
    id: "wild-rune",
    name: "Wild Rune",
    description: "The first revealed community rune each round becomes wild.",
  },
];

const RELIC_LIBRARY = [
  {
    id: "loaded-wand",
    name: "Loaded Wand",
    description: "+1 mana at the start of every round.",
    category: "economy",
  },
  {
    id: "stacked-deck",
    name: "Stacked Deck",
    description: "Draw 1 extra spell each round.",
    category: "deception",
  },
  {
    id: "bouncer-ledger",
    name: "Bouncer Ledger",
    description: "+2 chips at the start of every round.",
    category: "economy",
  },
  {
    id: "crooked-thumb",
    name: "Crooked Thumb",
    description: "Your first spell each round costs 1 less mana.",
    category: "deception",
  },
  {
    id: "sneak-mirror",
    name: "Sneak Mirror",
    description: "Peek at 1 random rival card at the start of every round.",
    category: "card manipulation",
  },
  {
    id: "marked-rune",
    name: "Marked Rune",
    description: "The first revealed community rune each round becomes wild.",
    category: "chaos",
  },
];

const STARTER_LOADOUTS = [
  {
    id: "plain-deck",
    name: "Plain Deck",
    description: "No freebies. Just you, your terrible instincts, and the table.",
    relicId: null,
    category: "economy",
  },
  {
    id: "loaded-wand",
    name: "Loaded Wand",
    description: "Start with +1 mana every round.",
    relicId: "loaded-wand",
    category: "economy",
  },
  {
    id: "crooked-thumb",
    name: "Crooked Thumb",
    description: "Your first spell each round costs 1 less mana.",
    relicId: "crooked-thumb",
    category: "deception",
  },
  {
    id: "sneak-mirror",
    name: "Sneak Mirror",
    description: "Peek at one rival card at the start of each round.",
    relicId: "sneak-mirror",
    category: "card manipulation",
  },
];

const UNO_MODIFIERS = [
  {
    id: "echo-skip",
    name: "Echo Skip",
    category: "disruption",
    tableIds: ["backroom-tavern", "crooked-casino"],
    description: "The first Skip each hand skips two wizards instead of one.",
    shortText: "First Skip echoes.",
  },
  {
    id: "gremlin-draw",
    name: "Gremlin Draw",
    category: "chaos",
    tableIds: ["backroom-tavern", "crooked-casino"],
    description: "If you draw an action card, the next wizard draws 1 too.",
    shortText: "Drawn actions bite the next seat.",
  },
  {
    id: "witch-tax",
    name: "Witch Tax",
    category: "economy",
    tableIds: ["crooked-casino", "audit-chamber"],
    description: "Playing Wild or +4 from 2 cards or fewer makes you draw 1 back.",
    shortText: "Low-hand wilds are taxed.",
  },
  {
    id: "hot-discard",
    name: "Hot Discard",
    category: "disruption",
    tableIds: ["backroom-tavern", "audit-chamber"],
    description: "The first time a wizard drops to 2 cards, the richest rival draws 1.",
    shortText: "First wizard to 2 cards punishes the rich.",
  },
  {
    id: "reverse-bloom",
    name: "Reverse Bloom",
    category: "card manipulation",
    tableIds: ["crooked-casino", "audit-chamber"],
    description: "Reverse also lets the caster repaint the live color.",
    shortText: "Reverse repaints the table.",
  },
  {
    id: "mirror-match",
    name: "Mirror Match",
    category: "deception",
    tableIds: ["backroom-tavern", "crooked-casino", "audit-chamber"],
    description: "Matching by value instead of color makes the next wizard draw 1.",
    shortText: "Value matches sting the next seat.",
  },
];

const TABLE_LADDER = [
  {
    id: "backroom-tavern",
    name: "Backroom Tavern",
    description: "The barkeep keeps the action moving by tossing 2 chips into the pot at the start of each round.",
    introLine: "Smoke, cheap felt, and the kind of table where everybody already owes somebody money.",
    category: "economy",
    openingPot: 2,
    raiseDelta: 0,
    startingManaDelta: 0,
  },
  {
    id: "crooked-casino",
    name: "Crooked Casino",
    description: "Raises are 1 chip bigger here. Everyone acts like that's normal.",
    introLine: "Velvet curtains, rigged confidence, and the exact amount of candlelight needed for fraud.",
    category: "deception",
    openingPot: 0,
    raiseDelta: 1,
    startingManaDelta: 0,
  },
  {
    id: "audit-chamber",
    name: "Audit Chamber",
    description: "Every wizard starts with 1 less mana. Even the chandelier is judgmental.",
    introLine: "Cold ledgers, blue fire, and a room that files complaints before you make them.",
    category: "defense",
    openingPot: 0,
    raiseDelta: 0,
    startingManaDelta: -1,
  },
];

const RIVAL_SIGNATURES = {
  bluff: {
    name: "Stage Presence",
    description: "The Bluff Mage's first raise each round adds 1 extra chip.",
    category: "deception",
  },
  frost: {
    name: "Audit Shield",
    description: "The Frost Accountant starts each round with a Cope Ward.",
    category: "defense",
  },
  chaos: {
    name: "Pocket Gremlin",
    description: "The Chaos Goblin Wizard starts each round with either 1 bonus mana or 1 extra spell.",
    category: "chaos",
  },
};

const RIVAL_REACTIONS = {
  bluff: {
    won: [
      "Naturally. The applause can start whenever.",
      "Please describe that as a masterclass in confidence.",
    ],
    lost: [
      "Unfortunate. I was halfway through a victory pose.",
      "I reject this outcome on theatrical grounds.",
    ],
    tied: [
      "A tie is just shared spotlight. I allow it.",
      "Co-champions? Fine. But I looked better.",
    ],
  },
  frost: {
    won: [
      "As expected. The paperwork was prepared in advance.",
      "A clean result. For once.",
    ],
    lost: [
      "That outcome will be contested in triplicate.",
      "I dislike everything about these numbers.",
    ],
    tied: [
      "A tie. Inelegant, but technically acceptable.",
      "Shared profit is still profit. Barely.",
    ],
  },
  chaos: {
    won: [
      "Yes! The gremlin was right all along.",
      "I knew that would work. No, I will not explain how.",
    ],
    lost: [
      "The table betrayed me after I trusted it completely.",
      "I blame gravity, math, and at least one rune.",
    ],
    tied: [
      "A tie counts as a weird little victory.",
      "Nobody won properly. Perfect.",
    ],
  },
};

let nextCardId = 1;

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(value) {
  const text = String(value);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function normalizeSeed(seedInput) {
  const raw = `${seedInput ?? ""}`.trim();
  const label = raw || `${Date.now() % 1000000}`;
  return {
    label,
    value: hashSeed(label),
  };
}

function createCard(rank, suit, extras = {}) {
  return {
    id: `card-${nextCardId++}`,
    rank,
    suit,
    symbol: SUIT_SYMBOLS[suit],
    wild: false,
    ...extras,
  };
}

function createDeck() {
  const deck = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(rank, suit));
    }
  }

  return deck;
}

function createUnoCard(rank, suit, extras = {}) {
  return createCard(rank, suit, {
    symbol: UNO_COLOR_SYMBOLS[suit] ?? "W",
    gameType: GAME_TYPES.uno,
    ...extras,
  });
}

function createUnoDeck() {
  const deck = [];
  for (const color of UNO_COLORS) {
    UNO_NUMBER_VALUES.forEach((value) => {
      deck.push(createUnoCard(value, color));
      if (value !== "0") {
        deck.push(createUnoCard(value, color));
      }
    });
    UNO_ACTION_VALUES.forEach((value) => {
      deck.push(createUnoCard(value, color));
      deck.push(createUnoCard(value, color));
    });
  }
  UNO_WILD_VALUES.forEach((value) => {
    for (let index = 0; index < 4; index += 1) {
      deck.push(createUnoCard(value, "Wild", { wild: true }));
    }
  });
  return deck;
}

function shuffle(deck, random) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function rankToValue(rank) {
  return RANKS.indexOf(rank) + 2;
}

function effectiveRankValue(card) {
  return rankToValue(card?.tempRank ?? card?.rank ?? "2");
}

function combinations(cards, size, start = 0, current = [], result = []) {
  if (current.length === size) {
    result.push([...current]);
    return result;
  }

  for (let i = start; i < cards.length; i += 1) {
    current.push(cards[i]);
    combinations(cards, size, i + 1, current, result);
    current.pop();
  }

  return result;
}

function sortRanksDescending(ranks) {
  return [...ranks].sort((a, b) => b - a);
}

function makeScore(category, tiebreak) {
  return {
    category,
    tiebreak,
    value: `${category}.${tiebreak.join("-")}`,
  };
}

function compareScores(a, b) {
  if (a.category !== b.category) {
    return a.category - b.category;
  }

  for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i += 1) {
    const diff = (a.tiebreak[i] ?? 0) - (b.tiebreak[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

function scoreThreeCardHand(cards) {
  const wildcardCount = cards.filter((card) => card.wild).length;

  if (wildcardCount) {
    return evaluateWildHand(cards);
  }

  const ranks = sortRanksDescending(cards.map((card) => effectiveRankValue(card)));
  const suits = cards.map((card) => card.suit);
  const uniqueRanks = [...new Set(ranks)];
  const isFlush = suits.every((suit) => suit === suits[0]);
  const isStraight = uniqueRanks.length === 3 && ranks[0] - ranks[2] === 2;

  if (isFlush && isStraight) {
    return makeScore(5, [ranks[0]]);
  }

  if (uniqueRanks.length === 1) {
    return makeScore(4, [ranks[0]]);
  }

  if (isStraight) {
    return makeScore(3, [ranks[0]]);
  }

  if (isFlush) {
    return makeScore(2, ranks);
  }

  if (uniqueRanks.length === 2) {
    const pairRank = ranks.find((rank, _, list) => list.filter((value) => value === rank).length === 2);
    const kicker = ranks.find((rank) => rank !== pairRank);
    return makeScore(1, [pairRank, kicker]);
  }

  return makeScore(0, ranks);
}

function evaluateWildHand(cards) {
  const baseCards = cards.filter((card) => !card.wild);
  let best = makeScore(-1, [0]);

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const replacement = { rank, suit, wild: false };
      const finalCards = [...baseCards, replacement];
      const score = scoreThreeCardHand(finalCards);
      if (compareScores(score, best) > 0) {
        best = score;
      }
    }
  }

  return best;
}

function describeScore(score, reverseRanking = false) {
  const label = ["High Card", "Pair", "Flush", "Straight", "Three of a Kind", "Straight Flush"][score.category] ?? "Mystery Hand";
  return reverseRanking ? `${label} (inverted)` : label;
}

function evaluateBestHand(privateCards, communityCards, options = {}) {
  const { preferWorst = false, reverseRanking = false } = options;
  const allCards = [...privateCards, ...communityCards];
  const candidateHands = combinations(allCards, 3);
  let bestHand = candidateHands[0] ?? [];
  let bestScore = scoreThreeCardHand(bestHand);

  for (const hand of candidateHands.slice(1)) {
    const score = scoreThreeCardHand(hand);
    const diff = compareScores(score, bestScore);
    if ((!preferWorst && diff > 0) || (preferWorst && diff < 0)) {
      bestScore = score;
      bestHand = hand;
    }
  }

  return {
    score: bestScore,
    cards: bestHand,
    label: describeScore(bestScore, reverseRanking),
  };
}

function chipText(amount) {
  return `${amount} chip${amount === 1 ? "" : "s"}`;
}

export class WizardPokerGame {
  constructor({ onStateChange, seed } = {}) {
    this.onStateChange = onStateChange;
    this.seedInfo = normalizeSeed(seed);
    this.rng = mulberry32(this.seedInfo.value);
    this.logEntries = [];
    this.fxSerial = 0;
    this.historySerial = 0;
    this.state = this.createInitialState();
  }

  createInitialState() {
    return {
      round: 0,
      deck: [],
      communityCards: [],
      dealerIndex: 0,
      phaseIndex: 0,
      currentBet: 0,
      raiseAmount: 2,
      pot: 0,
      fakePot: 0,
      winnerText: "",
      pendingPlayers: [],
      currentPlayerId: null,
      revealedAll: false,
      roundEnded: true,
      reverseRanking: false,
      wizardTax: null,
      spellSurcharge: null,
      turnOrderOverride: null,
      spellHistory: [],
      spellFxEvents: [],
      gameType: GAME_TYPES.poker,
      seedLabel: this.seedInfo.label,
      chaosMode: false,
      debugMode: false,
      debugRevealAll: false,
      started: false,
      starterLoadoutId: "plain-deck",
      doubleOrNothing: false,
      humanWinStreak: 0,
      bestHumanWinStreak: 0,
      runTableIndex: 0,
      runCleared: false,
      runFailed: false,
      unoDirection: 1,
      unoCurrentColor: null,
      unoDrawPenalty: 0,
      unoHasDrawnThisTurn: false,
      unoModifier: null,
      unoModifierState: {},
      humanRelics: [],
      pendingRelicDraft: null,
      pendingSpellDraft: null,
      openingSpellLoadout: [],
      tableIntro: null,
      tableIntroPending: true,
      dailyChallenge: null,
      tableEvent: null,
      lastRoundSummary: null,
      profileStyle: {
        equippedCosmetics: {},
        customizationOverrides: {},
        selectedTitle: "fresh-wizard",
      },
      players: [
        this.createPlayer("human", "You", "human"),
        this.createPlayer("bluff", "The Bluff Mage", "bluff"),
        this.createPlayer("frost", "The Frost Accountant", "frost"),
        this.createPlayer("chaos", "The Chaos Goblin Wizard", "chaos"),
      ],
    };
  }

  createPlayer(id, name, personality) {
    return {
      id,
      name,
      personality,
      stack: 18,
      mana: 0,
      hand: [],
      spells: [],
      folded: false,
      reflectShield: false,
      phaseContribution: 0,
      totalContribution: 0,
      hasCastThisTurn: false,
      lastPeek: null,
      evaluation: null,
      roundWins: 0,
      roundLosses: 0,
      roundTies: 0,
      roundResult: "pending",
      skipNextAction: false,
      blindNextTurn: false,
      blindActive: false,
      fakePotTrap: false,
      manaCrashPending: false,
      temporaryAceCardId: null,
      signatureRaiseReady: false,
      signatureSpellReady: false,
    };
  }

  resetPlayerForMatch(player) {
    player.stack = 18;
    player.mana = 0;
    player.roundWins = 0;
    player.roundLosses = 0;
    player.roundTies = 0;
    player.hand = [];
    player.spells = [];
    this.resetPlayerForRound(player);
  }

  resetPlayerForRound(player) {
    player.folded = false;
    player.reflectShield = false;
    player.phaseContribution = 0;
    player.totalContribution = 0;
    player.hasCastThisTurn = false;
    player.lastPeek = null;
    player.evaluation = null;
    player.roundResult = "pending";
    player.skipNextAction = false;
    player.blindNextTurn = false;
    player.blindActive = false;
    player.fakePotTrap = false;
    player.manaCrashPending = false;
    player.temporaryAceCardId = null;
    player.signatureRaiseReady = false;
    player.signatureSpellReady = false;
  }

  random() {
    return this.rng();
  }

  setSeed(seedInput) {
    this.seedInfo = normalizeSeed(seedInput);
    this.rng = mulberry32(this.seedInfo.value);
    this.state.seedLabel = this.seedInfo.label;
    return this.seedInfo;
  }

  setChaosMode(enabled) {
    this.state.chaosMode = Boolean(enabled);
    this.notify();
  }

  setGameType(gameType = GAME_TYPES.poker) {
    this.state.gameType = gameType === GAME_TYPES.uno ? GAME_TYPES.uno : GAME_TYPES.poker;
    this.notify();
  }

  setHumanPlayerName(name = "You") {
    const human = this.getPlayer("human");
    if (!human) {
      return;
    }
    human.name = String(name).trim().slice(0, 20) || "You";
    this.notify();
  }

  setProfileStyle(profileStyle = {}) {
    this.state.profileStyle = {
      equippedCosmetics: { ...(profileStyle.equippedCosmetics ?? {}) },
      customizationOverrides: { ...(profileStyle.customizationOverrides ?? {}) },
      selectedTitle: profileStyle.selectedTitle ?? "fresh-wizard",
    };
  }

  needsUnoColorChoice(card) {
    return Boolean(card && this.state.gameType === GAME_TYPES.uno && (card.rank === "Wild" || card.rank === "+4"));
  }

  setStarterLoadout(loadoutId = "plain-deck") {
    const exists = STARTER_LOADOUTS.some((entry) => entry.id === loadoutId);
    this.state.starterLoadoutId = exists ? loadoutId : "plain-deck";
    this.notify();
  }

  setDoubleOrNothing(enabled) {
    this.state.doubleOrNothing = Boolean(enabled);
    this.notify();
  }

  setDebugMode(enabled) {
    this.state.debugMode = Boolean(enabled);
    if (!this.state.debugMode) {
      this.state.debugRevealAll = false;
    }
    this.notify();
  }

  setDailyChallenge(dateLabel = null) {
    if (!dateLabel) {
      this.state.dailyChallenge = null;
      this.notify();
      return null;
    }

    const label = `${dateLabel}`.trim();
    const rng = mulberry32(hashSeed(`daily:${label}`));
    const pool = [...DAILY_MODIFIERS];
    const modifiers = [];

    while (pool.length && modifiers.length < 3) {
      const index = Math.floor(rng() * pool.length);
      modifiers.push(pool.splice(index, 1)[0]);
    }

    this.state.dailyChallenge = {
      dateLabel: label,
      modifiers: modifiers.map((modifier) => ({
        id: modifier.id,
        name: modifier.name,
        description: modifier.description,
      })),
    };
    this.notify();
    return this.state.dailyChallenge;
  }

  runDebugAction(action) {
    if (!this.state.debugMode) {
      return false;
    }

    const human = this.getPlayer("human");
    if (!human) {
      return false;
    }

    if (action === "mana") {
      human.mana = Math.min(12, human.mana + 6);
      this.log("Debug", "Injected 6 backup mana into your extremely fair wizard wallet.", "defense");
      this.notify();
      return true;
    }

    if (action === "spells") {
      human.spells = assignSpells(this.rng, this.getRoundSpellCount(human));
      this.log("Debug", "Redrew your spell hand because accountability is optional in debug mode.", "chaos");
      this.notify();
      return true;
    }

    if (action === "cards") {
      this.state.debugRevealAll = !this.state.debugRevealAll;
      this.log("Debug", `${this.state.debugRevealAll ? "Revealed" : "Hid"} every private card on the table for testing.`, "card manipulation");
      this.notify();
      return true;
    }

    return false;
  }

  resetMatchState() {
    this.state.round = 0;
    this.state.dealerIndex = 0;
    this.state.humanWinStreak = 0;
    this.state.bestHumanWinStreak = 0;
    this.state.runTableIndex = 0;
    this.state.runCleared = false;
    this.state.runFailed = false;
    this.state.unoDirection = 1;
    this.state.unoCurrentColor = null;
    this.state.unoDrawPenalty = 0;
    this.state.unoHasDrawnThisTurn = false;
    this.state.unoModifier = null;
    this.state.unoModifierState = {};
    this.state.humanRelics = [];
    this.state.pendingRelicDraft = null;
    this.state.pendingSpellDraft = null;
    this.state.openingSpellLoadout = [];
    this.state.tableIntro = null;
    this.state.tableIntroPending = true;
    this.state.lastRoundSummary = null;
    this.state.tableEvent = null;
    this.state.winnerText = "";
    this.state.debugRevealAll = false;

    for (const player of this.state.players) {
      this.resetPlayerForMatch(player);
    }
  }

  getStarterLoadout() {
    return STARTER_LOADOUTS.find((entry) => entry.id === this.state.starterLoadoutId) ?? STARTER_LOADOUTS[0];
  }

  applyStarterLoadout() {
    const loadout = this.getStarterLoadout();
    if (!loadout?.relicId) {
      return;
    }
    const relic = RELIC_LIBRARY.find((entry) => entry.id === loadout.relicId);
    if (relic && !this.hasHumanRelic(relic.id)) {
      this.state.humanRelics.push({ ...relic });
      this.log("Starter Loadout", `You sit down with ${loadout.name}: ${loadout.description}`, loadout.category);
    }
  }

  cloneCardForState(card) {
    return { ...card };
  }

  createRandomCard() {
    const rank = RANKS[Math.floor(this.random() * RANKS.length)];
    const suit = SUITS[Math.floor(this.random() * SUITS.length)];
    return createCard(rank, suit);
  }

  duplicateCard(card, overrides = {}) {
    return createCard(card.rank, card.suit, {
      wild: card.wild,
      tempRank: card.tempRank,
      copiedFromCommunity: card.copiedFromCommunity ?? false,
      ...overrides,
    });
  }

  drawFromDeck() {
    return this.state.deck.pop() ?? this.createRandomCard();
  }

  returnCardToDeckTop(card) {
    if (!card) {
      return;
    }
    this.state.deck.push(card);
  }

  cardLabel(card) {
    return cardLabel(card);
  }

  getSpell(spellId) {
    return getSpellById(spellId);
  }

  getRelic(relicId) {
    return RELIC_LIBRARY.find((relic) => relic.id === relicId) ?? null;
  }

  getCurrentTable() {
    return TABLE_LADDER[this.state.runTableIndex] ?? TABLE_LADDER[TABLE_LADDER.length - 1];
  }

  hasDailyModifier(modifierId) {
    return this.state.dailyChallenge?.modifiers?.some((modifier) => modifier.id === modifierId) ?? false;
  }

  hasHumanRelic(relicId) {
    return this.state.humanRelics.some((relic) => relic.id === relicId);
  }

  getRoundSpellCount(player) {
    let count = 5;
    if (this.hasDailyModifier("packed-spellbook")) {
      count += 1;
    }
    if (player.id === "human" && this.hasHumanRelic("stacked-deck")) {
      count += 1;
    }
    return count;
  }

  getRoundStartingMana(player) {
    let mana = 6;
    mana += this.getCurrentTable().startingManaDelta ?? 0;
    if (this.hasDailyModifier("bonus-orb")) {
      mana += 1;
    }
    if (player.id === "human" && this.hasHumanRelic("loaded-wand")) {
      mana += 1;
    }
    return mana;
  }

  getRoundChipBonus(player) {
    let bonus = 0;
    if (this.hasDailyModifier("rich-seats")) {
      bonus += 2;
    }
    if (player.id === "human" && this.hasHumanRelic("bouncer-ledger")) {
      bonus += 2;
    }
    return bonus;
  }

  getAnteAmount() {
    let ante = this.hasDailyModifier("crooked-ante") ? 2 : 1;
    if (this.state.doubleOrNothing) {
      ante += 1;
    }
    return ante;
  }

  buildRelicDraft(count = 3) {
    const ownedIds = new Set(this.state.humanRelics.map((relic) => relic.id));
    const pool = RELIC_LIBRARY.filter((relic) => !ownedIds.has(relic.id));
    const choices = [];

    while (pool.length && choices.length < count) {
      const index = Math.floor(this.random() * pool.length);
      choices.push(pool.splice(index, 1)[0]);
    }

    return choices;
  }

  buildOpeningSpellDraft(count = 4) {
    const pool = [...SPELL_LIBRARY];
    const choices = [];

    while (pool.length && choices.length < count) {
      const index = Math.floor(this.random() * pool.length);
      const spell = pool.splice(index, 1)[0];
      choices.push({
        id: spell.id,
        name: spell.name,
        cost: spell.cost,
        category: spell.category,
        description: spell.description,
        backfireNote: spell.backfireNote ?? null,
        comboTag: spell.comboTag ?? null,
      });
    }

    return choices;
  }

  buildOpeningSpellHand(count = 5) {
    const selectedIds = this.state.openingSpellLoadout.slice(0, 2);
    const pool = SPELL_LIBRARY
      .filter((spell) => !selectedIds.includes(spell.id))
      .map((spell) => spell.id);
    const hand = selectedIds.map((id) => ({ id, used: false }));

    while (hand.length < count && pool.length) {
      const index = Math.floor(this.random() * pool.length);
      const id = pool.splice(index, 1)[0];
      hand.push({ id, used: false });
    }

    return hand;
  }

  getPlayer(playerId) {
    return this.state.players.find((player) => player.id === playerId);
  }

  getCurrentPlayer() {
    return this.getPlayer(this.state.currentPlayerId);
  }

  getLivePlayers() {
    return this.state.players.filter((player) => !player.folded && player.stack >= 0);
  }

  getLiveOpponents(playerId) {
    return this.state.players.filter(
      (player) => player.id !== playerId && !player.folded,
    );
  }

  getRandomOpponent(playerId) {
    const opponents = this.getLiveOpponents(playerId);
    if (!opponents.length) {
      return null;
    }
    return opponents[Math.floor(this.random() * opponents.length)];
  }

  getRichestPlayer(excludePlayerId = null) {
    const candidates = this.getLivePlayers().filter((player) => player.id !== excludePlayerId);
    if (!candidates.length) {
      return null;
    }
    return [...candidates].sort((a, b) => b.stack - a.stack)[0];
  }

  getWorstCardIndex(player) {
    let worstIndex = 0;
    let worstValue = Number.POSITIVE_INFINITY;

    player.hand.forEach((card, index) => {
      const value = effectiveRankValue(card);
      if (value < worstValue) {
        worstValue = value;
        worstIndex = index;
      }
    });

    return worstIndex;
  }

  getBestCardIndex(player) {
    let bestIndex = 0;
    let bestValue = Number.NEGATIVE_INFINITY;

    player.hand.forEach((card, index) => {
      const value = effectiveRankValue(card);
      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
    });

    return bestIndex;
  }

  getRandomCommunityIndex() {
    if (!this.state.communityCards.length) {
      return -1;
    }
    return Math.floor(this.random() * this.state.communityCards.length);
  }

  cloneTaxEffect() {
    return this.state.wizardTax ? { ...this.state.wizardTax } : null;
  }

  cloneTurnOrderOverride() {
    return this.state.turnOrderOverride ? [...this.state.turnOrderOverride] : null;
  }

  cloneSpellSurcharge() {
    return this.state.spellSurcharge
      ? {
          casterId: this.state.spellSurcharge.casterId,
          affectedIds: [...this.state.spellSurcharge.affectedIds],
        }
      : null;
  }

  resolveSpellTarget(caster, target, spell) {
    if (!target) {
      return { target: null, reflected: false };
    }

    if (target.reflectShield && target.id !== caster.id) {
      target.reflectShield = false;
      this.triggerFrostReflectMoment(target);
      this.log("Return to Sender", `${target.name} reflects ${spell.name} back at ${caster.name}.`, "defense");
      this.emitSpellFx({
        category: "defense",
        text: "RETURNED",
        playerId: target.id,
      });
      return {
        target: caster,
        reflected: true,
      };
    }

    return {
      target,
      reflected: false,
    };
  }

  randomizeTurnOrder() {
    const orderIds = this.turnOrder().map((player) => player.id);
    this.state.turnOrderOverride = shuffle([...orderIds], this.rng);
  }

  turnOrder() {
    const { players, dealerIndex, turnOrderOverride } = this.state;

    if (turnOrderOverride?.length) {
      return turnOrderOverride
        .map((playerId) => this.getPlayer(playerId))
        .filter(Boolean);
    }

    const order = [];
    for (let i = 1; i <= players.length; i += 1) {
      order.push(players[(dealerIndex + i) % players.length]);
    }
    return order;
  }

  getSpellCostForPlayer(playerId, spell) {
    if (!spell) {
      return 0;
    }

    const player = this.getPlayer(playerId);
    let cost = spell.cost;
    const surcharge = this.state.spellSurcharge;
    if (surcharge && surcharge.casterId !== playerId && surcharge.affectedIds.includes(playerId)) {
      cost *= 2;
    }

    if (player && !player.hasCastThisTurn) {
      if (this.hasDailyModifier("cheap-magic")) {
        cost -= 1;
      }
      if (playerId === "human" && this.hasHumanRelic("crooked-thumb")) {
        cost -= 1;
      }
    }

    return Math.max(0, cost);
  }

  startGame(options = {}) {
    const { resetMatch = false } = options;
    this.state.started = true;
    if (resetMatch) {
      this.resetMatchState();
      this.applyStarterLoadout();
      if (this.state.gameType === GAME_TYPES.uno) {
        this.startRound();
        return;
      }
      this.state.pendingSpellDraft = {
        keep: 2,
        choices: this.buildOpeningSpellDraft(4),
      };
      this.notify();
      return;
    }
    this.startRound();
  }

  startRound() {
    if (this.state.gameType === GAME_TYPES.uno) {
      this.startUnoRound();
      return;
    }

    const state = this.state;
    const currentTable = this.getCurrentTable();
    state.pendingRelicDraft = null;
    state.pendingSpellDraft = null;
    this.logEntries = [];
    state.round += 1;
    state.phaseIndex = 0;
    state.currentBet = 0;
    state.pot = 0;
    state.fakePot = 0;
    state.communityCards = [];
    state.pendingPlayers = [];
    state.roundEnded = false;
    state.runFailed = false;
    state.revealedAll = false;
    state.winnerText = "";
    state.reverseRanking = false;
    state.wizardTax = null;
    state.spellSurcharge = null;
    state.turnOrderOverride = null;
    state.spellHistory = [];
    state.spellFxEvents = [];
    state.lastRoundSummary = null;
    state.tableIntro = state.tableIntroPending
      ? {
          title: currentTable.name,
          subtitle: currentTable.introLine ?? currentTable.description,
        }
      : null;
    state.tableIntroPending = false;
    state.raiseAmount = 2 + (currentTable.raiseDelta ?? 0);
    if (state.doubleOrNothing) {
      state.raiseAmount += 1;
    }
    state.tableEvent = null;
    state.dealerIndex = (state.round - 1) % state.players.length;
    state.deck = shuffle(createDeck(), this.rng);

    for (const player of state.players) {
      if (player.stack < 3) {
        player.stack += 6;
        this.log("House Loan", `${player.name} receives 6 pity chips from the tavern owner.`, "economy");
      }
      player.hand = [];
      player.mana = this.getRoundStartingMana(player);
      player.spells = player.id === "human" && state.round === 1 && state.openingSpellLoadout.length
        ? this.buildOpeningSpellHand(this.getRoundSpellCount(player))
        : assignSpells(this.rng, this.getRoundSpellCount(player));
      this.resetPlayerForRound(player);
      player.stack += this.getRoundChipBonus(player);
    }
    state.openingSpellLoadout = [];

    this.applyRivalSignatures();

    for (let i = 0; i < 3; i += 1) {
      for (const player of state.players) {
        player.hand.push(this.drawFromDeck());
      }
    }

    this.applyRunOpeners();

    for (const player of state.players) {
      this.commitChips(player, this.getAnteAmount(), "ante");
    }

    if (currentTable.openingPot) {
      state.pot += currentTable.openingPot;
      this.log("Table Bonus", `${currentTable.name} adds ${currentTable.openingPot} chips to the pot before anyone can object.`, currentTable.category);
    }

    if (state.doubleOrNothing) {
      state.pot += 3;
      this.log("Double or Nothing", "The table throws 3 extra chips in and quietly agrees that losing should feel much worse.", "chaos");
    }

    this.applyTableEvent();
    this.log("Round Start", `The dealer conjures a fresh deck at ${currentTable.name}. Everyone antes ${this.getAnteAmount()} chip${this.getAnteAmount() === 1 ? "" : "s"} and starts with fresh mana plus whatever bad incentives the run added.`, "chaos");
    this.emitAmbientBanter("round");
    this.beginPhase();
  }

  getUnoStartingHandSize(player) {
    let size = 5;
    if (player.id === "human" && this.hasHumanRelic("loaded-wand")) {
      size -= 1;
    }
    return Math.max(4, size);
  }

  startUnoRound() {
    const state = this.state;
    const currentTable = this.getCurrentTable();
    state.pendingRelicDraft = null;
    state.pendingSpellDraft = null;
    this.logEntries = [];
    state.round += 1;
    state.phaseIndex = 0;
    state.currentBet = 0;
    state.pot = 0;
    state.fakePot = 0;
    state.communityCards = [];
    state.pendingPlayers = [];
    state.roundEnded = false;
    state.runFailed = false;
    state.revealedAll = false;
    state.winnerText = "";
    state.reverseRanking = false;
    state.wizardTax = null;
    state.spellSurcharge = null;
    state.turnOrderOverride = null;
    state.spellHistory = [];
    state.spellFxEvents = [];
    state.lastRoundSummary = null;
    state.tableIntro = state.tableIntroPending
      ? {
          title: `${currentTable.name} / Wizard Uno`,
          subtitle: "Match color or value. Empty your hand before the room does something worse.",
        }
      : null;
    state.tableIntroPending = false;
    state.tableEvent = null;
    state.dealerIndex = (state.round - 1) % state.players.length;
    state.unoDirection = 1;
    state.unoDrawPenalty = 0;
    state.unoHasDrawnThisTurn = false;
    state.unoModifier = null;
    state.unoModifierState = {};
    state.deck = shuffle(createUnoDeck(), this.rng);

    for (const player of state.players) {
      player.hand = [];
      player.spells = [];
      player.mana = 0;
      this.resetPlayerForRound(player);
      for (let draw = 0; draw < this.getUnoStartingHandSize(player); draw += 1) {
        player.hand.push(this.drawUnoCard());
      }
    }

    this.applyUnoOpeners();
    state.unoModifier = this.rollUnoModifier();
    state.unoModifierState = this.createUnoModifierState(state.unoModifier);
    if (state.tableIntro && state.unoModifier) {
      state.tableIntro.subtitle = `${state.unoModifier.name}: ${state.unoModifier.description}`;
    }
    const topCard = this.drawUnoCard();
    state.communityCards = [topCard];
    state.unoCurrentColor = topCard.suit === "Wild" ? UNO_COLORS[Math.floor(this.random() * UNO_COLORS.length)] : topCard.suit;
    state.currentPlayerId = this.getNextUnoPlayerId(state.players[state.dealerIndex].id, 1);
    this.log("Round Start", `Wizard Uno begins at ${currentTable.name}. Match ${state.unoCurrentColor} or ${topCard.rank}.`, "chaos");
    if (state.unoModifier) {
      this.log(state.unoModifier.name, state.unoModifier.description, state.unoModifier.category);
    }
    this.emitAmbientBanter("round");
    this.notify();
  }

  applyUnoOpeners() {
    const human = this.getPlayer("human");
    if (!human) {
      return;
    }

    if (this.hasHumanRelic("sneak-mirror")) {
      const target = this.getRandomOpponent("human");
      if (target?.hand?.length) {
        const card = target.hand[Math.floor(this.random() * target.hand.length)];
        human.lastPeek = {
          ...this.cloneCardForState(card),
          fake: false,
          ownerName: target.name,
        };
        this.log("Sneak Mirror", `Your mirror catches ${target.name} holding ${cardLabel(card)}. Extremely useful. Probably illegal.`, "card manipulation");
      }
    }
  }

  rollUnoModifier() {
    const currentTable = this.getCurrentTable();
    const pool = UNO_MODIFIERS.filter((modifier) => modifier.tableIds.includes(currentTable.id));
    const source = pool.length ? pool : UNO_MODIFIERS;
    const pick = source[Math.floor(this.random() * source.length)] ?? null;
    return pick ? { ...pick } : null;
  }

  createUnoModifierState(modifier) {
    if (!modifier) {
      return {};
    }

    switch (modifier.id) {
      case "gremlin-draw":
        return { triggers: 0, maxTriggers: 4, exhausted: false };
      case "echo-skip":
        return { used: false };
      case "mirror-match":
        return { triggers: 0, maxTriggers: 4, exhausted: false };
      case "hot-discard":
        return { triggeredBy: [] };
      default:
        return {};
    }
  }

  getRichestUnoOpponent(excludingPlayerId) {
    return this.state.players
      .filter((player) => player.id !== excludingPlayerId)
      .sort((left, right) => right.hand.length - left.hand.length || left.name.localeCompare(right.name))[0] ?? null;
  }

  applyUnoDrawModifier(player, card) {
    const modifier = this.state.unoModifier;
    if (!modifier || modifier.id !== "gremlin-draw" || !["Skip", "Reverse", "+2", "Wild", "+4"].includes(card.rank)) {
      return;
    }

    const modifierState = this.state.unoModifierState ?? {};
    if ((modifierState.triggers ?? 0) >= (modifierState.maxTriggers ?? 4)) {
      if (!modifierState.exhausted) {
        modifierState.exhausted = true;
        this.log("Gremlin Draw", "The gremlin finally gets tired. Drawn action cards stop chaining extra draws this hand.", modifier.category);
      }
      return;
    }

    const target = this.getPlayer(this.getNextUnoPlayerId(player.id, 1));
    if (!target) {
      return;
    }

    modifierState.triggers = (modifierState.triggers ?? 0) + 1;
    target.hand.push(this.drawUnoCard());
    this.log("Gremlin Draw", `${player.name} drew ${card.rank}, so ${target.name} gets dragged into it and draws 1 too.`, modifier.category);
    this.emitSpellFx({
      category: modifier.category,
      text: modifier.name,
      playerId: target.id,
      casterId: player.id,
      power: 2,
      impact: true,
    });
  }

  applyUnoPlayModifier({ player, card, previousColor, previousTopCard, advanceSteps }) {
    const modifier = this.state.unoModifier;
    if (!modifier) {
      return advanceSteps;
    }

    if (modifier.id === "echo-skip" && card.rank === "Skip" && !this.state.unoModifierState.used) {
      this.state.unoModifierState.used = true;
      this.log("Echo Skip", `${player.name}'s Skip ricochets and skips an extra wizard. Terrible acoustics.`, modifier.category);
      this.emitSpellFx({
        category: modifier.category,
        text: modifier.name,
        playerId: player.id,
        casterId: player.id,
        power: 2,
        impact: true,
      });
      return advanceSteps + 1;
    }

    if (modifier.id === "reverse-bloom" && card.rank === "Reverse") {
      this.state.unoCurrentColor = this.chooseUnoColor(player);
      this.log("Reverse Bloom", `${player.name} reverses the table and repaints the live color to ${this.state.unoCurrentColor}.`, modifier.category);
      this.emitSpellFx({
        category: modifier.category,
        text: modifier.name,
        playerId: player.id,
        casterId: player.id,
        power: 2,
        impact: false,
      });
      return advanceSteps;
    }

    if (modifier.id === "mirror-match" && previousTopCard && card.rank === previousTopCard.rank && card.suit !== "Wild" && card.suit !== previousColor) {
      const modifierState = this.state.unoModifierState ?? {};
      if ((modifierState.triggers ?? 0) >= (modifierState.maxTriggers ?? 4)) {
        if (!modifierState.exhausted) {
          modifierState.exhausted = true;
          this.log("Mirror Match", "The mirror finally cracks. Value matches stop punishing the next seat this hand.", modifier.category);
        }
        return advanceSteps;
      }

      const target = this.getPlayer(this.getNextUnoPlayerId(player.id, 1));
      if (target) {
        modifierState.triggers = (modifierState.triggers ?? 0) + 1;
        target.hand.push(this.drawUnoCard());
        this.log("Mirror Match", `${player.name} matched by value, so ${target.name} draws 1 for admiring the symmetry.`, modifier.category);
        this.emitSpellFx({
          category: modifier.category,
          text: modifier.name,
          playerId: target.id,
          casterId: player.id,
          power: 2,
          impact: true,
        });
      }
      return advanceSteps;
    }

    if (modifier.id === "hot-discard" && player.hand.length === 2 && !(this.state.unoModifierState.triggeredBy ?? []).includes(player.id)) {
      this.state.unoModifierState.triggeredBy = [...(this.state.unoModifierState.triggeredBy ?? []), player.id];
      const target = this.getRichestUnoOpponent(player.id);
      if (target) {
        target.hand.push(this.drawUnoCard());
        this.log("Hot Discard", `${player.name} hits 2 cards, so ${target.name} gets handed 1 extra problem.`, modifier.category);
        this.emitSpellFx({
          category: modifier.category,
          text: modifier.name,
          playerId: target.id,
          casterId: player.id,
          power: 2,
          impact: true,
        });
      }
      return advanceSteps;
    }

    if (modifier.id === "witch-tax" && ["Wild", "+4"].includes(card.rank) && player.hand.length <= 2) {
      const taxCard = this.drawUnoCard();
      player.hand.push(taxCard);
      this.log("Witch Tax", `${player.name} played ${card.rank} while almost out, so the table taxes them back 1 card.`, modifier.category);
      this.emitSpellFx({
        category: modifier.category,
        text: modifier.name,
        playerId: player.id,
        casterId: player.id,
        power: 2,
        impact: false,
      });
      return advanceSteps;
    }

    return advanceSteps;
  }

  drawUnoCard() {
    if (!this.state.deck.length) {
      const topCard = this.state.communityCards[0];
      const recycle = this.state.communityCards.slice(1);
      this.state.deck = shuffle(recycle, this.rng);
      this.state.communityCards = topCard ? [topCard] : [];
    }
    return this.state.deck.pop() ?? createUnoCard(`${Math.floor(this.random() * 10)}`, UNO_COLORS[Math.floor(this.random() * UNO_COLORS.length)]);
  }

  getUnoTopCard() {
    return this.state.communityCards[0] ?? null;
  }

  canPlayUnoCard(card) {
    if (!card) {
      return false;
    }
    const topCard = this.getUnoTopCard();
    if (!topCard) {
      return true;
    }
    if (card.suit === "Wild" || card.wild) {
      return true;
    }
    return card.suit === this.state.unoCurrentColor || card.rank === topCard.rank;
  }

  chooseUnoColor(player) {
    const counts = new Map(UNO_COLORS.map((color) => [color, 0]));
    (player.hand ?? []).forEach((card) => {
      if (counts.has(card.suit)) {
        counts.set(card.suit, counts.get(card.suit) + 1);
      }
    });
    return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? UNO_COLORS[0];
  }

  getUnoPlayerOrder() {
    const players = this.state.players.map((player) => player.id);
    if (this.state.unoDirection >= 0) {
      return players;
    }
    return [...players].reverse();
  }

  getNextUnoPlayerId(fromPlayerId, steps = 1) {
    const order = this.getUnoPlayerOrder();
    const startIndex = order.indexOf(fromPlayerId);
    if (startIndex === -1) {
      return order[0] ?? null;
    }
    return order[(startIndex + steps) % order.length];
  }

  humanPlayUnoCard(handIndex, chosenColor = null) {
    const current = this.getCurrentPlayer();
    if (!current || current.id !== "human") {
      return false;
    }
    return this.performUnoAction(current.id, "play", { handIndex, chosenColor });
  }

  performUnoAction(playerId, type, payload = {}) {
    const player = this.getPlayer(playerId);
    if (!player || this.state.roundEnded || this.state.currentPlayerId !== playerId) {
      return false;
    }

    if (type === "draw") {
      if (this.state.unoHasDrawnThisTurn) {
        return false;
      }
      const card = this.drawUnoCard();
      player.hand.push(card);
      this.state.unoHasDrawnThisTurn = true;
      this.applyUnoDrawModifier(player, card);
      this.log(
        "Draw",
        this.canPlayUnoCard(card)
          ? `${player.name} draws ${cardLabel(card)}. It actually plays, which feels suspicious.`
          : `${player.name} draws ${cardLabel(card)} and still doesn't have a clean match.`,
        "economy",
      );
      this.emitSpellFx({
        category: "economy",
        text: "Draw",
        playerId,
        power: 1,
        impact: false,
      });
      this.notify();
      return true;
    }

    if (type === "pass") {
      if (!this.state.unoHasDrawnThisTurn) {
        return false;
      }
      this.log("Pass", `${player.name} passes and claims that was tactical.`, "defense");
      this.advanceUnoTurn(player.id, 1);
      return true;
    }

    if (type !== "play") {
      return false;
    }

    const handIndex = payload.handIndex;
    const card = player.hand[handIndex];
    const previousTopCard = this.getUnoTopCard();
    const previousColor = this.state.unoCurrentColor;
    if (!card || !this.canPlayUnoCard(card)) {
      return false;
    }
    if (this.needsUnoColorChoice(card) && !UNO_COLORS.includes(payload.chosenColor)) {
      return false;
    }

    player.hand.splice(handIndex, 1);
    this.state.communityCards = [card];
    this.state.unoCurrentColor = card.suit === "Wild"
      ? (payload.chosenColor ?? this.chooseUnoColor(player))
      : card.suit;
    this.state.unoHasDrawnThisTurn = false;
    let advanceSteps = 1;

    if (card.rank === "Skip") {
      advanceSteps = 2;
      this.log("Skip", `${player.name} skips the next wizard and calls that table management.`, "disruption");
    } else if (card.rank === "Reverse") {
      this.state.unoDirection *= -1;
      this.log("Reverse", `${player.name} flips the turn order and the room boos on instinct.`, "chaos");
    } else if (card.rank === "+2") {
      const targetId = this.getNextUnoPlayerId(player.id, 1);
      const target = this.getPlayer(targetId);
      for (let draw = 0; draw < 2; draw += 1) {
        target?.hand.push(this.drawUnoCard());
      }
      advanceSteps = 2;
      this.log("Draw Two", `${target?.name ?? "Someone"} takes 2 cards and misses the turn. Brutal.`, "disruption");
    } else if (card.rank === "+4") {
      const targetId = this.getNextUnoPlayerId(player.id, 1);
      const target = this.getPlayer(targetId);
      for (let draw = 0; draw < 4; draw += 1) {
        target?.hand.push(this.drawUnoCard());
      }
      advanceSteps = 2;
      this.log("Wild Draw Four", `${target?.name ?? "Someone"} gets tagged for 4 cards. The color is now ${this.state.unoCurrentColor}.`, "chaos");
    } else if (card.rank === "Wild") {
      this.log("Wild", `${player.name} changes the color to ${this.state.unoCurrentColor} and acts like that was obvious.`, "chaos");
    } else {
      this.log("Play", `${player.name} plays ${cardLabel(card)}. Match it or suffer decoratively.`, "economy");
    }

    advanceSteps = this.applyUnoPlayModifier({
      player,
      card,
      previousColor,
      previousTopCard,
      advanceSteps,
    });

    this.emitSpellFx({
      category: card.rank === "Wild" || card.rank === "+4" ? "chaos" : card.rank === "Skip" || card.rank === "+2" ? "disruption" : "economy",
      text: card.rank,
      playerId,
      power: 2,
      impact: card.rank !== "0",
    });

    if (!player.hand.length) {
      this.finalizeUnoRound(player);
      return true;
    }

    this.advanceUnoTurn(player.id, advanceSteps);
    return true;
  }

  advanceUnoTurn(previousPlayerId, steps = 1) {
    this.state.unoHasDrawnThisTurn = false;
    this.state.currentPlayerId = this.getNextUnoPlayerId(previousPlayerId, steps);
    this.notify();
  }

  finalizeUnoRound(winner) {
    const finishedTable = this.getCurrentTable();
    const remainingHands = this.state.players
      .filter((player) => player.id !== winner.id)
      .map((player) => `${player.name} ${player.hand.length}`)
      .join(", ");
    this.state.roundEnded = true;
    this.state.revealedAll = true;
    this.state.currentPlayerId = null;
    this.state.winnerText = remainingHands
      ? `${winner.name} empties the hand and wins Wizard Uno. Left holding: ${remainingHands}.`
      : `${winner.name} empties the hand and wins Wizard Uno.`;

    for (const player of this.state.players) {
      const isWinner = player.id === winner.id;
      if (isWinner) {
        player.roundWins += 1;
        player.roundResult = "won";
      } else {
        player.roundLosses += 1;
        player.roundResult = "lost";
      }
    }

    const humanWonSolo = winner.id === "human";
    if (humanWonSolo) {
      this.state.humanWinStreak += 1;
      this.state.bestHumanWinStreak = Math.max(this.state.bestHumanWinStreak, this.state.humanWinStreak);
    } else {
      this.state.humanWinStreak = 0;
    }

    let tableAdvance = null;
    if (this.state.doubleOrNothing && !humanWonSolo) {
      this.state.runFailed = true;
      const bustedTable = finishedTable;
      tableAdvance = { from: bustedTable.name, to: "Run busted", clearedRun: false, bustedRun: true };
      this.log("Double or Nothing", `The Uno run dies immediately at ${bustedTable.name}. The room respects the commitment, not the result.`, "disruption");
    } else if (humanWonSolo && this.state.runTableIndex < TABLE_LADDER.length - 1) {
      const from = finishedTable;
      this.state.runTableIndex += 1;
      const to = this.getCurrentTable();
      tableAdvance = { from: from.name, to: to.name, clearedRun: false };
      this.state.tableIntroPending = true;
      this.log("New Table", `${from.name} is cleared. Uno moves to ${to.name}.`, to.category);
    } else if (humanWonSolo && this.state.runTableIndex === TABLE_LADDER.length - 1) {
      this.state.runCleared = true;
      const clearedTable = finishedTable;
      tableAdvance = { from: clearedTable.name, to: "Run cleared", clearedRun: true };
      this.log("Run Clear", `You cleared the full Wizard Uno tavern ladder. Nobody can prove this was a good idea.`, "economy");
    }

    this.state.lastRoundSummary = {
      round: this.state.round,
      title: this.state.unoModifier ? `Wizard Uno / ${this.state.unoModifier.name}` : "Wizard Uno",
      message: this.state.winnerText,
      winners: [{ id: winner.id, name: winner.name, hand: "UNO" }],
      tableEvent: null,
      humanResult: this.getPlayer("human")?.roundResult ?? "lost",
      streak: this.state.humanWinStreak,
      bestStreak: this.state.bestHumanWinStreak,
      pot: 0,
      fakePot: 0,
      chaosMode: this.state.chaosMode,
      doubleOrNothing: this.state.doubleOrNothing,
      runFailed: this.state.runFailed,
      rewardReady: false,
      tableName: finishedTable.name,
      starterLoadout: { ...this.getStarterLoadout() },
      tableAdvance,
      gameType: GAME_TYPES.uno,
      unoModifier: this.state.unoModifier ? { ...this.state.unoModifier } : null,
      deckRemaining: this.state.deck.length,
    };

    this.emitSpellFx({
      category: winner.id === "human" ? "economy" : PERSONALITY_MOODS[winner.personality] ?? "economy",
      text: winner.id === "human" ? "UNO" : `${winner.name} wins`,
      playerId: winner.id,
      power: 3,
      impact: true,
    });
    this.notify();
  }

  applyRivalSignatures() {
    for (const player of this.state.players) {
      if (player.personality === "bluff") {
        player.signatureRaiseReady = true;
        player.signatureSpellReady = true;
      }

      if (player.personality === "frost") {
        player.reflectShield = true;
        player.signatureSpellReady = true;
        this.log("Audit Shield", `${player.name} starts the round behind a suspiciously official shield.`, "defense");
        this.emitSpellFx({
          category: "defense",
          text: "Audit Shield",
          playerId: player.id,
          power: 2,
          impact: false,
        });
      }

      if (player.personality === "chaos") {
        player.signatureSpellReady = true;
        if (this.random() < 0.5) {
          player.mana += 1;
          this.log("Pocket Gremlin", `${player.name} finds 1 extra mana in a pocket that definitely wasn't there earlier.`, "chaos");
          this.emitSpellFx({
            category: "chaos",
            text: "Bonus mana",
            playerId: player.id,
            power: 2,
            impact: false,
          });
        } else {
          const bonusSpell = assignSpells(this.rng, 1)[0];
          if (bonusSpell) {
            player.spells.push(bonusSpell);
            this.log("Pocket Gremlin", `${player.name} produces an extra spell from somewhere that should concern everyone.`, "chaos");
            this.emitSpellFx({
              category: "chaos",
              text: "Bonus spell",
              playerId: player.id,
              power: 2,
              impact: false,
            });
          }
        }
      }
    }
  }

  triggerSignatureSpellMoment(player, spell) {
    if (!player.signatureSpellReady) {
      return;
    }

    if (player.personality === "bluff" && spell.category === "deception") {
      player.signatureSpellReady = false;
      player.mana += 1;
      this.log("Curtain Scam", `${player.name} turns the deception into an encore and quietly pockets 1 mana back.`, "deception");
      this.emitSpellFx({
        category: "deception",
        text: "Encore",
        playerId: player.id,
        power: 2,
        impact: false,
      });
      return;
    }

    if (player.personality === "chaos" && (spell.category === "chaos" || spell.category === "disruption")) {
      player.signatureSpellReady = false;
      if (this.random() < 0.5) {
        player.mana += 1;
        this.log("Gremlin Follow-Up", `${player.name}'s spell attracts extra goblin funding. Gain 1 mana and absolutely waste it.`, "chaos");
        this.emitSpellFx({
          category: "chaos",
          text: "+1 MANA",
          playerId: player.id,
          power: 2,
          impact: false,
        });
      } else {
        player.stack += 2;
        this.log("Gremlin Tip Jar", `${player.name} shakes 2 bonus chips out of a robe pocket that should not have existed.`, "chaos");
        this.emitSpellFx({
          category: "chaos",
          text: "+2 CHIPS",
          playerId: player.id,
          power: 2,
          impact: false,
        });
      }
    }
  }

  triggerFrostReflectMoment(player) {
    if (player.personality !== "frost" || !player.signatureSpellReady) {
      return;
    }

    player.signatureSpellReady = false;
    player.mana += 1;
    this.log("Audit Rebate", `${player.name} files the reflected spell under 'prevented losses' and gets 1 mana back.`, "defense");
    this.emitSpellFx({
      category: "defense",
      text: "REBATE",
      playerId: player.id,
      power: 2,
      impact: false,
    });
  }

  getSignatureState(player) {
    if (!player.personality) {
      return null;
    }

    if (player.personality === "bluff") {
      if (player.signatureRaiseReady && player.signatureSpellReady) {
        return "Raise + Encore";
      }
      if (player.signatureRaiseReady) {
        return "Raise primed";
      }
      if (player.signatureSpellReady) {
        return "Encore primed";
      }
      return "Spent";
    }

    if (player.personality === "frost") {
      if (player.reflectShield && player.signatureSpellReady) {
        return "Ward + Rebate";
      }
      if (player.reflectShield) {
        return "Ward up";
      }
      if (player.signatureSpellReady) {
        return "Rebate primed";
      }
      return "Spent";
    }

    if (player.personality === "chaos") {
      return player.signatureSpellReady ? "Gremlin primed" : "Spent";
    }

    return null;
  }

  applyTableEvent() {
    const chance = this.state.chaosMode ? 0.9 : 0.55;
    if (this.random() > chance) {
      return;
    }

    const event = TABLE_EVENTS[Math.floor(this.random() * TABLE_EVENTS.length)];
    this.state.tableEvent = {
      id: event.id,
      name: event.name,
      description: event.description,
      category: event.category,
    };
    event.apply(this);
    this.log("Table Event", `${event.name}: ${event.description}`, event.category);
  }

  applyRunOpeners() {
    const human = this.getPlayer("human");
    if (!human) {
      return;
    }

    if (this.hasHumanRelic("sneak-mirror")) {
      const target = this.getRandomOpponent("human");
      if (target?.hand?.length) {
        const card = target.hand[Math.floor(this.random() * target.hand.length)];
        human.lastPeek = {
          ...this.cloneCardForState(card),
          fake: false,
          ownerName: target.name,
        };
        this.log("Sneak Mirror", `Your relic quietly reveals ${cardLabel(card)} from ${target.name} before the round even starts.`, "card manipulation");
      }
    }
  }

  chooseRelic(relicId) {
    const draft = this.state.pendingRelicDraft;
    const relic = draft?.choices?.find((entry) => entry.id === relicId);
    if (!relic || this.hasHumanRelic(relicId)) {
      return false;
    }

    this.state.humanRelics.push({ ...relic });
    this.state.pendingRelicDraft = null;
    this.log("Relic Claimed", `You pocket ${relic.name}: ${relic.description}`, relic.category);
    this.emitSpellFx({
      category: relic.category,
      text: relic.name,
      playerId: "human",
      power: 3,
      impact: true,
    });
    this.notify();
    return true;
  }

  confirmOpeningSpellDraft(spellIds = []) {
    const draft = this.state.pendingSpellDraft;
    if (!draft?.choices?.length) {
      return false;
    }

    const uniqueIds = [...new Set(spellIds)].filter(Boolean);
    if (uniqueIds.length !== draft.keep) {
      return false;
    }

    const choiceIds = new Set(draft.choices.map((choice) => choice.id));
    if (!uniqueIds.every((id) => choiceIds.has(id))) {
      return false;
    }

    this.state.openingSpellLoadout = uniqueIds;
    this.state.pendingSpellDraft = null;
    this.log(
      "Spell Draft",
      `You lock in ${uniqueIds.map((id) => getSpellById(id)?.name ?? id).join(" and ")} for the opening hand.`,
      "deception",
    );
    this.startRound();
    return true;
  }

  emitAmbientBanter(reason) {
    const chance = this.state.chaosMode ? 0.78 : 0.42;
    if (this.random() > chance) {
      return;
    }

    const activePlayers = this.state.players.filter((player) => !player.folded && player.id !== "human");
    if (!activePlayers.length) {
      return;
    }

    const speaker = activePlayers[Math.floor(this.random() * activePlayers.length)];
    const lines = TABLE_BANTER[speaker.personality]?.[reason] ?? [];
    if (!lines.length) {
      return;
    }

    const line = lines[Math.floor(this.random() * lines.length)];
    this.log("Wizard Banter", `${speaker.name}: ${line}`, PERSONALITY_MOODS[speaker.personality] ?? "chaos");
  }

  beginPhase() {
    const state = this.state;
    const phaseInfo = PHASES[state.phaseIndex];

    for (const player of state.players) {
      player.phaseContribution = 0;
      player.hasCastThisTurn = false;
      player.blindActive = false;
    }

    state.currentBet = 0;
    state.spellSurcharge = null;

    if (state.phaseIndex > 0 && state.phaseIndex < 4) {
      const revealedCard = this.drawFromDeck();
      if (
        state.phaseIndex === 1
        && (this.hasDailyModifier("wild-rune") || this.hasHumanRelic("marked-rune"))
      ) {
        revealedCard.wild = true;
      }
      state.communityCards.push(revealedCard);
      this.log(phaseInfo.name, `A new rune card appears: ${cardLabel(revealedCard)}.`, "card manipulation");
      this.emitSpellFx({
        category: revealedCard.wild ? "chaos" : "card manipulation",
        text: `${phaseInfo.name}`,
        playerId: "community",
        power: revealedCard.wild ? 3 : 2,
        impact: revealedCard.wild,
      });
      if (state.phaseIndex === 1 && revealedCard.wild) {
        this.log("Run Modifier", "The first rune turns wild immediately. The table acts like this is ordinary.", "chaos");
      }
      this.emitAmbientBanter("rune");
    } else if (state.phaseIndex === 0) {
      this.log(phaseInfo.name, "Three private cards each. Time to bluff with confidence and make awful choices on purpose.", "deception");
      this.emitSpellFx({
        category: "deception",
        text: "Cards dealt",
        playerId: "human",
        power: 2,
        impact: false,
      });
    }

    state.pendingPlayers = this.turnOrder()
      .filter((player) => !player.folded)
      .map((player) => player.id);
    state.currentPlayerId = state.pendingPlayers[0] ?? null;

    this.handleTurnStart();
  }

  handleTurnStart() {
    const current = this.getCurrentPlayer();

    if (!current) {
      this.notify();
      return;
    }

    if (current.manaCrashPending) {
      current.mana = 0;
      current.manaCrashPending = false;
      this.log("Goblin Budget", `${current.name}'s mana crashes to 0 right on schedule.`, "economy");
      this.emitSpellFx({
        category: "economy",
        text: "MANA BUST",
        playerId: current.id,
        power: 2,
        impact: true,
      });
    }

    current.blindActive = false;
    if (current.blindNextTurn) {
      current.blindNextTurn = false;
      current.blindActive = true;
      this.log("Blind Faith", `${current.name} is taking this turn with no card information whatsoever.`, "disruption");
      this.emitSpellFx({
        category: "disruption",
        text: "BLINDED",
        playerId: current.id,
        power: 2,
        impact: true,
      });
    }

    if (current.skipNextAction) {
      current.skipNextAction = false;
      this.log("Skill Issue", `${current.name} loses the turn to targeted magical incompetence.`, "disruption");
      this.emitSpellFx({
        category: "disruption",
        text: "SKIPPED",
        playerId: current.id,
        power: 3,
        impact: true,
      });
      this.state.pendingPlayers = this.state.pendingPlayers.filter((id) => id !== current.id);
      if (this.getLivePlayers().length === 1) {
        this.awardFoldWin();
        return;
      }
      this.advanceTurn(current.id);
      return;
    }

    this.notify();
  }

  canPlayerAfford(player, amount) {
    return player.stack >= amount;
  }

  commitChips(player, amount, reason = "bet") {
    const spend = Math.min(amount, player.stack);
    player.stack -= spend;
    player.totalContribution += spend;
    if (reason === "ante" || reason === "call" || reason === "raise") {
      player.phaseContribution += spend;
    }

    if (player.fakePotTrap && (reason === "call" || reason === "raise") && spend > 0) {
      player.fakePotTrap = false;
      this.state.fakePot += spend;
      this.log("Wrong Pot", `${player.name}'s ${chipText(spend)} vanish into the fake pot. This feels intentional and deeply isn't.`, "disruption");
      this.emitSpellFx({
        category: "disruption",
        text: "Wrong pot",
        playerId: player.id,
        power: 3,
        impact: true,
      });
      this.emitSpellFx({
        category: "disruption",
        text: "WRONG POT",
        playerId: player.id,
        power: 3,
        impact: true,
      });
      return spend;
    }

    this.state.pot += spend;
    return spend;
  }

  humanCastSpell(spellId, selected = null) {
    if (this.state.gameType === GAME_TYPES.uno) {
      return false;
    }
    const player = this.getCurrentPlayer();

    if (!player || player.id !== "human" || player.hasCastThisTurn) {
      return false;
    }

    return this.castSpell(player.id, spellId, selected);
  }

  castSpell(playerId, spellId, selected = null) {
    const player = this.getPlayer(playerId);
    const spellSlot = player?.spells.find((entry) => entry.id === spellId && !entry.used);
    const spell = this.getSpell(spellId);

    if (!player || !spell || !spellSlot || this.state.roundEnded || this.state.currentPlayerId !== playerId) {
      return false;
    }

    const actualCost = this.getSpellCostForPlayer(playerId, spell);
    if (player.mana < actualCost) {
      return false;
    }

    player.mana -= actualCost;
    spellSlot.used = true;
    player.hasCastThisTurn = true;

    const backfire = spell.backfireChance > 0 && this.random() < spell.backfireChance;
    const context = {
      game: this,
      state: this.state,
      caster: player,
      spell,
      selected,
      random: () => this.random(),
      backfire,
    };

    const result = spell.effect(context) ?? {};
    const historyRecord = {
      id: `spell-${++this.historySerial}`,
      spellId,
      name: spell.name,
      casterId: playerId,
      targetId: result.targetId ?? null,
      category: spell.category,
      undo: typeof result.undo === "function" ? result.undo : null,
      cancelled: false,
    };
    this.state.spellHistory.push(historyRecord);

    const spellFlavor = player.id === "human" ? getSpellFlavor(this.state.profileStyle?.equippedCosmetics ?? {}, this.state.profileStyle?.customizationOverrides ?? {}, spell) : null;
    const flavoredName = spellFlavor?.displayName ?? spell.name;
    const title = backfire ? `${flavoredName} (Backfire)` : flavoredName;
    const baseMessage = result.message ?? `${player.name} casts ${flavoredName}.`;
    const message = player.id === "human" && spellFlavor?.extraText
      ? `${baseMessage} ${spellFlavor.extraText}`
      : baseMessage;
    this.log(title, message, spell.category);
    if (result.comboText) {
      this.log("Combo Weirdness", result.comboText, spell.category);
    }

    this.emitSpellFx({
      category: spell.category,
      text: backfire ? `${flavoredName} BACKFIRED` : flavoredName,
      playerId: result.targetId ?? player.id,
      casterId: player.id,
      power: spell.cost,
      impact: spell.cost >= 3 || spell.category === "disruption" || spell.category === "chaos",
    });
    this.triggerSignatureSpellMoment(player, spell);

    this.notify();
    return true;
  }

  undoLastSpell() {
    const history = [...this.state.spellHistory].reverse();
    const targetEntry = history.find((entry) => !entry.cancelled && typeof entry.undo === "function");

    if (!targetEntry) {
      return {
        message: "Patch note: there was no reversible spell left to bully. The manager has gone home.",
        targetId: null,
      };
    }

    targetEntry.undo();
    targetEntry.cancelled = true;
    const spell = this.getSpell(targetEntry.spellId);
    this.emitSpellFx({
      category: "disruption",
      text: `CANCELLED ${spell?.name ?? "SPELL"}`,
      playerId: targetEntry.targetId ?? targetEntry.casterId,
      power: 3,
      impact: true,
    });

    return {
      message: `Patch note: cancelled ${spell?.name ?? "the last spell"} mid-resolution and asked to speak to reality's manager.`,
      targetId: targetEntry.targetId ?? targetEntry.casterId,
    };
  }

  humanAction(type) {
    if (this.state.gameType === GAME_TYPES.uno) {
      return this.performUnoAction("human", type);
    }
    const current = this.getCurrentPlayer();
    if (!current || current.id !== "human") {
      return false;
    }

    return this.performAction(current.id, type);
  }

  performAction(playerId, type) {
    if (this.state.gameType === GAME_TYPES.uno) {
      return this.performUnoAction(playerId, type);
    }
    const player = this.getPlayer(playerId);
    if (!player || this.state.roundEnded || this.state.currentPlayerId !== playerId) {
      return false;
    }

    if (type === "fold") {
      player.folded = true;
      this.log("Fold", `${player.name} throws the hand into the fireplace of shame.`, "disruption");
      this.emitSpellFx({
        category: "disruption",
        text: "Fold",
        playerId: player.id,
        power: 2,
        impact: false,
      });
    }

    if (type === "check") {
      const needed = Math.max(0, this.state.currentBet - player.phaseContribution);
      if (needed > player.stack) {
        player.folded = true;
        this.log("Fold", `${player.name} cannot cover the bet and folds with tragic dignity.`, "disruption");
        this.state.pendingPlayers = this.state.pendingPlayers.filter((id) => id !== player.id);
        if (this.getLivePlayers().length === 1) {
          this.awardFoldWin();
          return true;
        }
        this.advanceTurn(player.id);
        return true;
      }

      const paid = this.commitChips(player, needed, "call");
      this.log(
        paid > 0 ? "Call" : "Check",
        paid > 0
          ? `${player.name} matches for ${chipText(paid)}.`
          : `${player.name} taps the table and checks.`,
        "economy",
      );
      this.emitSpellFx({
        category: paid > 0 ? "economy" : "defense",
        text: paid > 0 ? "Call" : "Check",
        playerId: player.id,
        power: paid > 0 ? 2 : 1,
        impact: false,
      });
    }

    if (type === "raise") {
      const signatureBonus = player.signatureRaiseReady ? 1 : 0;
      const desiredBet = this.state.currentBet + this.state.raiseAmount + signatureBonus;
      const required = desiredBet - player.phaseContribution;

      if (!this.canPlayerAfford(player, required)) {
        return false;
      }

      this.state.currentBet = desiredBet;
      this.commitChips(player, required, "raise");
      if (player.signatureRaiseReady) {
        player.signatureRaiseReady = false;
        this.log("Stage Presence", `${player.name}'s first raise gets an extra 1-chip flourish.`, "deception");
        this.emitSpellFx({
          category: "deception",
          text: "Stage Presence",
          playerId: player.id,
          power: 2,
          impact: true,
        });
      }
      this.state.pendingPlayers = this.turnOrder()
        .filter((other) => other.id !== player.id && !other.folded)
        .map((other) => other.id);
      this.log("Raise", `${player.name} juices the pot by ${chipText(required)}.`, "economy");
      this.emitSpellFx({
        category: "economy",
        text: `Raise ${this.state.currentBet}`,
        playerId: player.id,
        power: 3,
        impact: true,
      });
    }

    if (type !== "raise") {
      this.state.pendingPlayers = this.state.pendingPlayers.filter((id) => id !== player.id);
    }

    if (this.getLivePlayers().length === 1) {
      this.awardFoldWin();
      return true;
    }

    this.advanceTurn(player.id);
    return true;
  }

  clearEndOfTurnEffects(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) {
      return;
    }

    if (player.temporaryAceCardId) {
      const aceCard = player.hand.find((card) => card.id === player.temporaryAceCardId);
      if (aceCard) {
        delete aceCard.tempRank;
      }
      player.temporaryAceCardId = null;
    }

    player.blindActive = false;
    player.hasCastThisTurn = false;

    if (this.state.spellSurcharge) {
      this.state.spellSurcharge.affectedIds = this.state.spellSurcharge.affectedIds.filter(
        (id) => id !== player.id,
      );
      if (!this.state.spellSurcharge.affectedIds.length) {
        this.state.spellSurcharge = null;
      }
    }
  }

  advanceTurn(previousPlayerId = null) {
    if (previousPlayerId) {
      this.clearEndOfTurnEffects(previousPlayerId);
    }

    const orderIds = this.turnOrder().map((player) => player.id);
    const nextId = orderIds.find((playerId) => this.state.pendingPlayers.includes(playerId));

    if (!nextId) {
      this.finishPhase();
      return;
    }

    this.state.currentPlayerId = nextId;
    this.handleTurnStart();
  }

  finishPhase() {
    const nextPhase = PHASES[this.state.phaseIndex + 1];
    if (nextPhase) {
      this.log("Table Pass", `Bets lock in. ${nextPhase.name} is next.`, "economy");
      this.emitSpellFx({
        category: "economy",
        text: "Bets locked",
        playerId: "community",
        power: 2,
        impact: false,
      });
    }
    this.state.phaseIndex += 1;

    if (this.state.phaseIndex >= 4) {
      this.showdown();
      return;
    }

    this.beginPhase();
  }

  distributePot(winners) {
    const notes = [];
    const winningShare = Math.floor(this.state.pot / winners.length);
    const taxEffect = this.state.wizardTax;
    let totalTax = 0;

    winners.forEach((winner) => {
      let gain = winningShare;
      if (taxEffect && winner.id !== taxEffect.recipientId) {
        const tax = Math.floor(gain * taxEffect.rate);
        gain -= tax;
        totalTax += tax;
      }
      winner.stack += gain;
    });

    if (taxEffect && totalTax > 0) {
      const taxRecipient = this.getPlayer(taxEffect.recipientId);
      if (taxRecipient) {
        taxRecipient.stack += totalTax;
        notes.push(`${taxRecipient.name} skims ${totalTax} chips in wizard tax.`);
      }
    }

    if (this.state.fakePot > 0) {
      notes.push(`The fake pot devours ${this.state.fakePot} chips and leaves no forwarding address.`);
    }

    return notes.join(" ");
  }

  showdown() {
    const livePlayers = this.getLivePlayers();
    const preferWorst = this.state.reverseRanking;
    let bestScore = null;
    let winners = [];

    this.emitSpellFx({
      category: this.state.reverseRanking ? "chaos" : "economy",
      text: this.state.reverseRanking ? "Worst hand wins" : "Showdown",
      playerId: "community",
      power: 3,
      impact: true,
    });

    for (const player of livePlayers) {
      player.evaluation = evaluateBestHand(player.hand, this.state.communityCards, {
        preferWorst,
        reverseRanking: this.state.reverseRanking,
      });
      if (!bestScore) {
        bestScore = player.evaluation.score;
        winners = [player];
        continue;
      }

      const diff = compareScores(player.evaluation.score, bestScore);
      if ((!preferWorst && diff > 0) || (preferWorst && diff < 0)) {
        bestScore = player.evaluation.score;
        winners = [player];
      } else if (diff === 0) {
        winners.push(player);
      }
    }

    const winnerNames = winners.map((player) => player.name).join(" & ");
    const handLabel = winners[0]?.evaluation?.label ?? "Mystery Hand";
    const distributionNote = this.distributePot(winners);
    const message = `${winnerNames} win${winners.length > 1 ? "" : "s"} with ${handLabel}.${distributionNote ? ` ${distributionNote}` : ""}`;
    this.finalizeRound(winners, "Showdown", message);
  }

  awardFoldWin() {
    const winner = this.getLivePlayers()[0];
    const distributionNote = this.distributePot([winner]);
    this.finalizeRound(
      [winner],
      "Pot Claimed",
      `${winner.name} wins the pot after everyone else bails.${distributionNote ? ` ${distributionNote}` : ""}`,
    );
  }

  finalizeRound(winners, logTitle, message) {
    this.state.roundEnded = true;
    this.state.revealedAll = true;
    this.state.currentPlayerId = null;
    this.state.winnerText = message;

    for (const player of this.state.players) {
      const isWinner = winners.some((winner) => winner.id === player.id);
      if (isWinner && winners.length > 1) {
        player.roundTies += 1;
        player.roundResult = "tied";
      } else if (isWinner) {
        player.roundWins += 1;
        player.roundResult = "won";
      } else {
        player.roundLosses += 1;
        player.roundResult = player.folded ? "folded" : "lost";
      }
      player.blindActive = false;
      player.fakePotTrap = false;
      player.reflectShield = false;
    }

    const humanWonSolo = winners.length === 1 && winners[0]?.id === "human";
    if (humanWonSolo) {
      this.state.humanWinStreak += 1;
      this.state.bestHumanWinStreak = Math.max(this.state.bestHumanWinStreak, this.state.humanWinStreak);
    } else {
      this.state.humanWinStreak = 0;
    }

    const humanLostRound = !winners.some((winner) => winner.id === "human");
    let tableAdvance = null;
    if (this.state.doubleOrNothing && humanLostRound) {
      this.state.runFailed = true;
      const bustedTable = this.getCurrentTable();
      tableAdvance = { from: bustedTable.name, to: "Run busted", clearedRun: false, bustedRun: true };
      this.log("Double or Nothing", `The run ends immediately at ${bustedTable.name}. The table takes the prize and your dignity.`, "disruption");
      this.emitSpellFx({
        category: "disruption",
        text: "Run busted",
        playerId: "community",
        power: 4,
        impact: true,
      });
    } else if (humanWonSolo && this.state.runTableIndex < TABLE_LADDER.length - 1) {
      const from = this.getCurrentTable();
      this.state.runTableIndex += 1;
      const to = this.getCurrentTable();
      tableAdvance = { from: from.name, to: to.name, clearedRun: false };
      this.state.tableIntroPending = true;
      this.log("New Table", `${from.name} is cleared. Next stop: ${to.name}.`, to.category);
      this.emitSpellFx({
        category: to.category,
        text: to.name,
        playerId: "community",
        power: 3,
        impact: true,
      });
    } else if (humanWonSolo && this.state.runTableIndex === TABLE_LADDER.length - 1) {
      this.state.runCleared = true;
      const clearedTable = this.getCurrentTable();
      tableAdvance = { from: clearedTable.name, to: "Run cleared", clearedRun: true };
      this.log("Run Clear", `You cleared ${clearedTable.name} and finished the whole tavern ladder.`, "economy");
      this.emitSpellFx({
        category: "economy",
        text: "Run cleared",
        playerId: "community",
        power: 4,
        impact: true,
      });
    }

    const relicChoices = humanWonSolo && !this.state.runCleared && !this.state.runFailed ? this.buildRelicDraft(3) : [];
    this.state.pendingRelicDraft = relicChoices.length
      ? {
          round: this.state.round,
          choices: relicChoices.map((relic) => ({ ...relic })),
        }
      : null;

    this.state.lastRoundSummary = {
      round: this.state.round,
      title: logTitle,
      message,
      winners: winners.map((winner) => ({
        id: winner.id,
        name: winner.name,
        hand: winner.evaluation?.label ?? "Fold Win",
      })),
      tableEvent: this.state.tableEvent ? { ...this.state.tableEvent } : null,
      humanResult: this.getPlayer("human")?.roundResult ?? "lost",
      streak: this.state.humanWinStreak,
      bestStreak: this.state.bestHumanWinStreak,
      pot: this.state.pot,
      fakePot: this.state.fakePot,
      chaosMode: this.state.chaosMode,
      doubleOrNothing: this.state.doubleOrNothing,
      runFailed: this.state.runFailed,
      starterLoadout: { ...this.getStarterLoadout() },
      rewardReady: Boolean(this.state.pendingRelicDraft),
      tableName: this.getCurrentTable().name,
      tableAdvance,
    };

    this.log(logTitle, this.state.winnerText, this.state.reverseRanking ? "chaos" : "economy");
    if (winners.length > 1) {
      this.emitSpellFx({
        category: "economy",
        text: "Split pot",
        playerId: "community",
        power: 2,
        impact: false,
      });
    }
    winners.forEach((winner) => {
      this.emitSpellFx({
        category: winner.id === "human" ? "economy" : PERSONALITY_MOODS[winner.personality] ?? "economy",
        text: winner.id === "human" ? "You win" : `${winner.name} wins`,
        playerId: winner.id,
        power: winners.length > 1 ? 2 : 3,
        impact: winners.length === 1,
      });
    });
    if (this.state.pendingRelicDraft) {
      this.log("Relic Draft", "Victory unlocks a relic pick. Take the least responsible passive and keep moving.", "economy");
    }
    this.emitRivalReactions();
    this.emitAmbientBanter("showdown");
    this.notify();
  }

  emitRivalReactions() {
    for (const player of this.state.players) {
      if (player.id === "human") {
        continue;
      }
      const lines = RIVAL_REACTIONS[player.personality]?.[player.roundResult === "folded" ? "lost" : player.roundResult] ?? [];
      if (!lines.length) {
        continue;
      }
      const line = lines[Math.floor(this.random() * lines.length)];
      this.log("Wizard Talk", `${player.name}: ${line}`, PERSONALITY_MOODS[player.personality] ?? "chaos");
    }
  }

  getPhaseName() {
    return PHASES[this.state.phaseIndex]?.name ?? "Showdown";
  }

  getPhaseDescription() {
    return PHASES[this.state.phaseIndex]?.description ?? "";
  }

  getPhaseTrack() {
    return PHASES.slice(0, 4).map((phase, index) => ({
      name: phase.name,
      active: this.state.phaseIndex === index && !this.state.roundEnded,
      complete: this.state.phaseIndex > index || this.state.roundEnded,
    }));
  }

  getActiveEffects() {
    const effects = [];
    const table = this.getCurrentTable();

    effects.push({
      label: table.name,
      detail: table.description,
    });

    if (this.state.wizardTax) {
      effects.push({
        label: "Wizard Tax",
        detail: `${this.getPlayer(this.state.wizardTax.recipientId)?.name ?? "A wizard"} skims 20% from winners.`,
      });
    }

    if (this.state.reverseRanking) {
      effects.push({
        label: "Patch Notes",
        detail: "Worst hand wins this round.",
      });
    }

    if (this.state.turnOrderOverride && !this.state.roundEnded) {
      effects.push({
        label: "Read the Room",
        detail: "Turn order is randomized and hidden.",
      });
    }

    if (this.state.spellSurcharge) {
      effects.push({
        label: "This Is Fine",
        detail: "Everyone except the caster pays double mana for spells in this turn cycle.",
      });
    }

    if (this.state.fakePot > 0) {
      effects.push({
        label: "Fake Pot",
        detail: `${this.state.fakePot} chips are currently lost in administrative nonsense.`,
      });
    }

    if (this.state.tableEvent) {
      effects.push({
        label: this.state.tableEvent.name,
        detail: this.state.tableEvent.description,
      });
    }

    if (this.state.chaosMode) {
      effects.push({
        label: "Chaos Mode",
        detail: "Table events trigger more often and the room is in a worse mood on purpose.",
      });
    }

    if (this.state.dailyChallenge?.modifiers?.length) {
      effects.push({
        label: "Daily Run",
        detail: `${this.state.dailyChallenge.modifiers.length} mutators are active this run.`,
      });
    }

    return effects;
  }

  getActionState() {
    if (this.state.gameType === GAME_TYPES.uno) {
      const current = this.getCurrentPlayer();
      if (!current || current.id !== "human" || this.state.roundEnded) {
        return {
          canCheck: false,
          canRaise: false,
          canFold: false,
          canCast: false,
          callAmount: 0,
          checkLabel: "Play",
          raiseLabel: "Draw",
          spellStateLabel: this.state.roundEnded ? "Round over" : "Waiting",
          hint: this.state.roundEnded
            ? this.state.winnerText || "Start a new round when you're ready."
            : "The rival wizards are deciding which color they hate most.",
        };
      }

      const playable = current.hand.some((card) => this.canPlayUnoCard(card));
      return {
        canCheck: playable,
        canRaise: !this.state.unoHasDrawnThisTurn,
        canFold: this.state.unoHasDrawnThisTurn,
        canCast: false,
        callAmount: 0,
        checkLabel: "Play",
        raiseLabel: this.state.unoHasDrawnThisTurn ? "Drawn" : "Draw",
        spellStateLabel: this.state.unoHasDrawnThisTurn ? "Drawn" : `${current.hand.length} cards`,
        hint: this.state.unoHasDrawnThisTurn
          ? (playable
              ? "You drew into a live card. Play it now or pass."
              : "The draw still missed. Pass and let the next wizard suffer.")
          : playable
            ? `${this.state.unoModifier?.name ? `${this.state.unoModifier.name} is live. ` : ""}Play a matching card or draw once. Match ${this.state.unoCurrentColor} or ${this.getUnoTopCard()?.rank ?? "anything"}.`
            : `${this.state.unoModifier?.name ? `${this.state.unoModifier.name} is live. ` : ""}No clean play. Draw once, then pass if the table still hates you.`,
      };
    }

    const current = this.getCurrentPlayer();
    if (!current || current.id !== "human" || this.state.roundEnded) {
      return {
        canCheck: false,
        canRaise: false,
        canFold: false,
        canCast: false,
        callAmount: 0,
        checkLabel: "Check / Call",
        raiseLabel: `Raise +${this.state.raiseAmount}`,
        spellStateLabel: this.state.roundEnded ? "Round over" : "Waiting",
        hint: this.state.roundEnded
          ? this.state.winnerText || "Start a new round when you're ready."
          : "The rival wizards are plotting.",
      };
    }

    const callAmount = Math.max(0, this.state.currentBet - current.phaseContribution);
    const canCast = !current.hasCastThisTurn && current.spells.some((spellRef) => {
      if (spellRef.used) {
        return false;
      }
      const spell = this.getSpell(spellRef.id);
      return spell && this.getSpellCostForPlayer(current.id, spell) <= current.mana;
    });

    return {
      canCheck: current.stack >= callAmount,
      canRaise: current.stack >= callAmount + this.state.raiseAmount,
      canFold: true,
      canCast,
      callAmount,
      checkLabel: callAmount > 0 ? `Call ${chipText(callAmount)}` : "Check",
      raiseLabel: `Raise to ${this.state.currentBet + this.state.raiseAmount}`,
      spellStateLabel: current.blindActive
        ? "Blind turn"
        : current.hasCastThisTurn
          ? "Spent"
          : canCast
            ? "Ready"
            : "No mana",
      hint: current.blindActive
        ? "You are blind this turn. Buttons still work, wisdom does not."
        : callAmount > 0
          ? `Call ${chipText(callAmount)}, raise the table to ${this.state.currentBet + this.state.raiseAmount}, or fold.`
          : canCast
            ? "You may check, raise, or cast one spell before you act."
            : "You may check or raise. Your spell for this turn is already spent.",
    };
  }

  getVisibleState() {
    if (this.state.gameType === GAME_TYPES.uno) {
      return this.getUnoVisibleState();
    }

    const human = this.getPlayer("human");
    const humanIsBlind = human.blindActive && this.state.currentPlayerId === "human" && !this.state.roundEnded;
    const humanResult = human.roundResult;
    const preferWorst = this.state.reverseRanking;
    const communitySource = humanIsBlind
      ? Array.from({ length: 3 }, () => ({ hidden: true }))
      : Array.from({ length: 3 }, (_, index) =>
          this.state.communityCards[index] ? this.cloneCardForState(this.state.communityCards[index]) : { hidden: true },
        );

    return {
      gameType: GAME_TYPES.poker,
      round: this.state.round,
      phase: this.getPhaseName(),
      phaseDescription: this.getPhaseDescription(),
      phases: this.getPhaseTrack(),
      activeEffects: this.getActiveEffects(),
      pot: this.state.pot,
      fakePot: this.state.fakePot,
      currentBet: this.state.currentBet,
      raiseAmount: this.state.raiseAmount,
      winnerText: this.state.winnerText,
      roundEnded: this.state.roundEnded,
      revealedAll: this.state.revealedAll,
      currentPlayerId: this.state.currentPlayerId,
      turnOrderNames:
        this.state.turnOrderOverride && !this.state.roundEnded
          ? ["Arcane scramble active", "No preview available"]
          : this.turnOrder()
              .filter((player) => !player.folded)
              .map((player) => player.name),
      match: {
        humanWins: human.roundWins,
        humanLosses: human.roundLosses,
        humanTies: human.roundTies,
        winStreak: this.state.humanWinStreak,
        bestStreak: this.state.bestHumanWinStreak,
      },
      started: this.state.started,
      seedLabel: this.state.seedLabel,
      chaosMode: this.state.chaosMode,
      doubleOrNothing: this.state.doubleOrNothing,
      runCleared: this.state.runCleared,
      runFailed: this.state.runFailed,
      debugMode: this.state.debugMode,
      debugRevealAll: this.state.debugRevealAll,
      currentTable: {
        ...this.getCurrentTable(),
        index: this.state.runTableIndex,
        total: TABLE_LADDER.length,
        runCleared: this.state.runCleared,
      },
      starterLoadout: { ...this.getStarterLoadout() },
      dailyChallenge: this.state.dailyChallenge
        ? {
            dateLabel: this.state.dailyChallenge.dateLabel,
            modifiers: this.state.dailyChallenge.modifiers.map((modifier) => ({ ...modifier })),
          }
        : null,
      humanRelics: this.state.humanRelics.map((relic) => ({ ...relic })),
      pendingSpellDraft: this.state.pendingSpellDraft
        ? {
            keep: this.state.pendingSpellDraft.keep,
            choices: this.state.pendingSpellDraft.choices.map((choice) => ({ ...choice })),
          }
        : null,
      tableIntro: this.state.tableIntro ? { ...this.state.tableIntro } : null,
      pendingRelicDraft: this.state.pendingRelicDraft
        ? {
            round: this.state.pendingRelicDraft.round,
            choices: this.state.pendingRelicDraft.choices.map((choice) => ({ ...choice })),
          }
        : null,
      tableEvent: this.state.tableEvent ? { ...this.state.tableEvent } : null,
      lastRoundSummary: this.state.lastRoundSummary ? { ...this.state.lastRoundSummary } : null,
      humanResult,
      humanEvaluation: humanIsBlind
        ? null
        : human.hand.length
          ? evaluateBestHand(human.hand, this.state.communityCards, {
              preferWorst,
              reverseRanking: this.state.reverseRanking,
            })
          : null,
      players: this.state.players.map((player) => ({
        id: player.id,
        name: player.name,
        personality: player.personality,
        signatureName: RIVAL_SIGNATURES[player.personality]?.name ?? null,
        signatureDescription: RIVAL_SIGNATURES[player.personality]?.description ?? null,
        signatureState: this.getSignatureState(player),
        stack: player.stack,
        mana: player.mana,
        folded: player.folded,
        reflectShield: player.reflectShield,
        blindNextTurn: player.blindNextTurn,
        blindActive: player.blindActive,
        fakePotTrap: player.fakePotTrap,
        skipNextAction: player.skipNextAction,
        manaCrashPending: player.manaCrashPending,
        hand:
          player.id === "human"
            ? humanIsBlind
              ? player.hand.map(() => ({ hidden: true }))
              : player.hand.map((card) => this.cloneCardForState(card))
            : this.state.revealedAll || this.state.debugRevealAll
              ? player.hand.map((card) => this.cloneCardForState(card))
              : player.hand.map(() => ({ hidden: true })),
        spells: player.spells.map((spellRef) => {
          const spell = getSpellById(spellRef.id);
          return {
            ...spell,
            currentCost: this.getSpellCostForPlayer(player.id, spell),
            used: spellRef.used,
          };
        }),
        lastPeek: player.lastPeek ? { ...player.lastPeek } : null,
        roundResult: player.roundResult,
        evaluation: player.evaluation
          ? {
              label: player.evaluation.label,
              cards: player.evaluation.cards.map((card) => this.cloneCardForState(card)),
            }
          : null,
      })),
      communityCards: this.state.communityCards.map((card) => this.cloneCardForState(card)),
      communitySlots: communitySource,
      actionState: this.getActionState(),
      spellFxEvents: [...this.state.spellFxEvents],
      spellHistory: this.state.spellHistory.map((entry) => ({
        id: entry.id,
        spellId: entry.spellId,
        name: entry.name,
        casterId: entry.casterId,
      })),
      logEntries: [...this.logEntries],
    };
  }

  getUnoVisibleState() {
    const human = this.getPlayer("human");
    const topCard = this.getUnoTopCard();
    const activeEffects = [
      {
        label: "Current color",
        detail: this.state.unoCurrentColor ?? "Unset",
      },
      {
        label: "Turn order",
        detail: this.state.unoDirection > 0 ? "Clockwise" : "Reverse",
      },
    ];
    if (this.state.unoModifier) {
      activeEffects.unshift({
        label: this.state.unoModifier.name,
        detail: this.state.unoModifier.shortText,
      });
    }
    return {
      gameType: GAME_TYPES.uno,
      round: this.state.round,
      phase: "Wizard Uno",
      phaseDescription: this.state.unoModifier
        ? `${this.state.unoModifier.name}: ${this.state.unoModifier.description}`
        : `Match ${this.state.unoCurrentColor ?? "any color"} or ${topCard?.rank ?? "any value"}. Empty your hand first.`,
      phases: [
        {
          name: "Discard",
          active: !this.state.roundEnded,
          complete: this.state.roundEnded,
        },
      ],
      activeEffects,
      pot: this.state.deck.length,
      fakePot: 0,
      currentBet: 0,
      raiseAmount: 0,
      winnerText: this.state.winnerText,
      roundEnded: this.state.roundEnded,
      revealedAll: this.state.revealedAll,
      currentPlayerId: this.state.currentPlayerId,
      turnOrderNames: this.getUnoPlayerOrder().map((playerId) => this.getPlayer(playerId)?.name ?? playerId),
      match: {
        humanWins: human.roundWins,
        humanLosses: human.roundLosses,
        humanTies: human.roundTies,
        winStreak: this.state.humanWinStreak,
        bestStreak: this.state.bestHumanWinStreak,
      },
      started: this.state.started,
      seedLabel: this.state.seedLabel,
      chaosMode: this.state.chaosMode,
      doubleOrNothing: this.state.doubleOrNothing,
      runCleared: this.state.runCleared,
      runFailed: this.state.runFailed,
      debugMode: this.state.debugMode,
      debugRevealAll: this.state.debugRevealAll,
      currentTable: {
        ...this.getCurrentTable(),
        index: this.state.runTableIndex,
        total: TABLE_LADDER.length,
        runCleared: this.state.runCleared,
      },
      starterLoadout: { ...this.getStarterLoadout() },
      dailyChallenge: this.state.dailyChallenge
        ? {
            dateLabel: this.state.dailyChallenge.dateLabel,
            modifiers: this.state.dailyChallenge.modifiers.map((modifier) => ({ ...modifier })),
          }
        : null,
      humanRelics: this.state.humanRelics.map((relic) => ({ ...relic })),
      pendingSpellDraft: null,
      tableIntro: this.state.tableIntro ? { ...this.state.tableIntro } : null,
      pendingRelicDraft: null,
      tableEvent: null,
      lastRoundSummary: this.state.lastRoundSummary ? { ...this.state.lastRoundSummary } : null,
      humanResult: human.roundResult,
      humanEvaluation: {
        label: `${human.hand.length} cards left`,
      },
      players: this.state.players.map((player) => ({
        id: player.id,
        name: player.name,
        personality: player.personality,
        signatureName: null,
        signatureDescription: null,
        signatureState: player.id === this.state.currentPlayerId && !this.state.roundEnded ? "Active" : null,
        stack: player.hand.length,
        mana: 0,
        folded: false,
        reflectShield: false,
        blindNextTurn: false,
        blindActive: false,
        fakePotTrap: false,
        skipNextAction: false,
        manaCrashPending: false,
        hand:
          player.id === "human" || this.state.debugRevealAll || this.state.roundEnded
            ? player.hand.map((card) => this.cloneCardForState(card))
            : player.hand.map(() => ({ hidden: true, gameType: GAME_TYPES.uno })),
        spells: [],
        lastPeek: player.lastPeek ? { ...player.lastPeek } : null,
        roundResult: player.roundResult,
        evaluation: player.roundResult === "won"
          ? {
              label: "UNO",
              cards: [],
            }
          : null,
      })),
      communityCards: topCard ? [this.cloneCardForState(topCard)] : [],
      communitySlots: topCard ? [this.cloneCardForState(topCard)] : [{ hidden: true, gameType: GAME_TYPES.uno }],
      actionState: this.getActionState(),
      spellFxEvents: [...this.state.spellFxEvents],
      spellHistory: [],
      logEntries: [...this.logEntries],
      deckRemaining: this.state.deck.length,
      unoCurrentColor: this.state.unoCurrentColor,
      unoHasDrawnThisTurn: this.state.unoHasDrawnThisTurn,
      unoModifier: this.state.unoModifier ? { ...this.state.unoModifier } : null,
    };
  }

  emitSpellFx({ category, text, playerId, casterId = null, power = 1, impact = false }) {
    this.state.spellFxEvents.push({
      id: `fx-${++this.fxSerial}`,
      category,
      text,
      playerId,
      casterId,
      power,
      impact,
      color: SPELL_CATEGORY_COLORS[category] ?? "#f6efe1",
    });
    this.state.spellFxEvents = this.state.spellFxEvents.slice(-24);
  }

  notify() {
    this.onStateChange?.(this.getVisibleState());
  }

  exportSaveState() {
    const state = JSON.parse(JSON.stringify({
      ...this.state,
      spellHistory: [],
      spellFxEvents: [],
    }));
    return {
      seed: this.seedInfo.label,
      state,
      logEntries: JSON.parse(JSON.stringify(this.logEntries)),
      fxSerial: this.fxSerial,
      historySerial: this.historySerial,
    };
  }

  loadSaveState(snapshot) {
    if (!snapshot?.state) {
      return false;
    }

    this.setSeed(snapshot.seed ?? snapshot.state.seedLabel ?? "");
    this.state = snapshot.state;
    this.logEntries = Array.isArray(snapshot.logEntries) ? snapshot.logEntries : [];
    this.fxSerial = Number.isInteger(snapshot.fxSerial) ? snapshot.fxSerial : 0;
    this.historySerial = Number.isInteger(snapshot.historySerial) ? snapshot.historySerial : 0;
    this.notify();
    return true;
  }

  log(title, message, category = null) {
    this.logEntries.unshift({
      title,
      message,
      category,
      time: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    });
    this.logEntries = this.logEntries.slice(0, 8);
  }
}

function cardLabel(card) {
  if (!card || card.hidden) {
    return "Hidden card";
  }

  if (card.gameType === GAME_TYPES.uno) {
    return card.suit === "Wild" ? card.rank : `${card.suit} ${card.rank}`;
  }

  const rank = card.tempRank ?? card.rank;
  return `${rank}${card.symbol || SUIT_SYMBOLS[card.suit]}${card.wild ? " (wild)" : ""}`;
}

export { cardLabel, describeScore, evaluateBestHand, SPELL_CATEGORY_COLORS, SPELL_LIBRARY };

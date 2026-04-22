import { cardLabel } from "./game.js";
import {
  COSMETIC_ITEMS,
  CUSTOMIZATION_SWATCHES,
  defaultSelectedTitle,
  defaultEquippedCosmetics,
  FOCUS_FINISH_OPTIONS,
  getFamiliarBoutiqueFlavor,
  getCosmeticItem,
  getOwnedCosmetics,
  getVictoryTitleFlavor,
  getWizardLoadoutFlavor,
  getWizardShopkeeperReaction,
  isCosmeticUnlocked,
  isTitleUnlocked,
  MIRROR_FRAME_OPTIONS,
  resolveCustomizationStyle,
  WIZARD_TITLES,
  EYE_GLOW_OPTIONS,
} from "./customization.js";
import { STORAGE_KEYS } from "./config.js";
import { WizardPreviewRenderer } from "./rendering.js";
import { SPELL_CATEGORY_COLORS } from "./spells.js";

const TITLE_TABLE_GAMES = {
  poker: {
    id: "poker",
    name: "Wizard Poker",
    kicker: "Arcane card table. Three rivals. One pot.",
    copy: "Draw cards, spend mana, and survive the table.",
    note: "Check, raise, fold, or cast. That is the whole problem.",
    playable: true,
  },
  blackjack: {
    id: "blackjack",
    name: "Wizard Blackjack",
    kicker: "Dealer magic. Crooked totals. Bad math.",
    copy: "Push totals, bend fate, and bully the dealer with spells.",
    note: "This table is listed in the backroom ledger, but it is not playable yet.",
    playable: false,
  },
  uno: {
    id: "uno",
    name: "Wizard Uno",
    kicker: "Color curses. Loud reversals. Ruined friendships.",
    copy: "Call colors, stack misery, and turn a simple race into a magical incident.",
    note: "Match color or value, drop action cards, and empty your hand before the room turns on you.",
    playable: true,
  },
  war: {
    id: "war",
    name: "Wizard War",
    kicker: "Simple cards. Terrible spell escalation.",
    copy: "Flip cards, cheat ties, and turn the easiest game alive into a magical arms race.",
    note: "This table exists in concept form only for now.",
    playable: false,
  },
};

const TUTORIAL_CONTENT = {
  poker: [
    "1. Each round deals 3 private cards to every wizard, then 3 shared runes appear one by one.",
    "2. On your turn, you can check or call, raise, fold, or cast 1 spell before you act.",
    "3. You begin each round with 6 mana, so it helps to save a little for the later turns.",
    "4. Your best 3-card hand wins, unless a spell or table effect changes the rules for that round.",
    "5. If a spell needs a target, the game will highlight what to click next.",
  ],
  uno: [
    "1. Match the top discard by color or value. Wild cards let you choose the next color.",
    "2. You may draw once on your turn. After that, either play the new card if it fits or pass.",
    "3. Skip, Reverse, +2, Wild, and +4 all work like dirty wizard table etiquette should.",
    "4. Empty your hand before the other wizards do. This mode is about speed, not a pot.",
    "5. If you play a Wild or +4, pick the color you want the whole table to obey next.",
  ],
};

const ONBOARDING_STEPS = {
  poker: [
    {
      focus: "hand",
      title: "Start with your cards",
      copy: "This is your hand. Read these first before you worry about anything else on the table.",
    },
    {
      focus: "actions",
      title: "Then pick a move",
      copy: "These three buttons handle the core turn: stay in, raise the table, or fold out.",
    },
    {
      focus: "spells",
      title: "Spells are your extra trouble",
      copy: "Your spellbook is optional, but each spell can bend the rules once per turn.",
    },
  ],
  uno: [
    {
      focus: "table",
      title: "Watch the discard",
      copy: "Match the live card by color or value. This middle stack is the one you obey.",
    },
    {
      focus: "hand",
      title: "Pick one card",
      copy: "Tap a card in your hand to focus it. If it matches, tap again to play it.",
    },
    {
      focus: "actions",
      title: "Draw once, then decide",
      copy: "In Wizard Uno you can draw once each turn, then either play the new match or pass.",
    },
  ],
};

const FACE_VARIANTS = [
  { id: "calm", name: "Calm" },
  { id: "stern", name: "Stern" },
  { id: "wide", name: "Wide-Eyed" },
  { id: "sleepy", name: "Sleepy" },
];

const POSE_VARIANTS = [
  { id: "neutral", name: "Neutral" },
  { id: "heroic", name: "Heroic" },
  { id: "crooked", name: "Crooked" },
];

function slugify(value) {
  return value.replace(/\s+/g, "-");
}

function cardTileMarkup(card) {
  if (card.hidden) {
    return `
      <article class="card-tile back">
        <span class="card-rank">??</span>
        <span class="card-suit">Face down</span>
        <span class="card-wild">Hidden</span>
      </article>
    `;
  }

  return `
    <article class="card-tile">
      <span class="card-rank">${card.tempRank ?? card.rank}</span>
      <span class="card-suit">${card.suit}</span>
      <span class="card-wild">${card.wild ? "Wild" : card.symbol}</span>
    </article>
  `;
}

function manaOrbMarkup(current, max = 6) {
  return Array.from({ length: max }, (_, index) => `
    <span class="mana-orb ${index < current ? "" : "empty"}" aria-hidden="true"></span>
  `).join("");
}

function miniCardMarkup(card, { targetable = false, selected = false, attrs = "" } = {}) {
  const classes = ["mini-card"];
  if (card.hidden) {
    classes.push("back");
  }
  if (targetable) {
    classes.push("targetable");
  }
  if (selected) {
    classes.push("selected-target");
  }

  return `<span class="${classes.join(" ")}" ${attrs}>${card.hidden ? "??" : cardLabel(card).toUpperCase()}</span>`;
}

function relicCardMarkup(relic, { actionLabel = "TAKE", attrs = "", className = "" } = {}) {
  const accent = SPELL_CATEGORY_COLORS[relic.category] ?? "#ffd84d";
  const classes = ["relic-card", className].filter(Boolean).join(" ");
  return `
    <article class="${classes}" style="--spell-accent:${accent}">
      <div class="spell-topline">
        <strong>${relic.name.toUpperCase()}</strong>
        <span class="card-meta">${relic.category.toUpperCase()}</span>
      </div>
      <p>${relic.description.toUpperCase()}</p>
      <button class="action-button relic-pick-button" ${attrs}>${actionLabel}</button>
    </article>
  `;
}

function spellDraftEntryMarkup(spell, { actionLabel = "Pick", selected = false } = {}) {
  const accent = SPELL_CATEGORY_COLORS[spell.category] ?? "#ffd84d";
  const summary = spellSummaryText(spell.description);
  return `
    <article class="spell-draft-entry ${selected ? "selected-draft-card" : ""}" data-spell-draft-id="${spell.id}" style="--spell-accent:${accent}">
      <div class="spell-draft-entry__top">
        <div class="spell-page-mark">
          <span class="spell-sigil" aria-hidden="true">${spellSigil(spell.category)}</span>
          <div class="spell-draft-entry__title">
            <strong>${spell.name}</strong>
            <span>${toTitleCase(spell.category)} · ${spell.cost} mana</span>
          </div>
        </div>
        <span class="spell-draft-entry__tag">${selected ? "Locked" : "Open"}</span>
      </div>
      <p>${summary}</p>
      ${spell.backfireNote ? `<small class="spell-draft-entry__warning">Backfire: ${spell.backfireNote}</small>` : ""}
      <button class="action-button" type="button">${actionLabel}</button>
    </article>
  `;
}

function spellSigil(category) {
  return {
    "card manipulation": "↻",
    deception: "◐",
    economy: "¤",
    disruption: "☇",
    defense: "⛨",
    chaos: "※",
  }[category] ?? "✧";
}

function spellSummaryText(description) {
  const cleaned = description.replace(/^Patch note:\s*/i, "").trim();
  return cleaned.length > 88 ? `${cleaned.slice(0, 85)}...` : cleaned;
}

function compactSpellName(name) {
  const words = String(name).split(" ");
  return words.length > 2 ? words.slice(0, 2).join(" ") : name;
}

function toTitleCase(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function compactTurnName(name = "") {
  const cleaned = String(name).replace(/^the\s+/i, "").trim();
  if (!cleaned) {
    return "Waiting";
  }
  return cleaned.split(/\s+/)[0];
}

function pokerTurnLabel(state, currentPlayer) {
  if (state.roundEnded) {
    return "Round over";
  }
  if (state.currentPlayerId === "human") {
    return "Your turn";
  }
  return compactTurnName(currentPlayer?.name);
}

function pokerActionHint(state, { humanTurn, targetingStep }) {
  if (targetingStep) {
    return targetingStep.prompt ?? "Choose what the spell should affect.";
  }
  if (state.roundEnded) {
    return "This hand is finished.";
  }
  if (humanTurn) {
    if (state.actionState.callAmount > 0) {
      return `You need ${state.actionState.callAmount} chips to stay in.`;
    }
    return "Choose a button below or cast a spell.";
  }
  return "The other wizards are deciding.";
}

function pokerTargetLabel(state, targetingStep) {
  if (targetingStep) {
    return toTitleCase(targetingStep.mode?.replaceAll("-", " ") ?? "target");
  }
  if (state.actionState.callAmount > 0) {
    return `Match ${state.actionState.callAmount}`;
  }
  return "Nothing yet";
}

function pokerSpellLabel(state, humanTurn) {
  if (state.roundEnded) {
    return "Round over";
  }
  if (!humanTurn) {
    return "Waiting";
  }
  if (!state.actionState.canCast) {
    return "Used this turn";
  }
  return "Ready to cast";
}

function unoTurnLabel(state, currentPlayer) {
  if (state.roundEnded) {
    return "Hand over";
  }
  if (state.currentPlayerId === "human") {
    return "Your turn";
  }
  return compactTurnName(currentPlayer?.name);
}

function unoActionHint(state, humanTurn) {
  if (state.roundEnded) {
    return "This hand is finished.";
  }
  if (humanTurn) {
    return state.actionState.hint || "Play a matching card, draw once, or pass.";
  }
  return "The other wizards are deciding.";
}

function pokerDecisionFocus(state, { humanTurn, targetingStep }) {
  if (targetingStep) {
    return {
      title: "Choose a target",
      copy: targetingStep.prompt ?? "Pick what this spell should affect next.",
    };
  }
  if (state.roundEnded) {
    return {
      title: "This hand is done",
      copy: "Check the summary, then deal the next hand when you are ready.",
    };
  }
  if (!humanTurn) {
    return {
      title: "Wait for the table",
      copy: "The other wizards are taking their turn right now.",
    };
  }
  if (state.actionState.callAmount > 0) {
    return {
      title: "Stay in or get out",
      copy: `You need ${state.actionState.callAmount} chips to call. You can also raise or fold.`,
    };
  }
  if (state.actionState.canCast) {
    return {
      title: "Pick your line",
      copy: "You can check, raise, or cast one spell before you lock in the turn.",
    };
  }
  return {
    title: "Make the table answer",
    copy: "Your spell is spent, so this turn is about checking or raising cleanly.",
  };
}

function unoDecisionFocus(state, { humanTurn, selectedCard }) {
  if (state.roundEnded) {
    return {
      title: "This hand is done",
      copy: "Check the summary, then start the next hand when you are ready.",
    };
  }
  if (!humanTurn) {
    return {
      title: "Wait for the table",
      copy: "The other wizards are taking their turn right now.",
    };
  }
  if (selectedCard) {
    return {
      title: "Play the selected card",
      copy: `You picked ${cardLabel(selectedCard)}. Play it now if it matches the discard.`,
    };
  }
  if (state.unoHasDrawnThisTurn) {
    return {
      title: "Finish the turn",
      copy: "You already drew. Play the new match if it fits, or pass.",
    };
  }
  return {
    title: "Match the discard",
    copy: `Play a ${state.unoCurrentColor} card or a matching value. If nothing fits, draw once.`,
  };
}

function pokerDisabledReason(state, { humanTurn, targetingStep }) {
  if (targetingStep) {
    return "The action buttons pause while you choose a spell target.";
  }
  if (state.roundEnded) {
    return "This hand is over. Deal the next one when you are ready.";
  }
  if (!humanTurn) {
    return "These buttons wake up on your turn.";
  }
  if (!state.actionState.canCheck && state.actionState.callAmount > 0) {
    return "You do not have enough chips to call, so folding may be your only safe exit.";
  }
  if (!state.actionState.canRaise) {
    return "You cannot raise right now because you do not have enough chips for the next jump.";
  }
  if (!state.actionState.canCast) {
    return state.actionState.spellStateLabel === "Spent"
      ? "You already cast a spell this turn."
      : "You do not have enough mana for any spell right now.";
  }
  return "";
}

function unoDisabledReason(state, { humanTurn, selectedCard, canPlaySelected }) {
  if (state.roundEnded) {
    return "This hand is over. Start the next one when you are ready.";
  }
  if (!humanTurn) {
    return "These buttons wake up on your turn.";
  }
  if (!selectedCard) {
    return "Pick a card in your hand before pressing Play.";
  }
  if (!canPlaySelected) {
    return "That card does not match the live color or value.";
  }
  if (!state.actionState.canRaise && !state.actionState.canFold) {
    return "You already finished the draw step for this turn.";
  }
  return "";
}

function compactRivalSummary(player, isUno = false) {
  if (player.roundResult === "won") {
    return "Won";
  }
  if (player.roundResult === "tied") {
    return "Tied";
  }
  if (player.folded || player.roundResult === "folded") {
    return "Folded";
  }
  if (player.id === "human") {
    return isUno ? `${player.hand.length} cards` : `${player.stack} chips`;
  }
  return isUno ? `${player.hand.length} cards` : `${player.stack} chips`;
}

function currentTargetStep(pendingTargeting) {
  if (!pendingTargeting) {
    return null;
  }

  if (pendingTargeting.spell.targetSteps?.length) {
    return pendingTargeting.spell.targetSteps[pendingTargeting.stepIndex] ?? null;
  }

  return pendingTargeting.spell.targetMode
    ? {
        mode: pendingTargeting.spell.targetMode,
        prompt: pendingTargeting.spell.targetPrompt,
      }
    : null;
}

function toHexColor(value, fallback = "#d4b072") {
  if (typeof value !== "number") {
    return fallback;
  }
  return `#${value.toString(16).padStart(6, "0")}`;
}

function unlockProgress(unlock, profile = {}) {
  if (!unlock) {
    return { current: 1, target: 1, done: true };
  }

  const currentValues = {
    runsCleared: profile?.runsCleared ?? 0,
    totalRoundWins: profile?.totalRoundWins ?? 0,
    dailyRuns: profile?.dailyRuns ?? 0,
  };
  const current = currentValues[unlock.type] ?? unlock.value;
  return {
    current,
    target: unlock.value,
    done: current >= unlock.value,
  };
}

function unlockProgressText(unlock, profile = {}) {
  const progress = unlockProgress(unlock, profile);
  if (progress.done) {
    return unlock?.label ?? "Unlocked";
  }
  return `${unlock?.label ?? "Locked"} · ${progress.current}/${progress.target}`;
}

function featuredWardrobeItemId(items = []) {
  if (!items.length) {
    return null;
  }
  const today = new Date();
  const key = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const total = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return items[total % items.length]?.id ?? null;
}

function drawWizardMannequin(canvas, style = {}, variant = "title") {
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const robe = toHexColor(style.robeColor, "#6fa0ff");
  const sleeve = toHexColor(style.sleeveColor, robe);
  const trim = toHexColor(style.trimColor, "#d4b072");
  const hat = toHexColor(style.hatColor, "#2a2242");
  const charm = toHexColor(style.charmColor, "#f4d89a");

  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, variant === "wardrobe" ? "#1e1125" : "#201723");
  bg.addColorStop(1, "#08070b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 18; i += 1) {
    const x = (i * 47) % width;
    const y = (i * 71) % height;
    ctx.fillStyle = i % 2 ? "rgba(221, 188, 113, 0.08)" : "rgba(154, 119, 217, 0.08)";
    ctx.fillRect(x, y, 3, 3);
  }

  ctx.strokeStyle = "rgba(208, 170, 92, 0.35)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(width / 2, height * 0.42, width * 0.26, Math.PI, 0);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 228, 153, 0.08)";
  ctx.beginPath();
  ctx.ellipse(width / 2, height * 0.83, width * 0.22, height * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#241813";
  ctx.fillRect(width * 0.38, height * 0.8, width * 0.24, height * 0.07);
  ctx.fillStyle = "#3d2a1f";
  ctx.fillRect(width * 0.34, height * 0.86, width * 0.32, height * 0.04);

  const bodyTop = height * 0.42;
  const bodyBottom = height * 0.78;
  const bodyMidX = width / 2;

  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(bodyMidX - width * 0.11, bodyTop);
  ctx.lineTo(bodyMidX + width * 0.11, bodyTop);
  ctx.lineTo(bodyMidX + width * 0.17, bodyBottom);
  ctx.lineTo(bodyMidX - width * 0.17, bodyBottom);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = trim;
  ctx.fillRect(bodyMidX - width * 0.17, bodyBottom - 6, width * 0.34, 6);
  ctx.fillRect(bodyMidX - 4, bodyTop + 6, 8, bodyBottom - bodyTop - 10);

  ctx.fillStyle = sleeve;
  ctx.fillRect(bodyMidX - width * 0.17, bodyTop + 18, width * 0.07, height * 0.16);
  ctx.fillRect(bodyMidX + width * 0.1, bodyTop + 18, width * 0.07, height * 0.16);

  ctx.fillStyle = "#d8c09b";
  ctx.fillRect(bodyMidX - width * 0.165, bodyTop + height * 0.14, width * 0.045, height * 0.035);
  ctx.fillRect(bodyMidX + width * 0.12, bodyTop + height * 0.14, width * 0.045, height * 0.035);

  ctx.fillStyle = "#c5ac84";
  ctx.beginPath();
  ctx.arc(bodyMidX, height * 0.35, width * 0.055, 0, Math.PI * 2);
  ctx.fill();

  const hatHeight = Math.max(0.28, Math.min(0.62, style.hatHeight ?? 0.38));
  const hatRadius = Math.max(0.14, Math.min(0.28, style.hatRadius ?? 0.2));
  ctx.fillStyle = hat;
  ctx.beginPath();
  ctx.moveTo(bodyMidX - width * hatRadius, height * 0.33);
  ctx.lineTo(bodyMidX, height * (0.33 - hatHeight));
  ctx.lineTo(bodyMidX + width * hatRadius, height * 0.33);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(bodyMidX - width * 0.1, height * 0.33, width * 0.2, 5);

  if (style.charmType === "orbit") {
    ctx.strokeStyle = "rgba(233, 205, 118, 0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bodyMidX + width * 0.14, height * 0.42, width * 0.05, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = charm;
    ctx.fillRect(bodyMidX + width * 0.18, height * 0.4, 6, 6);
  } else if (style.charmType === "raven") {
    ctx.fillStyle = charm;
    ctx.beginPath();
    ctx.moveTo(bodyMidX + width * 0.12, height * 0.44);
    ctx.lineTo(bodyMidX + width * 0.2, height * 0.41);
    ctx.lineTo(bodyMidX + width * 0.19, height * 0.48);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255, 242, 197, 0.82)";
  ctx.font = variant === "wardrobe" ? "20px IM Fell English SC" : "16px IM Fell English SC";
  ctx.textAlign = "center";
  ctx.fillText(variant === "wardrobe" ? "FITTING CIRCLE" : "YOUR WIZARD", width / 2, variant === "wardrobe" ? 36 : 28);
}

export class UIController {
  constructor({
    game,
    renderer,
    onStartMatch,
    onResumeRun,
    onReturnToTitle,
    onResetRun,
    onBuyCosmetic,
    onEquipCosmetic,
    onUpdateCustomization,
    onRenameWizard,
    onSelectTitle,
    onUserInteraction,
    onPresentationChange,
  }) {
    this.game = game;
    this.renderer = renderer;
    this.onStartMatch = onStartMatch;
    this.onResumeRun = onResumeRun;
    this.onReturnToTitle = onReturnToTitle;
    this.onResetRun = onResetRun;
    this.onBuyCosmetic = onBuyCosmetic;
    this.onEquipCosmetic = onEquipCosmetic;
    this.onUpdateCustomization = onUpdateCustomization;
    this.onRenameWizard = onRenameWizard;
    this.onSelectTitle = onSelectTitle;
    this.onUserInteraction = onUserInteraction;
    this.onPresentationChange = onPresentationChange;
    this.pendingTargeting = null;
    this.titleVisible = true;
    this.transitionTimer = null;
    this.phaseStamp = null;
    this.roundSummarySeen = 0;
    this.onboardingStepIndex = 0;
    this.onboardingDismissed = this.loadOnboardingDismissed();
    this.presentationSettings = {
      stableVisuals: false,
      reducedFlash: false,
      uiScale: "normal",
    };
    this.latestRunFinish = null;

    this.titleScreen = document.getElementById("title-screen");
    this.titleKicker = document.getElementById("title-kicker");
    this.titleHeading = document.getElementById("title-heading");
    this.titleCopy = document.getElementById("title-copy");
    this.titleNote = document.getElementById("title-note");
    this.titleScreenPanel = document.querySelector(".title-screen__panel");
    this.tableSelectionHeadline = document.getElementById("table-selection-headline");
    this.tableGrid = document.getElementById("table-grid");
    this.titleResults = document.getElementById("title-results");
    this.titleResultsKicker = document.getElementById("title-results-kicker");
    this.titleResultsRank = document.getElementById("title-results-rank");
    this.titleResultsCopy = document.getElementById("title-results-copy");
    this.titleResultsTags = document.getElementById("title-results-tags");
    this.titleProfile = document.getElementById("title-profile");
    this.titleProfileRank = document.getElementById("title-profile-rank");
    this.titleProfileTags = document.getElementById("title-profile-tags");
    this.titleWizardPreview = document.getElementById("title-wizard-preview");
    this.titleShowcaseName = document.getElementById("title-showcase-name");
    this.titleShowcaseCopy = document.getElementById("title-showcase-copy");
    this.titleShowcaseStage = document.querySelector(".title-showcase-stage");
    this.startButton = document.getElementById("start-button");
    this.continueButton = document.getElementById("continue-button");
    this.dailyButton = document.getElementById("daily-button");
    this.wardrobeButton = document.getElementById("wardrobe-button");
    this.statsButton = document.getElementById("stats-button");
    this.titleTutorialButton = document.getElementById("title-tutorial-button");
    this.titleScrollCue = document.getElementById("title-scroll-cue");
    this.seedInput = document.getElementById("seed-input");
    this.uiScaleSelect = document.getElementById("ui-scale-select");
    this.loadoutSelect = document.getElementById("loadout-select");
    this.chaosToggle = document.getElementById("chaos-toggle");
    this.doubleToggle = document.getElementById("double-toggle");
    this.debugToggle = document.getElementById("debug-toggle");
    this.stableToggle = document.getElementById("stable-toggle");
    this.soundToggle = document.getElementById("sound-toggle");
    this.flashToggle = document.getElementById("flash-toggle");

    this.tutorialOverlay = document.getElementById("tutorial-overlay");
    this.tutorialSteps = document.getElementById("tutorial-steps");
    this.closeTutorialButton = document.getElementById("close-tutorial-button");
    this.helpButton = document.getElementById("help-button");
    this.codexOverlay = document.getElementById("codex-overlay");
    this.codexList = document.getElementById("codex-list");
    this.closeCodexButton = document.getElementById("close-codex-button");
    this.statsOverlay = document.getElementById("stats-overlay");
    this.statsList = document.getElementById("stats-list");
    this.closeStatsButton = document.getElementById("close-stats-button");
    this.wardrobeOverlay = document.getElementById("wardrobe-overlay");
    this.wardrobeGold = document.getElementById("wardrobe-gold");
    this.wardrobeNameInput = document.getElementById("wardrobe-name-input");
    this.wardrobeNameButton = document.getElementById("wardrobe-name-button");
    this.wardrobeEquipment = document.getElementById("wardrobe-equipment");
    this.wardrobeShop = document.getElementById("wardrobe-shop");
    this.wardrobePreview = document.getElementById("wardrobe-preview");
    this.wardrobeSceneTitle = document.getElementById("wardrobe-scene-title");
    this.wardrobeSceneCopy = document.getElementById("wardrobe-scene-copy");
    this.wardrobeDyes = document.getElementById("wardrobe-dyes");
    this.wardrobeUnlocks = document.getElementById("wardrobe-unlocks");
    this.wardrobeStage = document.querySelector(".wardrobe-stage");
    this.closeWardrobeButton = document.getElementById("close-wardrobe-button");
    this.settingsOverlay = document.getElementById("settings-overlay");
    this.closeSettingsButton = document.getElementById("close-settings-button");
    this.matchUiScaleSelect = document.getElementById("match-ui-scale-select");
    this.matchSoundToggle = document.getElementById("match-sound-toggle");
    this.matchStableToggle = document.getElementById("match-stable-toggle");
    this.matchFlashToggle = document.getElementById("match-flash-toggle");
    this.resetRunButton = document.getElementById("reset-run-button");
    this.unoColorOverlay = document.getElementById("uno-color-overlay");
    this.unoColorLead = document.getElementById("uno-color-lead");
    this.unoColorGrid = document.getElementById("uno-color-grid");
    this.closeUnoColorButton = document.getElementById("close-uno-color-button");
    this.pendingUnoColorChoice = null;

    this.transitionBanner = document.getElementById("transition-banner");
    this.transitionTitle = document.getElementById("transition-title");
    this.transitionSubtitle = document.getElementById("transition-subtitle");

    this.roundSummaryOverlay = document.getElementById("round-summary-overlay");
    this.roundSummaryKicker = document.getElementById("round-summary-kicker");
    this.roundSummaryBody = document.getElementById("round-summary-body");
    this.summaryNextRoundButton = document.getElementById("summary-next-round-button");
    this.summaryMenuButton = document.getElementById("summary-menu-button");

    this.relicOverlay = document.getElementById("relic-overlay");
    this.relicKicker = document.getElementById("relic-kicker");
    this.relicLead = document.getElementById("relic-lead");
    this.relicDraftList = document.getElementById("relic-draft-list");
    this.spellDraftOverlay = document.getElementById("spell-draft-overlay");
    this.spellDraftKicker = document.getElementById("spell-draft-kicker");
    this.spellDraftLead = document.getElementById("spell-draft-lead");
    this.spellDraftList = document.getElementById("spell-draft-list");
    this.spellDraftConfirmButton = document.getElementById("spell-draft-confirm-button");
    this.pendingDraftSelection = [];
    this.selectedTitleGame = "poker";
    this.resumeSnapshot = null;
    this.selectedUnoCardIndex = null;
    this.titlePreviewRenderer = this.titleWizardPreview ? new WizardPreviewRenderer(this.titleWizardPreview, { creepy: false }) : null;
    this.wardrobePreviewRenderer = this.wardrobePreview ? new WizardPreviewRenderer(this.wardrobePreview, { creepy: true }) : null;

    this.roundLabel = document.getElementById("round-label");
    this.phaseLabel = document.getElementById("phase-label");
    this.potLabel = document.getElementById("pot-label");
    this.recordLabel = document.getElementById("record-label");
    this.streakLabel = document.getElementById("streak-label");
    this.seedLabel = document.getElementById("seed-label");
    this.turnLabel = document.getElementById("turn-label");
    this.statusGrid = document.querySelector(".status-grid");
    this.phaseTrack = document.getElementById("phase-track");
    this.playersList = document.getElementById("players-list");
    this.handCards = document.getElementById("hand-cards");
    this.communityCards = document.getElementById("community-cards");
    this.communityCaption = document.getElementById("community-caption");
    this.handScore = document.getElementById("hand-score");
    this.manaLabel = document.getElementById("mana-label");
    this.manaOrbs = document.getElementById("mana-orbs");
    this.spellsList = document.getElementById("spells-list");
    this.actionHint = document.getElementById("action-hint");
    this.decisionFocus = document.getElementById("decision-focus");
    this.decisionFocusTitle = document.getElementById("decision-focus-title");
    this.decisionFocusCopy = document.getElementById("decision-focus-copy");
    this.onboardingStrip = document.getElementById("onboarding-strip");
    this.onboardingTitle = document.getElementById("onboarding-title");
    this.onboardingCopy = document.getElementById("onboarding-copy");
    this.onboardingNextButton = document.getElementById("onboarding-next-button");
    this.onboardingSkipButton = document.getElementById("onboarding-skip-button");
    this.latestEventStrip = document.getElementById("latest-event-strip");
    this.latestEventTitle = document.getElementById("latest-event-title");
    this.latestEventCopy = document.getElementById("latest-event-copy");
    this.actionStateLabel = document.getElementById("action-state-label");
    this.targetStateLabel = document.getElementById("target-state-label");
    this.spellStateLabel = document.getElementById("spell-state-label");
    this.summaryKicker = document.getElementById("summary-kicker");
    this.summaryBody = document.getElementById("summary-body");
    this.effectsList = document.getElementById("effects-list");
    this.runModeLabel = document.getElementById("run-mode-label");
    this.dailyModList = document.getElementById("daily-mod-list");
    this.relicList = document.getElementById("relic-list");
    this.logList = document.getElementById("log-list");
    this.checkButton = document.getElementById("check-button");
    this.raiseButton = document.getElementById("raise-button");
    this.foldButton = document.getElementById("fold-button");
    this.newRoundButton = document.getElementById("new-round-button");
    this.cameraButton = document.getElementById("camera-button");
    this.codexButton = document.getElementById("codex-button");
    this.homeButton = document.getElementById("home-button");
    this.settingsButton = document.getElementById("settings-button");
    this.actionsPanel = document.getElementById("actions-panel");
    this.handZone = document.getElementById("hand-zone");
    this.tableZone = document.getElementById("table-zone");
    this.spellsPanel = document.getElementById("spells-panel");
    this.playersPanel = document.getElementById("players-panel");
    this.actionDisabledReason = document.getElementById("action-disabled-reason");
    this.debugPanel = document.getElementById("debug-panel");
    this.debugManaButton = document.getElementById("debug-mana-button");
    this.debugSpellsButton = document.getElementById("debug-spells-button");
    this.debugCardsButton = document.getElementById("debug-cards-button");

    this.bindButton(this.checkButton, () => this.handlePrimaryAction());
    this.bindButton(this.raiseButton, () => this.handleSecondaryAction());
    this.bindButton(this.foldButton, () => this.handleTertiaryAction());
    this.bindButton(this.newRoundButton, () => this.startNextRound());
    this.bindButton(this.cameraButton, () => this.renderer?.cycleCamera?.());
    this.bindButton(this.helpButton, () => this.showTutorial(true));

    for (const button of this.tableGrid?.querySelectorAll("[data-table-game]") ?? []) {
      button.addEventListener("click", () => {
        this.markInteraction();
        this.selectTitleGame(button.dataset.tableGame);
      });
    }

    this.bindButton(this.startButton, () => {
      this.onStartMatch?.({
        gameType: this.selectedTitleGame,
        seed: this.seedInput.value.trim(),
        chaosMode: this.chaosToggle.checked,
        doubleOrNothing: this.doubleToggle.checked,
        loadoutId: this.loadoutSelect?.value || "plain-deck",
        debugMode: this.debugToggle.checked,
        dailyMode: false,
      });
    });
    this.bindButton(this.continueButton, () => this.onResumeRun?.());
    this.bindButton(this.dailyButton, () => {
      this.onStartMatch?.({
        gameType: this.selectedTitleGame,
        seed: "",
        chaosMode: this.chaosToggle.checked,
        doubleOrNothing: this.doubleToggle.checked,
        loadoutId: this.loadoutSelect?.value || "plain-deck",
        debugMode: this.debugToggle.checked,
        dailyMode: true,
      });
    });
    this.bindButton(this.wardrobeButton, () => this.showWardrobe(true));
    this.bindButton(this.statsButton, () => this.showStats(true));
    this.bindButton(this.titleTutorialButton, () => this.showTutorial(true));
    this.bindButton(this.titleScrollCue, () => {
      this.titleScreenPanel?.scrollBy({ top: 260, behavior: "smooth" });
    });
    this.bindButton(this.closeTutorialButton, () => this.showTutorial(false));
    this.bindButton(this.codexButton, () => this.showCodex(true));
    this.bindButton(this.homeButton, () => this.returnToHomeScreen());
    this.bindButton(this.closeCodexButton, () => this.showCodex(false));
    this.bindButton(this.closeStatsButton, () => this.showStats(false));
    this.bindButton(this.closeWardrobeButton, () => this.showWardrobe(false));
    this.bindButton(this.wardrobeNameButton, () => {
      const value = this.wardrobeNameInput?.value ?? "";
      this.onRenameWizard?.(value);
    });
    this.bindButton(this.settingsButton, () => this.showSettings(true));
    this.bindButton(this.closeSettingsButton, () => this.showSettings(false));
    this.bindButton(this.onboardingNextButton, () => this.advanceOnboarding());
    this.bindButton(this.onboardingSkipButton, () => this.dismissOnboarding());
    this.bindButton(this.closeUnoColorButton, () => this.showUnoColorPicker(false));
    this.bindButton(this.resetRunButton, () => {
      this.showSettings(false);
      this.hideSpellDraft();
      this.hideRelicDraft();
      this.hideRoundSummary();
      this.onResetRun?.();
    });

    this.bindButton(this.summaryNextRoundButton, () => this.startNextRound());
    this.bindButton(this.summaryMenuButton, () => {
      this.returnToHomeScreen();
    });

    this.bindButton(this.debugManaButton, () => this.game.runDebugAction("mana"));
    this.bindButton(this.debugSpellsButton, () => this.game.runDebugAction("spells"));
    this.bindButton(this.debugCardsButton, () => this.game.runDebugAction("cards"));
    this.bindButton(this.spellDraftConfirmButton, () => {
      if (this.pendingDraftSelection.length === 2) {
        this.game.confirmOpeningSpellDraft(this.pendingDraftSelection);
      }
    });

    this.uiScaleSelect?.addEventListener("change", () => this.handleSettingsChange("title"));
    this.stableToggle?.addEventListener("change", () => this.handleSettingsChange("title"));
    this.flashToggle?.addEventListener("change", () => this.handleSettingsChange("title"));
    this.soundToggle?.addEventListener("change", () => this.handleSettingsChange("title"));
    this.matchUiScaleSelect?.addEventListener("change", () => this.handleSettingsChange("match"));
    this.matchStableToggle?.addEventListener("change", () => this.handleSettingsChange("match"));
    this.matchFlashToggle?.addEventListener("change", () => this.handleSettingsChange("match"));
    this.matchSoundToggle?.addEventListener("change", () => this.handleSettingsChange("match"));

    this.codexList.innerHTML = this.buildCodexMarkup();
    this.refreshTitleGameUI();
  }

  getActiveGameId() {
    if (this.game?.state?.started) {
      return this.game.state.gameType === "uno" ? "uno" : "poker";
    }
    return this.selectedTitleGame;
  }

  handlePrimaryAction() {
    if (this.game.state.gameType === "uno") {
      this.tryPlaySelectedUnoCard();
      return;
    }
    this.game.humanAction("check");
  }

  handleSecondaryAction() {
    if (this.game.state.gameType === "uno") {
      this.game.humanAction("draw");
      return;
    }
    this.game.humanAction("raise");
  }

  handleTertiaryAction() {
    if (this.game.state.gameType === "uno") {
      this.game.humanAction("pass");
      return;
    }
    this.game.humanAction("fold");
  }

  bindButton(button, handler) {
    button.addEventListener("click", () => {
      this.markInteraction();
      handler();
    });
  }

  markInteraction() {
    this.onUserInteraction?.();
  }

  returnToHomeScreen() {
    const returnGame = this.game?.state?.started ? this.getActiveGameId() : this.selectedTitleGame;
    this.showSettings(false);
    this.showCodex(false);
    this.showTutorial(false);
    this.showStats(false);
    this.showWardrobe(false);
    this.showUnoColorPicker(false);
    this.hideSpellDraft();
    this.hideRoundSummary();
    this.hideRelicDraft();
    this.selectTitleGame(returnGame);
    this.showTitleScreen(true);
    this.onReturnToTitle?.();
  }

  scrollTitleToTop() {
    if (this.titleScreen) {
      this.titleScreen.scrollTop = 0;
    }
    if (this.titleScreenPanel) {
      this.titleScreenPanel.scrollTop = 0;
    }
  }

  getSelectedTitleGame() {
    return TITLE_TABLE_GAMES[this.selectedTitleGame] ?? TITLE_TABLE_GAMES.poker;
  }

  selectTitleGame(gameId = "poker") {
    this.selectedTitleGame = TITLE_TABLE_GAMES[gameId] ? gameId : "poker";
    this.refreshTitleGameUI();
  }

  refreshTitleGameUI() {
    const selectedGame = this.getSelectedTitleGame();
    const hasFinish = Boolean(this.latestRunFinish);
    document.body.dataset.gameMode = selectedGame.id;

    for (const button of this.tableGrid?.querySelectorAll("[data-table-game]") ?? []) {
      const game = TITLE_TABLE_GAMES[button.dataset.tableGame] ?? TITLE_TABLE_GAMES.poker;
      button.classList.toggle("selected-target", button.dataset.tableGame === selectedGame.id);
      button.classList.toggle("coming-soon", !game.playable);
    }

    if (this.tableSelectionHeadline) {
      this.tableSelectionHeadline.textContent = selectedGame.name;
    }
    if (this.titleHeading) {
      this.titleHeading.textContent = selectedGame.name.toUpperCase();
    }

    this.startButton.disabled = !selectedGame.playable;
    this.dailyButton.disabled = !selectedGame.playable;
    this.dailyButton.classList.toggle("hidden", !selectedGame.playable);

    if (!selectedGame.playable) {
      this.startButton.textContent = "Coming soon";
      this.continueButton.textContent = "Continue run";
      this.titleKicker.textContent = selectedGame.kicker;
      this.titleCopy.textContent = selectedGame.copy;
      this.titleNote.textContent = selectedGame.note;
      this.continueButton.classList.add("hidden");
      return;
    }

    this.startButton.textContent = hasFinish ? "Run it back" : "Play";
    const resumeGameType = this.resumeSnapshot?.state?.gameType === "uno" ? "Wizard Uno" : "Wizard Poker";
    this.continueButton.textContent = `Continue ${resumeGameType}`;
    this.titleKicker.textContent = hasFinish
      ? "Tavern cleared. WIZCORP remains concerned."
      : selectedGame.kicker;
    this.titleCopy.textContent = hasFinish
      ? `You finished the ladder as ${this.latestRunFinish.finalRank}. The room is somehow willing to let you try again.`
      : selectedGame.copy;
    this.titleNote.textContent = hasFinish
      ? "Run it back, try the daily run, or stop while the paperwork still likes you."
      : selectedGame.note;
    this.continueButton.classList.toggle("hidden", !Boolean(this.resumeSnapshot?.state?.started && !this.resumeSnapshot?.state?.runCleared && !this.resumeSnapshot?.state?.runFailed));
  }

  prepareForNewMatch({ seed, gameType, chaosMode, doubleOrNothing, loadoutId, debugMode, dailyMode }) {
    this.roundSummarySeen = 0;
    this.phaseStamp = null;
    this.pendingTargeting = null;
    this.pendingDraftSelection = [];
    if (!this.onboardingDismissed) {
      this.onboardingStepIndex = 0;
    }
    this.selectTitleGame(gameType ?? "poker");
    this.seedInput.value = seed ?? "";
    this.chaosToggle.checked = Boolean(chaosMode);
    this.doubleToggle.checked = Boolean(doubleOrNothing);
    if (this.loadoutSelect) {
      this.loadoutSelect.value = loadoutId ?? "plain-deck";
    }
    this.debugToggle.checked = Boolean(debugMode);
    this.dailyButton.classList.toggle("selected-target", Boolean(dailyMode));
  }

  setResumeAvailable(snapshot = null) {
    this.resumeSnapshot = snapshot;
    this.refreshTitleGameUI();
  }

  setPersistentSettings(settings = {}) {
    this.presentationSettings = {
      stableVisuals: Boolean(settings.stableVisuals),
      reducedFlash: Boolean(settings.reducedFlash),
      uiScale: settings.uiScale || "normal",
      soundEnabled: settings.soundEnabled !== false,
    };
    this.syncSettingsControls();
  }

  syncSettingsControls() {
    const { stableVisuals, reducedFlash, uiScale, soundEnabled = true } = this.presentationSettings;
    if (this.uiScaleSelect) {
      this.uiScaleSelect.value = uiScale;
    }
    if (this.matchUiScaleSelect) {
      this.matchUiScaleSelect.value = uiScale;
    }
    if (this.stableToggle) {
      this.stableToggle.checked = stableVisuals;
    }
    if (this.matchStableToggle) {
      this.matchStableToggle.checked = stableVisuals;
    }
    if (this.flashToggle) {
      this.flashToggle.checked = reducedFlash;
    }
    if (this.soundToggle) {
      this.soundToggle.checked = soundEnabled;
    }
    if (this.matchFlashToggle) {
      this.matchFlashToggle.checked = reducedFlash;
    }
    if (this.matchSoundToggle) {
      this.matchSoundToggle.checked = soundEnabled;
    }
  }

  handleSettingsChange(source = "title") {
    const readFromMatch = source === "match";
    this.presentationSettings = {
      ...this.presentationSettings,
      stableVisuals: Boolean(readFromMatch ? this.matchStableToggle?.checked : this.stableToggle?.checked),
      reducedFlash: Boolean(readFromMatch ? this.matchFlashToggle?.checked : this.flashToggle?.checked),
      uiScale: readFromMatch ? (this.matchUiScaleSelect?.value || "normal") : (this.uiScaleSelect?.value || "normal"),
      soundEnabled: Boolean(readFromMatch ? this.matchSoundToggle?.checked : this.soundToggle?.checked),
    };
    this.syncSettingsControls();
    this.onPresentationChange?.(this.presentationSettings);
  }

  loadOnboardingDismissed() {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.onboarding) === "done";
    } catch {
      return false;
    }
  }

  persistOnboardingDismissed() {
    try {
      window.localStorage.setItem(STORAGE_KEYS.onboarding, "done");
    } catch {
      // Ignore storage issues and keep the session moving.
    }
  }

  dismissOnboarding() {
    this.onboardingDismissed = true;
    this.persistOnboardingDismissed();
    this.refreshOnboarding(null);
  }

  advanceOnboarding() {
    const gameId = this.getActiveGameId();
    const steps = ONBOARDING_STEPS[gameId] ?? ONBOARDING_STEPS.poker;
    if (this.onboardingStepIndex >= steps.length - 1) {
      this.dismissOnboarding();
      return;
    }
    this.onboardingStepIndex += 1;
    this.refreshOnboarding(this.game?.getVisibleState?.() ?? null);
  }

  refreshOnboarding(state = null) {
    const gameId = state?.gameType === "uno" ? "uno" : this.getActiveGameId();
    const steps = ONBOARDING_STEPS[gameId] ?? ONBOARDING_STEPS.poker;
    const visible = !this.onboardingDismissed && !this.titleVisible && Boolean(state?.started) && !state?.roundEnded;
    const step = steps[Math.min(this.onboardingStepIndex, steps.length - 1)] ?? null;

    this.onboardingStrip?.classList.toggle("hidden", !visible || !step);
    this.handZone?.classList.remove("coach-focus");
    this.tableZone?.classList.remove("coach-focus");
    this.actionsPanel?.classList.remove("coach-focus");
    this.spellsPanel?.classList.remove("coach-focus");
    this.playersPanel?.classList.remove("coach-focus");

    if (!visible || !step) {
      return;
    }

    this.onboardingTitle.textContent = step.title;
    this.onboardingCopy.textContent = step.copy;
    this.onboardingNextButton.textContent = this.onboardingStepIndex >= steps.length - 1 ? "Got it" : "Next tip";

    const targetMap = {
      hand: this.handZone,
      table: this.tableZone,
      actions: this.actionsPanel,
      spells: this.spellsPanel,
      rivals: this.playersPanel,
    };
    targetMap[step.focus]?.classList.add("coach-focus");
  }

  setProfileStats(profile = null) {
    this.profileStats = profile;
    this.renderStats(profile);
    this.renderTitleWizard(profile);
    if (!this.latestRunFinish && profile?.lastClear) {
      this.latestRunFinish = {
        finalRank: profile.lastClear.rank,
        bestStreak: profile.lastClear.bestStreak,
        pot: profile.lastClear.pot,
        winners: (profile.lastClear.winners ?? []).map((name) => ({ name })),
      };
    }

    const hasProfile = Boolean(profile && (profile.runsStarted || profile.runsCleared || profile.totalRoundWins));
    this.titleProfile.classList.toggle("hidden", !hasProfile);
    if (!hasProfile) {
      return;
    }

    const topSpell = this.pickTopCountEntry(profile.spellCastCounts);
    const equipped = {
      ...defaultEquippedCosmetics(),
      ...(profile?.equippedCosmetics ?? {}),
    };
    const titleDefinition = WIZARD_TITLES.find((title) => title.id === (profile?.selectedTitle ?? defaultSelectedTitle()));
    const profileTitle = titleDefinition && isTitleUnlocked(titleDefinition, profile)
      ? titleDefinition?.name
      : "Fresh Wizard";
    this.titleProfileRank.textContent = `${profile.playerName ?? "You"} · ${profileTitle}`;
    this.titleProfileTags.innerHTML = [
      `<span class="tag">Gold ${profile.gold ?? 0}</span>`,
      `<span class="tag">Runs ${profile.runsStarted ?? 0}</span>`,
      `<span class="tag">Clears ${profile.runsCleared ?? 0}</span>`,
      `<span class="tag">Best streak ${profile.bestStreak ?? 0}</span>`,
      `<span class="tag">${getCosmeticItem(equipped.familiar)?.name ?? "No Familiar"}</span>`,
      `<span class="tag">${getCosmeticItem(equipped.sigil)?.name ?? "No Sigil"}</span>`,
      `${topSpell ? `<span class="tag">${topSpell.key}</span>` : ""}`,
    ].join("");
    this.renderStats(profile);
    this.renderWardrobe(profile);
  }

  renderTitleWizard(profile = null) {
    const data = profile ?? this.profileStats;
    const equipped = {
      ...defaultEquippedCosmetics(),
      ...(data?.equippedCosmetics ?? {}),
    };
    const style = resolveCustomizationStyle(equipped);
    Object.assign(style, data?.customizationOverrides ?? {});
    this.titlePreviewRenderer?.setStyle(style);
    const flavor = getWizardLoadoutFlavor(equipped, data?.customizationOverrides ?? {});
    const robeItem = getCosmeticItem(equipped.robe);
    const hatItem = getCosmeticItem(equipped.hat);
    const playerName = data?.playerName?.trim() || "You";
    const requestedTitle = WIZARD_TITLES.find((title) => title.id === (data?.selectedTitle ?? defaultSelectedTitle()));
    const selectedTitle = requestedTitle && isTitleUnlocked(requestedTitle, data)
      ? requestedTitle
      : WIZARD_TITLES.find((title) => title.id === defaultSelectedTitle());
    if (this.titleShowcaseName) {
      this.titleShowcaseName.textContent = `${selectedTitle?.name ?? "Fresh Wizard"} ${playerName}`;
    }
    if (this.titleShowcaseCopy) {
      const aside = flavor.aside?.[0] ? ` ${flavor.aside[0]}` : "";
      this.titleShowcaseCopy.textContent = `${playerName} waits by the felt in ${robeItem?.name ?? "Backroom Robe"} and ${hatItem?.name ?? "Backroom Cone"}, while ${flavor.wardrobe.shopIntro.toLowerCase()}${aside}`;
    }
    this.titleShowcaseStage?.setAttribute("data-frame", style.mirrorFrame ?? "brass");
  }

  updateTitleReturnState(summary = null) {
    const runClear = Boolean(summary?.tableAdvance?.clearedRun);
    if (runClear) {
      const isUno = summary.gameType === "uno";
      const finalRank = summary.bestStreak >= 3
        ? "Licensed Menace"
        : summary.bestStreak >= 2
          ? "Table Problem"
          : "Suspicious Visitor";
      this.latestRunFinish = {
        finalRank,
        bestStreak: summary.bestStreak,
        pot: summary.pot,
        winners: summary.winners,
      };
    }

    const finish = this.latestRunFinish;
    const hasFinish = Boolean(finish);
    this.titleResults.classList.toggle("hidden", !hasFinish);

    if (!hasFinish) {
      this.refreshTitleGameUI();
      return;
    }
    this.titleResultsKicker.textContent = "Last clear";
    this.titleResultsRank.textContent = finish.finalRank;
    this.titleResultsCopy.textContent = finish.winners?.length
      ? `${finish.winners.map((winner) => winner.name).join(" & ")} closed the final hand.`
      : "You cleared the whole tavern ladder.";
    this.titleResultsTags.innerHTML = [
      `<span class="tag">Best streak ${finish.bestStreak}</span>`,
      `<span class="tag">Final pot ${finish.pot}</span>`,
      `<span class="tag">3 / 3 tables</span>`,
    ].join("");
    this.refreshTitleGameUI();
  }

  applyPresentationSettingsFromControls() {
    this.handleSettingsChange("title");
  }

  showCodex(visible) {
    this.codexOverlay.classList.toggle("hidden", !visible);
  }

  showSettings(visible) {
    this.syncSettingsControls();
    this.settingsOverlay.classList.toggle("hidden", !visible);
  }

  showUnoColorPicker(visible, handIndex = null) {
    if (!this.unoColorOverlay || !this.unoColorGrid) {
      return;
    }

    if (!visible) {
      this.pendingUnoColorChoice = null;
      this.unoColorOverlay.classList.add("hidden");
      return;
    }

    const human = this.game.getPlayer("human");
    const card = Number.isInteger(handIndex) ? human?.hand?.[handIndex] : null;
    if (!card) {
      return;
    }

    this.pendingUnoColorChoice = { handIndex };
    this.unoColorLead.textContent = `${card.rank} changes the table color. Pick the one everyone has to live with next.`;
    this.unoColorGrid.innerHTML = ["Crimson", "Gold", "Leaf", "Azure"]
      .map((color) => `<button class="action-button" type="button" data-uno-color="${color}">${color}</button>`)
      .join("");
    for (const button of this.unoColorGrid.querySelectorAll("[data-uno-color]")) {
      button.addEventListener("click", () => {
        const chosenColor = button.dataset.unoColor;
        const pending = this.pendingUnoColorChoice;
        if (!pending) {
          return;
        }
        const didPlay = this.game.humanPlayUnoCard(pending.handIndex, chosenColor);
        if (didPlay) {
          this.selectedUnoCardIndex = null;
          this.showUnoColorPicker(false);
        }
      });
    }
    this.unoColorOverlay.classList.remove("hidden");
  }

  tryPlaySelectedUnoCard() {
    if (this.game.state.gameType !== "uno" || !Number.isInteger(this.selectedUnoCardIndex)) {
      return;
    }
    const human = this.game.getPlayer("human");
    const card = human?.hand?.[this.selectedUnoCardIndex];
    if (!card || !this.game.canPlayUnoCard(card)) {
      return;
    }
    if (this.game.needsUnoColorChoice(card)) {
      this.showUnoColorPicker(true, this.selectedUnoCardIndex);
      return;
    }
    const didPlay = this.game.humanPlayUnoCard(this.selectedUnoCardIndex);
    if (didPlay) {
      this.selectedUnoCardIndex = null;
    }
  }

  buildCodexMarkup() {
    const entries = [
      ["Wrong Pot", "The next chips from that wizard vanish into a fake pot and never count toward the real one."],
      ["Blind", "That wizard plays the turn without seeing their own card information."],
      ["Cope Ward", "The next hostile spell aimed at that wizard bounces back to the caster."],
      ["Patch Notes", "The ranking flips and the worst hand wins for the round."],
      ["Wizard Tax", "A slice of every winning payout gets skimmed to the tagged wizard."],
      ["Opening Draft", "At the start of a fresh run, pick 2 spells to guarantee in your first hand."],
      ["Starter Loadout", "A small starting perk that gives the run an identity before the first hand even starts."],
      ["Double or Nothing", "Higher stakes and a louder table. If you lose a hand, the run dies on the spot."],
      ["Wild Color", "In Wizard Uno, Wild and +4 cards let you choose the live color for the whole table."],
      ["Draw Rule", "In Wizard Uno, you can draw once per turn. After that, either play the new card if it fits or pass."],
    ];

    return entries
      .map(([title, copy]) => `<p><strong>${title}</strong><br />${copy}</p>`)
      .join("");
  }

  startNextRound() {
    this.hideRoundSummary();
    this.showUnoColorPicker(false);
    if ((this.game.state.runCleared || this.game.state.runFailed) && this.game.state.roundEnded && !this.game.state.pendingRelicDraft?.choices?.length) {
      this.game.startGame({ resetMatch: true });
      return;
    }
    if (this.game.state.pendingRelicDraft?.choices?.length) {
      this.showRelicDraft(this.game.state.pendingRelicDraft);
      return;
    }
    this.game.startRound();
  }

  showTitleScreen(visible) {
    this.titleVisible = visible;
    this.titleScreen.classList.toggle("hidden", !visible);
    this.titleScrollCue?.classList.toggle("hidden", !visible);
    if (visible) {
      this.updateTitleReturnState();
      this.refreshTitleGameUI();
      if (this.titleScreenPanel) {
        this.titleScreenPanel.scrollTop = 0;
      }
      this.pendingTargeting = null;
      this.showSettings(false);
      this.showCodex(false);
      this.showStats(false);
      this.showWardrobe(false);
      this.hideSpellDraft();
      this.hideRoundSummary();
      this.hideRelicDraft();
      this.showUnoColorPicker(false);
      this.transitionBanner.classList.add("hidden");
      window.clearTimeout(this.transitionTimer);
      this.refreshOnboarding(null);
      this.scrollTitleToTop();
      window.requestAnimationFrame(() => {
        this.scrollTitleToTop();
      });
    } else {
      this.showStats(false);
      this.showWardrobe(false);
    }
  }

  showTutorial(visible) {
    if (visible && this.tutorialSteps) {
      const gameId = this.getActiveGameId();
      const lines = TUTORIAL_CONTENT[gameId] ?? TUTORIAL_CONTENT.poker;
      this.tutorialSteps.innerHTML = lines.map((line) => `<p>${line}</p>`).join("");
    }
    this.tutorialOverlay.classList.toggle("hidden", !visible);
  }

  showStats(visible) {
    this.statsOverlay.classList.toggle("hidden", !visible);
  }

  showWardrobe(visible) {
    this.renderWardrobe(this.profileStats);
    this.wardrobeOverlay.classList.toggle("hidden", !visible);
  }

  renderStats(profile = null) {
    const data = profile ?? this.profileStats;
    if (!this.statsList) {
      return;
    }
    if (!data) {
      this.statsList.innerHTML = "<p><strong>No tavern record yet.</strong><br />Play a run and the room will start gossiping about you.</p>";
      return;
    }

    const topSpell = this.pickTopCountEntry(data.spellCastCounts);
    const topHand = this.pickTopCountEntry(data.handWinCounts);
    const sections = [
      ["Tavern purse", `Current gold: ${data.gold ?? 0}. Spend it on hats, trim, and other bad decisions.`],
      ["Run record", `Runs started: ${data.runsStarted ?? 0}. Runs cleared: ${data.runsCleared ?? 0}. Best streak: ${data.bestStreak ?? 0}.`],
      ["Round record", `Wins: ${data.totalRoundWins ?? 0}. Ties: ${data.totalRoundTies ?? 0}. Losses: ${data.totalRoundLosses ?? 0}.`],
      ["Favorite spell", topSpell ? `${topSpell.key} cast ${topSpell.value} time${topSpell.value === 1 ? "" : "s"}.` : "No favorite yet. Start causing problems."],
      ["Winning hand", topHand ? `${topHand.key} finished ${topHand.value} winning hand${topHand.value === 1 ? "" : "s"}.` : "No winning hand logged yet."],
      ["Last clear", data.lastClear ? `${data.lastClear.rank}. Best streak ${data.lastClear.bestStreak}. Final pot ${data.lastClear.pot}.` : "No full ladder clear yet."],
      ["Last run seed", data.lastSeed || "Auto"],
    ];

    this.statsList.innerHTML = sections
      .map(([title, copy]) => `<p><strong>${title}</strong><br />${copy}</p>`)
      .join("");
  }

  pickTopCountEntry(counts = {}) {
    const entries = Object.entries(counts ?? {});
    if (!entries.length) {
      return null;
    }
    const [key, value] = entries.sort((left, right) => right[1] - left[1])[0];
    return { key, value };
  }

  renderWardrobe(profile = null) {
    const data = profile ?? this.profileStats;
    if (!this.wardrobeGold || !this.wardrobeEquipment || !this.wardrobeShop) {
      return;
    }

    const owned = getOwnedCosmetics(data);
    const equipped = {
      ...defaultEquippedCosmetics(),
      ...(data?.equippedCosmetics ?? {}),
    };
    const overrides = {
      ...(data?.customizationOverrides ?? {}),
    };
    const style = {
      ...resolveCustomizationStyle(equipped),
      ...overrides,
    };
    const loadoutFlavor = getWizardLoadoutFlavor(equipped, overrides);
    const wardrobeFlavor = getFamiliarBoutiqueFlavor(style);

    this.wardrobePreviewRenderer?.setStyle(style);
    this.wardrobeStage?.setAttribute("data-frame", style.mirrorFrame ?? "brass");
    this.titleShowcaseStage?.setAttribute("data-frame", style.mirrorFrame ?? "brass");
    if (this.wardrobeSceneTitle) {
      this.wardrobeSceneTitle.textContent = wardrobeFlavor.title;
    }
    if (this.wardrobeSceneCopy) {
      this.wardrobeSceneCopy.textContent = `${wardrobeFlavor.copy} ${getWizardShopkeeperReaction(equipped, overrides, data?.selectedTitle ?? defaultSelectedTitle())}${loadoutFlavor.aside?.length ? ` ${loadoutFlavor.aside[0]}` : ""}`;
    }
    const requestedTitle = WIZARD_TITLES.find((title) => title.id === (data?.selectedTitle ?? defaultSelectedTitle()));
    const currentTitle = requestedTitle && isTitleUnlocked(requestedTitle, data)
      ? requestedTitle
      : WIZARD_TITLES.find((title) => title.id === defaultSelectedTitle());
    const topSpell = this.pickTopCountEntry(data?.spellCastCounts);
    const currentFamiliar = getCosmeticItem(equipped.familiar);
    const currentSigil = getCosmeticItem(equipped.sigil);
    const currentFocus = getCosmeticItem(equipped.focus);

    this.wardrobeGold.innerHTML = `
      <span class="tag">Tavern Gold ${data?.gold ?? 0}</span>
      <span class="tag">Owned ${owned.size}</span>
      <span class="tag">${(data?.playerName ?? "You").trim() || "You"}</span>
      <span class="tag">${currentTitle?.name ?? "Fresh Wizard"}</span>
    `;
    if (this.wardrobeNameInput) {
      this.wardrobeNameInput.value = data?.playerName ?? "You";
    }

    if (this.wardrobeDyes) {
      this.wardrobeDyes.innerHTML = [
        `
          <section class="wardrobe-slot wardrobe-dye-group">
            <div class="title-results__head">
              <span>Face</span>
              <strong>Expression</strong>
            </div>
            <div class="wardrobe-choice-list">
              ${FACE_VARIANTS.map((option) => `
                <button
                  class="${(overrides.faceVariant ?? style.faceVariant) === option.id ? "action-button" : "secondary-button"}"
                  type="button"
                  data-custom-style-key="faceVariant"
                  data-custom-style-string="${option.id}"
                >${option.name}</button>
              `).join("")}
            </div>
          </section>
        `,
        `
          <section class="wardrobe-slot wardrobe-dye-group">
            <div class="title-results__head">
              <span>Pose</span>
              <strong>Stance</strong>
            </div>
            <div class="wardrobe-choice-list">
              ${POSE_VARIANTS.map((option) => `
                <button
                  class="${(overrides.poseVariant ?? style.poseVariant) === option.id ? "action-button" : "secondary-button"}"
                  type="button"
                  data-custom-style-key="poseVariant"
                  data-custom-style-string="${option.id}"
                >${option.name}</button>
              `).join("")}
            </div>
          </section>
        `,
        `
          <section class="wardrobe-slot wardrobe-dye-group">
            <div class="title-results__head">
              <span>Eyes</span>
              <strong>Glow</strong>
            </div>
            <div class="wardrobe-choice-list">
              ${EYE_GLOW_OPTIONS.map((option) => `
                <button
                  class="${(overrides.eyeGlowMode ?? style.eyeGlowMode) === option.id ? "action-button" : "secondary-button"}"
                  type="button"
                  data-custom-style-key="eyeGlowMode"
                  data-custom-style-string="${option.id}"
                >${option.name}</button>
              `).join("")}
            </div>
          </section>
        `,
        `
          <section class="wardrobe-slot wardrobe-dye-group">
            <div class="title-results__head">
              <span>Mirror</span>
              <strong>Frame</strong>
            </div>
            <div class="wardrobe-choice-list">
              ${MIRROR_FRAME_OPTIONS.map((option) => `
                <button
                  class="${(overrides.mirrorFrame ?? style.mirrorFrame) === option.id ? "action-button" : "secondary-button"}"
                  type="button"
                  data-custom-style-key="mirrorFrame"
                  data-custom-style-string="${option.id}"
                >${option.name}</button>
              `).join("")}
            </div>
          </section>
        `,
        `
          <section class="wardrobe-slot wardrobe-dye-group">
            <div class="title-results__head">
              <span>Title</span>
              <strong>Table name</strong>
            </div>
            <div class="wardrobe-choice-list">
              ${WIZARD_TITLES.filter((title) => isTitleUnlocked(title, data)).map((title) => `
                <button
                  class="${(data?.selectedTitle ?? defaultSelectedTitle()) === title.id ? "action-button" : "secondary-button"}"
                  type="button"
                  data-select-title="${title.id}"
                >${title.name}</button>
              `).join("")}
            </div>
          </section>
        `,
        `
          <section class="wardrobe-slot wardrobe-dye-group">
            <div class="title-results__head">
              <span>Focus</span>
              <strong>Finish</strong>
            </div>
            <div class="wardrobe-choice-list">
              ${FOCUS_FINISH_OPTIONS.map((option) => `
                <button
                  class="${(overrides.focusFinish ?? style.focusFinish) === option.id ? "action-button" : "secondary-button"}"
                  type="button"
                  data-custom-style-key="focusFinish"
                  data-custom-style-string="${option.id}"
                >${option.name}</button>
              `).join("")}
            </div>
          </section>
        `,
        ...Object.entries(CUSTOMIZATION_SWATCHES)
        .map(([key, options]) => {
          const current = overrides[key] ?? style[key];
          return `
            <section class="wardrobe-slot wardrobe-dye-group">
              <div class="title-results__head">
                <span>${key.replace("Color", "").replace(/([A-Z])/g, " $1").trim()}</span>
                <strong>Customize</strong>
              </div>
              <div class="wardrobe-swatches">
                ${options.map((option) => `
                  <button
                    class="wardrobe-swatch ${current === option.value ? "selected-target" : ""}"
                    type="button"
                    title="${option.name}"
                    style="--swatch:${`#${option.value.toString(16).padStart(6, "0")}`}"
                    data-custom-style-key="${key}"
                    data-custom-style-value="${option.value}"
                  ></button>
                `).join("")}
              </div>
            </section>
          `;
        }),
      ].join("");
    }

    if (this.wardrobeUnlocks) {
      const lockedCosmetics = COSMETIC_ITEMS
        .filter((item) => item.unlock && !owned.has(item.id) && !isCosmeticUnlocked(item, data))
        .map((item) => ({
          id: item.id,
          label: item.name,
          copy: item.description,
          tag: item.slot,
          unlock: item.unlock,
        }));
      const lockedTitles = WIZARD_TITLES
        .filter((title) => !isTitleUnlocked(title, data))
        .map((title) => ({
          id: title.id,
          label: title.name,
          copy: "A louder table title for when the backroom starts knowing you on sight.",
          tag: "title",
          unlock: title.unlock,
        }));
      const nextUnlocks = [...lockedCosmetics, ...lockedTitles]
        .sort((left, right) => {
          const leftProgress = unlockProgress(left.unlock, data);
          const rightProgress = unlockProgress(right.unlock, data);
          return (leftProgress.target - leftProgress.current) - (rightProgress.target - rightProgress.current);
        })
        .slice(0, 4);

      this.wardrobeUnlocks.innerHTML = `
        <section class="wardrobe-slot wardrobe-calling-card">
          <div class="title-results__head">
            <span>Calling card</span>
            <strong>${currentTitle?.name ?? "Fresh Wizard"} ${data?.playerName ?? "You"}</strong>
          </div>
          <p class="title-results-copy">A pocket summary for the tailor, the bouncer, and anyone else who needs to know exactly what kind of problem is walking toward the table.</p>
          <div class="title-results-tags">
            <span class="tag">${currentFamiliar?.name ?? "No Familiar"}</span>
            <span class="tag">${currentSigil?.name ?? "No Sigil"}</span>
            <span class="tag">${currentFocus?.name ?? "Empty Hands"}</span>
            <span class="tag">Finish ${(overrides.focusFinish ?? style.focusFinish) || "brass"}</span>
            ${topSpell ? `<span class="tag">${topSpell.key}</span>` : `<span class="tag">No favorite spell yet</span>`}
          </div>
        </section>
        <section class="wardrobe-slot">
          <div class="title-results__head">
            <span>Unlock ledger</span>
            <strong>Next rewards</strong>
          </div>
          <p class="title-results-copy">${nextUnlocks.length ? "The tailor has already marked the next few things they expect you to earn." : "You have cleaned out the current wardrobe ledger."}</p>
          <div class="wardrobe-ledger-list">
            ${nextUnlocks.map((entry) => `
              <article class="wardrobe-ledger-item">
                <div class="title-results__head">
                  <span>${entry.tag}</span>
                  <strong>${entry.label}</strong>
                </div>
                <p class="title-results-copy">${entry.copy}</p>
                <div class="title-results-tags">
                  <span class="tag">${unlockProgressText(entry.unlock, data)}</span>
                </div>
              </article>
            `).join("")}
          </div>
        </section>
      `;
    }

    const slots = ["robe", "hat", "trim", "collar", "sigil", "charm", "focus", "familiar"];
    this.wardrobeEquipment.innerHTML = slots
      .map((slot) => {
        const current = getCosmeticItem(equipped[slot]);
        const ownedItems = COSMETIC_ITEMS.filter((item) => item.slot === slot && owned.has(item.id));
        return `
          <section class="wardrobe-slot">
            <div class="title-results__head">
              <span>${slot}</span>
              <strong>${current?.name ?? "None"}</strong>
            </div>
            <p class="title-results-copy">${current?.description ?? "Nothing equipped."}</p>
            <div class="wardrobe-options">
              ${ownedItems.map((item) => `
                <button
                  class="${equipped[slot] === item.id ? "action-button" : "secondary-button"}"
                  data-equip-cosmetic="${item.id}"
                  ${equipped[slot] === item.id ? "disabled" : ""}
                >
                  ${equipped[slot] === item.id ? "Equipped" : `Wear ${item.name}`}
                </button>
              `).join("")}
            </div>
          </section>
        `;
      })
      .join("");

    const shopItems = COSMETIC_ITEMS.filter((item) => !item.ownedByDefault);
    const featuredPool = shopItems.filter((item) => item.price > 0 && !owned.has(item.id));
    const fallbackPool = featuredPool.length ? featuredPool : shopItems.filter((item) => item.price > 0);
    const featuredItemId = featuredWardrobeItemId(fallbackPool);
    this.wardrobeShop.innerHTML = shopItems
      .map((item) => {
        const current = equipped[item.slot] === item.id;
        const isOwned = owned.has(item.id);
        const unlocked = isCosmeticUnlocked(item, data);
        const featured = item.id === featuredItemId;
        const listedPrice = featured && !isOwned ? Math.max(1, Math.floor(item.price * 0.8)) : item.price;
        const canAfford = (data?.gold ?? 0) >= listedPrice;
        const label = !unlocked
          ? (item.unlock?.label ?? "Locked")
          : current
            ? "Equipped"
            : isOwned
              ? "Wear"
              : listedPrice > 0
                ? `Buy ${listedPrice}`
                : "Claim";
        const attr = current || !unlocked ? "disabled" : "";
        const actionAttr = isOwned ? `data-equip-cosmetic="${item.id}"` : `data-buy-cosmetic="${item.id}"`;
        return `
          <article class="shop-card ${current ? "selected-draft-card" : ""} ${featured ? "featured-bargain" : ""}">
            <div class="title-results__head">
              <span>${item.slot}</span>
              <strong>${item.name}</strong>
            </div>
            <p class="title-results-copy">${item.description}</p>
            ${item.slot === "familiar"
              ? `<p class="shop-intro">${getFamiliarBoutiqueFlavor(item.style).shopIntro}</p>`
              : `<p class="shop-intro">${getWizardShopkeeperReaction({ ...equipped, [item.slot]: item.id }, overrides, data?.selectedTitle ?? defaultSelectedTitle())}</p>`}
            <div class="title-results-tags">
              <span class="tag">${listedPrice} gold</span>
              ${featured && !isOwned ? `<span class="tag good">Featured bargain</span>` : ""}
              ${featured && !isOwned ? `<span class="tag">Was ${item.price}</span>` : ""}
              ${isOwned ? `<span class="tag">Owned</span>` : ""}
              ${current ? `<span class="tag">Equipped</span>` : ""}
              ${!unlocked ? `<span class="tag bad">${item.unlock?.label ?? "Locked"}</span>` : ""}
            </div>
            <button class="${unlocked && (canAfford || isOwned) ? "action-button" : "secondary-button"}" ${actionAttr} data-buy-price="${listedPrice}" ${attr}>
              ${label}
            </button>
          </article>
        `;
      })
      .join("");

    for (const button of this.wardrobeOverlay.querySelectorAll("[data-buy-cosmetic]")) {
      button.addEventListener("click", () => {
        this.markInteraction();
        const didBuy = this.onBuyCosmetic?.(button.dataset.buyCosmetic, Number(button.dataset.buyPrice));
        if (didBuy) {
          this.renderWardrobe(this.profileStats);
        }
      });
    }

    for (const button of this.wardrobeOverlay.querySelectorAll("[data-equip-cosmetic]")) {
      button.addEventListener("click", () => {
        this.markInteraction();
        const didEquip = this.onEquipCosmetic?.(button.dataset.equipCosmetic);
        if (didEquip) {
          this.renderWardrobe(this.profileStats);
        }
      });
    }

    for (const button of this.wardrobeOverlay.querySelectorAll("[data-custom-style-key]")) {
      button.addEventListener("click", () => {
        this.markInteraction();
        const key = button.dataset.customStyleKey;
        const value = button.dataset.customStyleString ?? Number(button.dataset.customStyleValue);
        const didUpdate = this.onUpdateCustomization?.({ [key]: value });
        if (didUpdate) {
          this.renderWardrobe(this.profileStats);
        }
      });
    }

    for (const button of this.wardrobeOverlay.querySelectorAll("[data-select-title]")) {
      button.addEventListener("click", () => {
        this.markInteraction();
        const didSelect = this.onSelectTitle?.(button.dataset.selectTitle);
        if (didSelect) {
          this.renderWardrobe(this.profileStats);
        }
      });
    }
  }

  showSpellDraft(draft) {
    if (!draft?.choices?.length) {
      return;
    }

    this.pendingDraftSelection = this.pendingDraftSelection.filter((id) => draft.choices.some((choice) => choice.id === id));
    this.spellDraftKicker.textContent = `Choose ${draft.keep}`;
    this.spellDraftLead.textContent = "Pick the two spells you want guaranteed in the first round.";
    this.spellDraftList.classList.add("spell-draft-book");
    this.spellDraftList.innerHTML = draft.choices
      .map((spell) => spellDraftEntryMarkup(spell, {
        actionLabel: this.pendingDraftSelection.includes(spell.id) ? "Locked" : "Pick",
        selected: this.pendingDraftSelection.includes(spell.id),
      }))
      .join("");
    this.spellDraftConfirmButton.disabled = this.pendingDraftSelection.length !== draft.keep;
    this.spellDraftConfirmButton.textContent = this.pendingDraftSelection.length === draft.keep
      ? `Lock ${draft.keep} spells`
      : `Pick ${draft.keep}`;
    this.spellDraftOverlay.classList.remove("hidden");

    for (const entry of this.spellDraftList.querySelectorAll("[data-spell-draft-id]")) {
      entry.addEventListener("click", () => {
        this.markInteraction();
        const spellId = entry.dataset.spellDraftId;
        if (this.pendingDraftSelection.includes(spellId)) {
          this.pendingDraftSelection = this.pendingDraftSelection.filter((id) => id !== spellId);
        } else if (this.pendingDraftSelection.length < draft.keep) {
          this.pendingDraftSelection = [...this.pendingDraftSelection, spellId];
        } else {
          this.pendingDraftSelection = [...this.pendingDraftSelection.slice(1), spellId];
        }
        this.showSpellDraft(draft);
      });
    }
  }

  hideSpellDraft() {
    this.spellDraftList?.classList.remove("spell-draft-book");
    this.spellDraftOverlay.classList.add("hidden");
  }

  showTransition(title, subtitle) {
    this.transitionTitle.textContent = title;
    this.transitionSubtitle.textContent = subtitle;
    this.transitionBanner.classList.remove("hidden");
    window.clearTimeout(this.transitionTimer);
    this.transitionTimer = window.setTimeout(() => {
      this.transitionBanner.classList.add("hidden");
    }, 1550);
  }

  showRoundSummary(summary) {
    if (!summary) {
      return;
    }

    const isUno = summary.gameType === "uno";
    const winners = summary.winners
      .map((winner) => `<span class="round-summary-chip">${winner.name} / ${winner.hand}</span>`)
      .join("");
    const runClear = Boolean(summary.tableAdvance?.clearedRun);
    const selectedTitleId = this.profileStats?.selectedTitle ?? defaultSelectedTitle();

    this.roundSummaryKicker.textContent = summary.humanResult === "won"
      ? runClear ? "Run cleared" : "You won"
      : summary.runFailed
        ? "Run busted"
      : summary.humanResult === "tied"
        ? "Tie"
        : "Round result";

    if (runClear) {
      const finalRank = summary.bestStreak >= 3
        ? "Licensed Menace"
        : summary.bestStreak >= 2
          ? "Table Problem"
          : "Suspicious Visitor";
      this.updateTitleReturnState(summary);
      this.roundSummaryBody.innerHTML = `
        <div class="round-summary-grid run-clear-grid">
          <div class="summary-banner run-clear">
            <strong>${getVictoryTitleFlavor(selectedTitleId, true)}</strong>
            <p>${summary.message}</p>
          </div>
          <div class="run-clear-rank">
            <span class="run-clear-label">Final rank</span>
            <strong>${finalRank}</strong>
          </div>
          <div class="round-summary-line"><strong>Cleared</strong><span>All 3 tables</span></div>
          <div class="round-summary-line"><strong>Best streak</strong><span>${summary.bestStreak}</span></div>
          <div class="round-summary-line"><strong>${isUno ? "Final table" : "Final pot"}</strong><span>${isUno ? (summary.tableName ?? "Wizard Uno") : `${summary.pot} real / ${summary.fakePot} fake`}</span></div>
          <div class="round-summary-line"><strong>Winners</strong><span>${winners || "No winner recorded."}</span></div>
        </div>
      `;
      this.summaryNextRoundButton.textContent = "Run it back";
      this.summaryMenuButton.textContent = "Home";
    } else if (summary.runFailed) {
      this.roundSummaryBody.innerHTML = `
        <div class="round-summary-grid run-clear-grid">
          <div class="summary-banner loss">
            <strong>Double or nothing busted</strong>
            <p>${summary.message}</p>
          </div>
          <div class="run-clear-rank">
            <span class="run-clear-label">Loadout</span>
            <strong>${summary.starterLoadout?.name ?? "Plain Deck"}</strong>
          </div>
          <div class="round-summary-line"><strong>Table</strong><span>${summary.tableName}</span></div>
          <div class="round-summary-line"><strong>Best streak</strong><span>${summary.bestStreak}</span></div>
          <div class="round-summary-line"><strong>Mode</strong><span>Double or Nothing</span></div>
          <div class="round-summary-line"><strong>Winners</strong><span>${winners || "No winner recorded."}</span></div>
        </div>
      `;
      this.summaryNextRoundButton.textContent = "Run it back";
      this.summaryMenuButton.textContent = "Home";
    } else {
      this.roundSummaryBody.innerHTML = `
        <div class="round-summary-grid">
          <div class="summary-banner ${summary.humanResult === "won" ? "win" : summary.humanResult === "tied" ? "tie" : "loss"}">
            <strong>${summary.humanResult === "won"
              ? (isUno ? `${getVictoryTitleFlavor(selectedTitleId, false)} / UNO` : getVictoryTitleFlavor(selectedTitleId, false))
              : summary.title}</strong>
            <p>${summary.message}</p>
          </div>
          <div class="round-summary-line"><strong>Winners</strong><span>${winners || "No winner recorded."}</span></div>
          <div class="round-summary-line"><strong>Streak</strong><span>${summary.streak} current / ${summary.bestStreak} best</span></div>
          <div class="round-summary-line"><strong>${isUno ? "Key rule" : "Table event"}</strong><span>${isUno ? (summary.unoModifier?.name ?? "Standard discard") : (summary.tableEvent?.name ?? "No special table rule")}</span></div>
          <div class="round-summary-line"><strong>Next stop</strong><span>${summary.tableAdvance ? `${summary.tableAdvance.from} -> ${summary.tableAdvance.to}` : summary.tableName ?? "Backroom Tavern"}</span></div>
          <div class="round-summary-line"><strong>Next reward</strong><span>${isUno ? "Start the next hand." : (summary.rewardReady ? "Pick a relic next." : "Deal the next hand.")}</span></div>
        </div>
      `;
      this.summaryNextRoundButton.textContent = "Next round";
      this.summaryMenuButton.textContent = "Home";
    }
    this.roundSummaryOverlay.classList.remove("hidden");
  }

  hideRoundSummary() {
    this.roundSummaryOverlay.classList.add("hidden");
  }

  showRelicDraft(draft) {
    if (!draft?.choices?.length) {
      return;
    }

    this.relicKicker.textContent = `ROUND ${draft.round} REWARD`;
    this.relicLead.textContent = "Pick one bonus and keep moving.";
    this.relicDraftList.innerHTML = draft.choices
      .map((relic) => relicCardMarkup(relic, {
        attrs: `data-relic-id="${relic.id}"`,
      }))
      .join("");
    this.relicOverlay.classList.remove("hidden");

    for (const button of this.relicDraftList.querySelectorAll("[data-relic-id]")) {
      button.addEventListener("click", () => {
        this.markInteraction();
        const didChoose = this.game.chooseRelic(button.dataset.relicId);
        if (didChoose) {
          this.hideRelicDraft();
          this.game.startRound();
        }
      });
    }
  }

  hideRelicDraft() {
    this.relicOverlay.classList.add("hidden");
  }

  syncPendingTargeting(state, human) {
    if (!this.pendingTargeting) {
      return;
    }

    const spell = human.spells.find((entry) => entry.id === this.pendingTargeting.spell.id);
    const stillCastable = spell
      && !spell.used
      && spell.currentCost <= human.mana
      && state.currentPlayerId === "human"
      && !state.roundEnded
      && state.actionState.canCast;

    if (!stillCastable) {
      this.pendingTargeting = null;
      return;
    }

    const targetingStep = currentTargetStep(this.pendingTargeting);
    if (!targetingStep) {
      this.pendingTargeting = null;
      return;
    }

    if (this.pendingTargeting.selection?.playerId) {
      const target = state.players.find((player) => player.id === this.pendingTargeting.selection.playerId);
      if (!target || target.id === "human" || target.folded) {
        delete this.pendingTargeting.selection.playerId;
        this.pendingTargeting.stepIndex = 0;
      }
    }

    if (targetingStep.mode === "hand" || Number.isInteger(this.pendingTargeting.selection?.handIndex)) {
      const handIndex = this.pendingTargeting.selection?.handIndex;
      if (!Number.isInteger(handIndex) || handIndex < 0 || handIndex >= human.hand.length) {
        delete this.pendingTargeting.selection.handIndex;
      }
    }

    if (targetingStep.mode === "opponent-hand" || Number.isInteger(this.pendingTargeting.selection?.opponentHandIndex)) {
      const target = state.players.find((player) => player.id === this.pendingTargeting.selection?.playerId);
      const handIndex = this.pendingTargeting.selection?.opponentHandIndex;
      if (!target || !Number.isInteger(handIndex) || handIndex < 0 || handIndex >= target.hand.length) {
        delete this.pendingTargeting.selection.opponentHandIndex;
      }
    }

    if (targetingStep.mode === "community") {
      const communityIndex = this.pendingTargeting.selection?.communityIndex;
      if (!Number.isInteger(communityIndex) || !state.communitySlots[communityIndex] || state.communitySlots[communityIndex].hidden) {
        delete this.pendingTargeting.selection.communityIndex;
      }
    }
  }

  decorateCardTile(markup, { attr, targetable, selected }) {
    const classInsert = `${targetable ? " targetable" : ""}${selected ? " selected-target" : ""}`;
    return markup
      .replace('class="card-tile', `class="card-tile${classInsert}`)
      .replace('class="community-tile', `class="community-tile${classInsert}`)
      .replace("<article ", `<article ${attr} `);
  }

  render(state) {
    document.body.dataset.gameMode = state.gameType === "uno" ? "uno" : "poker";
    const human = state.players.find((player) => player.id === "human");
    const currentPlayer = state.players.find((player) => player.id === state.currentPlayerId);
    const fakePotSuffix = state.fakePot > 0 ? ` / FAKE ${state.fakePot}` : "";

    if (state.gameType === "uno") {
      this.renderUno(state, human, currentPlayer);
      return;
    }

    this.showUnoColorPicker(false);
    this.syncPendingTargeting(state, human);

    this.roundLabel.textContent = `${state.round}`;
    this.phaseLabel.textContent = toTitleCase(state.phase);
    this.potLabel.textContent = `${state.pot}${fakePotSuffix}`;
    this.recordLabel.textContent = `${state.match.humanWins}-${state.match.humanLosses}-${state.match.humanTies}`;
    this.streakLabel.textContent = `${state.match.winStreak} / ${state.match.bestStreak}`;
    this.seedLabel.textContent = state.dailyChallenge
      ? `Daily ${state.dailyChallenge.dateLabel}`
      : state.seedLabel;
    this.turnLabel.textContent = pokerTurnLabel(state, currentPlayer);
    this.handScore.textContent = state.roundEnded
      ? (state.winnerText || "This hand is over.")
      : state.humanEvaluation
        ? `Best hand: ${state.humanEvaluation.label}`
        : "Your hand is hidden right now.";
    this.communityCaption.textContent = state.phaseDescription;
    this.summaryKicker.textContent = state.roundEnded
      ? "Round result"
      : state.tableEvent
        ? "What changed"
        : "What is happening";
    const targetingStep = currentTargetStep(this.pendingTargeting);
    const humanTurn = state.currentPlayerId === "human" && !state.roundEnded;
    const humanCanAct = humanTurn && (state.actionState.canCheck || state.actionState.canRaise || state.actionState.canFold);
    const latestEntry = state.logEntries[0];
    const decisionFocus = pokerDecisionFocus(state, { humanTurn, targetingStep });
    this.renderer?.setTargetPreview(this.pendingTargeting ? this.buildSceneTargetPreview(state, human) : null);
    this.actionHint.textContent = pokerActionHint(state, { humanTurn, targetingStep });
    this.decisionFocusTitle.textContent = decisionFocus.title;
    this.decisionFocusCopy.textContent = decisionFocus.copy;
    this.latestEventTitle.textContent = "Latest";
    this.latestEventCopy.textContent = latestEntry?.message ?? "The table is ready for the next move.";
    this.actionStateLabel.textContent = this.pendingTargeting
      ? "Choose target"
      : state.roundEnded
        ? "Round over"
        : humanTurn
          ? "Your turn"
          : "Waiting";
    this.targetStateLabel.textContent = pokerTargetLabel(state, targetingStep);
    this.spellStateLabel.textContent = pokerSpellLabel(state, humanTurn);
    this.newRoundButton.textContent = state.roundEnded ? "Next hand" : "Redeal";
    this.summaryNextRoundButton.textContent = state.pendingRelicDraft?.choices?.length ? "Choose relic" : "Next round";
    if ((state.runCleared || state.runFailed) && state.roundEnded && !state.pendingRelicDraft?.choices?.length) {
      this.summaryNextRoundButton.textContent = "Start fresh run";
    }
    this.manaLabel.textContent = `${human?.mana ?? 0}`;
    this.manaOrbs.innerHTML = manaOrbMarkup(human?.mana ?? 0, 6);
    this.debugPanel.classList.toggle("hidden", !state.debugMode);
    this.debugCardsButton.textContent = state.debugRevealAll ? "HIDE CARDS" : "REVEAL CARDS";
    this.runModeLabel.textContent = state.currentTable
      ? `${state.currentTable.index + 1}/${state.currentTable.total} ${state.currentTable.name}`
      : state.dailyChallenge ? `Daily ${state.dailyChallenge.dateLabel}` : "Standard";
    this.dailyModList.innerHTML = state.dailyChallenge?.modifiers?.length
      ? [
          `<span class="tag">${state.currentTable.name}</span>`,
          state.doubleOrNothing ? `<span class="tag">Double or Nothing</span>` : "",
          state.starterLoadout?.name ? `<span class="tag">${state.starterLoadout.name}</span>` : "",
          ...state.dailyChallenge.modifiers
          .map((modifier) => `<span class="tag">${modifier.name}</span>`)
        ].join("")
      : [
          `<span class="tag">${state.currentTable.name}</span>`,
          state.doubleOrNothing ? `<span class="tag">Double or Nothing</span>` : "",
          state.starterLoadout?.name ? `<span class="tag">${state.starterLoadout.name}</span>` : "",
        ].join("");
    this.relicList.innerHTML = state.humanRelics?.length
      ? state.humanRelics
          .map((relic) => `<span class="tag">${relic.name}</span>`)
          .join("")
      : `<span class="tag">No relics yet.</span>`;
    if (this.titleVisible) {
      this.seedInput.value = state.seedLabel ?? "";
      this.uiScaleSelect.value = this.presentationSettings.uiScale;
      this.chaosToggle.checked = state.chaosMode;
      this.doubleToggle.checked = Boolean(state.doubleOrNothing);
      if (this.loadoutSelect) {
        this.loadoutSelect.value = state.starterLoadout?.id ?? "plain-deck";
      }
      this.debugToggle.checked = state.debugMode;
      this.stableToggle.checked = this.presentationSettings.stableVisuals;
      this.flashToggle.checked = this.presentationSettings.reducedFlash;
      this.dailyButton.classList.toggle("selected-target", Boolean(state.dailyChallenge));
    }

    this.phaseTrack.innerHTML = state.phases
      .map(
        (phase) => `
          <div class="phase-step ${phase.active ? "active" : ""} ${phase.complete ? "complete" : ""}">
            <strong>${toTitleCase(phase.name.replace(" Rune", ""))}</strong>
            <span>${phase.complete ? "Done" : phase.active ? "Live" : "Next"}</span>
          </div>
        `,
      )
      .join("");

    this.playersList.innerHTML = state.players
      .map((player) => {
        const tags = [];

        if (player.folded) {
          tags.push(`<span class="tag bad">Folded</span>`);
        }
        if (player.reflectShield) {
          tags.push(`<span class="tag good">Cope Ward</span>`);
        }
        if (player.blindActive) {
          tags.push(`<span class="tag bad">Blind now</span>`);
        }
        if (player.blindNextTurn) {
          tags.push(`<span class="tag bad">Blind next</span>`);
        }
        if (player.fakePotTrap) {
          tags.push(`<span class="tag bad">Wrong pot</span>`);
        }
        if (player.id === state.currentPlayerId && !state.roundEnded) {
          tags.push(`<span class="tag good">${player.id === "human" ? "Your turn" : "Playing now"}</span>`);
        }
        if (player.skipNextAction) {
          tags.push(`<span class="tag bad">Skip turn</span>`);
        }
        if (player.manaCrashPending) {
          tags.push(`<span class="tag bad">Mana bust</span>`);
        }
        if (player.roundResult === "won") {
          tags.push(`<span class="tag good">Won</span>`);
        }
        if (player.roundResult === "tied") {
          tags.push(`<span class="tag">Tied</span>`);
        }
        if (player.roundResult === "lost" || player.roundResult === "folded") {
          tags.push(`<span class="tag bad">${player.roundResult[0].toUpperCase()}${player.roundResult.slice(1)}</span>`);
        }
        if (player.signatureState && player.id !== "human") {
          tags.push(`<span class="tag">${player.signatureState}</span>`);
        }
        if (player.lastPeek && player.id === "human") {
          tags.push(`<span class="tag good">${player.lastPeek.fake ? "Fake" : "Peek"} ${cardLabel(player.lastPeek)}</span>`);
        }
        if (state.debugMode && state.debugRevealAll && player.id !== "human" && !state.roundEnded) {
          tags.push(`<span class="tag good">Debug open hand</span>`);
        }

        const isTargetableOpponent = targetingStep?.mode === "opponent"
          && player.id !== "human"
          && !player.folded;
        const isSelectedOpponent = this.pendingTargeting?.selection?.playerId === player.id;
        const compactTag = tags[0]
          || (player.signatureState && player.id !== "human"
            ? `<span class="tag">${player.signatureState}</span>`
            : "");
        const extraTags = tags.slice(1);
        const showdownCards = player.evaluation?.cards?.length
          ? `<div class="card-lineup">${player.evaluation.cards
              .map((card) => `<span class="mini-card">${cardLabel(card).toUpperCase()}</span>`)
              .join("")}</div>`
          : "";
        const hiddenLineup = player.id !== "human" && player.hand.length
          ? `<div class="player-hand-lineup">${player.hand
              .map((card, index) => miniCardMarkup(card, {
                attrs: `data-opponent-player-id="${player.id}" data-opponent-hand-index="${index}"`,
                targetable: targetingStep?.mode === "opponent-hand"
                  && this.pendingTargeting?.selection?.playerId === player.id
                  && !player.folded,
                selected: this.pendingTargeting?.selection?.playerId === player.id
                  && this.pendingTargeting?.selection?.opponentHandIndex === index,
              }))
              .join("")}</div>`
          : "";

        return `
          <article
            class="player-card ${player.id === state.currentPlayerId ? "active" : ""} ${isTargetableOpponent ? "targetable" : ""} ${isSelectedOpponent ? "selected-target" : ""}"
            data-player-id="${player.id}"
          >
            <div class="player-summary">
              <div class="player-topline">
                <span class="player-name">${player.name}</span>
                <span class="player-role">${compactRivalSummary(player, false)}</span>
              </div>
            </div>
            <div class="player-tags">${compactTag}</div>
            <details class="player-details">
              <summary>More</summary>
              <div class="player-details-body">
                <div class="player-meters player-meters-compact">
                  <span>${player.personality}</span>
                  <span>Mana ${player.mana}</span>
                </div>
                ${player.signatureName ? `<div class="player-signature">${player.signatureName}: ${player.signatureDescription}${player.signatureState ? ` (${player.signatureState})` : ""}</div>` : ""}
                ${extraTags.length ? `<div class="player-tags">${extraTags.join("")}</div>` : ""}
                ${hiddenLineup}
                ${showdownCards}
              </div>
            </details>
          </article>
        `;
      })
      .join("");

    this.handCards.innerHTML = human.hand
      .map((card, index) => this.decorateCardTile(cardTileMarkup(card), {
        attr: `data-hand-index="${index}"`,
        targetable: targetingStep?.mode === "hand",
        selected: this.pendingTargeting?.selection?.handIndex === index,
      }))
      .join("");

    this.communityCards.innerHTML = state.communitySlots
      .map((card, index) => this.decorateCardTile(cardTileMarkup(card), {
        attr: `data-community-index="${index}"`,
        targetable: targetingStep?.mode === "community" && !card.hidden,
        selected: this.pendingTargeting?.selection?.communityIndex === index,
      }))
      .join("");

    this.renderSummary(state);
    this.renderSpells(human, state);
    this.renderEffects(state);
    this.renderLog(state.logEntries);
    this.attachTargetListeners();

    this.actionsPanel?.classList.toggle("active-turn", humanCanAct && !this.pendingTargeting);
    this.actionsPanel?.classList.toggle("targeting-mode", Boolean(this.pendingTargeting));
    this.actionsPanel?.classList.toggle("blind-turn", Boolean(human?.blindActive && humanTurn));
    this.actionsPanel?.classList.toggle("spell-spent", humanTurn && !state.actionState.canCast);
    this.actionsPanel?.classList.toggle("call-pressure", state.actionState.callAmount > 0 && humanTurn);

    this.checkButton.disabled = !state.actionState.canCheck;
    this.raiseButton.disabled = !state.actionState.canRaise;
    this.foldButton.disabled = !state.actionState.canFold;
    this.checkButton.textContent = state.actionState.checkLabel;
    this.raiseButton.textContent = state.actionState.raiseLabel;
    this.checkButton.classList.toggle("pulse-action", humanCanAct && !this.pendingTargeting && state.actionState.canCheck);
    this.raiseButton.classList.toggle("pulse-action", humanCanAct && !this.pendingTargeting && state.actionState.canRaise && state.actionState.callAmount === 0);
    this.foldButton.classList.toggle("pulse-action", false);
    this.actionDisabledReason.textContent = pokerDisabledReason(state, { humanTurn, targetingStep });

    if (!this.titleVisible && !this.tutorialOverlay.classList.contains("hidden")) {
      // Leave tutorial state alone mid-match.
    }

    const stamp = `${state.round}:${state.phase}:${state.roundEnded ? "end" : "live"}`;
    if (!this.titleVisible && stamp !== this.phaseStamp) {
      this.phaseStamp = stamp;
      if (state.roundEnded && state.lastRoundSummary) {
        this.showTransition("Hand over", state.winnerText);
      } else if (state.tableIntro?.title) {
        this.showTransition(state.tableIntro.title, state.tableIntro.subtitle);
      } else {
        const subtitle = state.tableEvent
          ? `${state.phase} / ${state.tableEvent.name}`
          : state.phaseDescription;
        this.showTransition(`Round ${state.round}`, subtitle);
      }
    }

    if (state.roundEnded && state.lastRoundSummary?.round && this.roundSummarySeen !== state.lastRoundSummary.round) {
      this.roundSummarySeen = state.lastRoundSummary.round;
      this.showRoundSummary(state.lastRoundSummary);
    }

    if (!state.roundEnded) {
      this.hideRoundSummary();
      this.hideRelicDraft();
    }

    if (state.pendingSpellDraft?.choices?.length && !this.titleVisible) {
      this.showSpellDraft(state.pendingSpellDraft);
    } else {
      this.hideSpellDraft();
    }
    this.refreshOnboarding(state);
  }

  renderUno(state, human, currentPlayer) {
    document.body.dataset.gameMode = "uno";
    if (!human) {
      return;
    }

    if (!Number.isInteger(this.selectedUnoCardIndex) || this.selectedUnoCardIndex < 0 || this.selectedUnoCardIndex >= human.hand.length) {
      this.selectedUnoCardIndex = null;
    }
    if (this.selectedUnoCardIndex !== null) {
      const selectedCard = human.hand[this.selectedUnoCardIndex];
      if (!selectedCard || !this.game.canPlayUnoCard(selectedCard)) {
        this.selectedUnoCardIndex = null;
      }
    }

    this.pendingTargeting = null;
    this.renderer?.setTargetPreview(null);
    if (!human || state.currentPlayerId !== "human" || state.roundEnded) {
      this.showUnoColorPicker(false);
    }
    this.roundLabel.textContent = `${state.round}`;
    this.phaseLabel.textContent = "Wizard Uno";
    this.potLabel.textContent = `${state.deckRemaining ?? 0}`;
    this.recordLabel.textContent = `${state.match.humanWins}-${state.match.humanLosses}-${state.match.humanTies}`;
    this.streakLabel.textContent = `${state.match.winStreak} / ${state.match.bestStreak}`;
    this.seedLabel.textContent = state.dailyChallenge
      ? `Daily ${state.dailyChallenge.dateLabel}`
      : state.seedLabel;
    this.turnLabel.textContent = unoTurnLabel(state, currentPlayer);
    this.handScore.textContent = this.selectedUnoCardIndex !== null
      ? cardLabel(human.hand[this.selectedUnoCardIndex])
      : `${human.hand.length} cards left`;
    this.communityCaption.textContent = state.unoModifier
      ? `${state.unoModifier.name}: ${state.unoModifier.shortText}`
      : `Match ${state.unoCurrentColor} or ${state.communitySlots[0]?.rank ?? "anything"}.`;
    this.summaryKicker.textContent = state.roundEnded ? "Round result" : "Discard pile";
    const humanTurn = state.currentPlayerId === "human" && !state.roundEnded;
    const latestEntry = state.logEntries[0];
    const selectedCard = Number.isInteger(this.selectedUnoCardIndex) ? human.hand[this.selectedUnoCardIndex] : null;
    const decisionFocus = unoDecisionFocus(state, { humanTurn, selectedCard });
    this.actionHint.textContent = unoActionHint(state, humanTurn);
    this.decisionFocusTitle.textContent = decisionFocus.title;
    this.decisionFocusCopy.textContent = decisionFocus.copy;
    this.latestEventTitle.textContent = "Latest";
    this.latestEventCopy.textContent = latestEntry?.message ?? "The table is ready for the next move.";
    this.actionStateLabel.textContent = state.roundEnded ? "Hand over" : humanTurn ? "Your turn" : "Waiting";
    this.targetStateLabel.textContent = state.unoCurrentColor ?? "—";
    this.spellStateLabel.textContent = state.actionState.spellStateLabel;
    this.newRoundButton.textContent = state.roundEnded ? "Next hand" : "Redeal";
    this.summaryNextRoundButton.textContent = state.roundEnded ? ((state.runCleared || state.runFailed) ? "Start fresh run" : "Next round") : "Next round";
    this.manaLabel.textContent = `${human.hand.length}`;
    this.manaOrbs.innerHTML = manaOrbMarkup(Math.max(0, Math.min(6, human.hand.length)), 6);
    this.debugPanel.classList.toggle("hidden", !state.debugMode);
    this.debugCardsButton.textContent = state.debugRevealAll ? "HIDE CARDS" : "REVEAL CARDS";
    this.runModeLabel.textContent = `${state.currentTable.index + 1}/${state.currentTable.total} ${state.currentTable.name}`;
    this.dailyModList.innerHTML = [
      `<span class="tag">${state.currentTable.name}</span>`,
      `<span class="tag">Wizard Uno</span>`,
      state.unoModifier ? `<span class="tag">${state.unoModifier.name}</span>` : "",
      state.doubleOrNothing ? `<span class="tag">Double or Nothing</span>` : "",
      state.starterLoadout?.name ? `<span class="tag">${state.starterLoadout.name}</span>` : "",
    ].join("");
    this.relicList.innerHTML = [
      `<span class="tag">${state.unoCurrentColor ?? "No color"} live</span>`,
      state.unoModifier ? `<span class="tag">${state.unoModifier.shortText}</span>` : "",
    ].join("");

    this.phaseTrack.innerHTML = `
      <div class="phase-step active complete">
        <strong>Discard</strong>
        <span>${state.roundEnded ? "Done" : "Live"}</span>
      </div>
    `;

    this.playersList.innerHTML = state.players
      .map((player) => {
        const tags = [];
        if (player.id === state.currentPlayerId && !state.roundEnded) {
          tags.push(`<span class="tag good">${player.id === "human" ? "Your turn" : "Playing now"}</span>`);
        }
        if (player.roundResult === "won") {
          tags.push(`<span class="tag good">UNO</span>`);
        }
        if (player.roundResult === "lost") {
          tags.push(`<span class="tag bad">Still holding</span>`);
        }
        if (player.lastPeek && player.id === "human") {
          tags.push(`<span class="tag good">Peek ${cardLabel(player.lastPeek)}</span>`);
        }

        const compactTag = tags[0] || "";
        const hiddenLineup = player.id !== "human" && player.hand.length
          ? `<div class="player-hand-lineup">${player.hand
              .map((card) => miniCardMarkup(card))
              .join("")}</div>`
          : "";

        return `
          <article class="player-card ${player.id === state.currentPlayerId ? "active" : ""}" data-player-id="${player.id}">
            <div class="player-summary">
              <div class="player-topline">
                <span class="player-name">${player.name}</span>
                <span class="player-role">${compactRivalSummary(player, true)}</span>
              </div>
            </div>
            <div class="player-tags">${compactTag}</div>
            <details class="player-details">
              <summary>More</summary>
              <div class="player-details-body">
                <div class="player-meters player-meters-compact">
                  <span>${player.personality}</span>
                  <span>${player.hand.length} in hand</span>
                </div>
                ${hiddenLineup}
              </div>
            </details>
          </article>
        `;
      })
      .join("");

    this.handCards.innerHTML = human.hand
      .map((card, index) => this.decorateCardTile(cardTileMarkup(card), {
        attr: `data-uno-hand-index="${index}"`,
        targetable: humanTurn && this.game.canPlayUnoCard(card),
        selected: this.selectedUnoCardIndex === index,
      }))
      .join("");

    this.communityCards.innerHTML = state.communitySlots
      .map((card, index) => this.decorateCardTile(cardTileMarkup(card), {
        attr: `data-community-index="${index}"`,
        targetable: false,
        selected: false,
      }))
      .join("");

    this.renderSummary(state);
    this.spellsList.innerHTML = `
      <article class="spell-card spent">
        <div class="spell-page-mark">
          <span class="spell-sigil">UNO</span>
          <div class="spell-topline">
            <strong>${state.unoModifier?.name ?? "Action cards only"}</strong>
            <span class="spell-cost">${state.unoCurrentColor}</span>
          </div>
        </div>
        <div class="target-preview">${state.unoHasDrawnThisTurn
          ? "You already drew this turn. Play the new match or pass."
          : (state.unoModifier?.description ?? "Wizard Uno uses your hand instead of a spellbook. Wild cards let you choose the color.")}</div>
      </article>
    `;
    this.renderEffects(state);
    this.renderLog(state.logEntries);

    for (const tile of this.handCards.querySelectorAll("[data-uno-hand-index]")) {
      tile.addEventListener("click", () => {
        const index = Number(tile.dataset.unoHandIndex);
        if (this.selectedUnoCardIndex === index) {
          this.tryPlaySelectedUnoCard();
          return;
        }
        this.selectedUnoCardIndex = index;
        this.game.notify();
      });
    }

    this.actionsPanel?.classList.toggle("active-turn", humanTurn);
    this.actionsPanel?.classList.toggle("targeting-mode", false);
    this.actionsPanel?.classList.toggle("blind-turn", false);
    this.actionsPanel?.classList.toggle("spell-spent", true);
    this.actionsPanel?.classList.toggle("call-pressure", false);

    this.checkButton.disabled = !humanTurn || this.selectedUnoCardIndex === null || !this.game.canPlayUnoCard(human.hand[this.selectedUnoCardIndex]);
    this.raiseButton.disabled = !state.actionState.canRaise;
    this.foldButton.disabled = !state.actionState.canFold;
    this.checkButton.textContent = state.actionState.checkLabel;
    this.raiseButton.textContent = state.actionState.raiseLabel;
    this.foldButton.textContent = "Pass";
    this.actionDisabledReason.textContent = unoDisabledReason(state, {
      humanTurn,
      selectedCard,
      canPlaySelected: Boolean(selectedCard && this.game.canPlayUnoCard(selectedCard)),
    });

    if (state.roundEnded && state.lastRoundSummary?.round && this.roundSummarySeen !== state.lastRoundSummary.round) {
      this.roundSummarySeen = state.lastRoundSummary.round;
      this.showRoundSummary(state.lastRoundSummary);
    }

    if (!state.roundEnded) {
      this.hideRoundSummary();
      this.hideRelicDraft();
    }
    this.hideSpellDraft();
    this.refreshOnboarding(state);
  }

  renderSummary(state) {
    const humanOutcome =
      state.humanResult === "won"
        ? "You win."
        : state.humanResult === "tied"
          ? "Split pot."
          : state.humanResult === "pending"
            ? "Hand live."
            : "You lose.";

    const bannerClass =
      state.humanResult === "won"
        ? "win"
        : state.humanResult === "tied"
          ? "tie"
          : state.humanResult === "pending"
            ? ""
            : "loss";

    this.summaryBody.innerHTML = state.roundEnded
      ? `
          <div class="summary-banner ${bannerClass}">
            <strong>${humanOutcome}</strong>
            <p class="summary-copy">${state.winnerText}</p>
          </div>
          <div class="turn-order">
            <span class="tag">${state.currentTable.name}</span>
            <span class="tag">Streak ${state.match.winStreak}</span>
            <span class="tag">Best ${state.match.bestStreak}</span>
            <span class="tag">${state.chaosMode ? "Chaos mode" : "Normal mode"}</span>
          </div>
        `
      : `
          <div class="summary-banner">
            <strong>${toTitleCase(state.phase)}</strong>
            <p class="summary-copy">${state.phaseDescription}</p>
          </div>
          <div class="turn-order">${state.turnOrderNames
            .map((name) => `<span class="tag">${name}</span>`)
            .join("")}</div>
          <p class="summary-copy">${state.currentTable.description}</p>
          <p class="summary-copy">${state.tableEvent?.description ?? "Best 3-card hand wins unless the table says otherwise."}</p>
        `;
  }

  renderEffects(state) {
    const targetingStep = currentTargetStep(this.pendingTargeting);
    this.effectsList.innerHTML = state.activeEffects.length
      ? state.activeEffects
          .map((effect) => `<span class="tag">${effect.label}: ${effect.detail}</span>`)
          .join("")
      : `<span class="tag">${this.pendingTargeting ? `Choosing ${String(targetingStep?.mode ?? this.pendingTargeting.spell.targetMode).replaceAll("-", " ")}` : "No effects in play."}</span>`;
  }

  renderSpells(human, state) {
    this.spellsList.innerHTML = human.spells
      .map((spell) => {
        const accent = SPELL_CATEGORY_COLORS[spell.category] ?? "#ffd84d";
        const disabled =
          spell.used ||
          spell.currentCost > human.mana ||
          state.currentPlayerId !== "human" ||
          state.roundEnded ||
          !state.actionState.canCast;
        const targetingThis = this.pendingTargeting?.spell.id === spell.id;
        const targetPreview = targetingThis
          ? this.describeTargetPreview(state, human, this.pendingTargeting.selection)
          : "";
        const castLabel = spell.used
          ? "Used"
          : targetingThis
            ? "Back"
            : (spell.targetSteps?.length || spell.targetMode)
              ? "Aim"
              : "Cast";

        return `
          <article class="spell-card spell-${slugify(spell.category)} ${targetingThis ? "selected-target" : ""} ${spell.used ? "spent" : ""} ${!disabled ? "affordable" : ""}" style="--spell-accent:${accent}" data-spell-card-id="${spell.id}" ${disabled ? 'aria-disabled="true"' : ""}>
            <div class="spell-page-mark">
              <span class="spell-sigil">${spellSigil(spell.category)}</span>
              <div class="spell-topline">
                <strong>${compactSpellName(spell.name)}</strong>
                <span class="spell-cost">${spell.currentCost} MP</span>
              </div>
            </div>
            ${targetPreview ? `<div class="target-preview">${targetPreview}</div>` : ""}
            <div class="spell-bottomline">
              <span class="card-meta">${spell.category}</span>
              <button data-spell-id="${spell.id}" ${disabled ? "disabled" : ""}>
                ${castLabel}
              </button>
            </div>
            <div class="spell-tooltip">
              <strong>${spell.name}</strong>
              <span>COST ${spell.currentCost} MP${spell.currentCost !== spell.cost ? ` / BASE ${spell.cost}` : ""}</span>
              <span>${spell.category}</span>
              <span>${spell.description}</span>
              ${spell.targetSteps?.length
                ? spell.targetSteps.map((step, index) => `<span>Step ${index + 1}: ${step.prompt}</span>`).join("")
                : spell.targetMode ? `<span>Target ${spell.targetMode.replaceAll("-", " ")}: ${spell.targetPrompt}</span>` : ""}
              ${spell.backfireChance
                ? `<span class="spell-warning">Backfire ${Math.round(spell.backfireChance * 100)}%: ${spell.backfireNote}</span>`
                : ""}
              ${spell.comboTag ? `<span>Combo: ${spell.comboTag}</span>` : ""}
            </div>
          </article>
        `;
      })
      .join("");

    for (const button of this.spellsList.querySelectorAll("button[data-spell-id]")) {
      button.addEventListener("click", () => {
        this.markInteraction();
        this.handleSpellButton(button.dataset.spellId, human);
      });
    }

    for (const card of this.spellsList.querySelectorAll("article[data-spell-card-id]")) {
      card.addEventListener("click", (event) => {
        if (event.target.closest("button")) {
          return;
        }
        const spellId = card.dataset.spellCardId;
        const spell = human.spells.find((entry) => entry.id === spellId);
        if (!spell) {
          return;
        }
        const disabled = spell.used
          || spell.currentCost > human.mana
          || state.currentPlayerId !== "human"
          || state.roundEnded
          || !state.actionState.canCast;
        if (disabled) {
          return;
        }
        this.markInteraction();
        this.handleSpellButton(spellId, human);
      });
    }
  }

  describeTargetPreview(state, human, selection) {
    const parts = [];

    if (selection.playerId) {
      const player = state.players.find((entry) => entry.id === selection.playerId);
      if (player) {
        parts.push(`Target ${player.name}`);
      }
    }

    if (Number.isInteger(selection.handIndex)) {
      const card = human.hand[selection.handIndex];
      parts.push(`Your card ${card ? cardLabel(card) : `slot ${selection.handIndex + 1}`}`);
    }

    if (Number.isInteger(selection.opponentHandIndex)) {
      parts.push(`Their slot ${selection.opponentHandIndex + 1}`);
    }

    if (Number.isInteger(selection.communityIndex)) {
      const card = state.communitySlots[selection.communityIndex];
      parts.push(`Rune ${card && !card.hidden ? cardLabel(card) : selection.communityIndex + 1}`);
    }

    return parts.join(" / ");
  }

  buildSceneTargetPreview(state, human) {
    const selection = this.pendingTargeting?.selection ?? {};
    const step = currentTargetStep(this.pendingTargeting);
    if (!step) {
      return null;
    }

    if (selection.playerId) {
      const player = state.players.find((entry) => entry.id === selection.playerId);
      if (player) {
        return {
          playerId: player.id,
          title: "Target",
          subtitle: player.name,
          accent: "#d98868",
        };
      }
    }

    if (Number.isInteger(selection.communityIndex)) {
      const card = state.communitySlots[selection.communityIndex];
      return {
        communityIndex: selection.communityIndex,
        title: "Rune target",
        subtitle: card && !card.hidden ? cardLabel(card) : `Rune ${selection.communityIndex + 1}`,
        accent: "#8e7bd4",
      };
    }

    if (Number.isInteger(selection.handIndex)) {
      const card = human.hand[selection.handIndex];
      return {
        handIndex: selection.handIndex,
        title: "Your card",
        subtitle: card ? cardLabel(card) : `Slot ${selection.handIndex + 1}`,
        accent: "#d0ab68",
      };
    }

    return {
      title: "Choose target",
      subtitle: step.prompt,
      accent: "#d0ab68",
    };
  }

  handleSpellButton(spellId, human) {
    const spell = human.spells.find((entry) => entry.id === spellId);
    if (!spell) {
      return;
    }

    if (this.pendingTargeting?.spell.id === spellId) {
      this.pendingTargeting = null;
      this.game.notify();
      return;
    }

    if (!spell.targetMode && !spell.targetSteps?.length) {
      this.game.humanCastSpell(spellId);
      return;
    }

    this.pendingTargeting = {
      spell,
      selection: {},
      stepIndex: 0,
    };
    this.game.notify();
  }

  attachTargetListeners() {
    if (!this.pendingTargeting) {
      return;
    }

    const targetingStep = currentTargetStep(this.pendingTargeting);

    if (targetingStep?.mode === "opponent") {
      for (const card of this.playersList.querySelectorAll("[data-player-id]")) {
        card.addEventListener("click", () => {
          const playerId = card.dataset.playerId;
          if (playerId === "human") {
            return;
          }
          this.commitTargetSelection({ playerId });
        });
      }
    }

    if (targetingStep?.mode === "hand") {
      for (const tile of this.handCards.querySelectorAll("[data-hand-index]")) {
        tile.addEventListener("click", () => {
          this.commitTargetSelection({ handIndex: Number(tile.dataset.handIndex) });
        });
      }
    }

    if (targetingStep?.mode === "community") {
      for (const tile of this.communityCards.querySelectorAll("[data-community-index]")) {
        if (tile.classList.contains("targetable")) {
          tile.addEventListener("click", () => {
            this.commitTargetSelection({ communityIndex: Number(tile.dataset.communityIndex) });
          });
        }
      }
    }

    if (targetingStep?.mode === "opponent-hand") {
      for (const tile of this.playersList.querySelectorAll("[data-opponent-player-id][data-opponent-hand-index]")) {
        if (tile.classList.contains("targetable")) {
          tile.addEventListener("click", () => {
            this.commitTargetSelection({
              playerId: tile.dataset.opponentPlayerId,
              opponentHandIndex: Number(tile.dataset.opponentHandIndex),
            });
          });
        }
      }
    }
  }

  commitTargetSelection(selection) {
    const spellId = this.pendingTargeting?.spell.id;
    if (!spellId) {
      return;
    }

    this.pendingTargeting.selection = {
      ...this.pendingTargeting.selection,
      ...selection,
    };

    const targetSteps = this.pendingTargeting.spell.targetSteps ?? [];
    if (targetSteps.length && this.pendingTargeting.stepIndex < targetSteps.length - 1) {
      this.pendingTargeting.stepIndex += 1;
      this.game.notify();
      return;
    }

    const didCast = this.game.humanCastSpell(spellId, this.pendingTargeting.selection);
    if (didCast) {
      this.pendingTargeting = null;
    }
  }

  renderLog(entries) {
    this.logList.innerHTML = entries
      .map(
        (entry) => `
          <article class="log-entry ${entry.category ? `category-${slugify(entry.category)}` : ""}">
            <strong>${entry.title}</strong>
            <div>${entry.message}</div>
            <small>${entry.time}</small>
          </article>
        `,
      )
      .join("");
  }
}

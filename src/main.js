import { chooseAiAction, chooseAiSpell, chooseAiUnoAction } from "./ai.js";
import {
  defaultCustomizationOverrides,
  defaultSelectedTitle,
  COSMETIC_ITEMS,
  defaultEquippedCosmetics,
  defaultOwnedCosmetics,
  getWizardLoadoutFlavor,
  getCosmeticItem,
  isCosmeticUnlocked,
  isTitleUnlocked,
  resolveCustomizationStyleWithOverrides,
  WIZARD_TITLES,
} from "./customization.js";
import { APP_META, BUILD_STAMP, STORAGE_KEYS } from "./config.js";
import { WizardPokerGame } from "./game.js";
import { TableRenderer } from "./rendering.js";
import { UIController } from "./ui.js";

const canvas = document.getElementById("scene");
const floatingTextLayer = document.getElementById("floating-text-layer");
const sceneRenderWarning = document.getElementById("scene-render-warning");
const bootScreen = document.getElementById("boot-screen");
const buildStamp = document.getElementById("build-stamp");
const body = document.body;
const renderer = new TableRenderer(canvas, floatingTextLayer);
const aiTimers = new Set();
let lastFrameTime = 0;
let previousState = null;
let aiSequenceLock = null;
let renderFailureNoted = false;
const playerVoiceStamps = {
  table: null,
  round: null,
  result: null,
};

const AI_LOG_MOOD = {
  bluff: "deception",
  frost: "defense",
  chaos: "chaos",
};

function rankFromBestStreak(bestStreak = 0) {
  if (bestStreak >= 3) {
    return "Licensed Menace";
  }
  if (bestStreak >= 2) {
    return "Table Problem";
  }
  return "Suspicious Visitor";
}

function pickFlavorLine(lines = [], seed = 0) {
  if (!lines.length) {
    return null;
  }
  return lines[Math.abs(seed) % lines.length];
}

function resetPlayerVoiceStamps() {
  playerVoiceStamps.table = null;
  playerVoiceStamps.round = null;
  playerVoiceStamps.result = null;
}

function emitPlayerLoadoutFlavor(previous, state) {
  if (ui.titleVisible || !state.started) {
    return;
  }

  const flavor = getWizardLoadoutFlavor(profile.equippedCosmetics, profile.customizationOverrides);
  const playerName = profile.playerName || "You";

  if (state.currentTable?.id && state.currentTable.id !== previous?.currentTable?.id && !state.roundEnded) {
    const stamp = `${state.gameType}:${state.currentTable.id}:${state.round}`;
    if (playerVoiceStamps.table !== stamp) {
      const line = pickFlavorLine(flavor.tables?.[state.currentTable.id] ?? [], state.round);
      if (line) {
        playerVoiceStamps.table = stamp;
        game.log("Wizard Talk", `${playerName}: ${line}`, flavor.category ?? "deception");
      }
    }
  }

  if (state.round !== previous?.round && !state.roundEnded) {
    const stamp = `${state.gameType}:${state.round}`;
    if (playerVoiceStamps.round !== stamp) {
      const line = pickFlavorLine(flavor.roundStart, state.round);
      if (line) {
        playerVoiceStamps.round = stamp;
        game.log("Wizard Talk", `${playerName}: ${line}`, flavor.category ?? "deception");
      }
    }
  }

  if (state.roundEnded && !previous?.roundEnded) {
    const stamp = `${state.gameType}:${state.round}:${state.humanResult}`;
    if (playerVoiceStamps.result !== stamp) {
      const pool = state.humanResult === "won"
        ? flavor.win
        : state.humanResult === "tied"
          ? flavor.tie
          : flavor.lose;
      const line = pickFlavorLine(pool, state.round + (state.pot ?? 0));
      if (line) {
        playerVoiceStamps.result = stamp;
        game.log("Wizard Talk", `${playerName}: ${line}`, flavor.category ?? "deception");
      }
    }
  }
}

function createDefaultProfile() {
  return {
    storageVersion: APP_META.storageSchemaVersion,
    appVersion: APP_META.version,
    updatedAt: null,
    runsStarted: 0,
    runsCleared: 0,
    dailyRuns: 0,
    chaosRuns: 0,
    doubleRuns: 0,
    totalRoundWins: 0,
    totalRoundLosses: 0,
    totalRoundTies: 0,
    bestStreak: 0,
    playerName: "You",
    selectedTitle: defaultSelectedTitle(),
    lastSeed: "",
    spellCastCounts: {},
    handWinCounts: {},
    gold: 0,
    ownedCosmetics: defaultOwnedCosmetics(),
    equippedCosmetics: defaultEquippedCosmetics(),
    customizationOverrides: defaultCustomizationOverrides(),
    lastClear: null,
  };
}

function createDefaultSettings() {
  return {
    storageVersion: APP_META.storageSchemaVersion,
    appVersion: APP_META.version,
    updatedAt: null,
    uiScale: "normal",
    stableVisuals: false,
    reducedFlash: false,
    soundEnabled: true,
  };
}

function stampStoredRecord(record = {}) {
  return {
    ...record,
    storageVersion: APP_META.storageSchemaVersion,
    appVersion: APP_META.version,
    updatedAt: new Date().toISOString(),
  };
}

function cloneForDev(data) {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return null;
  }
}

function loadProfile() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.profile);
    if (!raw) {
      return createDefaultProfile();
    }
    const parsed = JSON.parse(raw);
    const parsedTitle = typeof parsed.selectedTitle === "string" && parsed.selectedTitle
      ? parsed.selectedTitle
      : defaultSelectedTitle();
    const titleDefinition = WIZARD_TITLES.find((title) => title.id === parsedTitle);
    const selectedTitle = titleDefinition && isTitleUnlocked(titleDefinition, parsed)
      ? parsedTitle
      : defaultSelectedTitle();
    return {
      ...createDefaultProfile(),
      ...parsed,
      spellCastCounts: {
        ...createDefaultProfile().spellCastCounts,
        ...(parsed.spellCastCounts ?? {}),
      },
      handWinCounts: {
        ...createDefaultProfile().handWinCounts,
        ...(parsed.handWinCounts ?? {}),
      },
      playerName: typeof parsed.playerName === "string" && parsed.playerName.trim()
        ? parsed.playerName.trim().slice(0, 20)
        : "You",
      selectedTitle,
      ownedCosmetics: Array.isArray(parsed.ownedCosmetics) ? parsed.ownedCosmetics : defaultOwnedCosmetics(),
      equippedCosmetics: {
        ...defaultEquippedCosmetics(),
        ...(parsed.equippedCosmetics ?? {}),
      },
      customizationOverrides: {
        ...defaultCustomizationOverrides(),
        ...(parsed.customizationOverrides ?? {}),
      },
    };
  } catch {
    return createDefaultProfile();
  }
}

function loadSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) {
      return createDefaultSettings();
    }
    return {
      ...createDefaultSettings(),
      ...JSON.parse(raw),
    };
  } catch {
    return createDefaultSettings();
  }
}

function saveProfile(profile) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(stampStoredRecord(profile)));
  } catch {}
}

const profile = loadProfile();
const settings = loadSettings();
renderer.setCustomizationStyle(resolveCustomizationStyleWithOverrides(profile.equippedCosmetics, profile.customizationOverrides));

function currentProfileStyle() {
  return {
    equippedCosmetics: profile.equippedCosmetics ?? {},
    customizationOverrides: profile.customizationOverrides ?? {},
    selectedTitle: profile.selectedTitle ?? defaultSelectedTitle(),
  };
}

function saveSettings(settingsState) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(stampStoredRecord(settingsState)));
  } catch {}
}

function loadSavedRun() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.run);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed?.snapshot ?? parsed;
  } catch {
    return null;
  }
}

function saveRun(snapshot) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.run, JSON.stringify(stampStoredRecord(snapshot)));
  } catch {}
}

function clearSavedRun() {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.run);
  } catch {}
}

function setSceneRenderWarning(message = "") {
  if (!sceneRenderWarning) {
    return;
  }
  if (!message) {
    sceneRenderWarning.classList.add("hidden");
    sceneRenderWarning.textContent = "";
    return;
  }
  sceneRenderWarning.textContent = message;
  sceneRenderWarning.classList.remove("hidden");
}

let savedRun = loadSavedRun();

function currentDateLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateRoundGold(state) {
  let gold = 0;
  if (state.humanResult === "won") {
    gold += state.gameType === "uno" ? 10 : 12;
  } else if (state.humanResult === "tied") {
    gold += 4;
  }
  if (state.runCleared) {
    gold += 28;
  }
  if (state.doubleOrNothing && state.humanResult === "won") {
    gold += 6;
  }
  return gold;
}

function createAudioHooks() {
  let context = null;
  let masterGain = null;
  let noiseBuffer = null;
  let muted = false;

  function ensureContext() {
    if (!window.AudioContext) {
      return null;
    }

    if (!context) {
      context = new window.AudioContext();
      masterGain = context.createGain();
      masterGain.gain.value = 0.72;
      masterGain.connect(context.destination);
    }

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    return context;
  }

  function outputNode() {
    const ctx = ensureContext();
    if (!ctx || !masterGain) {
      return null;
    }
    return masterGain;
  }

  function ensureNoiseBuffer() {
    const ctx = ensureContext();
    if (!ctx) {
      return null;
    }
    if (!noiseBuffer) {
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) {
        data[index] = Math.random() * 2 - 1;
      }
    }
    return noiseBuffer;
  }

  function beep({
    frequency = 440,
    time = 0,
    duration = 0.08,
    type = "square",
    gainValue = 0.035,
    detune = 0,
  }) {
    const ctx = ensureContext();
    const destination = outputNode();
    if (!ctx || !destination) {
      return;
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + time);
    gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(ctx.currentTime + time);
    oscillator.stop(ctx.currentTime + time + duration + 0.03);
  }

  function hiss({
    time = 0,
    duration = 0.06,
    gainValue = 0.018,
    cutoff = 1400,
  }) {
    const ctx = ensureContext();
    const destination = outputNode();
    const buffer = ensureNoiseBuffer();
    if (!ctx || !destination || !buffer) {
      return;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + time);
    gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(ctx.currentTime + time);
    source.stop(ctx.currentTime + time + duration + 0.03);
  }

  const patterns = {
    boot() {
      [
        { frequency: 440, time: 0, duration: 0.09 },
        { frequency: 660, time: 0.12, duration: 0.09 },
        { frequency: 520, time: 0.26, duration: 0.18 },
      ].forEach(beep);
    },
    start() {
      [
        { frequency: 320, time: 0, duration: 0.06, gainValue: 0.04 },
        { frequency: 480, time: 0.08, duration: 0.06, gainValue: 0.04 },
        { frequency: 720, time: 0.16, duration: 0.1, gainValue: 0.05 },
      ].forEach(beep);
    },
    click() {
      beep({ frequency: 520, duration: 0.05, gainValue: 0.02 });
    },
    deal() {
      [
        { frequency: 180, time: 0, duration: 0.025, type: "triangle", gainValue: 0.022 },
        { frequency: 150, time: 0.03, duration: 0.02, type: "triangle", gainValue: 0.018 },
      ].forEach(beep);
      hiss({ time: 0, duration: 0.035, gainValue: 0.012, cutoff: 1800 });
    },
    reveal() {
      [
        { frequency: 360, time: 0, duration: 0.04, type: "triangle", gainValue: 0.022 },
        { frequency: 460, time: 0.04, duration: 0.05, type: "triangle", gainValue: 0.024 },
      ].forEach(beep);
      hiss({ time: 0, duration: 0.045, gainValue: 0.01, cutoff: 2200 });
    },
    chip() {
      [
        { frequency: 760, time: 0, duration: 0.025, type: "square", gainValue: 0.016 },
        { frequency: 920, time: 0.018, duration: 0.022, type: "square", gainValue: 0.014 },
      ].forEach(beep);
    },
    raise() {
      [
        { frequency: 420, time: 0, duration: 0.03, type: "square", gainValue: 0.018 },
        { frequency: 620, time: 0.028, duration: 0.04, type: "square", gainValue: 0.018 },
        { frequency: 860, time: 0.07, duration: 0.05, type: "triangle", gainValue: 0.02 },
      ].forEach(beep);
    },
    fold() {
      [
        { frequency: 210, time: 0, duration: 0.05, type: "triangle", gainValue: 0.02 },
        { frequency: 150, time: 0.05, duration: 0.07, type: "triangle", gainValue: 0.018 },
      ].forEach(beep);
      hiss({ time: 0, duration: 0.05, gainValue: 0.012, cutoff: 900 });
    },
    phase() {
      [
        { frequency: 260, time: 0, duration: 0.05, type: "triangle", gainValue: 0.025 },
        { frequency: 390, time: 0.06, duration: 0.06, type: "triangle", gainValue: 0.025 },
      ].forEach(beep);
    },
    spell() {
      [
        { frequency: 540, time: 0, duration: 0.05, gainValue: 0.02 },
        { frequency: 760, time: 0.05, duration: 0.07, gainValue: 0.024 },
      ].forEach(beep);
    },
    impact() {
      [
        { frequency: 140, time: 0, duration: 0.05, type: "square", gainValue: 0.04 },
        { frequency: 90, time: 0.04, duration: 0.08, type: "square", gainValue: 0.035 },
      ].forEach(beep);
    },
    roundEnd() {
      [
        { frequency: 660, time: 0, duration: 0.06, type: "triangle", gainValue: 0.03 },
        { frequency: 520, time: 0.08, duration: 0.08, type: "triangle", gainValue: 0.03 },
        { frequency: 390, time: 0.18, duration: 0.14, type: "triangle", gainValue: 0.035 },
      ].forEach(beep);
    },
    turn() {
      beep({ frequency: 880, duration: 0.05, type: "triangle", gainValue: 0.02 });
    },
    showdown() {
      [
        { frequency: 260, time: 0, duration: 0.05, type: "triangle", gainValue: 0.02 },
        { frequency: 320, time: 0.06, duration: 0.06, type: "triangle", gainValue: 0.022 },
        { frequency: 410, time: 0.14, duration: 0.08, type: "triangle", gainValue: 0.024 },
      ].forEach(beep);
    },
    tableBackroom() {
      [
        { frequency: 246, time: 0, duration: 0.06, type: "triangle", gainValue: 0.022 },
        { frequency: 329, time: 0.08, duration: 0.08, type: "triangle", gainValue: 0.02 },
      ].forEach(beep);
    },
    tableCasino() {
      [
        { frequency: 392, time: 0, duration: 0.05, type: "square", gainValue: 0.02 },
        { frequency: 523, time: 0.06, duration: 0.06, type: "triangle", gainValue: 0.022 },
        { frequency: 659, time: 0.14, duration: 0.07, type: "triangle", gainValue: 0.024 },
      ].forEach(beep);
    },
    tableAudit() {
      [
        { frequency: 220, time: 0, duration: 0.07, type: "triangle", gainValue: 0.02 },
        { frequency: 277, time: 0.09, duration: 0.08, type: "triangle", gainValue: 0.02 },
        { frequency: 330, time: 0.18, duration: 0.09, type: "triangle", gainValue: 0.022 },
      ].forEach(beep);
    },
    win() {
      [
        { frequency: 520, time: 0, duration: 0.06, type: "triangle", gainValue: 0.028 },
        { frequency: 660, time: 0.08, duration: 0.08, type: "triangle", gainValue: 0.03 },
        { frequency: 880, time: 0.18, duration: 0.12, type: "triangle", gainValue: 0.032 },
      ].forEach(beep);
    },
    lose() {
      [
        { frequency: 360, time: 0, duration: 0.05, type: "triangle", gainValue: 0.02 },
        { frequency: 280, time: 0.06, duration: 0.06, type: "triangle", gainValue: 0.018 },
        { frequency: 190, time: 0.14, duration: 0.08, type: "triangle", gainValue: 0.016 },
      ].forEach(beep);
    },
  };

  return {
    unlock() {
      ensureContext();
    },
    setMuted(value) {
      muted = Boolean(value);
    },
    play(name) {
      if (muted) {
        return;
      }
      patterns[name]?.();
    },
  };
}

const audio = createAudioHooks();
audio.setMuted(!settings.soundEnabled);

function clearAiTimers() {
  for (const timer of aiTimers) {
    window.clearTimeout(timer);
  }
  aiTimers.clear();
}

function queueAiStep(callback, delay) {
  const timer = window.setTimeout(() => {
    aiTimers.delete(timer);
    callback();
  }, delay);
  aiTimers.add(timer);
}

const game = new WizardPokerGame({
  onStateChange: (state) => {
    const previousHistoryLength = previousState?.spellHistory?.length ?? 0;
    if (state.spellHistory?.length > previousHistoryLength) {
      state.spellHistory.slice(previousHistoryLength).forEach((entry) => {
        if (entry.casterId !== "human") {
          return;
        }
        profile.spellCastCounts[entry.name] = (profile.spellCastCounts[entry.name] ?? 0) + 1;
      });
      saveProfile(profile);
      ui.setProfileStats(profile);
    }
    ui.render(state);
    renderer.update(state);
    handleAudioFromStateChange(previousState, state);
    emitPlayerLoadoutFlavor(previousState, state);
    if (state.started && !state.runCleared && !state.runFailed) {
      savedRun = game.exportSaveState();
      saveRun(savedRun);
      ui.setResumeAvailable(savedRun);
    } else if ((state.runCleared || state.runFailed) && state.roundEnded) {
      clearSavedRun();
      savedRun = null;
      ui.setResumeAvailable(null);
    }
    if (aiSequenceLock && (state.roundEnded || state.currentPlayerId !== aiSequenceLock)) {
      aiSequenceLock = null;
    }
    scheduleAiTurn(state, previousState);
    previousState = state;
  },
});

game.setProfileStyle(currentProfileStyle());

const ui = new UIController({
  game,
  renderer,
  onStartMatch: ({ seed, chaosMode, doubleOrNothing, loadoutId, debugMode, dailyMode, gameType }) => {
    audio.unlock();
    audio.play("start");
    const selectedSeed = dailyMode ? currentDateLabel() : seed;
    game.setSeed(selectedSeed);
    game.setGameType(gameType);
    game.setDailyChallenge(dailyMode ? currentDateLabel() : null);
    game.setChaosMode(chaosMode);
    game.setDoubleOrNothing(doubleOrNothing);
    game.setStarterLoadout(loadoutId);
    game.setDebugMode(debugMode);
    game.setHumanPlayerName(profile.playerName);
    game.setProfileStyle(currentProfileStyle());
    ui.prepareForNewMatch({
      seed: game.state.seedLabel,
      gameType,
      chaosMode,
      doubleOrNothing,
      loadoutId,
      debugMode,
      dailyMode,
    });
    ui.showTutorial(false);
    ui.showTitleScreen(false);
    previousState = null;
    profile.runsStarted += 1;
    profile.lastSeed = game.state.seedLabel;
    profile.bestStreak = Math.max(profile.bestStreak, game.state.bestHumanWinStreak ?? 0);
    if (dailyMode) {
      profile.dailyRuns += 1;
    }
    if (chaosMode) {
      profile.chaosRuns += 1;
    }
    if (doubleOrNothing) {
      profile.doubleRuns += 1;
    }
    saveProfile(profile);
    ui.setProfileStats(profile);
    clearSavedRun();
    savedRun = null;
    ui.setResumeAvailable(null);
    game.startGame({ resetMatch: true });
  },
  onBuyCosmetic: (itemId, priceOverride = null) => {
    const item = getCosmeticItem(itemId);
    if (!item) {
      return false;
    }
    const effectivePrice = Number.isFinite(priceOverride) && priceOverride >= 0
      ? Math.floor(priceOverride)
      : item.price;
    if (!isCosmeticUnlocked(item, profile) || (profile.ownedCosmetics ?? []).includes(itemId) || profile.gold < effectivePrice) {
      return false;
    }
    profile.gold -= effectivePrice;
    profile.ownedCosmetics = [...new Set([...(profile.ownedCosmetics ?? []), itemId])];
    saveProfile(profile);
    game.setProfileStyle(currentProfileStyle());
    ui.setProfileStats(profile);
    return true;
  },
  onRenameWizard: (nextName) => {
    const cleaned = String(nextName ?? "").trim().slice(0, 20);
    profile.playerName = cleaned || "You";
    saveProfile(profile);
    game.setHumanPlayerName(profile.playerName);
    ui.setProfileStats(profile);
    return true;
  },
  onSelectTitle: (titleId) => {
    const nextTitle = WIZARD_TITLES.find((title) => title.id === titleId);
    profile.selectedTitle = isTitleUnlocked(nextTitle, profile) ? (titleId || defaultSelectedTitle()) : defaultSelectedTitle();
    saveProfile(profile);
    game.setProfileStyle(currentProfileStyle());
    ui.setProfileStats(profile);
    return true;
  },
  onEquipCosmetic: (itemId) => {
    const item = getCosmeticItem(itemId);
    if (!item || !(profile.ownedCosmetics ?? []).includes(itemId)) {
      return false;
    }
    profile.equippedCosmetics = {
      ...defaultEquippedCosmetics(),
      ...(profile.equippedCosmetics ?? {}),
      [item.slot]: itemId,
    };
    saveProfile(profile);
    renderer.setCustomizationStyle(resolveCustomizationStyleWithOverrides(profile.equippedCosmetics, profile.customizationOverrides));
    game.setProfileStyle(currentProfileStyle());
    ui.setProfileStats(profile);
    return true;
  },
  onUpdateCustomization: (nextOverrides) => {
    profile.customizationOverrides = {
      ...defaultCustomizationOverrides(),
      ...(profile.customizationOverrides ?? {}),
      ...(nextOverrides ?? {}),
    };
    saveProfile(profile);
    renderer.setCustomizationStyle(resolveCustomizationStyleWithOverrides(profile.equippedCosmetics, profile.customizationOverrides));
    game.setProfileStyle(currentProfileStyle());
    ui.setProfileStats(profile);
    return true;
  },
  onResumeRun: () => {
    if (!savedRun) {
      return;
    }
    audio.unlock();
    audio.play("start");
    clearAiTimers();
    aiSequenceLock = null;
    resetPlayerVoiceStamps();
    ui.showTutorial(false);
    ui.showTitleScreen(false);
    previousState = null;
    game.loadSaveState(savedRun);
    game.setProfileStyle(currentProfileStyle());
    game.setHumanPlayerName(profile.playerName);
  },
  onReturnToTitle: () => {
    clearAiTimers();
    aiSequenceLock = null;
    resetPlayerVoiceStamps();
    previousState = null;
  },
  onResetRun: () => {
    clearAiTimers();
    aiSequenceLock = null;
    resetPlayerVoiceStamps();
    previousState = null;
    clearSavedRun();
    savedRun = null;
    ui.setResumeAvailable(null);
    game.startGame({ resetMatch: true });
  },
  onUserInteraction: () => {
    audio.unlock();
    audio.play("click");
  },
  onPresentationChange: ({ stableVisuals, reducedFlash, uiScale, soundEnabled }) => {
    renderer.setPresentationSettings({ stableVisuals, reducedFlash });
    body.classList.toggle("reduced-flash", Boolean(reducedFlash));
    body.dataset.uiScale = uiScale || "normal";
    settings.stableVisuals = Boolean(stableVisuals);
    settings.reducedFlash = Boolean(reducedFlash);
    settings.uiScale = uiScale || "normal";
    settings.soundEnabled = Boolean(soundEnabled);
    audio.setMuted(!settings.soundEnabled);
    saveSettings(settings);
  },
});

ui.setProfileStats(profile);
ui.setPersistentSettings(settings);
ui.setResumeAvailable(savedRun);

function handleAudioFromStateChange(previous, state) {
  if (ui.titleVisible) {
    return;
  }

  if (!previous) {
    return;
  }

  if (state.round !== previous.round || state.phase !== previous.phase) {
    audio.play("phase");
  }

  const previousTopLog = previous.logEntries[0];
  const currentTopLog = state.logEntries[0];
  const logChanged = currentTopLog
    && (
      currentTopLog.title !== previousTopLog?.title
      || currentTopLog.message !== previousTopLog?.message
      || currentTopLog.time !== previousTopLog?.time
    );

  if (logChanged) {
    const title = currentTopLog.title;
    if (title === "Call" || title === "Check") {
      audio.play("chip");
    } else if (title === "Raise") {
      audio.play("raise");
    } else if (title === "Fold") {
      audio.play("fold");
    } else if (title === "Showdown") {
      audio.play("showdown");
    } else if (
      title === "Arcane Ante"
      || title === "Round Start"
    ) {
      audio.play("deal");
    } else if (
      title === "First Rune"
      || title === "Second Rune"
      || title === "Final Rune"
    ) {
      audio.play("reveal");
    } else if (title === "Pot Claimed") {
      audio.play("win");
    }
  }

  if (state.currentPlayerId === "human" && previous.currentPlayerId !== "human" && !state.roundEnded) {
    audio.play("turn");
  }

  if (state.currentTable?.id && state.currentTable.id !== previous.currentTable?.id) {
    if (state.currentTable.id === "backroom-tavern") {
      audio.play("tableBackroom");
    } else if (state.currentTable.id === "crooked-casino") {
      audio.play("tableCasino");
    } else if (state.currentTable.id === "audit-chamber") {
      audio.play("tableAudit");
    }
  }

  if (state.spellFxEvents.length > previous.spellFxEvents.length) {
    const latest = state.spellFxEvents[state.spellFxEvents.length - 1];
    audio.play(latest?.impact ? "impact" : "spell");
  }

  if (state.roundEnded && !previous.roundEnded) {
    const roundGold = calculateRoundGold(state);
    if (state.humanResult === "won") {
      profile.totalRoundWins += 1;
    } else if (state.humanResult === "tied") {
      profile.totalRoundTies += 1;
    } else if (state.humanResult === "lost" || state.humanResult === "folded") {
      profile.totalRoundLosses += 1;
    }
    if (state.humanResult === "won" || state.humanResult === "tied") {
      const handLabel = state.humanEvaluation?.label;
      if (handLabel) {
        profile.handWinCounts[handLabel] = (profile.handWinCounts[handLabel] ?? 0) + 1;
      }
    }
    profile.bestStreak = Math.max(profile.bestStreak, state.match.bestStreak ?? 0);
    if (state.runCleared && !previous.runCleared) {
      profile.runsCleared += 1;
      profile.lastClear = {
        rank: rankFromBestStreak(state.match.bestStreak ?? 0),
        bestStreak: state.match.bestStreak ?? 0,
        pot: state.pot,
        winners: (state.lastRoundSummary?.winners ?? []).map((winner) => winner.name),
      };
    }
    profile.gold = (profile.gold ?? 0) + roundGold;
    saveProfile(profile);
    ui.setProfileStats(profile);
    audio.play("roundEnd");
    const human = state.players.find((player) => player.id === "human");
    if (human?.roundResult === "won") {
      audio.play("win");
    } else if (human?.roundResult === "lost" || human?.roundResult === "folded") {
      audio.play("lose");
    }
  }

}

function scheduleAiTurn(state, previous) {
  clearAiTimers();

  if (aiSequenceLock && state.currentPlayerId === aiSequenceLock && !state.roundEnded) {
    return;
  }

  if (ui.titleVisible || state.roundEnded || !state.currentPlayerId || state.currentPlayerId === "human") {
    return;
  }

  const phaseChanged = previous && (state.round !== previous.round || state.phase !== previous.phase);
  const turnChanged = previous && state.currentPlayerId !== previous.currentPlayerId;
  const openingDelay = phaseChanged ? 980 : turnChanged ? 720 : 560;

  queueAiStep(() => {
    const player = game.getCurrentPlayer();
    if (!player || player.id === "human" || ui.titleVisible) {
      return;
    }

    if (state.gameType === "uno") {
      const action = chooseAiUnoAction(game, player);
      if (action.read) {
        game.log("AI Read", action.read, action.category ?? "economy");
      }
      aiSequenceLock = player.id;
      queueAiStep(() => {
        const actingPlayer = game.getCurrentPlayer();
        if (!actingPlayer || actingPlayer.id !== player.id || ui.titleVisible) {
          aiSequenceLock = null;
          return;
        }
        if (action.bark) {
          game.log("Wizard Talk", `${player.name}: ${action.bark}`, AI_LOG_MOOD[player.personality] ?? "deception");
        }
        if (action.type === "play") {
          game.performUnoAction(player.id, "play", { handIndex: action.index, chosenColor: action.chosenColor ?? null });
        } else {
          game.performUnoAction(player.id, action.type);
        }
        aiSequenceLock = null;
      }, 180);
      return;
    }

    const spellDecision = chooseAiSpell(game, player);
    if (spellDecision) {
      if (spellDecision.read) {
        game.log("AI Read", spellDecision.read, spellDecision.category);
      }
      aiSequenceLock = player.id;
      queueAiStep(() => {
        const livePlayer = game.getCurrentPlayer();
        if (!livePlayer || livePlayer.id !== player.id || ui.titleVisible) {
          aiSequenceLock = null;
          return;
        }

        if (spellDecision.bark) {
          game.log("Wizard Talk", `${player.name}: ${spellDecision.bark}`, AI_LOG_MOOD[player.personality] ?? spellDecision.category);
        }
        game.castSpell(player.id, spellDecision.spell.id, spellDecision.selected);

        queueAiStep(() => {
          const actingPlayer = game.getCurrentPlayer();
          if (!actingPlayer || actingPlayer.id !== player.id || ui.titleVisible) {
            aiSequenceLock = null;
            return;
          }

          const action = chooseAiAction(game, player);
          if (action.read) {
            game.log("AI Read", action.read, action.category ?? "economy");
          }
          if (action.bark) {
            game.log("Wizard Talk", `${player.name}: ${action.bark}`, AI_LOG_MOOD[player.personality] ?? "deception");
          }
          game.performAction(player.id, action.type);
        }, 420);
      }, 260);
      return;
    }

    const action = chooseAiAction(game, player);
    if (action.read) {
      game.log("AI Read", action.read, action.category ?? "economy");
    }
    aiSequenceLock = player.id;
    queueAiStep(() => {
      const actingPlayer = game.getCurrentPlayer();
      if (!actingPlayer || actingPlayer.id !== player.id || ui.titleVisible) {
        aiSequenceLock = null;
        return;
      }
      if (action.bark) {
        game.log("Wizard Talk", `${player.name}: ${action.bark}`, AI_LOG_MOOD[player.personality] ?? "deception");
      }
      game.performAction(player.id, action.type);
    }, 180);
  }, openingDelay);
}

function bootSequence() {
  audio.play("boot");
  window.setTimeout(() => {
    bootScreen.classList.add("hidden");
    ui.showTitleScreen(true);
    ui.render(game.getVisibleState());
  }, 2000);
}

function attachDevSurface() {
  window.wizardTableDev = {
    app: APP_META,
    game,
    ui,
    renderer,
    audio,
    getVisibleState: () => cloneForDev(game.getVisibleState()),
    getInternalState: () => cloneForDev(game.state),
    getProfile: () => cloneForDev(profile),
    getSettings: () => cloneForDev(settings),
    getSavedRun: () => cloneForDev(loadSavedRun()),
    saveCurrentRun: () => {
      const snapshot = game.exportSaveState();
      savedRun = snapshot;
      saveRun(snapshot);
      ui.setResumeAvailable(savedRun);
      return cloneForDev(snapshot);
    },
    clearSavedRun: () => {
      clearSavedRun();
      savedRun = null;
      ui.setResumeAvailable(null);
    },
    refreshUi: () => ui.render(game.getVisibleState()),
  };
}

function tick(now) {
  window.requestAnimationFrame(tick);
  if (now - lastFrameTime < 1000 / 30) {
    return;
  }
  lastFrameTime = now;
  try {
    renderer.animate();
    if (renderFailureNoted) {
      renderFailureNoted = false;
      body.classList.remove("render-failed");
    }
    setSceneRenderWarning("");
  } catch (error) {
    if (!renderFailureNoted) {
      renderFailureNoted = true;
      body.classList.add("render-failed");
      setSceneRenderWarning("The live 3D table hit a render problem. Refresh once. If it stays like this, open the console and send the error.");
      console.error("Arcane Table render loop failed:", error);
    }
  }
}

ui.showTitleScreen(true);
ui.showTutorial(false);
ui.hideRoundSummary();
renderer.setPresentationSettings({ stableVisuals: settings.stableVisuals, reducedFlash: settings.reducedFlash });
body.classList.toggle("reduced-flash", Boolean(settings.reducedFlash));
body.dataset.uiScale = settings.uiScale || "normal";
body.dataset.appVersion = APP_META.version;
if (buildStamp) {
  buildStamp.textContent = `${APP_META.collectionName} build ${BUILD_STAMP}`;
}
ui.render(game.getVisibleState());
attachDevSurface();
window.requestAnimationFrame(tick);
bootSequence();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearAiTimers();
    aiSequenceLock = null;
    delete window.wizardTableDev;
  });
}

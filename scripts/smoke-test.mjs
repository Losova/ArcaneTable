import assert from "node:assert/strict";

import { chooseAiAction, chooseAiSpell, chooseAiUnoAction } from "../src/ai.js";
import { WizardPokerGame } from "../src/game.js";

function createGame({ seed, gameType = "poker", chaosMode = false, doubleOrNothing = false } = {}) {
  const game = new WizardPokerGame({ seed });
  game.setGameType(gameType);
  game.setChaosMode(chaosMode);
  game.setDoubleOrNothing(doubleOrNothing);
  game.setHumanPlayerName("Test Wizard");
  return game;
}

function confirmOpeningDraftIfNeeded(game) {
  const draft = game.state.pendingSpellDraft;
  if (!draft?.choices?.length) {
    return false;
  }
  const picks = draft.choices.slice(0, draft.keep).map((choice) => choice.id);
  assert.equal(picks.length, draft.keep, "opening spell draft should offer enough spells");
  return game.confirmOpeningSpellDraft(picks);
}

function humanPokerTurn(game) {
  const player = game.getCurrentPlayer();
  assert(player && player.id === "human", "human poker turn expected");
  const callAmount = Math.max(0, game.state.currentBet - player.phaseContribution);
  const canRaise = player.stack - callAmount >= game.state.raiseAmount;

  if (callAmount === 0 && canRaise && game.state.round === 1 && game.state.phaseIndex === 0) {
    return game.performAction(player.id, "raise");
  }

  if (callAmount >= Math.max(5, Math.floor(player.stack * 0.5))) {
    return game.performAction(player.id, "fold");
  }

  return game.performAction(player.id, "check");
}

function aiPokerTurn(game) {
  const player = game.getCurrentPlayer();
  assert(player && player.id !== "human", "AI poker turn expected");

  const spellDecision = chooseAiSpell(game, player);
  if (spellDecision) {
    game.castSpell(player.id, spellDecision.spell.id, spellDecision.selected);
  }

  const action = chooseAiAction(game, player);
  return game.performAction(player.id, action.type);
}

function chooseHumanUnoCard(game, player) {
  const playable = player.hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => game.canPlayUnoCard(card));

  if (!playable.length) {
    return null;
  }

  const nonWild = playable.find(({ card }) => !game.needsUnoColorChoice(card));
  return nonWild ?? playable[0];
}

function humanUnoTurn(game) {
  const player = game.getCurrentPlayer();
  assert(player && player.id === "human", "human uno turn expected");
  const playable = chooseHumanUnoCard(game, player);

  if (playable) {
    return game.performUnoAction(player.id, "play", {
      handIndex: playable.index,
      chosenColor: game.needsUnoColorChoice(playable.card) ? game.chooseUnoColor(player) : null,
    });
  }

  if (!game.state.unoHasDrawnThisTurn) {
    return game.performUnoAction(player.id, "draw");
  }

  return game.performUnoAction(player.id, "pass");
}

function aiUnoTurn(game) {
  const player = game.getCurrentPlayer();
  assert(player && player.id !== "human", "AI uno turn expected");
  const action = chooseAiUnoAction(game, player);

  if (action.type === "play") {
    return game.performUnoAction(player.id, "play", {
      handIndex: action.index,
      chosenColor: action.chosenColor ?? null,
    });
  }

  return game.performUnoAction(player.id, action.type);
}

function playOneTurn(game) {
  assert(!game.state.roundEnded, "round should still be active");
  const player = game.getCurrentPlayer();
  assert(player, "current player should exist while a round is active");

  if (game.state.gameType === "uno") {
    return player.id === "human" ? humanUnoTurn(game) : aiUnoTurn(game);
  }

  return player.id === "human" ? humanPokerTurn(game) : aiPokerTurn(game);
}

function playUntilRoundEnd(game, { maxSteps = 400 } = {}) {
  let steps = 0;
  while (!game.state.roundEnded) {
    assert(steps < maxSteps, `round exceeded ${maxSteps} actions`);
    const acted = playOneTurn(game);
    assert.equal(acted, true, "every simulated turn should resolve");
    steps += 1;
  }
  return steps;
}

function resumeIntoNewGame(game) {
  const snapshot = game.exportSaveState();
  const resumed = createGame({
    seed: snapshot.seed,
    gameType: snapshot.state?.gameType ?? "poker",
    chaosMode: snapshot.state?.chaosMode ?? false,
    doubleOrNothing: snapshot.state?.doubleOrNothing ?? false,
  });
  const loaded = resumed.loadSaveState(snapshot);
  assert.equal(loaded, true, "save state should load");
  return resumed;
}

function runPokerScenario({ seed, chaosMode = false, doubleOrNothing = false } = {}) {
  const game = createGame({ seed, gameType: "poker", chaosMode, doubleOrNothing });
  game.startGame({ resetMatch: true });

  assert(game.state.pendingSpellDraft, "fresh poker run should open with a spell draft");
  assert.equal(confirmOpeningDraftIfNeeded(game), true, "opening spell draft should confirm");
  assert.equal(game.state.round, 1, "poker should enter round one after the draft");
  assert.equal(game.state.roundEnded, false, "poker round one should start active");

  const firstRoundSteps = playUntilRoundEnd(game, { maxSteps: 260 });
  assert(game.state.lastRoundSummary, "poker round should produce a summary");

  if (game.state.pendingRelicDraft?.choices?.length) {
    const chosen = game.state.pendingRelicDraft.choices[0];
    assert.equal(game.chooseRelic(chosen.id), true, "relic choice should resolve");
  }

  game.startGame();
  assert.equal(game.state.round, 2, "poker should enter round two");

  for (let index = 0; index < 10 && !game.state.roundEnded; index += 1) {
    const acted = playOneTurn(game);
    assert.equal(acted, true, "mid-round poker actions should resolve before save");
  }

  const resumed = resumeIntoNewGame(game);
  const resumedSteps = playUntilRoundEnd(resumed, { maxSteps: 260 });
  assert(resumed.state.lastRoundSummary, "resumed poker round should still finish cleanly");

  return {
    seed,
    firstRoundSteps,
    resumedSteps,
    result: resumed.state.lastRoundSummary?.humanResult ?? null,
  };
}

function runUnoScenario({ seed, chaosMode = false, doubleOrNothing = false } = {}) {
  const game = createGame({ seed, gameType: "uno", chaosMode, doubleOrNothing });
  game.startGame({ resetMatch: true });

  assert.equal(game.state.pendingSpellDraft, null, "uno should not open with the poker spell draft");
  assert.equal(game.state.round, 1, "uno should enter round one immediately");
  assert.equal(game.state.roundEnded, false, "uno round one should start active");
  assert(game.state.unoModifier, "uno should roll a cursed rule");

  const firstRoundSteps = playUntilRoundEnd(game, { maxSteps: 320 });
  assert(game.state.lastRoundSummary, "uno round should produce a summary");

  game.startGame();
  assert.equal(game.state.round, 2, "uno should enter round two");

  for (let index = 0; index < 12 && !game.state.roundEnded; index += 1) {
    const acted = playOneTurn(game);
    assert.equal(acted, true, "mid-round uno actions should resolve before save");
  }

  const resumed = resumeIntoNewGame(game);
  const resumedSteps = playUntilRoundEnd(resumed, { maxSteps: 320 });
  assert(resumed.state.lastRoundSummary, "resumed uno round should still finish cleanly");

  return {
    seed,
    firstRoundSteps,
    resumedSteps,
    result: resumed.state.lastRoundSummary?.humanResult ?? null,
    modifier: resumed.state.unoModifier?.id ?? null,
  };
}

function main() {
  const pokerRuns = [
    runPokerScenario({ seed: "v1-poker-smoke" }),
    runPokerScenario({ seed: "v1-poker-chaos", chaosMode: true, doubleOrNothing: true }),
  ];
  const unoRuns = [
    runUnoScenario({ seed: "v1-uno-smoke" }),
    runUnoScenario({ seed: "v1-uno-chaos", chaosMode: true }),
  ];

  console.log("Smoke tests passed.");
  console.table({
    poker_default: pokerRuns[0],
    poker_chaos: pokerRuns[1],
    uno_default: unoRuns[0],
    uno_chaos: unoRuns[1],
  });
}

main();

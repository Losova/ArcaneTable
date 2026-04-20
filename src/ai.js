const AI_PROFILES = {
  bluff: {
    reactionCategory: "deception",
    spellChance: 0.72,
    reserveMana: 0,
    preferredSpells: [
      "fake-news",
      "trust-fallacy",
      "not-my-problem",
      "wrong-pot",
      "oops-all-aces",
      "tax-season",
    ],
    lines: {
      spell: [
        "\"Watch closely. Or don't. Same result.\"",
        "\"If this looks illegal, you're finally paying attention.\"",
        "\"Confidence first. Rules eventually.\"",
      ],
      raise: [
        "\"Let's make this disrespectfully expensive.\"",
        "\"Bigger pot. Bigger legend.\"",
        "\"You can fold now and save us all some time.\"",
      ],
      call: [
        "\"I'm in. Your fear is doing most of the work.\"",
        "\"Call. Dramatic pause included at no charge.\"",
      ],
      check: [
        "\"I'll let the table embarrass itself first.\"",
        "\"Check. Suspiciously.\"",
      ],
      fold: [
        "\"I'm folding because subtlety is underrated.\"",
        "\"You win this scene. Not the season.\"",
      ],
    },
  },
  frost: {
    reactionCategory: "defense",
    spellChance: 0.48,
    reserveMana: 2,
    preferredSpells: [
      "return-to-sender",
      "mana-laundering",
      "tax-season",
      "blind-faith",
      "lol-no",
      "this-is-fine",
    ],
    lines: {
      spell: [
        "\"A modest correction to table efficiency.\"",
        "\"This is preventative maintenance.\"",
        "\"Waste has been identified and will be removed.\"",
      ],
      raise: [
        "\"The numbers support a raise.\"",
        "\"Expected value has improved. Continue.\"",
      ],
      call: [
        "\"Call. The variance is tolerable.\"",
        "\"I'll pay the minimum required to stay annoyed.\"",
      ],
      check: [
        "\"Check. We are conserving both chips and nonsense.\"",
        "\"No raise. The spreadsheet remains calm.\"",
      ],
      fold: [
        "\"Fold. This line item is no longer profitable.\"",
        "\"The risk profile is insulting. Pass.\"",
      ],
    },
  },
  chaos: {
    reactionCategory: "chaos",
    spellChance: 0.67,
    reserveMana: 0,
    preferredSpells: [
      "read-the-room",
      "hot-potato-hexed",
      "sorry-not-sorry",
      "raccoon-energy",
      "didnt-read",
      "patch-notes",
      "wrong-pot",
    ],
    lines: {
      spell: [
        "\"I cast whatever this one is.\"",
        "\"This button looked important.\"",
        "\"If the table survives, that's balancing.\"",
      ],
      raise: [
        "\"Numbers! More numbers!\"",
        "\"Raise. No follow-up questions.\"",
        "\"I have a feeling. It is mostly smoke.\"",
      ],
      call: [
        "\"Call. Probably.\"",
        "\"I stay in because the cards are making a noise.\"",
      ],
      check: [
        "\"Check. I'm saving mana for a worse idea.\"",
        "\"No bet. Yet. Tragic, I know.\"",
      ],
      fold: [
        "\"Fold. This hand smells responsible.\"",
        "\"I refuse to lose with math.\"",
      ],
    },
  },
};

const PERSONALITY_FALLBACK = AI_PROFILES.chaos;

function rankValue(rank) {
  return ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"].indexOf(rank) + 2;
}

function handSignal(player) {
  const ranks = player.hand.map((card) => rankValue(card.tempRank ?? card.rank)).sort((a, b) => b - a);
  const uniqueRanks = new Set(ranks);
  const highest = ranks[0] ?? 0;

  if (uniqueRanks.size === 1) {
    return 1;
  }

  if (uniqueRanks.size === 2) {
    return 0.74 + highest / 100;
  }

  return highest / 20;
}

function getProfile(personality) {
  return AI_PROFILES[personality] ?? PERSONALITY_FALLBACK;
}

function randomBetween(game, min, max) {
  return min + (max - min) * game.random();
}

function sortOpponents(game, player) {
  return game.getLiveOpponents(player.id)
    .filter((opponent) => !opponent.folded)
    .sort((left, right) => {
      const leftScore = left.stack * 3 + left.mana;
      const rightScore = right.stack * 3 + right.mana;
      return rightScore - leftScore;
    });
}

function pickPreferredOpponent(game, player, flavor = "pressure") {
  const opponents = sortOpponents(game, player);
  if (!opponents.length) {
    return null;
  }

  const human = opponents.find((opponent) => opponent.id === "human");
  if (flavor === "theater" && human) {
    return human;
  }

  if (flavor === "fragile") {
    return [...opponents].sort((left, right) => left.mana - right.mana || left.stack - right.stack)[0];
  }

  return opponents[0];
}

function chooseCommunityTarget(game, player, mode = "best") {
  if (!game.state.communityCards.length) {
    return null;
  }

  const ranked = game.state.communityCards
    .map((card, index) => ({
      index,
      card,
      score:
        rankValue(card.tempRank ?? card.rank)
        + player.hand.filter((owned) => (owned.tempRank ?? owned.rank) === (card.tempRank ?? card.rank)).length * 3
        + player.hand.filter((owned) => owned.suit === card.suit).length * 2,
    }))
    .sort((left, right) => right.score - left.score);

  if (mode === "random") {
    return {
      communityIndex: Math.floor(game.random() * game.state.communityCards.length),
    };
  }

  const entry = mode === "worst" ? ranked[ranked.length - 1] : ranked[0];
  return entry ? { communityIndex: entry.index } : null;
}

function chooseHandTarget(game, player, mode = "worst") {
  if (!player.hand.length) {
    return null;
  }

  if (mode === "best") {
    return { handIndex: game.getBestCardIndex(player) };
  }

  return { handIndex: game.getWorstCardIndex(player) };
}

function chooseOpponentHandTarget(game, target, mode = "best") {
  if (!target?.hand.length) {
    return null;
  }

  if (mode === "random") {
    return {
      opponentHandIndex: Math.floor(game.random() * target.hand.length),
    };
  }

  if (mode === "worst") {
    return {
      opponentHandIndex: game.getWorstCardIndex(target),
    };
  }

  return {
    opponentHandIndex: game.getBestCardIndex(target),
  };
}

function chooseOpponentTarget(game, player, spellId) {
  switch (spellId) {
    case "not-my-problem":
    case "fake-news":
    case "trust-fallacy":
      return pickPreferredOpponent(game, player, player.personality === "frost" ? "pressure" : "theater");
    case "blind-faith":
      return pickPreferredOpponent(game, player, "theater");
    case "wrong-pot":
    case "skill-issue":
      return pickPreferredOpponent(game, player, "pressure");
    default:
      return pickPreferredOpponent(game, player, "pressure");
  }
}

function chooseSpellTarget(game, player, spell) {
  if (spell.id === "trust-fallacy") {
    const target = chooseOpponentTarget(game, player, spell.id);
    return target
      ? {
          playerId: target.id,
          handIndex: chooseHandTarget(game, player, game.state.reverseRanking ? "best" : "worst")?.handIndex ?? 0,
        }
      : null;
  }

  if (spell.id === "not-my-problem" || spell.id === "fake-news") {
    const target = chooseOpponentTarget(game, player, spell.id);
    if (!target) {
      return null;
    }

    const handTarget = chooseOpponentHandTarget(
      game,
      target,
      player.personality === "chaos" ? "random" : "best",
    );

    return {
      playerId: target.id,
      opponentHandIndex: handTarget?.opponentHandIndex ?? 0,
    };
  }

  if (!spell.targetMode) {
    return null;
  }

  if (spell.targetMode === "opponent") {
    const target = chooseOpponentTarget(game, player, spell.id);
    return target ? { playerId: target.id } : null;
  }

  if (spell.targetMode === "hand") {
    return chooseHandTarget(game, player, game.state.reverseRanking ? "best" : "worst");
  }

  if (spell.targetMode === "community") {
    return chooseCommunityTarget(game, player, player.personality === "chaos" ? "random" : "best");
  }

  return null;
}

function hasReversibleEnemySpell(game, player) {
  return [...game.state.spellHistory]
    .reverse()
    .some((entry) => entry.casterId !== player.id && !entry.cancelled && typeof entry.undo === "function");
}

function scoreSpell(game, player, spell, selected) {
  const profile = getProfile(player.personality);
  const signal = handSignal(player);
  const liveOpponents = game.getLiveOpponents(player.id);
  const totalEnemyMana = liveOpponents.reduce((total, opponent) => total + opponent.mana, 0);
  const preferredRank = profile.preferredSpells.indexOf(spell.id);
  let score = preferredRank === -1 ? 0 : 8 - preferredRank;

  if (spell.targetMode && !selected) {
    return Number.NEGATIVE_INFINITY;
  }

  if (spell.id === "return-to-sender" && !player.reflectShield) {
    score += player.mana <= 3 || liveOpponents.length > 1 ? 4 : 2;
  }

  if (spell.id === "mana-laundering") {
    score += totalEnemyMana >= 3 ? 4 : totalEnemyMana > 0 ? 2 : -3;
  }

  if (spell.id === "tax-season") {
    score += game.state.pot >= 7 ? 4 : 1;
  }

  if (spell.id === "goblin-budget") {
    score += player.mana <= 2 ? 3 : player.personality === "chaos" ? 2 : -1;
  }

  if (spell.id === "explain-yourself") {
    const richest = game.getRichestPlayer(player.id);
    score += richest && richest.stack >= 20 ? 4 : -1;
  }

  if (spell.id === "lol-no") {
    score += hasReversibleEnemySpell(game, player) ? 7 : -12;
  }

  if (spell.id === "blind-faith") {
    score += liveOpponents.some((opponent) => opponent.id === "human") ? 3 : 1;
  }

  if (spell.id === "wrong-pot") {
    score += liveOpponents.some((opponent) => opponent.stack > player.stack) ? 3 : 1;
  }

  if (spell.id === "skill-issue") {
    score += liveOpponents.length > 1 ? 3 : 1;
  }

  if (spell.id === "working-as-intended") {
    score += game.state.communityCards.length > 0 ? 4 : -2;
  }

  if (spell.id === "sorry-not-sorry") {
    score += game.state.communityCards.length > 0 && signal < 0.55 ? 4 : game.state.communityCards.length > 0 ? 1 : -5;
  }

  if (spell.id === "oops-all-aces") {
    score += game.state.reverseRanking ? -4 : signal < 0.7 ? 3 : 1;
  }

  if (spell.id === "patch-notes") {
    score += signal < 0.38 ? 5 : player.personality === "chaos" ? 2 : -2;
  }

  if (spell.id === "this-is-fine") {
    score += totalEnemyMana >= 2 ? 4 : -1;
  }

  if (spell.id === "read-the-room") {
    score += game.state.pendingPlayers.length >= 2 ? 3 : 1;
  }

  if (spell.id === "raccoon-qa") {
    score += signal < 0.42 ? 3 : 0;
  }

  if (spell.id === "raccoon-energy") {
    score += player.personality === "chaos" ? 4 : 1;
  }

  if (spell.id === "fake-news" || spell.id === "trust-fallacy" || spell.id === "not-my-problem") {
    score += player.personality === "bluff" ? 3 : 0;
  }

  if (spell.id === "hot-potato-hexed") {
    score += liveOpponents.length >= 2 ? 4 : 1;
  }

  if (spell.id === "didnt-read") {
    score += player.personality === "chaos" ? 4 : player.personality === "bluff" ? 2 : -1;
  }

  if (spell.category === "economy" && player.personality === "frost") {
    score += 2;
  }

  if (spell.category === "chaos" && player.personality === "chaos") {
    score += 2;
  }

  if (spell.category === "deception" && player.personality === "bluff") {
    score += 2;
  }

  return score + randomBetween(game, -0.8, 0.8);
}

function describeSpellRead(player, spell) {
  if (player.personality === "bluff") {
    return `${player.name} picks ${spell.name} to muddy the read and keep the table guessing`;
  }

  if (player.personality === "frost") {
    return `${player.name} spends mana on ${spell.name} only because the numbers finally approved it`;
  }

  return `${player.name} casts ${spell.name} because chaos is apparently a budgeting method now`;
}

function buildDecision(type, displayType, player, read, category, game) {
  return {
    type,
    bark: pickLine(player.personality, displayType, game.random()),
    read,
    category,
  };
}

export function chooseAiSpell(game, player) {
  const profile = getProfile(player.personality);
  const affordable = player.spells
    .filter((spellRef) => !spellRef.used)
    .map((spellRef) => game.getSpell(spellRef.id))
    .filter((spell) => spell && spell.cost <= player.mana);

  if (!affordable.length || game.random() > profile.spellChance) {
    return null;
  }

  const reserveFiltered = affordable.filter((spell) => (
    player.mana - game.getSpellCostForPlayer(player.id, spell) >= profile.reserveMana
    || profile.preferredSpells.includes(spell.id)
  ));
  const pool = reserveFiltered.length ? reserveFiltered : affordable;
  const scored = pool
    .map((spell) => {
      const selected = chooseSpellTarget(game, player, spell);
      return {
        spell,
        selected,
        score: scoreSpell(game, player, spell, selected),
      };
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort((left, right) => right.score - left.score);

  if (!scored.length || scored[0].score < 2) {
    return null;
  }

  const choice = player.personality === "chaos" && scored.length > 1 && game.random() < 0.28
    ? scored[Math.min(1, scored.length - 1)]
    : scored[0];

  return {
    spell: choice.spell,
    selected: choice.selected,
    bark: pickLine(player.personality, "spell", game.random()),
    read: describeSpellRead(player, choice.spell),
    category: choice.spell.category,
  };
}

export function chooseAiAction(game, player) {
  const callAmount = Math.max(0, game.state.currentBet - player.phaseContribution);
  const signal = handSignal(player);
  const raiseRoom = player.stack - callAmount >= game.state.raiseAmount;
  const liveOpponents = game.getLiveOpponents(player.id);
  const profile = getProfile(player.personality);

  if (player.blindActive) {
    if (callAmount >= 4 && game.random() < 0.5) {
      return buildDecision("fold", "fold", player, `${player.name} bails because playing blind was funny right up until it cost real chips`, "disruption", game);
    }

    if (raiseRoom && player.personality === "chaos" && game.random() < 0.24) {
      return buildDecision("raise", "raise", player, `${player.name} raises blind and treats that as a personality trait`, "economy", game);
    }

    const displayType = callAmount > 0 ? "call" : "check";
    return buildDecision("check", displayType, player, `${player.name} stays in on pure vibes and incomplete information`, "deception", game);
  }

  if (player.personality === "bluff") {
    if (raiseRoom && (signal > 0.42 || (callAmount === 0 && game.random() < 0.34) || game.random() < 0.16)) {
      return buildDecision("raise", "raise", player, `${player.name} smells uncertainty and pushes the pot before anyone can look too closely`, "economy", game);
    }

    if (callAmount >= 5 && signal < 0.28 && game.random() < 0.55) {
      return buildDecision("fold", "fold", player, `${player.name} folds because even theatrical confidence has a budget`, "disruption", game);
    }

    const displayType = callAmount > 0 ? "call" : "check";
    const read = callAmount > 0
      ? `${player.name} calls to keep the pressure alive and the story messy`
      : `${player.name} checks and waits for somebody else to panic first`;
    return buildDecision("check", displayType, player, read, "deception", game);
  }

  if (player.personality === "frost") {
    if (callAmount >= 3 && signal < 0.44) {
      return buildDecision("fold", "fold", player, `${player.name} folds the weak line and protects both chips and mana`, "defense", game);
    }

    if (raiseRoom && signal > 0.74 && game.random() < 0.42) {
      return buildDecision("raise", "raise", player, `${player.name} raises only after the hand quality clears an invisible audit`, "economy", game);
    }

    const displayType = callAmount > 0 ? "call" : "check";
    const read = callAmount > 0
      ? `${player.name} calls because the current price remains tolerable`
      : `${player.name} checks to preserve mana for a cleaner intervention later`;
    return buildDecision("check", displayType, player, read, "defense", game);
  }

  if (signal < 0.24 && callAmount > 0 && game.random() < 0.32) {
    return buildDecision("fold", "fold", player, `${player.name} folds because this hand feels far too normal to trust`, "chaos", game);
  }

  if (raiseRoom && (game.random() < 0.34 || signal > 0.66 || liveOpponents.length >= 2 && game.random() < 0.18)) {
    return buildDecision("raise", "raise", player, `${player.name} raises mostly to see what breaks first`, "chaos", game);
  }

  const displayType = callAmount > 0 ? "call" : "check";
  const read = callAmount > 0
    ? `${player.name} calls because the table is still making interesting noises`
    : `${player.name} checks and saves mana for a future crime`;
  return buildDecision("check", displayType, player, read, profile.reactionCategory, game);
}

export function chooseAiUnoAction(game, player) {
  const modifierId = game.state.unoModifier?.id ?? null;
  const topCard = game.getUnoTopCard();
  const nextPlayer = game.getPlayer(game.getNextUnoPlayerId(player.id, 1));
  const playable = (player.hand ?? [])
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => game.canPlayUnoCard(card));

  if (playable.length) {
    const scored = playable.map((entry) => {
      const isAction = ["Skip", "Reverse", "+2", "Wild", "+4"].includes(entry.card.rank);
      const handAfter = player.hand.length - 1;
      const matchesByValue = topCard && entry.card.rank === topCard.rank && entry.card.suit !== "Wild" && entry.card.suit !== game.state.unoCurrentColor;
      let score = isAction ? 4 : 1;

      if (handAfter === 0) {
        score += 100;
      } else if (handAfter === 1) {
        score += isAction ? 4 : 10;
      } else if (handAfter === 2 && !isAction) {
        score += 3;
      }

      if (player.personality === "bluff") {
        score += isAction ? 3 : 0;
        score += nextPlayer?.hand?.length <= 2 ? 3 : 0;
        score += handAfter <= 2 ? 2 : 0;
      } else if (player.personality === "frost") {
        score += handAfter <= 2 ? 4 : 0;
        score += nextPlayer?.hand?.length <= 2 && ["Skip", "+2", "+4"].includes(entry.card.rank) ? 4 : 0;
        score -= handAfter <= 2 && ["Wild", "+4"].includes(entry.card.rank) ? 2 : 0;
      } else {
        score += isAction ? 2 : 0;
        score += game.random() * 3;
      }

      if (modifierId === "echo-skip" && entry.card.rank === "Skip") {
        score += 5;
      }
      if (modifierId === "reverse-bloom" && entry.card.rank === "Reverse") {
        score += player.personality === "frost" ? 5 : 3;
      }
      if (modifierId === "mirror-match" && matchesByValue) {
        score += player.personality === "frost" ? 1 : 4;
      }
      if (modifierId === "witch-tax" && ["Wild", "+4"].includes(entry.card.rank) && handAfter <= 2) {
        score -= player.personality === "chaos" ? 1 : 5;
      }
      if (modifierId === "hot-discard" && handAfter === 2) {
        score += player.personality === "frost" ? 2 : 4;
      }

      if (handAfter <= 2 && ["+2", "+4"].includes(entry.card.rank)) {
        score -= 2;
      }
      if (handAfter <= 2 && modifierId === "mirror-match" && matchesByValue) {
        score -= 2;
      }

      return {
        ...entry,
        isAction,
        matchesByValue,
        score,
      };
    });

    const ranked = scored.sort((left, right) => right.score - left.score);
    const shortlist = player.personality === "chaos" && ranked.length > 1
      ? ranked.slice(0, Math.min(2, ranked.length))
      : ranked.slice(0, 1);
    const choice = shortlist[Math.floor(game.random() * shortlist.length)];
    const modifierRead = modifierId === "echo-skip" && choice.card.rank === "Skip"
      ? " and leans into the cursed skip"
      : modifierId === "reverse-bloom" && choice.card.rank === "Reverse"
        ? " to repaint the whole table"
        : modifierId === "mirror-match" && choice.matchesByValue
          ? " to weaponize the value match"
          : modifierId === "witch-tax" && ["Wild", "+4"].includes(choice.card.rank)
            ? " despite the tax trap"
            : "";
    return {
      type: "play",
      index: choice.index,
      read: `${player.name} lines up ${choice.card.rank}${modifierRead} because this hand clearly needs more damage`,
      bark: pickLine(player.personality, "spell", game.random()),
      category: player.personality === "frost" ? "defense" : player.personality === "bluff" ? "deception" : "chaos",
      chosenColor: game.needsUnoColorChoice(choice.card)
        ? (
          player.personality === "chaos" && game.random() < 0.3
            ? ["Crimson", "Gold", "Leaf", "Azure"][Math.floor(game.random() * 4)]
            : game.chooseUnoColor(player)
        )
        : null,
    };
  }

  if (!game.state.unoHasDrawnThisTurn) {
    return {
      type: "draw",
      read: `${player.name} has no legal play and draws, hoping the cursed table does the rest`,
      bark: pickLine(player.personality, "check", game.random()),
      category: "economy",
    };
  }

  return {
    type: "pass",
    read: `${player.name} still can't match the pile and passes with visible disgust`,
    bark: pickLine(player.personality, "fold", game.random()),
    category: "defense",
  };
}

export function pickLine(personality, type, randomValue) {
  const lines = AI_PROFILES[personality]?.lines?.[type] ?? [];
  if (!lines.length) {
    return null;
  }

  return lines[Math.floor(randomValue * lines.length)];
}

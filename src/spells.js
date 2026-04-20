function pickRandom(items, random) {
  if (!items.length) {
    return null;
  }
  return items[Math.floor(random() * items.length)];
}

function cloneHands(players) {
  return players.map((player) => ({
    id: player.id,
    hand: [...player.hand],
  }));
}

function restoreHands(game, snapshot) {
  snapshot.forEach((entry) => {
    const player = game.getPlayer(entry.id);
    if (player) {
      player.hand = [...entry.hand];
    }
  });
}

function defaultUndo() {
  return null;
}

function resolveHostileTarget(ctx, target) {
  return ctx.game.resolveSpellTarget(ctx.caster, target, ctx.spell);
}

function selectedOpponent(ctx) {
  if (!ctx.selected?.playerId) {
    return null;
  }
  const player = ctx.game.getPlayer(ctx.selected.playerId);
  if (!player || player.folded || player.id === ctx.caster.id) {
    return null;
  }
  return player;
}

function selectedHandIndex(ctx) {
  if (!Number.isInteger(ctx.selected?.handIndex)) {
    return null;
  }
  return ctx.selected.handIndex >= 0 && ctx.selected.handIndex < ctx.caster.hand.length
    ? ctx.selected.handIndex
    : null;
}

function selectedOwnHandIndex(ctx) {
  return selectedHandIndex(ctx);
}

function selectedOpponentHandIndex(ctx, target) {
  if (!target || !Number.isInteger(ctx.selected?.opponentHandIndex)) {
    return null;
  }

  return ctx.selected.opponentHandIndex >= 0 && ctx.selected.opponentHandIndex < target.hand.length
    ? ctx.selected.opponentHandIndex
    : null;
}

function selectedCommunityIndex(ctx) {
  if (!Number.isInteger(ctx.selected?.communityIndex)) {
    return null;
  }
  return ctx.selected.communityIndex >= 0 && ctx.selected.communityIndex < ctx.game.state.communityCards.length
    ? ctx.selected.communityIndex
    : null;
}

function slotLabel(index) {
  return `slot ${index + 1}`;
}

function notMyProblem(ctx) {
  const target = ctx.backfire
    ? ctx.caster
    : selectedOpponent(ctx) ?? ctx.game.getRandomOpponent(ctx.caster.id);
  if (!target) {
    return {
      message: "Patch note: no valid snooping targets were detected, so everybody pretends that was intentional.",
      undo: defaultUndo,
    };
  }

  const slotIndex = selectedOpponentHandIndex(ctx, target);
  const revealed = Number.isInteger(slotIndex)
    ? target.hand[slotIndex]
    : pickRandom(target.hand, ctx.random);
  if (!revealed) {
    return {
      message: "Patch note: target had no cards worth violating.",
      undo: defaultUndo,
    };
  }

  ctx.caster.lastPeek = {
    ...ctx.game.cloneCardForState(revealed),
    fake: false,
    ownerName: target.name,
  };

  return {
    message: ctx.backfire
      ? `Patch note: you peeked your own ${ctx.game.cardLabel(revealed)} and still looked smug about it.`
      : `Patch note: secretly revealed ${ctx.game.cardLabel(revealed)} from ${target.name}${Number.isInteger(slotIndex) ? ` (${slotLabel(slotIndex)})` : ""}. Opponent UI remains blissfully uninformed.`,
    targetId: target.id,
    undo: () => {
      ctx.caster.lastPeek = null;
    },
  };
}

function raccoonQa(ctx) {
  if (!ctx.caster.hand.length) {
    return {
      message: "Patch note: no hand detected. Quality assurance has been postponed.",
      undo: defaultUndo,
    };
  }

  const swapIndex = selectedHandIndex(ctx) ?? Math.floor(ctx.random() * ctx.caster.hand.length);
  const previousCard = ctx.caster.hand[swapIndex];
  const replacement = ctx.game.drawFromDeck();
  ctx.caster.hand[swapIndex] = replacement;

  return {
    message: `Patch note: replaced ${ctx.game.cardLabel(previousCard)} with ${ctx.game.cardLabel(replacement)}. Outcome quality remains your burden.`,
    targetId: ctx.caster.id,
    undo: () => {
      ctx.caster.hand[swapIndex] = previousCard;
      ctx.game.returnCardToDeckTop(replacement);
    },
  };
}

function workingAsIntended(ctx) {
  const source = Number.isInteger(selectedCommunityIndex(ctx))
    ? ctx.game.state.communityCards[selectedCommunityIndex(ctx)]
    : pickRandom(ctx.game.state.communityCards, ctx.random);
  if (!source) {
    const emergencyCard = ctx.game.drawFromDeck();
    ctx.caster.hand.push(emergencyCard);
    return {
      message: `Patch note: no community rune existed, so the spell fabricated ${ctx.game.cardLabel(emergencyCard)} and called it a feature.`,
      targetId: ctx.caster.id,
      comboText: "Combo tag active: rune-heist is armed for later nonsense.",
      undo: () => {
        ctx.caster.hand = ctx.caster.hand.filter((card) => card.id !== emergencyCard.id);
        ctx.game.returnCardToDeckTop(emergencyCard);
      },
    };
  }

  const duplicate = ctx.game.duplicateCard(source, {
    copiedFromCommunity: true,
  });
  ctx.caster.hand.push(duplicate);

  return {
    message: `Patch note: duplicated ${ctx.game.cardLabel(source)} directly into your hand. No witness statements will be accepted.`,
    targetId: ctx.caster.id,
    comboText: "Combo tag active: rune-heist now keeps a private copy if the table rune gets rerolled later.",
    undo: () => {
      ctx.caster.hand = ctx.caster.hand.filter((card) => card.id !== duplicate.id);
    },
  };
}

function sorryNotSorry(ctx) {
  const index = selectedCommunityIndex(ctx) ?? ctx.game.getRandomCommunityIndex();
  if (index < 0) {
    return {
      message: "Patch note: there was no revealed community card to ruin, so the apology remains unissued.",
      undo: defaultUndo,
    };
  }

  const previous = ctx.game.state.communityCards[index];
  const replacement = ctx.game.drawFromDeck();
  ctx.game.state.communityCards[index] = replacement;
  const copiedRunes = ctx.caster.hand.filter((card) => card.copiedFromCommunity);

  return {
    message: `Patch note: rerolled ${ctx.game.cardLabel(previous)} into ${ctx.game.cardLabel(replacement)}. Somebody's straight just evaporated in public.`,
    targetId: ctx.caster.id,
    comboText: copiedRunes.length
      ? "Combo tag active: rune-heist copy remains unchanged, which is somehow even worse."
      : null,
    undo: () => {
      ctx.game.state.communityCards[index] = previous;
      ctx.game.returnCardToDeckTop(replacement);
    },
  };
}

function raccoonEnergy(ctx) {
  const stolen = ctx.game.drawFromDeck();
  ctx.caster.hand.push(stolen);

  return {
    message: `Patch note: stole ${ctx.game.cardLabel(stolen)} off the top of the deck before anyone could object, which they absolutely will.`,
    targetId: ctx.caster.id,
    undo: () => {
      ctx.caster.hand = ctx.caster.hand.filter((card) => card.id !== stolen.id);
      ctx.game.returnCardToDeckTop(stolen);
    },
  };
}

function hotPotatoHexed(ctx) {
  const players = ctx.game.getLivePlayers();
  if (players.length < 2) {
    return {
      message: "Patch note: insufficient victims for a group handoff event.",
      undo: defaultUndo,
    };
  }

  const snapshot = cloneHands(players);
  const outgoing = players.map((player) => {
    const index = player.id === ctx.caster.id && ctx.backfire
      ? ctx.game.getBestCardIndex(player)
      : ctx.game.getWorstCardIndex(player);
    return {
      player,
      index,
      card: player.hand[index],
    };
  });

  outgoing.forEach(({ player, index }, seatIndex) => {
    const incoming = outgoing[(seatIndex - 1 + outgoing.length) % outgoing.length];
    player.hand[index] = incoming.card;
  });

  return {
    message: ctx.backfire
      ? "Patch note: passed every wizard's worst card left, except yours was your best card because hubris was selected in the dropdown."
      : "Patch note: each wizard passed their worst card one seat left. Nobody liked the results and that feels correct.",
    comboText: "Combo tag active: hot-potato can quietly corrupt any copied rune piles you were feeling smug about.",
    undo: () => {
      restoreHands(ctx.game, snapshot);
    },
  };
}

function fakeNews(ctx) {
  const target = selectedOpponent(ctx) ?? ctx.game.getRandomOpponent(ctx.caster.id);
  if (!target) {
    return {
      message: "Patch note: no opponent was available to gaslight.",
      undo: defaultUndo,
    };
  }

  const slotIndex = selectedOpponentHandIndex(ctx, target);
  const fakeCard = ctx.game.createRandomCard();
  ctx.caster.lastPeek = {
    ...ctx.game.cloneCardForState(fakeCard),
    fake: true,
    ownerName: target.name,
  };

  return {
    message: `Patch note: ${target.name}${Number.isInteger(slotIndex) ? ` ${slotLabel(slotIndex)}` : ""} "revealed" ${ctx.game.cardLabel(fakeCard)}. Verification features remain intentionally absent.`,
    targetId: target.id,
    undo: () => {
      ctx.caster.lastPeek = null;
    },
  };
}

function didntRead() {
  return {
    message: "Patch note: played a dummy spell with zero effect. Emotional damage values remain excellent.",
    undo: defaultUndo,
  };
}

function trustFallacy(ctx) {
  const target = ctx.backfire
    ? ctx.caster
    : selectedOpponent(ctx) ?? ctx.game.getRandomOpponent(ctx.caster.id);
  if (!target || target.id === ctx.caster.id) {
    return {
      message: "Patch note: the hidden swap collapsed inward and mostly confused you.",
      undo: defaultUndo,
    };
  }

  const resolved = resolveHostileTarget(ctx, target);
  const finalTarget = resolved.target;
  if (!finalTarget || finalTarget.id === ctx.caster.id) {
    return {
      message: `Patch note: ${ctx.spell.name} bounced back and mostly violated your own privacy.`,
      targetId: ctx.caster.id,
      undo: defaultUndo,
    };
  }

  const snapshot = cloneHands([ctx.caster, finalTarget]);
  const sourceIndex = selectedOwnHandIndex(ctx) ?? Math.floor(ctx.random() * ctx.caster.hand.length);
  const targetIndex = Math.floor(ctx.random() * finalTarget.hand.length);
  [ctx.caster.hand[sourceIndex], finalTarget.hand[targetIndex]] = [
    finalTarget.hand[targetIndex],
    ctx.caster.hand[sourceIndex],
  ];

  return {
    message: "Patch note: swapped two face-down cards and refused to confirm anything. Trust statistics have been adjusted downward.",
    targetId: finalTarget.id,
    undo: () => {
      restoreHands(ctx.game, snapshot);
    },
  };
}

function oopsAllAces(ctx) {
  if (!ctx.caster.hand.length) {
    return {
      message: "Patch note: no card available for temporary lying.",
      undo: defaultUndo,
    };
  }

  const targetIndex = selectedHandIndex(ctx) ?? ctx.game.getWorstCardIndex(ctx.caster);
  const targetCard = ctx.caster.hand[targetIndex];
  const previousTempRank = targetCard.tempRank ?? null;
  targetCard.tempRank = "A";
  ctx.caster.temporaryAceCardId = targetCard.id;

  return {
    message: `Patch note: ${ctx.game.cardLabel(targetCard)} is now legally an Ace until your turn ends and reality resumes.`,
    targetId: ctx.caster.id,
    comboText: "Combo tag active: rules-lawyer interacts aggressively with Patch Notes.",
    undo: () => {
      if (previousTempRank) {
        targetCard.tempRank = previousTempRank;
      } else {
        delete targetCard.tempRank;
      }
      ctx.caster.temporaryAceCardId = null;
    },
  };
}

function taxSeason(ctx) {
  const previousTax = ctx.game.cloneTaxEffect();
  ctx.game.state.wizardTax = {
    recipientId: ctx.caster.id,
    rate: 0.2,
  };

  return {
    message: "Patch note: winning the pot now triggers a 20% wizard tax payable directly to you, because regulations are a suggestion.",
    targetId: ctx.caster.id,
    comboText: "Combo tag active: embezzle stacks especially rudely with Wrong Pot.",
    undo: () => {
      ctx.game.state.wizardTax = previousTax;
    },
  };
}

function manaLaundering(ctx) {
  const victims = ctx.game.getLiveOpponents(ctx.caster.id);
  const snapshot = victims.map((victim) => ({
    id: victim.id,
    mana: victim.mana,
  }));
  const casterManaBefore = ctx.caster.mana;
  let stolen = 0;

  victims.forEach((victim) => {
    const amount = Math.min(1, victim.mana);
    victim.mana -= amount;
    stolen += amount;
  });

  ctx.caster.mana += stolen;

  return {
    message: `Patch note: siphoned ${stolen} total mana from the table. Accounting remains both magical and criminal.`,
    targetId: ctx.caster.id,
    undo: () => {
      snapshot.forEach((entry) => {
        const victim = ctx.game.getPlayer(entry.id);
        if (victim) {
          victim.mana = entry.mana;
        }
      });
      ctx.caster.mana = casterManaBefore;
    },
  };
}

function goblinBudget(ctx) {
  const previousMana = ctx.caster.mana;
  const previousCrash = ctx.caster.manaCrashPending;
  ctx.caster.mana *= 2;
  ctx.caster.manaCrashPending = true;

  return {
    message: "Patch note: doubled your mana immediately and scheduled total financial collapse for your next turn.",
    targetId: ctx.caster.id,
    undo: () => {
      ctx.caster.mana = previousMana;
      ctx.caster.manaCrashPending = previousCrash;
    },
  };
}

function explainYourself(ctx) {
  const richest = ctx.backfire
    ? ctx.caster
    : ctx.game.getRichestPlayer(ctx.caster.id) ?? ctx.caster;
  const snapshot = {
    stack: richest.stack,
    pot: ctx.game.state.pot,
  };
  const amount = Math.min(30, richest.stack);
  ctx.game.commitChips(richest, amount, "spell-pot");

  return {
    message: `${richest.name} donates ${amount} chips to the pot rather than explain themselves to the table, which was wise.`,
    targetId: richest.id,
    undo: () => {
      richest.stack = snapshot.stack;
      ctx.game.state.pot = snapshot.pot;
    },
  };
}

function skillIssue(ctx) {
  const target = ctx.backfire
    ? ctx.caster
    : selectedOpponent(ctx) ?? ctx.game.getRichestPlayer(ctx.caster.id) ?? ctx.caster;
  const resolved = resolveHostileTarget(ctx, target);
  const finalTarget = resolved.target;
  if (!finalTarget) {
    return {
      message: "Patch note: there was nobody left worth inconveniencing.",
      undo: defaultUndo,
    };
  }

  const previous = finalTarget.skipNextAction;
  finalTarget.skipNextAction = true;

  return {
    message: `Patch note: ${finalTarget.name} will skip their next action. They had enough chips to survive this emotionally, probably.`,
    targetId: finalTarget.id,
    undo: () => {
      finalTarget.skipNextAction = previous;
    },
  };
}

function lolNo(ctx) {
  const result = ctx.game.undoLastSpell(ctx.caster.id);
  return {
    message: result.message,
    targetId: result.targetId,
    undo: defaultUndo,
  };
}

function wrongPot(ctx) {
  const target = ctx.backfire
    ? ctx.caster
    : selectedOpponent(ctx) ?? ctx.game.getRandomOpponent(ctx.caster.id);
  const resolved = resolveHostileTarget(ctx, target);
  const finalTarget = resolved.target;
  if (!finalTarget) {
    return {
      message: "Patch note: no legal betting victim was found for fake-pot deployment.",
      undo: defaultUndo,
    };
  }

  const previous = finalTarget.fakePotTrap;
  finalTarget.fakePotTrap = true;

  return {
    message: `Patch note: ${finalTarget.name}'s next bet goes into a fake pot that vanishes at round end. Customer support has been disabled.`,
    targetId: finalTarget.id,
    comboText: "Combo tag active: embezzle turns Tax Season into a remarkably ugly sentence.",
    undo: () => {
      finalTarget.fakePotTrap = previous;
    },
  };
}

function blindFaith(ctx) {
  const target = ctx.backfire
    ? ctx.caster
    : selectedOpponent(ctx) ?? ctx.game.getRandomOpponent(ctx.caster.id);
  const resolved = resolveHostileTarget(ctx, target);
  const finalTarget = resolved.target;
  if (!finalTarget) {
    return {
      message: "Patch note: nobody could be blinded responsibly, so the spell fizzled with a shrug.",
      undo: defaultUndo,
    };
  }

  const previous = finalTarget.blindNextTurn;
  finalTarget.blindNextTurn = true;

  return {
    message: `Patch note: ${finalTarget.name} will take their next turn with zero card information and several regrets.`,
    targetId: finalTarget.id,
    undo: () => {
      finalTarget.blindNextTurn = previous;
    },
  };
}

function returnToSender(ctx) {
  const previous = ctx.caster.reflectShield;
  ctx.caster.reflectShield = true;

  return {
    message: "Patch note: gained one Cope Ward. The next hostile spell targeting you will be mailed back to sender at no extra postage cost.",
    targetId: ctx.caster.id,
    undo: () => {
      ctx.caster.reflectShield = previous;
    },
  };
}

function readTheRoom(ctx) {
  const previousOrder = ctx.game.cloneTurnOrderOverride();
  ctx.game.randomizeTurnOrder();

  return {
    message: "Patch note: shuffled turn order for the rest of the round with no preview and no appeals process. Reading the room is now impossible by design.",
    targetId: ctx.caster.id,
    undo: () => {
      ctx.game.state.turnOrderOverride = previousOrder;
    },
  };
}

function patchNotes(ctx) {
  const previous = ctx.game.state.reverseRanking;
  ctx.game.state.reverseRanking = true;

  return {
    message: "Patch note: hand rankings are inverted for this round. Worst hand wins and all previous confidence was misplaced.",
    targetId: ctx.caster.id,
    comboText: "Combo tag active: rules-lawyer can now transform obvious nonsense into a viable plan.",
    undo: () => {
      ctx.game.state.reverseRanking = previous;
    },
  };
}

function thisIsFine(ctx) {
  const previous = ctx.game.cloneSpellSurcharge();
  ctx.game.state.spellSurcharge = {
    casterId: ctx.caster.id,
    affectedIds: ctx.game.turnOrder()
      .map((player) => player.id)
      .filter((id) => id !== ctx.caster.id && !ctx.game.getPlayer(id)?.folded),
  };

  return {
    message: "Patch note: every other wizard now pays double mana for spells until this turn cycle finishes, which feels fair if you stop reading halfway through.",
    targetId: ctx.caster.id,
    undo: () => {
      ctx.game.state.spellSurcharge = previous;
    },
  };
}

export const SPELL_CATEGORY_COLORS = {
  "card manipulation": "#67f1a2",
  deception: "#ff9b57",
  economy: "#f2c879",
  disruption: "#ff6f78",
  defense: "#7eb7ff",
  chaos: "#b98bff",
};

// The prompt enumerated 22 distinct spell effects, so the export keeps all 22 in one array.
export const SPELL_LIBRARY = [
  {
    id: "not-my-problem",
    name: "Not My Problem",
    cost: 1,
    category: "card manipulation",
    description: "Patch note: secretly reveal 1 random opponent card to yourself. Opponent receives no alert, no proof, and no closure.",
    effect: notMyProblem,
    backfireChance: 0.08,
    backfireNote: "May accidentally reveal one of your own cards and still leave you acting weird about it.",
    comboTag: "snoop",
    targetMode: "sequence",
    targetPrompt: "SELECT A WIZARD TO SECRETLY SNOOP.",
    targetSteps: [
      {
        mode: "opponent",
        prompt: "SELECT A WIZARD TO SECRETLY SNOOP.",
      },
      {
        mode: "opponent-hand",
        prompt: "SELECT WHICH FACE-DOWN SLOT YOU ARE VIOLATING FOR RESEARCH.",
      },
    ],
  },
  {
    id: "raccoon-qa",
    name: "Raccoon QA",
    cost: 1,
    category: "card manipulation",
    description: "Patch note: replace 1 random card in your hand with the top card of the deck. Quality is no longer a supported metric.",
    effect: raccoonQa,
    backfireChance: 0.15,
    backfireNote: "The new card may be aggressively worse, which sounds like a you problem.",
    comboTag: "deck-touch",
    targetMode: "hand",
    targetPrompt: "SELECT WHICH OF YOUR CARDS TO FEED TO QUALITY ASSURANCE.",
  },
  {
    id: "working-as-intended",
    name: "Working As Intended",
    cost: 3,
    category: "card manipulation",
    description: "Patch note: duplicate 1 revealed community rune directly into your hand. This copy is yours only and the code refuses follow-up questions.",
    effect: workingAsIntended,
    backfireChance: 0,
    comboTag: "rune-heist",
    targetMode: "community",
    targetPrompt: "SELECT A REVEALED RUNE TO ILLEGALLY COPY.",
  },
  {
    id: "sorry-not-sorry",
    name: "Sorry Not Sorry",
    cost: 3,
    category: "card manipulation",
    description: "Patch note: reroll 1 revealed community rune into a completely different card. Existing straights are downgraded to memories.",
    effect: sorryNotSorry,
    backfireChance: 0.18,
    backfireNote: "May destroy a community card you were quietly relying on. Official response: noted.",
    comboTag: "rune-heist",
    targetMode: "community",
    targetPrompt: "SELECT WHICH REVEALED RUNE TO REROLL INTO CHAOS.",
  },
  {
    id: "raccoon-energy",
    name: "Raccoon Energy",
    cost: 2,
    category: "card manipulation",
    description: "Patch note: steal the top card of the deck before anyone else gets ideas. Inventory limits remain theoretical.",
    effect: raccoonEnergy,
    backfireChance: 0.12,
    backfireNote: "Sometimes the stolen card is garbage and now it is your garbage.",
    comboTag: "deck-touch",
  },
  {
    id: "hot-potato-hexed",
    name: "Hot Potato Hexed",
    cost: 4,
    category: "card manipulation",
    description: "Patch note: each wizard passes their worst card one seat left. Table stability has been intentionally deprecated.",
    effect: hotPotatoHexed,
    backfireChance: 0.12,
    backfireNote: "May volunteer your best card instead because the curse read your attitude.",
    comboTag: "table-chaos",
  },
  {
    id: "fake-news",
    name: "Fake News",
    cost: 1,
    category: "deception",
    description: "Patch note: force an opponent to fake-reveal a card. Verification remains disabled to preserve the experience.",
    effect: fakeNews,
    backfireChance: 0,
    comboTag: "lie",
    targetMode: "sequence",
    targetPrompt: "SELECT WHICH WIZARD YOU WOULD LIKE TO GASLIGHT.",
    targetSteps: [
      {
        mode: "opponent",
        prompt: "SELECT WHICH WIZARD YOU WOULD LIKE TO GASLIGHT.",
      },
      {
        mode: "opponent-hand",
        prompt: "SELECT WHICH OF THEIR FACE-DOWN SLOTS GETS THE FAKE REVEAL.",
      },
    ],
  },
  {
    id: "didnt-read",
    name: "Didn't Read",
    cost: 0,
    category: "deception",
    description: "Patch note: plays a dummy spell animation that does absolutely nothing except ruin trust metrics.",
    effect: didntRead,
    backfireChance: 0,
    comboTag: "lie",
  },
  {
    id: "trust-fallacy",
    name: "Trust Fallacy",
    cost: 2,
    category: "deception",
    description: "Patch note: swap one face-down card with an opponent's face-down card. Neither player receives confirmation and that seems healthy.",
    effect: trustFallacy,
    backfireChance: 0.12,
    backfireNote: "May bounce back into your own pockets if the table thinks you deserve that.",
    comboTag: "lie",
    targetMode: "sequence",
    targetPrompt: "SELECT WHICH WIZARD GETS THEIR FACE-DOWN CARD SWAPPED.",
    targetSteps: [
      {
        mode: "opponent",
        prompt: "SELECT WHICH WIZARD GETS THEIR FACE-DOWN CARD SWAPPED.",
      },
      {
        mode: "hand",
        prompt: "SELECT WHICH OF YOUR FACE-DOWN CARDS YOU ARE SECRETLY OFFERING.",
      },
    ],
  },
  {
    id: "oops-all-aces",
    name: "Oops All Aces",
    cost: 2,
    category: "deception",
    description: "Patch note: one of your cards counts as an Ace until your turn ends. Reality will resume shortly and without apology.",
    effect: oopsAllAces,
    backfireChance: 0,
    comboTag: "rules-lawyer",
    targetMode: "hand",
    targetPrompt: "SELECT WHICH OF YOUR CARDS IS ABOUT TO BECOME AN ACE FOR TAX PURPOSES.",
  },
  {
    id: "tax-season",
    name: "Tax Season",
    cost: 3,
    category: "economy",
    description: "Patch note: winner pays a 20% wizard tax to you specifically. Legal basis has been replaced with confidence.",
    effect: taxSeason,
    backfireChance: 0,
    comboTag: "embezzle",
  },
  {
    id: "mana-laundering",
    name: "Mana Laundering",
    cost: 3,
    category: "economy",
    description: "Patch note: steal 1 mana from every opponent simultaneously. Finance has entered its goblin era.",
    effect: manaLaundering,
    backfireChance: 0.1,
    backfireNote: "May pull less mana than planned because poverty is a mechanic now.",
    comboTag: "embezzle",
  },
  {
    id: "goblin-budget",
    name: "Goblin Budget",
    cost: 3,
    category: "economy",
    description: "Patch note: double your mana now. Next turn your mana becomes 0 and customer success will not be contacting you.",
    effect: goblinBudget,
    backfireChance: 0,
    comboTag: "economy-spike",
  },
  {
    id: "explain-yourself",
    name: "Explain Yourself",
    cost: 4,
    category: "economy",
    description: "Patch note: richest wizard donates 30 chips to the pot or explains themselves to the table. Nobody ever chooses the second option.",
    effect: explainYourself,
    backfireChance: 0.08,
    backfireNote: "If you are the richest wizard, the table may notice.",
    comboTag: "embezzle",
  },
  {
    id: "skill-issue",
    name: "Skill Issue",
    cost: 3,
    category: "disruption",
    description: "Patch note: the player with the most chips skips their next action. Wealth remains a deeply targetable condition.",
    effect: skillIssue,
    backfireChance: 0.08,
    backfireNote: "May classify you as the problem and act accordingly.",
    comboTag: "misery",
    targetMode: "opponent",
    targetPrompt: "SELECT WHICH WIZARD SHOULD LOSE THEIR NEXT ACTION.",
  },
  {
    id: "lol-no",
    name: "Lol No",
    cost: 2,
    category: "disruption",
    description: "Patch note: cancel the last spell cast if it was still reversible. Timing windows are powered by disrespect.",
    effect: lolNo,
    backfireChance: 0,
    comboTag: "customer-service",
  },
  {
    id: "wrong-pot",
    name: "Wrong Pot",
    cost: 3,
    category: "disruption",
    description: "Patch note: one opponent's next bet goes into a fake pot that disappears at round end. Audit trail intentionally missing.",
    effect: wrongPot,
    backfireChance: 0.06,
    backfireNote: "Can absolutely misfile your own chips if karma clocks in on time.",
    comboTag: "embezzle",
    targetMode: "opponent",
    targetPrompt: "SELECT WHICH WIZARD GETS THEIR NEXT BET SENT TO THE WRONG POT.",
  },
  {
    id: "blind-faith",
    name: "Blind Faith",
    cost: 2,
    category: "disruption",
    description: "Patch note: one opponent takes their next turn with no card information whatsoever. Confidence values may remain high by mistake.",
    effect: blindFaith,
    backfireChance: 0.08,
    backfireNote: "May briefly replace your own decision-making with vibes.",
    comboTag: "misery",
    targetMode: "opponent",
    targetPrompt: "SELECT WHICH WIZARD MUST TAKE THEIR NEXT TURN BLIND.",
  },
  {
    id: "return-to-sender",
    name: "Return to Sender",
    cost: 2,
    category: "defense",
    description: "Patch note: gain 1 reflect shield. The next hostile spell targeting you is mailed back to the caster with no refunds.",
    effect: returnToSender,
    backfireChance: 0,
    comboTag: "customer-service",
  },
  {
    id: "read-the-room",
    name: "Read the Room",
    cost: 3,
    category: "chaos",
    description: "Patch note: randomize turn order for the rest of the round with no preview, no hints, and no appeals process.",
    effect: readTheRoom,
    backfireChance: 0.1,
    backfireNote: "Sometimes the new order still hates you personally.",
    comboTag: "table-chaos",
  },
  {
    id: "patch-notes",
    name: "Patch Notes",
    cost: 4,
    category: "chaos",
    description: "Patch note: invert the hand ranking system for this round so the worst hand wins. Legacy knowledge has been sunset.",
    effect: patchNotes,
    backfireChance: 0,
    comboTag: "rules-lawyer",
  },
  {
    id: "this-is-fine",
    name: "This Is Fine",
    cost: 4,
    category: "chaos",
    description: "Patch note: every spell cast this turn cycle costs double mana for everyone except you. Internal balancing remains decorative.",
    effect: thisIsFine,
    backfireChance: 0,
    comboTag: "table-chaos",
  },
];

export function assignSpells(deckRng, count = 5) {
  const pool = [...SPELL_LIBRARY];
  const spells = [];

  while (spells.length < count && pool.length > 0) {
    const index = Math.floor(deckRng() * pool.length);
    const spell = pool.splice(index, 1)[0];
    spells.push({
      id: spell.id,
      used: false,
    });
  }

  return spells;
}

export function getSpellById(spellId) {
  return SPELL_LIBRARY.find((spell) => spell.id === spellId);
}

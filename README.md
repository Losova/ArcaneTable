# Wizard Poker

Wizard Poker is a static browser card tavern with two playable tables right now: `Wizard Poker` and `Wizard Uno`. The build includes one human wizard, three AI rivals, a wardrobe/customizer, local autosave, seeded and daily runs, replay modifiers, and a committed low-fi magical presentation.

## Run It

Open [index.html](/Users/abiolabatiste/Documents/TRANSLATE%20APP/Wizard%20Poker/index.html) directly in a modern browser, or serve the folder with any tiny local server for the smoothest module loading experience.

Examples:

```bash
python3 -m http.server
```

Then visit `http://localhost:8000`.

## Deploy

Recommended host: `Vercel`.

Quick path:

1. Create a GitHub repository and push this folder.
2. Import that repo into Vercel.
3. Deploy the root directory as a static site.
4. Use the Vercel URL for your challenge submission.

This project now includes:

- [.gitignore](/Users/abiolabatiste/Documents/TRANSLATE%20APP/Wizard%20Poker/.gitignore) for a clean GitHub repo
- [vercel.json](/Users/abiolabatiste/Documents/TRANSLATE%20APP/Wizard%20Poker/vercel.json) so Vercel treats the project as an explicit static deploy

Start flow:

1. Wait through the `WIZCORP ENTERTAINMENT` boot screen.
2. Use `Choose Your Table` on the title screen to pick `Wizard Poker` or `Wizard Uno`.
3. Optionally set a seed, start the `Daily Run`, enable `Chaos Mode`, or enable debug tools.
4. Press `PLAY` for a custom run or `DAILY RUN` for the date-seeded challenge.

## Tables

- `Wizard Poker`: 3-card poker-lite with betting, mana, and a 22-spell sabotage deck.
- `Wizard Uno`: a cursed Uno ladder with one rotating magical table rule each hand.

## How To Play

- Each round deals 3 private cards to every player.
- Everyone antes 1 chip.
- Everyone starts each round with 6 mana.
- The title screen lets you choose a table, enter a test seed, start the date-seeded `Daily Run`, enable `Chaos Mode`, or turn on debug tools before starting a fresh match.
- The title screen can also resume an unfinished local run if one was autosaved in the browser.
- There are 4 betting beats:
  - Arcane Ante
  - First Rune
  - Second Rune
  - Final Rune
- A new community rune card reveals at the start of each rune phase.
- The HUD tracks the current phase, how much you need to call, active round modifiers, and your running win-loss-tie record.
- On your turn, you can cast one spell before choosing to check/call, raise by 2, or fold.
- At showdown, the best 3-card hand from your private cards plus the revealed community cards wins, unless `Patch Notes` flipped the ranking system upside down.
- Solo wins now offer a relic draft: pick 1 passive bonus and carry it into later rounds of the run.
- Fresh runs now begin with a short spell draft: pick 2 opening spells to guarantee in your first round spellbook.
- The title screen now keeps a small local profile with run count, clears, wins, best streak, and your most recent tavern clear.
- `Wizard Uno` uses a simpler action flow: play a valid card, draw once, or pass after drawing.
- Each Uno hand now rolls 1 cursed rule such as `Echo Skip`, `Reverse Bloom`, or `Witch Tax`.

## Controls

- `PLAY`: begin a fresh run from the selected table.
- `CONTINUE WIZARD POKER` / `CONTINUE WIZARD UNO`: resume the most recent unfinished local autosave.
- `DAILY RUN`: begin the current date-seeded challenge run with 3 fixed mutators.
- `HOW TO PLAY` or `HELP`: open the tutorial overlay.
- `CODEX`: open the quick glossary for statuses and run systems.
- `MENU`: open the in-match settings drawer for sound, visual stability, flash reduction, UI scale, and run reset.
- `CAM`: cycle the fixed PS2 camera angles.
- `CHECK`, `RAISE`, `FOLD`: take your normal Poker turn action.
- `PLAY`, `DRAW`, `PASS`: take your normal Uno turn action.
- Spell `CAST` / `PICK`: cast an untargeted spell immediately or enter targeting mode for targeted spells.
- `DEAL AGAIN` / `NEXT ROUND`: begin the next round after a result.
- `CLAIM RELIC`: appears after a solo win when a relic draft is waiting.
- `RESET`: hard reset the current round immediately.

Targeting flow:

- If a spell says `PICK`, click it first.
- Then click a wizard, one of your own cards, or a revealed community rune depending on the spell.
- Some spells now use multi-step targeting. `Trust Fallacy` asks for an opponent first, then which of your own face-down cards you want to risk.
- `Not My Problem` and `Fake News` now let you pick both the rival wizard and the exact face-down slot you want to snoop or corrupt.
- Click the same spell again to cancel targeting mode.

Daily run:

- `DAILY RUN` uses the current local date as the seed.
- Each daily run rolls 3 mutators from a fixed pool, such as extra mana, extra spells, richer tables, higher antes, cheaper first spells, or a wild first rune.
- Everyone gets the same daily modifier set for that date, but decisions still branch normally within the run.

Relics:

- A solo win offers 3 random relics from the run pool.
- Pick 1 and keep it for the rest of the run.
- Current relic effects include extra mana, extra spells, bonus chips, cheaper first spells, free peeks, and a wild opening rune.

Opening spell draft:

- Starting a fresh run now opens a 4-spell draft before round 1 begins.
- Pick 2 spells and they are guaranteed to appear in your opening spell hand.
- This only affects the first round, so runs start with more intent without changing the whole spell economy.

Persistence:

- Settings for sound, UI scale, stable visuals, and reduced flash are saved locally in the browser.
- The game also autosaves the current run state locally so unfinished runs can be resumed from the title screen.

Debug controls:

- `+6 MANA`: adds mana to the human player.
- `REDRAW SPELLS`: deals a fresh spell hand.
- `REVEAL CARDS`: toggles all private hands face-up for testing.

## PS2 Presentation Pass

- Fake boot splash: `WIZCORP ENTERTAINMENT` plus a 3-beep startup jingle
- 480x360 low-resolution renderer stretched with pixelated scaling
- Hard-cut camera switching with multiple preset angles and occasional wrong-angle glitches
- Low-poly octagonal table, flat-shaded room, dithered shadow circle, muddy PS2 fog
- Low-poly wizard figurines with simple 4-frame idle wobble and spell-cast pose
- Pixel-art spell sprites and floating table text
- Pixel-font HUD with flashing name box and mana orb row

## Hand Ranking

From strongest to weakest:

1. Straight Flush
2. Three of a Kind
3. Straight
4. Flush
5. Pair
6. High Card

## Spellbook

The current build includes every spell concept listed in the prompt, which landed at 22 total spells across:

- Card Manipulation
- Deception
- Economy
- Disruption
- Defense
- Chaos

Highlights:

- `Working As Intended`: duplicate a community rune into your hand.
- `Sorry Not Sorry`: reroll a revealed community rune and ruin somebody's math.
- `Tax Season`: skim 20% from winners to yourself.
- `Wrong Pot`: redirect the next bet into a fake pot that disappears.
- `Return to Sender`: reflect the next hostile spell.
- `Patch Notes`: invert hand rankings so the worst hand wins.
- `This Is Fine`: double spell costs for everybody else in the current turn cycle.

UI support:

- Hover any spell card for name, live mana cost, category, description, combo tag, and backfire warning.
- Some spells now use explicit targeting: pick the spell first, then click a wizard, one of your cards, or a revealed rune depending on the spell.
- A `RUN BUILD` panel now shows active daily mutators and the relics you have collected so far.
- Category-colored floating spell text appears above the table.
- Category-colored PS2-style sprite splashes fire when spells resolve.
- The quick balance pass pushed the most explosive spells slightly upward in mana cost: `Working As Intended`, `Hot Potato Hexed`, `Oops All Aces`, `Tax Season`, `Mana Laundering`, `Wrong Pot`, and `This Is Fine`.

## Replay Extras

- Title screen with `START MATCH`, tutorial access, seed entry, `Chaos Mode`, and debug toggle.
- Fresh runs now begin with a small opening spell draft so the player gets early agency immediately.
- Title screen now also includes a `DAILY RUN` start path for a date-seeded challenge mode.
- The title screen stores a lightweight local profile and remembers your most recent run clear.
- The title screen can resume an unfinished run from local autosave.
- The title screen includes `Choose Your Table`, with `Wizard Poker` and `Wizard Uno` currently playable.
- Round transition banner between phases and end-of-round summary modal with streak tracking.
- Each table now gets a stronger intro banner the first time you arrive there in a run.
- Post-win relic drafting gives runs a stronger build identity without changing the core poker loop.
- A compact `Codex` overlay explains the nastier status effects without forcing more HUD text into the match.
- Random table flavor events such as `House Special`, `Cheap Seats`, and `Lucky Lantern`.
- Silly ambient wizard banter layered on top of direct AI voice lines.
- Placeholder Web Audio beeps for boot, round changes, turns, spells, impacts, and round end.
- Debug tools can add mana, redraw your spell hand, and reveal all private cards for testing.

## File Structure

- [index.html](/Users/abiolabatiste/Documents/TRANSLATE%20APP/Wizard%20Poker/index.html): static shell, HUD regions, overlays, and start screen markup
- [style.css](/Users/abiolabatiste/Documents/TRANSLATE%20APP/Wizard%20Poker/style.css): PS2 UI styling, overlay styles, responsive rules, and impact effects
- [src/main.js](/Users/abiolabatiste/Documents/TRANSLATE%20APP/Wizard%20Poker/src/main.js): app bootstrap, audio hooks, title flow, and AI turn scheduling
- [src/game.js](/Users/abiolabatiste/Documents/TRANSLATE%20APP/Wizard%20Poker/src/game.js): core game state, daily modifiers, relics, turn logic, round flow, summaries, streaks, and seeded randomness
- [src/rendering.js](/Users/abiolabatiste/Documents/TRANSLATE%20APP/Wizard%20Poker/src/rendering.js): Three.js scene, low-res renderer, tokens, cards, VFX, and camera behavior
- [src/ui.js](/Users/abiolabatiste/Documents/TRANSLATE%20APP/Wizard%20Poker/src/ui.js): DOM rendering, overlays, relic draft flow, targeting flow, and button wiring
- [src/spells.js](/Users/abiolabatiste/Documents/TRANSLATE%20APP/Wizard%20Poker/src/spells.js): spell data model and spell effect implementations
- [src/ai.js](/Users/abiolabatiste/Documents/TRANSLATE%20APP/Wizard%20Poker/src/ai.js): lightweight wizard personalities, betting heuristics, and spell selection

## Future Ideas

- Add richer sound and a few per-spell signature stingers.
- Extend multi-step targeting to even nastier spells, like picking both a victim and a community rune for more deliberate sabotage.
- Turn the relic layer into a bigger run meta with rarity tiers, cursed relics, and rival-only signatures.
- Push the fake-console layer further with pause menus, save-slot parody UI, and more cursed low-res textures.

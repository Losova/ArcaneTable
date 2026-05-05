# Launch Checklist

Use this list before calling the V1 build locked.

## Title Flow

- Open the deployed `Arcane Table` homepage.
- Confirm `Arcane Table`, `Wizard Uno`, and `Wizard Spades` all appear as playable tables.
- Confirm `Play`, `Continue`, `Daily run`, `Wardrobe`, `Stats`, and `How to play` are visible and readable.
- Confirm the first-time title hint appears only once and can be dismissed.

## Match Flow

- Start one fresh run in `Arcane Table`.
- Start one fresh run in `Wizard Uno`.
- Start one fresh run in `Wizard Spades`.
- Confirm `Home`, `Rules`, `Settings`, and `Help` all work in-match.
- Confirm `Return home` from settings lands on the real title screen.

## Table-Specific Checks

- `Arcane Table`: confirm the spell pouch opens, spells cast, and targeting still completes.
- `Wizard Uno`: confirm `Play`, `Draw`, `Pass`, and color picking all work.
- `Wizard Spades`: confirm bidding works, legal card play works, and tricks resolve correctly.

## End States

- Finish one hand in each table and confirm the round summary reads clearly.
- Clear a full run and confirm the run-clear screen feels conclusive.
- Bust a run and confirm the loss summary feels intentional, not broken.

## Responsive Checks

- Check the deployed Vercel build on phone portrait.
- Check the deployed Vercel build on a small laptop viewport.
- Check the deployed Vercel build on a normal desktop viewport.
- Confirm the scene and HUD both remain readable without broken overlaps.

## Save / Resume

- Start a run, refresh, and confirm `Continue` appears.
- Resume the saved run and confirm the correct table returns.
- Confirm wardrobe choices and settings persist after reload.

## Final Visual Pass

- Confirm no critical text is too dim to read.
- Confirm no right-rail sections collide with each other.
- Confirm floating text above wizards no longer stacks directly on itself.
- Confirm the spell pouch is easy to notice on the table.

## Freeze

- Do not add new systems after this point.
- Fix only blocking bugs, layout breaks, and readability issues.

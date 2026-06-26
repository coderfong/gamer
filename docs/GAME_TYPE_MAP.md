# Legacy `game_type` key map (READ THIS before touching game types)

## TL;DR
The stored `campaigns.game_type` keys are **legacy and frozen**. Several no longer
match the game they actually render — e.g. `dice_roll` renders **Plinko**. This is
intentional and **must not be "fixed" by renaming the keys** without a coordinated,
runtime-verified migration (see "Why we don't just rename" below). Users are never
shown the raw key — `GAME_META[key].label` shows the correct game name everywhere.

## The map

| Stored `game_type` | Renders (`GameByType`) | User-facing label (`GAME_META`) | Category | Key matches? |
|--------------------|------------------------|----------------------------------|----------|--------------|
| `spin_wheel`       | `SpinWheel`            | Spin the Wheel                   | chance   | ✅ |
| `scratch`          | `ScratchCard`          | Scratch Card                     | chance   | ✅ |
| `quiz`             | `Quiz`                 | Quiz                             | skill    | ✅ |
| `slot_machine`     | `SlotMachine`          | **Fill the Outline**             | skill    | ❌ |
| `lucky_dip`        | `PickABox`             | Pick a Box                       | chance   | ⚠️ |
| `memory`           | `Memory`               | Memory Match                     | skill    | ✅ |
| `tap_target`       | `TapTarget`            | Tap the Target                   | skill    | ✅ |
| `whack_a_mole`     | `WhackAMole`           | Whack-a-Mole                     | skill    | ✅ |
| `pop_balloon`      | `PopBalloon`           | **Stop the Timer**               | skill    | ❌ |
| `wheel_of_fortune` | `CupShuffle`           | **Cup Shuffle**                  | skill    | ❌ |
| `card_flip`        | `RingShooter`          | **Ring Shooter**                 | skill    | ❌ |
| `dice_roll`        | `Plinko`               | **Plinko**                       | chance   | ❌ |
| `pinata`           | `PrecisionMeter`       | **Perfect Swing** (disabled)     | skill    | ❌ |
| `claw_machine`     | `CatchDrops`           | **Catch the Drops**              | skill    | ❌ |
| `color_match`      | `PinDrop`              | **Pin Drop**                     | skill    | ❌ |
| `speed_tap`        | `SpeedTap`             | Speed Tap                        | skill    | ✅ |
| `reaction`         | `Reaction`             | Reaction Test                    | skill    | ✅ |
| `stack_blocks`     | `StackBlocks`          | Stack the Blocks                 | skill    | ✅ |
| `treasure_hunt`    | `AngleStop`            | **Angle Stop**                   | skill    | ❌ |

Source of truth: `components/games/GameWrapper.tsx` (`GameByType` switch) and
`lib/games/gameMeta.ts` (`GAME_META`). If you add or change a mapping, update both
**and this table**.

## Why we don't just rename the keys
`game_type` is not just a code enum — it's persisted on every `campaigns` row and
is the key for game-specific config:

- live `campaigns.game_type` values + `supabase/seed.sql`
- the `GameType` union (`lib/types/game.ts`) and `GAME_META` keys (`lib/games/gameMeta.ts`)
- the builder enum (`lib/admin/campaignSchemas.ts`), `GameTypePicker`
- per-game hero config: `HERO_SLOTS` keys and the `gameType === "…"` switches in
  `lib/brand/gameAssets.ts` (`buildGameConfig`, `optimizeHeroConfig`)
- the `GameByType` switch — whose `default` is `SpinWheel`

A rename has to change all of these **and** UPDATE the live DB rows in lock-step. A
single missed string literal doesn't fail typecheck — it falls through to
`default: SpinWheel`, silently rendering the **wrong** game for a real campaign.
Because the CLI isn't linked (no way to runtime-verify the migration here), the
downside (silently corrupting live campaign rendering) outweighs the readability win.

## If you ever do rename (reversible recipe)
Do it as one coordinated change, verified against a real database:

1. Pick the new keys (e.g. `dice_roll → plinko`, `slot_machine → fill_outline`, …).
2. Write a migration with an explicit, reversible mapping, e.g.:
   ```sql
   -- forward
   update campaigns set game_type = 'plinko'      where game_type = 'dice_roll';
   update campaigns set game_type = 'fill_outline' where game_type = 'slot_machine';
   -- … one per renamed key
   -- reverse (rollback)
   -- update campaigns set game_type = 'dice_roll'    where game_type = 'plinko';
   -- update campaigns set game_type = 'slot_machine' where game_type = 'fill_outline';
   ```
3. In the **same** change, update every code surface listed above, keeping a
   back-compat alias in `GameByType`/`getGameMeta` for the old keys during rollout.
4. Re-run `seed.sql`, `npm run build`, and click through `/play/<slug>` for each
   renamed game before removing the aliases.

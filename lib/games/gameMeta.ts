import type { GameType } from "@/lib/types/game";

export type GameCategory = "chance" | "skill";

export interface GameMeta {
  label: string;
  icon: string;
  description: string;
  category: GameCategory;
  enabled: boolean;
  headline: string; // big "<verb> to win!" header shown above the game
  useCase: string; // short marketing purpose shown under the game card on the public hub
}

// Registry of every game type the platform knows about. `enabled` gates which
// ones a brand can actually pick in the builder. The 5 enabled here line up with
// the games that are implemented + seeded (see components/games/* and seed.sql):
// spin_wheel, scratch, quiz, slot_machine, lucky_dip.
export const GAME_META: Record<GameType, GameMeta> = {
  spin_wheel:      { label: "Spin the Wheel",      icon: "🎯", description: "Classic prize wheel with weighted segments", category: "chance", enabled: true, headline: "Spin to win!", useCase: "Increase sales — play-to-win discount, redeem at checkout" },
  scratch:         { label: "Scratch Card",        icon: "🪙", description: "Scratch to reveal your prize",               category: "chance", enabled: true, headline: "Scratch to win!", useCase: "Increase sales — instant reward reveal, drive conversion" },
  quiz:            { label: "Quiz",                 icon: "🧠", description: "Answer questions, win based on score",        category: "skill",  enabled: true, headline: "Answer to win!", useCase: "Data / lead gen — gated, unlock reward with email" },
  slot_machine:    { label: "Fill the Outline",     icon: "🎯", description: "Stop the slider to fill the outline — aim for 100%", category: "skill", enabled: true, headline: "Fill to win!", useCase: "Brand awareness — quick skill test, short & shareable" },
  lucky_dip:       { label: "Pick a Box",          icon: "📦", description: "Choose 1 of N boxes to reveal a prize",      category: "chance", enabled: true, headline: "Pick to win!", useCase: "Product launch — reveal mechanic, explore & pre-order" },

  memory:          { label: "Memory Match",        icon: "🧩", description: "Find matching pairs",                        category: "skill",  enabled: true, headline: "Match to win!", useCase: "Returning customers — daily challenge, repeat plays" },
  tap_target:      { label: "Tap the Target",      icon: "🎯", description: "Tap the bullseye as fast as you can",        category: "skill",  enabled: true, headline: "Tap to win!", useCase: "Brand awareness — short, shareable, no signup" },
  whack_a_mole:    { label: "Whack-a-Mole",        icon: "🔨", description: "Tap moles as they pop up",                   category: "skill",  enabled: true, headline: "Whack to win!", useCase: "Returning customers — beat-your-score loop, come back daily" },
  pop_balloon:     { label: "Stop the Timer",      icon: "⏱️", description: "Stop the timer exactly on the target time",     category: "skill", enabled: true, headline: "Stop to win!", useCase: "Brand awareness — challenge a friend, fast to share" },
  wheel_of_fortune:{ label: "Cup Shuffle",         icon: "🥤", description: "Watch the cups shuffle, then find the hidden object", category: "skill", enabled: true, headline: "Find to win!", useCase: "Brand awareness — shareable guessing game" },
  card_flip:       { label: "Ring Shooter",        icon: "🎯", description: "Shoot the rotating targets — they spin faster each hit", category: "skill", enabled: true, headline: "Shoot to win!", useCase: "Returning customers — skill leaderboard, beat your best" },
  dice_roll:       { label: "Plinko",              icon: "🔴", description: "Drop the ball through the pegs into a slot",      category: "chance", enabled: true, headline: "Drop to win!", useCase: "Increase sales — play-to-win drop, instant reward" },
  pinata:          { label: "Perfect Swing",       icon: "🪅", description: "Stop the marker in the sweet spot — precision timing", category: "skill", enabled: false, headline: "Swing to win!", useCase: "Brand awareness — precision timing challenge" },
  claw_machine:    { label: "Catch the Drops",     icon: "🧺", description: "Catch the good stuff, dodge the bad",          category: "skill",  enabled: true, headline: "Catch to win!", useCase: "Returning customers — score loop, daily replays" },
  color_match:     { label: "Pin Drop",            icon: "📌", description: "Shoot pins into the spinning core without overlapping", category: "skill", enabled: true, headline: "Drop to win!", useCase: "Brand awareness — skill challenge, share your run" },
  speed_tap:       { label: "Speed Tap",           icon: "⚡", description: "Tap as fast as you can",                     category: "skill",  enabled: true, headline: "Tap to win!", useCase: "Returning customers — beat-your-time, come back tomorrow" },
  reaction:        { label: "Reaction Test",       icon: "🟢", description: "Tap the instant it turns green",             category: "skill",  enabled: true, headline: "React to win!", useCase: "Brand awareness — challenge a friend, quick & viral" },
  stack_blocks:    { label: "Stack the Blocks",    icon: "🧱", description: "Stack blocks as high as you can",            category: "skill",  enabled: true, headline: "Stack to win!", useCase: "Returning customers — high-score leaderboard" },
  treasure_hunt:   { label: "Angle Stop",          icon: "🧭", description: "Stop the dial exactly on the target angle",       category: "skill", enabled: true, headline: "Stop to win!", useCase: "Drive foot traffic — location-locked, in-store unlock" },
};

export function getEnabledGames(): Array<[GameType, GameMeta]> {
  return (Object.entries(GAME_META) as Array<[GameType, GameMeta]>).filter(([, m]) => m.enabled);
}

// Safe accessor — unknown/legacy game_type strings get a neutral fallback so the
// dashboard never crashes on a row whose game_type isn't in the registry.
export function getGameMeta(gameType: string): GameMeta {
  return (
    GAME_META[gameType as GameType] ?? {
      label: gameType,
      icon: "🎮",
      description: "",
      category: "chance",
      enabled: false,
      headline: "Play to win!",
      useCase: "",
    }
  );
}

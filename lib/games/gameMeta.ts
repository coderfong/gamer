import type { GameType } from "@/lib/types/game";

export type GameCategory = "chance" | "skill";

export interface GameMeta {
  label: string;
  icon: string;
  description: string;
  category: GameCategory;
  enabled: boolean;
}

// Registry of every game type the platform knows about. `enabled` gates which
// ones a brand can actually pick in the builder. The 5 enabled here line up with
// the games that are implemented + seeded (see components/games/* and seed.sql):
// spin_wheel, scratch, quiz, slot_machine, lucky_dip.
export const GAME_META: Record<GameType, GameMeta> = {
  spin_wheel:      { label: "Spin the Wheel",      icon: "🎯", description: "Classic prize wheel with weighted segments", category: "chance", enabled: true },
  scratch:         { label: "Scratch Card",        icon: "🪙", description: "Scratch to reveal your prize",               category: "chance", enabled: true },
  quiz:            { label: "Quiz",                 icon: "🧠", description: "Answer questions, win based on score",        category: "skill",  enabled: true },
  slot_machine:    { label: "Slot Machine",        icon: "🎰", description: "3-reel slot with prize on match",            category: "chance", enabled: true },
  lucky_dip:       { label: "Pick a Box",          icon: "📦", description: "Choose 1 of N boxes to reveal a prize",      category: "chance", enabled: true },

  memory:          { label: "Memory Match",        icon: "🧩", description: "Find matching pairs",                        category: "skill",  enabled: false },
  trivia:          { label: "Trivia Race",         icon: "⏱️", description: "Speed-quiz with time bonuses",               category: "skill",  enabled: false },
  tap_target:      { label: "Tap the Target",      icon: "👆", description: "Tap targets as they appear",                 category: "skill",  enabled: false },
  match_three:     { label: "Match Three",         icon: "💠", description: "Swap tiles to make matches",                 category: "skill",  enabled: false },
  whack_a_mole:    { label: "Whack-a-Mole",        icon: "🔨", description: "Tap moles as they pop up",                   category: "skill",  enabled: false },
  pop_balloon:     { label: "Pop a Balloon",       icon: "🎈", description: "Pop one of several balloons",                category: "chance", enabled: false },
  wheel_of_fortune:{ label: "Wheel of Fortune",    icon: "🎡", description: "Big-wheel spin for a prize",                 category: "chance", enabled: false },
  card_flip:       { label: "Flip a Card",         icon: "🃏", description: "Single card flip reveal",                    category: "chance", enabled: false },
  dice_roll:       { label: "Roll the Dice",       icon: "🎲", description: "Dice roll determines prize",                 category: "chance", enabled: false },
  pinata:          { label: "Piñata",              icon: "🪅", description: "Whack the piñata for a prize",               category: "chance", enabled: false },
  claw_machine:    { label: "Claw Machine",        icon: "🕹️", description: "Grab a prize with the claw",                 category: "skill",  enabled: false },
  color_match:     { label: "Color Match",         icon: "🎨", description: "Match the target color",                     category: "skill",  enabled: false },
  shape_sort:      { label: "Shape Sort",          icon: "🔷", description: "Sort shapes into bins",                      category: "skill",  enabled: false },
  speed_tap:       { label: "Speed Tap",           icon: "⚡", description: "Tap as fast as you can",                     category: "skill",  enabled: false },
  reaction:        { label: "Reaction Test",       icon: "🟢", description: "Tap the instant it turns green",             category: "skill",  enabled: false },
  stack_blocks:    { label: "Stack the Blocks",    icon: "🧱", description: "Stack blocks as high as you can",            category: "skill",  enabled: false },
  snake:           { label: "Snake",               icon: "🐍", description: "Classic snake — eat to grow",                category: "skill",  enabled: false },
  tic_tac_toe:     { label: "Tic-Tac-Toe",         icon: "⭕", description: "Beat the board to win",                      category: "skill",  enabled: false },
  puzzle_slide:    { label: "Slide Puzzle",        icon: "🧩", description: "Slide tiles into the right order",           category: "skill",  enabled: false },
  word_search:     { label: "Word Search",         icon: "🔤", description: "Find the hidden brand words",                category: "skill",  enabled: false },
  hangman:         { label: "Hangman",             icon: "🪢", description: "Guess the brand word",                       category: "skill",  enabled: false },
  treasure_hunt:   { label: "Treasure Hunt",       icon: "🗺️", description: "Hunt for the hidden treasure",               category: "chance", enabled: false },
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
    }
  );
}

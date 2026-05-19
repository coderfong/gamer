export type GameType =
  | "spin_wheel"
  | "scratch"
  | "memory"
  | "slot_machine"
  | "lucky_dip"
  | "quiz"
  | "trivia"
  | "tap_target"
  | "match_three"
  | "whack_a_mole"
  | "pop_balloon"
  | "wheel_of_fortune"
  | "card_flip"
  | "dice_roll"
  | "pinata"
  | "claw_machine"
  | "color_match"
  | "shape_sort"
  | "speed_tap"
  | "reaction"
  | "stack_blocks"
  | "snake"
  | "tic_tac_toe"
  | "puzzle_slide"
  | "word_search"
  | "hangman"
  | "treasure_hunt";

export interface GameResult {
  score?: number;          // skill games
  outcome?: string;         // freeform e.g. wheel landed on segment N
  durationMs?: number;
}

export interface GameProps {
  campaignId: string;
  config: Record<string, unknown>;
  theme: { brandColor?: string; brandFg?: string };
  onComplete: (result: GameResult) => void;
}

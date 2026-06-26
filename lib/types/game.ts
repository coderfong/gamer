export type GameType =
  | "spin_wheel"
  | "scratch"
  | "memory"
  | "slot_machine"
  | "lucky_dip"
  | "quiz"
  | "tap_target"
  | "whack_a_mole"
  | "pop_balloon"
  | "wheel_of_fortune"
  | "card_flip"
  | "dice_roll"
  | "pinata"
  | "claw_machine"
  | "color_match"
  | "speed_tap"
  | "reaction"
  | "stack_blocks"
  | "treasure_hunt";

export interface GameResult {
  score?: number;          // skill games
  outcome?: string;         // freeform e.g. wheel landed on segment N
  durationMs?: number;
  // Optional, preview-only hints: the real play flow ignores these (the server
  // decides the prize), but the studio/landing previews use them to show a
  // result screen that matches what the player just saw on screen.
  won?: boolean;            // explicit win/loss when the game can determine it visually
  prizeLabel?: string | null; // what they landed on (e.g. the wheel slice label)
  prizeImage?: string | null; // the asset on the landed slice/box, shown in the result
}

export interface GameProps {
  campaignId: string;
  config: Record<string, unknown>;
  theme: {
    brandColor?: string;
    brandFg?: string;
  };
  onComplete: (result: GameResult) => void;
  editorMode?: boolean;
  onConfigChange?: (patch: Record<string, unknown>) => void;
}

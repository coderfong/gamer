import type { StudioGameAssets, BrandStudioText } from "@/lib/types/studio";

// Which config keys each game exposes as an uploadable "hero" image, and how to
// inject the value (some game configs expect an array of symbols).
export interface HeroSlot {
  key: string;
  label: string;
  asArray?: boolean;   // inject a single image as a 1-element array
  multi?: boolean;     // accept several images (stored in heroList[key])
  max?: number;        // cap for multi slots (default 6)
  unit?: string;       // caption noun for multi slots (e.g. "pair", "target")
}

export const HERO_SLOTS: Record<string, HeroSlot[]> = {
  spin_wheel:     [{ key: "hubLogoUrl", label: "Center logo" }, { key: "pointerImage", label: "Pointer" }, { key: "segmentImages", label: "Segment images (8)", multi: true, max: 8, unit: "segment" }],
  scratch:        [{ key: "coverImage", label: "Scratch cover" }, { key: "winSymbol", label: "Winning symbol" }, { key: "otherSymbols", label: "Other symbol", asArray: true }],
  memory:         [{ key: "cardBackSymbol", label: "Card back" }, { key: "icons", label: "Card faces (one per pair)", multi: true, max: 6, unit: "pair" }],
  lucky_dip:      [{ key: "boxImage", label: "Box" }, { key: "bowSymbol", label: "Bow" }, { key: "winSymbol", label: "Winning symbol" }, { key: "decoys", label: "Other symbols", multi: true, max: 9, unit: "symbol" }],
  whack_a_mole:   [{ key: "moleSymbols", label: "Moles", multi: true, max: 6, unit: "mole" }],
  pop_balloon:    [{ key: "fillImage", label: "Fill image" }],
  wheel_of_fortune: [{ key: "cupImage", label: "Cup" }, { key: "objectSymbol", label: "Hidden object" }],
  card_flip:      [{ key: "targetSymbols", label: "Targets", multi: true, max: 12, unit: "target" }, { key: "crosshairSymbol", label: "Crosshair" }],
  dice_roll:      [{ key: "ballImage", label: "Ball" }, { key: "boardImage", label: "Board background" }],
  pinata:         [{ key: "movingSymbol", label: "Moving icon" }, { key: "targetSymbol", label: "Target icon" }],
  claw_machine:   [{ key: "catcherSymbol", label: "Catcher" }, { key: "goodSymbols", label: "Good items (catch)", multi: true, max: 8, unit: "good item" }, { key: "badSymbols", label: "Bad items (avoid)", multi: true, max: 8, unit: "bad item" }],
  color_match:    [{ key: "coreSymbol", label: "Core" }, { key: "pinHead", label: "Pin head" }],
  tap_target:     [{ key: "targetImage", label: "Target" }, { key: "idleEmoji", label: "Idle icon" }],
  speed_tap:      [{ key: "buttonImage", label: "Button" }],
  reaction:       [{ key: "goSymbol", label: "Go icon" }],
  stack_blocks:   [{ key: "pictureImage", label: "Picture" }, { key: "arenaImage", label: "Background" }],
  treasure_hunt:  [{ key: "mainSymbol", label: "Revealed icon" }],
  slot_machine:   [{ key: "fillImage", label: "Moving object" }, { key: "outlineImage", label: "Outline" }],
  // quiz: no single hero slot (theme only — per-question images set in the editor)
};

export function heroSlotsFor(gameType: string): HeroSlot[] {
  return HERO_SLOTS[gameType] ?? [];
}

// Build a game config that injects the studio's hero images (and, later,
// background/overlay-derived keys) so previews and the play hub reflect them.
export function buildGameConfig(
  gameType: string,
  assets: StudioGameAssets | undefined,
  text?: BrandStudioText,
): Record<string, unknown> {
  const cfg: Record<string, unknown> = {};

  // Brand body style drives every game's instruction line (font / colour / size).
  if (text) {
    const b = text.body;
    if (b.font) cfg.instructionFontFamily = b.font;
    if (b.color) cfg.instructionColor = b.color;
    cfg.instructionFontSize = b.size;
  }

  if (!assets) return cfg;
  const slots = heroSlotsFor(gameType);
  for (const slot of slots) {
    if (slot.multi) {
      const list = assets.heroList?.[slot.key];
      if (list && list.length) cfg[slot.key] = list;
    } else {
      const url = assets.hero?.[slot.key];
      if (url) cfg[slot.key] = slot.asArray ? [url] : url;
    }
  }
  // Memory: match the number of pairs to the uploaded card faces.
  if (gameType === "memory" && Array.isArray(cfg.icons) && (cfg.icons as string[]).length) {
    cfg.pairs = Math.max(3, Math.min(6, (cfg.icons as string[]).length));
  }
  // Ring Shooter: show exactly one of each uploaded target around the ring.
  if (gameType === "card_flip" && Array.isArray(cfg.targetSymbols) && (cfg.targetSymbols as string[]).length) {
    cfg.targetCount = Math.max(3, Math.min(12, (cfg.targetSymbols as string[]).length));
  }
  // Spin Wheel: standardise to 8 slices when segment images are used.
  if (gameType === "spin_wheel" && Array.isArray(cfg.segmentImages) && (cfg.segmentImages as string[]).length) {
    cfg.numSlices = 8;
  }
  // Spin Wheel: flip a custom pointer image vertically when requested.
  if (gameType === "spin_wheel" && assets.pointerFlipY) {
    cfg.pointerFlipY = true;
  }
  // Fill Outline: pass through the outline image scale.
  if (gameType === "slot_machine" && typeof assets.outlineScale === "number") {
    cfg.outlineScale = assets.outlineScale;
  }
  // Scratch card: pass through the cover-image scale (% of the panel).
  if (gameType === "scratch" && typeof assets.coverScale === "number") {
    cfg.coverScale = assets.coverScale;
  }
  // Plinko: pass through the board background image size (width/height %) and goal.
  if (gameType === "dice_roll") {
    if (typeof assets.boardImageW === "number") cfg.boardImageW = assets.boardImageW;
    if (typeof assets.boardImageH === "number") cfg.boardImageH = assets.boardImageH;
    if (typeof assets.goalSlot === "number") cfg.goalSlot = assets.goalSlot;
  }
  return cfg;
}

"use client";
import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type RefObject,
  type CSSProperties,
  type ReactNode,
} from "react";
import { GameByType } from "@/components/games/GameWrapper";
import type { GameType } from "@/lib/types/game";
import type { FreeTextBlock, OverlayElement } from "@/lib/types/campaign";
import type { BuilderCampaign, BuilderTheme } from "./types";

const ANIM_MAP: Record<string, string> = {
  float:         "el-float 2.4s ease-in-out infinite",
  spin:          "el-spin 3s linear infinite",
  pulse:         "el-pulse 1.6s ease-in-out infinite",
  bounce:        "el-bounce 1.2s ease infinite",
  shake:         "el-shake 0.8s ease-in-out infinite",
  wiggle:        "el-wiggle 1.2s ease-in-out infinite",
  swing:         "el-swing 2s ease-in-out infinite",
  "rubber-band": "el-rubber-band 2s ease infinite",
  heartbeat:     "el-heartbeat 2.4s ease-in-out infinite",
  jello:         "el-jello 3s ease infinite",
  tada:          "el-tada 2.5s ease infinite",
};

function overlayAnimStyle(el: OverlayElement): CSSProperties {
  return el.animation !== "none"
    ? ({ "--el-rot": `${el.rotation}deg`, animation: ANIM_MAP[el.animation] } as CSSProperties)
    : { transform: `rotate(${el.rotation}deg)` };
}

function overlayFlipStyle(el: OverlayElement): CSSProperties | undefined {
  const parts = [el.flipH && "scaleX(-1)", el.flipV && "scaleY(-1)"].filter(Boolean);
  return parts.length ? { transform: parts.join(" ") } : undefined;
}

const NAME_DEFAULT: FreeTextBlock = { x: 16, y: 16, fontSize: 24, align: "left" };
const HEADLINE_DEFAULT: FreeTextBlock = { x: 16, y: 50, fontSize: 13, align: "left" };

export function GamePreview({
  campaign,
  onThemeChange,
  onConfigChange,
}: {
  campaign: BuilderCampaign;
  onThemeChange?: (patch: Partial<BuilderTheme>) => void;
  onConfigChange?: (patch: Record<string, unknown>) => void;
}) {
  const [playKey, setPlayKey] = useState(0);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!campaign.game_type) return null;

  const theme = campaign.theme;
  const editable = !!onThemeChange;
  const nameBlock = theme.nameBlock ?? NAME_DEFAULT;
  const headlineBlock = theme.headlineBlock ?? HEADLINE_DEFAULT;

  return (
    <div
      ref={containerRef}
      className="relative arcade-shell min-h-full"
      onPointerDown={(e) => {
        // Deselect overlay when clicking empty areas
        if (!(e.target as HTMLElement).closest("[data-overlay-el]")) {
          setSelectedOverlayId(null);
        }
      }}
      style={
        {
          "--brand-color": theme.brandColor ?? "#6d28d9",
          "--brand-fg": theme.brandFg ?? "#ffffff",
          fontFamily: theme.fontFamily ?? "inherit",
          backgroundColor: theme.bgColor ?? undefined,
          backgroundImage: theme.bgImageUrl ? `url(${theme.bgImageUrl})` : undefined,
          backgroundSize: theme.bgImageUrl ? "cover" : undefined,
          backgroundPosition: theme.bgImageUrl ? "center" : undefined,
          backgroundRepeat: theme.bgImageUrl ? "no-repeat" : undefined,
        } as CSSProperties
      }
    >
      {/* Preview notice */}
      <div className="px-4 pt-3">
        <div className="rounded-lg bg-amber-400/90 text-amber-950 text-xs font-semibold text-center px-3 py-1.5">
          Preview — plays don&apos;t count
        </div>
      </div>

      {/* Logo + static name (non-editable) or logo-only (editable, name is draggable) */}
      <div className="px-4 pt-3 flex items-center gap-2">
        {theme.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={theme.logoUrl}
            alt=""
            className="h-9 w-9 rounded-lg object-contain bg-white/90 border-2 border-white/30 p-0.5"
          />
        ) : (
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center arcade-title text-lg shrink-0"
            style={{
              background: "var(--brand-color)",
              color: "var(--brand-fg)",
              boxShadow: "inset 0 2px 0 rgba(255,255,255,0.3)",
            }}
          >
            {(campaign.name || "?").slice(0, 1)}
          </div>
        )}
        {!editable && (
          <div className="arcade-title text-xl leading-tight">
            {campaign.name || "Your campaign"}
          </div>
        )}
      </div>

      {/* Static headline above game panel (non-editable mode) */}
      {!editable && theme.headline && (
        <div className="px-4 pt-3 arcade-title text-xl leading-tight" style={{ color: "var(--brand-color)" }}>
          {theme.headline}
        </div>
      )}

      {/* Game panel */}
      <div className="px-4 pb-6" style={{ paddingTop: editable ? "3.5rem" : "0.75rem" }}>
        <div className="max-w-md mx-auto">
          <div className="p-6 relative">
            <GameByType
              key={playKey}
              gameType={campaign.game_type as GameType}
              campaignId={campaign.id ?? "preview"}
              config={(campaign.config as Record<string, unknown>) ?? {}}
              theme={{
                brandColor: theme.brandColor,
                brandFg: theme.brandFg,
              }}
              onComplete={() => setTimeout(() => setPlayKey((k) => k + 1), 2500)}
              editorMode={editable}
              onConfigChange={editable ? onConfigChange : undefined}
            />
          </div>
        </div>
      </div>

      {/* Overlay elements — static in preview, interactive in editor */}
      {(theme.overlayElements ?? []).map((el) =>
        editable ? (
          <DraggableOverlay
            key={el.id}
            el={el}
            isSelected={selectedOverlayId === el.id}
            onSelect={() => setSelectedOverlayId(el.id)}
            containerRef={containerRef}
            onChange={(patch) => {
              if (!onThemeChange) return;
              onThemeChange({
                overlayElements: (theme.overlayElements ?? []).map((e) =>
                  e.id === el.id ? { ...e, ...patch } : e
                ),
              });
            }}
          />
        ) : (
          <div
            key={el.id}
            style={{
              position: "absolute",
              left: el.x,
              top: el.y,
              width: el.width,
              height: el.height,
              opacity: el.opacity,
              pointerEvents: "none",
              transformOrigin: "center center",
              ...overlayAnimStyle(el),
            }}
          >
            <div style={{ width: "100%", height: "100%", ...overlayFlipStyle(el) }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={el.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            </div>
          </div>
        )
      )}

      {/* Draggable text overlays — editor only */}
      {editable && (
        <>
          <DraggableText
            containerRef={containerRef}
            block={nameBlock}
            onChange={(b) => onThemeChange({ nameBlock: b })}
            className="arcade-title"
            style={{ color: "var(--brand-color)", fontSize: nameBlock.fontSize }}
            label="Name"
          >
            {campaign.name || "Your campaign"}
          </DraggableText>

          {theme.headline && (
            <DraggableText
              containerRef={containerRef}
              block={headlineBlock}
              onChange={(b) => onThemeChange({ headlineBlock: b })}
              className="arcade-title"
              style={{ fontSize: headlineBlock.fontSize, color: "var(--brand-color)" }}
              label="Headline"
            >
              {theme.headline}
            </DraggableText>
          )}

          <div className="absolute bottom-2 right-3 text-[10px] text-zinc-400 select-none pointer-events-none">
            drag · corner = resize · L/C = align
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draggable + resizable + alignable text block
// ---------------------------------------------------------------------------
const TOOLBAR_H = 28; // px — space reserved above text for the toolbar

function DraggableText({
  containerRef,
  block,
  onChange,
  children,
  className = "",
  style,
  label,
}: {
  containerRef: RefObject<HTMLDivElement>;
  block: FreeTextBlock;
  onChange: (b: FreeTextBlock) => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  label: string;
}) {
  const [active, setActive] = useState(false);

  const blockRef = useRef(block);
  const onChangeRef = useRef(onChange);
  blockRef.current = block;
  onChangeRef.current = onChange;

  const dragState = useRef<{ sx: number; sy: number; bx: number; by: number } | null>(null);
  const resizeState = useRef<{ sx: number; sfs: number } | null>(null);

  const onDragMove = useCallback(
    (e: PointerEvent) => {
      const d = dragState.current;
      if (!d || !containerRef.current) return;
      onChangeRef.current({
        ...blockRef.current,
        x: Math.max(0, d.bx + (e.clientX - d.sx)),
        // subtract TOOLBAR_H so stored y stays relative to text top, not wrapper top
        y: Math.max(0, d.by + (e.clientY - d.sy)),
      });
    },
    [containerRef]
  );

  const onDragUp = useCallback(() => {
    dragState.current = null;
    window.removeEventListener("pointermove", onDragMove);
  }, [onDragMove]);

  const onResizeMove = useCallback((e: PointerEvent) => {
    const r = resizeState.current;
    if (!r) return;
    onChangeRef.current({
      ...blockRef.current,
      fontSize: Math.max(8, Math.min(80, r.sfs + (e.clientX - r.sx) * 0.4)),
    });
  }, []);

  const onResizeUp = useCallback(() => {
    resizeState.current = null;
    window.removeEventListener("pointermove", onResizeMove);
  }, [onResizeMove]);

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onDragMove);
      window.removeEventListener("pointermove", onResizeMove);
    };
  }, [onDragMove, onResizeMove]);

  const align = block.align ?? "left";

  // The wrapper is shifted up by TOOLBAR_H so the toolbar lives inside its
  // bounding box — no gap between text and toolbar when moving the mouse up.
  return (
    <div
      style={{
        position: "absolute",
        left: block.x,
        top: block.y - TOOLBAR_H,   // shift wrapper up to include toolbar area
        paddingTop: TOOLBAR_H,       // push text back to its intended position
        cursor: "move",
        userSelect: "none",
        touchAction: "none",
      }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onPointerDown={(e) => {
        // Only start drag from the text area, not toolbar buttons
        if ((e.target as HTMLElement).closest("button")) return;
        e.stopPropagation();
        dragState.current = { sx: e.clientX, sy: e.clientY, bx: block.x, by: block.y };
        window.addEventListener("pointermove", onDragMove);
        window.addEventListener("pointerup", onDragUp, { once: true });
      }}
    >
      {/* Toolbar — always in DOM, visibility driven by React state (no gap issue) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: TOOLBAR_H,
          display: "flex",
          alignItems: "center",
          gap: 1,
          opacity: active ? 1 : 0,
          pointerEvents: active ? "auto" : "none",
          transition: "opacity 0.1s",
        }}
      >
        <span
          style={{
            background: "#6D4AFF",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            padding: "2px 6px",
            borderRadius: "3px 0 0 3px",
          }}
        >
          {label}
        </span>
        <button
          type="button"
          title="Align left"
          style={{
            background: align === "left" ? "#6D4AFF" : "#e0d9ff",
            color: align === "left" ? "#fff" : "#4A2FCC",
            border: "none",
            padding: "2px 6px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            lineHeight: 1,
          }}
          onClick={() => onChange({ ...block, align: "left" })}
        >
          ≡
        </button>
        <button
          type="button"
          title="Align center"
          style={{
            background: align === "center" ? "#6D4AFF" : "#e0d9ff",
            color: align === "center" ? "#fff" : "#4A2FCC",
            border: "none",
            padding: "2px 6px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            borderRadius: "0 3px 3px 0",
            lineHeight: 1,
          }}
          onClick={() => onChange({ ...block, align: "center" })}
        >
          ☰
        </button>
      </div>

      {/* Text content */}
      <div
        className={className}
        style={{
          textAlign: align,
          outline: "1.5px dashed rgba(109,74,255,0.5)",
          outlineOffset: 4,
          borderRadius: 4,
          padding: "0 2px",
          ...style,
        }}
      >
        {children}
      </div>

      {/* Resize handle — bottom-right of text */}
      <div
        style={{
          position: "absolute",
          right: -12,
          bottom: -12,
          width: 16,
          height: 16,
          background: "white",
          border: "2px solid #231B2E",
          borderRadius: 3,
          cursor: "ew-resize",
          touchAction: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: active ? 1 : 0.4,
          transition: "opacity 0.1s",
        }}
        title="Drag left/right to resize font"
        onPointerDown={(e) => {
          e.stopPropagation();
          resizeState.current = { sx: e.clientX, sfs: block.fontSize };
          window.addEventListener("pointermove", onResizeMove);
          window.addEventListener("pointerup", onResizeUp, { once: true });
        }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1 4h6M5 2l2 2-2 2" stroke="#231B2E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draggable, resizable, rotatable overlay image element
// ---------------------------------------------------------------------------
function DraggableOverlay({
  el,
  isSelected,
  onSelect,
  containerRef,
  onChange,
}: {
  el: OverlayElement;
  isSelected: boolean;
  onSelect: () => void;
  containerRef: RefObject<HTMLDivElement>;
  onChange: (patch: Partial<OverlayElement>) => void;
}) {
  const moveDrag   = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const resizeDrag = useRef<{ sx: number; sy: number; ow: number; oh: number } | null>(null);
  const rotateDrag = useRef<{ startRotation: number; initialAngle: number; cx: number; cy: number } | null>(null);

  return (
    <div
      data-overlay-el="true"
      style={{
        position: "absolute",
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        opacity: el.opacity,
        transformOrigin: "center center",
        ...overlayAnimStyle(el),
        cursor: isSelected ? "move" : "pointer",
        outline: isSelected ? "2px dashed #6D4AFF" : "none",
        outlineOffset: 2,
        zIndex: 10,
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerDown={(e) => {
        if (!isSelected) return;
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        moveDrag.current = { sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y };
      }}
      onPointerMove={(e) => {
        if (!moveDrag.current) return;
        const d = moveDrag.current;
        onChange({ x: Math.round(d.ox + e.clientX - d.sx), y: Math.round(d.oy + e.clientY - d.sy) });
      }}
      onPointerUp={() => { moveDrag.current = null; }}
    >
      <div style={{ width: "100%", height: "100%", ...overlayFlipStyle(el) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={el.imageUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", userSelect: "none", pointerEvents: "none" }}
          draggable={false}
        />
      </div>

      {isSelected && (
        <>
          {/* Rotate handle — top centre */}
          <div
            style={{
              position: "absolute",
              top: -26,
              left: "50%",
              transform: "translateX(-50%)",
              width: 20,
              height: 20,
              background: "#6D4AFF",
              border: "2.5px solid white",
              borderRadius: "50%",
              cursor: "crosshair",
              zIndex: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 11,
              fontWeight: 700,
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }}
            title="Drag to rotate"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              const rect = containerRef.current!.getBoundingClientRect();
              const cx = rect.left + el.x + el.width / 2;
              const cy = rect.top + el.y + el.height / 2;
              rotateDrag.current = {
                startRotation: el.rotation,
                initialAngle: Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI,
                cx,
                cy,
              };
            }}
            onPointerMove={(e) => {
              if (!rotateDrag.current) return;
              const d = rotateDrag.current;
              const angle = Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180 / Math.PI;
              onChange({ rotation: Math.round(d.startRotation + angle - d.initialAngle) });
            }}
            onPointerUp={() => { rotateDrag.current = null; }}
          >
            ↻
          </div>

          {/* Resize handle — bottom-right corner */}
          <div
            style={{
              position: "absolute",
              bottom: -8,
              right: -8,
              width: 18,
              height: 18,
              background: "white",
              border: "2px solid #6D4AFF",
              borderRadius: 4,
              cursor: "se-resize",
              zIndex: 11,
              boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            }}
            title="Drag to resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              resizeDrag.current = { sx: e.clientX, sy: e.clientY, ow: el.width, oh: el.height };
            }}
            onPointerMove={(e) => {
              if (!resizeDrag.current) return;
              const d = resizeDrag.current;
              onChange({
                width:  Math.max(20, Math.round(d.ow + e.clientX - d.sx)),
                height: Math.max(20, Math.round(d.oh + e.clientY - d.sy)),
              });
            }}
            onPointerUp={() => { resizeDrag.current = null; }}
          />
        </>
      )}
    </div>
  );
}

export default GamePreview;

"use client";

import type { OverlayElement, OverlayAnimation } from "@/lib/types/campaign";

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

// The set of animations currently active on an element. Prefers the new
// `animations` array; falls back to the legacy single `animation` field.
// "none" is filtered out so an empty result means "no animation".
export function activeAnimations(el: OverlayElement): OverlayAnimation[] {
  const list =
    el.animations && el.animations.length
      ? el.animations
      : el.animation
        ? [el.animation]
        : [];
  return list.filter((a) => a && a !== "none");
}

// Renders the element's image with flip + every active animation composed
// together. Each animation lives on its own nested layer so their transforms
// stack (e.g. float + spin + pulse all run at once) instead of overwriting one
// another. The static rotation is applied by the caller on the outer box, so
// these layers run with --el-rot:0.
export function OverlayInner({ el }: { el: OverlayElement }) {
  const anims = activeAnimations(el);
  const flipParts = [el.flipH && "scaleX(-1)", el.flipV && "scaleY(-1)"].filter(Boolean);
  const flipStyle = flipParts.length ? { transform: flipParts.join(" ") } : undefined;

  let node: React.ReactNode = (
    <div style={{ width: "100%", height: "100%", ...flipStyle }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={el.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
    </div>
  );

  for (const a of anims) {
    node = (
      <div style={{ width: "100%", height: "100%", ["--el-rot" as string]: "0deg", animation: ANIM_MAP[a] }}>
        {node}
      </div>
    );
  }
  return <>{node}</>;
}

// Static (non-interactive) render of overlay elements — shared by the studio
// previews and the public play hub.
export function StudioOverlays({ overlays }: { overlays: OverlayElement[] }) {
  return (
    <>
      {overlays.map((el) => (
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
            transform: `rotate(${el.rotation}deg)`,
          }}
        >
          <OverlayInner el={el} />
        </div>
      ))}
    </>
  );
}

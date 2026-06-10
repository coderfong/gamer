"use client";

import type { OverlayElement } from "@/lib/types/campaign";

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

// Static (non-interactive) render of overlay elements — shared by the studio
// previews and the public play hub.
export function StudioOverlays({ overlays }: { overlays: OverlayElement[] }) {
  return (
    <>
      {overlays.map((el) => {
        const animStyle =
          el.animation !== "none"
            ? ({ ["--el-rot" as string]: `${el.rotation}deg`, animation: ANIM_MAP[el.animation] } as React.CSSProperties)
            : { transform: `rotate(${el.rotation}deg)` };
        const flipParts = [el.flipH && "scaleX(-1)", el.flipV && "scaleY(-1)"].filter(Boolean);
        const flipStyle = flipParts.length ? { transform: flipParts.join(" ") } : undefined;
        return (
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
              ...animStyle,
            }}
          >
            <div style={{ width: "100%", height: "100%", ...flipStyle }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={el.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            </div>
          </div>
        );
      })}
    </>
  );
}

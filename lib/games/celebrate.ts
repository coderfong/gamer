// Win celebration using canvas-confetti. Imported lazily and guarded for SSR.
import { lighten, darken, rotateHue } from "./colors";

type ConfettiFn = (opts: Record<string, unknown>) => void;

let loaded: Promise<ConfettiFn> | null = null;

function getConfetti(): Promise<ConfettiFn> {
  if (!loaded) {
    loaded = import("canvas-confetti").then(
      (m) => (m as unknown as { default?: ConfettiFn }).default ?? (m as unknown as ConfettiFn),
    );
  }
  return loaded;
}

/** A celebratory burst themed to the brand color. Safe no-op on the server. */
export async function celebrate(brandColor?: string): Promise<void> {
  if (typeof window === "undefined") return;
  const base = brandColor || "#6d28d9";
  const colors = [
    base,
    lighten(base, 0.35),
    darken(base, 0.2),
    rotateHue(base, 35),
    rotateHue(base, -35),
    "#ffffff",
  ];
  const confetti = await getConfetti();

  // Center pop.
  confetti({
    particleCount: 120,
    spread: 80,
    startVelocity: 45,
    origin: { y: 0.6 },
    colors,
    scalar: 1.05,
  });

  // Side cannons, slightly delayed for a layered feel.
  const fire = (originX: number, angle: number) =>
    confetti({
      particleCount: 60,
      angle,
      spread: 65,
      startVelocity: 50,
      origin: { x: originX, y: 0.7 },
      colors,
    });
  setTimeout(() => fire(0.1, 60), 180);
  setTimeout(() => fire(0.9, 120), 320);

  // A gentle falling drizzle.
  setTimeout(() => {
    confetti({
      particleCount: 50,
      spread: 120,
      startVelocity: 25,
      gravity: 0.6,
      decay: 0.92,
      origin: { y: 0 },
      colors,
      scalar: 0.9,
    });
  }, 500);
}

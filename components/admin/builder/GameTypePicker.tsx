"use client";

import { useState } from "react";
import { GAME_META } from "@/lib/games/gameMeta";
import type { GameType } from "@/lib/types/game";
import type { BuilderCampaign } from "./types";

export function GameTypePicker({
  campaign,
  onCreated,
}: {
  campaign: BuilderCampaign;
  onCreated: (c: BuilderCampaign) => void;
}) {
  const [busy, setBusy] = useState<GameType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(gameType: GameType) {
    if (busy) return;
    setBusy(gameType);
    setError(null);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ game_type: gameType }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not create campaign.");
        return;
      }
      onCreated({
        ...campaign,
        id: json.id,
        slug: json.slug ?? null,
        game_type: gameType,
        status: "draft",
        name: `${GAME_META[gameType].label} campaign`,
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const entries = Object.entries(GAME_META) as Array<[GameType, (typeof GAME_META)[GameType]]>;

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([type, meta]) => {
          const disabled = !meta.enabled || busy !== null;
          return (
            <button
              key={type}
              type="button"
              disabled={disabled}
              onClick={() => meta.enabled && pick(type)}
              className={[
                "text-left rounded-xl border p-4 transition relative",
                meta.enabled
                  ? "bg-white hover:border-brand hover:shadow-sm cursor-pointer"
                  : "bg-zinc-50 opacity-60 cursor-not-allowed",
              ].join(" ")}
            >
              <div className="text-3xl">{meta.icon}</div>
              <div className="mt-2 font-medium">{meta.label}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{meta.description}</div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-zinc-400">
                  {meta.category}
                </span>
                {!meta.enabled ? (
                  <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-600">
                    Coming soon
                  </span>
                ) : null}
                {busy === type ? <span className="text-xs text-zinc-500">Creating…</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default GameTypePicker;

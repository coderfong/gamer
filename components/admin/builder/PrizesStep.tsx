"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GAME_META } from "@/lib/games/gameMeta";
import type { GameType } from "@/lib/types/game";
import type { BuilderCampaign, PrizeDraft } from "./types";

function emptyPrize(): PrizeDraft {
  return {
    name: "",
    description: "",
    image_url: null,
    weight: 10,
    stock_total: 10,
    is_loss: false,
    min_score: null,
    pendingCodes: [],
    existingCodeCount: 0,
  };
}

function parseCodes(text: string): string[] {
  return text
    .split(/[\r\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function PrizesStep({
  campaign,
  prizes,
  setPrizes,
  onBack,
  onNext,
}: {
  campaign: BuilderCampaign;
  prizes: PrizeDraft[];
  setPrizes: (updater: (p: PrizeDraft[]) => PrizeDraft[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSkill =
    campaign.game_type && GAME_META[campaign.game_type as GameType]?.category === "skill";

  const nonLossWeight = prizes
    .filter((p) => !p.is_loss)
    .reduce((sum, p) => sum + (p.weight || 0), 0);

  function updatePrize(i: number, patch: Partial<PrizeDraft>) {
    setPrizes((arr) => arr.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function removePrize(i: number) {
    setPrizes((arr) => arr.filter((_, idx) => idx !== i));
  }
  function addPrize() {
    setPrizes((arr) => [...arr, emptyPrize()]);
  }
  function addConsolation() {
    setPrizes((arr) => [
      ...arr,
      {
        ...emptyPrize(),
        name: "Better luck next time",
        weight: 0,
        stock_total: null,
        is_loss: true,
      },
    ]);
  }

  async function uploadPrizeImage(i: number, file: File) {
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${campaign.brandId}/prize-images/${campaign.id}-${i}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("brand-assets")
        .upload(path, file, { upsert: true });
      if (upErr) {
        setError(`Image upload failed: ${upErr.message}`);
        return;
      }
      const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
      updatePrize(i, { image_url: data.publicUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    }
  }

  function validate(): string | null {
    if (prizes.length === 0) return "Add at least one prize.";
    if (prizes.some((p) => !p.name.trim())) return "Every prize needs a name.";
    if (nonLossWeight > 100) return "Win probabilities add up to more than 100%.";
    return null;
  }

  async function saveAndNext() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Assign tiers: non-loss prizes 1..N in order, loss prizes -> 9.
      let tierCounter = 0;
      const payload = prizes.map((p) => {
        const tier = p.is_loss ? 9 : ++tierCounter;
        return {
          id: p.id,
          name: p.name.trim(),
          description: p.description || null,
          image_url: p.image_url || null,
          tier,
          weight: Math.round(p.weight || 0),
          stock_total: p.stock_total ?? null,
          is_loss: p.is_loss,
          min_score: isSkill ? p.min_score ?? null : null,
        };
      });

      const putRes = await fetch(`/api/admin/campaigns/${campaign.id}/prizes`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prizes: payload }),
      });
      const putJson = await putRes.json();
      if (!putRes.ok) {
        setError(putJson?.error?.message ?? "Could not save prizes.");
        return;
      }

      // Re-fetch to resolve ids for newly-created prizes, then upload pending codes.
      const getRes = await fetch(`/api/admin/campaigns/${campaign.id}/prizes`);
      const getJson = await getRes.json();
      const dbPrizes: Array<{
        id: string;
        name: string;
        voucher_codes?: Array<{ count: number }>;
      }> = getJson.prizes ?? [];
      const idByName = new Map(dbPrizes.map((p) => [p.name, p.id]));
      const countByName = new Map(
        dbPrizes.map((p) => [p.name, p.voucher_codes?.[0]?.count ?? 0]),
      );

      for (const p of prizes) {
        const codes = p.pendingCodes ?? [];
        if (codes.length === 0) continue;
        const prizeId = p.id ?? idByName.get(p.name.trim());
        if (!prizeId) continue;
        const res = await fetch(`/api/admin/campaigns/${campaign.id}/voucher-codes`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prize_id: prizeId, codes }),
        });
        if (!res.ok) {
          const j = await res.json();
          setError(j?.error?.message ?? "Could not upload voucher codes.");
          return;
        }
      }

      // Sync local state with resolved ids + code counts; clear pending.
      setPrizes((arr) =>
        arr.map((p) => {
          const id = p.id ?? idByName.get(p.name.trim());
          const baseCount = countByName.get(p.name.trim()) ?? 0;
          return {
            ...p,
            id,
            existingCodeCount: baseCount + (p.pendingCodes?.length ?? 0),
            pendingCodes: [],
          };
        }),
      );

      onNext();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-600">
          Win probabilities for winning prizes total{" "}
          <strong className={nonLossWeight > 100 ? "text-red-600" : ""}>{nonLossWeight}%</strong>
          {nonLossWeight < 100 ? " — the rest is a loss/consolation outcome." : ""}
        </p>
      </div>

      <div className="space-y-3">
        {prizes.map((p, i) => {
          const needed = p.is_loss ? 0 : p.stock_total ?? 0;
          const have = p.existingCodeCount ?? 0;
          const pending = p.pendingCodes?.length ?? 0;
          return (
            <div key={p.id ?? i} className="rounded-xl border bg-white p-4 space-y-3">
              <div className="flex items-start gap-3">
                <input
                  value={p.name}
                  onChange={(e) => updatePrize(i, { name: e.target.value })}
                  placeholder="Prize name"
                  className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium"
                />
                {p.is_loss ? (
                  <span className="text-xs px-2 py-1 rounded bg-zinc-100 text-zinc-600">
                    Consolation
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => removePrize(i)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>

              <input
                value={p.description ?? ""}
                onChange={(e) => updatePrize(i, { description: e.target.value })}
                placeholder="Description (optional)"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />

              {!p.is_loss ? (
                <div className="grid sm:grid-cols-3 gap-3">
                  <label className="space-y-1 block">
                    <span className="text-xs text-zinc-600">Win probability: {p.weight}%</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={p.weight}
                      onChange={(e) => updatePrize(i, { weight: Number(e.target.value) })}
                      className="w-full"
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-xs text-zinc-600">Total stock</span>
                    <input
                      type="number"
                      min={0}
                      value={p.stock_total ?? ""}
                      onChange={(e) =>
                        updatePrize(i, {
                          stock_total: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  {isSkill ? (
                    <label className="space-y-1 block">
                      <span className="text-xs text-zinc-600">Min score to win</span>
                      <input
                        type="number"
                        min={0}
                        value={p.min_score ?? ""}
                        onChange={(e) =>
                          updatePrize(i, {
                            min_score: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </label>
                  ) : (
                    <label className="space-y-1 block">
                      <span className="text-xs text-zinc-600">Image (optional)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadPrizeImage(i, f);
                        }}
                        className="text-xs"
                      />
                    </label>
                  )}
                </div>
              ) : null}

              {!p.is_loss ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-600">Voucher codes (one per line, or paste CSV)</span>
                    <span
                      className={`text-xs ${
                        have + pending >= needed ? "text-green-600" : "text-amber-600"
                      }`}
                    >
                      {have + pending} uploaded / {needed} needed
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    defaultValue=""
                    placeholder={"CODE-0001\nCODE-0002"}
                    onChange={(e) => updatePrize(i, { pendingCodes: parseCodes(e.target.value) })}
                    className="w-full rounded-lg border px-3 py-2 text-sm font-mono"
                  />
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const text = await f.text();
                      updatePrize(i, { pendingCodes: parseCodes(text) });
                    }}
                    className="text-xs"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addPrize} className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50">
          + Add prize
        </button>
        {!prizes.some((p) => p.is_loss) ? (
          <button
            type="button"
            onClick={addConsolation}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50"
          >
            + Add consolation prize
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="rounded-lg border px-4 py-2 text-sm">
          Back
        </button>
        <button onClick={saveAndNext} disabled={saving} className="btn-brand">
          {saving ? "Saving…" : "Save & continue"}
        </button>
      </div>
    </div>
  );
}

export default PrizesStep;

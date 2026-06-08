"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  pauseCampaign,
  resumeCampaign,
  endCampaign,
  duplicateCampaign,
  deleteCampaign,
} from "@/app/(admin)/dashboard/actions";
import { getGameMeta } from "@/lib/games/gameMeta";
import type { CampaignStatus } from "@/lib/types/database";

export interface CampaignCardData {
  id: string;
  slug: string;
  name: string;
  game_type: string;
  status: CampaignStatus;
  starts_at: string | null;
  ends_at: string | null;
  plays_count: number;
  win_rate: number | null; // 0..1, or null when no plays
  vouchers_remaining: number;
}

const STATUS_BADGE: Record<CampaignStatus, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-zinc-100 text-zinc-600" },
  active: { label: "Live", cls: "bg-green-100 text-green-700" },
  paused: { label: "Paused", cls: "bg-yellow-100 text-yellow-700" },
  ended: { label: "Ended", cls: "bg-zinc-100 text-zinc-500" },
};

function formatDateRange(starts: string | null, ends: string | null): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (starts && ends) return `${fmt(starts)} – ${fmt(ends)}`;
  if (starts) return `From ${fmt(starts)}`;
  if (ends) return `Until ${fmt(ends)}`;
  return "No dates set";
}

export function CampaignCard({ campaign }: { campaign: CampaignCardData }) {
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const meta = getGameMeta(campaign.game_type);
  const badge = STATUS_BADGE[campaign.status];

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  function showResult(res: { ok?: true } | { error: { message: string } }) {
    if ("error" in res) setActionError(res.error.message);
    else setActionError(null);
  }

  function run(fn: () => Promise<{ ok?: true } | { error: { message: string } }>) {
    setMenuOpen(false);
    startTransition(async () => {
      const res = await fn();
      showResult(res);
    });
  }

  async function copyUrl() {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const url = `${base}/play/${campaign.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast("Public URL copied");
    } catch {
      setToast("Copy failed — " + url);
    }
  }

  const winRateLabel =
    campaign.plays_count === 0 || campaign.win_rate === null
      ? "—"
      : `${Math.round(campaign.win_rate * 100)}%`;

  return (
    <div className="ad relative ad-card p-4 flex flex-col gap-3">
      {/* Row 1: name + status */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold truncate" title={campaign.name}>
          {campaign.name}
        </h3>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* Row 2: game type */}
      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <span className="text-base">{meta.icon}</span>
        <span>{meta.label}</span>
      </div>

      {/* Row 3: stats */}
      <div className="grid grid-cols-3 gap-2 text-center border-y py-2">
        <Stat label="Plays" value={String(campaign.plays_count)} />
        <Stat label="Win rate" value={winRateLabel} />
        <Stat label="Vouchers left" value={String(campaign.vouchers_remaining)} />
      </div>

      {/* Row 4: dates */}
      <div className="text-xs text-zinc-500">{formatDateRange(campaign.starts_at, campaign.ends_at)}</div>

      {actionError ? <div className="text-xs text-red-600">{actionError}</div> : null}

      {/* Row 5: actions */}
      <div className="flex items-center gap-1 text-sm">
        <ActionLink href={`/campaigns/${campaign.id}/edit`}>Edit</ActionLink>
        <ActionLink href={`/campaigns/${campaign.id}/analytics`}>Analytics</ActionLink>
        <ActionLink href={`/campaigns/${campaign.id}/share`}>Share</ActionLink>
        <ActionLink href={`/campaigns/${campaign.id}/preview`}>Preview</ActionLink>
        <button
          type="button"
          onClick={copyUrl}
          className="px-2 py-1 rounded hover:bg-zinc-100 text-zinc-700"
        >
          Copy URL
        </button>

        <div className="relative ml-auto" ref={menuRef}>
          <button
            type="button"
            aria-label="More actions"
            onClick={() => setMenuOpen((v) => !v)}
            disabled={isPending}
            className="px-2 py-1 rounded hover:bg-zinc-100 text-zinc-700 disabled:opacity-50"
          >
            ⋯
          </button>
          {menuOpen ? (
            <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border bg-white py-1 shadow-lg">
              <MenuItem onClick={() => run(() => duplicateCampaign(campaign.id))}>
                Duplicate
              </MenuItem>
              {campaign.status === "active" ? (
                <MenuItem onClick={() => run(() => pauseCampaign(campaign.id))}>Pause</MenuItem>
              ) : null}
              {campaign.status === "paused" ? (
                <MenuItem onClick={() => run(() => resumeCampaign(campaign.id))}>Resume</MenuItem>
              ) : null}
              {campaign.status !== "ended" ? (
                <MenuItem onClick={() => run(() => endCampaign(campaign.id))}>End</MenuItem>
              ) : null}
              <MenuItem
                destructive
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmDelete(true);
                }}
              >
                Delete
              </MenuItem>
            </div>
          ) : null}
        </div>
      </div>

      {/* Toast */}
      {toast ? (
        <div className="absolute -top-2 right-2 -translate-y-full rounded-md bg-zinc-900 text-white text-xs px-3 py-1.5 shadow">
          {toast}
        </div>
      ) : null}

      {/* Delete confirm */}
      {confirmDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 space-y-3">
            <h4 className="font-semibold">Delete “{campaign.name}”?</h4>
            <p className="text-sm text-zinc-600">
              This permanently removes the draft campaign and its prizes. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 rounded-lg text-sm hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setConfirmDelete(false);
                  run(() => deleteCampaign(campaign.id));
                }}
                className="px-3 py-1.5 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-semibold">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</div>
    </div>
  );
}

function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="px-2 py-1 rounded hover:bg-zinc-100 text-zinc-700">
      {children}
    </Link>
  );
}

function MenuItem({
  children,
  onClick,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 ${
        destructive ? "text-red-600" : "text-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

export default CampaignCard;

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { duplicateBrand, deleteBrand, renameBrand } from "@/app/(admin)/brands/actions";

export interface BrandCardData {
  id: string;
  name: string;
  public_slug: string | null;
  games_count: number;
  brand_color: string;
  logo_url: string | null;
}

export function BrandCard({ brand }: { brand: BrandCardData }) {
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(brand.name);
  const [toast, setToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  function run(fn: () => Promise<{ ok?: true } | { error: { message: string } }>) {
    setMenuOpen(false);
    startTransition(async () => {
      const res = await fn();
      if ("error" in res) setActionError(res.error.message);
      else setActionError(null);
    });
  }

  async function copyUrl() {
    if (!brand.public_slug) {
      setToast("No public link yet — open the studio and save once");
      return;
    }
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const url = `${base}/b/${brand.public_slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast("Play-hub URL copied");
    } catch {
      setToast("Copy failed — " + url);
    }
  }

  function submitRename() {
    const next = nameDraft.trim();
    setRenaming(false);
    if (!next || next === brand.name) return;
    run(() => renameBrand(brand.id, next));
  }

  return (
    <div className="ad relative ad-card p-4 flex flex-col gap-3">
      {/* Row 1: logo/swatch + name */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {brand.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logo_url}
              alt=""
              className="h-9 w-9 shrink-0 rounded-lg object-contain"
              style={{ background: "var(--ad-surface2, #f4f4f6)" }}
            />
          ) : (
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-extrabold text-white"
              style={{ background: brand.brand_color }}
            >
              {(brand.name || "B").slice(0, 1).toUpperCase()}
            </span>
          )}
          <h3 className="truncate font-bold" title={brand.name}>
            {brand.name}
          </h3>
        </div>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            aria-label="More actions"
            onClick={() => setMenuOpen((v) => !v)}
            disabled={isPending}
            className="rounded px-2 py-1 text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
          >
            ⋯
          </button>
          {menuOpen ? (
            <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border bg-white py-1 shadow-lg">
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  setNameDraft(brand.name);
                  setRenaming(true);
                }}
              >
                Rename
              </MenuItem>
              <MenuItem onClick={() => run(() => duplicateBrand(brand.id))}>Duplicate</MenuItem>
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

      {/* Row 2: summary */}
      <div className="grid grid-cols-2 gap-2 border-y py-2 text-center">
        <Stat label="Games themed" value={String(brand.games_count)} />
        <Stat label="Play hub" value={brand.public_slug ? "Live" : "—"} />
      </div>

      {/* Palette / accent strip */}
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: brand.brand_color }} />

      {actionError ? <div className="text-xs text-red-600">{actionError}</div> : null}

      {/* Row 3: actions */}
      <div className="flex items-center gap-1 text-sm">
        <Link
          href={`/brand/${brand.id}`}
          className="rounded px-2 py-1 text-zinc-700 hover:bg-zinc-100"
        >
          Edit
        </Link>
        {brand.public_slug ? (
          <Link
            href={`/b/${brand.public_slug}`}
            target="_blank"
            className="rounded px-2 py-1 text-zinc-700 hover:bg-zinc-100"
          >
            Open hub
          </Link>
        ) : null}
        <button
          type="button"
          onClick={copyUrl}
          className="rounded px-2 py-1 text-zinc-700 hover:bg-zinc-100"
        >
          Copy URL
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          disabled={isPending}
          className="ml-auto rounded px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      {/* Toast */}
      {toast ? (
        <div className="absolute -top-2 right-2 -translate-y-full rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-white shadow">
          {toast}
        </div>
      ) : null}

      {/* Rename */}
      {renaming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-xl bg-white p-5">
            <h4 className="font-semibold">Rename brand</h4>
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename();
                if (e.key === "Escape") setRenaming(false);
              }}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenaming(false)}
                className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRename}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete confirm */}
      {confirmDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-xl bg-white p-5">
            <h4 className="font-semibold">Delete “{brand.name}”?</h4>
            <p className="text-sm text-zinc-600">
              This permanently removes the brand and its studio theme, assets, and public play hub.
              Campaigns are not affected. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setConfirmDelete(false);
                  run(() => deleteBrand(brand.id));
                }}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
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
      className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-zinc-100 ${
        destructive ? "text-red-600" : "text-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

export default BrandCard;

"use client";

import { useEffect, useState } from "react";
import { toDataUrl } from "@/lib/utils/qrcode";

interface ShareHubProps {
  campaignName: string;
  shareUrl: string;
  status: string;
  brandColor?: string;
  headline?: string;
}

const STATUS_CLS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  draft: "bg-zinc-200 text-zinc-600",
  ended: "bg-zinc-200 text-zinc-500",
};

export function ShareHub({ campaignName, shareUrl, status, brandColor = "#6d28d9", headline }: ShareHubProps) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    toDataUrl(shareUrl).then(setQr).catch(() => setQr(null));
  }, [shareUrl]);

  function copy(key: string, text: string) {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(key);
        setTimeout(() => setCopied(null), 1600);
      },
      () => setCopied(null),
    );
  }

  const shareText = `Play ${campaignName} and win! 🎁`;
  const embed = `<iframe src="${shareUrl}" width="400" height="720" style="border:0;border-radius:20px;max-width:100%" title="${campaignName}" allow="clipboard-write"></iframe>`;

  const socials: { label: string; icon: string; href: string; cls: string }[] = [
    { label: "WhatsApp", icon: "💬", cls: "bg-[#25D366] text-white", href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}` },
    { label: "X", icon: "𝕏", cls: "bg-black text-white", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
    { label: "Facebook", icon: "f", cls: "bg-[#1877F2] text-white", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
    { label: "Email", icon: "✉", cls: "bg-zinc-700 text-white", href: `mailto:?subject=${encodeURIComponent(campaignName)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}` },
  ];

  return (
    <div className="font-ui" style={{ ["--brand-color" as string]: brandColor }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-zinc-900">{campaignName}</h1>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_CLS[status] ?? STATUS_CLS.draft}`}>
              {status}
            </span>
          </div>
          <p className="text-sm text-zinc-500">{headline || "Share your campaign and start collecting plays."}</p>
        </div>
        <a
          href={shareUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm"
          style={{ background: brandColor }}
        >
          View live ↗
        </a>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Browser-window live preview */}
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            <div className="ml-3 flex-1 truncate rounded-md bg-white border border-zinc-200 px-3 py-1 font-jb text-xs text-zinc-500">
              {shareUrl}
            </div>
          </div>
          <div className="bg-zinc-100">
            <iframe
              src={shareUrl}
              title="Campaign preview"
              className="h-[560px] w-full"
              style={{ border: 0 }}
            />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Link */}
          <Card title="Share link">
            <div className="flex items-center gap-2">
              <div className="flex-1 truncate rounded-lg bg-zinc-100 px-3 py-2 font-jb text-sm text-zinc-700">
                {shareUrl}
              </div>
              <CopyBtn active={copied === "link"} onClick={() => copy("link", shareUrl)} brandColor={brandColor} />
            </div>
          </Card>

          {/* QR */}
          <Card title="QR code">
            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-zinc-200 p-2">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt="Campaign QR" className="h-32 w-32" />
                ) : (
                  <div className="h-32 w-32 animate-pulse rounded bg-zinc-100" />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm text-zinc-500">Print on posters, flyers or table tents.</p>
                {qr ? (
                  <a
                    href={qr}
                    download={`${slugify(campaignName)}-qr.png`}
                    className="inline-block rounded-lg px-3 py-2 text-sm font-semibold text-white"
                    style={{ background: brandColor }}
                  >
                    Download PNG
                  </a>
                ) : null}
              </div>
            </div>
          </Card>

          {/* Social */}
          <Card title="Share to social">
            <div className="grid grid-cols-2 gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${s.cls}`}
                >
                  <span className="text-base leading-none">{s.icon}</span> {s.label}
                </a>
              ))}
            </div>
          </Card>

          {/* Embed */}
          <Card title="Embed on your site">
            <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 font-jb text-[11px] leading-relaxed text-zinc-100">
              {embed}
            </pre>
            <button
              type="button"
              onClick={() => copy("embed", embed)}
              className="mt-2 w-full rounded-lg border border-zinc-200 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              {copied === "embed" ? "Copied!" : "Copy embed code"}
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">{title}</h2>
      {children}
    </section>
  );
}

function CopyBtn({ active, onClick, brandColor }: { active: boolean; onClick: () => void; brandColor: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-white"
      style={{ background: brandColor }}
    >
      {active ? "Copied!" : "Copy"}
    </button>
  );
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "campaign";
}

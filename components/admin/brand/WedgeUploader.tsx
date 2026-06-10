"use client";

import { useState } from "react";
import { WedgeCropModal } from "./WedgeCropModal";

// Pick/drop an image → wedge-crop modal → hands back a wedge-shaped PNG File.
export function WedgeUploader({
  segments,
  busy,
  label,
  onFile,
}: {
  segments: number;
  busy?: boolean;
  label: string;
  onFile: (file: File) => void;
}) {
  const [over, setOver] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  function pick(f: File | undefined | null) {
    if (f && f.type.startsWith("image/")) setPending(URL.createObjectURL(f));
  }

  return (
    <>
      <label
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}
        className="cursor-pointer text-[11px] rounded border px-2 py-1 inline-flex items-center gap-1 transition-colors"
        style={{ color: "var(--ad-body)", borderColor: over ? "var(--ad-accent, #6D4AFF)" : "var(--ad-border)", background: over ? "var(--ad-accent-soft, #f0ebff)" : "transparent", borderStyle: "dashed" }}
      >
        {busy ? "Uploading…" : over ? "Drop image" : label}
        <input type="file" accept="image/*" className="hidden" disabled={busy}
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      {pending && (
        <WedgeCropModal
          src={pending}
          segments={segments}
          onCancel={() => { URL.revokeObjectURL(pending); setPending(null); }}
          onConfirm={(file) => { URL.revokeObjectURL(pending); setPending(null); onFile(file); }}
        />
      )}
    </>
  );
}

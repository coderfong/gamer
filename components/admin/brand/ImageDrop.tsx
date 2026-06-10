"use client";

import { useState } from "react";

// Plain drag-drop + click image uploader (no processing modal). For backgrounds
// and other full-image assets.
export function ImageDrop({
  label,
  busy,
  onFile,
}: {
  label: string;
  busy?: boolean;
  onFile: (file: File) => void;
}) {
  const [over, setOver] = useState(false);

  function pick(file: File | undefined | null) {
    if (file && file.type.startsWith("image/")) onFile(file);
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}
      className="cursor-pointer inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs font-medium transition-colors"
      style={{
        color: "var(--ad-body)",
        borderColor: over ? "var(--ad-accent, #6D4AFF)" : "var(--ad-border)",
        background: over ? "var(--ad-accent-soft, #f0ebff)" : "transparent",
        borderStyle: "dashed",
      }}
    >
      {busy ? "Uploading…" : over ? "Drop image" : label}
      <input type="file" accept="image/*" className="hidden" disabled={busy}
        onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
    </label>
  );
}

"use client";

// Surfaces any render error in the portal segment (so it can't silently blank).
export default function PortalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <pre style={{ padding: 16, color: "#b00020", whiteSpace: "pre-wrap", fontSize: 12, fontFamily: "monospace" }}>
      Portal error: {error?.message || String(error)}
      {error?.digest ? `\n(digest ${error.digest})` : ""}
    </pre>
  );
}

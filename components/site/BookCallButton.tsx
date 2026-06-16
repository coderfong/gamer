"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

export function BookCallButton({
  className = "btn btn-primary",
  label = "Book a call",
}: {
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [err, setErr] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setStatus("idle");
    setErr(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    setStatus("sending");
    setErr(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        setStatus("error");
        setErr("Couldn't send right now — please try again or email us directly.");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
      setErr("Network error — please try again.");
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>

      {open && (
        <div
          className="bc-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Book a call"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="bc-modal">
            <button type="button" className="bc-close" aria-label="Close" onClick={close}>
              ×
            </button>

            {status === "sent" ? (
              <div className="bc-done">
                <div className="bc-done-ico">✅</div>
                <h3>Thanks — we&apos;ll be in touch!</h3>
                <p>Your request has been sent. We&apos;ll reach out shortly.</p>
                <button type="button" className="btn btn-primary" onClick={close}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <h3 className="bc-title">Book a call</h3>
                <p className="bc-sub">Leave your details and we&apos;ll get back to you.</p>
                <form className="bc-form" onSubmit={handleSubmit}>
                  <input className="bc-input" name="name" placeholder="Your name" required maxLength={120} />
                  <input className="bc-input" type="email" name="email" placeholder="Email" required maxLength={200} />
                  <input className="bc-input" name="phone" placeholder="Phone (optional)" maxLength={40} />
                  <input className="bc-input" name="company" placeholder="Company (optional)" maxLength={120} />
                  <textarea
                    className="bc-input"
                    name="message"
                    placeholder="What would you like to talk about? (optional)"
                    rows={3}
                    maxLength={2000}
                  />
                  {/* honeypot — hidden from humans */}
                  <input className="bc-hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                  {status === "error" && <p className="bc-err">{err}</p>}
                  <button type="submit" className="btn btn-primary bc-submit" disabled={status === "sending"}>
                    {status === "sending" ? "Sending…" : "Send request"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

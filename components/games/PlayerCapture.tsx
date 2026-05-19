"use client";
import { useState } from "react";

export interface PlayerCaptureProps {
  onSubmit: (form: { name: string; email: string; phone: string }) => Promise<void> | void;
  submitting?: boolean;
  error?: string | null;
}

export function PlayerCapture({ onSubmit, submitting, error }: PlayerCaptureProps) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(form);
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          className="w-full rounded-lg border px-3 py-2"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Your name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          className="w-full rounded-lg border px-3 py-2"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Phone (optional)</label>
        <input
          className="w-full rounded-lg border px-3 py-2"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+1 555 ..."
        />
      </div>
      {error ? <p className="text-red-600 text-sm">{error}</p> : null}
      <button type="submit" className="btn-brand w-full" disabled={submitting}>
        {submitting ? "Starting..." : "Start"}
      </button>
    </form>
  );
}

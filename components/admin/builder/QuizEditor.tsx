"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BuilderCampaign } from "./types";
import { FONT_OPTIONS } from "./types";

interface QuizQuestion {
  question: string;
  image?: string | null;
  options: string[];
  correctAnswerIndex: number;
  points?: number;
}

interface Props {
  campaign: BuilderCampaign;
  setCampaign: (updater: (c: BuilderCampaign) => BuilderCampaign) => void;
}

function blankQuestion(): QuizQuestion {
  return { question: "", image: null, options: ["", ""], correctAnswerIndex: 0, points: 1 };
}

function toQuestions(raw: unknown): QuizQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((q) => {
    const o = q as Record<string, unknown>;
    const options = (Array.isArray(o.options) ? o.options : Array.isArray(o.answers) ? o.answers : []) as string[];
    let correct = 0;
    if (typeof o.correctAnswerIndex === "number") correct = o.correctAnswerIndex;
    else if (o.correctAnswer != null) correct = Math.max(0, Number(o.correctAnswer) - 1);
    return {
      question: String(o.question ?? ""),
      image: typeof o.image === "string" ? o.image : null,
      options: options.map((x) => String(x ?? "")),
      correctAnswerIndex: correct,
      points: typeof o.points === "number" ? o.points : Number(o.point ?? 1) || 1,
    };
  });
}

export function QuizEditor({ campaign, setCampaign }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = campaign.config;

  function patch(values: Record<string, unknown>) {
    setCampaign((c) => ({ ...c, config: { ...c.config, ...values } }));
  }

  const questions = (() => {
    const qs = toQuestions(config.questions);
    return qs.length ? qs : [blankQuestion()];
  })();

  function setQuestions(qs: QuizQuestion[]) {
    patch({ questions: qs });
  }
  function updateQuestion(i: number, p: Partial<QuizQuestion>) {
    setQuestions(questions.map((q, idx) => (idx === i ? { ...q, ...p } : q)));
  }
  function addQuestion() {
    setQuestions([...questions, blankQuestion()]);
  }
  function removeQuestion(i: number) {
    const next = questions.filter((_, idx) => idx !== i);
    setQuestions(next.length ? next : [blankQuestion()]);
  }
  function setOption(qi: number, oi: number, value: string) {
    const q = questions[qi];
    updateQuestion(qi, { options: q.options.map((o, idx) => (idx === oi ? value : o)) });
  }
  function addOption(qi: number) {
    const q = questions[qi];
    if (q.options.length >= 6) return;
    updateQuestion(qi, { options: [...q.options, ""] });
  }
  function removeOption(qi: number, oi: number) {
    const q = questions[qi];
    if (q.options.length <= 2) return;
    const options = q.options.filter((_, idx) => idx !== oi);
    let correct = q.correctAnswerIndex;
    if (oi === correct) correct = 0;
    else if (oi < correct) correct -= 1;
    updateQuestion(qi, { options, correctAnswerIndex: correct });
  }

  const optionColor   = (config.optionColor   as string | undefined) ?? "#6d28d9";
  const correctColor  = (config.correctColor  as string | undefined) ?? "#16a34a";
  const wrongColor    = (config.wrongColor    as string | undefined) ?? "#dc2626";
  const quizTitle     = (config.quizTitle     as string | undefined) ?? "";
  const feedbackCorrect = (config.feedbackCorrect as string | undefined) ?? "Correct!";
  const feedbackWrong   = (config.feedbackWrong   as string | undefined) ?? "Not quite…";
  const showProgress  = (config.showProgress  as boolean | undefined) ?? true;
  const questionEntrance = (config.questionEntrance as string | undefined) ?? "fade";
  const correctAnimation = (config.correctAnimation as string | undefined) ?? "pop";
  const instructionColor      = (config.instructionColor      as string | undefined) ?? "#1f2937";
  const instructionFontSize   = (config.instructionFontSize   as number | undefined) ?? 18;
  const instructionFontFamily = (config.instructionFontFamily as string | undefined) ?? "";

  async function uploadTo(folder: string, file: File, onDone: (url: string) => void) {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${campaign.brandId}/${folder}/${campaign.id ?? "draft"}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("brand-assets")
        .upload(path, file, { upsert: true });
      if (upErr) { setError(`Upload failed: ${upErr.message}`); return; }
      const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
      onDone(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">

      {/* ── Questions ────────────────────────────────────────── */}
      <Section title={`Questions (${questions.length})`} defaultOpen>
        <div className="space-y-4">
          {questions.map((q, qi) => (
            <div key={qi} className="rounded-xl border bg-zinc-50 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-700">Q{qi + 1}</span>
                <button
                  type="button"
                  onClick={() => removeQuestion(qi)}
                  className="ml-auto text-xs text-red-400 hover:text-red-600"
                >
                  Remove question
                </button>
              </div>

              <input
                value={q.question}
                onChange={(e) => updateQuestion(qi, { question: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm"
                placeholder="Type your question…"
              />

              {/* Question image */}
              <div className="flex items-center gap-2 flex-wrap">
                <label className="cursor-pointer">
                  <input
                    type="file" accept="image/*" className="hidden" disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadTo("quiz", f, (url) => updateQuestion(qi, { image: url }));
                      e.target.value = "";
                    }}
                  />
                  <span className="inline-block rounded border px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 cursor-pointer">
                    {q.image ? "Replace image" : "🖼 Add question image"}
                  </span>
                </label>
                {q.image && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={q.image} alt="" className="h-10 rounded border object-contain" />
                    <button type="button" onClick={() => updateQuestion(qi, { image: null })}
                      className="text-xs text-red-400 hover:text-red-600">Remove</button>
                  </>
                )}
              </div>

              {/* Options */}
              <div className="space-y-1.5">
                <span className="text-xs text-zinc-500">Answers (select the correct one)</span>
                {q.options.map((opt, oi) => {
                  const isImage = /^(https?:\/\/|data:|\/)/.test(opt);
                  return (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qi}`}
                        checked={q.correctAnswerIndex === oi}
                        onChange={() => updateQuestion(qi, { correctAnswerIndex: oi })}
                        title="Mark as correct answer"
                      />
                      {isImage ? (
                        <div className="flex items-center gap-2 flex-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={opt} alt="" className="h-9 rounded border object-contain" />
                          <button type="button" onClick={() => setOption(qi, oi, "")}
                            className="text-xs text-red-400 hover:text-red-600">Clear image</button>
                        </div>
                      ) : (
                        <input
                          value={opt}
                          onChange={(e) => setOption(qi, oi, e.target.value)}
                          className="flex-1 rounded border px-2 py-1 text-sm"
                          placeholder={`Answer ${String.fromCharCode(65 + oi)}`}
                        />
                      )}
                      {!isImage && (
                        <label className="cursor-pointer text-xs text-zinc-400 hover:text-violet-500" title="Use an image">
                          <input
                            type="file" accept="image/*" className="hidden" disabled={uploading}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadTo("quiz", f, (url) => setOption(qi, oi, url));
                              e.target.value = "";
                            }}
                          />
                          🖼
                        </label>
                      )}
                      <button
                        type="button"
                        onClick={() => removeOption(qi, oi)}
                        disabled={q.options.length <= 2}
                        className="text-xs text-zinc-400 hover:text-red-600 disabled:opacity-30"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
                {q.options.length < 6 && (
                  <button type="button" onClick={() => addOption(qi)}
                    className="text-xs text-violet-600 hover:text-violet-800">+ Add answer</button>
                )}
              </div>

              <Field label="Points for correct answer">
                <input
                  type="number" min={0}
                  value={q.points ?? 1}
                  onChange={(e) => updateQuestion(qi, { points: Math.max(0, Number(e.target.value)) })}
                  className="w-24 rounded border px-2 py-1 text-sm"
                />
              </Field>
            </div>
          ))}

          <button
            type="button"
            onClick={addQuestion}
            className="w-full rounded-lg border-2 border-dashed border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:border-violet-400 hover:text-violet-600"
          >
            + Add question
          </button>
        </div>
      </Section>

      {/* ── Styling ──────────────────────────────────────────── */}
      <Section title="Styling">
        <div className="space-y-3">
          <Field label="Quiz title (optional, shown above questions)">
            <input
              value={quizTitle}
              onChange={(e) => patch({ quizTitle: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm"
              placeholder="Test your knowledge!"
            />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Accent colour">
              <input type="color" value={optionColor}
                onChange={(e) => patch({ optionColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
            <Field label="Correct colour">
              <input type="color" value={correctColor}
                onChange={(e) => patch({ correctColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
            <Field label="Wrong colour">
              <input type="color" value={wrongColor}
                onChange={(e) => patch({ wrongColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-2 items-end">
            <Field label="Question text colour">
              <input type="color" value={instructionColor}
                onChange={(e) => patch({ instructionColor: e.target.value })}
                className="w-full h-9 rounded border bg-white" />
            </Field>
            <Field label={`Size · ${instructionFontSize}px`}>
              <input
                type="range" min={12} max={28} step={1}
                value={instructionFontSize}
                onChange={(e) => patch({ instructionFontSize: Number(e.target.value) })}
                className="w-full"
              />
            </Field>
            <Field label="Font">
              <select
                value={instructionFontFamily}
                onChange={(e) => patch({ instructionFontFamily: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm bg-white"
              >
                <option value="">Default</option>
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Correct feedback">
              <input value={feedbackCorrect} onChange={(e) => patch({ feedbackCorrect: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={40} />
            </Field>
            <Field label="Wrong feedback">
              <input value={feedbackWrong} onChange={(e) => patch({ feedbackWrong: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm" maxLength={40} />
            </Field>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showProgress}
              onChange={(e) => patch({ showProgress: e.target.checked })} />
            <span className="text-sm text-zinc-700">Show progress bar</span>
          </label>
        </div>
      </Section>

      {/* ── Animations ──────────────────────────────────────── */}
      <Section title="Animations">
        <div className="space-y-4">
          <Field label="Question entrance">
            <select
              value={questionEntrance}
              onChange={(e) => patch({ questionEntrance: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white"
            >
              <option value="none">None</option>
              <option value="fade">Fade in</option>
              <option value="pop">Pop in</option>
              <option value="zoom">Zoom in</option>
              <option value="drop">Drop in</option>
            </select>
          </Field>
          <Field label="Correct-answer animation">
            <select
              value={correctAnimation}
              onChange={(e) => patch({ correctAnimation: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white"
            >
              <option value="none">None</option>
              <option value="pop">Pop</option>
              <option value="tada">Tada</option>
              <option value="flash">Flash</option>
              <option value="pulse">Pulse</option>
            </select>
            <span className="text-xs text-zinc-400">Wrong answers always shake.</span>
          </Field>
        </div>
      </Section>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-left"
        style={{ background: "var(--ad-surface2, #f4f4f6)" }}
        onClick={() => setOpen((o) => !o)}
      >
        {title}
        <span style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}>▾</span>
      </button>
      {open && <div className="px-4 py-3 space-y-3 border-t">{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  );
}

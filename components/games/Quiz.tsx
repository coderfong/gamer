"use client";
import { useMemo, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";
import { palette, lighten } from "@/lib/games/colors";

interface NormQuestion {
  question: string;
  image: string | null;
  options: string[];
  correctIndex: number;
  points: number;
}

// A value is either emoji/text or an image URL.
function isImg(s: string): boolean {
  return /^(https?:\/\/|data:|\/)/.test(s);
}

const QUESTION_ANIM: Record<string, (n: number) => string> = {
  none:  () => "",
  fade:  () => "mem-fade-in 0.35s ease both",
  pop:   () => "mem-pop-in 0.4s cubic-bezier(.34,1.56,.64,1) both",
  zoom:  () => "mem-zoom-in 0.35s ease both",
  drop:  () => "mem-drop-in 0.4s ease both",
};

const CORRECT_ANIM: Record<string, string> = {
  none:   "",
  pop:    "mem-pop 0.4s ease",
  tada:   "mem-tada 0.6s ease",
  flash:  "mem-flash 0.5s ease",
  pulse:  "mem-pulse 0.5s ease",
};

// Normalize incoming campaign config. Accepts the admin shape
// ({ question, options[], correctAnswerIndex, points, image }) OR the older
// react-quiz-component native shape ({ answers[], correctAnswer (1-based) }).
function normalizeQuestions(raw: unknown): NormQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((q): NormQuestion => {
    const obj = q as Record<string, unknown>;
    const options =
      (Array.isArray(obj.options) ? obj.options : Array.isArray(obj.answers) ? obj.answers : []) as string[];
    let correctIndex = 0;
    if (typeof obj.correctAnswerIndex === "number") correctIndex = obj.correctAnswerIndex;
    else if (obj.correctAnswer != null) correctIndex = Math.max(0, Number(obj.correctAnswer) - 1);
    return {
      question: String(obj.question ?? ""),
      image: typeof obj.image === "string" && obj.image ? obj.image : null,
      options: options.filter((o) => typeof o === "string"),
      correctIndex: Math.min(Math.max(0, correctIndex), Math.max(0, options.length - 1)),
      points: typeof obj.points === "number" ? obj.points : Number(obj.point ?? 1) || 1,
    };
  }).filter((q) => q.question && q.options.length >= 2);
}

export function Quiz({ config, theme, onComplete }: GameProps) {
  const pal = palette(theme.brandColor, theme.brandFg);
  const cfg = (config ?? {}) as Record<string, unknown>;

  const questions = useMemo(() => normalizeQuestions(cfg.questions), [cfg.questions]);

  // ── Styling / text config ──────────────────────────────────────────────────
  const titleText        = (cfg.quizTitle as string | undefined) ?? "";
  const instructionColor      = (cfg.instructionColor      as string | undefined) ?? null;
  const instructionFontSize   = (cfg.instructionFontSize   as number | undefined) ?? 18;
  const instructionFontFamily = (cfg.instructionFontFamily as string | undefined) ?? null;
  const optionColor   = (cfg.optionColor   as string | undefined) ?? pal.brand;
  const correctColor  = (cfg.correctColor  as string | undefined) ?? "#16a34a";
  const wrongColor    = (cfg.wrongColor    as string | undefined) ?? "#dc2626";
  const feedbackCorrect = (cfg.feedbackCorrect as string | undefined) ?? "Correct!";
  const feedbackWrong   = (cfg.feedbackWrong   as string | undefined) ?? "Not quite…";
  const showProgress  = (cfg.showProgress  as boolean | undefined) ?? true;
  const questionEntrance = (cfg.questionEntrance as string | undefined) ?? "fade";
  const correctAnimation = (cfg.correctAnimation as string | undefined) ?? "pop";

  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [points, setPoints] = useState(0);
  const startTs = useRef(performance.now());
  const locked = useRef(false);

  if (questions.length === 0) {
    return (
      <div className="text-center text-sm text-zinc-500 py-12">
        No quiz questions configured yet.
      </div>
    );
  }

  const q = questions[idx];
  const entranceFn = QUESTION_ANIM[questionEntrance] ?? QUESTION_ANIM.fade;

  function choose(i: number) {
    if (locked.current) return;
    locked.current = true;
    setPicked(i);
    const isCorrect = i === q.correctIndex;
    const nextCorrect = correctCount + (isCorrect ? 1 : 0);
    const nextPoints = points + (isCorrect ? q.points : 0);
    if (isCorrect) { setCorrectCount(nextCorrect); setPoints(nextPoints); }

    setTimeout(() => {
      if (idx + 1 >= questions.length) {
        onComplete({
          score: nextPoints,
          outcome: `quiz_${nextCorrect}/${questions.length}`,
          durationMs: Math.round(performance.now() - startTs.current),
        });
      } else {
        setIdx((n) => n + 1);
        setPicked(null);
        locked.current = false;
      }
    }, 1150);
  }

  return (
    <div className="flex flex-col items-center gap-5 py-2 w-full">
      {titleText.trim() && (
        <p
          className="arcade-title text-center"
          style={{ color: instructionColor ?? "var(--brand-color)", fontSize: instructionFontSize + 4, fontFamily: instructionFontFamily ?? undefined }}
        >
          {titleText}
        </p>
      )}

      {showProgress && (
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
          <span>Question {idx + 1} / {questions.length}</span>
          <div className="h-1.5 w-24 rounded-full bg-zinc-200 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${((idx) / questions.length) * 100}%`, background: pal.brand }} />
          </div>
        </div>
      )}

      <div key={idx} className="w-full" style={{ animation: entranceFn(idx) || undefined }}>
        {q.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.image} alt="" className="mx-auto mb-4 max-h-44 rounded-xl object-contain" />
        )}
        <p
          className="text-center font-semibold mb-4"
          style={{
            color: instructionColor ?? undefined,
            fontSize: instructionFontSize,
            fontFamily: instructionFontFamily ?? undefined,
          }}
        >
          {q.question}
        </p>

        <div className="grid gap-2.5">
          {q.options.map((opt, i) => {
            const isPicked = picked === i;
            const isCorrect = i === q.correctIndex;
            const reveal = picked != null;
            let bg = "#fff";
            let border = lighten(optionColor, 0.4);
            let color = "#1f2937";
            let anim: string | undefined;
            if (reveal && isCorrect) {
              bg = lighten(correctColor, 0.82); border = correctColor; color = "#14532d";
              anim = CORRECT_ANIM[correctAnimation] || undefined;
            } else if (reveal && isPicked && !isCorrect) {
              bg = lighten(wrongColor, 0.82); border = wrongColor; color = "#7f1d1d";
              anim = "el-shake 0.4s ease";
            }
            return (
              <button
                key={i}
                type="button"
                disabled={reveal}
                onClick={() => choose(i)}
                className="flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors disabled:cursor-default"
                style={{ background: bg, borderColor: border, color, animation: anim }}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: lighten(optionColor, 0.35), color: "#fff" }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                {isImg(opt) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={opt} alt="" className="h-12 object-contain" />
                ) : (
                  <span>{opt}</span>
                )}
                {reveal && isCorrect && <span className="ml-auto">✓</span>}
                {reveal && isPicked && !isCorrect && <span className="ml-auto">✗</span>}
              </button>
            );
          })}
        </div>

        {picked != null && (
          <p
            className="text-center font-bold mt-4"
            style={{ color: picked === q.correctIndex ? correctColor : wrongColor }}
          >
            {picked === q.correctIndex ? feedbackCorrect : feedbackWrong}
          </p>
        )}
      </div>
    </div>
  );
}

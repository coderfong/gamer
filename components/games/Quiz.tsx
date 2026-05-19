"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types/game";

interface QuizQuestion {
  question: string;
  questionType?: "text";
  answers: string[];
  correctAnswer: string; // 1-based index as string, per react-quiz-component spec
  point?: string | number;
}

interface QuizPayload {
  quizTitle?: string;
  quizSynopsis?: string;
  questions: QuizQuestion[];
  appLocale?: Record<string, string>;
  // Our extension:
  passingScore?: number;
}

// react-quiz-component is rendered client-side only.
let LazyQuiz: any = null;

export function Quiz({ config, onComplete }: GameProps) {
  const cfg = (config ?? {}) as { questions?: any[]; passingScore?: number };
  const [ready, setReady] = useState(false);
  const startTs = useRef<number>(0);

  useEffect(() => {
    startTs.current = performance.now();
    (async () => {
      if (!LazyQuiz) {
        const mod = await import("react-quiz-component");
        LazyQuiz = (mod as any).default ?? (mod as any).Quiz ?? mod;
      }
      setReady(true);
    })();
  }, []);

  // Normalize incoming campaign config into the shape react-quiz-component expects.
  // Accepts either react-quiz-component native format OR a simpler
  // [{ question, options[], correctAnswerIndex, points }] format from the admin UI.
  const quiz: QuizPayload = normalizeQuiz(cfg.questions ?? [], cfg.passingScore);

  if (!ready || !LazyQuiz) {
    return <div className="text-center py-12 text-zinc-500">Loading quiz...</div>;
  }

  const RQ = LazyQuiz;
  return (
    <div className="quiz-host">
      <RQ
        quiz={quiz}
        shuffle={false}
        showInstantFeedback={false}
        continueTillCorrect={false}
        onComplete={(stats: { numberOfCorrectAnswers: number; numberOfQuestions: number; correctPoints: number }) => {
          const score = stats.correctPoints ?? stats.numberOfCorrectAnswers ?? 0;
          onComplete({
            score,
            outcome: `quiz_${stats.numberOfCorrectAnswers}/${stats.numberOfQuestions}`,
            durationMs: performance.now() - startTs.current,
          });
        }}
      />
    </div>
  );
}

function normalizeQuiz(raw: any[], passingScore?: number): QuizPayload {
  const questions: QuizQuestion[] = raw.map((q) => {
    // Admin-side shape
    if (Array.isArray(q.options) && typeof q.correctAnswerIndex === "number") {
      return {
        question: q.question,
        questionType: "text",
        answers: q.options as string[],
        correctAnswer: String((q.correctAnswerIndex as number) + 1),
        point: q.points ?? 1,
      };
    }
    // Native react-quiz-component shape, pass through.
    return q as QuizQuestion;
  });
  return {
    quizTitle: "",
    quizSynopsis: "",
    questions,
    passingScore,
  };
}

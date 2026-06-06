import { z } from "zod";

// The capture form always sends every field, using "" for blank inputs and
// null for an absent Turnstile token (dev: no sitekey configured). Treat both
// as "not provided" so `.optional()` validators don't reject the payload.
const blankToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);

export const playerCaptureSchema = z.object({
  name: z.preprocess(blankToUndef, z.string().trim().min(1).max(120).optional()),
  email: z.preprocess(blankToUndef, z.string().trim().email().max(200).optional()),
  phone: z.preprocess(blankToUndef, z.string().trim().min(5).max(40).optional()),
  fingerprint: z.preprocess(blankToUndef, z.string().max(200).optional()),
  turnstileToken: z.preprocess(blankToUndef, z.string().max(4096).optional()),
});

export type PlayerCaptureInput = z.infer<typeof playerCaptureSchema>;

// Games report durationMs from performance.now() (a float) and may send null
// for fields they don't use, so round numbers and coerce blanks to undefined.
const roundNum = (v: unknown) =>
  v === "" || v === null ? undefined : typeof v === "number" ? Math.round(v) : v;

export const submitPlaySchema = z.object({
  playId: z.string().uuid(),
  score: z.preprocess(roundNum, z.number().int().min(0).max(1_000_000).optional()),
  outcome: z.preprocess(blankToUndef, z.string().max(200).optional()),
  durationMs: z.preprocess(roundNum, z.number().int().nonnegative().max(60 * 60 * 1000).optional()),
});

export type SubmitPlayInput = z.infer<typeof submitPlaySchema>;

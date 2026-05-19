import { z } from "zod";

export const playerCaptureSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(200).optional(),
  phone: z.string().trim().min(5).max(40).optional(),
  fingerprint: z.string().max(200).optional(),
  turnstileToken: z.string().max(4096).optional(),
});

export type PlayerCaptureInput = z.infer<typeof playerCaptureSchema>;

export const submitPlaySchema = z.object({
  playId: z.string().uuid(),
  score: z.number().int().min(0).max(1_000_000).optional(),
  outcome: z.string().max(200).optional(),
  durationMs: z.number().int().nonnegative().max(60 * 60 * 1000).optional(),
});

export type SubmitPlayInput = z.infer<typeof submitPlaySchema>;

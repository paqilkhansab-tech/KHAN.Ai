import { z } from 'zod';

/**
 * KHAN INPUT VALIDATION + SANITIZATION
 * Every API route validates and sanitizes user input with these schemas.
 * - strips control characters and angle brackets (stored-XSS defense-in-depth)
 * - hard length caps on every field
 * - email / phone / password shape enforcement
 */

/** Remove control chars, angle brackets and zero-width chars; collapse whitespace. */
export function clean(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ') // control chars
    .replace(/[<>]/g, '') // angle brackets — React escapes too, this is defense-in-depth
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width
    .slice(0, maxLen)
    .trim()
    .replace(/\s{2,}/g, ' ');
}

const emailBase = z
  .string()
  .max(160)
  .transform(v => v.trim().toLowerCase())
  .refine(v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), 'Invalid email address');

const passwordBase = z.string().min(6, 'Password must be at least 6 characters').max(128);

export const signupSchema = z.object({
  name: z.preprocess(v => clean(v, 64), z.string().min(2).max(64)),
  email: emailBase,
  password: passwordBase,
  phone: z
    .preprocess(v => (typeof v === 'string' ? v.replace(/[^0-9+ ()-]/g, '').slice(0, 20).trim() : ''), z.string().max(20))
    .optional()
    .default(''),
});

export const signinSchema = z.object({
  email: emailBase,
  password: z.string().min(1).max(128),
});

export const watchlistSchema = z.object({
  symbol: z.preprocess(v => clean(v, 16), z.string().min(1).max(16)),
  name: z.preprocess(v => clean(v, 64), z.string().min(1).max(64)),
  kind: z.enum(['crypto', 'stock']).catch('crypto'),
});

export const profileSchema = z.object({
  name: z.preprocess(v => clean(v, 64), z.string().min(2).max(64)).optional(),
  phone: z
    .preprocess(v => (typeof v === 'string' ? v.replace(/[^0-9+ ()-]/g, '').slice(0, 20).trim() : ''), z.string().max(20))
    .optional(),
});

export const supportSchema = z.object({
  name: z.preprocess(v => clean(v, 80), z.string().min(2).max(80)),
  email: emailBase,
  subject: z.preprocess(v => clean(v, 120), z.string().max(120)).catch('General question'),
  // message keeps newlines: sanitize without collapsing whitespace
  message: z
    .string()
    .transform(v => v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/[<>]/g, '').slice(0, 4000).trim())
    .refine(v => v.length >= 2, 'Message too short'),
});

export const chatSchema = z.object({
  deep: z.boolean().optional().default(false),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z
          .string()
          .transform(v => v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, 4000)),
      })
    )
    .min(1)
    .max(12),
});

export const ttsSchema = z.object({
  text: z
    .string()
    .transform(v => v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, 6000))
    .refine(v => v.trim().length > 0, 'Nothing to speak'),
});

/** Parse helper: returns typed data or an error message. */
export function parse<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown
): { ok: true; data: z.infer<T> } | { ok: false; error: string } {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const first = result.error.issues[0];
  return { ok: false, error: first ? first.message : 'Invalid input.' };
}

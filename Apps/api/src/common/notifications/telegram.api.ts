import { z } from 'zod';

// Telegram's Update shape is a THIRD-PARTY wire format, not our API contract, so its schema
// lives here and not in @my-app/contract (contract-rules §1: our routes/DTOs/events only).
// Only the fields we act on are described; Telegram may send anything else.
export const TelegramUpdateSchema = z
  .object({
    update_id: z.number().int(),
    message: z
      .object({
        chat: z.object({ id: z.number().int() }),
        text: z.string().optional(),
        from: z.object({ id: z.number().int(), first_name: z.string().optional() }).optional(),
      })
      .optional(),
  })
  .loose(); // Zod 4: passthrough unknown keys instead of stripping
export type TelegramUpdate = z.infer<typeof TelegramUpdateSchema>;

// Thrown by getUpdates on a non-2xx response. `status` drives the poller's backoff decision
// (409 = another consumer/webhook, 401 = bad token, 429 = honour retryAfterSec) — see
// telegram.poller.ts.
export class TelegramApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfterSec?: number,
  ) {
    super(message);
    this.name = 'TelegramApiError';
  }
}

type GetUpdatesOptions = {
  botToken: string;
  offset: number;
  timeoutSec: number;
  signal: AbortSignal;
};

// getUpdates long-polls; the caller's AbortSignal is what makes shutdown responsive (Set 6
// plan §7.1) and what distinguishes a clean abort from a real network failure (§7.2).
export async function getUpdates(opts: GetUpdatesOptions): Promise<TelegramUpdate[]> {
  const url = new URL(`https://api.telegram.org/bot${opts.botToken}/getUpdates`);
  url.searchParams.set('offset', String(opts.offset));
  url.searchParams.set('timeout', String(opts.timeoutSec));
  url.searchParams.set('allowed_updates', JSON.stringify(['message']));

  // Client-side timeout kept ABOVE Telegram's own long-poll timeout so our own signal never
  // severs a poll Telegram is still legitimately holding open.
  const res = await fetch(url, {
    signal: AbortSignal.any([opts.signal, AbortSignal.timeout((opts.timeoutSec + 15) * 1000)]),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let retryAfterSec: number | undefined;
    if (res.status === 429) {
      try {
        const parsed = JSON.parse(body) as { parameters?: { retry_after?: number } };
        retryAfterSec = parsed.parameters?.retry_after;
      } catch {
        // ignore — no retry_after available, caller falls back to the backoff ladder
      }
    }
    throw new TelegramApiError(
      `Telegram getUpdates ${res.status}: ${body.slice(0, 300)}`,
      res.status,
      retryAfterSec,
    );
  }

  const json = (await res.json()) as { ok: boolean; result?: unknown[] };
  const updates = (json.result ?? []).map((raw) => TelegramUpdateSchema.parse(raw));
  return updates;
}

// Called once by the poller on start — a webhook registered on the SAME bot token causes
// every getUpdates call to 409. Idempotent: succeeds even when no webhook was set.
export async function deleteWebhook(botToken: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, { method: 'POST' });
}

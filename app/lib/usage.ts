// Server-only AI usage metering and daily per-user spend cap.
//
// Each signed-in user gets a small free daily credit (CREDIT_CAP_USD). The API
// routes check the running total before calling OpenAI and record the cost
// afterward, using token counts returned by OpenAI × the price table below.
//
// Writes use the Supabase service-role key so users can't tamper with their own
// balance. If SUPABASE_SERVICE_ROLE_KEY is missing, metering fails OPEN (AI
// still works, no cap) and logs a warning — set the key to enforce the cap.
import { createClient } from "@supabase/supabase-js";

/** Free AI credit per user per day, in USD. */
export const CREDIT_CAP_USD = 0.05;

// USD per 1,000,000 tokens. EDIT these to match the real pricing of whatever
// models these names map to. Unknown models fall back to the mini price.
const PRICES: Record<string, { input: number; output: number }> = {
  "gpt-5.4-mini": { input: 0.15, output: 0.6 },
  "gpt-5.4": { input: 2.5, output: 10 },
  "gpt-5.5": { input: 5, output: 15 },
  "gpt-5.5-pro": { input: 15, output: 60 },
};

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = serviceKey
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

if (!admin) {
  console.warn(
    "[usage] SUPABASE_SERVICE_ROLE_KEY not set — AI usage cap is disabled."
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
}

/** Estimated USD cost of one OpenAI call from its returned token usage. */
export function priceFor(
  model: string,
  usage?: { input_tokens?: number; output_tokens?: number }
): number {
  const p = PRICES[model] ?? PRICES["gpt-5.4-mini"];
  const input = usage?.input_tokens ?? 0;
  const output = usage?.output_tokens ?? 0;
  return (input * p.input + output * p.output) / 1_000_000;
}

/** How much the user has spent so far today (USD). 0 if metering is disabled. */
export async function getDailySpend(userId: string): Promise<number> {
  if (!admin) return 0;
  try {
    const { data } = await admin
      .from("ai_usage")
      .select("spent_usd")
      .eq("user_id", userId)
      .eq("day", today())
      .maybeSingle();
    return Number(data?.spent_usd ?? 0);
  } catch {
    return 0;
  }
}

/** Add `amount` USD to the user's spend for today. No-op if metering is off. */
export async function recordSpend(userId: string, amount: number): Promise<void> {
  if (!admin || amount <= 0) return;
  const day = today();
  try {
    const { data } = await admin
      .from("ai_usage")
      .select("spent_usd")
      .eq("user_id", userId)
      .eq("day", day)
      .maybeSingle();
    const next = Number(data?.spent_usd ?? 0) + amount;
    await admin
      .from("ai_usage")
      .upsert({ user_id: userId, day, spent_usd: next }, { onConflict: "user_id,day" });
  } catch {
    // Don't fail the request if accounting hiccups.
  }
}

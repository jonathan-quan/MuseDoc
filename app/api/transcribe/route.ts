import { createClient } from "../../lib/supabase/server";
import {
  CREDIT_CAP_USD,
  getDailySpend,
  recordSpend,
  usageMeteringConfigured,
} from "../../lib/usage";

type TranscriptionResponse = {
  text?: string;
  error?: { message?: string };
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Missing OPENAI_API_KEY. Add it to your environment." },
      { status: 500 }
    );
  }

  // Transcription requires a signed-in account and counts against the cap.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Please sign in to use voice." }, { status: 401 });
  }
  if (process.env.NODE_ENV === "production" && !usageMeteringConfigured()) {
    return Response.json(
      {
        error:
          "AI usage metering is not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 }
    );
  }
  let spent = 0;
  try {
    spent = await getDailySpend(user.id);
  } catch {
    return Response.json(
      { error: "Could not verify today's AI usage. Try again later." },
      { status: 503 }
    );
  }
  if (spent >= CREDIT_CAP_USD) {
    return Response.json(
      { error: "You've used today's free AI credit. It resets tomorrow." },
      { status: 429 }
    );
  }

  const form = await request.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return Response.json({ error: "Audio file is required." }, { status: 400 });
  }

  const openAIForm = new FormData();
  openAIForm.append("model", "whisper-1");
  openAIForm.append("file", audio, audio.name || "voice.webm");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    cache: "no-store",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: openAIForm,
  });

  const payload = (await response.json()) as TranscriptionResponse;
  if (!response.ok) {
    return Response.json(
      { error: payload.error?.message ?? "Transcription failed." },
      { status: response.status }
    );
  }

  // Whisper is billed by audio length; charge a small flat estimate per clip.
  try {
    await recordSpend(user.id, 0.003);
  } catch {
    return Response.json(
      { error: "Could not record AI usage. Try again later." },
      { status: 503 }
    );
  }

  return Response.json({ text: payload.text ?? "" });
}

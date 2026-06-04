import { createClient } from "../../lib/supabase/server";
import { CREDIT_CAP_USD, getDailySpend, recordSpend } from "../../lib/usage";

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
  if ((await getDailySpend(user.id)) >= CREDIT_CAP_USD) {
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
  await recordSpend(user.id, 0.003);

  return Response.json({ text: payload.text ?? "" });
}

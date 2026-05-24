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

  return Response.json({ text: payload.text ?? "" });
}

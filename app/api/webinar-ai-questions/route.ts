import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

type GeneratedQuestion = {
  timestamp: number;
  type: "yes_no" | "multiple_choice" | "text";
  question: string;
  options: string[];
  keywords: string[];
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function getVideoUrl(videoKey: string): string {
  const cloudFrontBase = getRequiredEnv("NEXT_PUBLIC_CLOUDFRONT_URL");
  return `${cloudFrontBase}/${encodeURIComponent(videoKey)}`;
}

async function transcribeVideo(videoUrl: string, videoKey: string): Promise<string> {
  const geminiApiKey = getRequiredEnv("GEMINI_API_KEY");

  // Download video as base64
  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) {
    throw new Error(`Failed to download video: ${videoResponse.status} ${videoResponse.statusText}`);
  }

  const videoBuffer = await videoResponse.arrayBuffer();
  const base64Video = Buffer.from(videoBuffer).toString("base64");
  const mimeType = videoResponse.headers.get("content-type") || "video/mp4";

  // Use Gemini to transcribe video
  const transcriptionResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Please transcribe this video's audio content. Return only the complete transcript text, nothing else.",
              },
              {
                inlineData: {
                  mimeType,
                  data: base64Video,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!transcriptionResponse.ok) {
    const errorBody = await transcriptionResponse.text();
    throw new Error(`Gemini transcription failed: ${errorBody}`);
  }

  const data = (await transcriptionResponse.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const transcript = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!transcript) {
    throw new Error("Gemini did not return any transcription");
  }

  return transcript;
}

async function generateQuestionsFromTranscript(transcript: string, count: number, estimatedDurationSeconds: number): Promise<GeneratedQuestion[]> {
  const geminiApiKey = getRequiredEnv("GEMINI_API_KEY");

  const prompt = [
    "You are an HR recruiter creating screening questions from a webinar transcript.",
    "Extract the job roles, required skills, and experience levels mentioned in the transcript.",
    "Generate interview/screening questions that assess candidate fit for those roles, NOT questions about facts stated in the video.",
    `Return ONLY valid JSON with this exact shape: { \"questions\": [{ \"timestamp\": number, \"type\": \"yes_no\" | \"multiple_choice\" | \"text\", \"question\": string, \"options\": string[], \"keywords\": string[] }] }`,
    `Generate exactly ${count} HR screening questions focused on qualifications, experience, and skills relevant to the job opening(s) mentioned.`,
    "Example: if the video mentions 'we need an experienced Java developer', ask 'How many years of professional Java development experience do you have?' or 'Which Java frameworks are you most proficient with?'",
    `IMPORTANT: The video is approximately ${estimatedDurationSeconds} seconds long. All timestamps must be BETWEEN 0 and ${estimatedDurationSeconds}. Distribute questions throughout the video duration.`,
    "Timestamps should be estimated based on when job requirements are mentioned in the transcript, proportionally spread throughout the video.",
    "For yes_no questions, use options [\"Yes\", \"No\"].",
    "For multiple_choice questions, provide 3 to 4 concise skill or experience level options.",
    "For text questions, keep options empty and populate keywords with relevant job competencies or skills to match against answers.",
    "Do NOT ask questions about facts/content stated in the video. Instead, ask questions to evaluate candidate suitability.",
    "Avoid duplicates and maintain a professional HR tone.",
    "",
    `Transcript:\n${transcript}`,
  ].join("\n");

  const completionResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!completionResponse.ok) {
    const errorBody = await completionResponse.text();
    throw new Error(`Gemini question generation failed: ${errorBody}`);
  }

  const data = (await completionResponse.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error("Gemini did not return any generated questions");
  }

  // Strip markdown code blocks if present
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr) as { questions?: GeneratedQuestion[] };
  const all = Array.isArray(parsed.questions) ? parsed.questions : [];
  
  // Clamp timestamps to be within video duration (safety measure)
  const clamped = all.map((q) => ({
    ...q,
    timestamp: Math.min(Math.max(0, q.timestamp), Math.max(1, estimatedDurationSeconds - 5)),
  }));
  
  return clamped.slice(0, count);
}

function normalizeQuestion(question: GeneratedQuestion) {
  return `${Math.round(question.timestamp)}|${question.type}|${question.question.trim().toLowerCase()}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const videoKey = String(body?.videoKey || "").trim();
    const count = Number(body?.count || 5) || 5;

    if (!videoKey) {
      return Response.json({ error: "Missing videoKey" }, { status: 400 });
    }

    const videoUrl = getVideoUrl(videoKey);
    const transcript = await transcribeVideo(videoUrl, videoKey);
    
    // Estimate video duration based on transcript word count
    // Average speaking rate: ~140 words per minute
    const wordCount = transcript.split(/\s+/).filter((w) => w.length > 0).length;
    const estimatedMinutes = Math.max(1, Math.ceil(wordCount / 140));
    const estimatedDurationSeconds = estimatedMinutes * 60;
    
    const questions = await generateQuestionsFromTranscript(transcript, count, estimatedDurationSeconds);

    if (questions.length === 0) {
      return Response.json(
        { error: "No questions were generated from this webinar transcript" },
        { status: 422 }
      );
    }

    const existingQuestions = await prisma.webinarQuestion.findMany({
      where: { videoKey },
      select: { timestamp: true, type: true, question: true },
    });
    const existingKeys = new Set(
      existingQuestions.map((question) =>
        `${Math.round(question.timestamp)}|${question.type}|${question.question.trim().toLowerCase()}`
      )
    );

    const createdQuestions = [];

    for (const question of questions) {
      const normalized = normalizeQuestion(question);
      if (existingKeys.has(normalized)) {
        continue;
      }

      const createdQuestion = await prisma.webinarQuestion.create({
        data: {
          videoKey,
          timestamp: Math.max(0, Math.round(question.timestamp)),
          type: question.type,
          question: question.question.trim(),
          options:
            question.type === "multiple_choice"
              ? question.options.filter((option) => option.trim())
              : question.type === "yes_no"
                ? ["Yes", "No"]
                : [],
          keywords:
            question.type === "text"
              ? question.keywords.filter((keyword) => keyword.trim())
              : [],
        },
      });

      // Also attempt to save to Supabase (if configured). This is best-effort — failures won't block Prisma writes.
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (supabaseUrl && supabaseServiceRoleKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
          // Try inserting into a table named 'WebinarQuestion' to match Prisma model name.
          await supabase.from("WebinarQuestion").insert([
            {
              id: createdQuestion.id,
              videoKey: createdQuestion.videoKey,
              timestamp: createdQuestion.timestamp,
              type: createdQuestion.type,
              question: createdQuestion.question,
              options: createdQuestion.options,
              keywords: createdQuestion.keywords,
              createdAt: createdQuestion.createdAt,
              updatedAt: createdQuestion.updatedAt,
            },
          ]);
        }
      } catch (supError) {
        console.warn("Supabase insert failed (non-fatal):", supError);
      }

      createdQuestions.push(createdQuestion);
    }

    return Response.json({
      videoKey,
      transcriptPreview: transcript.slice(0, 1000),
      generatedCount: questions.length,
      createdCount: createdQuestions.length,
      questions: createdQuestions,
    });
  } catch (error) {
    console.error("Error generating webinar questions:", error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
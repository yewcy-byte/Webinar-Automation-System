import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      videoKey,
      timestamp,
      type,
      question,
      importance = "medium",
      options = [],
      correctAnswer,
    } = body;

    // Validation
    if (!videoKey || timestamp === undefined || !type || !question) {
      return Response.json(
        { error: "Missing required fields: videoKey, timestamp, type, question" },
        { status: 400 }
      );
    }

    if (!["yes_no", "multiple_choice", "text"].includes(type)) {
      return Response.json(
        { error: "Invalid question type. Must be: yes_no, multiple_choice, or text" },
        { status: 400 }
      );
    }

    if (!["high", "medium", "low"].includes(importance)) {
      return Response.json(
        { error: "Invalid importance. Must be: high, medium, or low" },
        { status: 400 }
      );
    }

    const newQuestion = await prisma.webinarQuestion.create({
      data: {
        videoKey,
        timestamp: parseInt(timestamp),
        type,
        question,
        importance,
        options: type === "multiple_choice" ? options : [],
        correctAnswer,
      },
    });

    return Response.json(newQuestion, { status: 201 });
  } catch (error) {
    console.error("Error creating question:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `Failed to create question: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const videoKey = url.searchParams.get("videoKey");

    if (!videoKey) {
      return Response.json(
        { error: "Missing videoKey query parameter" },
        { status: 400 }
      );
    }

    const questions = await prisma.webinarQuestion.findMany({
      where: { videoKey },
      orderBy: { timestamp: "asc" },
    });

    return Response.json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    return Response.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

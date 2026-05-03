import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { questionId, userEmail, answer, importance = "medium" } = body;

    if (!questionId || !userEmail || !answer) {
      return Response.json(
        { error: "Missing required fields: questionId, userEmail, answer" },
        { status: 400 }
      );
    }

    if (!["low", "medium", "high"].includes(importance)) {
      return Response.json(
        { error: "Invalid importance. Must be low, medium, or high" },
        { status: 400 }
      );
    }

    const response = await prisma.webinarResponse.create({
      data: {
        questionId,
        userEmail,
        answer,
        importance,
      },
    });

    return Response.json(response, { status: 201 });
  } catch (error) {
    console.error("Error saving webinar response:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `Failed to save webinar response: ${errorMessage}` },
      { status: 500 }
    );
  }
}

import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { timestamp, type, question, importance, options, correctAnswer } = body;

    const updateData: Record<string, unknown> = {};

    if (timestamp !== undefined) updateData.timestamp = parseInt(timestamp);
    if (type !== undefined) updateData.type = type;
    if (question !== undefined) updateData.question = question;
    if (importance !== undefined) updateData.importance = importance;
    if (options !== undefined) updateData.options = options;
    if (correctAnswer !== undefined) updateData.correctAnswer = correctAnswer;

    const updatedQuestion = await prisma.webinarQuestion.update({
      where: { id },
      data: updateData,
    });

    return Response.json(updatedQuestion);
  } catch (error) {
    console.error("Error updating question:", error);
    return Response.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.webinarQuestion.delete({
      where: { id },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting question:", error);
    return Response.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
}

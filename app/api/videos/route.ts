import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get all unique videos with their question counts
    const questions = await prisma.webinarQuestion.findMany({
      select: {
        videoKey: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group by videoKey and get metadata
    const videoMap = new Map<
      string,
      {
        videoKey: string;
        questionCount: number;
        uploadedAt: Date;
        lastUpdated: Date;
      }
    >();

    for (const question of questions) {
      if (!videoMap.has(question.videoKey)) {
        videoMap.set(question.videoKey, {
          videoKey: question.videoKey,
          questionCount: 0,
          uploadedAt: question.createdAt,
          lastUpdated: question.createdAt,
        });
      }

      const video = videoMap.get(question.videoKey)!;
      video.questionCount++;
      if (question.createdAt > video.lastUpdated) {
        video.lastUpdated = question.createdAt;
      }
    }

    const videos = Array.from(videoMap.values()).sort(
      (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()
    );

    return Response.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    return Response.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}

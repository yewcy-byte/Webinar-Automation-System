import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { videoKey, startDate, endDate } = body;

    // Validation
    if (!videoKey || !startDate || !endDate) {
      return Response.json(
        { error: "Missing required fields: videoKey, startDate, endDate" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return Response.json(
        { error: "Start date must be before or equal to end date" },
        { status: 400 }
      );
    }

    const availability = await prisma.interviewAvailability.create({
      data: {
        videoKey,
        startDate: start,
        endDate: end,
      },
    });

    return Response.json(availability, { status: 201 });
  } catch (error) {
    console.error("Error creating interview availability:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `Failed to create interview availability: ${errorMessage}` },
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

    const availabilities = await prisma.interviewAvailability.findMany({
      where: { videoKey },
      orderBy: { startDate: "asc" },
    });

    return Response.json(availabilities);
  } catch (error) {
    console.error("Error fetching interview availability:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `Failed to fetch interview availability: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json(
        { error: "Missing id query parameter" },
        { status: 400 }
      );
    }

    await prisma.interviewAvailability.delete({
      where: { id },
    });

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting interview availability:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `Failed to delete interview availability: ${errorMessage}` },
      { status: 500 }
    );
  }
}

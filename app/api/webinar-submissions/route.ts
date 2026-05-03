import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const videoKey = String(formData.get("videoKey") || "");
    const userEmail = String(formData.get("userEmail") || "");
    const totalScore = Number(formData.get("totalScore") || 0);
    const maxScore = Number(formData.get("maxScore") || 0);
    const interviewStartDate = String(formData.get("interviewStartDate") || "");
    const interviewEndDate = String(formData.get("interviewEndDate") || "");
    const selectedAvailabilityId = String(formData.get("selectedAvailabilityId") || "");
    const resume = formData.get("resume");

    if (!videoKey || !userEmail || !resume || !(resume instanceof File)) {
      return Response.json(
        { error: "Missing required fields: videoKey, userEmail, resume" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resumeBucket = process.env.SUPABASE_RESUME_BUCKET || "resumes";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return Response.json(
        { error: "Supabase storage environment variables are not configured" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const storagePath = `${videoKey}/${Date.now()}-${resume.name}`;

    const { error: uploadError } = await supabase.storage
      .from(resumeBucket)
      .upload(storagePath, resume, {
        contentType: resume.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage.from(resumeBucket).getPublicUrl(storagePath);

    if (!prisma || !prisma.webinarSubmission || typeof prisma.webinarSubmission.create !== "function") {
      const ownKeys = prisma ? Object.keys(prisma) : [];
      const protoKeys = prisma && Object.getPrototypeOf(prisma) ? Object.getOwnPropertyNames(Object.getPrototypeOf(prisma)) : [];
      const delegateType = prisma && prisma.webinarSubmission ? typeof prisma.webinarSubmission : null;
      console.error("Prisma client missing webinarSubmission delegate", { ownKeys, protoKeys, delegateType });
      return Response.json(
        {
          error: "Prisma client does not expose 'webinarSubmission'. Check generated client and import.",
          debug: { ownKeys, protoKeys, delegateType },
        },
        { status: 500 }
      );
    }

    const submission = await prisma.webinarSubmission.create({
      data: {
        videoKey,
        userEmail,
        totalScore,
        maxScore,
        resumePath: storagePath,
        resumeUrl: publicUrlData?.publicUrl || null,
        interviewStartDate: interviewStartDate ? new Date(interviewStartDate) : null,
        interviewEndDate: interviewEndDate ? new Date(interviewEndDate) : null,
      },
    });

    return Response.json(
      {
        submission,
        selectedAvailabilityId: selectedAvailabilityId || null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving webinar submission:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `Failed to save webinar submission: ${errorMessage}` },
      { status: 500 }
    );
  }
}

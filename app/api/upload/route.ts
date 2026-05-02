import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function createS3Client(region?: string) {
  return new S3Client({ region: region || process.env.AWS_REGION });
}

function getRegionFromEndpoint(endpoint: string): string | null {
  const match = endpoint.match(/s3[.-]([a-z0-9-]+)\.amazonaws\.com/i);
  return match?.[1] ?? null;
}

function getErrorField(error: unknown, field: string): string {
  if (!error || typeof error !== "object" || !(field in error)) {
    return "";
  }

  return String((error as Record<string, unknown>)[field] ?? "");
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (!process.env.AWS_BUCKET_NAME || !process.env.NEXT_PUBLIC_CLOUDFRONT_URL) {
    return Response.json(
      { error: "Missing AWS_BUCKET_NAME or NEXT_PUBLIC_CLOUDFRONT_URL" },
      { status: 500 }
    );
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${Date.now()}-${sanitizedName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: file.type || "application/octet-stream",
  });

  try {
    await createS3Client().send(command);
  } catch (firstError) {
    const endpoint = getErrorField(firstError, "Endpoint");
    const redirectedRegion = endpoint ? getRegionFromEndpoint(endpoint) : null;

    try {
      if (redirectedRegion) {
        await createS3Client(redirectedRegion).send(command);
      } else {
        throw firstError;
      }
    } catch (finalError) {
      const code = getErrorField(finalError, "Code");
      const message = getErrorField(finalError, "message");

      if (code === "AccessDenied") {
        return Response.json(
          {
            error:
              "S3 AccessDenied: this IAM user/role cannot upload to this bucket. Grant s3:PutObject on the target bucket/prefix.",
            details: {
              code,
              message,
              bucket: process.env.AWS_BUCKET_NAME,
              key,
              region: redirectedRegion || process.env.AWS_REGION || "",
            },
          },
          { status: 403 }
        );
      }

      return Response.json(
        {
          error: "S3 upload failed",
          details: {
            code,
            message,
            bucket: process.env.AWS_BUCKET_NAME,
            key,
            region: redirectedRegion || process.env.AWS_REGION || "",
          },
        },
        { status: 500 }
      );
    }
  }

  const publicVideoUrl = `${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/${encodeURIComponent(key)}`;
  return Response.json({ key, publicVideoUrl });
}
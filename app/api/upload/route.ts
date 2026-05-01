import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: file.name,
    Body: buffer,
    ContentType: file.type,
  }));

  // Return the CloudFront URL so the frontend can display it immediately
  const cfUrl = `${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/${file.name}`;
  return Response.json({ url: cfUrl });
}
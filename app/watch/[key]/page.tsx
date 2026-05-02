type WatchPageProps = {
  params: Promise<{ key: string }>;
};

export default async function WatchPage({ params }: WatchPageProps) {
  const { key } = await params;
  const cloudFrontBase = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;

  if (!cloudFrontBase) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p>NEXT_PUBLIC_CLOUDFRONT_URL is not configured.</p>
      </main>
    );
  }

  const decodedKey = decodeURIComponent(key);
  const videoUrl = `${cloudFrontBase}/${encodeURIComponent(decodedKey)}`;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Webinar Video</h1>
      <video controls className="w-full rounded border" preload="metadata">
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { QuestionTimeline } from "@/components/QuestionTimeline";

type WatchPageProps = {
  params: Promise<{ key: string }>;
};

type Question = {
  id: string;
  timestamp: number;
  type: string;
  question: string;
  importance: string;
  options: string[];
};

export default function WatchPage({ params }: WatchPageProps) {
  const [key, setKey] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const cloudFrontBase = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;

  // Extract key from params
  useEffect(() => {
    (async () => {
      const resolvedParams = await params;
      setKey(resolvedParams.key);
    })();
  }, [params]);

  // Fetch questions when key is set
  useEffect(() => {
    if (!key) return;

    const fetchQuestions = async () => {
      try {
        const response = await fetch(
          `/api/webinar-questions?videoKey=${encodeURIComponent(key)}`
        );
        if (response.ok) {
          const data = await response.json();
          setQuestions(data);
        }
      } catch (error) {
        console.error("Error fetching questions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [key]);

  if (!cloudFrontBase) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p>NEXT_PUBLIC_CLOUDFRONT_URL is not configured.</p>
      </main>
    );
  }

  const decodedKey = key ? decodeURIComponent(key) : "";
  const videoUrl = decodedKey ? `${cloudFrontBase}/${encodeURIComponent(decodedKey)}` : "";

  return (
    <main className="mx-auto w-full max-w-4xl flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Webinar Video</h1>

      {/* Video Player */}
      {videoUrl && (
        <video
          controls
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          className="w-full rounded border"
          preload="metadata"
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}

      {/* Question Timeline */}
      {duration > 0 && questions.length > 0 && (
        <QuestionTimeline
          questions={questions}
          videoDuration={duration}
        />
      )}

      {/* Info for viewers */}
      {questions.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8">
          No questions have been added to this webinar yet.
        </div>
      )}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Play, Trash2, Loader } from "lucide-react";

type VideoMetadata = {
  videoKey: string;
  questionCount: number;
  uploadedAt: string;
  lastUpdated: string;
};

type UploadedVideosSidebarProps = {
  currentVideoKey?: string;
  onSelectVideo?: (videoKey: string) => void;
};

export function UploadedVideosSidebar({
  currentVideoKey,
  onSelectVideo,
}: UploadedVideosSidebarProps) {
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVideos() {
      try {
        setLoading(true);
        const response = await fetch("/api/videos");
        if (!response.ok) throw new Error("Failed to fetch videos");
        const data = await response.json();
        setVideos(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load videos");
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  const getVideoName = (videoKey: string) => {
    // Extract filename from S3 key
    const parts = videoKey.split("/");
    const filename = parts[parts.length - 1];
    // Remove timestamp prefix if present
    return filename.replace(/^\d+-/, "");
  };

  return (
    <div className="h-screen w-80 overflow-y-auto border-r border-gray-200 bg-gray-50">
      <div className="sticky top-0 border-b border-gray-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-gray-900">Uploaded Videos</h2>
        <p className="mt-1 text-sm text-gray-600">
          {videos.length} video{videos.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}

        {error && (
          <div className="p-4">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && videos.length === 0 && (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">No videos uploaded yet</p>
          </div>
        )}

        {videos.map((video) => (
          <button
            key={video.videoKey}
            onClick={() => onSelectVideo?.(video.videoKey)}
            className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-100 ${
              currentVideoKey === video.videoKey ? "bg-blue-50" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <p className="truncate text-sm font-medium text-gray-900">
                    {getVideoName(video.videoKey)}
                  </p>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-600">Questions:</span>
                    <span className="inline-block rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {video.questionCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">
                      Uploaded: {formatDate(video.uploadedAt)}
                    </span>
                  </div>
                </div>
              </div>
              {currentVideoKey === video.videoKey && (
                <ChevronRight className="mt-1 h-5 w-5 flex-shrink-0 text-blue-600" />
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="border-t border-gray-200 p-4">
        <p className="text-xs text-gray-500">
          Click on a video to view its details and manage questions
        </p>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { QuestionForm } from "@/components/QuestionForm";
import { QuestionTimeline } from "@/components/QuestionTimeline";
import { UploadedVideosSidebar } from "@/components/UploadedVideosSidebar";
import { InterviewAvailabilityPicker } from "@/components/InterviewAvailabilityPicker";

type UploadResponse = {
  key: string;
  publicVideoUrl: string;
};

type Question = {
  id: string;
  timestamp: number;
  type: string;
  question: string;
  keywords?: string[];
  options: string[];
};

export default function NotesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [error, setError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string>("");
  const [videoKey, setVideoKey] = useState<string>("");
  const [savedQuestions, setSavedQuestions] = useState<Question[]>([]);
  const [draftQuestions, setDraftQuestions] = useState<Question[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);

  function handleVideoUploaded() {
    setSidebarRefreshTrigger((prev) => prev + 1);
  }

  async function handleSelectVideoFromSidebar(selectedVideoKey: string) {
    setVideoKey(selectedVideoKey);
    setFile(null);
    setLocalPreviewUrl("");
    setShareLink("");
    setDraftQuestions([]);
    setCurrentTime(0);
    setDuration(0);
    setSavedQuestions([]);
    await fetchQuestions(selectedVideoKey);
  }

  const activeQuestions = videoKey ? savedQuestions : draftQuestions;

  const createDraftId = () =>
    `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  async function fetchQuestions(targetVideoKey: string) {
    try {
      const response = await fetch(
        `/api/webinar-questions?videoKey=${encodeURIComponent(targetVideoKey)}`
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to fetch questions");
      }

      const data = (await response.json()) as Question[];
      setSavedQuestions(data);
    } catch {
      setError("Failed to load questions for this video.");
    }
  }

  async function generateAiQuestions(targetVideoKey: string, count: number = 5) {
    setGeneratingQuestions(true);
    setError(null);

    try {
      const response = await fetch("/api/webinar-ai-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoKey: targetVideoKey, count }),
      });

      const responseBody = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responseBody.error || "Failed to generate AI questions");
      }

      await fetchQuestions(targetVideoKey);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Failed to generate AI questions"
      );
    } finally {
      setGeneratingQuestions(false);
    }
  }


  async function persistDraftQuestions(targetVideoKey: string, drafts: Question[]) {
    for (const draft of drafts) {
      const payload = {
        videoKey: targetVideoKey,
        timestamp: draft.timestamp,
        type: draft.type,
        question: draft.question,
        options: draft.options,
        keywords: draft.keywords || [],
      };
      const response = await fetch("/api/webinar-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMessage = errorBody.error || response.statusText;
        console.error("API Error Response:", {
          status: response.status,
          error: errorMessage,
          payload,
        });
        throw new Error(`Failed to save question: ${errorMessage}`);
      }
    }
  }

  async function handleUpload() {
    if (!file) {
      setError("Please select a video first.");
      return;
    }

    setUploading(true);
    setError(null);
    setCopied(false);

    try {
      const draftsToPersist = draftQuestions;
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(body.error ?? "Upload failed");
      }

      const data = (await res.json()) as UploadResponse;
      const watchLink = `${window.location.origin}/watch/${encodeURIComponent(data.key)}`;

      setVideoKey(data.key);
      setShareLink(watchLink);
      setSavedQuestions([]);

      if (draftsToPersist.length > 0) {
        await persistDraftQuestions(data.key, draftsToPersist);
      }

      setDraftQuestions([]);
      await fetchQuestions(data.key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected upload error");
    } finally {
      setUploading(false);
      handleVideoUploaded();
    }
  }

  async function copyLink() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
  }

  function handleFileChange(selectedFile: File | null) {
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }

    setFile(selectedFile);
    setShareLink("");
    setVideoKey("");
    setSavedQuestions([]);
    setDraftQuestions([]);
    setCurrentTime(0);
    setDuration(0);
    setLocalPreviewUrl(selectedFile ? URL.createObjectURL(selectedFile) : "");
  }

  return (
    <div className="flex h-screen w-full">
        <UploadedVideosSidebar key={sidebarRefreshTrigger} currentVideoKey={videoKey} onSelectVideo={handleSelectVideoFromSidebar} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl p-6">
            <h1 className="text-2xl font-bold">Upload Webinar Video</h1>

            {shareLink ? (
              <div className="rounded border p-4">
                <p className="mb-2 font-medium">Share Link</p>
                <div className="mt-3 flex gap-3">
                  <button type="button" onClick={copyLink} className="rounded border px-3 py-1">Copy Link</button>
                  {copied ? <span className="text-sm text-green-600">Copied!</span> : null}
                </div>
              </div>
            ) : null}

            {videoKey ? (
              <div className="rounded border p-4 space-y-3">
                <InterviewAvailabilityPicker videoKey={videoKey} />
                <div className="border-t pt-3">
                  <p className="mb-2 text-sm text-gray-600">Generate transcript-based questions automatically from this webinar.</p>
                  <div className="flex items-center gap-3">
                    <label className="text-sm">Questions:</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value || 1))}
                      className="w-20 rounded border px-2 py-1"
                    />
                    <button type="button" onClick={() => generateAiQuestions(videoKey, questionCount)} disabled={generatingQuestions} className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">{generatingQuestions ? "Generating..." : "Generate AI Questions"}</button>
                  </div>
                </div>
              </div>
            ) : null}

            {localPreviewUrl ? (
              <div className="rounded border p-4">
                <p className="mb-2 font-medium">Local Preview</p>
                <video ref={videoRef} controls className="w-full" preload="metadata" onTimeUpdate={() => { if (videoRef.current) setCurrentTime(videoRef.current.currentTime); }} onLoadedMetadata={() => { if (videoRef.current) setDuration(videoRef.current.duration); }}>
                  <source src={localPreviewUrl} type={file?.type || "video/mp4"} />
                  Your browser does not support the video tag.
                </video>
                <p className="mt-2 text-sm text-gray-600">Preview the selected file here before uploading to S3. You can add draft questions now and sync them after upload.</p>
              </div>
            ) : null}

            {(videoKey || localPreviewUrl) && activeQuestions.length > 0 ? (
              <div className="rounded border p-4 mt-4">
                <p className="mb-3 font-medium">Question Timeline</p>
                <QuestionTimeline questions={activeQuestions} videoDuration={duration || Math.max(...activeQuestions.map((q) => q.timestamp), 0) + 60} />
              </div>
            ) : null}

            <div className="rounded border p-4 mt-4">
              <h2 className="mb-2 text-lg font-semibold">Add Questions {videoKey ? "To This Uploaded Video" : "Before Upload"}</h2>
              <p className="mb-3 text-sm text-gray-600">You can add question markers now. If the video has not been uploaded yet, the questions will be saved as drafts and pushed to Supabase after upload.</p>

              <QuestionForm videoKey={videoKey || undefined} currentTimestamp={currentTime} onQuestionAdded={videoKey ? () => fetchQuestions(videoKey) : undefined} onDraftQuestionAdded={(draft) => setDraftQuestions((prev) => [...prev, { ...draft, id: createDraftId() }])} />

              {activeQuestions.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <h3 className="font-medium">{videoKey ? "Saved Questions" : "Draft Questions"} ({activeQuestions.length})</h3>
                  {activeQuestions.map((q) => (
                    <div key={q.id} className="flex items-start justify-between rounded border bg-gray-50 p-3">
                      <div>
                        <div className="font-medium">{q.question}</div>
                        <div className="mt-1 text-xs text-gray-500">At {Math.floor(q.timestamp)}s • Type: {q.type}{q.type === "text" && q.keywords?.length ? ` • Keywords: ${q.keywords.join(", ")}` : ""}</div>
                      </div>
                      <button type="button" className="text-sm text-red-600 hover:underline" onClick={async () => {
                        if (!confirm("Delete this question?")) return;
                        if (!videoKey) { setDraftQuestions((prev) => prev.filter((item) => item.id !== q.id)); return; }
                        try { const deleteRes = await fetch(`/api/webinar-questions/${q.id}`, { method: "DELETE" }); if (!deleteRes.ok) throw new Error("Failed to delete question"); setSavedQuestions((prev) => prev.filter((item) => item.id !== q.id)); } catch { setError("Failed to delete question."); }
                      }}>Delete</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-600">{videoKey ? "No questions added yet." : "No draft questions added yet."}</p>
              )}
            </div>

            <div className="rounded border p-4 mt-4">
              <label className="mb-2 block text-sm font-medium">Select Video File</label>
              <input accept="video/*" className="mb-3 block w-full" type="file" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
              <p className="mb-3 text-sm text-gray-600">Pick the video first, review it in the local preview above, then upload when ready.</p>
              <button type="button" onClick={handleUpload} disabled={uploading} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">{uploading ? "Uploading..." : "Upload to S3"}</button>
              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            </div>
          </div>
        </main>
      </div>
    );
}
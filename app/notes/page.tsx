"use client";

import { useState } from "react";

type UploadResponse = {
  key: string;
  publicVideoUrl: string;
};

export default function NotesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  async function handleUpload() {
    if (!file) {
      setError("Please select a video first.");
      return;
    }

    setUploading(true);
    setError(null);
    setCopied(false);

    try {
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

      setVideoUrl(data.publicVideoUrl);
      setShareLink(watchLink);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected upload error");
    } finally {
      setUploading(false);
    }
  }

  async function copyLink() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Upload Webinar Video</h1>

      <div className="rounded border p-4">
        <label className="mb-2 block text-sm font-medium">Select Video File</label>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mb-3 block w-full"
        />

        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload to S3"}
        </button>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      {shareLink ? (
        <div className="rounded border p-4">
          <p className="mb-2 font-medium">Share Link</p>
          <a href={shareLink} className="break-all text-blue-600 underline" target="_blank" rel="noreferrer">
            {shareLink}
          </a>

          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={copyLink}
              className="rounded border px-3 py-1"
            >
              Copy Link
            </button>
            {copied ? <span className="text-sm text-green-600">Copied!</span> : null}
          </div>
        </div>
      ) : null}

      {videoUrl ? (
        <div className="rounded border p-4">
          <p className="mb-2 font-medium">Uploaded Video Preview</p>
          <video controls className="w-full" preload="metadata">
            <source src={videoUrl} type={file?.type || "video/mp4"} />
            Your browser does not support the video tag.
          </video>
        </div>
      ) : null}
    </main>
  );
}
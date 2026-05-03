"use client";

import { useState } from "react";

export function BulkWhatsAppForm() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState(
    `Hi {name}! You're invited to join our webinar. Click here to watch: {webinar_link}`
  );
  const [webinarLink, setWebinarLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    successful: number;
    failed: number;
    totalRecipients: number;
    detectedColumns: { phoneColumn: string; nameColumn: string };
    errors: string[];
  } | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    if (!file) {
      setError("Please select an Excel file");
      setLoading(false);
      return;
    }

    if (!message) {
      setError("Please enter a message template");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("message", message);
      formData.append("webinarLink", webinarLink);

      const response = await fetch("/api/whatsapp/send-bulk", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send messages");
      } else {
        setResult(data);
        setFile(null);
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded border border-gray-300 p-6 bg-white">
        <h2 className="mb-4 text-xl font-semibold">Send Webinar Invitations via WhatsApp</h2>

        {/* File Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Upload Excel File (.xlsx)
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              {file ? (
                <div>
                  <p className="text-green-600 font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">Click to change file</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500">Excel file with phone numbers and names</p>
                </div>
              )}
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            💡 Your Excel file should have columns for phone numbers and names. 
            The system will auto-detect columns named: phone, whatsapp, mobile, number, or contact 
            for phone numbers and name, fullname, first name, or recipient for names.
          </p>
        </div>

        {/* Webinar Link */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Webinar Link
          </label>
          <input
            type="url"
            value={webinarLink}
            onChange={(e) => setWebinarLink(e.target.value)}
            placeholder="https://yourapp.com/watch/..."
            className="w-full rounded border border-gray-300 p-2"
          />
          <p className="mt-1 text-xs text-gray-600">
            This will replace &#123;webinar_link&#125; in your message template
          </p>
        </div>

        {/* Message Template */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Message Template
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message. Use {name} for recipient name and {webinar_link} for the link"
            className="w-full rounded border border-gray-300 p-3"
            rows={5}
          />
          <p className="mt-2 text-xs text-gray-600">
            <strong>Available placeholders:</strong>
            <br />
            • {"{name}"} - Will be replaced with recipient&apos;s name
            <br />
            • {"{webinar_link}"} - Will be replaced with the webinar link
          </p>

          {/* Message Preview */}
          {webinarLink && (
            <div className="mt-3 rounded bg-blue-50 p-3">
              <p className="text-xs font-semibold text-blue-900 mb-1">Preview (with sample data):</p>
              <p className="text-sm text-blue-800">
                {message
                  .replace("{name}", "John")
                  .replace("{webinar_link}", webinarLink)}
              </p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !file}
          className="w-full rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Sending messages..." : "Send Invitations"}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="rounded border border-green-300 bg-green-50 p-6">
          <h3 className="mb-3 text-lg font-semibold text-green-900">
            ✓ Messages Sent Successfully!
          </h3>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="rounded bg-white p-3 text-center">
              <p className="text-3xl font-bold text-green-600">
                {result.successful}
              </p>
              <p className="text-sm text-gray-600">Successful</p>
            </div>
            <div className="rounded bg-white p-3 text-center">
              <p className="text-3xl font-bold text-red-600">
                {result.failed}
              </p>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
            <div className="rounded bg-white p-3 text-center">
              <p className="text-3xl font-bold text-blue-600">
                {result.totalRecipients}
              </p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </div>

          {result.detectedColumns && (
            <div className="mb-4 rounded bg-white p-3">
              <p className="text-sm font-semibold mb-2">Detected Columns:</p>
              <p className="text-xs text-gray-600">
                Phone: <strong>{result.detectedColumns.phoneColumn}</strong>
                {result.detectedColumns.nameColumn && (
                  <>
                    {" | "}
                    Name: <strong>{result.detectedColumns.nameColumn}</strong>
                  </>
                )}
              </p>
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="rounded bg-white p-3 border border-red-200">
              <p className="text-sm font-semibold text-red-600 mb-2">Errors:</p>
              <ul className="text-xs text-red-600 space-y-1">
                {result.errors.slice(0, 5).map((err: string, idx: number) => (
                  <li key={idx}>• {err}</li>
                ))}
                {result.errors.length > 5 && (
                  <li>... and {result.errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          <button
            onClick={() => {
              setResult(null);
              setMessage(
                `Hi {name}! You're invited to join our webinar. Click here to watch: {webinar_link}`
              );
              setWebinarLink("");
            }}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Send another batch
          </button>
        </div>
      )}
    </div>
  );
}

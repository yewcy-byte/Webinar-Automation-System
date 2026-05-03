"use client";

import { useState } from "react";

type QuestionDraft = {
  timestamp: number;
  type: "yes_no" | "multiple_choice" | "text";
  question: string;
  options: string[];
  keywords: string[];
};

type QuestionFormProps = {
  videoKey?: string;
  currentTimestamp: number;
  onQuestionAdded?: () => void;
  onDraftQuestionAdded?: (question: QuestionDraft) => void;
};

type QuestionFormData = {
  question: string;
  type: "yes_no" | "multiple_choice" | "text";
  options: string[];
  keywords: string;
};

export function QuestionForm({
  videoKey,
  currentTimestamp,
  onQuestionAdded,
  onDraftQuestionAdded,
}: QuestionFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<QuestionFormData>({
    question: "",
    type: "text",
    options: ["", ""],
    keywords: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const keywordsList = formData.type === "text" 
      ? formData.keywords.split(",").map(k => k.trim()).filter(k => k)
      : [];

    const questionPayload: QuestionDraft = {
      timestamp: currentTimestamp,
      type: formData.type,
      question: formData.question,
      options:
        formData.type === "multiple_choice"
          ? formData.options.filter((o) => o.trim())
          : [],
      keywords: keywordsList,
    };

    if (!videoKey) {
      if (!onDraftQuestionAdded) {
        setLoading(false);
        alert("Question drafts are not enabled yet.");
        return;
      }

      onDraftQuestionAdded(questionPayload);
      setFormData({
        question: "",
        type: "text",
        options: ["", ""],
        keywords: "",
      });
      setIsOpen(false);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/webinar-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoKey,
          timestamp: questionPayload.timestamp,
          type: questionPayload.type,
          question: questionPayload.question,
          options: questionPayload.options,
          keywords: questionPayload.keywords,
        }),
      });

      if (!response.ok) throw new Error("Failed to save question");

      setFormData({
        question: "",
        type: "text",
        options: ["", ""],
        keywords: "",
      });
      setIsOpen(false);
      onQuestionAdded?.();
    } catch (error) {
      alert(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, ""],
    });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="mb-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        + Add Question at {Math.floor(currentTimestamp)}s
      </button>
    );
  }

  return (
    <div className="mb-4 rounded border border-gray-300 bg-gray-50 p-4">
      <h3 className="mb-3 text-lg font-semibold">
        Add Question at {Math.floor(currentTimestamp)}s
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Question Text</label>
          <textarea
            value={formData.question}
            onChange={(e) =>
              setFormData({ ...formData, question: e.target.value })
            }
            placeholder="Enter your question..."
            className="mt-1 w-full rounded border border-gray-300 p-2"
            rows={3}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Type</label>
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData({
                ...formData,
                type: e.target.value as QuestionFormData["type"],
              })
            }
            className="mt-1 w-full rounded border border-gray-300 p-2"
          >
            <option value="text">Text Answer</option>
            <option value="yes_no">Yes/No</option>
            <option value="multiple_choice">Multiple Choice</option>
          </select>
        </div>

        {formData.type === "text" && (
          <div>
            <label className="block text-sm font-medium">
              Keywords to Look For (comma-separated)
            </label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) =>
                setFormData({ ...formData, keywords: e.target.value })
              }
              placeholder="e.g., marketing, sales, growth"
              className="mt-1 w-full rounded border border-gray-300 p-2"
            />
            <p className="mt-1 text-xs text-gray-600">
              These keywords will help you filter relevant responses.
            </p>
          </div>
        )}

        {formData.type === "multiple_choice" && (
          <div>
            <label className="block text-sm font-medium">Options</label>
            <div className="mt-2 space-y-2">
              {formData.options.map((option, index) => (
                <input
                  key={index}
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="w-full rounded border border-gray-300 p-2"
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addOption}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              + Add Option
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Question"}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded bg-gray-400 px-4 py-2 text-white hover:bg-gray-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}


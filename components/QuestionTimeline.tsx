"use client";

import { useState } from "react";

type Question = {
  id: string;
  timestamp: number;
  type: string;
  question: string;
  importance: string;
  options: string[];
};

type QuestionTimelineProps = {
  questions: Question[];
  videoDuration: number;
};

const IMPORTANCE_COLORS = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

export function QuestionTimeline({
  questions,
  videoDuration,
}: QuestionTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getPositionPercent = (timestamp: number) => {
    return (timestamp / videoDuration) * 100;
  };

  return (
    <div className="mt-4 space-y-2">
      {/* Timeline bar */}
      <div className="relative h-12 w-full bg-gray-200 rounded">
        {questions.map((q) => (
          <button
            key={q.id}
            onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
            className={`absolute top-2 w-8 h-8 rounded-full flex items-center justify-center transform -translate-x-1/2 hover:scale-125 transition ${
              IMPORTANCE_COLORS[q.importance as keyof typeof IMPORTANCE_COLORS]
            } text-white text-xs font-bold cursor-pointer shadow-lg`}
            style={{ left: `${getPositionPercent(q.timestamp)}%` }}
            title={`${q.question.substring(0, 30)}... at ${Math.floor(q.timestamp)}s`}
          >
            ❓
          </button>
        ))}
      </div>

      {/* Expanded question display */}
      {expandedId && (
        <div className="rounded border border-blue-300 bg-blue-50 p-4">
          {questions.map((q) => {
            if (q.id !== expandedId) return null;

            return (
              <div key={q.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold text-white ${
                          IMPORTANCE_COLORS[
                            q.importance as keyof typeof IMPORTANCE_COLORS
                          ]
                        }`}
                      >
                        {q.importance.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600">
                        {Math.floor(q.timestamp)}s
                      </span>
                    </div>
                    <h4 className="text-lg font-semibold mb-3">{q.question}</h4>

                    {q.type === "yes_no" && (
                      <div className="space-y-2">
                        <button className="block w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
                          Yes
                        </button>
                        <button className="block w-full rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600">
                          No
                        </button>
                      </div>
                    )}

                    {q.type === "multiple_choice" && (
                      <div className="space-y-2">
                        {q.options.map((option, idx) => (
                          <button
                            key={idx}
                            className="block w-full rounded border border-gray-300 px-4 py-2 text-left hover:bg-gray-100"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === "text" && (
                      <input
                        type="text"
                        placeholder="Type your answer..."
                        className="w-full rounded border border-gray-300 px-4 py-2"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary list */}
      {questions.length > 0 && (
        <div className="text-sm text-gray-600 mt-2">
          {questions.length} question{questions.length !== 1 ? "s" : ""} in this
          video
        </div>
      )}
    </div>
  );
}

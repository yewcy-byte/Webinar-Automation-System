"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Question = {
  id: string;
  timestamp: number;
  type: "yes_no" | "multiple_choice" | "text";
  question: string;
  options: string[];
  keywords?: string[];
};

type InterviewAvailability = {
  id: string;
  startDate: string;
  endDate: string;
};

type WatchVideoExperienceProps = {
  videoKey: string;
  cloudFrontBase: string;
  userEmail: string;
};

const SCORE_MAP = {
  low: 1,
  medium: 2,
  high: 3,
} as const;

const SCORE_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
} as const;

type PriorityLevel = keyof typeof SCORE_MAP;

const getQuestionPriority = (question: Question): PriorityLevel => {
  if (question.type === "yes_no") {
    return "low";
  }

  if (question.type === "multiple_choice") {
    return "medium";
  }

  return "high";
};

export function WatchVideoExperience({
  videoKey,
  cloudFrontBase,
  userEmail,
}: WatchVideoExperienceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [availabilities, setAvailabilities] = useState<InterviewAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<Set<string>>(
    () => new Set()
  );
  const [score, setScore] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [selectedAvailabilityId, setSelectedAvailabilityId] = useState("");
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [submittingFinal, setSubmittingFinal] = useState(false);
  const [finalError, setFinalError] = useState<string | null>(null);
  const [finalSuccess, setFinalSuccess] = useState<string | null>(null);

  const currentQuestion =
    activeQuestionIndex === null ? null : questions[activeQuestionIndex] || null;
  const maxScore = questions.length * SCORE_MAP.high;
  const scorePercentage = maxScore > 0 ? Math.min(100, (score / maxScore) * 100) : 0;
  const highScoreThreshold = useMemo(() => {
    return maxScore > 0 ? Math.max(3, Math.ceil(maxScore * 0.7)) : 0;
  }, [maxScore]);
  const isHighScore = highScoreThreshold > 0 && score >= highScoreThreshold;
  const selectedAvailability =
    availabilities.find((item) => item.id === selectedAvailabilityId) ||
    availabilities[0] ||
    null;
  const currentPriority = currentQuestion ? getQuestionPriority(currentQuestion) : "medium";

  useEffect(() => {
    if (availabilities.length > 0 && !selectedAvailabilityId) {
      setSelectedAvailabilityId(availabilities[0].id);
    }
  }, [availabilities, selectedAvailabilityId]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [questionsResponse, availabilityResponse] = await Promise.all([
          fetch(`/api/webinar-questions?videoKey=${encodeURIComponent(videoKey)}`),
          fetch(`/api/interview-availability?videoKey=${encodeURIComponent(videoKey)}`),
        ]);

        if (!questionsResponse.ok) {
          const errorBody = await questionsResponse.json().catch(() => ({}));
          throw new Error(errorBody.error || "Failed to fetch questions");
        }

        if (!availabilityResponse.ok) {
          const errorBody = await availabilityResponse.json().catch(() => ({}));
          throw new Error(errorBody.error || "Failed to fetch interview availability");
        }

        const questionsData = (await questionsResponse.json()) as Question[];
        const availabilityData = (await availabilityResponse.json()) as InterviewAvailability[];

        setQuestions(questionsData);
        setAvailabilities(availabilityData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load video data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [videoKey]);

  useEffect(() => {
    if (showCompletion) {
      videoRef.current?.pause();
    }
  }, [showCompletion]);

  useEffect(() => {
    if (questions.length === 0) {
      return;
    }

    if (activeQuestionIndex !== null) {
      return;
    }

    const dueQuestion = questions.find(
      (question) =>
        question.timestamp <= currentTime && !answeredQuestionIds.has(question.id)
    );

    if (dueQuestion) {
      const dueIndex = questions.findIndex((question) => question.id === dueQuestion.id);
      if (dueIndex !== -1) {
        setActiveQuestionIndex(dueIndex);
        setSelectedAnswer("");
      }
    }
  }, [answeredQuestionIds, activeQuestionIndex, currentTime, questions]);


  const resumeVideo = async () => {
    try {
      await videoRef.current?.play();
    } catch {
      // Ignore autoplay restrictions; user can press play again.
    }
  };

  useEffect(() => {
    if (activeQuestionIndex !== null) {
      videoRef.current?.pause();
      return;
    }

    // Only resume if the session hasn't completed
    if (!showCompletion) {
      resumeVideo();
    }
  }, [activeQuestionIndex, showCompletion]);

  const handleTimeUpdate = () => {
    const current = videoRef.current?.currentTime ?? 0;
    setCurrentTime(current);
  };

  const handleEnded = () => {
    setShowCompletion(true);
  };

  const handleAnswerSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentQuestion) {
      return;
    }

    if (!selectedAnswer.trim()) {
      setError("Please provide an answer before submitting.");
      return;
    }

    setSubmittingAnswer(true);
    setError(null);

    try {
      const response = await fetch("/api/webinar-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          userEmail,
          answer: selectedAnswer.trim(),
          importance: getQuestionPriority(currentQuestion),
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to save answer");
      }

      setAnsweredQuestionIds((previous) => {
        const next = new Set(previous);
        next.add(currentQuestion.id);
        return next;
      });
      setScore((previous) => previous + SCORE_MAP[getQuestionPriority(currentQuestion)]);
      setActiveQuestionIndex(null);
      setSelectedAnswer("");
      await resumeVideo();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save answer");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleFinalSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!resumeFile) {
      setFinalError("Please attach your resume before continuing.");
      return;
    }

    if (isHighScore && availabilities.length > 0 && !selectedAvailability) {
      setFinalError("Please choose an interview time slot.");
      return;
    }

    setSubmittingFinal(true);
    setFinalError(null);

    try {
      const formData = new FormData();
      formData.append("videoKey", videoKey);
      formData.append("userEmail", userEmail);
      formData.append("totalScore", String(score));
      formData.append("maxScore", String(maxScore));
      formData.append("resume", resumeFile);

      if (isHighScore && selectedAvailability) {
        formData.append("interviewStartDate", selectedAvailability.startDate);
        formData.append("interviewEndDate", selectedAvailability.endDate);
        formData.append("selectedAvailabilityId", selectedAvailability.id);
      }

      const response = await fetch("/api/webinar-submissions", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to save submission");
      }

      setFinalSuccess(
        isHighScore
          ? "Your resume and interview request were submitted successfully."
          : "Your resume was submitted successfully."
      );
    } catch (submitError) {
      setFinalError(
        submitError instanceof Error ? submitError.message : "Failed to submit final details"
      );
    } finally {
      setSubmittingFinal(false);
    }
  };

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6">Loading webinar experience...</div>;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
      </div>
    );
  }

  const videoUrl = `${cloudFrontBase}/${encodeURIComponent(videoKey)}`;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-sky-300">Marks Bar</p>
            <h2 className="mt-1 text-2xl font-semibold">Your Webinar Score</h2>
            <p className="mt-1 text-sm text-slate-300">
              Answer questions to build your score. Higher-priority answers earn more points.
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black">{score}</div>
            <div className="text-sm text-slate-400">out of {maxScore || 0}</div>
          </div>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all"
            style={{ width: `${scorePercentage}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between text-xs text-slate-400">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-black shadow-2xl">
        <video
          ref={videoRef}
          controls
          preload="metadata"
          className="block w-full"
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {currentQuestion && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <form
              onSubmit={handleAnswerSubmit}
              className="w-full max-w-2xl rounded-[1.75rem] border border-white/10 bg-white p-6 text-slate-900 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Question at {Math.floor(currentQuestion.timestamp)}s
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold leading-tight">
                    {currentQuestion.question}
                  </h3>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  +{SCORE_MAP[currentPriority]} points
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {currentQuestion.type === "yes_no" && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedAnswer("Yes")}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        selectedAnswer === "Yes"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAnswer("No")}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        selectedAnswer === "No"
                          ? "border-rose-500 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      No
                    </button>
                  </div>
                )}

                {currentQuestion.type === "multiple_choice" && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSelectedAnswer(option)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                          selectedAnswer === option
                            ? "border-sky-500 bg-sky-50 text-sky-700"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {currentQuestion.type === "text" && (
                  <textarea
                    value={selectedAnswer}
                    onChange={(event) => setSelectedAnswer(event.target.value)}
                    placeholder="Type your answer..."
                    className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-500"
                  />
                )}

                {error && <p className="text-sm font-medium text-red-600">{error}</p>}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Your answer will be saved to Supabase immediately.
                </p>
                <button
                  type="submit"
                  disabled={submittingAnswer}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submittingAnswer ? "Saving..." : "Submit Answer"}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {duration > 0 && questions.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-slate-500">
          No questions have been added to this webinar yet.
        </div>
      )}

      {showCompletion && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <section className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white p-6 shadow-2xl">
            <div className="max-h-[80vh] overflow-y-auto pr-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Session complete
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">
                {isHighScore
                  ? "You earned an interview prompt"
                  : "Thank you for your time"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {isHighScore
                  ? "Your score hit the interview threshold. Please submit your resume and choose an available interview slot from the webinar creator."
                  : "Please submit your resume below and thank you for taking the webinar."}
              </p>

              <form onSubmit={handleFinalSubmit} className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Resume upload
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  />
                </div>

                {isHighScore && availabilities.length > 0 && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Choose an interview slot
                    </label>
                    <select
                      value={selectedAvailabilityId}
                      onChange={(event) => setSelectedAvailabilityId(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    >
                      {availabilities.map((availability) => (
                        <option key={availability.id} value={availability.id}>
                          {new Date(availability.startDate).toLocaleDateString()} to {new Date(availability.endDate).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {isHighScore && availabilities.length === 0 && (
                  <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    The creator has not added interview availability yet, so only your resume can be submitted for now.
                  </p>
                )}

                {finalError && <p className="text-sm font-medium text-red-600">{finalError}</p>}
                {finalSuccess && <p className="text-sm font-medium text-emerald-700">{finalSuccess}</p>}

                <button
                  type="submit"
                  disabled={submittingFinal}
                  className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submittingFinal ? "Submitting..." : isHighScore ? "Submit Resume & Interview Request" : "Submit Resume"}
                </button>
              </form>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

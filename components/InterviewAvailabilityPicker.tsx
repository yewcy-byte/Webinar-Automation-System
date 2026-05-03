"use client";

import { useState } from "react";

type InterviewAvailabilityPickerProps = {
  videoKey: string;
  onAvailabilityAdded?: () => void;
};

type Availability = {
  id: string;
  startDate: string;
  endDate: string;
};

export function InterviewAvailabilityPicker({
  videoKey,
  onAvailabilityAdded,
}: InterviewAvailabilityPickerProps) {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [excludeWeekends, setExcludeWeekends] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing availabilities on first render
  if (!loaded && videoKey) {
    setLoaded(true);
    fetchAvailabilities();
  }

  async function fetchAvailabilities() {
    try {
      const response = await fetch(
        `/api/interview-availability?videoKey=${encodeURIComponent(videoKey)}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch availabilities");
      }

      const data = (await response.json()) as Availability[];
      setAvailabilities(data);
    } catch (err) {
      console.error("Error fetching availabilities:", err);
      // Don't show error in UI for fetch failures, just log
    }
  }

  async function handleAddAvailability() {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date must be before or equal to end date.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rangesToSave: { start: Date; end: Date }[] = [];

      const s = new Date(startDate);
      const e = new Date(endDate);

      if (excludeWeekends) {
        // Split into contiguous weekday ranges
        let cur: Date | null = null;
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
          const day = d.getDay(); // 0=Sun,6=Sat
          const isWeekend = day === 0 || day === 6;

          if (!isWeekend) {
            if (!cur) cur = new Date(d);
          } else {
            if (cur) {
              rangesToSave.push({ start: new Date(cur), end: new Date(new Date(d).setDate(d.getDate() - 1)) });
              cur = null;
            }
          }
        }
        if (cur) {
          rangesToSave.push({ start: new Date(cur), end: new Date(e) });
        }
      } else {
        rangesToSave.push({ start: s, end: e });
      }

      // Save each range sequentially
      for (const r of rangesToSave) {
        const response = await fetch("/api/interview-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoKey,
            startDate: r.start.toISOString(),
            endDate: r.end.toISOString(),
          }),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody.error || "Failed to save availability");
        }
      }

      // Clear form and refresh list
      setStartDate("");
      setEndDate("");
      setExcludeWeekends(false);
      await fetchAvailabilities();
      onAvailabilityAdded?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save availability"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAvailability(id: string) {
    if (!confirm("Delete this availability range?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/interview-availability?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete availability");
      }

      await fetchAvailabilities();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete availability"
      );
    }
  }

  return (
    <div className="rounded border border-gray-300 bg-gray-50 p-4">
      <h3 className="mb-3 text-lg font-semibold">Interview Availability</h3>
      <p className="mb-4 text-sm text-gray-600">
        Set the date ranges when you're available to interview candidates about
        this webinar.
      </p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 p-2"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <input
            id="excludeWeekends"
            type="checkbox"
            checked={excludeWeekends}
            onChange={(e) => setExcludeWeekends(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="excludeWeekends" className="text-sm">
            Exclude weekends (split into weekday ranges)
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleAddAvailability}
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Availability Range"}
        </button>
      </div>

      {availabilities.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <h4 className="mb-3 font-medium">Availability Ranges</h4>
          <div className="space-y-2">
            {availabilities.map((avail) => (
              <div
                key={avail.id}
                className="flex items-center justify-between rounded border bg-white p-3"
              >
                <div className="text-sm">
                  <div className="font-medium">
                    {new Date(avail.startDate).toLocaleDateString()} to{" "}
                    {new Date(avail.endDate).toLocaleDateString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAvailability(avail.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle, ShieldAlert, Plus, Minus, RotateCcw } from "lucide-react";

interface AttendanceCourse {
  course_code: string;
  course_title: string;
  course_type: string;
  slot: string;
  attended: number;
  total: number;
  percentage: number;
  skip_buffer: number;
  classes_needed: number;
  status: string;
  status_message: string;
  remaining_classes: number;
}

interface AttendanceCardProps {
  payload: {
    target_pct: number;
    courses: AttendanceCourse[];
  };
}

export const AttendanceCard: React.FC<AttendanceCardProps> = ({ payload }) => {
  const [filter, setFilter] = useState<"ALL" | "ETH" | "ELA" | "RISK">("ALL");
  const [deltas, setDeltas] = useState<Record<string, { attended: number; missed: number }>>({});

  const courses = payload?.courses || [];
  const targetPct = payload?.target_pct || 75.0;

  const handleSimulate = (key: string, type: "attend" | "miss", amount: number) => {
    setDeltas((prev) => {
      const curr = prev[key] || { attended: 0, missed: 0 };
      if (type === "attend") {
        return { ...prev, [key]: { ...curr, attended: Math.max(0, curr.attended + amount) } };
      } else {
        return { ...prev, [key]: { ...curr, missed: Math.max(0, curr.missed + amount) } };
      }
    });
  };

  const handleReset = (key: string) => {
    setDeltas((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleResetAll = () => {
    setDeltas({});
  };

  const hasActiveSimulations = Object.values(deltas).some((d) => d.attended > 0 || d.missed > 0);

  const filteredCourses = courses.filter((c) => {
    if (filter === "ETH") return c.course_type === "ETH" || c.course_type === "TH";
    if (filter === "ELA") return c.course_type === "ELA" || c.course_type === "LO";
    if (filter === "RISK") return c.percentage < targetPct;
    return true;
  });

  if (!courses || courses.length === 0) {
    return (
      <div className="my-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-emerald-500" />
        <span>No registered attendance records found for this semester.</span>
      </div>
    );
  }

  return (
    <div className="my-2 max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              Attendance & 75% Criteria Engine
            </h4>
            {hasActiveSimulations && (
              <button
                type="button"
                onClick={handleResetAll}
                className="text-[10px] text-indigo-500 hover:text-indigo-600 font-semibold flex items-center gap-0.5 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded transition"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset Sim</span>
              </button>
            )}
          </div>
          <span className="text-[11px] text-slate-500">Official threshold: {targetPct}%</span>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-medium">
          {(["ALL", "ETH", "ELA", "RISK"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded-md transition ${
                filter === tab
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-semibold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {tab === "ALL" ? "All" : tab === "ETH" ? "Theory" : tab === "ELA" ? "Lab" : "Danger (<75%)"}
            </button>
          ))}
        </div>
      </div>

      {/* Course List */}
      <div className="space-y-3">
        {filteredCourses.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 space-y-1">
            <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              {filter === "RISK" ? "Zero Attendance Risks!" : "No courses match the selected filter."}
            </p>
            <p className="text-[11px] text-slate-400">
              {filter === "RISK"
                ? "All your registered subjects meet or exceed the mandatory 75% threshold."
                : "Switch to 'All' to view complete course registrations."}
            </p>
          </div>
        ) : (
          filteredCourses.map((c) => {
          const key = `${c.course_code}_${c.course_type}`;
          const delta = deltas[key] || { attended: 0, missed: 0 };
          const simAttended = c.attended + delta.attended;
          const simTotal = c.total + delta.attended + delta.missed;
          const simPct = simTotal > 0 ? (simAttended / simTotal) * 100 : c.percentage;

          const isDebarred = simPct < 60.0;
          const isWarning = simPct < targetPct;
          const isBorderline = Math.abs(simPct - 75.0) < 0.1;

          // Color calculation
          const ringColor = isDebarred ? "text-rose-500" : isWarning ? "text-amber-500" : "text-emerald-500";
          const badgeBg = isDebarred
            ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
            : isWarning
            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
            : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300";

          return (
            <div
              key={key}
              className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{c.course_code}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                      {c.course_type}
                    </span>
                    <span className="text-[10px] text-slate-400">Slot {c.slot}</span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate max-w-xs mt-0.5">
                    {c.course_title}
                  </div>
                </div>

                {/* Percentage Display */}
                <div className="text-right">
                  <div className={`text-base font-extrabold ${ringColor}`}>
                    {simPct.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {simAttended}/{simTotal} Classes
                  </div>
                </div>
              </div>

              {/* Status Message & Badges */}
              <div className="mt-2 text-xs flex items-center justify-between flex-wrap gap-1.5">
                <div className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 ${badgeBg}`}>
                  {isDebarred ? (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Debarment Danger (&lt;60%)
                    </>
                  ) : isWarning ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Need {Math.max(1, Math.ceil((0.75 * simTotal - simAttended) / 0.25))} Classes
                    </>
                  ) : isBorderline ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      Borderline (0 Skips Left)
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      Can Skip {Math.floor((simAttended - 0.75 * simTotal) / 0.75)} Classes
                    </>
                  )}
                </div>

                {/* +1 / -1 Simulator Controls */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border rounded-lg px-1.5 py-0.5 text-[11px]">
                  <span className="text-slate-400 text-[10px] mr-1">Sim:</span>
                  <button
                    onClick={() => handleSimulate(key, "attend", 1)}
                    className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-600 rounded"
                    title="Simulate Attending +1 Class"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleSimulate(key, "miss", 1)}
                    className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 rounded"
                    title="Simulate Missing +1 Class"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  {(delta.attended > 0 || delta.missed > 0) && (
                    <button
                      onClick={() => handleReset(key)}
                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded ml-1"
                      title="Reset Simulator"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {(delta.attended > 0 || delta.missed > 0) && (
                <div className="mt-1 text-[10px] text-indigo-500 font-medium">
                  *Simulating: +{delta.attended} attended, +{delta.missed} missed
                </div>
              )}
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};

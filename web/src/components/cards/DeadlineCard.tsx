"use client";

import React from "react";
import { Calendar, Clock, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { downloadICSFile } from "@/lib/ics-export";

interface Deadline {
  course_code: string;
  course_title: string;
  title: string;
  due_date: string;
  due_time: string;
  submission_type: string;
  status: string;
}

interface DeadlineCardProps {
  payload: {
    deadlines: Deadline[];
  };
}

export const DeadlineCard: React.FC<DeadlineCardProps> = ({ payload }) => {
  const [isExported, setIsExported] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);
  const deadlines = payload?.deadlines || [];

  const handleExportAll = () => {
    if (deadlines.length === 0) return;
    try {
      setExportError(null);
      const events = deadlines.map((d) => ({
        title: `${d.course_code}: ${d.title}`,
        description: `${d.submission_type} for ${d.course_title}. Due: ${d.due_date} at ${d.due_time}`,
        startDate: d.due_date,
        startTime: d.due_time,
        location: "VTOP Portal"
      }));
      downloadICSFile("VTOP-Deadlines.ics", events);
      setIsExported(true);
      setTimeout(() => setIsExported(false), 3000);
    } catch (err) {
      console.error("Export error", err);
      setExportError("Failed to generate .ics file.");
      setTimeout(() => setExportError(null), 4000);
    }
  };

  if (!deadlines || deadlines.length === 0) {
    return (
      <div className="my-2 max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-center">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-2">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Pending Deadlines</h4>
        <p className="text-xs text-slate-500 mt-0.5">
          You have submitted all assignments and projects. No pending submissions found on VTOP!
        </p>
      </div>
    );
  }

  return (
    <div className="my-2 max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-semibold text-rose-500 uppercase tracking-wider block">
            Unified Deadline Radar
          </span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Digital Assignments & Projects</h4>
        </div>
        <button
          type="button"
          onClick={handleExportAll}
          aria-label="Export all deadlines to calendar"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer ${
            isExported
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300"
              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
          }`}
          title="Export all to Google Calendar (.ics)"
        >
          {isExported ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Exported .ics</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Export .ics</span>
            </>
          )}
        </button>
      </div>

      {exportError && (
        <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs rounded-lg flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{exportError}</span>
        </div>
      )}

      <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
        {deadlines.map((d, i) => {
          const isPending = d.status === "Pending";
          return (
            <div key={i} className="py-2.5 flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">{d.course_code}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {d.submission_type}
                  </span>
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5">
                  {d.title}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {d.due_date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {d.due_time}
                  </span>
                </div>
              </div>

              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 shrink-0 ${
                  isPending
                    ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                }`}
              >
                {isPending ? (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    Pending
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Submitted
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

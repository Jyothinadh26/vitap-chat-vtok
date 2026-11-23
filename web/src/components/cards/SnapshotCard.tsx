"use client";

import React from "react";
import { CheckCircle2, Clock, Calendar, BookOpen, AlertTriangle } from "lucide-react";

interface SnapshotCardProps {
  payload: {
    course_code: string;
    course_title: string;
    course_type: string;
    attendance?: {
      percentage: number;
      attended: number;
      total: number;
      skip_buffer: number;
      classes_needed: number;
      status: string;
    };
    marks?: {
      internal_total: number | null;
      internal_max: number | null;
      components: Array<{
        name: string;
        scored_marks: number | null;
        max_marks: number;
        weightage: number;
      }>;
    };
    next_class?: {
      slot: string;
      room_no: string;
      faculty: string;
      schedule: Array<{ day: string; start_time: string; end_time: string }>;
    };
    exam?: {
      exam_type: string;
      date: string;
      session: string;
      room_no: string;
      seat_no: string;
    };
  };
}

export const SnapshotCard: React.FC<SnapshotCardProps> = ({ payload }) => {
  const att = payload.attendance;
  const marks = payload.marks;
  const nc = payload.next_class;
  const ex = payload.exam;

  return (
    <div className="my-2 max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider block">
            Subject Snapshot
          </span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            {payload.course_title} ({payload.course_code})
          </h4>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {payload.course_type}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 my-3 text-xs">
        {/* Attendance tile */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 block font-medium">ATTENDANCE</span>
          {att ? (
            <div className="mt-1">
              <span className={`text-base font-extrabold ${att.percentage >= 75 ? "text-emerald-500" : "text-amber-500"}`}>
                {att.percentage.toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-500 block">
                {att.attended}/{att.total} ({att.skip_buffer > 0 ? `${att.skip_buffer} skips safe` : `${att.classes_needed} needed`})
              </span>
            </div>
          ) : (
            <span className="text-slate-400">No data</span>
          )}
        </div>

        {/* Marks tile */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 block font-medium">INTERNAL SCORE</span>
          {marks && marks.internal_total !== null ? (
            <div className="mt-1">
              <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                {marks.internal_total.toFixed(1)} / {marks.internal_max || 50}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {marks.components.length} components recorded
              </span>
            </div>
          ) : (
            <span className="text-slate-400 mt-1 block">Pending exams</span>
          )}
        </div>
      </div>

      {/* Next Class & Exam Schedule */}
      <div className="space-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-2.5">
        {nc && (
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-indigo-500" /> Next Class:
            </span>
            <span>Room {nc.room_no} • Slot {nc.slot} ({nc.faculty})</span>
          </div>
        )}
        {ex && (
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-rose-500" /> Next Exam ({ex.exam_type}):
            </span>
            <span className="font-semibold text-rose-600 dark:text-rose-400">{ex.date} • Room {ex.room_no} (Seat {ex.seat_no})</span>
          </div>
        )}
      </div>
    </div>
  );
};

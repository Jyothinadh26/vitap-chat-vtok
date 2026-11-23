"use client";

import React from "react";
import { Clock, MapPin, User, Calendar } from "lucide-react";

interface TimetableItem {
  course_code: string;
  course_title: string;
  course_type: string;
  slot: string;
  room_no: string;
  start_time: string;
  end_time: string;
  faculty: string;
}

interface TimetableCardProps {
  payload: {
    day: string;
    classes: TimetableItem[];
  };
}

export const TimetableCard: React.FC<TimetableCardProps> = ({ payload }) => {
  const classes = payload?.classes || [];

  return (
    <div className="my-2 max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider block">
            Class Schedule
          </span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-500" /> {payload.day}'s Timetable
          </h4>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
          {classes.length} Classes
        </span>
      </div>

      {classes.length === 0 ? (
        <div className="py-4 text-center text-xs text-slate-400">
          No classes scheduled for today! Enjoy your free time.
        </div>
      ) : (
        <div className="mt-3 space-y-2.5 text-xs">
          {classes.map((c, i) => (
            <div
              key={i}
              className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 dark:text-white">{c.course_code}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300">
                    {c.course_type}
                  </span>
                  <span className="text-[10px] text-slate-400">Slot {c.slot}</span>
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5">{c.course_title}</div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-500" /> {c.room_no}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-indigo-400" /> {c.faculty}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 block text-xs">
                  {c.start_time} - {c.end_time}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

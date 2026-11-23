"use client";

import React, { useState } from "react";
import {
  X,
  RefreshCw,
  AlertTriangle,
  Clock,
  Calendar,
  BookOpen,
  LogOut,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";

interface QuickGlanceSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessionData: any;
  onReSync: () => void;
  onLogout: () => void;
  isSyncing?: boolean;
}

export const QuickGlanceSidebar: React.FC<QuickGlanceSidebarProps> = ({
  isOpen,
  onClose,
  sessionData,
  onReSync,
  onLogout,
  isSyncing,
}) => {
  const profile = sessionData?.profile;
  const attendance = sessionData?.attendance || [];
  const deadlines = sessionData?.deadlines || [];

  const atRiskCourses = attendance.filter((a: any) => a.attendance_percentage < 75.0);
  const pendingDeadlines = deadlines.filter((d: any) => d.status === "Pending");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              VA
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {profile?.name || "Student Profile"}
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                {profile?.reg_no || "22BCE10234"} • {profile?.school || "SCOPE"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onReSync}
              disabled={isSyncing}
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold transition hover:bg-indigo-100 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Syncing..." : "Live Re-Sync"}</span>
            </button>
            <Link
              href="/ffcs"
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition hover:bg-slate-50 active:scale-95"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
              <span>FFCS Planner</span>
            </Link>
          </div>

          {/* 75% Attendance Alerts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Attendance Alerts
              </span>
              <span className="text-[10px] font-semibold text-rose-500">
                {atRiskCourses.length} at risk
              </span>
            </div>
            {atRiskCourses.length === 0 ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-[11px] font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> All courses are &gt;= 75%!
              </div>
            ) : (
              <div className="space-y-1.5">
                {atRiskCourses.map((c: any, i: number) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{c.course_code}</span>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[170px]">
                        {c.course_title}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-rose-600 block">
                        {c.attendance_percentage.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {c.attended_classes}/{c.total_classes}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Deadlines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-500" /> Pending Deadlines
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                {pendingDeadlines.length} due
              </span>
            </div>
            {pendingDeadlines.length === 0 ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-[11px] font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> All assignments submitted!
              </div>
            ) : (
              <div className="space-y-1.5">
                {pendingDeadlines.slice(0, 3).map((d: any, i: number) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                  >
                    <div className="flex justify-between font-medium">
                      <span className="font-bold text-slate-900 dark:text-white">{d.course_code}</span>
                      <span className="text-rose-500 font-semibold">{d.due_date}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                      {d.title}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Academic Info */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Academic Mentor:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {profile?.mentor_name} ({profile?.mentor_cabin})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Hostel Room:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {profile?.hostel_block} - Room {profile?.room_no}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current CGPA:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {profile?.current_cgpa}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <span className="text-[10px] text-slate-400">
            Last Synced: {sessionData?.last_synced_at ? new Date(sessionData.last_synced_at).toLocaleTimeString() : "Just now"}
          </span>
          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 font-semibold py-1 px-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

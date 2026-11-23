"use client";

import React from "react";
import { CheckCircle2, XCircle, Award, GraduationCap } from "lucide-react";

interface BasketInfo {
  required: number;
  earned: number;
  remaining: number;
  completion_pct: number;
}

interface CreditsCardProps {
  payload: {
    cgpa?: number;
    total_earned?: number;
    total_required?: number;
    tenth_pct?: number;
    twelfth_pct?: number;
    baskets?: Record<string, BasketInfo>;
    placement_badges?: {
      badge_777?: { eligible: boolean; label: string };
      badge_888?: { eligible: boolean; label: string };
      badge_999?: { eligible: boolean; label: string };
    };
    // Semester grade history
    semester?: string;
    sgpa?: number;
    credits_earned?: number;
    courses?: Array<{
      course_code: string;
      course_title: string;
      credits: number;
      grade: string;
      points: number;
    }>;
  };
}

export const CreditsCard: React.FC<CreditsCardProps> = ({ payload }) => {
  const isSemesterGrade = !!payload.semester;

  if (isSemesterGrade) {
    return (
      <div className="my-2 max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider block">
              Semester Grade Report
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{payload.semester}</h4>
          </div>
          <div className="text-right">
            <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 block">
              SGPA: {payload.sgpa}
            </span>
            <span className="text-[10px] text-slate-400">{payload.credits_earned} Credits Earned</span>
          </div>
        </div>

        {/* Courses Grade Table */}
        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {payload.courses?.map((c, i) => (
            <div key={i} className="py-2 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">{c.course_code}</span>
                <span className="text-[10px] text-slate-400">{c.course_title} ({c.credits} Cr)</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                c.grade === "S" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" :
                c.grade === "A" ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300" :
                c.grade === "B" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" :
                "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              }`}>
                Grade {c.grade}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const baskets = payload.baskets || {};
  const badges = payload.placement_badges || {};

  return (
    <div className="my-2 max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider block">
            Curriculum Credit Audit & Placement Eligibility
          </span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Overall Credit Distribution</h4>
        </div>
        <div className="text-right">
          <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 block">
            CGPA: {payload.cgpa}
          </span>
          <span className="text-[10px] text-slate-400">
            {payload.total_earned} / {payload.total_required} Credits
          </span>
        </div>
      </div>

      {/* Basket Progress Bars */}
      <div className="my-3 space-y-2.5">
        {Object.entries(baskets).map(([name, b]) => {
          const basketFullName = name === "UC" ? "University Core" : name === "PC" ? "Programme Core" : name === "PE" ? "Programme Elective" : "University Elective";
          return (
            <div key={name} className="text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {name} ({basketFullName})
                </span>
                <span className="text-slate-500 font-medium text-[11px]">
                  {b.earned} / {b.required} Cr ({b.completion_pct}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, b.completion_pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Placement Cutoff Badges */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
        <span className="text-[11px] font-semibold text-slate-400 block mb-2">
          Automated Campus Placement Cutoffs (10th: {payload.tenth_pct}%, 12th: {payload.twelfth_pct}%):
        </span>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {Object.entries(badges).map(([k, badge]) => (
            <div
              key={k}
              className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 ${
                badge.eligible
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-800 dark:text-rose-300 opacity-60"
              }`}
            >
              {badge.eligible ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600" />
              )}
              <span className="font-bold text-[11px]">{badge.label}</span>
              <span className="text-[10px]">{badge.eligible ? "Eligible" : "Not Met"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

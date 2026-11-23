"use client";

import React, { useState } from "react";
import { Award, AlertOctagon, TrendingUp } from "lucide-react";

interface ComponentMark {
  name: string;
  max_marks: number;
  scored_marks: number | null;
  weightage: number;
  class_average: number | null;
}

interface MarksResultItem {
  course_code: string;
  course_title: string;
  course_type: string;
  current_internal_total: number;
  current_internal_max: number;
  components: ComponentMark[];
}

interface MarksFatCardProps {
  payload: {
    results?: MarksResultItem[];
    // Or if returned from predict_fat_grade
    course_code?: string;
    course_title?: string;
    current_internal?: number;
    target_grade?: string;
    raw_fat_needed?: number;
    effective_min_fat?: number;
    status_note?: string;
    pass_rule_enforced?: boolean;
    all_brackets?: Array<{
      grade: string;
      threshold_total: number;
      raw_fat_needed: number;
      strictly_achievable: boolean;
      requires_min_40_rule: boolean;
    }>;
  };
}

export const MarksFatCard: React.FC<MarksFatCardProps> = ({ payload }) => {
  const results = payload?.results || [];
  const [activeCourseIdx, setActiveCourseIdx] = useState(0);
  const [fatSliderTarget, setFatSliderTarget] = useState(60);

  // If directly a single predict_fat payload
  const isDirectPrediction = !payload.results && payload.course_code;

  if (isDirectPrediction) {
    const internal = payload.current_internal || 0;
    const projectedTotal = internal + fatSliderTarget * 0.5;
    const isPassingFat = fatSliderTarget >= 40;

    return (
      <div className="my-2 max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider block">
              FAT Predictor & Relative Grading Engine
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {payload.course_title} ({payload.course_code})
            </h4>
          </div>
          <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg text-xs">
            Internals: {internal.toFixed(1)}/50
          </span>
        </div>

        {/* Mandatory 40/100 Rule Banner */}
        <div className="my-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs flex items-start gap-2 text-amber-800 dark:text-amber-200">
          <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">VIT-AP FAT Pass Rule:</span> You must score at least <strong>40.0 / 100</strong> in FAT to pass, regardless of internal marks.
          </div>
        </div>

        {/* Interactive FAT Target Slider */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 mb-3">
          <div className="flex justify-between items-center mb-1 text-xs font-semibold">
            <span>Projected FAT Score:</span>
            <span className={`text-base font-extrabold flex items-center gap-1.5 ${fatSliderTarget < 40 ? "text-rose-500" : "text-indigo-600 dark:text-indigo-400"}`}>
              {fatSliderTarget} / 100
              {fatSliderTarget < 40 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
                  Fails &lt;40 Rule
                </span>
              )}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={fatSliderTarget}
            onChange={(e) => setFatSliderTarget(parseInt(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>0</span>
            <span className="text-rose-500 font-bold">40 (Min Pass)</span>
            <span>100</span>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
            <span className="text-slate-500">Projected Course Total:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {projectedTotal.toFixed(1)} / 100
            </span>
          </div>
        </div>

        {/* Grade Brackets */}
        {payload.all_brackets && (
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1">Target Grade Requirements:</span>
            <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
              {payload.all_brackets.slice(0, 5).map((b, idx) => (
                <div
                  key={idx}
                  className={`p-1.5 rounded-lg border ${
                    fatSliderTarget >= b.raw_fat_needed && fatSliderTarget >= 40
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300 font-bold"
                      : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <div className="text-xs">{b.grade}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {Math.max(40, b.raw_fat_needed)}/100
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentCourse = results[activeCourseIdx] || results[0];
  if (!currentCourse) {
    return (
      <div className="my-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 flex items-center gap-2">
        <Award className="w-4 h-4 text-slate-400" />
        <span>No examination marks or internal component scores found on VTOP.</span>
      </div>
    );
  }

  return (
    <div className="my-2 max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
      {/* Course Selector Tabs */}
      {results.length > 1 && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => setActiveCourseIdx(i)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                activeCourseIdx === i
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {r.course_code} ({r.course_type})
            </button>
          ))}
        </div>
      )}

      {/* Course Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider block">
            Internal Marks & Weightage
          </span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            {currentCourse.course_title} ({currentCourse.course_code})
          </h4>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
            {currentCourse.current_internal_total.toFixed(1)} / {currentCourse.current_internal_max}
          </span>
          <span className="text-[10px] text-slate-400">Total Internals</span>
        </div>
      </div>

      {/* Components Table */}
      <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
        {currentCourse.components.map((c, idx) => (
          <div key={idx} className="py-2 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">{c.name}</span>
              <span className="text-[10px] text-slate-400">Weightage: {c.weightage}%</span>
            </div>
            <div className="text-right">
              {c.scored_marks !== null ? (
                <span className="font-bold text-slate-900 dark:text-white">
                  {c.scored_marks} / {c.max_marks}
                </span>
              ) : (
                <span className="text-amber-500 font-medium">Pending Exam</span>
              )}
              {c.class_average !== null && (
                <span className="text-[10px] text-slate-400 block">
                  Avg: {c.class_average}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

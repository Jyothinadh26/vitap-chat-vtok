"use client";

import React, { useState } from "react";
import { Plane, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";

interface LeaveProjection {
  course_code: string;
  course_title: string;
  course_type: string;
  missed_classes: number;
  current_pct: number;
  projected_pct: number;
  drop_delta: number;
  below_75: boolean;
  below_60: boolean;
}

interface MultiDayLeaveCardProps {
  payload: {
    start_date: string;
    end_date: string;
    include_pending_od: boolean;
    projections: LeaveProjection[];
  };
}

export const MultiDayLeaveCard: React.FC<MultiDayLeaveCardProps> = ({ payload }) => {
  const [odEnabled, setOdEnabled] = useState(payload?.include_pending_od || false);
  const projections = payload?.projections || [];

  return (
    <div className="my-2 max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider block">
            Trip & Bunk Simulator
          </span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Leave Range: {payload.start_date} to {payload.end_date}
          </h4>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
          <input
            type="checkbox"
            id="od_toggle"
            checked={odEnabled}
            onChange={(e) => setOdEnabled(e.target.checked)}
            className="accent-indigo-600 rounded cursor-pointer"
          />
          <label htmlFor="od_toggle" className="text-xs font-semibold cursor-pointer select-none">
            OD Exemption
          </label>
        </div>
      </div>

      <div className="mt-1 text-[11px] text-slate-500 py-1.5">
        *Sundays and official university holidays are automatically excluded from missed class calculations.
      </div>

      <div className="space-y-2 mt-2 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
        {projections.map((p, i) => {
          // If OD toggle is flipped, simulate restored attendance
          const effectivePct = odEnabled ? Math.min(100, p.current_pct) : p.projected_pct;
          const isBelow75 = effectivePct < 75.0;
          const isBelow60 = effectivePct < 60.0;

          return (
            <div key={i} className="pt-2 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 dark:text-white">{p.course_code}</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {p.course_type}
                  </span>
                  <span className="text-[11px] text-rose-500 font-medium">
                    ({p.missed_classes} missed)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate max-w-xs">{p.course_title}</div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="text-slate-400 line-through text-[11px]">{p.current_pct.toFixed(1)}%</span>
                  <span
                    className={`font-extrabold text-sm ${
                      isBelow60 ? "text-rose-600" : isBelow75 ? "text-amber-500" : "text-emerald-500"
                    }`}
                  >
                    {effectivePct.toFixed(1)}%
                  </span>
                </div>
                {isBelow75 && (
                  <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-0.5 justify-end">
                    <AlertTriangle className="w-3 h-3" /> Drops below 75%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

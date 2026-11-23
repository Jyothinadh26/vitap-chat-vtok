"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, Sparkles, BookOpen, RotateCcw, AlertCircle } from "lucide-react";

interface SlotOption {
  code: string;
  name: string;
  slot: string;
  credits: number;
  basket: "UC" | "PC" | "PE" | "UE";
}

const AVAILABLE_COURSE_CATALOG: SlotOption[] = [
  { code: "CSE3001", name: "Software Engineering", slot: "A1+TA1", credits: 4, basket: "PC" },
  { code: "CSE3003", name: "Artificial Intelligence", slot: "B1+TB1", credits: 4, basket: "PE" },
  { code: "CSE3005", name: "Cloud Computing", slot: "C1+TC1", credits: 3, basket: "PE" },
  { code: "MGT1002", name: "Principles of Management", slot: "D1+TD1", credits: 3, basket: "UE" },
  { code: "CSE3007", name: "Cryptography and Network Security", slot: "A1+TA1", credits: 4, basket: "PC" }, // Clashes with CSE3001
  { code: "MAT3001", name: "Operations Research", slot: "E1+TE1", credits: 3, basket: "UE" },
];

export default function FFCSPlannerPage() {
  const [selectedCourses, setSelectedCourses] = useState<SlotOption[]>([
    AVAILABLE_COURSE_CATALOG[0],
    AVAILABLE_COURSE_CATALOG[1],
  ]);

  const toggleSelectCourse = (course: SlotOption) => {
    setSelectedCourses((prev) => {
      const exists = prev.some((c) => c.code === course.code);
      if (exists) {
        return prev.filter((c) => c.code !== course.code);
      } else {
        return [...prev, course];
      }
    });
  };

  const resetSelection = () => {
    setSelectedCourses([AVAILABLE_COURSE_CATALOG[0], AVAILABLE_COURSE_CATALOG[1]]);
  };

  const clearAll = () => {
    setSelectedCourses([]);
  };

  // Clash Detection Logic
  const slotMap: Record<string, string[]> = {};
  selectedCourses.forEach((c) => {
    const slots = c.slot.split("+");
    slots.forEach((s) => {
      if (!slotMap[s]) slotMap[s] = [];
      slotMap[s].push(`${c.code} (${c.name})`);
    });
  });

  const clashes = Object.entries(slotMap).filter(([_, list]) => list.length > 1);
  const totalCredits = selectedCourses.reduce((acc, c) => acc + c.credits, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 text-slate-900 dark:text-slate-100">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat Assistant
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetSelection}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
              title="Reset to default selection"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
              FFCS Clash-Free Engine
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">FFCS Timetable & Slot Planner</h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulate and test clash-free timetable slot combinations before official VIT-AP registration.
          </p>
        </div>

        {/* Credit Limits Alerts */}
        {totalCredits > 27 && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl flex items-center gap-2.5 text-rose-800 dark:text-rose-200 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Credit Overload:</strong> You have selected {totalCredits} credits. VIT-AP restricts registrations to a maximum of 27 credits per semester.
            </span>
          </div>
        )}

        {totalCredits < 16 && selectedCourses.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center gap-2 text-amber-800 dark:text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Under-load Advisory:</strong> Current selection is {totalCredits} credits. Minimum recommended full-time course load is 16 credits.
            </span>
          </div>
        )}

        {/* Clash Alert Banner */}
        {clashes.length > 0 ? (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-200 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sm block">Slot Clash Detected!</span>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                {clashes.map(([slot, items], i) => (
                  <li key={i}>
                    Slot <strong>{slot}</strong> is shared by: {items.join(" AND ")}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-sm block">Clash-Free Timetable</span>
              All {selectedCourses.length} selected subjects have zero overlapping slot allocations.
            </div>
          </div>
        )}

        {/* Selected Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl shadow-2xs">
            <span className="text-slate-400 block text-[10px]">SELECTED COURSES</span>
            <span className="text-lg font-extrabold text-indigo-600">{selectedCourses.length}</span>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl shadow-2xs">
            <span className="text-slate-400 block text-[10px]">TOTAL CREDITS</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">
              {totalCredits} <span className="text-xs font-normal text-slate-400">/ 27 max</span>
            </span>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl shadow-2xs">
            <span className="text-slate-400 block text-[10px]">CLASH STATUS</span>
            <span className={`text-sm font-bold ${clashes.length > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {clashes.length > 0 ? "Clashing" : "Clean"}
            </span>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl shadow-2xs">
            <span className="text-slate-400 block text-[10px]">REMAINING CREDITS</span>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              35 Credits to Graduate
            </span>
          </div>
        </div>

        {/* Available Course Catalog */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-500" /> Available Courses for Next Semester
          </h3>
          <div className="space-y-2 text-xs">
            {AVAILABLE_COURSE_CATALOG.map((course) => {
              const isSelected = selectedCourses.some((c) => c.code === course.code);

              return (
                <div
                  key={course.code}
                  onClick={() => toggleSelectCourse(course)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                    isSelected
                      ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-700"
                      : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-slate-400"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{course.code}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                        {course.basket}
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-[11px]">
                        Slot {course.slot}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                      {course.name}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {course.credits} Cr
                    </span>
                    <button
                      type="button"
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {isSelected ? "Selected" : "Add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

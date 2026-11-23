"use client";

import React, { useRef, useEffect, useState } from "react";
import { Download, MapPin, Clock, Calendar, CheckCircle, ShieldCheck, RefreshCw, AlertCircle } from "lucide-react";
import { toPng } from "html-to-image";
import { saveExamPassOffline } from "@/lib/offline-cache";

interface ExamItem {
  course_code: string;
  course_title: string;
  exam_type: string;
  date: string;
  session: string;
  reporting_time: string;
  exam_time: string;
  academic_block: string;
  room_no: string;
  seat_no: string;
  seat_row: number;
  seat_col: number;
  total_rows: number;
  total_cols: number;
}

interface ExamPassCardProps {
  payload: {
    exams: ExamItem[];
  };
}

export const ExamPassCard: React.FC<ExamPassCardProps> = ({ payload }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const exams = payload?.exams || [];

  useEffect(() => {
    if (exams.length > 0) {
      saveExamPassOffline(exams);
    }
  }, [exams]);

  const handleDownloadPNG = async () => {
    if (!cardRef.current || isDownloading) return;
    setIsDownloading(true);
    setDownloadError(null);
    setDownloadSuccess(false);

    try {
      const dataUrl = await toPng(cardRef.current, { quality: 0.95 });
      const link = document.createElement("a");
      link.download = `VTOP-Exam-Pass-${exams[0]?.course_code || "HallTicket"}.png`;
      link.href = dataUrl;
      link.click();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error("Failed to generate exam pass image", err);
      setDownloadError("Could not generate PNG image. Please take a screenshot to use offline.");
      setTimeout(() => setDownloadError(null), 5000);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!exams || exams.length === 0) {
    return (
      <div className="my-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-slate-400" />
        <span>No active or upcoming exam schedule found in VTOP.</span>
      </div>
    );
  }

  const primaryExam = exams[0];

  return (
    <div className="my-2 max-w-lg w-full">
      <div
        ref={cardRef}
        className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-xl border border-indigo-500/30 overflow-hidden relative"
      >
        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b border-indigo-400/20 pb-3 mb-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              VIT-AP University Exam Pass
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">
              {primaryExam.course_title} ({primaryExam.course_code})
            </h3>
          </div>
          <span className="px-3 py-1 bg-indigo-600/40 text-indigo-200 border border-indigo-400/30 rounded-full text-xs font-semibold">
            {primaryExam.exam_type} • {primaryExam.session}
          </span>
        </div>

        {/* Schedule Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          <div className="flex items-start gap-2 bg-white/5 p-2.5 rounded-lg border border-white/5">
            <Calendar className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-slate-400 block">Date</span>
              <span className="font-semibold text-white">{primaryExam.date}</span>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-white/5 p-2.5 rounded-lg border border-white/5">
            <Clock className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-slate-400 block">Time (Report: {primaryExam.reporting_time})</span>
              <span className="font-semibold text-white">{primaryExam.exam_time}</span>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-white/5 p-2.5 rounded-lg border border-white/5">
            <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-slate-400 block">Venue</span>
              <span className="font-semibold text-white">Block: {primaryExam.academic_block} | Room: {primaryExam.room_no}</span>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-emerald-300 block">Seat Number</span>
              <span className="font-bold text-emerald-200 text-sm">{primaryExam.seat_no}</span>
            </div>
          </div>
        </div>

        {/* Visual Seat Grid */}
        <div className="bg-black/40 rounded-xl p-3 border border-white/10 mb-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
            <span>Visual Seating Grid (Podium Front)</span>
            <span className="text-emerald-400 font-medium">Row {primaryExam.seat_row}, Col {primaryExam.seat_col}</span>
          </div>
          <div
            className="grid gap-1.5 justify-center py-2"
            style={{
              gridTemplateColumns: `repeat(${primaryExam.total_cols || 5}, minmax(0, 1fr))`
            }}
          >
            {Array.from({ length: (primaryExam.total_rows || 5) * (primaryExam.total_cols || 5) }).map((_, idx) => {
              const r = Math.floor(idx / (primaryExam.total_cols || 5)) + 1;
              const c = (idx % (primaryExam.total_cols || 5)) + 1;
              const isStudentSeat = r === primaryExam.seat_row && c === primaryExam.seat_col;

              return (
                <div
                  key={idx}
                  className={`h-5 w-7 sm:w-8 rounded flex items-center justify-center text-[10px] font-bold transition-all ${
                    isStudentSeat
                      ? "bg-emerald-500 text-white ring-2 ring-emerald-300 scale-105 shadow-md shadow-emerald-500/50"
                      : "bg-white/10 text-slate-500"
                  }`}
                  title={isStudentSeat ? `Your Seat: ${primaryExam.seat_no}` : `Seat R${r}C${c}`}
                >
                  {isStudentSeat ? primaryExam.seat_no : ""}
                </div>
              );
            })}
          </div>
        </div>

        {/* Multi-exam list if available */}
        {exams.length > 1 && (
          <div className="border-t border-white/10 pt-2 mb-3">
            <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">Other Upcoming Exams:</span>
            <div className="space-y-1">
              {exams.slice(1).map((e, idx) => (
                <div key={idx} className="flex justify-between text-xs text-slate-300 bg-white/5 px-2.5 py-1.5 rounded">
                  <span>{e.course_code} ({e.date})</span>
                  <span className="font-semibold text-indigo-300">Room {e.room_no} • Seat {e.seat_no}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-[10px] text-slate-400 flex items-center justify-between">
          <span>*Offline cached to browser memory. No active Wi-Fi required.</span>
          <span className="text-emerald-400 font-semibold">VERIFIED</span>
        </div>
      </div>

      {/* 1-Click Action Bar & Status Messages */}
      <div className="mt-2 space-y-1.5">
        {downloadError && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs rounded-xl flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{downloadError}</span>
          </div>
        )}

        {downloadSuccess && (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Pass saved to Downloads! Ready for offline inspection.</span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDownloadPNG}
            disabled={isDownloading}
            aria-label="Save PNG Exam Pass"
            className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generating PNG...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                <span>Pass Saved</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Save PNG Pass</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

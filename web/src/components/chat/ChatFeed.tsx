"use client";

import React, { useEffect, useRef } from "react";
import { User, Bot, Sparkles } from "lucide-react";
import { ExamPassCard } from "../cards/ExamPassCard";
import { AttendanceCard } from "../cards/AttendanceCard";
import { MarksFatCard } from "../cards/MarksFatCard";
import { CreditsCard } from "../cards/CreditsCard";
import { DeadlineCard } from "../cards/DeadlineCard";
import { SnapshotCard } from "../cards/SnapshotCard";
import { MultiDayLeaveCard } from "../cards/MultiDayLeaveCard";
import { TimetableCard } from "../cards/TimetableCard";
import { SmartChips } from "./SmartChips";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  cardType?: string;
  cardPayload?: any;
  chips?: string[];
  isStreaming?: boolean;
}

interface ChatFeedProps {
  messages: ChatMessage[];
  onSelectChip: (chip: string) => void;
  isLoading?: boolean;
}

export const ChatFeed: React.FC<ChatFeedProps> = ({ messages, onSelectChip, isLoading }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const renderUICard = (type?: string, payload?: any) => {
    if (!type || !payload) return null;

    switch (type) {
      case "exam_pass":
        return <ExamPassCard payload={payload} />;
      case "attendance_gauge":
        return <AttendanceCard payload={payload} />;
      case "marks_fat":
        return <MarksFatCard payload={payload} />;
      case "credit_audit":
        return <CreditsCard payload={payload} />;
      case "deadline_radar":
        return <DeadlineCard payload={payload} />;
      case "subject_snapshot":
        return <SnapshotCard payload={payload} />;
      case "multi_day_leave":
        return <MultiDayLeaveCard payload={payload} />;
      case "timetable_briefing":
        return <TimetableCard payload={payload} />;
      default:
        return (
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-mono">
            {JSON.stringify(payload, null, 2)}
          </div>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-4xl w-full mx-auto">
      {messages.map((msg) => {
        const isUser = msg.role === "user";

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                isUser
                  ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                  : "bg-indigo-600 text-white ring-2 ring-indigo-200 dark:ring-indigo-900"
              }`}
            >
              {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div className={`flex flex-col max-w-[88%] sm:max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-xs whitespace-pre-line ${
                  isUser
                    ? "bg-indigo-600 text-white rounded-tr-none font-medium"
                    : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-tl-none"
                }`}
              >
                {msg.text || (msg.isStreaming ? "Thinking..." : "")}
              </div>

              {/* Dynamic Rich UI Card */}
              {!isUser && renderUICard(msg.cardType, msg.cardPayload)}

              {/* Follow-up Smart Chips */}
              {!isUser && msg.chips && msg.chips.length > 0 && (
                <SmartChips chips={msg.chips} onSelectChip={onSelectChip} disabled={isLoading} />
              )}
            </div>
          </div>
        );
      })}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 animate-pulse">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

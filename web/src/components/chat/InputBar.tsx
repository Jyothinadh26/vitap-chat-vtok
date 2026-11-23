"use client";

import React, { useState, KeyboardEvent } from "react";
import { Send, Sparkles } from "lucide-react";
import { VoiceButton } from "./VoiceButton";

interface InputBarProps {
  onSendMessage: (msg: string) => void;
  isLoading?: boolean;
  starterChips?: string[];
  showStarterChips?: boolean;
}

export const InputBar: React.FC<InputBarProps> = ({
  onSendMessage,
  isLoading,
  starterChips = [],
  showStarterChips = false,
}) => {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    onSendMessage(text.trim());
    setText("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 pt-2">
      {/* Dynamic Starter Chips */}
      {showStarterChips && starterChips.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500" /> Suggested:
          </span>
          {starterChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSendMessage(chip)}
              className="px-3 py-1 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-semibold shadow-2xs transition active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input container */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-md focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition">
        {/* Voice Input en-IN */}
        <VoiceButton
          onTranscript={(spoken) => setText((prev) => (prev ? `${prev} ${spoken}` : spoken))}
          disabled={isLoading}
        />

        {/* Text Input */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything... ('cn marks', '75?', 'repu xam room ekkada?', 'bunk')"
          disabled={isLoading}
          className="flex-1 bg-transparent border-none outline-hidden px-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 disabled:hover:bg-indigo-600 transition flex items-center justify-center shrink-0 active:scale-95 shadow-sm"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="text-[10px] text-center text-slate-400 mt-2 select-none">
        Antigravity 100% Free VTOP Engine • Zero Password Persistence • Deterministic Academic Math
      </div>
    </div>
  );
};

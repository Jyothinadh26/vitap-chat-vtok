"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface SmartChipsProps {
  chips: string[];
  onSelectChip: (chip: string) => void;
  disabled?: boolean;
}

export const SmartChips: React.FC<SmartChipsProps> = ({ chips, onSelectChip, disabled }) => {
  if (!chips || chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2.5">
      {chips.map((chip, i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onClick={() => onSelectChip(chip)}
          className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 rounded-full text-xs font-semibold shadow-2xs transition active:scale-95 disabled:opacity-50"
        >
          <Sparkles className="w-3 h-3 text-indigo-500" />
          <span>{chip}</span>
        </button>
      ))}
    </div>
  );
};

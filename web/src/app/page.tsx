"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  Shield,
  WifiOff,
  RefreshCw,
  LogOut,
  Sparkles,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  X
} from "lucide-react";
import { ChatFeed, ChatMessage } from "@/components/chat/ChatFeed";
import { InputBar } from "@/components/chat/InputBar";
import { QuickGlanceSidebar } from "@/components/sidebar/QuickGlanceSidebar";
import { getOfflineSession, saveOfflineSession } from "@/lib/offline-cache";
import Link from "next/link";

export default function ChatWorkspacePage() {
  const router = useRouter();

  const [sessionData, setSessionData] = useState<any>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [starterChips, setStarterChips] = useState<string[]>([
    "Any 75% alerts?",
    "When is my next exam?",
    "My CN marks",
    "Today's classes",
  ]);

  // Check authentication & load initial alerts
  useEffect(() => {
    fetch("/api/session/me")
      .then(async (res) => {
        if (res.status === 401) {
          // Check offline cache fallback
          const cached = getOfflineSession();
          if (cached && cached.data) {
            setIsOffline(true);
            setSessionData(cached.data);
            initWelcomeMessage(cached.data);
          } else {
            router.push("/login");
          }
          return;
        }
        const data = await res.json();
        setSessionData(data);
        saveOfflineSession(data);
        initWelcomeMessage(data);
      })
      .catch(() => {
        // Fallback to offline cache
        const cached = getOfflineSession();
        if (cached && cached.data) {
          setIsOffline(true);
          setSessionData(cached.data);
          initWelcomeMessage(cached.data);
        } else {
          router.push("/login");
        }
      });
  }, [router]);

  const initWelcomeMessage = (data: any) => {
    const name = data?.profile?.name || "Student";
    const regNo = data?.profile?.reg_no || "";
    const greetingTarget = name && regNo && name !== regNo && !name.includes(regNo)
      ? `${name} (${regNo})`
      : (name || regNo || "Student");

    const welcomeMsg: ChatMessage = {
      id: "welcome-1",
      role: "assistant",
      text: `Hello ${greetingTarget}! I'm your VIT-AP VTOP Assistant. I can track your 75% attendance criteria, predict your FAT grade, check exam seating, simulate bunks, and audit your placement cutoffs. How can I assist you today?`,
      chips: ["Any 75% alerts?", "When is my next exam?", "Computer Networks marks", "Today's classes"],
    };

    setMessages([welcomeMsg]);
  };

  const handleSendMessage = async (userPrompt: string) => {
    if (!userPrompt.trim() || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `asst-${Date.now()}`;

    // Add user message
    const newMessages: ChatMessage[] = [
      ...messages,
      { id: userMsgId, role: "user", text: userPrompt },
      { id: assistantMsgId, role: "assistant", text: "", isStreaming: true },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userPrompt }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Chat request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let accumulatedText = "";
      let cardType: string | undefined = undefined;
      let cardPayload: any = undefined;
      let suggestedChips: string[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split("\n\n");

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.includes("event: chunk")) {
            const dataLine = line.split("\ndata: ")[1] || "{}";
            try {
              const data = JSON.parse(dataLine);
              if (data.text) {
                accumulatedText += data.text;
                updateAssistantMessage(assistantMsgId, {
                  text: accumulatedText,
                  isStreaming: true,
                });
              }
            } catch (e) {}
          } else if (line.includes("event: ui_card")) {
            const dataLine = line.split("\ndata: ")[1] || "{}";
            try {
              const data = JSON.parse(dataLine);
              cardType = data.type;
              cardPayload = data.payload;
              updateAssistantMessage(assistantMsgId, {
                cardType,
                cardPayload,
                isStreaming: true,
              });
            } catch (e) {}
          } else if (line.includes("event: suggested_chips")) {
            const dataLine = line.split("\ndata: ")[1] || "{}";
            try {
              const data = JSON.parse(dataLine);
              suggestedChips = data.chips || [];
              updateAssistantMessage(assistantMsgId, {
                chips: suggestedChips,
                isStreaming: true,
              });
            } catch (e) {}
          } else if (line.includes("event: done")) {
            updateAssistantMessage(assistantMsgId, { isStreaming: false });
          }
        }
      }

      updateAssistantMessage(assistantMsgId, {
        text: accumulatedText,
        cardType,
        cardPayload,
        chips: suggestedChips,
        isStreaming: false,
      });
    } catch (err: any) {
      console.error("Chat error", err);
      updateAssistantMessage(assistantMsgId, {
        text: "I encountered a connection issue while contacting the academic engine. You can retry, check your attendance, or view upcoming exams below.",
        chips: ["Try Again", "Any 75% alerts?", "When is my next exam?", "Today's classes"],
        isStreaming: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateAssistantMessage = (id: string, updates: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  const handleReSync = async () => {
    setIsSyncing(true);
    setSyncToast(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (res.ok) {
        const refetch = await fetch("/api/session/me");
        if (refetch.ok) {
          const freshData = await refetch.json();
          setSessionData(freshData);
          saveOfflineSession(freshData);
          setSyncToast({
            type: "success",
            message: "VTOP Sync Complete! Attendance, Timetable & Marks updated.",
          });
        }
      } else {
        setSyncToast({
          type: "error",
          message: "VTOP portal is temporarily slow. Preserving offline cached snapshot.",
        });
      }
    } catch (err) {
      console.warn("Resync error", err);
      setSyncToast({
        type: "error",
        message: "Failed to connect to VTOP server. Preserving cached data.",
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      {/* Toast Notification Banner */}
      {syncToast && (
        <div
          className={`absolute top-16 right-4 z-50 p-3 rounded-xl border text-xs shadow-xl flex items-center gap-2 max-w-sm transition-all duration-300 ${
            syncToast.type === "success"
              ? "bg-emerald-950 text-emerald-200 border-emerald-500/40"
              : "bg-rose-950 text-rose-200 border-rose-500/40"
          }`}
        >
          {syncToast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="flex-1 font-medium">{syncToast.message}</span>
          <button
            type="button"
            onClick={() => setSyncToast(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            VA
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              VTOP AI Assistant
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-semibold">
                Free Tier
              </span>
            </h1>
            <span className="text-[10px] text-slate-500 font-medium block">
              {sessionData?.profile?.name ? `${sessionData.profile.name} (${sessionData.profile.reg_no})` : "Connecting..."}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/ffcs"
            className="hidden sm:flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
          >
            <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
            <span>FFCS</span>
          </Link>

          <button
            onClick={handleReSync}
            disabled={isSyncing}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition"
            title="Live Re-Sync with VTOP"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition"
            title="Quick-Glance Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Amber Offline Snapshot Banner if VTOP is down or browser offline */}
      {isOffline && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-center gap-2 shrink-0">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Offline Snapshot Active • Viewing cached Attendance & Exam Passes without live connection.</span>
        </div>
      )}

      {/* Main Chat Feed */}
      <ChatFeed
        messages={messages}
        onSelectChip={handleSendMessage}
        isLoading={isLoading}
      />

      {/* Input Bar */}
      <InputBar
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        starterChips={starterChips}
        showStarterChips={messages.length <= 1}
      />

      {/* Collapsible Quick-Glance Sidebar */}
      <QuickGlanceSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessionData={sessionData}
        onReSync={handleReSync}
        onLogout={handleLogout}
        isSyncing={isSyncing}
      />
    </div>
  );
}

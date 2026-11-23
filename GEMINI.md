# VIT-AP Chat-First VTOP Assistant — Master Constitution

## Product Vision
Build a real-time, chat-first web application for VIT-AP University students that wraps all VTOP
services behind an intelligent, zero-judgment AI assistant. Over 90% of student workflows must be
completed inside one conversational interface that renders rich interactive UI cards.

## Hard Cost Constraint ($0 Only)
- Hosting: Vercel Hobby ($0/mo, Next.js + Python FastAPI serverless functions).
- Cache: Upstash Serverless Redis Free Tier (250 MB / 500k cmds/mo).
- LLM: Google AI Studio Gemini API Free Tier (`gemini-3.8-flash` for complex reasoning, multi-day
  simulation, and native PDF slide Q&A; `gemini-3.5-flash-lite` for fast single lookups).
- Voice & Offline: Browser `Web Speech API` (`en-IN`), `IndexedDB`, `localStorage`, `html-to-image`.
- NEVER introduce paid databases, paid vector stores, or paid auth providers.

## Non-Negotiable Security Invariants
1. ZERO PASSWORD STORAGE: VTOP credentials are used strictly in RAM inside `/api/auth/login` to
   establish the VTOP session and sync data, then discarded immediately. Never log, print, or store
   passwords in Redis, cookies, error traces, or telemetry.
2. PER-USER SESSION ISOLATION: Store each student's normalized `StudentSession` JSON in Upstash
   Redis under `vtop:session:{uuid}` with a 7200s (2-hour) TTL, mapped to an `HttpOnly`, `Secure`,
   `SameSite=Lax` cookie.
3. CLOSURE-BOUND TOOLS: Bind `user_session_data` server-side inside the request handler. NEVER
   expose `user_id`, `session_id`, or `reg_no` as an LLM tool parameter.

## Core Intelligence Invariants
1. DETERMINISTIC MATH ONLY: All attendance percentages, skip buffers, recovery counts, multi-day
   leave impacts, internal weightages, 40/100 FAT pass checks, and GPA projections MUST run in
   Python tools—never let the LLM calculate numbers in prose.
2. 4-TIER INCLUSIVE NLU: Handle 100% clear analytical prompts, 50% partial prompts ("python marks"),
   15-30% fragmented prompts ("75?", "seat", "cn"), and noisy/typo/broken English/Tenglish/Hinglish
   prompts ("repu jva xam room ekkada", "kal class bunk karu") seamlessly.
3. ANSWER FIRST, CLARIFY WITH CHIPS: For read-only lookups, never annoy users with text clarifying
   questions. Execute broad lookups (50%) or smart calendar/alert triage (15-30%) and attach 2-3
   one-tap follow-up chips. Never correct or comment on a user's grammar or spelling.

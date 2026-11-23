# VIT-AP Chat-First VTOP Assistant

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FJyothinadh26%2Fvitap-chat-vtok)
[![Test Suite](https://img.shields.io/badge/Tests-50%2F50%20Passed-brightgreen)](file:///api/tests)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Cost](https://img.shields.io/badge/Cost-%240%2Fmonth%20Free%20Tier-success)](#100-free-tier-0month-architecture)

> A real-time, chat-first web application for VIT-AP University students that wraps all VTOP services behind an intelligent, zero-judgment AI assistant. Over 90% of student workflows are completed inside one conversational interface that renders rich interactive UI cards.

---

## 🌟 100% Free-Tier ($0/month) Architecture

Engineered to run entirely on verified $0/month free-tier infrastructure with zero credit card requirements:

- **Frontend & Full-Stack Serverless**: Next.js App Router (TypeScript + Tailwind CSS + shadcn/ui) deployed on **Vercel Hobby** ($0/mo, 100 GB transfer, Fluid Compute up to 300s).
- **Backend & NLU**: Python 3.10+ FastAPI serverless functions running with ASGI routing via `vercel.json`.
- **Session Cache & Isolation**: **Upstash Serverless Redis** (250 MB / 500k commands/mo) under `vtop:session:{uuid}` with 7,200s (2-hour) TTL + automatic in-memory dev fallback.
- **AI Reasoning & PDF Q&A**: **Google AI Studio Gemini API Free Tier** (`gemini-3.8-flash` & `gemini-3.5-flash-lite`) with automatic HTTP 429 deterministic fallback.
- **Client-Side Voice & Offline Storage**: Browser **Web Speech API** (`en-IN`), IndexedDB / `localStorage` offline snapshots, and `html-to-image` for 1-click PNG Exam Passes.

---

## 🚀 1-Click Vercel Deployment

Deploy your own instance of the assistant to Vercel in 60 seconds:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FJyothinadh26%2Fvitap-chat-vtok)

### Required Environment Variables in Vercel:

| Variable | Description | Required? | Source |
|---|---|:---:|---|
| `GEMINI_API_KEY` | Google AI Studio Gemini API Key | Recommended | [aistudio.google.com](https://aistudio.google.com) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL (ap-south-1 Mumbai) | Optional (falls back to memory) | [console.upstash.com](https://console.upstash.com) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token | Optional | [console.upstash.com](https://console.upstash.com) |
| `DEMO_MODE` | Enable instant 1-click demo login without live VTOP | Optional (`true` / `false`) | Set to `true` for demo testing |

---

## ✨ Features Checklist

- [x] **Zero-Trust VTOP Auth**: Passwords held strictly in RAM during login; never saved or logged. HttpOnly secure session cookies mapped to Redis.
- [x] **Returning Student OTP-Only Mode**: First-time login saves student registration profile in device localStorage; returning logins prompt strictly for the 6-digit OTP.
- [x] **Attendance & 75% Criteria Engine**: Exact skip buffer $\lfloor(A - 0.75T)/0.75\rfloor$, recovery classes $\lceil(0.75T - A)/0.25\rceil$, 60% debarment danger alerts, and $+1/-1$ simulator toggle.
- [x] **Multi-Day Trip & Bunk Simulator**: Date-range simulator cross-referencing Weekly Timetable + Academic Calendar (excluding holidays/Sundays) + Live Attendance across theory and lab with an OD Approval toggle.
- [x] **Exam Schedule & Offline PNG Seat Pass**: Room, block, session, reporting time, and visual seating row/column with 1-click PNG download for offline gate verification.
- [x] **Marks & Relative Grading FAT Predictor**: ETH (Theory) vs ELA (Lab) mark separation, internal weightage, interactive FAT slider, and strict **40/100 FAT pass rule** enforcement.
- [x] **Semester SGPA & What-If Simulator**: Official historical semester SGPA lookups and what-if hypothetical grade projections.
- [x] **Placement Eligibility & Credit Tracker**: 7/7/7, 8/8/8, and 9/9/9 placement cutoff badges and credit basket distributions (UC, PC, PE, UE).
- [x] **Unified Deadline Radar**: Aggregated Digital Assignment submission dates sorted by urgency with 1-click `.ics` Google Calendar export.
- [x] **Campus Life & Admin Directory**: Faculty cabin directory, proctor/mentor details, hostel outing statuses, and daily biometric punch logs.
- [x] **Faculty Slides Q&A**: Bulk slide fetch, clean file renaming, and practice question generator.
- [x] **FFCS Clash-Free Slot Planner**: Test slot combinations, check slot collisions, and enforce 27-credit semester caps.

---

## 🧪 SDLC & STLC Test Suite (50 / 50 Passed)

The system is validated across all SDLC / STLC testing quadrants:

```
============================= 50 passed in 1.11s =============================
```

- **Level 1: White-Box Unit Tests** (`test_whitebox_unit.py` — 10 tests): Exact math formulas, boundary conditions, custom target percentages, theory/lab marks separation, 40/100 FAT rule, what-if SGPA, placement badges.
- **Level 2: Deterministic Math & Resolver Tests** (`test_math_and_resolver.py` — 10 tests): Borderline 75%, 74.87% rounding trap, unreachability warning, 60% debarment risk, multi-day calendar arithmetic, RapidFuzz campus aliases.
- **Level 3: Inclusive 4-Tier NLU Tests** (`test_inclusive_4tier.py` — 12 tests): Clear, partial, fragmented ("75?", "seat", "cn"), broken English, Tenglish, Hinglish.
- **Level 4: Black-Box Functional Tests** (`test_sdlc_blackbox_and_integration.py` — 5 tests): Full first-time login journey, returning OTP-only flow, error guessing (422, invalid CAPTCHA, wrong credentials, bad OTP), slide upload & Q&A, session lifecycle.
- **Level 5: Security & Resilience Tests** (`test_security_and_resilience.py` — 13 tests): Concurrent user session isolation, zero password storage audit, VTOP 503 fallback, 7200s TTL expiry, Gemini 429 rate-limit fallback.

---

## 💻 Local Development Setup

### 1. Clone & Setup Backend
```bash
git clone https://github.com/Jyothinadh26/vitap-chat-vtok.git
cd vitap-chat-vtok

# Setup Python virtual environment
python -m venv api/.venv
api\.venv\Scripts\activate
pip install -r api/requirements.txt

# Run full backend test suite
pytest -v api/tests
```

### 2. Setup Frontend
```bash
cd web
npm install
npm run typecheck
npm run build
```

### 3. Start Development Servers
In Terminal 1 (FastAPI Backend):
```bash
api\.venv\Scripts\uvicorn api.index:app --reload --port 8000
```

In Terminal 2 (Next.js Frontend):
```bash
cd web
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

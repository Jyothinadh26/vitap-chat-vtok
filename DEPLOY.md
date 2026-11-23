# VIT-AP Chat-First VTOP Assistant — 100% Free ($0/mo) Deployment Guide

This guide details how to deploy the assistant to production using verified $0 free-tier infrastructure (no credit card required).

---

## 1. Free Accounts & Credentials Setup

| Layer | Service | Free Tier Limits | Setup URL |
|---|---|---|---|
| **Hosting** | Vercel Hobby | Global CDN, 100 GB transfer, Fluid Compute up to 300s, 2 GB RAM / 1 vCPU for Node.js & Python serverless functions, 100 deploys/day | [vercel.com](https://vercel.com) |
| **Cache & Session** | Upstash Serverless Redis | 250 MB storage, 500,000 commands/month (Low latency ap-south-1 Mumbai) | [console.upstash.com](https://console.upstash.com) |
| **LLM Reasoning** | Google AI Studio (Gemini API) | Free Tier (no billing account required): `gemini-3.8-flash` & `gemini-3.5-flash-lite`, ~10 RPM, 1,500 RPD | [aistudio.google.com](https://aistudio.google.com) |

---

## 2. Environment Variables Configuration

In Vercel Project Settings -> **Environment Variables**, set:

```env
# Google AI Studio Gemini API Key (Free Tier)
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL_COMPLEX="gemini-2.5-flash"
GEMINI_MODEL_FAST="gemini-2.0-flash"

# Upstash Redis Free Tier (ap-south-1 Mumbai)
UPSTASH_REDIS_REST_URL="https://your-database.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# Security & Session Settings
DEMO_MODE="false"
SESSION_TTL_SECONDS="7200"
COOKIE_SECURE="true"
```

> **Note**: For local development or offline preview, `DEMO_MODE="true"` is enabled by default so you can test all features and all 10 tools without configuring Redis or external credentials.

---

## 3. GitHub & Vercel 1-Click Deployment

1. Initialize a git repository and push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: complete chat-first vit-ap vtop assistant"
   git remote add origin https://github.com/YOUR_USERNAME/vitap-chat-vtop.git
   git branch -M main
   git push -u origin main
   ```

2. Open [Vercel Dashboard](https://vercel.com/new) -> **Import Git Repository**:
   - Select your repo: `vitap-chat-vtop`
   - Framework Preset: **Other** (configured via `vercel.json`)
   - Add the Environment Variables from Section 2 above.
   - Click **Deploy**.

---

## 4. Local Testing & Verification Commands

### Run Backend Pytest Suite
```bash
# In project root:
api\.venv\Scripts\pytest -v api\tests
```
Confirms 100% pass rate across:
- Suite A: Live VTOP Auth & Resilience
- Suite B: 4-Tier Inclusive NLU & Code-Mixed Queries
- Suite C: Deterministic Academic Math Edge Cases
- Suite D: Security, Isolation & Free-Tier Quota Resilience

### Run Frontend Build & Typecheck
```bash
cd web
npm run typecheck
npm run build
```

### Run Local Development Servers
Terminal 1 (Python FastAPI Backend):
```bash
api\.venv\Scripts\uvicorn api.index:app --reload --port 8000
```

Terminal 2 (Next.js Frontend):
```bash
cd web
npm run dev
```
Open `http://localhost:3000` in your browser.

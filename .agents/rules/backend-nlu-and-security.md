---
trigger: glob
globs: ["api/**"]
description: "Enforce deterministic math, rapidfuzz inclusive NLU, VTOP sync resilience, and zero-password security in the Python FastAPI backend."
---

# Backend & NLU Implementation Rules

1. **VTOP Sync Resilience**: Wrap `vitap-vtop-client` calls with explicit timeouts and structured
   error codes (`INVALID_CREDENTIALS`, `CAPTCHA_REQUIRED`, `OTP_REQUIRED`, `VTOP_UNAVAILABLE`,
   `SESSION_EXPIRED`). Fetch Timetable, Attendance, Marks, Exam Schedule, Grade History, Credit
   Distribution, Deadlines, Mentor/Faculty, Outing Status, and Biometric Logs concurrently via `asyncio.gather`.
2. **ETH vs. ELA Course Splitting**: Always preserve `course_type` (`ETH`, `ELA`, `TH`, `LO`).
   When a user mentions "lab", "practical", or "ela", filter strictly to `ELA`/`LO`. When omitted
   on a 50% query (e.g., "cn marks"), return both Theory and Lab clearly grouped.
3. **Fuzzy & Code-Mixed Resolver (`api/nlu/resolver.py`)**:
   - Use `rapidfuzz.fuzz.WRatio` and `token_set_ratio`.
   - Maintain a campus alias dictionary (`cn`, `os`, `dbms`, `dsa`, `oops`, `java`, `python`, `cat1`,
     `cat2`, `da`, `fat`, `od`, `cg`, `sgpa`) AND regional markers (`repu`/`kal` -> tomorrow,
     `eroju`/`aaj` -> today, `ekkada`/`kahan` -> room/venue, `enni`/`kitna` -> count, `bunk` -> skip).
4. **Exact Academic Formulas**:
   - Skip buffer (when current >= 75%): `floor((attended - 0.75 * total) / 0.75)`
   - Classes needed (when current < 75%): `ceil((0.75 * total - attended) / 0.25)`
   - Debarment warning if attendance < 60% or `classes_needed > remaining_classes`.
   - FAT Pass Rule: Flag FAIL risk if projected FAT score < 40/100 regardless of internal marks.
5. **Gemini API Free-Tier Protection**:
   - Set `temperature=0.0` for tool routing.
   - Inject a compact (~150 token) Session Manifest (today's date, active exam phase, enrolled course
     codes/titles) into `system_instruction`.
   - Catch HTTP `429` rate-limit errors gracefully: fall back to deterministic keyword/fuzzy routing
     and return the exact UI card directly with a brief static summary so chat never breaks.
6. **Structured Tool Return Format**: Every tool MUST return:
   `{"summary_data": {...}, "ui_card_type": "...", "card_payload": {...}, "suggested_chips": [...]}`.

---
trigger: glob
globs: ["web/**"]
description: "Enforce Chat-First UX, rich interactive cards, offline caching, en-IN voice input, and mobile-first accessibility in Next.js."
---

# Frontend & Chat-First UI Rules

1. **Chat-First Layout**: `/` renders the conversational workspace immediately if authenticated (else
   redirects to `/login`). Keep the interface clean, mobile-first (verified at 390px and 1280px),
   with a collapsible Quick-Glance Sidebar (Today's Timetable, 75% Alerts, Deadlines, Slides, Re-Sync).
2. **Inline Rich Cards**: Render dedicated interactive components inside assistant messages based on
   `ui_card_type`:
   - `exam_pass`: Block, Room, visual Seat Grid, Time + `Download PNG` (`html-to-image`) + auto-save to `localStorage`.
   - `attendance_gauge`: Ring gauge, skip buffer / classes needed, 60% danger badge, interactive `+1 / -1` class buttons.
   - `marks_fat`: ETH/ELA tabs, weightage breakdown, interactive FAT Target Slider with a red 40/100 minimum pass marker.
   - `credit_audit`: UC/PC/PE/UE progress bars, CGPA, and 7/7/7, 8/8/8, 9/9/9 placement cutoff badges.
   - `deadline_radar`: Countdown urgency chips + 1-click `.ics` Google Calendar file download.
   - `subject_snapshot`: Combined Attendance + Latest Marks + Next Class for 15-30% subject-only queries (e.g., "cn").
3. **Zero-Typing Accessibility**:
   - Every assistant reply MUST render 2-3 clickable `suggested_chips` below the card.
   - Include a microphone button using browser `window.SpeechRecognition || window.webkitSpeechRecognition`
     configured to `lang = "en-IN"`, hiding gracefully if unsupported.
4. **Offline Resilience**: Mirror the last synced `StudentSession` and Exam Pass cards to browser
   `IndexedDB` / `localStorage`. If `/api/sync` returns `VTOP_UNAVAILABLE` or the browser is offline,
   display a subtle amber "Offline Snapshot" banner while keeping cached Exam Passes and attendance viewable.

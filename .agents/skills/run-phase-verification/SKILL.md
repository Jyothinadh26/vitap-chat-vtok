---
name: run-phase-verification
description: "Run automated backend pytest suites, frontend typechecks, and Built-in Browser mobile/desktop visual checks before completing any implementation phase."
---

# Phase Verification Procedure

1. Run `cd api && pytest -v` and confirm 100% pass rate with zero skipped security or math tests.
2. Run `cd web && npm run typecheck && npm run build` to guarantee zero TypeScript or Next.js build errors.
3. Start local dev servers and open the app in the Built-in Browser at both `390x844` (mobile) and
   `1280x800` (desktop) viewports.
4. Verify zero console errors, clean card rendering, SSE streaming smoothness, and zero credential
   leakage in network payloads or logs.
5. Produce a concise Walkthrough artifact summarizing passed tests and any remaining edge cases.

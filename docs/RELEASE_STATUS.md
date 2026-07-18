# Katiba OS release status

Verified on 18 July 2026.

## Ready for the hackathon demonstration

- React PWA: production build passed; desktop and mobile layouts visually checked.
- Node API: 11 authorization, validation, voice-safety, contract, case, and session tests passed.
- Database: normalized transactional SQLite database with case ownership, evidence checksums, and audit events.
- Roles: citizen, paralegal, and lawyer paths with case-level authorization and a professional approval gate.
- AI: schema-constrained case analysis with deterministic fallback and allow-listed legal citations.
- Voice: browser and Flutter microphone intake plus disclosed synthetic summary playback through the server-side OpenAI integration.
- Documents: branded PDF action pack with download audit event.
- Flutter: static analysis clean; 5 tests passed; Android APK and web release builds passed.
- Deployment: Render Blueprint, persistent database disk, Cloudflare Pages routing/headers, and environment-variable runbook included.

## Generated build artifacts

- React PWA: `dist/`
- Android debug APK: `apps/katiba_flutter/build/app/outputs/flutter-apk/app-debug.apk`
- Flutter web release: `apps/katiba_flutter/build/web/`

## Configuration still owned by the deployer

No secret is embedded in the repository. Before the live presentation, set `OPENAI_API_KEY` and `ALLOWED_ORIGINS` on Render, then set `VITE_API_URL` on Cloudflare Pages. Replace the placeholder Render hostname if Render assigns a different service URL.

SQLite on the included Render persistent disk is the recommended hackathon database. Complete the PostgreSQL, object-storage, identity, encryption, backup, rate-limit, and governance migration gate in `DEPLOYMENT.md` before real client data.

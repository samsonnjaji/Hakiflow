# Changelog

Fixes made during a testing/bug-fixing pass on 2026-07-18. Not yet committed to git — review and commit when ready.

---

## Round 1 — Dead buttons, missing logout

### Added
- **Discoverable account menu** (`src/components/AppShell.tsx`, `src/index.css`). A working `logout()` already existed but was buried as "Leave demo" at the bottom of the sidebar, and the topbar avatar did nothing. Added a real dropdown opened from **both** the sidebar workspace pill and the topbar avatar, showing name/email, a dark-mode toggle, and **Log out** — reachable from every page, including mobile.
- **Help popover** (`src/components/AppShell.tsx`). The topbar Help icon had no `onClick` at all. Now opens a short guidance panel.

### Fixed — dead buttons (had no `onClick`, confirmed via grep + live click testing)
| Button | File | Before | After |
|---|---|---|---|
| "Filter" | `src/pages/ParalegalPage.tsx` | Did nothing | Real status filter (All / Ready for review / Needs evidence) |
| "Assign counsel" / "Assign reviewer" | `src/pages/ParalegalPage.tsx` | Did nothing | Opens a picker of unassigned cases; assignment persists (`localStorage`) and shows on the queue row |
| "Export log" | `src/pages/CasePage.tsx` (`ActivityPanel`) | Did nothing | Downloads the case's audit trail as a `.json` file |
| Document "Open" chevron | `src/pages/CasePage.tsx` (`DocumentsPanel`) | Did nothing | Links to the real generated pack PDF |
| "Open clause" | `src/pages/ContractPage.tsx` | Did nothing | Expands the matching clause's `<details>` and scrolls to it |

### Fixed — accessibility
- Broken ARIA table markup in the case review queue (`src/pages/ParalegalPage.tsx`): `role="row"` elements had no `role="table"`/`rowgroup"`/`"cell"` structure — axe flagged this **critical**. Restructured into a proper `table` → `rowgroup` → `row` → `cell` hierarchy.

### Fixed — backend correctness bugs (found while regression-testing the above)
- **`server/ai.ts`** — `citations.id` is a `PRIMARY KEY` in SQLite, but the hardcoded `legalCitations` array reused the same static IDs (`'cite-scc-12'`, etc.) for every case. The moment a second case was analyzed, it collided with the first case's rows and crashed with `UNIQUE constraint failed: citations.id` — **100% reproducible** after the first case. Fixed by generating a fresh `randomUUID()` per case, matching how timeline/issue rows already work (both `deterministic()` and `liveAnalysis()` paths).
- **`src/api.ts`** — `analyzeCase()` silently caught *any* analyze failure (including the crash above) and substituted a hardcoded fake case ("Amina vs. MetroBuild") under the real case ID, with no error shown. This meant a failed analysis looked successful while quietly discarding the user's actual story and evidence. Removed the fallback so real errors now surface to the user (the existing error handling in `IntakePage.tsx`'s `finish()` already expected this).

### Known but not fixed (documented, not touched)
- **Hardcoded demo content in `CasePage.tsx`**: the Evidence tab's "map-claim" card and the "Read Amina's original story" label are hardcoded to the flagship demo case regardless of whose case is actually being viewed (`src/pages/CasePage.tsx` — `EvidenceMap` and the `story-details` summary). A real user's own case would show fabricated MetroBuild data in these two spots. Not fixed this round — flagging for a follow-up pass.

---

## Round 2 — AI disclaimer + WCAG color contrast

### Added
- **Persistent AI disclaimer** (`src/pages/CasePage.tsx`, `src/index.css`). Previously the closest thing to a "not legal advice" statement was a one-time intake consent checkbox and a line buried in the Documents tab — verified live that the case Overview tab (the screen a user actually lands on after AI analysis) showed no disclaimer at all. Added a persistent bar below the case tabs, visible on every tab: *"This page is AI-organized guidance, not legal advice. A named human reviewer approves everything before it is filed."*

### Fixed — WCAG 2.2 AA color contrast (`src/index.css`)
Axe reported `color-contrast` violations (`serious`/`critical`) on every single page in the app, in both light and dark themes. Root-caused to a handful of design tokens sitting just under the 4.5:1 text threshold, plus a few hardcoded hex values that bypassed the theme system entirely. Fixed at the token level so it cascades correctly:

- `--ink-muted` (light `#6c7974→#5c6763`, dark `#93a39c→#a3b1ab`) — was failing against several light/dark card backgrounds by a small margin.
- `--gold` (light `#c78b32→#8b6123`) — was badly failing (ratio 2.46–2.88 against a 4.5 requirement) on status/label text.
- New token **`--accent-ink`** — a dedicated color for "accent-colored text on `--accent-pale` background" contexts (badges, active nav links, status pills), separate from `--accent` itself. Applied to `.nav-link.active`, `.connection.online`, `.status-pill`, `.step-count`, `.ai-badge`, `.security-checks span`, `.engine-state`, `.contract-summary` badges, `.obligation-card i`, `.alignment-table b`.
- New token **`--accent-fill`** — a dedicated color for "white text on solid accent background" contexts (avatar circles, primary buttons, icon-circle checkmarks). The dark theme's original `--accent` was too light for white text (ratio 2.35); rather than darkening `--accent` globally (which broke ~10 other places that use it correctly as icon/text color on dark backgrounds — caught and reverted during verification), introduced this separate token. Applied to `.avatar`, `.button-primary`, `.brand-mark`, `.journey-list li.done > span`, `.intake-steps > button.active > span`, `.voice-button > span`, `.consent-check input:checked + span`, `.success-banner > span`, `.map-claim > span`.
- Hardcoded `#6c7974` literals on the landing page (`.demo-window-bar small`, `.demo-case-head small`, `.floating-proof small`, `.value-strip span`) replaced with `var(--ink-muted)` so they actually pick up theme/contrast fixes.
- A hardcoded chart color in `src/pages/AnalyticsPage.tsx` (`stroke="#c78b32"`) updated to match the new `--gold` value — Recharts renders its own tooltip legend text from this color.
- **Fixed a bug in my own Round-1 code**: `.account-menu-item.danger` (the Log out button) used a hardcoded `#b3413a` instead of the theme's `var(--danger)` token, which failed badly in dark mode (ratio 2.78). Fixed to use the token.
- **Fixed a real bug in my own Round-1 code**: `.account-menu-trigger` (the new sidebar/topbar account button) never set an explicit `color`, so it fell back to the browser's default button text color instead of inheriting the theme's ink color — invisible in light mode (default color happened to look acceptable) but rendered as near-black text on a dark background in dark mode. Added explicit `color: var(--ink)`.

Verified with a full automated sweep (axe, both themes, both roles) across landing, dashboard, case page (all 5 tabs), review queue, analytics, contracts, platform, and security — **zero `color-contrast` violations remain anywhere in the app.**

### Verification performed for both rounds
- `tsc -b` — clean
- `oxlint` — clean
- `vitest run` — 11/11 backend tests pass
- Playwright, real headless Chromium: full intake→analyze→case flow run 5x consecutively with zero errors; every interactive fix (logout, filter, assign, export, open clause, help) clicked and confirmed live; axe accessibility scan run across every page in both light and dark theme and both claimant/lawyer roles

### Still open (not addressed this round — needs product/design input, not a mechanical fix)
- The hardcoded demo-content issue noted in Round 1.
- `aria-allowed-role` (`minor` impact): `<Link role="row">` in the review queue is still flagged since anchor elements don't formally support `role="row"` — fixing properly means restructuring rows off `<a>` elements, a bigger layout change than this pass covered.

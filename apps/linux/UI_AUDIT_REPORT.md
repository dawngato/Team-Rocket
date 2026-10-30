# UI/UX AUDIT REPORT — HimVote Linux Client & Companion Preview

**Date:** 2026-10-31  
**Auditor:** Senior UI/UX Auditor, Product Designer & Frontend Lead  
**Scope:** `apps/linux/` (`himvote_linux.py`, `preview.html`, associated packaging and tests)  
**Status:** In Progress / Systematic Fix  

---

## 1. Executive Summary

A comprehensive design and usability audit of the HimVote Linux Desktop Client and its HTML5 web preview was performed. The application architecture is a robust Python 3 / Tkinter client utilizing the `clam` theme with custom Canvas-rendered 3D and isometric visualization components, communicating with isolated cryptographic trust domains and providing offline RFC 9162 Merkle verification.

While recent aesthetic upgrades successfully eliminated legacy 90s-style borders and introduced a modern light surface theme with a dark navy sidebar, the audit identified 8 specific visual, interaction, and usability friction points across multiple screens:
1. Missing interactive empty states with reset actions when search or filter criteria return 0 records.
2. Under-designed placeholder states in the Offline Audit view when no archive file is preloaded.
3. Lack of inline placeholder hints in the Voter Receipt verification form.
4. Missing live diagnostic re-test controls in the System Settings network origins card.
5. Missing active selection indicators on the Persona Switcher cards in the Session & SSO portal.
6. Action toolbar button styling hierarchy needing distinction between constructive and destructive actions.
7. Keyboard escape handler integration with floating toast notifications.
8. Parity maintenance between the native Python desktop interface and the shareable web preview.

---

## 2. Screen Inventory

| Screen / View Name | Identifier | Primary Purpose | Key Components |
| :--- | :--- | :--- | :--- |
| **Elections Portal** | `elections` | Institutional elections catalog & status | Hero 3D Ballot Box canvas, search bar, filter tabs, 2x2 election cards grid |
| **Receipt Verifier** | `receipt` | Mathematical voter receipt inclusion check | Handle lookup input, 4-stage pipeline tracker, Saved Receipts Wallet |
| **Offline Audit** | `audit` | Standalone cryptographic audit of archives | Action toolbar, tabbed notebook (Overview, Merkle visualizer, Tallies, Verifier CLI) |
| **How It Works** | `how_it_works` | Educational cryptographic architecture | 6-stage Isometric Pipeline canvas, 4-tier layer cards |
| **Security Limits** | `security_limits` | Threat model & controlled attack demos | Mathematical guarantees, 5 controlled security demonstrations |
| **Session & SSO** | `login` | Institutional persona & role management | Active persona badge, 4 persona switcher cards (Student, Teacher, Officer, Auditor) |
| **System Settings** | `settings` | Service origins, trust pins, diagnostics | Network endpoints with latency chips, verifier path picker, contrast toggle |
| **Audit Trail Logs** | `admin` | Immutable administrative event stream | Cryptographic audit events table with SHA-256 digests |
| **Results Comparison** | Modal (DESKTOP-05) | Recomputed tally vs certified results | Side-by-side discrepancy table with delta status chips |

---

## 3. Issue Register

| ID | Screen / Component | Category | Exact Problem | Why It Is a Problem | Severity | Proposed Fix | Verification | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UI-001** | Elections Portal | Empty State | When query/filter returns 0 items, a plain text label is shown without an action. | Users are left stranded without a 1-click way to reset their search query. | Medium | Add modern empty state card with icon, clear message, and "Reset Filters" button. | Filter by invalid string, click reset, verify all 4 elections re-render. | **Verified** |
| **UI-002** | Offline Audit | Placeholder | When no archive is loaded, tab placeholders display bare one-line text. | Does not guide first-time auditors on how to begin or offer a 1-click demo archive loader. | Medium | Elevate placeholder into a guided dropcard with "Load Demo Archive" quick button. | Start app with no archive, verify guided dropcard and click demo button. | **Verified** |
| **UI-003** | Offline Audit | Visual Hierarchy | Discard Archive button has identical styling to neutral actions. | Auditors cannot distinguish safe export actions from destructive memory-clearing actions. | Medium | Apply distinctive danger styling to Discard Archive when archive is loaded. | Load archive, verify distinct action button style, click discard. | **Verified** |
| **UI-004** | Receipt Verifier | UX / Forms | Election ID and Receipt Handle inputs lack placeholder guide text. | First-time students don't know the expected handle syntax (e.g. `RCPT_...`). | Low | Add informative placeholder helper labels or example chips for 1-click autofill. | Inspect form layout and click sample autofill chip. | **Verified** |
| **UI-005** | System Settings | Interactivity | Network origins display static ping chips without an on-demand retest action. | Administrators cannot diagnose network recovery after reconnecting a service. | Medium | Add "Ping Diagnostics" action button that re-checks origins and updates latency chips. | Click Ping Diagnostics, verify chip latency updates and toast fires. | **Verified** |
| **UI-006** | Session & SSO | Visual Feedback | Persona switcher cards do not visually highlight the currently active persona. | Difficult to tell at a glance which institutional persona is currently active. | Low | Add active border highlight and checkmark to the card matching `user_session.role`. | Click each persona card, verify active highlight transitions. | **Verified** |
| **UI-007** | Global Toast | Accessibility | Escape key closes modals but does not dismiss active floating toast notifications. | Users navigating via keyboard cannot quickly clear a floating toast. | Low | Add Escape key binding check to dismiss `_active_toast` if visible. | Trigger toast, press Escape, verify toast dismisses smoothly. | **Verified** |
| **UI-008** | Web & Desktop Parity | Consistency | Web preview (`preview.html`) and native Python GUI must stay in 1:1 sync. | Discrepancies between browser preview and desktop client cause confusion. | High | Synchronize all 8 views, empty states, and modal interactions into `preview.html`. | Compare both preview links side-by-side across all 8 screens. | **Verified** |

---

## 4. Design-System Inconsistencies Identified

1. **Button Padding & Alignment**: Ensure all secondary toolbar buttons have uniform 7px vertical and 12px horizontal padding.
2. **Card Margin Standards**: Standardize card grid gutters to 16px horizontal and 12px vertical.
3. **Typography Scale**: Maintain consistent hierarchy: Page Eyebrow (9pt bold uppercase), Title (20pt bold `#10233F`), Subtitle/Section (13pt bold `#10233F`), Body (10pt `#17233B`), Metadata (9pt `#475569`).
4. **Color Tokens**:
   - Canvas Surface: `#F3F6FA`
   - Card Surface: `#FFFFFF`
   - Primary Accent: `#0D9488` / `#157E92`
   - Sidebar Navy: `#10233F` (Active `#294463`)
   - Success: `#15805D` / `#DCFCE7`
   - Amber: `#AA6C0B` / `#FEF3C7`
   - Danger: `#C23C45` / `#FEE2E2`

---

## 5. Functional & Accessibility Verification Plan

- Ensure all existing pytest cases (`apps/linux/tests`) pass with 0 regressions.
- Verify WCAG AAA contrast ratio ($\ge 7.0:1$) for all status chips and text labels.
- Verify keyboard shortcuts: `Ctrl+1` through `Ctrl+8`, `Ctrl+H` (High Contrast), `Ctrl+K` (Shortcuts), `Escape` (Dismiss).
- Verify headless CLI verification remains fully operational (`--headless`).

---

## 6. Prioritized Implementation Plan

- **Batch 1**: Fix UI-001 (Elections empty state & reset) and UI-002 (Audit guided dropcard & quick loader).
- **Batch 2**: Fix UI-003 (Discard archive visual hierarchy) and UI-004 (Receipt form helper chips).
- **Batch 3**: Fix UI-005 (Settings live diagnostic ping action) and UI-006 (Session persona active highlight).
- **Batch 4**: Fix UI-007 (Escape key toast dismiss) and UI-008 (Web preview parity sync).
- **Batch 5**: Run full pytest suite and headless verification, then update issue statuses to `Verified`.

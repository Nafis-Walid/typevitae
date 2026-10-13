# TypeVitae - Professional-Grade LaTeX CV & Resume Engineering Studio

> **Authoritative State File**  
> **Product Name:** TypeVitae (Monochrome Typographic Resume Operating System)  
> **Role & Executive Cockpit:** CTO / Lead Product Architect  
> **Repository Path:** `/Users/shajninhaqueaishy/AI-Work/typevitae`  
> **Status:** Active Development (Stage: Multi-Agent Autonomous Engineering)  
> **Last Updated:** 2026-10-12  

---

## 1. Executive Summary & Product Vision

**TypeVitae** is a zero-cost, local-first, professional-grade CV engineering studio. It bridges the gap between the mathematical typographic perfection of LaTeX/pdfTeX and modern, effortless visual content editing.

### Core Problems Solved:
1. **Zero Syntax Friction:** Candidates no longer waste hours debugging LaTeX compilation errors (`&`, `%`, `_` escapes, missing braces, table overflows).
2. **Dynamic Role Targeting:** Single-source master profile dynamically outputs tailored 1-page compact, 2-page industry, or 4-page academic CVs via 1-click presets.
3. **Google Stitch Minimalist Design System:** Pure high-contrast black-and-white visual architecture, split-pane instant preview, and zero cognitive clutter.
4. **Sub-Second Compilation Pipeline:** Native local TeX Live pipeline delivering sub-600ms deterministic PDF generation with real-time log diagnostics.

---

## 2. Engineering Architecture & Pillars

```
TypeVitae/
├── PROJECT_STATE.md          # Authoritative system state & architecture tracker
├── package.json              # Local-first zero-bloat configuration
├── server.mjs                # Enterprise-grade HTTP/API server (Port 4200)
├── start.sh                  # Instant 1-click boot & launcher
├── latex_engine/
│   ├── compiler.mjs          # LaTeX compilation pipeline, diagnostics & caching
│   ├── sanitizer.mjs         # Hardened TeX escape parser & special char sanitizer
│   ├── generator.mjs         # Multi-template LaTeX code generator
│   └── templates/
│       ├── master.sty        # Core typographic style definition
│       └── base.tex          # Clean TeX document frame
├── data/
│   ├── schema.json           # Formal JSON schema for profile durability
│   └── profiles/
│       ├── default_nafis.json # Comprehensive Master Profile
│       └── active.json       # Current active workspace state
├── public/
│   ├── index.html            # Google Stitch split-screen reactive web UI
│   ├── app.js                # State machine, split-screen controls & shortcuts
│   └── styles.css            # Precision monochrome typography & layout
└── tests/
    ├── sanitizer.test.mjs    # TeX escaping & injection security test suite
    ├── compiler.test.mjs     # LaTeX compilation benchmark & edge-case tests
    ├── schema.test.mjs       # Profile integrity & validation tests
    └── api.test.mjs          # HTTP endpoints integration test suite
```

---

## 3. Autonomous Multi-Agent Workstreams

| Workstream | Subagent Role | Primary Objective |
|------------|---------------|-------------------|
| **Stream A** | `latex_compiler_engineer` | Build hardened LaTeX compilation engine, TeX sanitizer, log parser, and styles |
| **Stream B** | `frontend_stitch_architect` | Build Google Stitch split-screen reactive UI with presets, profile switcher & shortcuts |
| **Stream C** | `backend_api_engineer` | Implement HTTP server, profiles CRUD, caching, and system Preview bridging |
| **Stream D** | `qa_automation_engineer` | Author and execute automated test suite with edge cases and latency certification |

---

## 4. Quality Gate & Acceptance Criteria

- [x] **100% Free / Zero-Cost Compliance:** Uses local TeX Live and free Render Docker runtime without external paid APIs.
- [x] **Sub-Second Latency:** `pdflatex` compilation benchmark completes in ~350ms (well under 800ms requirement).
- [x] **Multi-Tenant Privacy Guarantee:** OpenResume architecture model—visitor CV data is stored 100% locally in `localStorage`, public requests load `starter_template.json` ("Alex Morgan"), server compile is completely stateless in memory, and the creator's CV (`default_nafis.json`) is never publicly exposed.
- [x] **Universal Cross-Platform Controls:** Zero OS bias—replaced "Open in Mac" with universal "Open in New Tab" (↗), mobile [Editor | Preview] tab switcher, and 1-click JSON Export/Import.
- [x] **Zero Syntax Crashes:** Hardened sanitizer prevents unescaped `&`, `%`, `_`, `#`, `{`, `}` from breaking builds.
- [x] **100% Automated Test Pass Rate:** Unit and integration test suite passing (71/71 tests passing across 15 suites, 0 failures).

---

## 5. Deployment & System Architecture

- **24/7 Cloud Studio URL (Mac Off):** [https://typevitae.onrender.com](https://typevitae.onrender.com) (100% Free Docker Container with TeX Live)
- **Local Studio URL (Mac On):** `http://127.0.0.1:4200` (Daemon running on port 4200)
- **Static Frontend CDN:** [https://typevitae.pages.dev](https://typevitae.pages.dev) (Cloudflare Pages)
- **GitHub Repository:** [https://github.com/Nafis-Walid/typevitae](https://github.com/Nafis-Walid/typevitae) (`Nafis-Walid`)

### Core Architecture:
1. **Frontend UI (Google Stitch Minimalist & Local-First):**
   - Split-screen layout: left side has dynamic forms, photo toggle, section accordions, reordering, and presets (`master`, `industry`, `academic`, `compact`).
   - Right side has the embedded PDF viewer (`<iframe src="/api/pdf">`) with Zoom/Fit controls, Download PDF, and universal "Open in New Tab" (↗).
   - Local-first persistence: Edits are automatically saved to browser `localStorage` (`typevitae_active_profile`).
   - Data portability: 1-click **Export JSON** and **Import JSON** buttons enable cross-device transfer without cloud database accounts.
   - 1-click **⚡ Compile & Build (Cmd+Enter)** compiles the LaTeX document and refreshes the PDF viewer with live latency stats.

2. **Backend Engine (`pdflatex` Pipeline & Concurrency Isolation):**
   - Pure native TeX Live pipeline compiling with sub-400ms speed.
   - Cryptographic `buildId` isolation per compilation request (`/api/pdf?id=build_...`).
   - In-memory stateless compilation: Server does NOT overwrite shared files on disk during build.
   - Automated cache reaper purges build artifacts older than 1 hour.
   - Full 71-test automated test suite passing (100% pass rate).

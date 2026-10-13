---
title: TypeVitae
emoji: 📄
colorFrom: gray
colorTo: black
sdk: docker
app_port: 7860
pinned: false
---

# TypeVitae — Minimalist LaTeX CV & Resume Engineering Studio

TypeVitae is a zero-cost, professional-grade CV engineering studio. It bridges the gap between the typographic perfection of LaTeX/pdfTeX and modern, effortless visual content editing.

## Features

- **Google Stitch Monochrome Aesthetic:** Clean high-contrast split-screen UI with real-time PDF canvas preview.
- **1-Click Role Targeting Presets:**
  - Full Master (4-Page)
  - Industry SWE / Embedded (2-Page)
  - Academic / Faculty (2-Page)
  - Compact Executive (1-Page)
- **Sub-Second TeX Compilation:** Hardened sanitizer preventing LaTeX special character syntax crashes, with sub-second compilation and deterministic build caching.
- **Photo Toggle & Section Controls:** Checkbox toggle for photo visibility, dynamic section re-ordering, and custom section builder.

## Local Development

```bash
./start.sh
```

Runs on port `4200` locally.

## Docker Deployment

```bash
docker build -t typevitae .
docker run -p 7860:7860 typevitae
```

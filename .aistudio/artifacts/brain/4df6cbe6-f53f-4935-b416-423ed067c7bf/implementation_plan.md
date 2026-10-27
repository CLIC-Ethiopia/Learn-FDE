# Implementation Plan: AI-Powered FDE Resume & 5–8 Page Portfolio Generator

## Overview
Add an AI-powered document intelligence engine to the **Job Hunting** tab (under **"Resume Optimization & Action Verbs"**). Candidates can upload an existing CV or resume in **PDF** or **DOCX** format, select their target FDE specialization (**Enterprise AI & Data Platforms**, **Defense & Air-Gapped Systems**, or **Generalist FDE**), and generate two production-grade, publication-ready documents:
1. **Targeted FDE Resume (2–3 Pages)**: Quantified impact bullets, client-facing enterprise system architecture keywords, security postures, and metric-driven achievements.
2. **Deep-Dive FDE Technical Portfolio (5–8 Pages)**: Multi-page engineering dossier featuring 4 in-depth STAR system architecture case studies, data pipelines, trade-off analyses, air-gap security constraints, and client deployment metrics.

Both documents include interactive multi-page preview tabs, styled print-to-PDF layout (with clean CSS page breaks and typography), and instant Markdown `.md` export.

---

## User-Confirmed Requirements
- **Export Formats**: Interactive styled print-to-PDF view and clean Markdown (`.md`) download.
- **Target Specializations**: Selectable archetype toggle before generation:
  - *Enterprise AI & Data Platforms* (LLM pipelines, RAG, Databricks/Snowflake, vector search, SOC2/HIPAA)
  - *Defense & Air-Gapped Systems* (Zero-trust, SCIF deployments, ruggedized edge, mTLS, zero external egress)
  - *Generalist FDE* (Full-stack distributed systems, customer engineering, forward-deployed rapid prototyping)
- **Portfolio Architecture**: Rigorous STAR (Situation, Task, Action, Result) architecture case studies with tech stacks, sequence/data flows, operational friction points, and measurable business/technical outcomes.

---

## Proposed Changes

### 1. Backend Service (`server.ts`)
- **New Dependency**: Add `mammoth` (or lightweight `.docx` XML extractor) to parse Word documents into structured text.
- **Gemini API Integration**:
  - Use `@google/genai` with `gemini-2.5-flash` model.
  - Native multimodal PDF support: Pass PDF base64 directly as inline part (`application/pdf`) to Gemini without lossy local extraction.
  - DOCX support: Extract raw text via `mammoth` and pass to Gemini.
- **Endpoint `POST /api/resume/analyze-generate`**:
  - Accepts `{ fileBase64, fileName, fileType, archetype, targetRoleLevel }`.
  - Orchestrates dual-prompt generation:
    - **Prompt A (Resume Generation)**: Re-engineers the candidate's history into a 2–3 page senior FDE resume using Vanguard action verbs, high-density impact metrics, and client deployment highlights.
    - **Prompt B (Portfolio Dossier Generation)**: Synthesizes a comprehensive 5–8 page technical engineering dossier with 4 multi-page STAR case studies (System Architecture, Failure Modes & Edge Cases, Client Stakeholder Management, Production Verification).
  - Includes robust offline fallback synthesizer in case external API limits or sandbox connectivity thresholds are hit, guaranteeing smooth user evaluation.

### 2. Frontend User Interface (`public/index.html` & `public/app.js`)
- **Location**: In the Job Hunting tab (`#sec-jobhunt`), inside the Sub-tab 1 ("Resume & Action Verbs") section (`#job-subtab-resume`).
- **New Interactive Module: "AI Resume & Portfolio Transformer"**:
  - **Dropzone & Upload Area**: Drag-and-drop or file picker for `.pdf` and `.docx` files (up to 15MB) with client-side validation and file preview chip.
  - **Archetype Selector**:
    - `Enterprise AI & Data Platforms`
    - `Defense & Air-Gapped Systems`
    - `Generalist FDE`
  - **Generation Control**: "Analyze & Generate FDE Dossier" button with interactive progress state (Scanning CV $\rightarrow$ Extracting Architecture Archetypes $\rightarrow$ Synthesizing 2-3 Page Resume $\rightarrow$ Architecting 5-8 Page Technical Portfolio).
- **Dual-Document Viewer & Action Bar**:
  - Tabbed preview: **[📄 FDE Resume (2-3 Pages)]** and **[📑 Technical Portfolio (5-8 Pages)]**.
  - **Document 1 (Resume)**: Interactive preview formatted in pages, with section breakdown (Executive Summary, Technical Arsenal, Client Engagements, Systems Deployed, Certifications).
  - **Document 2 (Portfolio)**: Multi-page navigation (Executive Overview, Flagship Case Study 1, Flagship Case Study 2, Air-Gap & Security Posture, Data & Distributed Systems Architecture, Production Hardening & Results).
  - **Actions**:
    - 📥 **Export Markdown (.md)**: Downloads individual or bundled markdown files.
    - 🖨️ **Print / Save to PDF**: Triggers window print preview with tailored `@media print` styling, headers, and automatic page breaks (`break-inside: avoid; page-break-after: always`).
    - 📋 **Copy to Clipboard**: One-click raw markdown copy.

### 3. Styling & Print Optimization (`public/main.css`)
- Clean document viewer card designs matching Vanguard terminal/slate aesthetic.
- Dedicated `@media print` rules:
  - Hides navigation bars, buttons, and tab controls during printing.
  - Applies clean, high-contrast serif/sans typography suitable for recruiter review and executive portfolios.
  - Standard A4 / US Letter page boundary emulation with page break markers.

---

## Architecture & Data Flow

```
[User Browser]
      │
      ├─ Uploads CV (.pdf / .docx) + Selects Archetype (e.g. Enterprise AI)
      │
      ▼
[Frontend app.js]
      │ Base64 encodes file
      ▼
[POST /api/resume/analyze-generate] (Express server.ts)
      │
      ├─ If PDF: prepares inlineData part (mimeType: application/pdf)
      ├─ If DOCX: extracts text via mammoth/xml buffer
      │
      ▼
[@google/genai: gemini-2.5-flash]
      │
      ├─ Execution 1: Generates 2-3 Page FDE Resume
      ├─ Execution 2: Generates 5-8 Page STAR Technical Portfolio
      │
      ▼
[Express Server Response]
      │ Returns { resumeMarkdown, portfolioMarkdown, analysisMetrics }
      ▼
[Frontend Dual-Document Viewer]
      │ Renders interactive paginated views
      ├─ "Print / Save PDF" (Optimized print stylesheet)
      └─ "Download Markdown" (.md files)
```

---

## Verification Plan

### Automated Build & Static Checks
1. Dependency installation: Install `mammoth` (or equivalent parser) and verify `package.json`.
2. Applet Compilation: Run `compile_applet` to ensure `server.ts` and frontend code build with zero TypeScript or bundling errors.
3. Lint Verification: Run `lint_applet` to confirm strict type safety.

### Manual End-to-End Scenarios
1. **File Upload Testing**:
   - Upload sample PDF resume $\rightarrow$ Verify file badge, name, and size appear.
   - Upload sample DOCX resume $\rightarrow$ Verify successful parser extraction.
2. **Archetype Customization**:
   - Select "Defense & Air-Gapped Systems" $\rightarrow$ Verify generated CV heavily reflects zero-trust, SCIF, offline container registries, and mTLS.
   - Select "Enterprise AI & Data Platforms" $\rightarrow$ Verify generated CV and portfolio emphasize RAG, vector stores, distributed ETL, and LLM evaluation.
3. **Document Quality & Length Verification**:
   - Inspect Document 1: Confirm 2–3 page structured FDE resume layout.
   - Inspect Document 2: Confirm 5–8 page deep-dive portfolio with 4 STAR architecture case studies.
4. **Export Operations**:
   - Click "Export Markdown (.md)" $\rightarrow$ Verify `.md` file download.
   - Click "Print / Save to PDF" $\rightarrow$ Verify clean print preview without UI chrome and with proper page breaks.

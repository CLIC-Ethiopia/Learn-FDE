# FDE Careers & Overview - Implementation Plan

Introduce a comprehensive, interactive first tab titled **FDE Careers & Overview** that immerses users in the reality, responsibilities, career trajectory, and day-to-day life of Forward Deployed Engineers (FDEs). Remove numeric prefixes from all navigation tabs to achieve a clean, professional aesthetic while preserving keyboard shortcuts.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during Phase 1:
> - **Tab Title**: **FDE Careers & Overview** placed as the first primary tab in the platform navigation.
> - **Tab Numbering**: Strip numeric prefixes (`1.`, `2.`, etc.) from all tab labels for a clean, human-readable editorial navigation bar.
> - **Interactive Capabilities**: All 4 requested exploration tools will be fully implemented:
>   1. *Interactive Day-in-the-Life hourly simulator* (dynamic timeline scrubbing through a real enterprise deployment day).
>   2. *FDE Career Archetype diagnostic quiz* (calculates builder vs. diplomat balance and recommends specific company tracks like Palantir, Scale AI, or OpenAI).
>   3. *Role Comparison Matrix* (interactive comparative breakdown across FDE, traditional SWE, Solutions Architect, and TAM).
>   4. *Career Progression & Compensation Explorer* (interactive level explorer from Associate FDE to Principal/Director with realistic compensation bands, responsibilities, and promotion rubrics).

---

## 1. Overview & Core Concept

- **What It Does**: Serves as the authoritative, immersive orientation guide to Forward Deployed Engineering. It answers: *What does an FDE actually do?*, *How is it different from a SWE or Solutions Architect?*, *What does an average day on-site look like?*, *What are the career levels and earning potential?*, and *Which type of FDE archetype are you?*.
- **Target Audience**: Software engineers, systems architects, and technical professionals looking to transition into high-impact, client-facing AI/enterprise deployment roles at top tech companies.
- **Key Value**: Bridges the conceptual gap before users dive into deep technical modules or interview prep, providing real-world clarity on role expectations, travel realities, field diplomacy, and compensation trajectory.

---

## 2. User Experience & Visual Design

### Visual Layout & Bento Grid Architecture

The section opens with an editorial hero banner explaining the unique hybrid DNA of FDEs (50% Distributed Systems / AI Engineer + 50% Enterprise Field Diplomat), followed by 4 dedicated interactive bento sections:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Hero & Role Definition                          │
│     "The Bridge Between Frontier Code & Messy Enterprise Reality"      │
└────────────────────────────────────────────────────────────────────────┘
┌───────────────────────────────────┬────────────────────────────────────┐
│   Day-in-the-Life Simulator       │     Career Archetype Quiz          │
│   • Hourly interactive scrubber   │     • 4-question diagnostic        │
│   • 08:30 Bastion VPN login       │     • Builder vs. Diplomat score   │
│   • 11:30 Client CIO Demo         │     • Personalized track matching  │
│   • 14:00 Air-gap container debug │                                    │
│   • 16:30 Legacy DB hotfix        │                                    │
├───────────────────────────────────┴────────────────────────────────────┤
│                    Interactive Role Comparison Matrix                  │
│   Filterable criteria: Code ownership, Client contact, Travel %, etc. │
│   FDE  vs.  Software Engineer  vs.  Solutions Architect  vs.  TAM      │
├────────────────────────────────────────────────────────────────────────┤
│           Career Progression Ladder & Compensation Explorer            │
│   • L3/L4 Associate FDE ($160k-$210k)  ➔  L5 Senior FDE ($220k-$320k)  │
│   • L6 Staff FDE ($320k-$480k)        ➔  L7+ Principal / Director      │
│   • Key competencies & field battle-scars required at each tier        │
└────────────────────────────────────────────────────────────────────────┘
```

### Aesthetic & Design Constitution Details
- **Clean Unboxed Navigation Tabs**: Navigation tabs will read `Careers & Overview`, `Learning Skills`, `Interview Prep`, `Job Hunting`, and `Accelerator`. Numbers are cleanly removed.
- **Palette**: Deep slate/obsidian canvas (`#080b11`), structural borders (`var(--border-subtle)`), accent cyan (`#06b6d4`), and electric indigo (`#6366f1`).
- **Interactive States**:
  - The *Day-in-the-Life* timeline allows clicking time slots (Morning, Midday, Afternoon, Evening) with immediate visual feedback, task context, and a "Field Reality Check" pro-tip.
  - The *Archetype Quiz* updates a visual radar/balance bar in real-time between "Systems Hacker", "Client Diplomat", "Product Pioneer", and "Field Operator".
  - The *Role Comparison Matrix* lets users highlight specific dimensions (e.g. "Code Ownership", "Ambiguity Tolerance", "Onsite Travel") to contrast FDE with traditional roles.
  - The *Career Ladder* features interactive level selector tabs that update responsibilities, equity structures, and real-world hiring company examples.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Tab Navigation Clean-up**:
  - *Chosen Approach*: Remove numeric prefixes (`1.`, `2.`, etc.) from all tab text labels while retaining keyboard shortcuts (keys `1` to `5`) for effortless navigation.
  - *Why*: Adheres to the frontend design constitution prohibiting mechanical prefixes on user-facing nav items while maintaining accessibility and speed.
- **Decision 2: Local Persistence of Quiz & Level Selections**:
  - *Chosen Approach*: Save the user's completed Archetype Quiz results to IndexedDB (`meta` store) so their archetype profile persists offline and integrates into their Accelerator dashboard.
  - *Why*: Ensures continuity and personalizes the learning experience without requiring any cloud server.

---

## 4. Technical Architecture & Implementation Steps

```
 index.html
   ├── <nav class="nav-tabs"> (5 unnumbered tabs)
   ├── <section id="section-overview"> (New primary view)
   │     ├── Day-in-the-Life Timeline Widget
   │     ├── FDE Archetype Diagnostic Widget
   │     ├── Role Comparison Matrix
   │     └── Career Progression & Salary Explorer
   └── Existing sections (Skills, Interviews, Job Hunting, Accelerator)

 main.css
   ├── Timeline scrubber & step node styles
   ├── Archetype balance visual bar
   ├── Responsive comparison table styles
   └── Career ladder tier selector styles

 app.js
   ├── AppState.activeSection = "overview" (default initial tab)
   ├── renderOverviewSection() & interactive event handlers
   ├── renderDayInLife(timeSlotId)
   ├── handleArchetypeAnswer(questionIdx, optionIdx)
   ├── highlightRoleComparison(criteriaId)
   └── selectCareerLevel(levelId)
```

### Planned File Edits
1. `index.html`:
   - Add new `<button class="nav-tab-btn active" data-tab="overview">` as the first tab; update remaining 4 tabs to remove numeric prefixes.
   - Insert `<section id="section-overview" class="view-section active">` containing semantic markup for the hero, day-in-the-life simulator, archetype quiz, role comparison, and career ladder.
   - Adjust default visibility of other sections (`display: none` initially).
2. `main.css`:
   - Add CSS rules for timeline step indicators, quiz question option cards, comparison matrix hover highlights, and career level badge pills.
3. `app.js`:
   - Add `overview` data objects (hourly timeline slots, archetype questions & result logic, comparative role dimensions, career ladder levels).
   - Wire event listeners for timeline clicks, quiz options, role filters, and keyboard shortcut `1` for Overview through `5` for Accelerator.
   - Persist quiz results to IndexedDB.
4. Compilation & Verification:
   - Run `compile_applet` and `lint_applet` to confirm zero build regressions.

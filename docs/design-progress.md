# 🧩 KubeStellar Design Progress – Saumya Kumar

This document tracks the progress of the design system foundation efforts for the KubeStellar UI during the LFX Mentorship Term 2, 2025.

---

## 📅 Timeline Overview

### 🟠 June 9 – June 20: UI Audit & Research

- **Activities**: Review current UI across KubeStellar interfaces (UI, Docs, CLI), identify visual inconsistencies, UX and accessibility issues.
- **Deliverables**: UI Audit Summary Report with findings and improvement suggestions.

### 🟡 June 21 – July 4: Design Foundations

- **Activities**: Define typography scale, color palette, spacing, layout grid, elevation system, and design tokens.
- **Deliverables**: Design Foundations Guide (PDF + Figma).

### 🟢 July 5 – July 14: Component Library – Phase 1

- **Activities**: Begin designing reusable UI components (e.g., buttons, inputs, cards, navbars) with states (hover, focus, disabled).
- **Deliverables**: Initial Figma Component Library.

### 🟣 July 15: Midterm Evaluation

- **Activities**: Submit current progress for mentor feedback; revise scope or timeline if necessary.
- **Deliverables**: Midterm Feedback Reflections.

### 🔵 July 16 – August 1: Component Library – Phase 2 & Usage Docs

- **Activities**: Expand and finalize components. Create a usage guide and begin drafting CSS token specifications.
- **Deliverables**: Finalized Figma Library, Usage Guide, Draft CSS Spec.

### 🟤 August 2 – August 15: Mockups + IA Evaluation

- **Activities**: Design high-fidelity mockups (e.g., homepage hero, docs page), optionally review documentation IA.
- **Deliverables**: Hero & Docs Page Mockups, IA Suggestions (if applicable).

### ⚫ August 16 – August 26: Final Reviews & Refinement

- **Activities**: Polish all design assets. Ensure dev-readiness, accessibility, and consistency. Prepare final handoff documentation.
- **Deliverables**: Final Design System Package (Figma, CSS Specs, Docs).

### 🏁 August 29: End of Term

- **Activities**: Final sync with mentors and maintainers.
- **Deliverables**: — (Wrap-up only)

---

## Audit Resources

1. **UI Audit FigJam Board**  
   Link: [View FigJam Audit Board](https://www.figma.com/board/IHLBwlFC6i4Ibh2DVIzBxX/KubeStellar%E2%80%AFv0.27.2-Documentation--UI--and-Design-System-Audit?node-id=0-1&t=SK5oQyifTdi2ji7C-1)

2. **Define Goals & Scope Document**  
   Link: [Google Docs - Project Goals & Scope](https://docs.google.com/document/d/1m0dAD3S4ShM32hw5k2wqGv-CZeFhnKI3t-Eto1MfVis/edit?usp=sharing)

---

## 📌 Progress Update –

### ✅ UI Audit Completed

- Conducted a full audit of KubeStellar’s current UI, including:
  - Documentation site
  - Dashboard
  - Navigation patterns
  - Visual consistency
  - Accessibility checks
- Identified major UX and UI issues: inconsistent typography, unclear hierarchy, visual clutter,bug, poor color contrast, and navigation redundancy.

### 🎯 Goals & Scope Defined

- Established clear goals for the design system:
  - Audit Focus
  - Areas of Evaluation
  - Business Objectives
  - User Goals & Tasks
  - Success Criteria
  - Scope Summary
- Scoped initial focus areas: documentation site, core UI components, and frontend behavior improvements.

### 📈 Structure & Strategy: Information Architecture & Flow Planning

#### ✅ 1. Current Information Architecture (IA) Review

- Mapped and documented the existing structure of KubeStellar’s documentation.
- Identified scattered content, duplication, and inconsistent labeling across:
  - Overview
  - Getting Started
  - Usage
  - UI and Contributing sections

#### 📂 2. IA Observations & Recommendations

##### 🔍 Observations:
- Conceptual, technical, and UI content is mixed without a clear hierarchy.
- Repeated topics (e.g., Hosting Cluster) found in multiple places.
- Use of generic folders like `/direct/` adds confusion.

##### 📁 Recommended Hierarchy:
- Clear top-level sections: Overview, Getting Started, Usage, Support, Community.
- Max 3 levels deep to avoid overwhelming navigation.
- Rename unclear labels (e.g., “User Guide” → “Using KubeStellar”).
- Remove or replace generic paths like `/direct/`.

##### 🧭 3. Navigation Design Assessment

- **Header**: Needs better contrast on buttons, missing version & language switchers.
- **Sidebar**: Suggest collapsible menus, hierarchy cleanup, and clearer labels.
- **Footer**: Recommend adding feedback buttons, edit links, and community links.
- **Breadcrumbs**: Currently missing; suggested for better page context.

#### 🔄 4. Key User Flows Mapped

##### 1. Manual Setup Flow
- Goal: CLI-based installation via Helm and KubeFlex
- Issue: Steps spread across multiple paths
- Fix: Create a unified guide with diagrams

##### 2. OCM-Based Setup Flow
- Goal: Automate install using Open Cluster Management
- Issue: Lack of comparison with manual setup, unclear CLI outputs
- Fix: Add decision guide, validation steps, and architecture diagram

##### 3. Workload Execution Flow
- Goal: Register clusters, deploy workloads
- Issue: Fragmented docs, complex concepts not simplified
- Fix: Provide an end-to-end walkthrough with examples

##### 4. Teardown Flow
- Goal: Uninstall KubeStellar cleanly
- Issue: No rollback, no multi-cluster instructions
- Fix: Add pre-checklist, recovery steps, and cleanup scripts

#### 🚧 5. Content & Functional Gaps Identified

- Missing Quickstart guide
- Repetition in Hosting Cluster setup
- Incomplete or scattered UI documentation
- No in-page search or user feedback mechanism
- Lacks visuals (architecture/setup diagrams)
- No glossary for technical terms





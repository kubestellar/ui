# 🧩 KubeStellar Design Progress – Saumya Kumar

This document tracks the progress of the design system foundation efforts for the KubeStellar UI during the **LFX Mentorship Term 2, 2025**.

---

## 📅 Timeline Overview

### 🟠 June 9 – June 20: UI Audit & Research

- **Activities**: Reviewed current UI across KubeStellar interfaces (UI, Docs, CLI); identified visual inconsistencies, UX and accessibility issues.
- **Deliverables**: UI Audit Summary Report with findings and improvement suggestions.

### 🟡 June 21 – July 4: Design Foundations

- **Activities**: Defined typography scale, color palette, spacing, layout grid, elevation system, and design tokens.
- **Deliverables**: Design Foundations Guide (PDF + Figma).

### 🟢 July 5 – July 14: Component Library – Phase 1

- **Activities**: Began designing reusable UI components (e.g., buttons, inputs, cards, navbars) with all interaction states (hover, focus, disabled).
- **Deliverables**: Initial Figma Component Library.

### 🟣 July 15: Midterm Evaluation

- **Activities**: Submitted current progress for mentor feedback; revised scope or timeline if needed.
- **Deliverables**: Midterm Feedback Reflections.

### 🔵 July 16 – August 1: Component Library – Phase 2 & Usage Docs

- **Activities**: Expanded and finalized components. Created a usage guide and began drafting CSS token specifications.
- **Deliverables**: Finalized Figma Library, Usage Guide, Draft CSS Spec.

### 🟤 August 2 – August 15: Mockups + IA Evaluation

- **Activities**: Designed high-fidelity mockups (e.g., homepage hero, docs master page). Optionally reviewed documentation IA.
- **Deliverables**: Hero & Docs Page Mockups, IA Suggestions (if applicable).

### ⚫ August 16 – August 26: Final Reviews & Refinement

- **Activities**: Polished all design assets. Ensured dev-readiness, accessibility, and consistency. Prepared final handoff documentation.
- **Deliverables**: Final Design System Package (Figma, CSS Specs, Docs).

### 🏁 August 29: End of Term

- **Activities**: Final sync with mentors and maintainers.
- **Deliverables**: — (Wrap-up only)

---

## 📂 All Resources

1. **Design System – Objective & Timeline**  
   🔗 [Objective & Timeline – Google Docs](https://docs.google.com/document/d/1u06DFqyFBBe8NcgUUhRvDRMVmf57BUUAHBY8VtZbj1g/edit?usp=sharing)

2. **UI Audit FigJam Board**  
   🔗 [View FigJam Audit Board](https://www.figma.com/board/IHLBwlFC6i4Ibh2DVIzBxX/KubeStellar%E2%80%AFv0.27.2-Documentation--UI--and-Design-System-Audit?node-id=0-1&t=SK5oQyifTdi2ji7C-1)

3. **Define Goals & Scope Document**  
   🔗 [Project Goals & Scope – Google Docs](https://docs.google.com/document/d/1m0dAD3S4ShM32hw5k2wqGv-CZeFhnKI3t-Eto1MfVis/edit?usp=sharing)

4. **Structure & Strategy – Information Architecture & Flow Planning**  
   🔗 [Structure & Strategy – Google Docs](https://docs.google.com/document/d/13iG5yXS23F9JHQkxGR3ODwmc_XJVydiBYt28f4Tysxo/edit?usp=sharing)

5. **Wireframing**  
   🔗 [Wireframing – Figma](https://www.figma.com/design/GLUwDDSxzkL8Evhgsec4JM/Wireframing--kubestellar.io?node-id=0-1&t=LaikrxjMxKaexwZd-1)

6. **Type Hierarchy**  
   🔗 [Type Hierarchy – Figma](https://www.figma.com/design/Gi24EeUOBqcWbdutYEPlE4/Type-Hierarchy?node-id=0-1&t=XXfQVjh9T7DgVtXB-1)

7. **Landing Page Design**  
   🔗 [Kubestellar Docs – Figma Design](https://www.figma.com/design/YeGMzcwefc2LYWmmx0rVmN/Kubestellar-Docs-Figma-Design?node-id=0-1&t=X5tOTPfk760XFboI-1)

8. **Contribute Handbook & Program Page**  
   🔗 [Program Page – Figma Design](https://www.figma.com/design/7SyJsOA51BMXkZcg3SXl0u/program-page?node-id=0-1&t=nwiyTVlSDuWrsF1N-1)   

---

## 📌 Progress Update

### ✅ UI Audit Completed

- Conducted a full audit of KubeStellar’s current UI, including:
  - Documentation site
  - Dashboard
  - Navigation patterns
  - Visual consistency
  - Accessibility checks
- Identified major UX and UI issues such as:
  - Inconsistent typography
  - Unclear content hierarchy
  - Visual clutter and bugs
  - Poor color contrast
  - Navigation redundancy

### 🎯 Goals & Scope Defined

- Established clear design system objectives, including:
  - Audit Focus
  - Evaluation Areas
  - Business Objectives
  - User Goals & Tasks
  - Success Criteria
  - Scope Summary
- Initial focus areas:
  - Documentation site
  - Core UI components
  - Frontend interaction improvements

### 🧭 Structure & Strategy – Information Architecture & Flow Planning

This section covers foundational analysis and planning to improve the structure, navigation, and usability of the KubeStellar documentation.

#### ✅ Review of Current Information Architecture (IA)

- Analyzed existing doc structure across:
  - Overview
  - Setup
  - Usage
  - UI
  - Community sections
- Found fragmented content, duplicate topics, and inconsistent labeling.

#### 📁 Observations & Proposed Hierarchy Improvements

- Mixed technical/conceptual content without clear organization
- Proposed a max of 3-level deep nested hierarchy
- Suggested clearer top-level groups:
  - Getting Started
  - Usage
  - Troubleshooting
  - Contributing
- Recommended removing or renaming generic paths like `/direct/`

#### 🧭 Navigation Design Audit

##### 🔹 Header

- **Issues**: Low contrast buttons; missing version and language switchers
- **Recommendations**: Use clear button styles; add dropdowns for versioning and multilingual support

##### 🔹 Sidebar

- **Issues**: Non-collapsible menus; poor hierarchy; confusing URLs
- **Recommendations**: Implement collapsible sections; improve naming; highlight current section; remove `/direct/`

##### 🔹 Footer

- **Needs**:
  - “Was this helpful?” feedback buttons
  - GitHub "Edit this page" links
  - Community links
  - License and privacy info

##### 🔹 Breadcrumbs

- **Status**: Missing entirely
- **Recommendation**: Add a breadcrumb trail to support user orientation

#### 🔄 Key User Flows Mapped

##### 1. Manual Setup Flow

- **Goal**: Manually install KubeStellar using CLI, Helm, and KubeFlex
- **Issues**: Dispersed setup steps; redundant cluster info
- **Recommendations**: Create a unified guide; add lifecycle diagrams

##### 2. OCM-Based Setup Flow

- **Goal**: Automate setup via Open Cluster Management (OCM)
- **Issues**: Lacks clarity on use-case choice; no validation steps
- **Recommendations**: Add setup comparison chart; insert CLI output examples and diagrams

##### 3. Workload Execution Flow

- **Goal**: Register clusters and deploy workloads
- **Issues**: Disconnected content; no step-by-step guidance
- **Recommendations**: Create end-to-end deployment guide with YAML + CLI examples

##### 4. Teardown Flow

- **Goal**: Cleanly uninstall KubeStellar
- **Issues**: No rollback or backup guidance; lacks automation
- **Recommendations**: Add pre-teardown checklist; CLI cleanup scripts; multi-cluster handling

#### 🚧 Identified Content & Functional Gaps

- No Quickstart guide for first-time users
- Duplicate Hosting Cluster setup across docs
- UI documentation lacks structure and visuals
- API docs are fragmented with minimal context
- Troubleshooting section is hard to scan
- Known Issues aren't categorized by severity
- Contribution docs need more clarity and depth
- Missing full-text search functionality
- No user feedback mechanisms
- Diagrams and visuals are absent from key pages
- No glossary for technical terms (e.g., WEC, ITS)

### 🧪 User Research & Interviews Conducted

- Conducted user interviews and research to understand:
  - Common navigation pain points
  - Confusing flows in the current IA
  - User expectations from documentation and setup guides
- Insights helped inform the new IA and navigation recommendations

### 🔳 Wireframes Designed

- Developed low-fidelity wireframes for:
  - Documentation homepage layout
  - Setup guide experience
  - Component structure (inputs, buttons, sidebars)
- Used layout grid and spacing tokens from the design system
- Aligned wireframes with IA improvements


### 🔤 Type Hierarchy Defined

- Established a consistent typography system for the documentation and UI
- Defined font sizes, weights, and heading structures aligned with visual hierarchy
- Resource: [Type Hierarchy – Figma](https://www.figma.com/design/Gi24EeUOBqcWbdutYEPlE4/Type-Hierarchy?node-id=0-1&t=XXfQVjh9T7DgVtXB-1)

### Additional Progress

- **Navigation Mapping Updated**: Created a revised navigation structure in FigJam to align with improved information architecture and mapped user flows.

- **Information Architecture Refined**: Enhanced the structure of documentation based on audit results and user research, ensuring better organization, hierarchy, and clarity.

- **Typography Finalized**: Completed the typography hierarchy in Figma, establishing consistent type scales for headings, body text, and labels to improve readability and accessibility.

### 🔍 Research on Next.js framework for Documentation

- **Objective**: Explore better alternatives for the documentation site framework with a focus on SEO, performance, and developer experience.
- **Findings**:
  - Next.js offers **strong SEO** capabilities out-of-the-box due to SSR and static generation.
  - Supports **MDX**, making it easier to write interactive documentation in markdown with React components.
  - Excellent integration with **search engines** and analytics.
  - Better **routing flexibility** and support for multilingual content.
- **Outcome**: Decided to proceed with a Next.js-based setup (considering Nextra or Mintlify) for the redesigned documentation system to enhance visibility and maintainability.

### 🧠 Brainstorming – Program Page Content

- Initiated content brainstorming for a dedicated **Program Page** to showcase KubeStellar-related opportunities such as mentorships, contributor programs, or events.
- The goal is to provide a structured, user-friendly page that helps visitors quickly understand the program and how to participate.

### 🎨 KubeStellar/docs Landing Page Design – Navigation Bar

- Designed a clean and accessible **navbar** for the documentation landing page:
  - **Logo** (top-left) links to the home page
  - **Top-level navigation links**:
    - Docs
    - Community
    - Contribute
    - Blog

  - **Right-aligned utilities**:
    - Version dropdown (e.g., v0.9.0, v1.0.0)
    - Language switcher (for multilingual support)
    - GitHub icon linking to the main repo
  - **Sticky header** with smooth scroll and shadow for better visibility

### 🪐 KubeStellar/docs Landing Page Design – Hero Section

- Designed a **space-themed animated hero section** to reflect KubeStellar’s identity as a multi-cluster orchestration platform with cosmic scalability.

### 🛠️ KubeStellar/docs Landing Page Design – How It Works Section

- Designed an **interactive, visually engaging** "How It Works" section to explain KubeStellar’s architecture and workflow in simple, digestible steps.

### 🚀 KubeStellar/docs Landing Page Design – Use Cases Section

> **Discover how organizations leverage KubeStellar for their multi-cluster needs.**
- Designed to highlight **real-world applications** of KubeStellar with concise, impactful cards that visually connect use cases to features.

### ✨ KubeStellar/docs Landing Page Design – Get Started Section

> **Kickstart your journey with KubeStellar.**
- **🚀 Quick Installation** – Set up in minutes  
- **💬 Join Community** – Connect with developers  
- **📚 Explore Docs** – Browse guides and references

### 📞 KubeStellar/docs Landing Page Design – Get in Touch Section

> **Have questions about KubeStellar? We're here to help!**
- Simple, approachable section encouraging user engagement.
- **Includes**:
  - Brief message with supportive tone
  - Two clear CTAs:
    - **💬 Join Our Slack** – Real-time help & discussions
    - **📧 Contact Us** – Reach out via email or form

### 📞 KubeStellar/docs Landing Page Design – Footer

Redesigned the footer to enhance usability and user engagement:
- ⚓️ **Quick Navigation**: Added streamlined links to key sections (Home, Docs, Community, GitHub, etc)
- 📬 **Stay Updated**: Integrated a simple email input for newsletter subscriptions

### 🎨 Designed Navbar Button Dropdown with Meaningful Icons
- Added **dropdown menus** to navbar buttons for improved navigation clarity.
- Each dropdown item paired with a **meaningful icon** for quick scanning.
- Smooth open/close animation with slight fade and slide.
- Keyboard-accessible with focus highlights.
- Matches design system spacing, typography, and hover states.

### 🧩 Implemented Atomic Design in Figma

- Structured components into **Atoms, Molecules, Organisms, Templates, and Pages** for a scalable and reusable design system.
- Ensures:
  - Consistent styling across the platform
  - Easier updates to UI components
  - Improved collaboration between design and development teams

### 📘 Design – Contribute Handbook Page

- Consolidated all contributor guidance into one structured page.  
- Covers: **Onboarding, Code of Conduct, Guidelines, License, Governance, Testing, Docs Management Overview, Testing Website PRs, Release Process, Release Testing, and Signoff/Signing Contributions.**  
- Goal: Provide a single source of truth for contribution rules and processes.  
  
### 🗂️ KubeStellar/docs – Programs Page Design

Designed a dedicated **Programs** page featuring card-based layouts for showcasing key initiatives:
- 📌 **LFX Mentorship**
- 📌 **Google Summer of Code (GSoC)**
- 📌 **ESOC**
- 📌 **IFoS**
Each program is represented as a card with a title, description, and quick access link for better visibility and navigation.

### 🌐 KubeStellar/docs – Google Summer of Code (GSoC) Page Design

Created a dedicated **GSoC program page** with structured content sections for clarity and accessibility:
-  **Program Name with Logo/Image**
-  **Description** – Brief introduction to GSoC and its purpose
-  **Overview** – Organizing details and background
-  **Eligibility Criteria** – Who can apply
-  **Timeline** – Key application and participation dates
-  **Program Structure** – Stages and workflow
-  **How to Apply** – Step-by-step guide
-  **Benefits** – What contributors and organizations gain
-  **Resources** – Useful links and reference material
This structured layout improves readability and makes it easy for newcomers to understand the program and get started.

### 🛠️ KubeStellar/docs – LFX Page Design

Designed a dedicated LFX program page with sections for program name & image, description, overview, eligibility, timeline, structure, how to apply, benefits, and resources.

### 🚀 KubeStellar/docs – IFoS Page Design  

Designed the IFoS program page with sections for program name & image, description, overview, eligibility, timeline, structure, how to apply, benefits, and resources.

### 🌍 KubeStellar/docs – ESOC Page Design  

Designed the ESOC program page with sections for program name & image, description, overview, eligibility, timeline, structure, how to apply, benefits, and resources.

### 🌐 KubeStellar/docs – Landing Page Web Design  

Developed a functional **landing page** on the web to test design and interactions beyond Figma.  
Key highlights:  
- 🎨 Implemented the UI design from Figma into a working web prototype  
- ⚡ Interactive components and navigation integrated  
- 📱 Responsive layout for desktop and mobile  
- 🔍 Allows testing of real user flow, functionality, and performance  

This helps validate the design in a real environment and ensures smooth usability before production.

### 📖 KubeStellar/docs – Contribute Handbook & Program Pages (Web Design) 

Developed functional **Contribute Handbook** and **Program Pages** as live web versions to validate design and usability.  

Key highlights:  
- Converted Figma designs into interactive web pages  
- Implemented navigation, cards, and structured content for each program (LFX, GSoC, ESOC, IFoS)  
- Added Contribute Handbook with sections for onboarding, guidelines, governance, and license  
- Fully responsive across devices (desktop, tablet, mobile)  
- Enabled real-time testing of user flow and functionality  

Contributers: 
- [Saumya Kumar](https://github.com/oksaumya)
- [Mahi Monga](https://github.com/mahimonga)
- [Naman](https://github.com/naman9271)
---

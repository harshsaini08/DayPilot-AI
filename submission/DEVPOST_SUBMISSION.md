# Devpost Project Submission — DayPilot AI

**Project Name:** DayPilot AI  
**Tagline:** Your day, intelligently orchestrated.  
**Track:** Amazon Developer Hackathon — Alexa+  
**Developer:** Harsh Saini  
**GitHub Repository:** (Configured for standard repository deployment)  
**License:** MIT License  

---

## 1. Elevator Pitch
DayPilot AI is an independent, Alexa+-inspired ambient productivity platform that bridges conversational intelligence and deterministic scheduling. While traditional to-do lists leave users to calculate the fallout of unexpected disruptions, DayPilot AI continuously evaluates deadlines, energy limits, and calendar commitments, proposes verifiable schedule changes, executes approved operations via the Model Context Protocol (MCP), and preserves user trust through an auditable Decision Ledger with true state-level undo.

---

## 2. Inspiration & Problem Statement
Students, developers, and busy professionals frequently encounter sudden disruptions: a 2-hour morning outage, unexpected meetings, or an afternoon energy slump. Conventional productivity applications are static; when a disruption occurs, the user is burdened with manually rescheduling tasks, re-estimating durations, and guessing whether critical deadlines will slip.

We asked: **What if your personal assistant didn't just store tasks, but actively piloted your day?**
- What should I do next?
- What happens if I lose two hours?
- Which deadlines must remain protected?
- How can I make progress when my energy is low?
- What changed in my plan, and why?
- Which actions require my explicit permission?

DayPilot AI was designed from first principles to answer these questions with ambient calmness and mathematical rigor.

---

## 3. Four Signature Innovations

### Innovation A — Adaptive Day Flight Director
A deterministic planning engine that continuously evaluates available time windows between locked calendar events. It uses multi-factor scoring (deadline urgency, user priority, cognitive demand, and window fit) to allocate non-overlapping slots. When constrained (e.g., "I have only two hours today"), it mathematically caps capacity, preserves top deadlines, defers non-essential items, and renders before-and-after diffs with transparent trade-off explanations.

### Innovation B — Personal Energy and Focus Budget
A user-directed cognitive workload model with Low, Moderate, and High energy modes. Rather than making dubious claims about biometric emotion detection, DayPilot empowers users to declare their stamina. Under low energy, it breaks daunting 90-minute tasks into manageable 30-minute micro-sessions with 10-minute restorative breaks, preventing cognitive burnout.

### Innovation C — Real Model Context Protocol (MCP) Studio
A genuine implementation of the official Model Context Protocol (MCP) TypeScript SDK v1.32.1 over Streamable HTTP and Server-Sent Events (SSE) on port 3001. It exposes 10 validated tools, 3 discoverable resources (`daypilot://tasks/today`, `daypilot://schedule/today`, `daypilot://budget/focus`), and 3 reusable prompts. Crucially, consequential tools calculate proposals without mutating state until explicit approval is granted.

### Innovation D — Trust, Consent, and Decision Ledger
An immutable, chronological audit ledger recording original user requests, proposed operations, constraints, trade-offs, and state snapshots. If a user moves or defers a task, DayPilot provides working state-level Undo that restores the exact prior schedule snapshot rather than merely posting a cosmetic message.

---

## 4. Technical Architecture & Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React icons, Web Audio synthesis.
- **Backend / MCP Server:** Node.js, TypeScript, `@modelcontextprotocol/sdk` v1.32.1, Express, Zod runtime validation, Streamable HTTP / SSE transport.
- **Shared Core (`@daypilot/shared`):** Pure deterministic scheduling engine, time-window math, intent-processing pipeline, and focus budget calculator.
- **Testing:** Vitest automated test suite with 16 unit tests covering schedule overlap prevention, deadline preservation, low-energy adaptation, and MCP tool validation.
- **Deployment:** Vite configured for GitHub Pages (`./` relative base path), automated with `.github/workflows/deploy.yml`.

---

## 5. What We Learned & Engineering Decisions
- **Deterministic AI over Unpredictable LLM Hallucinations:** Schedulers require mathematical invariants (tasks must not overlap, fixed meetings must not move). We decoupled intent parsing and ambient dialogue from the deterministic constraint solver.
- **Two-Phase Commit for Agentic Actions:** Having tools directly mutate databases without confirmation erodes user trust. Implementing `propose_schedule_rebalance` followed by `approve_proposed_action` guarantees user consent for every consequential change.
- **Offline-First Resilience:** DayPilot AI works seamlessly with or without an active internet connection. When the MCP server is running, it connects via Streamable HTTP; when offline, it falls back to its deterministic local runtime with transparent UI badging.

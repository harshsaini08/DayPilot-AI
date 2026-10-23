# DayPilot AI — 3-Minute Demonstration Script

**Developer:** Harsh Saini  
**Track:** Amazon Developer Hackathon — Alexa+ Track  
**Project:** DayPilot AI — Your day, intelligently orchestrated.

---

## TIMING BREAKDOWN

### 0:00 – 0:20 | Introduction: The Productivity Paradox
- **Speaker:** "Welcome to DayPilot AI. Conventional productivity apps store static to-do lists, but when unexpected disruptions happen—a 2-hour delay or low energy—they abandon you to figure out the consequences. DayPilot AI is an ambient, Alexa+-inspired agentic productivity platform that maintains a living mathematical model of your day, reasons over scheduling constraints, and safely executes verified operations via the Model Context Protocol."
- **Action on Screen:** Open Command Center. Point to the active Assistant Sphere breathing in Idle/Ambient state. Show today's 8 tasks, 2 locked calendar meetings, and balanced focus budget.

### 0:20 – 0:55 | Innovation A: Adaptive Day Flight Director
- **Speaker:** "Let's test an inevitable disruption: losing six hours of working time."
- **Action on Screen:** Click quick command or type in chat:
  ```text
  I have only two hours today.
  ```
- **Sphere Transition:** Sphere pulses into violet 'Processing' and blue 'Planning', then illuminates amber for 'Awaiting Approval'.
- **Speaker:** "Notice what happened: DayPilot didn't blindly delete tasks or schedule an impossible plan. It calculated the exact 120 available minutes, protected the critical Q3 Strategic Presentation deadline and fixed meetings, and generated a formal proposal deferring lower-priority backlog tasks. It is now waiting at a consent gate."
- **Action on Screen:** Click **Approve & Execute**. The schedule instantly recalculates, deferred tasks move to the protected deferral panel, and the change is committed to the Decision Ledger.

### 0:55 – 1:25 | Innovation B: Personal Energy & Focus Budget
- **Speaker:** "Now let's imagine you are fatigued, but still have an executive deliverable due."
- **Action on Screen:** Switch to Conversational Assistant and type:
  ```text
  I'm low on energy, but my presentation is due today.
  ```
- **Speaker:** "DayPilot never claims biometric surveillance—energy is user-declared. In response, DayPilot switches to a Low Energy profile: it decomposes the daunting 90-minute presentation into manageable 30-minute micro-blocks, inserts 10-to-15-minute restorative breaks, and defers non-essential cognitive load while guaranteeing the deadline."
- **Action on Screen:** Inspect the proposal and click **Approve & Apply**. Switch to **Focus Studio** to see the cognitive workload chart update in real time.

### 1:25 – 2:00 | Innovation C: Real Model Context Protocol (MCP) Studio
- **Speaker:** "Next, let's inspect the actual Model Context Protocol implementation."
- **Action on Screen:** Switch to **MCP Integration Studio**. Show the green **REAL MCP SERVER ACTIVE** badge (Port 3001, Protocol Version `2024-11-05`, Streamable HTTP / SSE transport).
- **Speaker:** "DayPilot implements the official MCP TypeScript SDK. Here are 10 discoverable tools, 3 contextual resources, and 3 prompt templates. Notice that consequential tools like `propose_schedule_rebalance` strictly return proposals without mutating state until `approve_proposed_action` is called."
- **Action on Screen:** In the interactive inspector, select `get_daily_tasks` and click **Invoke Tool**. Show the JSON response payload and execution duration (under 20ms).

### 2:00 – 2:35 | Innovation D: Trust, Consent & Decision Ledger
- **Speaker:** "Let's demonstrate verifiable consent and undo."
- **Action on Screen:** Type in chat:
  ```text
  Move my lowest-priority task to tomorrow.
  ```
- **Speaker:** "DayPilot identifies 'Sprint Backlog Grooming' as the lowest urgency task. We approve the proposal. Now let's navigate to the **Decision Ledger**."
- **Action on Screen:** Switch to Decision Ledger. Point to the chronological audit trail showing original request, reasoning, trade-offs, and state snapshot.
- **Action on Screen:** Click **Undo This Action**.
- **Speaker:** "Notice how Undo doesn't simply log a message—it cryptographically restores the exact previous state snapshot, putting the task back on today's flight plan."

### 2:35 – 3:00 | Conclusion & Reset
- **Speaker:** "Finally, with one click of **Reset Demo**, the entire system—frontend, schedule, and backend MCP server—restores to its clean baseline."
- **Action on Screen:** Click **Reset Demo** in the top navigation bar. System restores cleanly.
- **Speaker:** "DayPilot AI: Your day, intelligently orchestrated. Thank you!"

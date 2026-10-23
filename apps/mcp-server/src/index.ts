/**
 * DayPilot AI - Model Context Protocol (MCP) Server
 * Innovation C: Real Model Context Protocol Architecture
 * 
 * Target Spec Version: 2024-11-05 / 2025-03-26 / 2025-11-25
 * Transport: Streamable HTTP / Server-Sent Events (SSE)
 * 
 * Exposes:
 * - 10 Validated Tools with runtime argument checking and explicit approval lifecycle
 * - 3 Discoverable Resources (tasks, schedule, focus budget)
 * - 3 Reusable Prompts (daily planning, deadline recovery, low energy adaptation)
 * - Health and diagnostic endpoints for client observability
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  Task,
  FixedEvent,
  FocusBudget,
  ProposedAction,
  LedgerEntry,
  StateSnapshot,
  INITIAL_TASKS,
  INITIAL_FIXED_EVENTS,
  INITIAL_FOCUS_BUDGET,
  calculateSchedule,
  computeFocusBudget,
  generatePlanComparison,
  createInitialSnapshot,
} from '@daypilot/shared';

const PORT = parseInt(process.env.PORT || '3001', 10);
const PROTOCOL_VERSION = '2024-11-05';

// Server-side in-memory deterministic state
let currentTasks: Task[] = JSON.parse(JSON.stringify(INITIAL_TASKS));
let currentFixedEvents: FixedEvent[] = JSON.parse(JSON.stringify(INITIAL_FIXED_EVENTS));
let currentFocusBudget: FocusBudget = JSON.parse(JSON.stringify(INITIAL_FOCUS_BUDGET));
const pendingProposals = new Map<string, ProposedAction>();
const decisionLedger: LedgerEntry[] = [];

// Initialize initial schedule slots
const initialSchedule = calculateSchedule(currentTasks, currentFixedEvents, currentFocusBudget);
currentTasks = initialSchedule.plan.scheduledTasks;
currentFocusBudget = initialSchedule.plan.focusBudget;

function recordLedger(
  actionId: string,
  request: string,
  summary: string,
  reasoning: string,
  tradeoffs: string[],
  status: LedgerEntry['status'],
  snapshotBefore: StateSnapshot,
  snapshotAfter: StateSnapshot,
  canUndo: boolean
): LedgerEntry {
  const entry: LedgerEntry = {
    id: `ledger-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    actionId,
    timestamp: new Date().toISOString(),
    request,
    summary,
    reasoning,
    tradeoffs,
    status,
    source: 'mcp_tool',
    canUndo,
    snapshotBefore,
    snapshotAfter,
  };
  decisionLedger.unshift(entry);
  return entry;
}

// Create MCP Server instance
const mcp = new McpServer(
  {
    name: 'DayPilot-MCP-Server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// -------------------------------------------------------------
// MCP TOOLS
// -------------------------------------------------------------

// Tool 1: get_daily_tasks
mcp.tool(
  'get_daily_tasks',
  'Retrieve current daily tasks with duration, priority, deadline, and scheduled slots',
  {
    status: z.enum(['all', 'pending', 'in_progress', 'completed', 'deferred']).optional(),
  },
  async ({ status }) => {
    let filtered = currentTasks;
    if (status && status !== 'all') {
      filtered = currentTasks.filter(t => t.status === status);
    }
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              count: filtered.length,
              tasks: filtered,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool 2: get_calendar_events
mcp.tool(
  'get_calendar_events',
  'Retrieve non-negotiable fixed calendar commitments for today',
  {},
  async () => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              count: currentFixedEvents.length,
              events: currentFixedEvents,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool 3: create_task
mcp.tool(
  'create_task',
  'Add a validated new task into DayPilot state without disturbing fixed calendar commitments',
  {
    title: z.string().min(2, 'Task title must be at least 2 characters').max(100),
    duration: z.number().int().min(5, 'Minimum duration is 5 minutes').max(480, 'Maximum duration is 8 hours'),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    deadline: z.string().optional(),
    category: z.enum(['work', 'health', 'learning', 'personal', 'urgent']).default('work'),
    cognitiveDemand: z.enum(['low', 'moderate', 'high', 'deep']).default('moderate'),
    description: z.string().optional(),
  },
  async (args) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: args.title,
      description: args.description,
      duration: args.duration,
      priority: args.priority,
      deadline: args.deadline || '18:00',
      category: args.category,
      cognitiveDemand: args.cognitiveDemand,
      status: 'pending',
    };

    const beforeSnap: StateSnapshot = {
      tasks: JSON.parse(JSON.stringify(currentTasks)),
      fixedEvents: JSON.parse(JSON.stringify(currentFixedEvents)),
      focusBudget: JSON.parse(JSON.stringify(currentFocusBudget)),
      explanation: 'State before adding task',
    };

    currentTasks.push(newTask);
    const { plan } = calculateSchedule(currentTasks, currentFixedEvents, currentFocusBudget);
    currentTasks = plan.scheduledTasks;
    currentFocusBudget = plan.focusBudget;

    const afterSnap: StateSnapshot = {
      tasks: JSON.parse(JSON.stringify(currentTasks)),
      fixedEvents: JSON.parse(JSON.stringify(currentFixedEvents)),
      focusBudget: JSON.parse(JSON.stringify(currentFocusBudget)),
      explanation: `Added task "${newTask.title}"`,
    };

    recordLedger(
      `action-create-${newTask.id}`,
      `create_task: ${newTask.title}`,
      `Created task "${newTask.title}" (${newTask.duration}m, ${newTask.priority} priority)`,
      'Direct user creation of task. Automatically recalculated schedule slots.',
      [],
      'completed',
      beforeSnap,
      afterSnap,
      true
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              createdTask: newTask,
              updatedFocusBudget: currentFocusBudget,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool 4: propose_schedule_rebalance
// (Calculates and returns proposed changes without applying them!)
mcp.tool(
  'propose_schedule_rebalance',
  'Calculate an optimized flight plan rebalance under available time or energy constraints. Returns a proposal awaiting approval.',
  {
    maxCapacityMinutes: z.number().int().min(30).max(720).optional(),
    energyLevel: z.enum(['low', 'moderate', 'high']).optional(),
    preferredBreakMinutes: z.number().int().min(5).max(30).optional(),
    reason: z.string().optional(),
  },
  async (args) => {
    const previousState: StateSnapshot = {
      tasks: JSON.parse(JSON.stringify(currentTasks)),
      fixedEvents: JSON.parse(JSON.stringify(currentFixedEvents)),
      focusBudget: JSON.parse(JSON.stringify(currentFocusBudget)),
      explanation: 'State prior to rebalance proposal',
    };

    const { plan, deferredTasks, explanation } = calculateSchedule(
      currentTasks,
      currentFixedEvents,
      currentFocusBudget,
      {
        maxCapacityMinutes: args.maxCapacityMinutes,
        energyLevel: args.energyLevel,
        preferredBreakMinutes: args.preferredBreakMinutes,
      }
    );

    const newState: StateSnapshot = {
      tasks: [...plan.scheduledTasks, ...deferredTasks],
      fixedEvents: currentFixedEvents,
      focusBudget: plan.focusBudget,
      explanation,
    };

    const actionId = `prop-${Date.now()}`;
    const proposedAction: ProposedAction = {
      id: actionId,
      timestamp: new Date().toISOString(),
      originalRequest: args.reason || 'propose_schedule_rebalance tool invocation',
      actionType: 'rebalance',
      status: 'proposed',
      summary: args.maxCapacityMinutes
        ? `Rebalance schedule for ${args.maxCapacityMinutes}m (${(args.maxCapacityMinutes / 60).toFixed(1)}h) cap`
        : `Rebalance schedule with ${args.energyLevel || currentFocusBudget.energyLevel} energy`,
      reasoning: explanation,
      constraints: [
        'Preserve fixed meetings',
        'Protect critical deadlines',
        args.maxCapacityMinutes ? `Cap at ${args.maxCapacityMinutes} minutes` : 'Balance standard workday',
      ],
      expectedBenefit: 'Avoids overbooking, prevents late-day fatigue, and guarantees focus.',
      tradeoffs: deferredTasks.map(d => `Deferred "${d.title}" (${d.duration}m)`),
      previousState,
      newState,
      deferredTasks: deferredTasks.map(d => ({
        taskId: d.id,
        title: d.title,
        reason: d.deferReason || 'Deferred in rebalance',
      })),
      executionSource: 'mcp_tool',
    };

    pendingProposals.set(actionId, proposedAction);

    const comparison = generatePlanComparison(previousState.tasks, newState.tasks, currentFixedEvents);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              status: 'proposed',
              actionId,
              summary: proposedAction.summary,
              explanation,
              comparison,
              deferredTasksCount: deferredTasks.length,
              instructions: 'Consequential changes are NOT yet applied. Call approve_proposed_action with actionId to apply.',
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool 5: approve_proposed_action
mcp.tool(
  'approve_proposed_action',
  'Confirm and apply a previously calculated schedule proposal to active state',
  {
    actionId: z.string().min(1, 'Action ID is required'),
  },
  async ({ actionId }) => {
    const proposal = pendingProposals.get(actionId);
    if (!proposal) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: `Proposal "${actionId}" not found or already executed.` }),
          },
        ],
      };
    }

    if (proposal.status !== 'proposed') {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: `Proposal "${actionId}" has already been ${proposal.status}.` }),
          },
        ],
      };
    }

    // Apply the proposed state
    proposal.status = 'applied';
    proposal.appliedAt = new Date().toISOString();
    currentTasks = JSON.parse(JSON.stringify(proposal.newState.tasks));
    currentFocusBudget = JSON.parse(JSON.stringify(proposal.newState.focusBudget));

    recordLedger(
      actionId,
      proposal.originalRequest,
      proposal.summary,
      proposal.reasoning,
      proposal.tradeoffs,
      'completed',
      proposal.previousState,
      proposal.newState,
      true
    );

    pendingProposals.delete(actionId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              actionId,
              message: 'Proposal successfully approved and applied to active schedule.',
              activeScheduledTasksCount: currentTasks.filter(t => t.status !== 'deferred').length,
              deferredTasksCount: currentTasks.filter(t => t.status === 'deferred').length,
              updatedFocusBudget: currentFocusBudget,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool 6: reject_proposed_action
mcp.tool(
  'reject_proposed_action',
  'Reject a pending schedule proposal without modifying the active schedule',
  {
    actionId: z.string().min(1),
    reason: z.string().optional(),
  },
  async ({ actionId, reason }) => {
    const proposal = pendingProposals.get(actionId);
    if (!proposal) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: `Proposal "${actionId}" not found.` }),
          },
        ],
      };
    }

    proposal.status = 'rejected';
    recordLedger(
      actionId,
      proposal.originalRequest,
      `Rejected: ${proposal.summary}`,
      reason || 'User rejected proposed rebalance.',
      [],
      'rejected',
      proposal.previousState,
      proposal.previousState,
      false
    );

    pendingProposals.delete(actionId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              actionId,
              message: 'Proposal rejected. Active schedule remains completely unmodified.',
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool 7: undo_last_action
mcp.tool(
  'undo_last_action',
  'Revert the most recent applied operation and restore previous schedule state',
  {},
  async () => {
    const reversibleEntry = decisionLedger.find(e => e.canUndo && e.status === 'completed');
    if (!reversibleEntry) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'No reversible action available in the decision ledger.' }),
          },
        ],
      };
    }

    // Restore snapshotBefore
    const priorState = reversibleEntry.snapshotBefore;
    currentTasks = JSON.parse(JSON.stringify(priorState.tasks));
    currentFocusBudget = JSON.parse(JSON.stringify(priorState.focusBudget));
    currentFixedEvents = JSON.parse(JSON.stringify(priorState.fixedEvents));

    reversibleEntry.status = 'undone';
    reversibleEntry.canUndo = false;

    recordLedger(
      `undo-${reversibleEntry.actionId}`,
      `Undo: ${reversibleEntry.request}`,
      `Reverted action "${reversibleEntry.summary}"`,
      `Restored state to snapshot taken prior to ${reversibleEntry.actionId}`,
      [],
      'undone',
      reversibleEntry.snapshotAfter,
      priorState,
      false
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              undoneActionId: reversibleEntry.actionId,
              restoredSummary: reversibleEntry.summary,
              currentTasksCount: currentTasks.length,
              updatedFocusBudget: currentFocusBudget,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool 8: get_focus_budget
mcp.tool(
  'get_focus_budget',
  'Retrieve user-controlled focus availability, cognitive demand breakdown, and pacing recommendations',
  {},
  async () => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(currentFocusBudget, null, 2),
        },
      ],
    };
  }
);

// Tool 9: summarize_day
mcp.tool(
  'summarize_day',
  'Generate an executive flight plan summary: tasks, fixed commitments, deadlines, and conflicts',
  {},
  async () => {
    const activeTasks = currentTasks.filter(t => t.status !== 'deferred' && t.status !== 'completed');
    const deferredTasks = currentTasks.filter(t => t.status === 'deferred');
    const completedTasks = currentTasks.filter(t => t.status === 'completed');

    const summary = {
      date: new Date().toISOString().split('T')[0],
      totalTasks: currentTasks.length,
      activeTasksCount: activeTasks.length,
      completedTasksCount: completedTasks.length,
      deferredTasksCount: deferredTasks.length,
      fixedCalendarMeetings: currentFixedEvents.map(e => `${e.title} (${e.startTime}-${e.endTime})`),
      totalAllocatedMinutes: currentFocusBudget.allocatedFocusMinutes,
      remainingMinutes: currentFocusBudget.remainingFocusMinutes,
      energyProfile: currentFocusBudget.energyLevel,
      nextRecommendedTask: activeTasks[0]?.title || 'None',
      advice: currentFocusBudget.energyAdvice,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }
);

// Tool 10: get_decision_history
mcp.tool(
  'get_decision_history',
  'Query the verifiable Decision Ledger audit log of all proposed and executed operations',
  {
    limit: z.number().int().min(1).max(50).default(15),
  },
  async ({ limit }) => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              totalEntries: decisionLedger.length,
              entries: decisionLedger.slice(0, limit),
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// -------------------------------------------------------------
// MCP RESOURCES
// -------------------------------------------------------------

mcp.resource(
  'daypilot-tasks-today',
  'daypilot://tasks/today',
  { mimeType: 'application/json', description: 'List of all tasks currently managed for today' },
  async () => {
    return {
      contents: [
        {
          uri: 'daypilot://tasks/today',
          text: JSON.stringify(currentTasks, null, 2),
        },
      ],
    };
  }
);

mcp.resource(
  'daypilot-schedule-today',
  'daypilot://schedule/today',
  { mimeType: 'application/json', description: 'Current chronological timeline slots for today' },
  async () => {
    const plan = calculateSchedule(currentTasks, currentFixedEvents, currentFocusBudget);
    return {
      contents: [
        {
          uri: 'daypilot://schedule/today',
          text: JSON.stringify(plan.plan.slots, null, 2),
        },
      ],
    };
  }
);

mcp.resource(
  'daypilot-budget-focus',
  'daypilot://budget/focus',
  { mimeType: 'application/json', description: 'Real-time focus and cognitive workload budget' },
  async () => {
    return {
      contents: [
        {
          uri: 'daypilot://budget/focus',
          text: JSON.stringify(currentFocusBudget, null, 2),
        },
      ],
    };
  }
);

// -------------------------------------------------------------
// MCP PROMPTS
// -------------------------------------------------------------

mcp.prompt(
  'daily_planning',
  'Strategic prompt template for balancing a full day against fixed constraints',
  { availableHours: z.string().optional() },
  async ({ availableHours }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please orchestrate my day${availableHours ? ` for ${availableHours} hours` : ''}. Review my fixed calendar commitments, score urgent deliverables, enforce cognitive pacing, and produce a non-overlapping Flight Plan.`,
          },
        },
      ],
    };
  }
);

mcp.prompt(
  'deadline_recovery',
  'Prompt template for recovering when behind schedule or facing urgent disruptions',
  { disruptedMinutes: z.string().optional() },
  async ({ disruptedMinutes }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `I just lost ${disruptedMinutes || '60'} minutes due to an emergency. Protect my highest priority deadlines, identify which low-impact tasks should be moved to tomorrow, and show me the delta.`,
          },
        },
      ],
    };
  }
);

mcp.prompt(
  'low_energy_planning',
  'Prompt template for pacing tasks during low-stamina periods',
  {},
  async () => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `I am experiencing low energy. Break down my high-cognitive-demand tasks into 25-minute Pomodoro intervals, schedule mandatory 10-minute restorative breaks, and defer non-essential work.`,
          },
        },
      ],
    };
  }
);

// -------------------------------------------------------------
// EXPRESS APP & TRANSPORTS
// -------------------------------------------------------------

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Track active SSE transport
let sseTransport: SSEServerTransport | null = null;

// Health endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    server: 'DayPilot-MCP-Server',
    protocolVersion: PROTOCOL_VERSION,
    port: PORT,
    timestamp: new Date().toISOString(),
    metrics: {
      tasksCount: currentTasks.length,
      fixedEventsCount: currentFixedEvents.length,
      pendingProposalsCount: pendingProposals.size,
      ledgerEntriesCount: decisionLedger.length,
      energyLevel: currentFocusBudget.energyLevel,
    },
    toolsCount: 10,
    resourcesCount: 3,
    promptsCount: 3,
  });
});

// Reset endpoint for automated tests and demo replays
app.post('/api/reset', (req: Request, res: Response) => {
  const init = createInitialSnapshot();
  currentTasks = init.tasks;
  currentFixedEvents = init.fixedEvents;
  currentFocusBudget = init.focusBudget;
  pendingProposals.clear();
  decisionLedger.length = 0;

  const plan = calculateSchedule(currentTasks, currentFixedEvents, currentFocusBudget);
  currentTasks = plan.plan.scheduledTasks;
  currentFocusBudget = plan.plan.focusBudget;

  res.json({ success: true, message: 'Server reset to initial fixtures.' });
});

// REST Discovery Endpoint (helps web clients explore available MCP tools without full handshake)
app.get('/api/mcp/manifest', (req: Request, res: Response) => {
  res.json({
    protocolVersion: PROTOCOL_VERSION,
    server: { name: 'DayPilot-MCP-Server', version: '1.0.0' },
    tools: [
      { name: 'get_daily_tasks', description: 'Retrieve current daily tasks with duration, priority, deadline, and scheduled slots' },
      { name: 'get_calendar_events', description: 'Retrieve non-negotiable fixed calendar commitments for today' },
      { name: 'create_task', description: 'Add a validated new task into DayPilot state without disturbing fixed calendar commitments' },
      { name: 'propose_schedule_rebalance', description: 'Calculate an optimized flight plan rebalance under available time or energy constraints' },
      { name: 'approve_proposed_action', description: 'Confirm and apply a previously calculated schedule proposal to active state' },
      { name: 'reject_proposed_action', description: 'Reject a pending schedule proposal without modifying the active schedule' },
      { name: 'undo_last_action', description: 'Revert the most recent applied operation and restore previous schedule state' },
      { name: 'get_focus_budget', description: 'Retrieve user-controlled focus availability, cognitive demand breakdown, and pacing recommendations' },
      { name: 'summarize_day', description: 'Generate an executive flight plan summary: tasks, fixed commitments, deadlines, and conflicts' },
      { name: 'get_decision_history', description: 'Query the verifiable Decision Ledger audit log of all proposed and executed operations' },
    ],
    resources: [
      { uri: 'daypilot://tasks/today', name: 'daypilot-tasks-today' },
      { uri: 'daypilot://schedule/today', name: 'daypilot-schedule-today' },
      { uri: 'daypilot://budget/focus', name: 'daypilot-budget-focus' },
    ],
    prompts: [
      { name: 'daily_planning', description: 'Strategic prompt template for balancing a full day' },
      { name: 'deadline_recovery', description: 'Prompt template for recovering when behind schedule' },
      { name: 'low_energy_planning', description: 'Prompt template for pacing tasks during low-stamina periods' },
    ],
  });
});

// REST Direct Tool Invoker for browser client
app.post('/api/mcp/invoke', async (req: Request, res: Response) => {
  const { tool, arguments: args } = req.body;
  const startTime = Date.now();

  try {
    switch (tool) {
      case 'get_daily_tasks': {
        const filtered = args?.status && args.status !== 'all'
          ? currentTasks.filter(t => t.status === args.status)
          : currentTasks;
        res.json({
          tool,
          durationMs: Date.now() - startTime,
          result: { count: filtered.length, tasks: filtered },
        });
        break;
      }
      case 'get_calendar_events': {
        res.json({
          tool,
          durationMs: Date.now() - startTime,
          result: { count: currentFixedEvents.length, events: currentFixedEvents },
        });
        break;
      }
      case 'get_focus_budget': {
        res.json({
          tool,
          durationMs: Date.now() - startTime,
          result: currentFocusBudget,
        });
        break;
      }
      case 'summarize_day': {
        const activeTasks = currentTasks.filter(t => t.status !== 'deferred' && t.status !== 'completed');
        res.json({
          tool,
          durationMs: Date.now() - startTime,
          result: {
            date: new Date().toISOString().split('T')[0],
            totalTasks: currentTasks.length,
            activeTasksCount: activeTasks.length,
            deferredTasksCount: currentTasks.filter(t => t.status === 'deferred').length,
            fixedCalendarMeetings: currentFixedEvents.map(e => `${e.title} (${e.startTime}-${e.endTime})`),
            totalAllocatedMinutes: currentFocusBudget.allocatedFocusMinutes,
            energyProfile: currentFocusBudget.energyLevel,
            advice: currentFocusBudget.energyAdvice,
          },
        });
        break;
      }
      case 'get_decision_history': {
        res.json({
          tool,
          durationMs: Date.now() - startTime,
          result: { totalEntries: decisionLedger.length, entries: decisionLedger },
        });
        break;
      }
      case 'propose_schedule_rebalance': {
        const previousState: StateSnapshot = {
          tasks: JSON.parse(JSON.stringify(currentTasks)),
          fixedEvents: JSON.parse(JSON.stringify(currentFixedEvents)),
          focusBudget: JSON.parse(JSON.stringify(currentFocusBudget)),
          explanation: 'State prior to rebalance proposal',
        };

        const { plan, deferredTasks, explanation } = calculateSchedule(
          currentTasks,
          currentFixedEvents,
          currentFocusBudget,
          {
            maxCapacityMinutes: args?.maxCapacityMinutes,
            energyLevel: args?.energyLevel,
            preferredBreakMinutes: args?.preferredBreakMinutes,
          }
        );

        const newState: StateSnapshot = {
          tasks: [...plan.scheduledTasks, ...deferredTasks],
          fixedEvents: currentFixedEvents,
          focusBudget: plan.focusBudget,
          explanation,
        };

        const actionId = `prop-${Date.now()}`;
        const proposedAction: ProposedAction = {
          id: actionId,
          timestamp: new Date().toISOString(),
          originalRequest: args?.reason || 'API direct invocation of propose_schedule_rebalance',
          actionType: 'rebalance',
          status: 'proposed',
          summary: args?.maxCapacityMinutes
            ? `Rebalance schedule for ${args.maxCapacityMinutes}m cap`
            : `Rebalance schedule with ${args?.energyLevel || currentFocusBudget.energyLevel} energy`,
          reasoning: explanation,
          constraints: ['Preserve fixed calendar commitments', 'Protect critical deadlines'],
          expectedBenefit: 'Maintains feasible workload and prevents overload.',
          tradeoffs: deferredTasks.map(d => `Deferred "${d.title}" (${d.duration}m)`),
          previousState,
          newState,
          deferredTasks: deferredTasks.map(d => ({
            taskId: d.id,
            title: d.title,
            reason: d.deferReason || 'Deferred in rebalance',
          })),
          executionSource: 'mcp_tool',
        };

        pendingProposals.set(actionId, proposedAction);
        const comparison = generatePlanComparison(previousState.tasks, newState.tasks, currentFixedEvents);

        res.json({
          tool,
          durationMs: Date.now() - startTime,
          result: {
            status: 'proposed',
            actionId,
            summary: proposedAction.summary,
            explanation,
            comparison,
            deferredTasksCount: deferredTasks.length,
            proposal: proposedAction,
          },
        });
        break;
      }
      case 'approve_proposed_action': {
        const { actionId } = args || {};
        const proposal = pendingProposals.get(actionId);
        if (!proposal) {
          res.status(404).json({ error: `Proposal ${actionId} not found` });
          return;
        }

        proposal.status = 'applied';
        proposal.appliedAt = new Date().toISOString();
        currentTasks = JSON.parse(JSON.stringify(proposal.newState.tasks));
        currentFocusBudget = JSON.parse(JSON.stringify(proposal.newState.focusBudget));

        recordLedger(
          actionId,
          proposal.originalRequest,
          proposal.summary,
          proposal.reasoning,
          proposal.tradeoffs,
          'completed',
          proposal.previousState,
          proposal.newState,
          true
        );

        pendingProposals.delete(actionId);

        res.json({
          tool,
          durationMs: Date.now() - startTime,
          result: {
            success: true,
            actionId,
            message: 'Proposal approved and applied.',
            updatedTasks: currentTasks,
            updatedFocusBudget: currentFocusBudget,
          },
        });
        break;
      }
      case 'reject_proposed_action': {
        const { actionId, reason } = args || {};
        const proposal = pendingProposals.get(actionId);
        if (!proposal) {
          res.status(404).json({ error: `Proposal ${actionId} not found` });
          return;
        }

        proposal.status = 'rejected';
        recordLedger(
          actionId,
          proposal.originalRequest,
          `Rejected: ${proposal.summary}`,
          reason || 'User rejected proposed rebalance.',
          [],
          'rejected',
          proposal.previousState,
          proposal.previousState,
          false
        );

        pendingProposals.delete(actionId);

        res.json({
          tool,
          durationMs: Date.now() - startTime,
          result: { success: true, message: 'Proposal rejected. Schedule untouched.' },
        });
        break;
      }
      case 'undo_last_action': {
        const reversibleEntry = decisionLedger.find(e => e.canUndo && e.status === 'completed');
        if (!reversibleEntry) {
          res.status(400).json({ error: 'No reversible action available in ledger' });
          return;
        }

        const priorState = reversibleEntry.snapshotBefore;
        currentTasks = JSON.parse(JSON.stringify(priorState.tasks));
        currentFocusBudget = JSON.parse(JSON.stringify(priorState.focusBudget));
        currentFixedEvents = JSON.parse(JSON.stringify(priorState.fixedEvents));

        reversibleEntry.status = 'undone';
        reversibleEntry.canUndo = false;

        recordLedger(
          `undo-${reversibleEntry.actionId}`,
          `Undo: ${reversibleEntry.request}`,
          `Reverted action "${reversibleEntry.summary}"`,
          'Restored state to snapshot prior to execution',
          [],
          'undone',
          reversibleEntry.snapshotAfter,
          priorState,
          false
        );

        res.json({
          tool,
          durationMs: Date.now() - startTime,
          result: {
            success: true,
            undoneActionId: reversibleEntry.actionId,
            restoredSummary: reversibleEntry.summary,
            updatedTasks: currentTasks,
            updatedFocusBudget: currentFocusBudget,
          },
        });
        break;
      }
      case 'create_task': {
        const newTask: Task = {
          id: `task-${Date.now()}`,
          title: args.title || 'Untitled Task',
          duration: args.duration || 30,
          priority: args.priority || 'medium',
          deadline: args.deadline || '18:00',
          category: args.category || 'work',
          cognitiveDemand: args.cognitiveDemand || 'moderate',
          status: 'pending',
          description: args.description,
        };

        const beforeSnap: StateSnapshot = {
          tasks: JSON.parse(JSON.stringify(currentTasks)),
          fixedEvents: JSON.parse(JSON.stringify(currentFixedEvents)),
          focusBudget: JSON.parse(JSON.stringify(currentFocusBudget)),
          explanation: 'State before adding task',
        };

        currentTasks.push(newTask);
        const { plan } = calculateSchedule(currentTasks, currentFixedEvents, currentFocusBudget);
        currentTasks = plan.scheduledTasks;
        currentFocusBudget = plan.focusBudget;

        const afterSnap: StateSnapshot = {
          tasks: JSON.parse(JSON.stringify(currentTasks)),
          fixedEvents: JSON.parse(JSON.stringify(currentFixedEvents)),
          focusBudget: JSON.parse(JSON.stringify(currentFocusBudget)),
          explanation: `Added task "${newTask.title}"`,
        };

        recordLedger(
          `action-create-${newTask.id}`,
          `create_task: ${newTask.title}`,
          `Created task "${newTask.title}"`,
          'Task created via tool',
          [],
          'completed',
          beforeSnap,
          afterSnap,
          true
        );

        res.json({
          tool,
          durationMs: Date.now() - startTime,
          result: { success: true, createdTask: newTask, updatedTasks: currentTasks },
        });
        break;
      }
      default:
        res.status(404).json({ error: `Tool ${tool} not recognized by DayPilot-MCP` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal error in MCP invocation' });
  }
});

// SSE Transport Endpoint for standard MCP client connections
app.get('/sse', async (req: Request, res: Response) => {
  console.log('[DayPilot-MCP] Incoming SSE connection request.');
  sseTransport = new SSEServerTransport('/messages', res);
  await mcp.connect(sseTransport);

  req.on('close', () => {
    console.log('[DayPilot-MCP] SSE connection closed.');
    sseTransport = null;
  });
});

app.post('/messages', async (req: Request, res: Response) => {
  if (sseTransport) {
    await sseTransport.handlePostMessage(req, res);
  } else {
    res.status(400).send('No active SSE connection');
  }
});

// Start Server
export const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  DAYPILOT AI - MODEL CONTEXT PROTOCOL (MCP) SERVER `);
  console.log(`====================================================`);
  console.log(`  Protocol Version : ${PROTOCOL_VERSION}`);
  console.log(`  Transport        : Streamable HTTP (SSE & JSON-RPC)`);
  console.log(`  Port             : http://localhost:${PORT}`);
  console.log(`  Health Check     : http://localhost:${PORT}/health`);
  console.log(`  MCP Manifest     : http://localhost:${PORT}/api/mcp/manifest`);
  console.log(`  SSE Endpoint     : http://localhost:${PORT}/sse`);
  console.log(`  Direct Invoker   : http://localhost:${PORT}/api/mcp/invoke`);
  console.log(`====================================================`);
});

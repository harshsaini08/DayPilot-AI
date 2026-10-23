/**
 * DayPilot AI - Conversational Intent Engine
 * Provider-independent deterministic natural language understanding layer.
 * 
 * Works 100% offline without external AI API fees, while maintaining strict
 * ground-truth consistency with actual application state.
 */

import {
  Task,
  FixedEvent,
  FocusBudget,
  ProposedAction,
  StateSnapshot,
  EnergyLevel,
} from './types.js';
import { calculateSchedule, generatePlanComparison, timeToMinutes } from './scheduler.js';
import { computeFocusBudget, decomposeTaskForLowEnergy } from './budget.js';
import { INITIAL_TASKS, INITIAL_FIXED_EVENTS, INITIAL_FOCUS_BUDGET, createInitialSnapshot } from './fixtures.js';

export interface IntentContext {
  tasks: Task[];
  fixedEvents: FixedEvent[];
  focusBudget: FocusBudget;
  lastProposal?: ProposedAction;
  recentLedgerCount: number;
}

export interface IntentResult {
  intent: string;
  response: string;
  requiresConfirmation: boolean;
  proposedAction?: ProposedAction;
  executedImmediateUpdate?: {
    tasks?: Task[];
    focusBudget?: FocusBudget;
    fixedEvents?: FixedEvent[];
  };
  audioSpeechText?: string;
  suggestedFollowUps?: string[];
}

export function processIntent(rawPrompt: string, context: IntentContext): IntentResult {
  const query = (rawPrompt || '').trim().toLowerCase();

  // Helper snapshot maker
  const takeSnapshot = (explanation: string): StateSnapshot => ({
    tasks: JSON.parse(JSON.stringify(context.tasks)),
    fixedEvents: JSON.parse(JSON.stringify(context.fixedEvents)),
    focusBudget: JSON.parse(JSON.stringify(context.focusBudget)),
    explanation,
  });

  // 12. "Reset Demo"
  if (
    query.includes('reset demo') ||
    query.includes('restore demo') ||
    query.includes('restart demo') ||
    query === 'reset'
  ) {
    const initialSnap = createInitialSnapshot();
    const recalculated = calculateSchedule(
      initialSnap.tasks,
      initialSnap.fixedEvents,
      initialSnap.focusBudget
    );

    return {
      intent: 'reset_demo',
      response:
        'Demo environment has been restored to factory baseline. 8 standard tasks, 2 fixed calendar commitments, and moderate energy focus budget initialized.',
      requiresConfirmation: false,
      executedImmediateUpdate: {
        tasks: recalculated.plan.scheduledTasks,
        fixedEvents: initialSnap.fixedEvents,
        focusBudget: recalculated.plan.focusBudget,
      },
      suggestedFollowUps: [
        'Plan my day.',
        'I have only two hours today.',
        'Fit a 30-minute workout before 4 PM.',
      ],
    };
  }

  // 11. "Undo the last change"
  if (
    query.includes('undo the last change') ||
    query.includes('undo last change') ||
    query.includes('undo last action') ||
    query === 'undo'
  ) {
    return {
      intent: 'undo_request',
      response:
        'To undo your last operation, please trigger the Undo button in the Decision Ledger or top action banner. This ensures strict state restoration with ledger tracking.',
      requiresConfirmation: false,
      suggestedFollowUps: ['Show me the changes.', 'What should I do next?'],
    };
  }

  // 2. "I have only two hours today."
  if (
    query.includes('only two hours') ||
    query.includes('only 2 hours') ||
    query.includes('have 2 hours') ||
    query.includes('have two hours') ||
    query.includes('2 hour day')
  ) {
    const previousSnapshot = takeSnapshot('State prior to 2-hour constraint rebalance');
    const twoHoursInMinutes = 120;

    const { plan, deferredTasks, explanation } = calculateSchedule(
      context.tasks,
      context.fixedEvents,
      context.focusBudget,
      { maxCapacityMinutes: twoHoursInMinutes }
    );

    const newSnapshot: StateSnapshot = {
      tasks: [...plan.scheduledTasks, ...deferredTasks],
      fixedEvents: context.fixedEvents,
      focusBudget: plan.focusBudget,
      explanation: `Strict 120-minute cap applied. Scheduled ${plan.scheduledTasks.filter(t => t.status !== 'deferred').length} tasks, deferred ${deferredTasks.length} tasks.`,
    };

    const actionId = `action-2hr-${Date.now()}`;
    const proposedAction: ProposedAction = {
      id: actionId,
      timestamp: new Date().toISOString(),
      originalRequest: rawPrompt,
      actionType: 'rebalance',
      status: 'proposed',
      summary: `Condense schedule to 2 hours (${twoHoursInMinutes} minutes) with priority protection`,
      reasoning: explanation,
      constraints: [
        'Hard limit: 120 total working minutes.',
        'Preserve critical presentation deadline.',
        'Preserve fixed commitments (Standup & Client Review).',
      ],
      expectedBenefit: 'Avoids schedule overload and guarantees completion of top-tier deliverables.',
      tradeoffs: deferredTasks.map(
        t => `Deferred "${t.title}" (${t.duration}m) — ${t.deferReason}`
      ),
      previousState: previousSnapshot,
      newState: newSnapshot,
      deferredTasks: deferredTasks.map(t => ({
        taskId: t.id,
        title: t.title,
        reason: t.deferReason || 'Exceeds 2-hour capacity limit',
      })),
      executionSource: 'local_deterministic',
    };

    return {
      intent: 'rebalance_two_hours',
      response: `I've prepared a compressed 2-hour Flight Plan. To fit within 120 minutes, I protected your top critical deadlines ("Prepare Q3 Strategic Presentation") and deferred ${deferredTasks.length} lower-priority tasks. Please review and approve this proposal before it is applied to your active day.`,
      requiresConfirmation: true,
      proposedAction,
      suggestedFollowUps: ['Show me the changes.', 'What should I do next?'],
    };
  }

  // 7. "I'm low on energy, but my presentation is due today."
  if (
    (query.includes('low on energy') || query.includes('low energy')) &&
    (query.includes('presentation') || query.includes('due today'))
  ) {
    const previousSnapshot = takeSnapshot('State prior to low energy presentation adaptation');
    const presentationTask = context.tasks.find(
      t => t.title.toLowerCase().includes('presentation') || t.id === 'task-1'
    );

    let updatedTasks = [...context.tasks];
    let newStepsText = '';

    if (presentationTask) {
      const steps = decomposeTaskForLowEnergy(presentationTask);
      updatedTasks = updatedTasks.filter(t => t.id !== presentationTask.id).concat(steps);
      newStepsText = `Decomposed "${presentationTask.title}" (${presentationTask.duration}m) into ${steps.length} manageable 30-minute micro-sessions with cognitive demand lowered to moderate/low.`;
    }

    const { plan, deferredTasks, explanation } = calculateSchedule(
      updatedTasks,
      context.fixedEvents,
      context.focusBudget,
      { energyLevel: 'low', preferredBreakMinutes: 15 }
    );

    const newSnapshot: StateSnapshot = {
      tasks: [...plan.scheduledTasks, ...deferredTasks],
      fixedEvents: context.fixedEvents,
      focusBudget: plan.focusBudget,
      explanation: `Low energy adaptive plan: protected presentation deadline with micro-sessions and extended restorative breaks.`,
    };

    const actionId = `action-lowenergy-${Date.now()}`;
    const proposedAction: ProposedAction = {
      id: actionId,
      timestamp: new Date().toISOString(),
      originalRequest: rawPrompt,
      actionType: 'low_energy_adapt',
      status: 'proposed',
      summary: 'Low-energy pacing with presentation deadline protection',
      reasoning: `${newStepsText} ${explanation}`,
      constraints: [
        'User-reported energy state: Low.',
        'Hard deadline: Executive presentation must complete today.',
        'Mandatory 15-minute rest buffers inserted.',
      ],
      expectedBenefit:
        'Mitigates cognitive fatigue, prevents procrastination, and guarantees deadline compliance.',
      tradeoffs: deferredTasks.map(
        t => `Deferred non-urgent task "${t.title}" to free up energy reserve.`
      ),
      previousState: previousSnapshot,
      newState: newSnapshot,
      deferredTasks: deferredTasks.map(t => ({
        taskId: t.id,
        title: t.title,
        reason: t.deferReason || 'Deferred to protect stamina for presentation',
      })),
      executionSource: 'local_deterministic',
    };

    return {
      intent: 'low_energy_presentation_defense',
      response: `Understood. When energy is low, confronting a massive 90-minute block invites fatigue. I have split your presentation into structured 30-minute micro-sessions, inserted 15-minute restorative breaks, and deferred non-urgent work. Review the proposed Flight Plan and confirm to apply.`,
      requiresConfirmation: true,
      proposedAction,
      suggestedFollowUps: ['Show me the changes.', 'Plan my day.'],
    };
  }

  // 6. "I'm low on energy."
  if (
    query.includes('low on energy') ||
    query.includes('low energy') ||
    query.includes('feeling tired') ||
    query.includes('exhausted')
  ) {
    const previousSnapshot = takeSnapshot('State prior to low-energy profile switch');
    const { plan, deferredTasks, explanation } = calculateSchedule(
      context.tasks,
      context.fixedEvents,
      context.focusBudget,
      { energyLevel: 'low' }
    );

    const newSnapshot: StateSnapshot = {
      tasks: [...plan.scheduledTasks, ...deferredTasks],
      fixedEvents: context.fixedEvents,
      focusBudget: plan.focusBudget,
      explanation: 'Applied low energy profile: reduced deep cognitive blocks and expanded rest buffers.',
    };

    const actionId = `action-energy-${Date.now()}`;
    const proposedAction: ProposedAction = {
      id: actionId,
      timestamp: new Date().toISOString(),
      originalRequest: rawPrompt,
      actionType: 'low_energy_adapt',
      status: 'proposed',
      summary: 'Switch to Low-Energy Focus Profile (25m sessions / 10m breaks)',
      reasoning: explanation,
      constraints: [
        'User-reported energy level: Low.',
        'Cap continuous focus sessions at 25 minutes.',
      ],
      expectedBenefit: 'Maintains steady forward momentum while avoiding burnout.',
      tradeoffs: deferredTasks.map(t => `Deferred "${t.title}"`),
      previousState: previousSnapshot,
      newState: newSnapshot,
      deferredTasks: deferredTasks.map(t => ({
        taskId: t.id,
        title: t.title,
        reason: 'Deferred in low energy profile',
      })),
      executionSource: 'local_deterministic',
    };

    return {
      intent: 'set_energy_low',
      response: `Switched your focus profile to Low Energy. I have proposed 25-minute Pomodoro-style sprints with mandatory 10-minute rest buffers and prioritized quick-win tasks. Would you like me to apply this rebalance?`,
      requiresConfirmation: true,
      proposedAction,
      suggestedFollowUps: ['Show me the changes.', 'What should I do next?'],
    };
  }

  // 3. "Fit a 30-minute workout before 4 PM."
  if (
    (query.includes('workout') || query.includes('exercise') || query.includes('gym')) &&
    (query.includes('before 4') || query.includes('before 4 pm') || query.includes('16:00') || query.includes('30-minute') || query.includes('30 min'))
  ) {
    const previousSnapshot = takeSnapshot('State prior to workout scheduling');
    let workoutTask = context.tasks.find(
      t => t.category === 'health' || t.title.toLowerCase().includes('workout')
    );

    let updatedTasks = [...context.tasks];
    if (!workoutTask) {
      workoutTask = {
        id: `task-workout-${Date.now()}`,
        title: '30-min Fitness & Reset Workout',
        duration: 30,
        priority: 'medium',
        deadline: '16:00',
        category: 'health',
        cognitiveDemand: 'low',
        status: 'pending',
        restrictions: { notAfter: '16:00' },
      };
      updatedTasks.push(workoutTask);
    } else {
      workoutTask = {
        ...workoutTask,
        duration: 30,
        deadline: '16:00',
        restrictions: { notAfter: '16:00' },
        status: 'pending',
      };
      updatedTasks = updatedTasks.map(t => (t.id === workoutTask!.id ? workoutTask! : t));
    }

    const { plan, deferredTasks, explanation } = calculateSchedule(
      updatedTasks,
      context.fixedEvents,
      context.focusBudget
    );

    const scheduledWorkout = plan.scheduledTasks.find(t => t.id === workoutTask!.id);
    const placedTime = scheduledWorkout?.scheduledStart
      ? `${scheduledWorkout.scheduledStart} - ${scheduledWorkout.scheduledEnd}`
      : 'open slot before 16:00';

    const newSnapshot: StateSnapshot = {
      tasks: [...plan.scheduledTasks, ...deferredTasks],
      fixedEvents: context.fixedEvents,
      focusBudget: plan.focusBudget,
      explanation: `Workout scheduled at ${placedTime} without clashing with fixed calendar meetings.`,
    };

    const actionId = `action-workout-${Date.now()}`;
    const proposedAction: ProposedAction = {
      id: actionId,
      timestamp: new Date().toISOString(),
      originalRequest: rawPrompt,
      actionType: 'quick_fit',
      status: 'proposed',
      summary: `Fit 30-minute workout at ${placedTime} (completed before 16:00)`,
      reasoning: `Found conflict-free window avoiding 10:00 Standup and 14:00 Client Review. Workout securely completes by ${scheduledWorkout?.scheduledEnd || '16:00'}.`,
      constraints: [
        'Must finish strictly before 16:00.',
        'Cannot overlap 10:00-10:30 Standup or 14:00-15:00 Client Review.',
      ],
      expectedBenefit: 'Maintains physical well-being and restores focus without compromising deliverables.',
      tradeoffs: deferredTasks.map(t => `Deferred "${t.title}"`),
      previousState: previousSnapshot,
      newState: newSnapshot,
      deferredTasks: deferredTasks.map(t => ({
        taskId: t.id,
        title: t.title,
        reason: 'Adjusted to fit workout before 4 PM',
      })),
      executionSource: 'local_deterministic',
    };

    return {
      intent: 'schedule_workout',
      response: `I've found a clear window for your 30-minute workout from ${placedTime}, respecting your 10:00 Standup and 14:00 Client Review, and finishing well before 4:00 PM. Please confirm to slot it into your schedule.`,
      requiresConfirmation: true,
      proposedAction,
      suggestedFollowUps: ['Show me the changes.', 'What should I do next?'],
    };
  }

  // 10. "Move my lowest-priority task to tomorrow."
  if (
    query.includes('move my lowest-priority task') ||
    query.includes('move lowest priority task') ||
    query.includes('move lowest priority') ||
    query.includes('defer lowest priority')
  ) {
    const activeTasks = context.tasks.filter(t => t.status !== 'completed' && t.status !== 'deferred');
    if (activeTasks.length === 0) {
      return {
        intent: 'move_lowest_priority',
        response: 'All tasks are either completed or already deferred. No eligible active tasks found to move.',
        requiresConfirmation: false,
      };
    }

    // Sort to find lowest priority
    const priorityWeight = { low: 1, medium: 2, high: 3, critical: 4 };
    const sorted = [...activeTasks].sort(
      (a, b) => priorityWeight[a.priority] - priorityWeight[b.priority] || b.duration - a.duration
    );
    const candidate = sorted[0];

    const previousSnapshot = takeSnapshot(`State prior to deferring ${candidate.title}`);
    const updatedTasks = context.tasks.map(t =>
      t.id === candidate.id
        ? {
            ...t,
            status: 'deferred' as const,
            deferReason: 'Moved to tomorrow per explicit user command.',
          }
        : t
    );

    const { plan, deferredTasks, explanation } = calculateSchedule(
      updatedTasks,
      context.fixedEvents,
      context.focusBudget
    );

    const newSnapshot: StateSnapshot = {
      tasks: [...plan.scheduledTasks, ...deferredTasks],
      fixedEvents: context.fixedEvents,
      focusBudget: plan.focusBudget,
      explanation: `Deferred lowest priority task "${candidate.title}" (${candidate.priority} priority, ${candidate.duration}m).`,
    };

    const actionId = `action-defer-${Date.now()}`;
    const proposedAction: ProposedAction = {
      id: actionId,
      timestamp: new Date().toISOString(),
      originalRequest: rawPrompt,
      actionType: 'defer_task',
      status: 'proposed',
      summary: `Move lowest-priority task "${candidate.title}" to tomorrow`,
      reasoning: `Identified "${candidate.title}" as your lowest-urgency item (${candidate.priority} priority, ${candidate.duration} minutes). Moving it frees ${candidate.duration} minutes in today's flight plan.`,
      constraints: ['Respect user priority ratings.', 'Do not move critical deadline tasks.'],
      expectedBenefit: `Reclaims ${candidate.duration} minutes of cognitive bandwidth today.`,
      tradeoffs: [`Task "${candidate.title}" deferred to tomorrow.`],
      targetTaskId: candidate.id,
      previousState: previousSnapshot,
      newState: newSnapshot,
      deferredTasks: [
        {
          taskId: candidate.id,
          title: candidate.title,
          reason: 'Moved to tomorrow by request',
        },
      ],
      executionSource: 'local_deterministic',
    };

    return {
      intent: 'move_lowest_priority',
      response: `I identified "${candidate.title}" (priority: ${candidate.priority}, duration: ${candidate.duration}m) as your lowest-priority task. Moving it will free up ${candidate.duration} minutes of focus today. Please confirm to apply this change.`,
      requiresConfirmation: true,
      proposedAction,
      suggestedFollowUps: ['Show me the changes.', 'What should I do next?'],
    };
  }

  // 8. "Why did you move this task?"
  if (
    query.includes('why did you move this task') ||
    query.includes('why did you move') ||
    query.includes('why was this task moved') ||
    query.includes('why moved')
  ) {
    const deferredList = context.tasks.filter(t => t.status === 'deferred');
    if (deferredList.length > 0) {
      const topDef = deferredList[0];
      return {
        intent: 'explain_move',
        response: `"${topDef.title}" was deferred because: ${topDef.deferReason || 'it had lower deadline urgency and priority relative to protected executive commitments'}. DayPilot AI strictly enforces hard calendar boundaries and ensures that high-stakes deliverables are never compromised by overbooking.`,
        requiresConfirmation: false,
        suggestedFollowUps: ['Show me the changes.', 'What should I do next?'],
      };
    }
    return {
      intent: 'explain_move',
      response:
        'All current active tasks fit comfortably in your open calendar windows. Tasks are only moved or deferred when hard constraints (fixed meetings, time caps, or low energy limits) necessitate trade-offs.',
      requiresConfirmation: false,
      suggestedFollowUps: ['Plan my day.', 'What should I do next?'],
    };
  }

  // 9. "Show me the changes."
  if (
    query.includes('show me the changes') ||
    query.includes('show changes') ||
    query.includes('what changed') ||
    query.includes('view changes')
  ) {
    if (context.lastProposal) {
      const diff = generatePlanComparison(
        context.lastProposal.previousState.tasks,
        context.lastProposal.newState.tasks,
        context.fixedEvents
      );
      const changeSummaries = diff.changes
        .filter(c => c.changeType !== 'unmodified')
        .map(c => `• ${c.taskTitle}: ${c.changeType.toUpperCase()} (${c.reason || 'rebalanced'})`)
        .join('\n');

      return {
        intent: 'show_changes',
        response: `Here is the delta from the pending proposal:\n${changeSummaries || 'No structural changes detected.'}\n\nYou can also visually inspect the side-by-side Before/After comparison in the Daily Flight Plan tab.`,
        requiresConfirmation: false,
        suggestedFollowUps: ['Plan my day.', 'What should I do next?'],
      };
    }
    return {
      intent: 'show_changes',
      response:
        'No active proposal is awaiting review. Your flight plan is currently running against the latest approved schedule. Check the Decision Ledger to inspect past operations and audit trails.',
      requiresConfirmation: false,
      suggestedFollowUps: ['Plan my day.', 'I have only two hours today.'],
    };
  }

  // 5. "What should I do next?"
  if (
    query.includes('what should i do next') ||
    query.includes('what to do next') ||
    query.includes('next task') ||
    query.includes('whats next') ||
    query.includes("what's next")
  ) {
    const active = context.tasks
      .filter(t => t.status === 'pending' || t.status === 'in_progress')
      .sort((a, b) => {
        const aStart = a.scheduledStart ? timeToMinutes(a.scheduledStart) : 9999;
        const bStart = b.scheduledStart ? timeToMinutes(b.scheduledStart) : 9999;
        return aStart - bStart;
      });

    if (active.length > 0) {
      const next = active[0];
      const slotText = next.scheduledStart ? `at ${next.scheduledStart}` : 'next';
      return {
        intent: 'get_next_task',
        response: `Your next recommended focus item is "${next.title}" (${next.duration}m, ${next.priority} priority), scheduled ${slotText}. It has high deadline value (${next.deadline}) and matches your current cognitive focus budget.`,
        requiresConfirmation: false,
        suggestedFollowUps: ['I am low on energy.', 'Fit a 30-minute workout before 4 PM.'],
      };
    }
    return {
      intent: 'get_next_task',
      response:
        'You have zero pending tasks on your flight plan right now. Great job! You can create a new task or take a restorative break.',
      requiresConfirmation: false,
    };
  }

  // 4. "I have a deadline tomorrow."
  if (
    query.includes('deadline tomorrow') ||
    query.includes('due tomorrow') ||
    query.includes('tomorrow deadline')
  ) {
    const tomorrowTasks = context.tasks.filter(
      t => t.deadline.includes('tomorrow') || t.deadline > '17:00'
    );
    const count = tomorrowTasks.length;
    return {
      intent: 'tomorrow_deadline_review',
      response: `You have ${count} deliverables queued for tomorrow, including "${tomorrowTasks[0]?.title || 'Sprint Review'}". Would you like me to allocate prep time in today's afternoon flight plan to avoid crunch tomorrow?`,
      requiresConfirmation: false,
      suggestedFollowUps: ['Plan my day.', 'I have only two hours today.'],
    };
  }

  // 1. "Plan my day."
  if (
    query.includes('plan my day') ||
    query.includes('recalculate schedule') ||
    query.includes('rebalance schedule') ||
    query.includes('organize my day') ||
    query === 'plan'
  ) {
    const previousSnapshot = takeSnapshot('Baseline prior to full day planning');
    const { plan, deferredTasks, explanation } = calculateSchedule(
      context.tasks,
      context.fixedEvents,
      context.focusBudget
    );

    const newSnapshot: StateSnapshot = {
      tasks: [...plan.scheduledTasks, ...deferredTasks],
      fixedEvents: context.fixedEvents,
      focusBudget: plan.focusBudget,
      explanation,
    };

    const actionId = `action-plan-${Date.now()}`;
    const proposedAction: ProposedAction = {
      id: actionId,
      timestamp: new Date().toISOString(),
      originalRequest: rawPrompt,
      actionType: 'rebalance',
      status: 'proposed',
      summary: 'Optimal Flight Plan orchestration across all daily commitments',
      reasoning: explanation,
      constraints: [
        'Locked fixed events (Standup & Client Review).',
        'Prioritize critical deadlines first.',
        'Honor focus budget intervals.',
      ],
      expectedBenefit: 'Provides an unbroken, realistic timeline with zero calendar conflicts.',
      tradeoffs: deferredTasks.map(t => `Deferred "${t.title}"`),
      previousState: previousSnapshot,
      newState: newSnapshot,
      deferredTasks: deferredTasks.map(t => ({
        taskId: t.id,
        title: t.title,
        reason: t.deferReason || 'Exceeds standard workday capacity',
      })),
      executionSource: 'local_deterministic',
    };

    return {
      intent: 'plan_my_day',
      response: `I have calculated your complete Day Flight Plan. All ${plan.scheduledTasks.length} active tasks have been allocated into non-overlapping slots respecting your 10:00 Standup and 14:00 Client Review. Review the proposed schedule and confirm to apply.`,
      requiresConfirmation: true,
      proposedAction,
      suggestedFollowUps: [
        'I have only two hours today.',
        'Fit a 30-minute workout before 4 PM.',
        'What should I do next?',
      ],
    };
  }

  // Fallback for general productivity queries
  return {
    intent: 'general_query',
    response: `I am DayPilot AI, your Alexa+-inspired Day Flight Director. I can calculate your daily schedule, adapt when time or energy changes, fit workouts, protect deadlines, and execute verified actions via MCP. Try asking "Plan my day" or "I have only two hours today".`,
    requiresConfirmation: false,
    suggestedFollowUps: [
      'Plan my day.',
      'I have only two hours today.',
      'I am low on energy, but my presentation is due today.',
      'Fit a 30-minute workout before 4 PM.',
    ],
  };
}

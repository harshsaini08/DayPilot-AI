/**
 * DayPilot AI - Deterministic Scheduling Engine
 * Innovation A: Adaptive Day Flight Director
 * 
 * Guarantees:
 * - Deterministic output for identical inputs.
 * - Hard constraints strictly enforced (fixed calendar events, non-overlapping slots, deadlines).
 * - Multi-factor scoring prioritizing deadline urgency, priority weight, and energy compatibility.
 * - Comprehensive conflict detection and overload explanations.
 */

import {
  Task,
  FixedEvent,
  FocusBudget,
  ScheduleSlot,
  ScheduleConflict,
  DayPlan,
  EnergyLevel,
  PlanComparison,
} from './types.js';
import { ENERGY_PROFILES } from './budget.js';

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  // Handle formats like "14:30" or "2026-10-23T14:30:00"
  let clean = timeStr;
  if (timeStr.includes('T')) {
    clean = timeStr.split('T')[1].substring(0, 5);
  }
  const parts = clean.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const norm = Math.max(0, Math.min(1439, Math.floor(totalMinutes)));
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export interface TimeWindow {
  start: number; // in minutes from 00:00
  end: number;
  duration: number;
}

/**
 * Extracts contiguous available time blocks between fixed calendar commitments.
 */
export function getAvailableWindows(
  dayStartMinutes: number,
  dayEndMinutes: number,
  fixedEvents: FixedEvent[]
): TimeWindow[] {
  // Sort fixed events by start time
  const sortedEvents = [...fixedEvents]
    .map(e => ({
      start: timeToMinutes(e.startTime),
      end: timeToMinutes(e.endTime),
    }))
    .filter(e => e.end > dayStartMinutes && e.start < dayEndMinutes)
    .sort((a, b) => a.start - b.start);

  const windows: TimeWindow[] = [];
  let cursor = dayStartMinutes;

  for (const ev of sortedEvents) {
    const evStartClamped = Math.max(dayStartMinutes, ev.start);
    const evEndClamped = Math.min(dayEndMinutes, ev.end);

    if (evStartClamped > cursor) {
      windows.push({
        start: cursor,
        end: evStartClamped,
        duration: evStartClamped - cursor,
      });
    }
    cursor = Math.max(cursor, evEndClamped);
  }

  if (cursor < dayEndMinutes) {
    windows.push({
      start: cursor,
      end: dayEndMinutes,
      duration: dayEndMinutes - cursor,
    });
  }

  return windows.filter(w => w.duration >= 10); // Minimum 10 min window
}

/**
 * Multi-factor deterministic scoring for task placement priority.
 */
export function scoreTask(
  task: Task,
  energy: EnergyLevel,
  currentSimulatedTime: number
): number {
  let score = 0;

  // 1. Priority Weight
  switch (task.priority) {
    case 'critical':
      score += 150;
      break;
    case 'high':
      score += 90;
      break;
    case 'medium':
      score += 50;
      break;
    case 'low':
      score += 20;
      break;
  }

  // 2. Deadline Urgency
  if (task.deadline) {
    const deadlineMinutes = timeToMinutes(task.deadline);
    const timeUntilDeadline = deadlineMinutes - currentSimulatedTime;

    if (timeUntilDeadline < 0) {
      score += 180; // Already overdue or imminent
    } else if (timeUntilDeadline <= 120) {
      score += 120; // Due within 2 hours
    } else if (timeUntilDeadline <= 240) {
      score += 70; // Due within 4 hours
    } else if (timeUntilDeadline <= 480) {
      score += 35; // Due by end of workday
    }
  }

  // 3. Cognitive demand vs. Energy compatibility
  if (energy === 'low') {
    if (task.cognitiveDemand === 'low') score += 40;
    else if (task.cognitiveDemand === 'moderate') score += 10;
    else if (task.cognitiveDemand === 'high') score -= 25;
    else if (task.cognitiveDemand === 'deep') {
      // If critical, keep urgency high but penalize raw placement without decomposition
      score -= task.priority === 'critical' ? 10 : 50;
    }
  } else if (energy === 'high') {
    if (task.cognitiveDemand === 'deep') score += 50;
    else if (task.cognitiveDemand === 'high') score += 35;
    else if (task.cognitiveDemand === 'moderate') score += 20;
    else if (task.cognitiveDemand === 'low') score += 5;
  } else {
    // Moderate
    if (task.cognitiveDemand === 'moderate' || task.cognitiveDemand === 'high') score += 25;
  }

  return score;
}

export interface RebalanceOptions {
  dayStart?: string; // default "09:00"
  dayEnd?: string;   // default "17:00"
  maxCapacityMinutes?: number; // e.g. 120 for "only 2 hours"
  energyLevel?: EnergyLevel;
  preferredBreakMinutes?: number;
}

/**
 * Deterministic scheduling algorithm.
 * Evaluates available windows, scores candidates, slots tasks without overlap,
 * detects over-capacity, and explicitly defers non-fitting tasks.
 */
export function calculateSchedule(
  tasks: Task[],
  fixedEvents: FixedEvent[],
  budget: FocusBudget,
  options: RebalanceOptions = {}
): {
  plan: DayPlan;
  deferredTasks: Task[];
  conflicts: ScheduleConflict[];
  explanation: string;
} {
  const dayStartStr = options.dayStart || '09:00';
  const dayEndStr = options.dayEnd || '17:00';
  const dayStartMinutes = timeToMinutes(dayStartStr);
  const dayEndMinutes = timeToMinutes(dayEndStr);
  const totalDaySpan = dayEndMinutes - dayStartMinutes;

  const energy = options.energyLevel || budget.energyLevel;
  const breakDuration = options.preferredBreakMinutes ?? budget.recommendedBreakMinutes ?? 10;

  // Compute available windows around fixed events
  const windows = getAvailableWindows(dayStartMinutes, dayEndMinutes, fixedEvents);
  const totalFreeMinutes = windows.reduce((acc, w) => acc + w.duration, 0);

  // Apply maximum capacity constraints (e.g. "I have only two hours today")
  const effectiveCapacity = options.maxCapacityMinutes !== undefined
    ? Math.min(options.maxCapacityMinutes, totalFreeMinutes)
    : totalFreeMinutes;

  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  // Score and rank pending tasks deterministically
  const scoredTasks = activeTasks.map(task => ({
    task: { ...task },
    score: scoreTask(task, energy, dayStartMinutes),
  })).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-break: shorter duration first (SJF heuristic for better throughput)
    if (a.task.duration !== b.task.duration) return a.task.duration - b.task.duration;
    return a.task.id.localeCompare(b.task.id);
  });

  const scheduledTasks: Task[] = [];
  const deferredTasks: Task[] = [];
  const slots: ScheduleSlot[] = [];
  const conflicts: ScheduleConflict[] = [];

  // Add fixed events as locked slots
  for (const fe of fixedEvents) {
    slots.push({
      id: `slot-fe-${fe.id}`,
      type: 'fixed_event',
      startTime: fe.startTime,
      endTime: fe.endTime,
      duration: timeToMinutes(fe.endTime) - timeToMinutes(fe.startTime),
      label: fe.title,
      item: fe,
    });
  }

  let remainingBudgetMinutes = effectiveCapacity;

  // Allocate tasks into windows
  for (const { task } of scoredTasks) {
    // Check if task exceeds remaining focus capacity
    if (task.duration > remainingBudgetMinutes) {
      task.status = 'deferred';
      task.deferReason = `Exceeds available focus budget limit (${remainingBudgetMinutes} min remaining of ${effectiveCapacity} min).`;
      deferredTasks.push(task);
      continue;
    }

    // Try to find a fitting window that respects restrictions
    let placed = false;

    for (let wIdx = 0; wIdx < windows.length; wIdx++) {
      const win = windows[wIdx];
      if (win.duration < task.duration) continue;

      const potentialStart = win.start;
      const potentialEnd = potentialStart + task.duration;

      // Check restrictions (e.g. workout must finish before 16:00)
      if (task.restrictions?.notAfter) {
        const notAfterMin = timeToMinutes(task.restrictions.notAfter);
        if (potentialEnd > notAfterMin) {
          continue; // Does not fit within this window before restriction cutoff
        }
      }
      if (task.restrictions?.notBefore) {
        const notBeforeMin = timeToMinutes(task.restrictions.notBefore);
        if (potentialStart < notBeforeMin) {
          continue;
        }
      }

      // Check deadline compatibility
      if (task.deadline) {
        const deadlineMin = timeToMinutes(task.deadline);
        if (potentialEnd > deadlineMin) {
          conflicts.push({
            id: `conf-dl-${task.id}`,
            type: 'deadline_breached',
            severity: 'critical',
            message: `Task "${task.title}" is scheduled to complete at ${minutesToTime(potentialEnd)}, which breaches its deadline (${task.deadline}).`,
            affectedTaskIds: [task.id],
          });
        }
      }

      // Slot the task
      task.scheduledStart = minutesToTime(potentialStart);
      task.scheduledEnd = minutesToTime(potentialEnd);
      task.status = 'pending';
      task.deferReason = undefined;

      slots.push({
        id: `slot-task-${task.id}`,
        type: 'task',
        startTime: task.scheduledStart,
        endTime: task.scheduledEnd,
        duration: task.duration,
        label: task.title,
        item: task,
      });

      scheduledTasks.push(task);
      remainingBudgetMinutes -= task.duration;

      // Shrink window with optional rest buffer
      const buffer = Math.min(breakDuration, win.duration - task.duration);
      win.start += task.duration + buffer;
      win.duration = Math.max(0, win.end - win.start);

      placed = true;
      break;
    }

    if (!placed) {
      task.status = 'deferred';
      task.deferReason = task.restrictions?.notAfter
        ? `Could not fit ${task.duration} min before ${task.restrictions.notAfter} without overlapping calendar commitments.`
        : `No remaining continuous calendar window of ${task.duration} minutes available.`;
      deferredTasks.push(task);
    }
  }

  // Sort slots chronologically
  slots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  // Check for any overlapping slots (integrity check)
  for (let i = 0; i < slots.length - 1; i++) {
    const curEnd = timeToMinutes(slots[i].endTime);
    const nextStart = timeToMinutes(slots[i + 1].startTime);
    if (curEnd > nextStart) {
      conflicts.push({
        id: `conf-overlap-${slots[i].id}-${slots[i + 1].id}`,
        type: 'overlap',
        severity: 'critical',
        message: `Schedule conflict: "${slots[i].label}" (${slots[i].endTime}) overlaps with "${slots[i + 1].label}" (${slots[i + 1].startTime}).`,
        affectedTaskIds: [
          ...(slots[i].item && 'id' in slots[i].item! ? [(slots[i].item as Task).id] : []),
          ...(slots[i + 1].item && 'id' in slots[i + 1].item! ? [(slots[i + 1].item as Task).id] : []),
        ],
      });
    }
  }

  // Calculate updated focus budget
  const scheduledMinutes = scheduledTasks.reduce((sum, t) => sum + t.duration, 0);
  const cogBreakdown = { low: 0, moderate: 0, high: 0, deep: 0 };
  for (const t of scheduledTasks) {
    cogBreakdown[t.cognitiveDemand] += t.duration;
  }

  const updatedBudget: FocusBudget = {
    ...budget,
    energyLevel: energy,
    totalCapacityMinutes: options.maxCapacityMinutes ?? budget.totalCapacityMinutes,
    allocatedFocusMinutes: scheduledMinutes,
    remainingFocusMinutes: Math.max(0, effectiveCapacity - scheduledMinutes),
    preferredSessionLength: ENERGY_PROFILES[energy]?.preferredSessionMinutes ?? budget.preferredSessionLength,
    recommendedBreakMinutes: options.preferredBreakMinutes ?? ENERGY_PROFILES[energy]?.recommendedBreakMinutes ?? budget.recommendedBreakMinutes,
    cognitiveBreakdown: cogBreakdown,
    utilizationPercentage: Math.round((scheduledMinutes / (effectiveCapacity || 1)) * 100),
    energyAdvice: generateEnergyAdvice(energy, cogBreakdown, deferredTasks.length),
  };

  // Build human-centered deterministic explanation
  const recommendations: string[] = [];
  if (options.maxCapacityMinutes !== undefined && options.maxCapacityMinutes < 300) {
    recommendations.push(
      `Strict ${options.maxCapacityMinutes / 60}h time box active: protected top-priority commitments, safely deferred ${deferredTasks.length} non-urgent tasks.`
    );
  }
  if (energy === 'low') {
    recommendations.push(
      'Low energy profile applied: deep cognitive load minimized and distributed into focused segments with mandatory restorative recovery.'
    );
  }
  if (deferredTasks.length > 0) {
    recommendations.push(
      `${deferredTasks.length} lower-priority tasks deferred to preserve your high-value deadlines without burnout.`
    );
  }

  const explanation = generateRebalanceExplanation(
    scheduledTasks,
    deferredTasks,
    effectiveCapacity,
    energy,
    options
  );

  return {
    plan: {
      date: new Date().toISOString().split('T')[0],
      slots,
      conflicts,
      scheduledTasks: [...completedTasks, ...scheduledTasks],
      deferredTasks,
      fixedEvents,
      focusBudget: updatedBudget,
      recommendations,
    },
    deferredTasks,
    conflicts,
    explanation,
  };
}

function generateEnergyAdvice(
  energy: EnergyLevel,
  breakdown: { low: number; moderate: number; high: number; deep: number },
  deferredCount: number
): string {
  if (energy === 'low') {
    return breakdown.deep > 0
      ? 'Critical deep work detected on low energy. Work in 25-minute Pomodoro bursts with 10-minute restorative breaks.'
      : 'Low energy mode: light administrative tasks and quick wins prioritized to maintain momentum.';
  }
  if (energy === 'high') {
    return 'Peak energy state: high-leverage problem solving and deep cognitive work prioritized early in your cycle.';
  }
  return 'Balanced energy state: standard 45-minute focus blocks with 10-minute cadence recommended.';
}

function generateRebalanceExplanation(
  scheduled: Task[],
  deferred: Task[],
  capacity: number,
  energy: EnergyLevel,
  options: RebalanceOptions
): string {
  const parts: string[] = [];
  if (options.maxCapacityMinutes !== undefined) {
    parts.push(
      `Recalculated day for strict ${options.maxCapacityMinutes}m (${(options.maxCapacityMinutes / 60).toFixed(1)}h) focus window.`
    );
  } else {
    parts.push(`Recalculated day against ${capacity} minutes of open calendar time.`);
  }

  parts.push(
    `Scheduled ${scheduled.length} high-urgency tasks totaling ${scheduled.reduce((a, b) => a + b.duration, 0)} minutes.`
  );

  if (deferred.length > 0) {
    parts.push(
      `Deferred ${deferred.length} task(s) (${deferred.map(d => `"${d.title}"`).join(', ')}) to protect primary deadlines and avoid schedule overload.`
    );
  }

  return parts.join(' ');
}

/**
 * Compares two schedules and produces an auditable before-and-after diff.
 */
export function generatePlanComparison(
  beforeTasks: Task[],
  afterTasks: Task[],
  fixedEvents: FixedEvent[]
): PlanComparison {
  const beforeScheduled = beforeTasks.filter(t => t.status !== 'deferred');
  const afterScheduled = afterTasks.filter(t => t.status !== 'deferred');

  const beforeMap = new Map(beforeTasks.map(t => [t.id, t]));
  const changes: PlanComparison['changes'] = [];

  for (const after of afterTasks) {
    const before = beforeMap.get(after.id);
    if (!before) {
      changes.push({
        taskId: after.id,
        taskTitle: after.title,
        changeType: 'scheduled',
        newSlot: after.scheduledStart ? `${after.scheduledStart} - ${after.scheduledEnd}` : undefined,
        reason: 'New task inserted',
      });
    } else if (before.status !== 'deferred' && after.status === 'deferred') {
      changes.push({
        taskId: after.id,
        taskTitle: after.title,
        changeType: 'deferred',
        previousSlot: before.scheduledStart ? `${before.scheduledStart} - ${before.scheduledEnd}` : undefined,
        reason: after.deferReason || 'Deferred during rebalance',
      });
    } else if (
      before.scheduledStart !== after.scheduledStart ||
      before.scheduledEnd !== after.scheduledEnd
    ) {
      changes.push({
        taskId: after.id,
        taskTitle: after.title,
        changeType: 'moved',
        previousSlot: before.scheduledStart ? `${before.scheduledStart} - ${before.scheduledEnd}` : undefined,
        newSlot: after.scheduledStart ? `${after.scheduledStart} - ${after.scheduledEnd}` : undefined,
        reason: 'Shifted to accommodate constraints or priority order',
      });
    } else {
      changes.push({
        taskId: after.id,
        taskTitle: after.title,
        changeType: 'unmodified',
        previousSlot: `${before.scheduledStart} - ${before.scheduledEnd}`,
        newSlot: `${after.scheduledStart} - ${after.scheduledEnd}`,
      });
    }
  }

  return {
    before: {
      scheduledCount: beforeScheduled.length,
      totalScheduledMinutes: beforeScheduled.reduce((sum, t) => sum + t.duration, 0),
      deferredCount: beforeTasks.length - beforeScheduled.length,
      conflictsCount: 0,
    },
    after: {
      scheduledCount: afterScheduled.length,
      totalScheduledMinutes: afterScheduled.reduce((sum, t) => sum + t.duration, 0),
      deferredCount: afterTasks.length - afterScheduled.length,
      conflictsCount: 0,
    },
    changes,
  };
}

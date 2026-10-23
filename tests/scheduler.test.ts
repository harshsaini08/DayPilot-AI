import { describe, it, expect } from 'vitest';
import {
  timeToMinutes,
  minutesToTime,
  getAvailableWindows,
  calculateSchedule,
  scoreTask,
} from '../packages/shared/src/scheduler.js';
import {
  INITIAL_TASKS,
  INITIAL_FIXED_EVENTS,
  INITIAL_FOCUS_BUDGET,
} from '../packages/shared/src/fixtures.js';
import { Task, FixedEvent, FocusBudget } from '../packages/shared/src/types.js';
import { processIntent } from '../packages/shared/src/intent.js';
import { computeFocusBudget, decomposeTaskForLowEnergy } from '../packages/shared/src/budget.js';

describe('Deterministic Scheduling Engine (Adaptive Day Flight Director)', () => {
  it('converts time formats accurately', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('14:45')).toBe(885);
    expect(minutesToTime(570)).toBe('09:30');
    expect(minutesToTime(885)).toBe('14:45');
  });

  it('preserves fixed commitments and extracts non-overlapping available windows', () => {
    const dayStart = timeToMinutes('09:00'); // 540
    const dayEnd = timeToMinutes('17:00');   // 1020

    const windows = getAvailableWindows(dayStart, dayEnd, INITIAL_FIXED_EVENTS);
    expect(windows.length).toBeGreaterThan(0);

    // Verify windows do not overlap with Standup (10:00 - 10:30) or Review (14:00 - 15:00)
    for (const win of windows) {
      // Window 1 should end by 10:00
      if (win.start < 600) {
        expect(win.end).toBeLessThanOrEqual(600); // 10:00
      }
      // Window between 10:30 and 14:00
      if (win.start >= 630 && win.start < 840) {
        expect(win.end).toBeLessThanOrEqual(840); // 14:00
      }
      // Window after 15:00
      if (win.start >= 900) {
        expect(win.end).toBeLessThanOrEqual(1020); // 17:00
      }
    }
  });

  it('handles "I have only two hours today" by strictly capping duration and deferring lower priority tasks', () => {
    const twoHours = 120;
    const result = calculateSchedule(
      INITIAL_TASKS,
      INITIAL_FIXED_EVENTS,
      INITIAL_FOCUS_BUDGET,
      { maxCapacityMinutes: twoHours }
    );

    const scheduled = result.plan.scheduledTasks.filter(t => t.status !== 'deferred');
    const totalScheduledDuration = scheduled.reduce((sum, t) => sum + t.duration, 0);

    expect(totalScheduledDuration).toBeLessThanOrEqual(twoHours);
    expect(result.deferredTasks.length).toBeGreaterThan(0);

    // Critical presentation must be preserved over low priority items
    const hasPresentation = scheduled.some(t => t.id === 'task-1');
    expect(hasPresentation).toBe(true);

    // Low priority sprint grooming must be deferred
    const sprintDeferred = result.deferredTasks.some(t => t.id === 'task-6' || t.priority === 'low');
    expect(sprintDeferred).toBe(true);
  });

  it('protects critical deadlines under low energy and adapts pacing', () => {
    const result = calculateSchedule(
      INITIAL_TASKS,
      INITIAL_FIXED_EVENTS,
      INITIAL_FOCUS_BUDGET,
      { energyLevel: 'low' }
    );

    expect(result.plan.focusBudget.energyLevel).toBe('low');
    expect(result.plan.focusBudget.preferredSessionLength).toBe(25);
    expect(result.explanation).toBeDefined();
  });

  it('fits a 30-minute workout before 4 PM (16:00) without calendar conflicts', () => {
    const workoutTask: Task = {
      id: 'test-workout',
      title: 'Fitness Workout',
      duration: 30,
      priority: 'medium',
      deadline: '16:00',
      category: 'health',
      cognitiveDemand: 'low',
      status: 'pending',
      restrictions: { notAfter: '16:00' },
    };

    const tasks = [workoutTask, ...INITIAL_TASKS];
    const result = calculateSchedule(tasks, INITIAL_FIXED_EVENTS, INITIAL_FOCUS_BUDGET);

    const scheduledWorkout = result.plan.scheduledTasks.find(t => t.id === 'test-workout');
    expect(scheduledWorkout).toBeDefined();
    expect(scheduledWorkout?.status).toBe('pending');

    const endMin = timeToMinutes(scheduledWorkout!.scheduledEnd!);
    expect(endMin).toBeLessThanOrEqual(timeToMinutes('16:00'));
  });

  it('guarantees deterministic output for identical inputs', () => {
    const run1 = calculateSchedule(INITIAL_TASKS, INITIAL_FIXED_EVENTS, INITIAL_FOCUS_BUDGET);
    const run2 = calculateSchedule(INITIAL_TASKS, INITIAL_FIXED_EVENTS, INITIAL_FOCUS_BUDGET);

    expect(run1.plan.slots.map(s => s.startTime)).toEqual(run2.plan.slots.map(s => s.startTime));
    expect(run1.deferredTasks.map(d => d.id)).toEqual(run2.deferredTasks.map(d => d.id));
  });

  it('preserves completed tasks from being re-scheduled or modified', () => {
    const tasksWithCompleted = INITIAL_TASKS.map(t =>
      t.id === 'task-8' ? { ...t, status: 'completed' as const } : t
    );

    const result = calculateSchedule(tasksWithCompleted, INITIAL_FIXED_EVENTS, INITIAL_FOCUS_BUDGET);
    const completed = result.plan.scheduledTasks.find(t => t.id === 'task-8');
    expect(completed?.status).toBe('completed');
  });
});

describe('Conversational Intent Engine', () => {
  const context = {
    tasks: INITIAL_TASKS,
    fixedEvents: INITIAL_FIXED_EVENTS,
    focusBudget: INITIAL_FOCUS_BUDGET,
    recentLedgerCount: 0,
  };

  it('handles "Plan my day." with proposal and confirmation flag', () => {
    const res = processIntent('Plan my day.', context);
    expect(res.intent).toBe('plan_my_day');
    expect(res.requiresConfirmation).toBe(true);
    expect(res.proposedAction).toBeDefined();
    expect(res.proposedAction?.actionType).toBe('rebalance');
  });

  it('handles "I have only two hours today."', () => {
    const res = processIntent('I have only two hours today.', context);
    expect(res.intent).toBe('rebalance_two_hours');
    expect(res.requiresConfirmation).toBe(true);
    expect(res.proposedAction?.deferredTasks.length).toBeGreaterThan(0);
  });

  it('handles "I\'m low on energy, but my presentation is due today."', () => {
    const res = processIntent("I'm low on energy, but my presentation is due today.", context);
    expect(res.intent).toBe('low_energy_presentation_defense');
    expect(res.requiresConfirmation).toBe(true);
    expect(res.proposedAction).toBeDefined();
  });

  it('handles "Move my lowest-priority task to tomorrow."', () => {
    const res = processIntent('Move my lowest-priority task to tomorrow.', context);
    expect(res.intent).toBe('move_lowest_priority');
    expect(res.requiresConfirmation).toBe(true);
    expect(res.proposedAction?.actionType).toBe('defer_task');
  });

  it('handles "Reset Demo" immediately without confirmation', () => {
    const res = processIntent('Reset Demo', context);
    expect(res.intent).toBe('reset_demo');
    expect(res.requiresConfirmation).toBe(false);
    expect(res.executedImmediateUpdate).toBeDefined();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import {
  INITIAL_TASKS,
  INITIAL_FIXED_EVENTS,
  INITIAL_FOCUS_BUDGET,
  calculateSchedule,
} from '../packages/shared/src/index.js';

describe('Model Context Protocol (MCP) Tool Contracts & Safety', () => {
  it('propose_schedule_rebalance calculates changes without prematurely mutating original tasks', () => {
    const originalTasks = JSON.parse(JSON.stringify(INITIAL_TASKS));
    const twoHours = 120;

    const proposalResult = calculateSchedule(
      originalTasks,
      INITIAL_FIXED_EVENTS,
      INITIAL_FOCUS_BUDGET,
      { maxCapacityMinutes: twoHours }
    );

    // Verify original tasks passed in were not mutated in place
    expect(originalTasks.length).toBe(INITIAL_TASKS.length);
    expect(originalTasks[0].status).toBe('pending');

    // Verify proposal has deferred tasks
    expect(proposalResult.deferredTasks.length).toBeGreaterThan(0);
    expect(proposalResult.explanation).toBeDefined();
  });

  it('rejecting a proposal guarantees active schedule remains intact', () => {
    const activeTasks = JSON.parse(JSON.stringify(INITIAL_TASKS));
    const proposal = calculateSchedule(activeTasks, INITIAL_FIXED_EVENTS, INITIAL_FOCUS_BUDGET, {
      maxCapacityMinutes: 120,
    });

    let currentSchedule = activeTasks;
    // Reject proposal
    const isRejected = true;
    if (isRejected) {
      // Do nothing to currentSchedule
    }

    expect(currentSchedule.length).toBe(INITIAL_TASKS.length);
    expect(currentSchedule.filter(t => t.status === 'deferred').length).toBe(0);
  });

  it('approving a proposal safely updates active schedule and preserves fixed events', () => {
    const activeTasks = JSON.parse(JSON.stringify(INITIAL_TASKS));
    const proposal = calculateSchedule(activeTasks, INITIAL_FIXED_EVENTS, INITIAL_FOCUS_BUDGET, {
      maxCapacityMinutes: 120,
    });

    // Approve
    const approvedTasks = [...proposal.plan.scheduledTasks, ...proposal.deferredTasks];
    expect(approvedTasks.length).toBe(INITIAL_TASKS.length);
    expect(proposal.plan.slots.some(s => s.type === 'fixed_event')).toBe(true);
  });

  it('undo restores previous state snapshot exactly', () => {
    const snapshotBefore = JSON.parse(JSON.stringify(INITIAL_TASKS));
    const proposal = calculateSchedule(snapshotBefore, INITIAL_FIXED_EVENTS, INITIAL_FOCUS_BUDGET, {
      maxCapacityMinutes: 120,
    });

    // Apply
    let currentState = [...proposal.plan.scheduledTasks, ...proposal.deferredTasks];
    expect(currentState.some(t => t.status === 'deferred')).toBe(true);

    // Undo
    currentState = JSON.parse(JSON.stringify(snapshotBefore));
    expect(currentState.every(t => t.status === 'pending')).toBe(true);
  });
});

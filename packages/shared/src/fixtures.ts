/**
 * DayPilot AI - Realistic Demo Fixtures
 * Seeded with challenging constraints, fixed calendar events, and varying cognitive demands.
 */

import { Task, FixedEvent, FocusBudget, StateSnapshot } from './types.js';

export const INITIAL_FIXED_EVENTS: FixedEvent[] = [
  {
    id: 'fix-1',
    title: 'Daily Engineering Standup',
    startTime: '10:00',
    endTime: '10:30',
    category: 'work',
    location: 'Zoom Room #4',
  },
  {
    id: 'fix-2',
    title: 'Client Architecture Review',
    startTime: '14:00',
    endTime: '15:00',
    category: 'work',
    location: 'Conference Room Alpha',
  },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Prepare Q3 Strategic Presentation',
    description: 'Executive slides for tomorrow morning board meeting with revenue projections.',
    duration: 90,
    priority: 'critical',
    deadline: '17:00',
    category: 'work',
    cognitiveDemand: 'deep',
    status: 'pending',
  },
  {
    id: 'task-2',
    title: 'Review Auth Service Security Vulnerabilities',
    description: 'Address CVE-2026-4421 in session token revocation pipeline.',
    duration: 60,
    priority: 'high',
    deadline: '18:00',
    category: 'work',
    cognitiveDemand: 'high',
    status: 'pending',
  },
  {
    id: 'task-3',
    title: 'Design Team Collaboration Review',
    description: 'Walkthrough mobile onboarding wireframes and accessibility passes.',
    duration: 45,
    priority: 'medium',
    deadline: '13:30',
    category: 'work',
    cognitiveDemand: 'moderate',
    status: 'pending',
  },
  {
    id: 'task-4',
    title: 'Cardio & Strength Reset Workout',
    description: 'Recharge mental focus before evening meetings.',
    duration: 30,
    priority: 'medium',
    deadline: '16:00',
    category: 'health',
    cognitiveDemand: 'low',
    status: 'pending',
    restrictions: {
      notAfter: '16:00',
    },
  },
  {
    id: 'task-5',
    title: 'Triage Customer Escalations in Queue',
    description: 'Resolve P2 support tickets from European region.',
    duration: 45,
    priority: 'medium',
    deadline: '19:00',
    category: 'work',
    cognitiveDemand: 'moderate',
    status: 'pending',
  },
  {
    id: 'task-6',
    title: 'Update Sprint Backlog & Ticket Grooming',
    description: 'Estimate user stories for Sprint 42.',
    duration: 30,
    priority: 'low',
    deadline: '20:00',
    category: 'work',
    cognitiveDemand: 'low',
    status: 'pending',
  },
  {
    id: 'task-7',
    title: 'Read Systems Reliability Chapter 4',
    description: 'Study graceful degradation under network partitions.',
    duration: 45,
    priority: 'low',
    deadline: '21:00',
    category: 'learning',
    cognitiveDemand: 'moderate',
    status: 'pending',
  },
  {
    id: 'task-8',
    title: 'Clear Inbox & Partner Messages',
    description: 'Archive stale threads and answer asynchronous vendor queries.',
    duration: 30,
    priority: 'low',
    deadline: '20:30',
    category: 'personal',
    cognitiveDemand: 'low',
    status: 'pending',
  },
];

export const INITIAL_FOCUS_BUDGET: FocusBudget = {
  energyLevel: 'moderate',
  totalCapacityMinutes: 480, // 8-hour workday standard (09:00 - 17:00)
  allocatedFocusMinutes: 375, // 90+60+45+30+45+30+45+30 = 375 mins
  remainingFocusMinutes: 105,
  preferredSessionLength: 45,
  recommendedBreakMinutes: 10,
  cognitiveBreakdown: {
    low: 90,
    moderate: 135,
    high: 60,
    deep: 90,
  },
  utilizationPercentage: 78,
  energyAdvice: 'Moderate energy detected. Balanced blend of deep work and collaborative tasks scheduled.',
};

export function createInitialSnapshot(): StateSnapshot {
  return {
    tasks: JSON.parse(JSON.stringify(INITIAL_TASKS)),
    fixedEvents: JSON.parse(JSON.stringify(INITIAL_FIXED_EVENTS)),
    focusBudget: JSON.parse(JSON.stringify(INITIAL_FOCUS_BUDGET)),
    explanation: 'Initial seeded baseline schedule for DayPilot AI.',
  };
}

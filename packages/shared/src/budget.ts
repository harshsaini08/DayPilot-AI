/**
 * DayPilot AI - Personal Energy & Focus Budget
 * Innovation B: User-controlled focus, cognitive pacing, and workload limits.
 * 
 * Note: Never claims biometric/affective detection. All energy profiles
 * are explicitly user-declared or modified via command.
 */

import { Task, EnergyLevel, FocusBudget } from './types.js';

export const ENERGY_PROFILES: Record<
  EnergyLevel,
  {
    preferredSessionMinutes: number;
    recommendedBreakMinutes: number;
    maxDeepWorkDailyMinutes: number;
    description: string;
    pacingStrategy: string;
  }
> = {
  low: {
    preferredSessionMinutes: 25,
    recommendedBreakMinutes: 10,
    maxDeepWorkDailyMinutes: 60,
    description: 'Reduced stamina mode. Emphasizes micro-sessions and mandatory restoration buffers.',
    pacingStrategy: 'Pomodoro-style 25m focus bursts with generous 10m restorative intervals.',
  },
  moderate: {
    preferredSessionMinutes: 45,
    recommendedBreakMinutes: 10,
    maxDeepWorkDailyMinutes: 180,
    description: 'Balanced everyday focus. Steady throughput across varied cognitive demands.',
    pacingStrategy: 'Standard 45m deep focus blocks followed by 10m tactical breaks.',
  },
  high: {
    preferredSessionMinutes: 60,
    recommendedBreakMinutes: 15,
    maxDeepWorkDailyMinutes: 270,
    description: 'High cognitive bandwidth. Ideal for complex system architecture and deep problem-solving.',
    pacingStrategy: 'Extended 60m-90m flow blocks with 15m consolidation pauses.',
  },
};

export function computeFocusBudget(
  tasks: Task[],
  energyLevel: EnergyLevel,
  totalCapacityMinutes: number = 480
): FocusBudget {
  const profile = ENERGY_PROFILES[energyLevel];
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'deferred');

  const cognitiveBreakdown = {
    low: 0,
    moderate: 0,
    high: 0,
    deep: 0,
  };

  let totalAllocated = 0;
  for (const t of activeTasks) {
    cognitiveBreakdown[t.cognitiveDemand] += t.duration;
    totalAllocated += t.duration;
  }

  const remaining = Math.max(0, totalCapacityMinutes - totalAllocated);
  const utilization = Math.round((totalAllocated / (totalCapacityMinutes || 1)) * 100);

  let advice = profile.pacingStrategy;
  if (energyLevel === 'low' && cognitiveBreakdown.deep > profile.maxDeepWorkDailyMinutes) {
    advice = `Warning: Deep cognitive workload (${cognitiveBreakdown.deep}m) exceeds recommended low-energy threshold (${profile.maxDeepWorkDailyMinutes}m). Break large milestones into 25m steps.`;
  } else if (utilization > 95) {
    advice = 'Schedule is at maximum focus capacity. Consider deferring optional tasks to prevent late-day cognitive burnout.';
  }

  return {
    energyLevel,
    totalCapacityMinutes,
    allocatedFocusMinutes: totalAllocated,
    remainingFocusMinutes: remaining,
    preferredSessionLength: profile.preferredSessionMinutes,
    recommendedBreakMinutes: profile.recommendedBreakMinutes,
    cognitiveBreakdown,
    utilizationPercentage: utilization,
    energyAdvice: advice,
  };
}

/**
 * Breaks down an intensive task (like a 90m strategic presentation)
 * into manageable micro-steps for low energy days.
 */
export function decomposeTaskForLowEnergy(task: Task): Task[] {
  if (task.duration <= 30) return [task];

  const subStepCount = Math.ceil(task.duration / 30);
  const subDuration = Math.round(task.duration / subStepCount);
  const subTasks: Task[] = [];

  for (let i = 1; i <= subStepCount; i++) {
    subTasks.push({
      id: `${task.id}-step-${i}`,
      title: `${task.title} (Part ${i}/${subStepCount})`,
      description: `Structured 25-30m micro-block with clear boundaries. Step ${i} of ${subStepCount}.`,
      duration: subDuration,
      priority: task.priority,
      deadline: task.deadline,
      category: task.category,
      cognitiveDemand: i === 1 ? 'moderate' : 'low',
      status: 'pending',
    });
  }

  return subTasks;
}

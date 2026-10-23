/**
 * DayPilot AI - Core Domain Models & Shared Types
 * Grounded in Alexa+-inspired Ambient Intelligence and MCP Architecture
 */

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type CognitiveDemand = 'low' | 'moderate' | 'high' | 'deep';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'deferred';

export type TaskCategory = 'work' | 'health' | 'learning' | 'personal' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description?: string;
  duration: number; // in minutes (5 - 480)
  priority: Priority;
  deadline: string; // ISO date string or "YYYY-MM-DDTHH:mm" or "HH:mm"
  category: TaskCategory;
  cognitiveDemand: CognitiveDemand;
  status: TaskStatus;
  scheduledStart?: string; // "HH:mm" (e.g. "09:30")
  scheduledEnd?: string;   // "HH:mm"
  isFixed?: boolean;
  dependencies?: string[]; // IDs of tasks that must complete first
  restrictions?: {
    notBefore?: string; // "HH:mm"
    notAfter?: string;  // "HH:mm" (e.g. workout before "16:00")
  };
  deferReason?: string;
}

export interface FixedEvent {
  id: string;
  title: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  category: string;
  location?: string;
}

export type EnergyLevel = 'low' | 'moderate' | 'high';

export interface FocusBudget {
  energyLevel: EnergyLevel;
  totalCapacityMinutes: number; // e.g. 480 (8h) or 120 (2h)
  allocatedFocusMinutes: number;
  remainingFocusMinutes: number;
  preferredSessionLength: number; // in minutes (e.g. 25, 45, 60)
  recommendedBreakMinutes: number; // e.g. 5, 10, 15
  cognitiveBreakdown: {
    low: number;
    moderate: number;
    high: number;
    deep: number;
  };
  utilizationPercentage: number;
  energyAdvice: string;
}

export type ScheduleSlotType = 'task' | 'fixed_event' | 'break' | 'buffer';

export interface ScheduleSlot {
  id: string;
  type: ScheduleSlotType;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  duration: number;  // in minutes
  label: string;
  item?: Task | FixedEvent;
  isOverload?: boolean;
}

export interface ScheduleConflict {
  id: string;
  type: 'overlap' | 'deadline_breached' | 'over_capacity' | 'dependency_order' | 'restriction_violated';
  severity: 'warning' | 'critical';
  message: string;
  affectedTaskIds: string[];
}

export type ActionLifecycleStatus =
  | 'proposed'
  | 'approved'
  | 'rejected'
  | 'applied'
  | 'completed'
  | 'undone'
  | 'failed';

export type ActionType =
  | 'rebalance'
  | 'move_task'
  | 'add_task'
  | 'defer_task'
  | 'low_energy_adapt'
  | 'quick_fit';

export interface StateSnapshot {
  tasks: Task[];
  focusBudget: FocusBudget;
  fixedEvents: FixedEvent[];
  explanation: string;
}

export interface ProposedAction {
  id: string;
  timestamp: string;
  originalRequest: string;
  actionType: ActionType;
  status: ActionLifecycleStatus;
  summary: string;
  reasoning: string;
  constraints: string[];
  expectedBenefit: string;
  tradeoffs: string[];
  targetTaskId?: string;
  previousState: StateSnapshot;
  newState: StateSnapshot;
  deferredTasks: Array<{
    taskId: string;
    title: string;
    reason: string;
  }>;
  executionSource: 'mcp_tool' | 'local_deterministic';
  appliedAt?: string;
}

export interface LedgerEntry {
  id: string;
  actionId: string;
  timestamp: string;
  request: string;
  summary: string;
  reasoning: string;
  tradeoffs: string[];
  status: ActionLifecycleStatus;
  source: 'mcp_tool' | 'local_deterministic';
  canUndo: boolean;
  snapshotBefore: StateSnapshot;
  snapshotAfter: StateSnapshot;
}

export interface PlanComparison {
  before: {
    scheduledCount: number;
    totalScheduledMinutes: number;
    deferredCount: number;
    conflictsCount: number;
  };
  after: {
    scheduledCount: number;
    totalScheduledMinutes: number;
    deferredCount: number;
    conflictsCount: number;
  };
  changes: Array<{
    taskId: string;
    taskTitle: string;
    changeType: 'scheduled' | 'moved' | 'deferred' | 'unmodified';
    previousSlot?: string;
    newSlot?: string;
    reason?: string;
  }>;
}

export interface DayPlan {
  date: string;
  slots: ScheduleSlot[];
  conflicts: ScheduleConflict[];
  scheduledTasks: Task[];
  deferredTasks: Task[];
  fixedEvents: FixedEvent[];
  focusBudget: FocusBudget;
  recommendations: string[];
}

import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { Task, Priority, TaskCategory, CognitiveDemand, generatePlanComparison } from '@daypilot/shared';
import {
  CalendarClock,
  Plus,
  Lock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  Tag,
  Trash2,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Check,
  X,
  Undo2,
  Layers,
  ChevronRight,
} from 'lucide-react';

export const DailyFlightPlan: React.FC = () => {
  const {
    tasks,
    fixedEvents,
    focusBudget,
    plan,
    pendingProposal,
    approveProposal,
    rejectProposal,
    undoAction,
    createTask,
    deleteTask,
    toggleTaskComplete,
    executeCommand,
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'deferred'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState(45);
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [newTaskDeadline, setNewTaskDeadline] = useState('17:00');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('work');
  const [newTaskCognitive, setNewTaskCognitive] = useState<CognitiveDemand>('moderate');

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    createTask({
      title: newTaskTitle.trim(),
      duration: Number(newTaskDuration),
      priority: newTaskPriority,
      deadline: newTaskDeadline,
      category: newTaskCategory,
      cognitiveDemand: newTaskCognitive,
    });

    setNewTaskTitle('');
    setShowAddModal(false);
  };

  // Plan comparison data
  const comparison = pendingProposal
    ? generatePlanComparison(
        pendingProposal.previousState.tasks,
        pendingProposal.newState.tasks,
        fixedEvents
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Top Action & Verification Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock size={20} className="text-cyan-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Adaptive Day Flight Director
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic, constraint-aware schedule engine. Hard calendar boundaries strictly enforced.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {pendingProposal && (
            <button
              onClick={() => setShowComparisonModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30 transition-colors"
            >
              <Layers size={14} />
              <span>Inspect Before/After Diff</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20 transition-all"
          >
            <Plus size={15} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Pending Proposal Action Card */}
      {pendingProposal && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                <AlertTriangle size={15} />
                <span>Proposed Flight Plan Rebalance</span>
              </div>
              <h4 className="text-sm font-bold text-white">{pendingProposal.summary}</h4>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                {pendingProposal.reasoning}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => rejectProposal(pendingProposal.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 border border-slate-700 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => approveProposal(pendingProposal.id)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-sm"
              >
                Approve & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflicts & Warnings Banner */}
      {plan.conflicts.length > 0 && (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/20 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider">
            <AlertTriangle size={15} />
            <span>Schedule Conflict Warning ({plan.conflicts.length})</span>
          </div>
          {plan.conflicts.map(conf => (
            <p key={conf.id} className="text-xs text-rose-200">
              • {conf.message}
            </p>
          ))}
          <div className="pt-1">
            <button
              onClick={() => executeCommand('Plan my day.')}
              className="text-xs font-semibold text-rose-300 hover:underline"
            >
              Resolve automatically with Flight Director →
            </button>
          </div>
        </div>
      )}

      {/* Visual Interactive Day Timeline */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Interactive Day Flight Timeline (09:00 — 17:00)
          </h3>
          <span className="text-xs text-slate-500">
            {plan.slots.length} chronological slots
          </span>
        </div>

        {/* Visual timeline blocks */}
        <div className="space-y-2">
          {plan.slots.map(slot => {
            const isFixed = slot.type === 'fixed_event';
            return (
              <div
                key={slot.id}
                className={`p-3 rounded-lg border transition-all flex items-center justify-between text-xs ${
                  isFixed
                    ? 'bg-violet-950/30 border-violet-500/40 text-violet-200'
                    : 'bg-slate-950/70 border-slate-800 hover:border-cyan-500/40 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-slate-400 w-24">
                    {slot.startTime} - {slot.endTime}
                  </span>

                  <div className="flex items-center gap-2">
                    {isFixed && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[10px] uppercase font-bold border border-violet-500/30">
                        <Lock size={10} /> Locked Calendar
                      </span>
                    )}
                    <span className="font-semibold text-white">{slot.label}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs">{slot.duration}m</span>
                  {slot.item && 'priority' in slot.item && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        (slot.item as Task).priority === 'critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : (slot.item as Task).priority === 'high'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {(slot.item as Task).priority}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Filters & Task List */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            {(['all', 'pending', 'completed', 'deferred'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                  filter === tab
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab} ({tasks.filter(t => (tab === 'all' ? true : t.status === tab)).length})
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400">
            Showing {filteredTasks.length} task(s)
          </span>
        </div>

        {/* Task cards list */}
        <div className="space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
              No tasks match filter "{filter}".
            </div>
          ) : (
            filteredTasks.map(task => {
              const isCompleted = task.status === 'completed';
              const isDeferred = task.status === 'deferred';

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isCompleted
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                      : isDeferred
                      ? 'bg-amber-950/10 border-amber-500/20'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTaskComplete(task.id)}
                      className="mt-0.5 text-slate-400 hover:text-cyan-400 transition-colors"
                      title={isCompleted ? 'Mark pending' : 'Mark completed'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      ) : (
                        <Circle size={18} />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            isCompleted ? 'line-through text-slate-400' : 'text-white'
                          }`}
                        >
                          {task.title}
                        </span>

                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            task.priority === 'critical'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : task.priority === 'high'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : task.priority === 'medium'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {task.priority}
                        </span>

                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] uppercase font-medium">
                          {task.cognitiveDemand} cognitive
                        </span>

                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] uppercase font-medium">
                          {task.category}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-400 max-w-2xl">{task.description}</p>
                      )}

                      {isDeferred && task.deferReason && (
                        <p className="text-xs text-amber-400/90 font-medium">
                          Deferred reason: {task.deferReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <div className="text-right text-xs">
                      <div className="font-mono font-semibold text-slate-200">
                        {task.scheduledStart && !isDeferred
                          ? `${task.scheduledStart} - ${task.scheduledEnd}`
                          : `${task.duration} mins`}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Deadline: {task.deadline}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Add New Task to Flight Plan</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete Security Audit Report"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    value={newTaskDuration}
                    onChange={e => setNewTaskDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Deadline</label>
                  <input
                    type="text"
                    value={newTaskDeadline}
                    onChange={e => setNewTaskDeadline(e.target.value)}
                    placeholder="17:00"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value as Priority)}
                    className="w-full px-2 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 capitalize"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={newTaskCategory}
                    onChange={e => setNewTaskCategory(e.target.value as TaskCategory)}
                    className="w-full px-2 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 capitalize"
                  >
                    <option value="work">Work</option>
                    <option value="health">Health</option>
                    <option value="learning">Learning</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Cognitive Demand</label>
                  <select
                    value={newTaskCognitive}
                    onChange={e => setNewTaskCognitive(e.target.value as CognitiveDemand)}
                    className="w-full px-2 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 capitalize"
                  >
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                    <option value="deep">Deep</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-colors"
                >
                  Insert Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Before / After Comparison Modal */}
      {showComparisonModal && comparison && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Before-and-After Plan Audit</h3>
                <p className="text-xs text-slate-400">
                  Verifiable differential comparison for proposed rebalance
                </p>
              </div>
              <button
                onClick={() => setShowComparisonModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 uppercase text-[10px] tracking-wider">
                  Baseline Plan
                </span>
                <div className="text-xl font-bold text-white">
                  {comparison.before.scheduledCount} tasks scheduled
                </div>
                <div className="text-slate-400">
                  {comparison.before.totalScheduledMinutes} total minutes allocated
                </div>
                <div className="text-slate-400">
                  {comparison.before.deferredCount} tasks deferred
                </div>
              </div>

              <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/40 space-y-2">
                <span className="font-bold text-cyan-400 uppercase text-[10px] tracking-wider">
                  Proposed Flight Plan
                </span>
                <div className="text-xl font-bold text-white">
                  {comparison.after.scheduledCount} tasks scheduled
                </div>
                <div className="text-cyan-300">
                  {comparison.after.totalScheduledMinutes} total minutes allocated
                </div>
                <div className="text-amber-400">
                  {comparison.after.deferredCount} tasks deferred
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Detailed Delta Per Task
              </h4>
              <div className="space-y-1.5 max-h-60 overflow-y-auto text-xs">
                {comparison.changes.map(ch => (
                  <div
                    key={ch.taskId}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-200">{ch.taskTitle}</span>
                      {ch.reason && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{ch.reason}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        ch.changeType === 'scheduled'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : ch.changeType === 'deferred'
                          ? 'bg-amber-500/20 text-amber-300'
                          : ch.changeType === 'moved'
                          ? 'bg-violet-500/20 text-violet-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {ch.changeType}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                onClick={() => setShowComparisonModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white"
              >
                Close Audit View
              </button>
              {pendingProposal && (
                <button
                  onClick={() => {
                    approveProposal(pendingProposal.id);
                    setShowComparisonModal(false);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors"
                >
                  Approve Proposed Plan
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

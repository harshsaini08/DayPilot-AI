import React from 'react';
import { useApp } from '../state/AppContext';
import { AssistantSphere } from './AssistantSphere';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  ArrowRight,
  ShieldCheck,
  Undo2,
  Flame,
  Sparkles,
} from 'lucide-react';

export const CommandCenter: React.FC = () => {
  const {
    tasks,
    fixedEvents,
    focusBudget,
    plan,
    pendingProposal,
    assistantState,
    decisionLedger,
    executeCommand,
    approveProposal,
    rejectProposal,
    undoAction,
    setActiveTab,
  } = useApp();

  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'deferred');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const deferredTasks = tasks.filter(t => t.status === 'deferred');

  const completionPercent = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  const nextTask = activeTasks[0];

  const quickCommands = [
    { label: 'Plan my day', query: 'Plan my day.', icon: Sparkles },
    { label: 'I have only two hours today', query: 'I have only two hours today.', icon: Clock },
    { label: 'Low energy + Presentation due', query: "I'm low on energy, but my presentation is due today.", icon: Flame },
    { label: 'Fit 30m workout before 4 PM', query: 'Fit a 30-minute workout before 4 PM.', icon: Zap },
    { label: 'Move lowest-priority to tomorrow', query: 'Move my lowest-priority task to tomorrow.', icon: ArrowRight },
  ];

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Pending Proposal Banner (if awaiting user approval) */}
      {pendingProposal && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 mt-0.5">
                <AlertCircle size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Awaiting Approval
                  </span>
                  <span className="text-xs text-slate-400">• Verification Gate</span>
                </div>
                <h4 className="text-base font-bold text-white mt-0.5">
                  {pendingProposal.summary}
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {pendingProposal.reasoning}
                </p>
                {pendingProposal.tradeoffs.length > 0 && (
                  <p className="text-xs text-amber-200/90 mt-1">
                    Trade-offs: {pendingProposal.tradeoffs.join(' | ')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
              <button
                onClick={() => rejectProposal(pendingProposal.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors"
              >
                Reject Change
              </button>
              <button
                onClick={() => approveProposal(pendingProposal.id)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-500/20 transition-colors"
              >
                Approve & Execute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Ambient Assistant Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 md:p-8">
        {/* Soft background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left max-w-xl">
            <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-medium text-cyan-400">
              <Calendar size={14} />
              <span>{currentDateStr}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">Flight Status: Active</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Good day, Harsh. Your flight plan is ready.
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              {pendingProposal
                ? 'A schedule rebalance is awaiting your confirmation before mutating the active flight plan.'
                : plan.conflicts.length === 0
                ? 'All daily commitments are harmoniously slotted. Critical deadlines and fixed calendar meetings are fully protected.'
                : `${plan.conflicts.length} schedule conflict(s) detected. Adaptive rebalancing recommended.`}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800/80 text-xs font-medium text-slate-200 border border-slate-700">
                <CheckCircle2 size={13} className="text-cyan-400" />
                {activeTasks.length} active tasks
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800/80 text-xs font-medium text-slate-200 border border-slate-700">
                <Clock size={13} className="text-violet-400" />
                {focusBudget.allocatedFocusMinutes}m allocated ({focusBudget.remainingFocusMinutes}m free)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800/80 text-xs font-medium text-slate-200 border border-slate-700">
                <Zap size={13} className="text-amber-400" />
                Energy: {focusBudget.energyLevel.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Central Ambient Assistant Sphere */}
          <div className="flex flex-col items-center gap-3">
            <AssistantSphere state={assistantState} size="lg" />
            <div className="text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Ambient Flight Director
              </div>
              <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                {assistantState === 'idle' && 'Monitoring Constraints'}
                {assistantState === 'processing' && 'Synthesizing Request'}
                {assistantState === 'planning' && 'Calculating Optimal Slots'}
                {assistantState === 'awaiting_approval' && 'Pending Your Confirmation'}
                {assistantState === 'success' && 'Schedule Synchronized'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metric Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Progress */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Daily Completion</span>
            <span className="font-semibold text-cyan-400">{completionPercent}%</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {completedTasks.length} <span className="text-sm font-normal text-slate-400">/ {tasks.length} tasks</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-violet-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {deferredTasks.length} task(s) safely deferred to avoid crunch.
          </p>
        </div>

        {/* Metric 2: Next Recommended Task */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Next Recommended</span>
            <span className="font-semibold text-violet-400">
              {nextTask?.scheduledStart || 'Now'}
            </span>
          </div>
          <div className="mt-2 text-base font-bold text-white truncate" title={nextTask?.title}>
            {nextTask ? nextTask.title : 'All caught up!'}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            {nextTask && (
              <>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-semibold uppercase">
                  {nextTask.priority}
                </span>
                <span className="text-slate-400 text-xs">{nextTask.duration} mins</span>
                <span className="text-slate-400 text-xs">• Due {nextTask.deadline}</span>
              </>
            )}
          </div>
          <p className="mt-2 text-[11px] text-slate-400 truncate">
            {nextTask?.description || 'No urgent actions pending.'}
          </p>
        </div>

        {/* Metric 3: Focus & Stamina Budget */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Focus Budget Utilization</span>
            <span className="font-semibold text-amber-400">{focusBudget.utilizationPercentage}%</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {focusBudget.allocatedFocusMinutes} <span className="text-sm font-normal text-slate-400">/ {focusBudget.totalCapacityMinutes}m</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                focusBudget.utilizationPercentage > 95
                  ? 'bg-rose-500'
                  : focusBudget.utilizationPercentage > 75
                  ? 'bg-amber-400'
                  : 'bg-cyan-400'
              }`}
              style={{ width: `${Math.min(100, focusBudget.utilizationPercentage)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-400 truncate" title={focusBudget.energyAdvice}>
            Cadence: {focusBudget.preferredSessionLength}m sprints / {focusBudget.recommendedBreakMinutes}m breaks
          </p>
        </div>

        {/* Metric 4: Calendar Integrity & Fixed Events */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Calendar Commitments</span>
            <span className="font-semibold text-emerald-400">Locked</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {fixedEvents.length} <span className="text-sm font-normal text-slate-400">fixed events</span>
          </div>
          <div className="mt-2 flex flex-col gap-1 text-xs text-slate-300">
            {fixedEvents.map(e => (
              <div key={e.id} className="flex justify-between items-center text-[11px]">
                <span className="truncate max-w-[130px]">{e.title}</span>
                <span className="text-slate-400 font-mono">{e.startTime}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Command Launcher */}
      <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Quick Natural-Language Commands
          </h3>
          <span className="text-xs text-cyan-400 cursor-pointer hover:underline" onClick={() => setActiveTab('assistant')}>
            Open Assistant Conversation →
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickCommands.map((cmd, idx) => {
            const Icon = cmd.icon;
            return (
              <button
                key={idx}
                onClick={() => executeCommand(cmd.query)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white border border-slate-700/80 hover:border-cyan-500/40 transition-all shadow-sm group"
              >
                <Icon size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>"{cmd.label}"</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Ledger Entries (Verifiable Audit Trail with Undo) */}
      <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Verifiable Decision Ledger (Recent Operations)
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('ledger')}
            className="text-xs text-cyan-400 hover:underline"
          >
            View Full Ledger ({decisionLedger.length}) →
          </button>
        </div>

        {decisionLedger.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
            No operations executed yet today. Trigger a command like "Plan my day" or "I have only two hours today" to generate verifiable ledger entries.
          </div>
        ) : (
          <div className="space-y-2">
            {decisionLedger.slice(0, 3).map(entry => (
              <div
                key={entry.id}
                className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        entry.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : entry.status === 'rejected'
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-violet-500/20 text-violet-300'
                      }`}
                    >
                      {entry.status}
                    </span>
                    <span className="font-semibold text-slate-200">{entry.summary}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] line-clamp-1">{entry.reasoning}</p>
                </div>

                {entry.canUndo && entry.status === 'completed' && (
                  <button
                    onClick={() => undoAction(entry.actionId)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs shrink-0 transition-colors"
                  >
                    <Undo2 size={13} className="text-amber-400" />
                    <span>Undo Action</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

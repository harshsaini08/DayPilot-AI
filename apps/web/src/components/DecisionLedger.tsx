import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { ActionLifecycleStatus } from '@daypilot/shared';
import {
  FileCheck2,
  ShieldCheck,
  Undo2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  Filter,
} from 'lucide-react';

export const DecisionLedger: React.FC = () => {
  const { decisionLedger, undoAction, isProcessing } = useApp();
  const [filter, setFilter] = useState<string>('all');

  const filteredEntries = decisionLedger.filter(entry => {
    if (filter === 'all') return true;
    return entry.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 size={20} className="text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Trust, Consent & Verifiable Decision Ledger
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable audit record of all proposed, approved, rejected, and undone operations.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck size={15} className="text-emerald-400" />
          <span>Cryptographically auditable state snapshots</span>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 max-w-fit">
        {(['all', 'completed', 'proposed', 'rejected', 'undone'] as const).map(st => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-3 py-1 rounded-md text-xs capitalize transition-all ${
              filter === st
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {st} ({decisionLedger.filter(e => (st === 'all' ? true : e.status === st)).length})
          </button>
        ))}
      </div>

      {/* Ledger Entries List */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            No ledger entries matching filter "{filter}". Trigger commands like "Plan my day", "I have only two hours today", or "Move lowest-priority task" to generate entries.
          </div>
        ) : (
          filteredEntries.map(entry => {
            const isCompleted = entry.status === 'completed';
            const isRejected = entry.status === 'rejected';
            const isUndone = entry.status === 'undone';

            return (
              <div
                key={entry.id}
                className={`p-5 rounded-xl border transition-all text-xs space-y-3 ${
                  isCompleted
                    ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    : isRejected
                    ? 'bg-slate-950/50 border-slate-800/60 opacity-75'
                    : isUndone
                    ? 'bg-violet-950/20 border-violet-500/30'
                    : 'bg-amber-950/20 border-amber-500/30'
                }`}
              >
                {/* Entry Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : isRejected
                          ? 'bg-slate-800 text-slate-400 border border-slate-700'
                          : isUndone
                          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {entry.status}
                    </span>

                    <span className="font-bold text-white text-sm">{entry.summary}</span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                      Source: {entry.source}
                    </span>
                    <span>{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                {/* Request and Reasoning */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-400">Original User Request:</span>
                    <p className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 font-mono text-[11px] text-cyan-300">
                      "{entry.request}"
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-semibold text-slate-400">Audit Reasoning:</span>
                    <p className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed">
                      {entry.reasoning}
                    </p>
                  </div>
                </div>

                {/* Trade-offs if any */}
                {entry.tradeoffs.length > 0 && (
                  <div className="text-[11px] text-amber-300/90 bg-amber-950/20 p-2.5 rounded-lg border border-amber-500/20">
                    <span className="font-semibold">Evaluated Trade-offs: </span>
                    {entry.tradeoffs.join(' | ')}
                  </div>
                )}

                {/* Footer and Undo Action */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px]">
                  <span className="text-slate-500 font-mono">Action ID: {entry.actionId}</span>

                  {entry.canUndo && isCompleted && (
                    <button
                      onClick={() => undoAction(entry.actionId)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-medium transition-colors"
                    >
                      <Undo2 size={13} className="text-amber-400" />
                      <span>Undo This Action (Restore Previous State)</span>
                    </button>
                  )}

                  {isUndone && (
                    <span className="text-violet-400 italic">State successfully restored.</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

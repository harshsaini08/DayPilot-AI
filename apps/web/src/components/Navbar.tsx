import React from 'react';
import { useApp, TabType } from '../state/AppContext';
import { AssistantSphere } from './AssistantSphere';
import {
  LayoutDashboard,
  CalendarClock,
  Bot,
  Zap,
  Cpu,
  FileCheck2,
  Settings,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  LucideIcon,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    assistantState,
    mcpConnected,
    resetDemo,
    isProcessing,
    pendingProposal,
  } = useApp();

  const tabs: Array<{ id: TabType; label: string; icon: LucideIcon }> = [
    { id: 'command', label: 'Command Center', icon: LayoutDashboard },
    { id: 'flightplan', label: 'Flight Plan', icon: CalendarClock },
    { id: 'assistant', label: 'Conversational', icon: Bot },
    { id: 'focus', label: 'Focus Studio', icon: Zap },
    { id: 'mcp', label: 'MCP Studio', icon: Cpu },
    { id: 'ledger', label: 'Decision Ledger', icon: FileCheck2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <AssistantSphere state={assistantState} size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400 bg-clip-text text-transparent">
                  DayPilot AI
                </span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Alexa+ Inspired
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Your day, intelligently orchestrated.
              </p>
            </div>
          </div>

          {/* Quick MCP status chip */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                mcpConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
              }`}
              title={
                mcpConnected
                  ? 'Real Streamable HTTP MCP Server connected on port 3001'
                  : 'Operating in Local Deterministic Runtime mode'
              }
            >
              {mcpConnected ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span className="font-medium hidden sm:inline">MCP SERVER ACTIVE</span>
                  <span className="font-medium sm:hidden">MCP ON</span>
                </>
              ) : (
                <>
                  <AlertCircle size={13} className="text-cyan-400" />
                  <span className="font-medium hidden sm:inline">LOCAL RUNTIME</span>
                  <span className="font-medium sm:hidden">LOCAL</span>
                </>
              )}
            </div>

            {/* Quick Demo Reset Button */}
            <button
              onClick={() => resetDemo()}
              disabled={isProcessing}
              title="Reset application to deterministic demo state"
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
            >
              <RotateCcw size={12} className={isProcessing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav
          className="flex items-center overflow-x-auto max-w-full gap-1 p-1 bg-slate-900/80 border border-slate-800/80 rounded-xl"
          aria-label="Navigation Tabs"
        >
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const hasPendingBadge = tab.id === 'flightplan' && pendingProposal !== null;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all relative ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-cyan-400' : 'text-slate-400'} />
                <span>{tab.label}</span>
                {hasPendingBadge && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

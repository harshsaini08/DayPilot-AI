import React from 'react';
import { useApp } from '../state/AppContext';
import { EnergyLevel, ENERGY_PROFILES } from '@daypilot/shared';
import {
  Zap,
  Battery,
  BatteryCharging,
  BatteryMedium,
  Brain,
  Coffee,
  ShieldAlert,
  Flame,
  Info,
  Sparkles,
} from 'lucide-react';

export const FocusStudio: React.FC = () => {
  const { focusBudget, tasks, setEnergyLevel, executeCommand } = useApp();

  const energyOptions: Array<{ level: EnergyLevel; label: string; icon: any; color: string }> = [
    { level: 'low', label: 'Low Energy', icon: Battery, color: 'text-amber-400' },
    { level: 'moderate', label: 'Moderate Energy', icon: BatteryMedium, color: 'text-cyan-400' },
    { level: 'high', label: 'High Energy', icon: BatteryCharging, color: 'text-violet-400' },
  ];

  const currentProfile = ENERGY_PROFILES[focusBudget.energyLevel];
  const breakdown = focusBudget.cognitiveBreakdown;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Personal Energy & Focus Budget
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            User-directed cognitive pacing. Matches task complexity with available mental stamina.
          </p>
        </div>

        <button
          onClick={() => executeCommand("I'm low on energy, but my presentation is due today.")}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all shadow-sm"
        >
          <Flame size={14} className="text-amber-400" />
          <span>Test Low-Energy Scenario</span>
        </button>
      </div>

      {/* Energy Profile Selector */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Declare Current Energy Level
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {energyOptions.map(opt => {
            const Icon = opt.icon;
            const isSelected = focusBudget.energyLevel === opt.level;
            const profile = ENERGY_PROFILES[opt.level];

            return (
              <div
                key={opt.level}
                onClick={() => setEnergyLevel(opt.level)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={18} className={opt.color} />
                    <span className="font-bold text-sm text-white">{opt.label}</span>
                  </div>
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {profile.description}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300">
                  <span>Sprint: {profile.preferredSessionMinutes}m</span>
                  <span>Break: {profile.recommendedBreakMinutes}m</span>
                  <span>Deep Cap: {profile.maxDeepWorkDailyMinutes}m</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cognitive Demand Breakdown Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Workload Distribution */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Brain size={15} className="text-violet-400" />
              <span>Cognitive Demand Workload Breakdown</span>
            </h3>
            <span className="text-xs text-slate-400">
              {focusBudget.allocatedFocusMinutes}m total work today
            </span>
          </div>

          <div className="space-y-3">
            {/* Deep */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Deep Cognitive Load
                </span>
                <span className="font-mono text-slate-300">
                  {breakdown.deep} mins ({Math.round((breakdown.deep / (focusBudget.allocatedFocusMinutes || 1)) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (breakdown.deep / (focusBudget.totalCapacityMinutes || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* High */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  High Complexity
                </span>
                <span className="font-mono text-slate-300">
                  {breakdown.high} mins ({Math.round((breakdown.high / (focusBudget.allocatedFocusMinutes || 1)) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (breakdown.high / (focusBudget.totalCapacityMinutes || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Moderate */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  Moderate Everyday Work
                </span>
                <span className="font-mono text-slate-300">
                  {breakdown.moderate} mins ({Math.round((breakdown.moderate / (focusBudget.allocatedFocusMinutes || 1)) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (breakdown.moderate / (focusBudget.totalCapacityMinutes || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Low */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Low Administrative / Quick Wins
                </span>
                <span className="font-mono text-slate-300">
                  {breakdown.low} mins ({Math.round((breakdown.low / (focusBudget.allocatedFocusMinutes || 1)) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (breakdown.low / (focusBudget.totalCapacityMinutes || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Pacing Advice Card */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Coffee size={15} className="text-cyan-400" />
            <span>Pacing Strategy</span>
          </h3>

          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-white">Recommended Session Cadence:</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentProfile.pacingStrategy}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-amber-400">Current Advisory:</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {focusBudget.energyAdvice}
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400">
            <Info size={14} className="text-cyan-400 shrink-0 mt-0.5" />
            <span>
              All energy levels are strictly self-reported. DayPilot never claims biometric or affective detection.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

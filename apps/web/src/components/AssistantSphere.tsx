import React from 'react';
import { AssistantState } from '../state/AppContext';
import { Sparkles, Check, AlertTriangle, AlertCircle, RefreshCw, Zap } from 'lucide-react';

interface AssistantSphereProps {
  state: AssistantState;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onClick?: () => void;
}

export const AssistantSphere: React.FC<AssistantSphereProps> = ({
  state,
  size = 'md',
  interactive = false,
  onClick,
}) => {
  // Dimensions
  const dimMap = {
    sm: { box: 'w-10 h-10', svg: 40, stroke: 2, iconSize: 16 },
    md: { box: 'w-24 h-24', svg: 96, stroke: 3, iconSize: 28 },
    lg: { box: 'w-36 h-36', svg: 144, stroke: 4, iconSize: 40 },
  };
  const dim = dimMap[size];

  // Visual palettes based on state
  const config = {
    idle: {
      gradient: 'from-cyan-500 via-sky-600 to-violet-600',
      shadow: 'shadow-[0_0_35px_rgba(6,182,212,0.35)]',
      border: 'border-cyan-500/40',
      label: 'Idle • Ambient Active',
      anim: 'sphere-anim-idle',
      icon: Sparkles,
      iconColor: 'text-cyan-200',
    },
    listening: {
      gradient: 'from-cyan-400 via-teal-500 to-blue-600',
      shadow: 'shadow-[0_0_45px_rgba(34,211,238,0.55)]',
      border: 'border-cyan-400',
      label: 'Listening...',
      anim: 'sphere-anim-listening',
      icon: Zap,
      iconColor: 'text-white',
    },
    processing: {
      gradient: 'from-violet-500 via-fuchsia-500 to-cyan-500',
      shadow: 'shadow-[0_0_45px_rgba(168,85,247,0.55)]',
      border: 'border-violet-400',
      label: 'Processing intent...',
      anim: 'sphere-anim-processing',
      icon: RefreshCw,
      iconColor: 'text-violet-100',
    },
    planning: {
      gradient: 'from-blue-600 via-cyan-500 to-indigo-600',
      shadow: 'shadow-[0_0_40px_rgba(59,130,246,0.5)]',
      border: 'border-blue-400',
      label: 'Orchestrating Flight Plan...',
      anim: 'sphere-anim-planning',
      icon: RefreshCw,
      iconColor: 'text-cyan-100',
    },
    awaiting_approval: {
      gradient: 'from-amber-500 via-orange-600 to-yellow-500',
      shadow: 'shadow-[0_0_45px_rgba(245,158,11,0.55)]',
      border: 'border-amber-400 animate-pulse',
      label: 'Awaiting User Approval',
      anim: 'sphere-anim-approval',
      icon: AlertTriangle,
      iconColor: 'text-amber-100',
    },
    success: {
      gradient: 'from-emerald-500 via-teal-600 to-cyan-500',
      shadow: 'shadow-[0_0_45px_rgba(16,185,129,0.5)]',
      border: 'border-emerald-400',
      label: 'Operation Applied',
      anim: 'sphere-anim-idle',
      icon: Check,
      iconColor: 'text-emerald-100',
    },
    error: {
      gradient: 'from-rose-500 via-red-600 to-orange-600',
      shadow: 'shadow-[0_0_45px_rgba(244,63,94,0.55)]',
      border: 'border-rose-400',
      label: 'Conflict Detected',
      anim: 'sphere-anim-idle',
      icon: AlertCircle,
      iconColor: 'text-rose-100',
    },
  }[state];

  const IconComp = config.icon;

  return (
    <div
      role="status"
      aria-label={`DayPilot Assistant: ${config.label}`}
      onClick={interactive ? onClick : undefined}
      className={`relative flex items-center justify-center rounded-full transition-all duration-500 ${dim.box} ${config.shadow} ${
        interactive ? 'cursor-pointer hover:scale-105' : ''
      }`}
    >
      {/* Outer ambient glow ring */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-tr ${config.gradient} opacity-75 blur-md ${config.anim}`}
      />

      {/* Rotating orbit ring for active states */}
      {(state === 'processing' || state === 'planning') && (
        <div className="absolute inset-[-4px] rounded-full border border-dashed border-cyan-400/60 animate-spin-slow" />
      )}

      {/* Main Glass Sphere Body */}
      <div
        className={`relative z-10 w-full h-full rounded-full bg-gradient-to-b ${config.gradient} p-[2px] border ${config.border} backdrop-blur-md flex items-center justify-center overflow-hidden`}
      >
        {/* Core lighting gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.45),transparent_60%)]" />
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]" />

        {/* Center state icon */}
        <div className="relative z-20 flex flex-col items-center justify-center">
          <IconComp
            size={dim.iconSize}
            className={`${config.iconColor} ${state === 'processing' ? 'animate-spin' : ''}`}
          />
        </div>
      </div>
    </div>
  );
};

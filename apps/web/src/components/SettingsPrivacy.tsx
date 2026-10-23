import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import {
  Settings,
  Shield,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Server,
  RotateCcw,
  CheckCircle2,
  Lock,
  Database,
  ExternalLink,
} from 'lucide-react';

export const SettingsPrivacy: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetDemo,
    mcpConnected,
    checkMcpConnection,
    isProcessing,
  } = useApp();

  const [testStatus, setTestStatus] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setTestStatus('Testing endpoint...');
    await checkMcpConnection();
    setTestStatus(mcpConnected ? 'Successfully connected to MCP Server!' : 'Connection failed. Ensure server is running on port 3001.');
    setTimeout(() => setTestStatus(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Settings size={20} className="text-cyan-400" />
          <h2 className="text-lg font-bold text-white tracking-tight">
            Settings & Privacy Architecture
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          User sovereignty, accessible motion, audio preferences, and MCP endpoint configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel 1: Preferences */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 space-y-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            User Experience & Accessibility
          </h3>

          {/* Reduced Motion Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
            <div className="space-y-0.5">
              <div className="font-semibold text-white flex items-center gap-1.5">
                {settings.reducedMotion ? <EyeOff size={14} className="text-amber-400" /> : <Eye size={14} className="text-cyan-400" />}
                <span>Reduced Motion</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Disables animated pulses, orbital rotations, and atmospheric transitions.
              </p>
            </div>

            <button
              onClick={() => updateSettings({ reducedMotion: !settings.reducedMotion })}
              className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                settings.reducedMotion ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          {/* Optional Audio Feedback */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
            <div className="space-y-0.5">
              <div className="font-semibold text-white flex items-center gap-1.5">
                {settings.soundEnabled ? <Volume2 size={14} className="text-cyan-400" /> : <VolumeX size={14} className="text-slate-400" />}
                <span>Audio Feedback</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Synthesizes subtle chimes on confirmations (Disabled by default).
              </p>
            </div>

            <button
              onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                settings.soundEnabled ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          {/* Demo Factory Reset */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Reset Demo Environment</span>
              <button
                onClick={() => resetDemo()}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-colors disabled:opacity-50"
              >
                <RotateCcw size={13} className={isProcessing ? 'animate-spin' : ''} />
                <span>Reset to Seed Data</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Restores the original 8 tasks, 2 fixed meetings, and baseline focus budget.
            </p>
          </div>
        </div>

        {/* Panel 2: MCP Connection Config */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 space-y-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Model Context Protocol Configuration
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                MCP Server URL (Streamable HTTP / SSE)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.mcpUrl}
                  onChange={e => updateSettings({ mcpUrl: e.target.value })}
                  placeholder="http://localhost:3001"
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleTestConnection}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
                >
                  Test Ping
                </button>
              </div>
              {testStatus && (
                <p className="text-[11px] text-cyan-300 mt-1 font-mono">{testStatus}</p>
              )}
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Server Health Status:</span>
                <span className={mcpConnected ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {mcpConnected ? '200 OK (Active)' : 'Offline / Local Fallback'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Specification Version:</span>
                <span className="font-mono text-slate-200">2024-11-05</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Transport:</span>
                <span className="font-mono text-slate-200">Streamable HTTP / SSE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy and Trust Disclosure */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Shield size={16} className="text-cyan-400" />
          <span>Privacy, Trust & Ambient Safety Principles</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400 leading-relaxed pt-1">
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="font-bold text-white block">1. Zero Private API Secrets</span>
            <p className="text-[11px]">
              All core scheduling, intent understanding, and MCP routing runs 100% locally. No proprietary API keys or billing credentials are committed or required.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="font-bold text-white block">2. Explicit Consent Gates</span>
            <p className="text-[11px]">
              Consequential changes (e.g. compressing day to 2 hours or deferring tasks) are never applied silently. The engine stages a preview and awaits explicit user confirmation.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="font-bold text-white block">3. User-Declared Energy Only</span>
            <p className="text-[11px]">
              We never fabricate biometric telemetry, webcam emotional analysis, or health diagnoses. Energy levels are strictly declared by you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

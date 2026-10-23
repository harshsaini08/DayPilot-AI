import React from 'react';
import { useApp } from './state/AppContext';
import { Navbar } from './components/Navbar';
import { CommandCenter } from './components/CommandCenter';
import { DailyFlightPlan } from './components/DailyFlightPlan';
import { ConversationalAssistant } from './components/ConversationalAssistant';
import { FocusStudio } from './components/FocusStudio';
import { McpIntegrationStudio } from './components/McpIntegrationStudio';
import { DecisionLedger } from './components/DecisionLedger';
import { SettingsPrivacy } from './components/SettingsPrivacy';

export const AppContent: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {activeTab === 'command' && <CommandCenter />}
        {activeTab === 'flightplan' && <DailyFlightPlan />}
        {activeTab === 'assistant' && <ConversationalAssistant />}
        {activeTab === 'focus' && <FocusStudio />}
        {activeTab === 'mcp' && <McpIntegrationStudio />}
        {activeTab === 'ledger' && <DecisionLedger />}
        {activeTab === 'settings' && <SettingsPrivacy />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">DayPilot AI</span>
            <span>—</span>
            <span>Amazon Developer Hackathon Prototype (Alexa+ Inspired)</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Developer: Harsh Saini</span>
            <span>•</span>
            <span>MIT License</span>
            <span>•</span>
            <span className="font-mono text-[11px] text-cyan-400">MCP Spec 2024-11-05</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};

export default App;

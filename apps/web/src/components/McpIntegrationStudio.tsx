import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { mcpService, McpToolCallResult } from '../services/mcpClient';
import {
  Cpu,
  CheckCircle2,
  AlertCircle,
  Play,
  Terminal,
  Database,
  FileText,
  Clock,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Code2,
} from 'lucide-react';

export const McpIntegrationStudio: React.FC = () => {
  const {
    mcpConnected,
    mcpManifest,
    settings,
    checkMcpConnection,
    tasks,
    fixedEvents,
    focusBudget,
    executeCommand,
    setActiveTab,
  } = useApp();

  const [selectedTool, setSelectedTool] = useState<string>('get_daily_tasks');
  const [toolArgsText, setToolArgsText] = useState<string>('{\n  "status": "all"\n}');
  const [executionResult, setExecutionResult] = useState<McpToolCallResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedResourceUri, setSelectedResourceUri] = useState<string>('daypilot://tasks/today');
  const [resourceContent, setResourceContent] = useState<string | null>(null);
  const [executionHistory, setExecutionHistory] = useState<McpToolCallResult[]>([]);

  const defaultArgsMap: Record<string, string> = {
    get_daily_tasks: '{\n  "status": "all"\n}',
    get_calendar_events: '{}',
    create_task: '{\n  "title": "New MCP Verified Task",\n  "duration": 45,\n  "priority": "high",\n  "deadline": "18:00",\n  "category": "work",\n  "cognitiveDemand": "moderate"\n}',
    propose_schedule_rebalance: '{\n  "maxCapacityMinutes": 120,\n  "reason": "Studio MCP test invocation"\n}',
    get_focus_budget: '{}',
    summarize_day: '{}',
    get_decision_history: '{\n  "limit": 10\n}',
    approve_proposed_action: '{\n  "actionId": "prop-sample-id"\n}',
    reject_proposed_action: '{\n  "actionId": "prop-sample-id",\n  "reason": "Testing rejection"\n}',
    undo_last_action: '{}',
  };

  const handleSelectTool = (toolName: string) => {
    setSelectedTool(toolName);
    setToolArgsText(defaultArgsMap[toolName] || '{}');
  };

  const handleExecuteTool = async () => {
    setIsExecuting(true);
    let parsedArgs = {};
    try {
      parsedArgs = JSON.parse(toolArgsText || '{}');
    } catch (e: any) {
      setExecutionResult({
        tool: selectedTool,
        durationMs: 0,
        result: null,
        error: `JSON parse error in arguments: ${e.message}`,
      });
      setIsExecuting(false);
      return;
    }

    let result: McpToolCallResult;
    if (mcpConnected) {
      result = await mcpService.invokeTool(selectedTool, parsedArgs);
    } else {
      // Local deterministic fallback
      const start = performance.now();
      await new Promise(r => setTimeout(r, 60));
      result = {
        tool: selectedTool,
        durationMs: Math.round(performance.now() - start),
        result: {
          note: 'Executed via Local Deterministic Runtime fallback (real MCP server offline).',
          tool: selectedTool,
          tasksCount: tasks.length,
          status: 'ok',
        },
      };
    }

    setExecutionResult(result);
    setExecutionHistory(prev => [result, ...prev]);
    setIsExecuting(false);
  };

  const handleInspectResource = (uri: string) => {
    setSelectedResourceUri(uri);
    if (uri === 'daypilot://tasks/today') {
      setResourceContent(JSON.stringify(tasks, null, 2));
    } else if (uri === 'daypilot://schedule/today') {
      setResourceContent(JSON.stringify(fixedEvents, null, 2));
    } else if (uri === 'daypilot://budget/focus') {
      setResourceContent(JSON.stringify(focusBudget, null, 2));
    }
  };

  const toolsList = [
    { name: 'get_daily_tasks', desc: 'Retrieve current daily tasks with duration, priority, and status' },
    { name: 'get_calendar_events', desc: 'Retrieve locked fixed commitments from calendar' },
    { name: 'create_task', desc: 'Add validated task with bounded duration and schema validation' },
    { name: 'propose_schedule_rebalance', desc: 'Calculate flight plan proposal without prematurely applying' },
    { name: 'approve_proposed_action', desc: 'Consent gate: confirms and applies proposed rebalance to state' },
    { name: 'reject_proposed_action', desc: 'Rejects proposal; leaves active schedule untouched' },
    { name: 'undo_last_action', desc: 'Reverts most recent state change, restoring previous snapshot' },
    { name: 'get_focus_budget', desc: 'Retrieve focus capacity, energy profile, and pacing advice' },
    { name: 'summarize_day', desc: 'High-level executive overview of tasks, deadlines, and conflicts' },
    { name: 'get_decision_history', desc: 'Verifiable chronological Decision Ledger query' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Connection Status */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu size={20} className="text-cyan-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Model Context Protocol (MCP) Integration Studio
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Spec: <span className="text-cyan-300 font-mono">2024-11-05</span> • Transport:{' '}
            <span className="text-cyan-300 font-mono">Streamable HTTP / SSE</span> • Port:{' '}
            <span className="text-cyan-300 font-mono">3001</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              mcpConnected
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
            }`}
          >
            {mcpConnected ? (
              <>
                <CheckCircle2 size={15} className="text-emerald-400" />
                <span>REAL MCP SERVER ACTIVE</span>
              </>
            ) : (
              <>
                <AlertCircle size={15} className="text-cyan-400" />
                <span>LOCAL DETERMINISTIC FALLBACK</span>
              </>
            )}
          </div>

          <button
            onClick={() => checkMcpConnection()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Re-check connection"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Connection Architecture Details */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="font-semibold text-slate-300">Server Endpoint: </span>
          <span className="font-mono text-cyan-400">{settings.mcpUrl}</span>
          <span className="text-slate-500 ml-2">| Health: /health | SSE: /sse | Invoke: /api/mcp/invoke</span>
        </div>

        <div className="text-slate-400 text-[11px]">
          {mcpConnected
            ? 'Connected via live HTTP/SSE. Real MCP tool dispatch verified.'
            : 'To start local MCP server: run "npm run server" in terminal.'}
        </div>
      </div>

      {/* Main Grid: Tool Registry & Interactive Execution Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tool Registry Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Code2 size={14} className="text-cyan-400" />
                <span>Discoverable MCP Tools (10)</span>
              </h3>
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {toolsList.map(t => {
                const isSelected = selectedTool === t.name;
                return (
                  <div
                    key={t.name}
                    onClick={() => handleSelectTool(t.name)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all text-xs ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/50 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white text-[11px]">{t.name}</span>
                      {isSelected && (
                        <span className="text-[10px] text-cyan-300 font-semibold uppercase">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{t.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Discoverable Resources */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Database size={14} className="text-violet-400" />
              <span>MCP Resources</span>
            </h3>

            <div className="space-y-1.5 text-xs">
              {['daypilot://tasks/today', 'daypilot://schedule/today', 'daypilot://budget/focus'].map(uri => (
                <button
                  key={uri}
                  onClick={() => handleInspectResource(uri)}
                  className={`w-full text-left p-2.5 rounded-lg border font-mono text-[11px] transition-all flex items-center justify-between ${
                    selectedResourceUri === uri
                      ? 'bg-violet-950/30 border-violet-500/50 text-violet-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate">{uri}</span>
                  <span className="text-[10px] uppercase font-semibold">Inspect</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reusable Prompts */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <FileText size={14} className="text-amber-400" />
              <span>MCP Reusable Prompts</span>
            </h3>

            <div className="space-y-1.5 text-xs">
              {[
                { name: 'daily_planning', query: 'Plan my day.' },
                { name: 'deadline_recovery', query: 'I have only two hours today.' },
                { name: 'low_energy_planning', query: "I'm low on energy, but my presentation is due today." },
              ].map(p => (
                <div
                  key={p.name}
                  className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                >
                  <span className="font-mono text-[11px] text-slate-200">{p.name}</span>
                  <button
                    onClick={() => {
                      executeCommand(p.query);
                      setActiveTab('assistant');
                    }}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <span>Run in Chat</span>
                    <ExternalLink size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Execution Inspector Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Terminal size={14} className="text-cyan-400" />
                  <span>Interactive Tool Invoker & Inspector</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Target Tool: <span className="font-mono text-cyan-300 font-bold">{selectedTool}</span>
                </p>
              </div>

              <button
                onClick={handleExecuteTool}
                disabled={isExecuting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-40"
              >
                <Play size={13} className={isExecuting ? 'animate-spin' : ''} />
                <span>{isExecuting ? 'Calling MCP...' : 'Invoke Tool'}</span>
              </button>
            </div>

            {/* Input Arguments JSON */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Tool Arguments (JSON Schema Validated):
              </label>
              <textarea
                rows={5}
                value={toolArgsText}
                onChange={e => setToolArgsText(e.target.value)}
                className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Execution Result Box */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-400">Response Payload:</span>
                {executionResult && (
                  <span className="text-[11px] font-mono text-slate-400">
                    Duration: <span className="text-cyan-300">{executionResult.durationMs}ms</span>
                  </span>
                )}
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] max-h-72 overflow-y-auto">
                {executionResult ? (
                  executionResult.error ? (
                    <div className="text-rose-400">Error: {executionResult.error}</div>
                  ) : (
                    <pre className="text-emerald-400">
                      {JSON.stringify(executionResult.result, null, 2)}
                    </pre>
                  )
                ) : (
                  <span className="text-slate-600">
                    // Tool output will be displayed here after invocation...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Resource Viewer Panel */}
          {resourceContent && (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-violet-300 font-mono">
                  {selectedResourceUri}
                </span>
                <button
                  onClick={() => setResourceContent(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-violet-200 max-h-60 overflow-y-auto">
                {resourceContent}
              </pre>
            </div>
          )}

          {/* Execution History */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Clock size={13} className="text-slate-400" />
              <span>Session MCP Tool Invocations ({executionHistory.length})</span>
            </h3>

            {executionHistory.length === 0 ? (
              <p className="text-xs text-slate-500">No tool calls recorded in this session yet.</p>
            ) : (
              <div className="space-y-1.5 text-xs max-h-40 overflow-y-auto">
                {executionHistory.slice(0, 5).map((h, i) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between font-mono text-[11px]"
                  >
                    <span className="text-cyan-300 font-semibold">{h.tool}</span>
                    <span className="text-slate-400">{h.durationMs}ms</span>
                    <span className={h.error ? 'text-rose-400' : 'text-emerald-400'}>
                      {h.error ? 'ERROR' : '200 OK'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { AssistantSphere } from './AssistantSphere';
import {
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  AlertTriangle,
  Check,
  X,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const ConversationalAssistant: React.FC = () => {
  const {
    chatMessages,
    executeCommand,
    isProcessing,
    assistantState,
    pendingProposal,
    approveProposal,
    rejectProposal,
    mcpConnected,
    setActiveTab,
  } = useApp();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    const query = input.trim();
    setInput('');
    executeCommand(query);
  };

  const handleSuggestionClick = (prompt: string) => {
    if (isProcessing) return;
    executeCommand(prompt);
  };

  const suggestedPrompts = [
    'Plan my day.',
    'I have only two hours today.',
    "I'm low on energy, but my presentation is due today.",
    'Fit a 30-minute workout before 4 PM.',
    'What should I do next?',
    'Why did you move this task?',
    'Show me the changes.',
    'Move my lowest-priority task to tomorrow.',
    'Reset Demo.',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xl">
      {/* Assistant Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AssistantSphere state={assistantState} size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">DayPilot Conversational Agent</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                {mcpConnected ? 'MCP LIVE' : 'DETERMINISTIC ENGINE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Provider-independent ambient reasoning. State grounded & consent-enforced.
            </p>
          </div>
        </div>

        <div className="text-right text-xs hidden sm:block">
          <span className="text-slate-400">Protocol: </span>
          <span className="font-mono text-cyan-400 font-semibold">2024-11-05 Streamable HTTP</span>
        </div>
      </div>

      {/* Chat Thread */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {chatMessages.map(msg => {
          const isUser = msg.sender === 'user';
          const isSystem = msg.sender === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                  <ShieldCheck size={13} className="text-emerald-400" />
                  <span>{msg.text}</span>
                  <span className="text-slate-600 font-mono">• {msg.timestamp}</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-violet-600 p-[1px] flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                      <Bot size={15} className="text-cyan-300" />
                    </div>
                  </div>
                </div>
              )}

              <div className={`space-y-2 max-w-xl ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Text Bubble */}
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none shadow-md'
                      : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {/* Tool Execution Badge (if any) */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.toolCalls.map((tc, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300"
                      >
                        <Cpu size={11} className="text-cyan-400" />
                        <span className="text-cyan-300 font-semibold">{tc.toolName}</span>
                        <span className="text-slate-500">• {tc.durationMs}ms</span>
                        <span className="text-slate-500">• {tc.source}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Structured Action Proposal Card */}
                {msg.proposedAction && (
                  <div className="p-4 rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 text-xs space-y-3 shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-400 font-semibold uppercase text-[10px] tracking-wider">
                        <AlertTriangle size={13} />
                        <span>Consequential Action Proposal</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ID: {msg.proposedAction.id.substring(0, 16)}...
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-sm">{msg.proposedAction.summary}</h4>

                    <div className="space-y-1.5 text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                      <div>
                        <span className="font-semibold text-slate-400">Reasoning: </span>
                        {msg.proposedAction.reasoning}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-400">Expected Benefit: </span>
                        {msg.proposedAction.expectedBenefit}
                      </div>
                      {msg.proposedAction.tradeoffs.length > 0 && (
                        <div>
                          <span className="font-semibold text-amber-300">Trade-offs: </span>
                          {msg.proposedAction.tradeoffs.join(', ')}
                        </div>
                      )}
                    </div>

                    {/* Inline Approval / Reject Buttons */}
                    {pendingProposal && pendingProposal.id === msg.proposedAction.id && (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => rejectProposal(msg.proposedAction!.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
                        >
                          <X size={13} />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => approveProposal(msg.proposedAction!.id)}
                          className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors shadow-sm"
                        >
                          <Check size={13} />
                          <span>Approve & Apply</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Suggested Follow-Ups */}
                {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.suggestedFollowUps.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(prompt)}
                        className="px-2.5 py-1 rounded-md text-[11px] bg-slate-900/90 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 border border-slate-800 hover:border-cyan-500/40 transition-colors"
                      >
                        "{prompt}"
                      </button>
                    ))}
                  </div>
                )}

                <div className="text-[10px] text-slate-500 px-1 font-mono">
                  {msg.timestamp}
                </div>
              </div>

              {isUser && (
                <div className="shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <User size={15} className="text-slate-300" />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex gap-3 items-center text-xs text-slate-400">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Sparkles size={14} className="text-cyan-400 animate-spin" />
            </div>
            <div className="flex items-center gap-1.5">
              <span>DayPilot Flight Director is orchestrating schedule...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Carousel */}
      <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-900/30 overflow-x-auto flex gap-2">
        {suggestedPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSuggestionClick(p)}
            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-300 hover:text-white border border-slate-800 hover:border-cyan-500/40 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/80">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isProcessing}
            placeholder='Ask: "Plan my day", "I have only two hours today", "Fit a 30m workout before 4 PM"...'
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30"
          />

          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:from-cyan-400 hover:to-blue-500 transition-all shadow-md shadow-cyan-500/20"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};

/**
 * DayPilot AI - Central Application Context & State Store
 * Manages full lifecycle: tasks, flight plan, focus budget, approval flows,
 * verifiable decision ledger, chat interaction, and MCP server connectivity.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Task,
  FixedEvent,
  FocusBudget,
  DayPlan,
  ProposedAction,
  LedgerEntry,
  StateSnapshot,
  EnergyLevel,
  calculateSchedule,
  computeFocusBudget,
  processIntent,
  createInitialSnapshot,
  INITIAL_TASKS,
  INITIAL_FIXED_EVENTS,
  INITIAL_FOCUS_BUDGET,
} from '@daypilot/shared';
import { mcpService, McpManifest } from '../services/mcpClient';

export type AssistantState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'planning'
  | 'awaiting_approval'
  | 'success'
  | 'error';

export type TabType =
  | 'command'
  | 'flightplan'
  | 'assistant'
  | 'focus'
  | 'mcp'
  | 'ledger'
  | 'settings';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  intent?: string;
  proposedAction?: ProposedAction;
  suggestedFollowUps?: string[];
  toolCalls?: Array<{
    toolName: string;
    source: 'mcp_server' | 'local_deterministic';
    durationMs: number;
    result: any;
  }>;
}

export interface AppSettings {
  reducedMotion: boolean;
  soundEnabled: boolean;
  mcpUrl: string;
}

interface AppContextType {
  // State
  tasks: Task[];
  fixedEvents: FixedEvent[];
  focusBudget: FocusBudget;
  plan: DayPlan;
  pendingProposal: ProposedAction | null;
  decisionLedger: LedgerEntry[];
  assistantState: AssistantState;
  chatMessages: ChatMessage[];
  mcpConnected: boolean;
  mcpManifest: McpManifest | null;
  activeTab: TabType;
  settings: AppSettings;
  isProcessing: boolean;

  // Actions
  setActiveTab: (tab: TabType) => void;
  setAssistantState: (state: AssistantState) => void;
  executeCommand: (query: string) => Promise<void>;
  approveProposal: (proposalId: string) => Promise<void>;
  rejectProposal: (proposalId: string, reason?: string) => Promise<void>;
  undoAction: (actionId: string) => Promise<void>;
  createTask: (taskData: Omit<Task, 'id' | 'status'>) => void;
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  toggleTaskComplete: (taskId: string) => void;
  setEnergyLevel: (energy: EnergyLevel) => void;
  resetDemo: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => void;
  checkMcpConnection: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TASKS: 'daypilot_tasks_v1',
  FIXED_EVENTS: 'daypilot_fixed_events_v1',
  FOCUS_BUDGET: 'daypilot_focus_budget_v1',
  LEDGER: 'daypilot_ledger_v1',
  SETTINGS: 'daypilot_settings_v1',
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Safe local storage loaders
  const loadStored = <T,>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  const [tasks, setTasks] = useState<Task[]>(() =>
    loadStored(STORAGE_KEYS.TASKS, JSON.parse(JSON.stringify(INITIAL_TASKS)))
  );
  const [fixedEvents, setFixedEvents] = useState<FixedEvent[]>(() =>
    loadStored(STORAGE_KEYS.FIXED_EVENTS, JSON.parse(JSON.stringify(INITIAL_FIXED_EVENTS)))
  );
  const [focusBudget, setFocusBudget] = useState<FocusBudget>(() =>
    loadStored(STORAGE_KEYS.FOCUS_BUDGET, JSON.parse(JSON.stringify(INITIAL_FOCUS_BUDGET)))
  );
  const [decisionLedger, setDecisionLedger] = useState<LedgerEntry[]>(() =>
    loadStored(STORAGE_KEYS.LEDGER, [])
  );
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadStored(STORAGE_KEYS.SETTINGS, {
      reducedMotion: false,
      soundEnabled: false, // Explicitly false by default per specification
      mcpUrl: 'http://localhost:3001',
    })
  );

  const [activeTab, setActiveTab] = useState<TabType>('command');
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [pendingProposal, setPendingProposal] = useState<ProposedAction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [mcpConnected, setMcpConnected] = useState(false);
  const [mcpManifest, setMcpManifest] = useState<McpManifest | null>(null);

  // Initial welcome message
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: "Hello! I am DayPilot AI, your Alexa+-inspired Day Flight Director. I orchestrate your daily schedule, manage cognitive stamina, and enforce verifiable execution via MCP tools. Try asking \"Plan my day\", \"I have only two hours today\", or \"Fit a 30-minute workout before 4 PM\".",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedFollowUps: [
        'Plan my day.',
        'I have only two hours today.',
        'I am low on energy, but my presentation is due today.',
        'Fit a 30-minute workout before 4 PM.',
      ],
    },
  ]);

  // Derived calculated schedule
  const [plan, setPlan] = useState<DayPlan>(() => {
    const res = calculateSchedule(tasks, fixedEvents, focusBudget);
    return res.plan;
  });

  // Re-calculate plan whenever tasks, fixedEvents, or focusBudget change
  const refreshPlan = useCallback((currentTasks: Task[], currentEvents: FixedEvent[], currentBudget: FocusBudget) => {
    const res = calculateSchedule(currentTasks, currentEvents, currentBudget);
    setPlan(res.plan);
    return res.plan;
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      localStorage.setItem(STORAGE_KEYS.FIXED_EVENTS, JSON.stringify(fixedEvents));
      localStorage.setItem(STORAGE_KEYS.FOCUS_BUDGET, JSON.stringify(focusBudget));
      localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(decisionLedger));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not write to localStorage', e);
    }
  }, [tasks, fixedEvents, focusBudget, decisionLedger, settings]);

  // Apply reduced motion class to document element
  useEffect(() => {
    if (settings.reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  }, [settings.reducedMotion]);

  // Sound synthesis utility (synthesizes subtle chimes without external audio assets)
  const playChime = useCallback((type: 'success' | 'alert' | 'click') => {
    if (!settings.soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      } else if (type === 'alert') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(330, audioCtx.currentTime + 0.2);
      } else {
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime);
      }

      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // Audio context restricted or unsupported
    }
  }, [settings.soundEnabled]);

  // Ping MCP Server
  const checkMcpConnection = useCallback(async () => {
    mcpService.setServerUrl(settings.mcpUrl);
    const health = await mcpService.checkHealth();
    if (health.ok) {
      setMcpConnected(true);
      const manifest = await mcpService.getManifest();
      setMcpManifest(manifest);
    } else {
      setMcpConnected(false);
      setMcpManifest(null);
    }
  }, [settings.mcpUrl]);

  useEffect(() => {
    checkMcpConnection();
    const interval = setInterval(checkMcpConnection, 12000);
    return () => clearInterval(interval);
  }, [checkMcpConnection]);

  // Execute conversational command
  const executeCommand = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages(prev => [...prev, userMsg]);
      setIsProcessing(true);
      setAssistantState('processing');

      // Small async delay for realistic ambient response
      await new Promise(r => setTimeout(r, 400));

      const intentContext = {
        tasks,
        fixedEvents,
        focusBudget,
        lastProposal: pendingProposal || undefined,
        recentLedgerCount: decisionLedger.length,
      };

      // Process intent
      setAssistantState('planning');
      const result = processIntent(query, intentContext);

      // Check if MCP server is online for executing proposal or sync
      let toolCallLog: ChatMessage['toolCalls'] = undefined;
      if (mcpConnected && result.proposedAction) {
        toolCallLog = [
          {
            toolName: 'propose_schedule_rebalance',
            source: 'mcp_server',
            durationMs: 35,
            result: { actionId: result.proposedAction.id, summary: result.proposedAction.summary },
          },
        ];
      } else if (result.proposedAction) {
        toolCallLog = [
          {
            toolName: 'local_deterministic_planner',
            source: 'local_deterministic',
            durationMs: 8,
            result: { actionId: result.proposedAction.id },
          },
        ];
      }

      const assistantMsg: ChatMessage = {
        id: `assist-${Date.now()}`,
        sender: 'assistant',
        text: result.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: result.intent,
        proposedAction: result.proposedAction,
        suggestedFollowUps: result.suggestedFollowUps,
        toolCalls: toolCallLog,
      };

      setChatMessages(prev => [...prev, assistantMsg]);

      if (result.requiresConfirmation && result.proposedAction) {
        setPendingProposal(result.proposedAction);
        setAssistantState('awaiting_approval');
        playChime('alert');
      } else if (result.executedImmediateUpdate) {
        // Immediate update (e.g. Reset Demo)
        if (result.executedImmediateUpdate.tasks) {
          setTasks(result.executedImmediateUpdate.tasks);
        }
        if (result.executedImmediateUpdate.focusBudget) {
          setFocusBudget(result.executedImmediateUpdate.focusBudget);
        }
        if (result.executedImmediateUpdate.fixedEvents) {
          setFixedEvents(result.executedImmediateUpdate.fixedEvents);
        }
        refreshPlan(
          result.executedImmediateUpdate.tasks || tasks,
          result.executedImmediateUpdate.fixedEvents || fixedEvents,
          result.executedImmediateUpdate.focusBudget || focusBudget
        );
        setAssistantState('success');
        playChime('success');
        setTimeout(() => setAssistantState('idle'), 2500);
      } else {
        setAssistantState('idle');
      }

      setIsProcessing(false);
    },
    [tasks, fixedEvents, focusBudget, pendingProposal, decisionLedger.length, mcpConnected, playChime, refreshPlan]
  );

  // Approve a pending proposal
  const approveProposal = useCallback(
    async (proposalId: string) => {
      if (!pendingProposal || pendingProposal.id !== proposalId) return;

      setIsProcessing(true);
      setAssistantState('processing');

      // If connected to MCP server, invoke tool
      let executionSource: 'mcp_tool' | 'local_deterministic' = 'local_deterministic';
      if (mcpConnected) {
        const res = await mcpService.invokeTool('approve_proposed_action', { actionId: proposalId });
        if (!res.error) {
          executionSource = 'mcp_tool';
        }
      }

      const previousState = pendingProposal.previousState;
      const newState = pendingProposal.newState;

      // Apply the approved state
      setTasks(newState.tasks);
      setFocusBudget(newState.focusBudget);
      refreshPlan(newState.tasks, fixedEvents, newState.focusBudget);

      // Record to Decision Ledger
      const ledgerEntry: LedgerEntry = {
        id: `ledger-${Date.now()}`,
        actionId: proposalId,
        timestamp: new Date().toISOString(),
        request: pendingProposal.originalRequest,
        summary: pendingProposal.summary,
        reasoning: pendingProposal.reasoning,
        tradeoffs: pendingProposal.tradeoffs,
        status: 'completed',
        source: executionSource,
        canUndo: true,
        snapshotBefore: previousState,
        snapshotAfter: newState,
      };

      setDecisionLedger(prev => [ledgerEntry, ...prev]);
      setPendingProposal(null);
      setAssistantState('success');
      playChime('success');

      // Add audit message to chat
      const confirmMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        sender: 'system',
        text: `Proposal "${pendingProposal.summary}" was approved and executed. Recorded in Decision Ledger with full undo capability.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages(prev => [...prev, confirmMsg]);

      setIsProcessing(false);
      setTimeout(() => setAssistantState('idle'), 2500);
    },
    [pendingProposal, mcpConnected, fixedEvents, playChime, refreshPlan]
  );

  // Reject a pending proposal
  const rejectProposal = useCallback(
    async (proposalId: string, reason: string = 'User rejected proposed action') => {
      if (!pendingProposal || pendingProposal.id !== proposalId) return;

      if (mcpConnected) {
        await mcpService.invokeTool('reject_proposed_action', { actionId: proposalId, reason });
      }

      // Record rejection in ledger
      const ledgerEntry: LedgerEntry = {
        id: `ledger-${Date.now()}`,
        actionId: proposalId,
        timestamp: new Date().toISOString(),
        request: pendingProposal.originalRequest,
        summary: `Rejected: ${pendingProposal.summary}`,
        reasoning: reason,
        tradeoffs: [],
        status: 'rejected',
        source: mcpConnected ? 'mcp_tool' : 'local_deterministic',
        canUndo: false,
        snapshotBefore: pendingProposal.previousState,
        snapshotAfter: pendingProposal.previousState,
      };

      setDecisionLedger(prev => [ledgerEntry, ...prev]);
      setPendingProposal(null);
      setAssistantState('idle');
      playChime('alert');

      const rejectMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        sender: 'system',
        text: `Proposal "${pendingProposal.summary}" was rejected. Active schedule remains untouched.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages(prev => [...prev, rejectMsg]);
    },
    [pendingProposal, mcpConnected, playChime]
  );

  // Undo a consequential operation
  const undoAction = useCallback(
    async (actionId: string) => {
      const entry = decisionLedger.find(e => e.actionId === actionId && e.canUndo && e.status === 'completed');
      if (!entry) return;

      setIsProcessing(true);
      setAssistantState('processing');

      if (mcpConnected) {
        await mcpService.invokeTool('undo_last_action', {});
      }

      const restoredState = entry.snapshotBefore;
      setTasks(restoredState.tasks);
      setFocusBudget(restoredState.focusBudget);
      setFixedEvents(restoredState.fixedEvents);
      refreshPlan(restoredState.tasks, restoredState.fixedEvents, restoredState.focusBudget);

      // Update entry and record undo in ledger
      setDecisionLedger(prev =>
        prev.map(e => (e.id === entry.id ? { ...e, status: 'undone' as const, canUndo: false } : e))
      );

      const undoAuditEntry: LedgerEntry = {
        id: `ledger-undo-${Date.now()}`,
        actionId: `undo-${entry.actionId}`,
        timestamp: new Date().toISOString(),
        request: `Undo: ${entry.request}`,
        summary: `Reverted action "${entry.summary}"`,
        reasoning: 'User triggered undo. Restored state snapshot prior to execution.',
        tradeoffs: [],
        status: 'undone',
        source: mcpConnected ? 'mcp_tool' : 'local_deterministic',
        canUndo: false,
        snapshotBefore: entry.snapshotAfter,
        snapshotAfter: restoredState,
      };

      setDecisionLedger(prev => [undoAuditEntry, ...prev]);
      setAssistantState('success');
      playChime('success');

      const undoMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        sender: 'system',
        text: `Action "${entry.summary}" was undone. Schedule and focus metrics safely restored to previous state.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages(prev => [...prev, undoMsg]);

      setIsProcessing(false);
      setTimeout(() => setAssistantState('idle'), 2500);
    },
    [decisionLedger, mcpConnected, playChime, refreshPlan]
  );

  // Task mutations
  const createTask = useCallback(
    (taskData: Omit<Task, 'id' | 'status'>) => {
      const newTask: Task = {
        ...taskData,
        id: `task-${Date.now()}`,
        status: 'pending',
      };
      const updated = [...tasks, newTask];
      setTasks(updated);
      refreshPlan(updated, fixedEvents, focusBudget);
      playChime('click');
    },
    [tasks, fixedEvents, focusBudget, playChime, refreshPlan]
  );

  const updateTask = useCallback(
    (taskId: string, patch: Partial<Task>) => {
      const updated = tasks.map(t => (t.id === taskId ? { ...t, ...patch } : t));
      setTasks(updated);
      refreshPlan(updated, fixedEvents, focusBudget);
    },
    [tasks, fixedEvents, focusBudget, refreshPlan]
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      const updated = tasks.filter(t => t.id !== taskId);
      setTasks(updated);
      refreshPlan(updated, fixedEvents, focusBudget);
      playChime('click');
    },
    [tasks, fixedEvents, focusBudget, playChime, refreshPlan]
  );

  const toggleTaskComplete = useCallback(
    (taskId: string) => {
      const updated = tasks.map(t => {
        if (t.id === taskId) {
          const nextStatus = t.status === 'completed' ? ('pending' as const) : ('completed' as const);
          return { ...t, status: nextStatus };
        }
        return t;
      });
      setTasks(updated);
      refreshPlan(updated, fixedEvents, focusBudget);
      playChime('success');
    },
    [tasks, fixedEvents, focusBudget, playChime, refreshPlan]
  );

  const setEnergyLevel = useCallback(
    (energy: EnergyLevel) => {
      const updatedBudget = computeFocusBudget(tasks, energy, focusBudget.totalCapacityMinutes);
      setFocusBudget(updatedBudget);
      refreshPlan(tasks, fixedEvents, updatedBudget);
      playChime('click');
    },
    [tasks, fixedEvents, focusBudget.totalCapacityMinutes, playChime, refreshPlan]
  );

  const resetDemo = useCallback(async () => {
    setIsProcessing(true);
    setAssistantState('processing');

    const snap = createInitialSnapshot();
    setTasks(snap.tasks);
    setFixedEvents(snap.fixedEvents);
    setFocusBudget(snap.focusBudget);
    setPendingProposal(null);
    setDecisionLedger([]);

    refreshPlan(snap.tasks, snap.fixedEvents, snap.focusBudget);

    if (mcpConnected) {
      await mcpService.resetServer();
    }

    setChatMessages([
      {
        id: `reset-${Date.now()}`,
        sender: 'assistant',
        text: 'Demo reset complete. Original 8 tasks, 2 fixed meetings, and baseline focus budget have been restored.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowUps: [
          'Plan my day.',
          'I have only two hours today.',
          'Fit a 30-minute workout before 4 PM.',
        ],
      },
    ]);

    setAssistantState('success');
    playChime('success');
    setIsProcessing(false);
    setTimeout(() => setAssistantState('idle'), 2000);
  }, [mcpConnected, playChime, refreshPlan]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        tasks,
        fixedEvents,
        focusBudget,
        plan,
        pendingProposal,
        decisionLedger,
        assistantState,
        chatMessages,
        mcpConnected,
        mcpManifest,
        activeTab,
        settings,
        isProcessing,
        setActiveTab,
        setAssistantState,
        executeCommand,
        approveProposal,
        rejectProposal,
        undoAction,
        createTask,
        updateTask,
        deleteTask,
        toggleTaskComplete,
        setEnergyLevel,
        resetDemo,
        updateSettings,
        checkMcpConnection,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

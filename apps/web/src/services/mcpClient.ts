/**
 * DayPilot AI - Model Context Protocol (MCP) Client
 * Handles real HTTP / SSE communication with the DayPilot MCP Server
 * with graceful local fallback if the server is offline.
 */

export interface McpManifest {
  protocolVersion: string;
  server: { name: string; version: string };
  tools: Array<{ name: string; description: string; inputSchema?: any }>;
  resources: Array<{ uri: string; name: string }>;
  prompts: Array<{ name: string; description: string }>;
}

export interface McpToolCallResult {
  tool: string;
  durationMs: number;
  result: any;
  error?: string;
}

export class McpClientService {
  private serverUrl: string;

  constructor(serverUrl: string = 'http://localhost:3001') {
    this.serverUrl = serverUrl.replace(/\/+$/, '');
  }

  setServerUrl(url: string) {
    this.serverUrl = url.replace(/\/+$/, '');
  }

  getServerUrl(): string {
    return this.serverUrl;
  }

  async checkHealth(): Promise<{ ok: boolean; data?: any; error?: string }> {
    try {
      const res = await fetch(`${this.serverUrl}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        return { ok: true, data };
      }
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Connection refused' };
    }
  }

  async getManifest(): Promise<McpManifest | null> {
    try {
      const res = await fetch(`${this.serverUrl}/api/mcp/manifest`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async invokeTool(toolName: string, args: Record<string, any> = {}): Promise<McpToolCallResult> {
    const startTime = performance.now();
    try {
      const res = await fetch(`${this.serverUrl}/api/mcp/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolName, arguments: args }),
        signal: AbortSignal.timeout(8000),
      });

      const data = await res.json();
      const durationMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        return {
          tool: toolName,
          durationMs,
          result: null,
          error: data.error || `HTTP error ${res.status}`,
        };
      }

      return {
        tool: toolName,
        durationMs: data.durationMs || durationMs,
        result: data.result,
      };
    } catch (err: any) {
      return {
        tool: toolName,
        durationMs: Math.round(performance.now() - startTime),
        result: null,
        error: err.message || 'Failed to communicate with MCP server',
      };
    }
  }

  async resetServer(): Promise<boolean> {
    try {
      const res = await fetch(`${this.serverUrl}/api/reset`, {
        method: 'POST',
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const mcpService = new McpClientService();

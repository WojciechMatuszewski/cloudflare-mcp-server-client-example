import type {
  Prompt,
  Resource,
  Tool
} from "@modelcontextprotocol/sdk/types.js";

export type MCPServerState =
  | "authenticating"
  | "connecting"
  | "ready"
  | "discovering"
  | "failed"
  | "needs-authorization";

export type MCPServer = {
  url: string;
  state: MCPServerState;
  tools: Tool[];
  id: string;
};

export type MCPClientState = {
  servers: Record<string, MCPServer>;
  tools: (Tool & { serverId: string })[];
  prompts: (Prompt & { serverId: string })[];
  resources: (Resource & { serverId: string })[];
};

export type MCPClientRunPromptPayload = {
  name: string;
  serverId: string;
  arguments?: Record<string, string>;
};

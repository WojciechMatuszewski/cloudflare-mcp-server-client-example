import type {
  Prompt,
  Resource,
  Tool
} from "@modelcontextprotocol/sdk/types.js";
import type { MCPClientManager } from "agents/dist/mcp/client";

export type MCPServer = {
  url: string;
  state: MCPClientManager["mcpConnections"][number]["connectionState"];
  tools: Tool[];
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

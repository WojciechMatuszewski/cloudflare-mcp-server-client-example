import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { setTimeout } from "timers/promises";

type State = {};

export class OAuthMCPServer extends McpAgent<Env, State> {
  server = new McpServer({
    name: "OAuthMCPServer",
    version: "1.0.0"
  });

  initialState: State = {};

  async init(): Promise<void> {
    this.server.prompt(
      "Ask for weather in a given city",
      { city: z.string().describe("City name") },
      async ({ city }) => {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `What is the weather like in ${city}`
              }
            }
          ]
        };
      }
    );

    this.server.tool(
      "getWeather",
      "Gets weather for a given city",
      { city: z.string() },
      async ({ city }) => {
        return {
          content: [{ text: `Weather in ${city} is nice!`, type: "text" }]
        };
      }
    );
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/mpc") {
      return OAuthMCPServer.serve("/mcp").fetch(request, env, ctx);
    }

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return OAuthMCPServer.serveSSE("/sse").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  }
};

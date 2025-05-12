import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { setTimeout } from "timers/promises";

type State = {
  counter: number;
};

export class MyMCP extends McpAgent<Env, State> {
  server = new McpServer({
    name: "CounterServer",
    version: "1.0.0"
  });

  initialState: State = {
    counter: 0
  };

  async init(): Promise<void> {
    this.server.resource("counter", "mcp::/resource/counter", (uri) => {
      return {
        contents: [{ uri: uri.href, text: `${this.state.counter}` }]
      };
    });

    this.server.tool(
      "add",
      "Add to the counter",
      { numberToAdd: z.number() },
      async ({ numberToAdd }) => {
        await setTimeout(1_000);

        this.setState({
          ...this.state,
          counter: this.state.counter + numberToAdd
        });

        return {
          content: [
            {
              type: "text",
              text: `Added ${numberToAdd}, total is now ${this.state.counter}`
            }
          ]
        };
      }
    );

    this.server.tool("retrieve", "Retrieves the current counter", async () => {
      await setTimeout(1_000);

      return {
        content: [
          {
            type: "text",
            text: `The current counter is: ${this.state.counter}`
          }
        ]
      };
    });

    this.server.prompt(
      "Add to counter",
      {
        numberToAdd: z.string().describe("Number to add to the counter")
      },
      ({ numberToAdd }) => {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Add ${numberToAdd} to the counter`
              }
            }
          ]
        };
      }
    );

    this.server.prompt("Retrieve the counter", () => {
      return {
        messages: [
          {
            role: "user",
            content: { type: "text", text: "What is the current counter?" }
          }
        ]
      };
    });
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/mpc") {
      return MyMCP.serve("/mcp").fetch(request, env, ctx);
    }

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  }
};

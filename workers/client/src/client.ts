import { createOpenAI } from "@ai-sdk/openai";
import { unstable_callable as callable, routeAgentRequest } from "agents";
import { AIChatAgent } from "agents/ai-chat-agent";
import { MCPClientManager } from "agents/mcp/client";
import {
  createDataStreamResponse,
  jsonSchema,
  streamText,
  tool,
  type StreamTextOnFinishCallback
} from "ai";

import type { MCPClientRunPromptPayload, MCPClientState } from "transport";
import { z } from "zod";

const UnauthorizedErrorSchema = z.object({
  code: z.literal(401)
});

export class McpClient extends AIChatAgent<Env, MCPClientState> {
  initialState = {
    servers: {},
    tools: [],
    prompts: [],
    resources: []
  };

  provider = createOpenAI({ apiKey: this.env.OPENAPI_KEY });

  async onStart(): Promise<void> {
    this.mcp = new MCPClientManager("mcp-client", "1.0.0");

    for (const server of Object.values(this.state.servers)) {
      await this.addServer({ url: server.url });
    }
  }

  async onChatMessage(onFinish: StreamTextOnFinishCallback<{}>) {
    const dataStreamResponse = createDataStreamResponse({
      execute: async (dataStream) => {
        const compatibleTools = this.mcp.listTools().map((mcpTool) => {
          return tool({
            description: mcpTool.description,
            parameters: jsonSchema({
              ...mcpTool.inputSchema,
              properties: mcpTool.inputSchema.properties ?? {},
              additionalProperties: false
            }),
            execute: async (params, options) => {
              dataStream.writeMessageAnnotation({
                type: "status",
                value: "processing"
              });

              const result = await this.mcp.callTool({
                name: mcpTool.name,
                arguments: params as Record<string, unknown>,
                serverId: mcpTool.serverId
              });

              dataStream.writeMessageAnnotation({
                type: "status",
                value: "processed"
              });

              return result;
            },
            id: `${mcpTool.name}.${mcpTool.serverId}` as const
          });
        });

        const result = streamText({
          model: this.provider("gpt-4"),
          messages: this.messages,
          onFinish,
          tools: compatibleTools,
          /**
           * Arbitrary number. Needed for the AI to respond to our tool calls.
           * By default it's 1. If it's set to default, the AI would not get a chance to formulate response given the tool result.
           */
          maxSteps: 10,
          onError: console.log
        });

        result.mergeIntoDataStream(dataStream);
      }
    });

    return dataStreamResponse;
  }

  @callable({})
  async runPrompt(payload: MCPClientRunPromptPayload) {
    const { messages } = await this.mcp.getPrompt(
      {
        name: payload.name,
        serverId: payload.serverId,
        arguments: payload.arguments
      },
      {}
    );

    return messages;
  }

  @callable({})
  async removeServer({ id }: { id: string }) {
    const serverToRemove = Object.values(this.state.servers).find((server) => {
      return server.id === id;
    });
    if (!serverToRemove) {
      return;
    }

    const { [serverToRemove.url.toString()]: _, ...allOtherServers } =
      this.state.servers;

    if (serverToRemove.state !== "ready") {
      this.setState({
        servers: allOtherServers,
        prompts: this.mcp.listPrompts(),
        resources: this.mcp.listResources(),
        tools: this.mcp.listTools()
      });

      return;
    }

    await this.mcp.closeConnection(id);
    delete this.mcp.mcpConnections[id];

    this.setState({
      servers: allOtherServers,
      prompts: this.mcp.listPrompts(),
      resources: this.mcp.listResources(),
      tools: this.mcp.listTools()
    });
  }

  @callable({})
  async addServer({ url }: { url: string }) {
    try {
      const { id } = await this.mcp.connect(url);
      const serverConnection = this.mcp.mcpConnections[id];

      this.setState({
        servers: {
          ...this.state.servers,
          [url]: {
            state: serverConnection.connectionState,
            url: serverConnection.url.toString(),
            tools: serverConnection.tools,
            id
          }
        },
        prompts: this.mcp.listPrompts(),
        resources: this.mcp.listResources(),
        tools: this.mcp.listTools()
      });
    } catch (error) {
      const { success } = UnauthorizedErrorSchema.safeParse(error);
      if (!success) {
        return;
      }
      return { state: "NEEDS_AUTHORIZATION" };

      // this.setState({
      //   servers: {
      //     ...this.state.servers,
      //     [url]: {
      //       state: "needs-authorization",
      //       url: url.toString(),
      //       tools: [],
      //       id: crypto.randomUUID()
      //     }
      //   },
      //   prompts: this.mcp.listPrompts(),
      //   resources: this.mcp.listResources(),
      //   tools: this.mcp.listTools()
      // });
    }
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env, {
        cors: true
      })) || new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;

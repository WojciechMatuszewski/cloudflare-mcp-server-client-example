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
  provider = createOpenAI({ apiKey: this.env.OPENAPI_KEY });

  mcp = new MCPClientManager("mcp-client", "1.0.0");

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
            execute: async (params) => {
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
  async runPrompt({
    name,
    serverId,
    arguments: args
  }: MCPClientRunPromptPayload) {
    const { messages } = await this.mcp.getPrompt(
      {
        name,
        serverId,
        arguments: args
      },
      {}
    );

    return messages;
  }

  @callable({})
  async removeServer({ id }: { id: string }) {
    await this.removeMcpServer(id);
  }

  @callable({})
  async addServer({ url }: { url: string }) {
    await this.addMcpServer(url, url, this.env.CLIENT_SERVER_ADDRESS);
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

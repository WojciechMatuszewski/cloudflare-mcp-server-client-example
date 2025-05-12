import { createOpenAI } from "@ai-sdk/openai";
import type {
  Prompt,
  Resource,
  Tool
} from "@modelcontextprotocol/sdk/types.js";
import { routeAgentRequest, unstable_callable as callable } from "agents";
import { AIChatAgent } from "agents/ai-chat-agent";
import { MCPClientManager } from "agents/mcp/client";
import {
  createDataStreamResponse,
  jsonSchema,
  streamText,
  tool,
  type StreamTextOnFinishCallback,
  Message
} from "ai";

export type Server = {
  url: string;
  state: MCPClientManager["mcpConnections"][number]["connectionState"];
};

export type State = {
  servers: Record<string, Server>;
  tools: (Tool & { serverId: string })[];
  prompts: (Prompt & { serverId: string })[];
  resources: (Resource & { serverId: string })[];
};

export class MyAgent extends AIChatAgent<Env, State> {
  initialState = {
    servers: {},
    tools: [],
    prompts: [],
    resources: []
  };

  provider = createOpenAI({ apiKey: this.env.OPENAPI_KEY });

  async onStart(): Promise<void> {
    this.mcp = new MCPClientManager("my-agent", "1.0.0");

    const { id } = await this.mcp.connect("http://localhost:3001/sse");
    const serverConnection = this.mcp.mcpConnections[id];

    this.setState({
      servers: {
        [id]: {
          state: serverConnection.connectionState,
          url: serverConnection.url.toString()
        }
      },
      prompts: this.mcp.listPrompts(),
      resources: this.mcp.listResources(),
      tools: this.mcp.listTools()
    });
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
  async runPrompt(payload: {
    name: string;
    serverId: string;
    arguments: Record<string, string>;
  }) {
    const { messages: promptMessages } = await this.mcp.getPrompt(
      {
        name: payload.name,
        serverId: payload.serverId,
        arguments: payload.arguments
      },
      {}
    );

    const promptMessagesWithIds = promptMessages.map(
      (promptMessage): Message => {
        return {
          content: promptMessage.content.text as string,
          id: crypto.randomUUID(),
          role: "user",
          createdAt: new Date()
        };
      }
    );

    const allMessages = this.messages.concat(promptMessagesWithIds);
    await this.saveMessages(allMessages);
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env, { cors: true })) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;

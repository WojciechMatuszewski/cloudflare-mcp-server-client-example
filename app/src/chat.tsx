import type { PromptMessage } from "@modelcontextprotocol/sdk/types.js";
import type { MCPServersState } from "agents";
import { useAgentChat } from "agents/ai-react";
import { useAgent } from "agents/react";
import type { UIMessage } from "ai";
import { Fragment, useId, useRef, useState } from "react";
import type { MCPClientRunPromptPayload } from "transport";
import { z } from "zod";

type Prompt = MCPServersState["prompts"][number] & { serverId: string };

export function Chat({ sessionId }: { sessionId: string }) {
  const [mcpState, setMcpState] = useState<MCPServersState>({
    prompts: [],
    resources: [],
    servers: {},
    tools: []
  });

  const agent = useAgent({
    host: import.meta.env.VITE_MCP_CLIENT_ADDRESS,
    agent: "mcp-client",
    id: sessionId,
    onMcpUpdate(state) {
      console.log(state);
      setMcpState(state);
    }
  });

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    clearHistory,
    append
  } = useAgentChat({ agent });

  async function handleRunPrompt(promptPayload: MCPClientRunPromptPayload) {
    const messages = await agent.call<PromptMessage[]>("runPrompt", [
      promptPayload
    ]);

    for (const message of messages) {
      if (message.content.type === "text") {
        await append({ content: message.content.text, role: message.role });
      }
    }
  }

  const chatInputId = useId();

  return (
    <article className={"flex flex-col gap-4"}>
      <form onSubmit={handleSubmit}>
        <fieldset className={"grid grid-cols-[1fr_auto] items-end gap-2"}>
          <div className={"w-full flex flex-col"}>
            <label className={"label mb-1"} htmlFor={chatInputId}>
              Chat input
            </label>
            <input
              className={"input w-full"}
              type="text"
              name="message"
              id={chatInputId}
              value={input}
              onChange={handleInputChange}
            />
          </div>

          <div className={"flex flex-row gap-2 flex-1"}>
            <button className={"btn"} type="submit">
              Send
            </button>
            <button
              type={"reset"}
              onClick={clearHistory}
              className={"btn btn-warning"}
            >
              Clear history
            </button>
          </div>
        </fieldset>
      </form>

      <section>
        <h2 className={"mb-2"}>Available prompts</h2>
        <PromptsList
          onRunPrompt={handleRunPrompt}
          prompts={mcpState.prompts as Array<Prompt>}
        />
      </section>

      <section>
        <h2 className={"mb-2"}>Messages</h2>
        <ul
          className={"mt-3 max-h-[300px] overflow-y-auto flex flex-col-reverse"}
        >
          {messages.toReversed().map((message) => {
            const isLoading = isLoadingAnswer(message);

            return (
              <ChatMessage key={message.id} message={message}>
                {isLoading ? (
                  <div className={"chat-bubble"}>
                    <div className={"loading loading-dots loading-lg"}></div>
                  </div>
                ) : (
                  <p tabIndex={0} className={"chat-bubble"}>
                    {message.content}
                  </p>
                )}
              </ChatMessage>
            );
          })}
        </ul>
      </section>
    </article>
  );
}

function ChatMessage({
  message,
  children
}: {
  message: UIMessage;
  children: React.ReactNode;
}) {
  return (
    <li
      key={message.id}
      data-role={message.role}
      className={
        "chat data-[role='user']:chat-start data-[role='assistant']:chat-end"
      }
    >
      {children}
    </li>
  );
}

function PromptsList({
  prompts,
  onRunPrompt
}: {
  prompts: Array<Prompt>;
  onRunPrompt: (params: MCPClientRunPromptPayload) => void;
}) {
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <Fragment>
      <ul className={"flex flex-row gap-2"}>
        {prompts.map((prompt) => {
          return (
            <li key={prompt.name}>
              <button
                className={"btn"}
                onClick={() => {
                  if (!prompt.arguments) {
                    return onRunPrompt({
                      name: prompt.name,
                      serverId: prompt.serverId
                    });
                  }

                  setCurrentPrompt(prompt);
                  dialogRef.current?.showModal();
                }}
                type="button"
              >
                {prompt.name}
              </button>
            </li>
          );
        })}
      </ul>
      <dialog className={"modal"} ref={dialogRef}>
        <div className={"modal-box"}>
          <form
            method={"dialog"}
            onSubmit={(event) => {
              event.preventDefault();
              if (!currentPrompt) {
                return;
              }

              const formValues = Object.fromEntries(
                new FormData(event.currentTarget).entries()
              );

              onRunPrompt({
                name: currentPrompt.name,
                serverId: currentPrompt.serverId,
                arguments: formValues as any
              });

              setCurrentPrompt(null);
              dialogRef.current?.close();
            }}
          >
            <fieldset>
              {Object.values(currentPrompt?.arguments ?? {}).map(
                ({ name, description, required }, index) => {
                  const label = description ?? name;
                  const inputId = `${name}-${index}`;

                  return (
                    <div key={inputId} className={"flex flex-col gap-2"}>
                      <label htmlFor={inputId} className={"label"}>
                        {label}
                      </label>
                      <input
                        id={inputId}
                        name={name}
                        className={"input"}
                        required={required}
                        type="text"
                      />
                    </div>
                  );
                }
              )}

              <div className={"flex flex-row gap-2 mt-4"}>
                <button className={"btn"} type="submit">
                  Submit
                </button>
                <button
                  onClick={() => {
                    dialogRef.current?.close();
                    setCurrentPrompt(null);
                  }}
                  className={"btn btn-warning"}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </fieldset>
          </form>
        </div>
      </dialog>
    </Fragment>
  );
}

const LoadingAnswerSchema = z
  .object({
    role: z.literal("assistant"),
    annotations: z.array(
      z.object({
        type: z.literal("status"),
        value: z.literal("processing")
      })
    )
  })
  .or(z.object({ content: z.literal("") }));

function isLoadingAnswer(message: UIMessage) {
  const parseResult = LoadingAnswerSchema.safeParse(message);
  return parseResult.success;
}

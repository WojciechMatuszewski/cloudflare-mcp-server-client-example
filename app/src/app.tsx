"use client";

import type { Prompt } from "@modelcontextprotocol/sdk/types.js";
import { useAgentChat } from "agents/ai-react";
import { useAgent } from "agents/react";
import type { UIMessage } from "ai";
import { Fragment, useId, useState } from "react";
import { createRoot } from "react-dom/client";
import { z } from "zod";
import "./app.css";

type AgentPrompt = Prompt & { serverId: string };

function Chat({ sessionId }: { sessionId: string }) {
  const [agentState, setAgentState] = useState<{ prompts: Array<AgentPrompt> }>(
    {
      prompts: []
    }
  );

  const agent = useAgent({
    host: "http://localhost:3002",
    agent: "my-agent",
    id: sessionId,
    onStateUpdate(state, _source) {
      setAgentState(state as any);
    }
  });

  const { messages, input, handleInputChange, handleSubmit, clearHistory } =
    useAgentChat({ agent });

  const chatInputId = useId();

  return (
    <article className={"max-w-xl m-auto flex flex-col gap-4"}>
      <h1>AI MCP Chat</h1>
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
          onRunPrompt={(payload) => {
            agent.call("runPrompt", [payload]);
          }}
          prompts={agentState.prompts}
        />
      </section>

      <section>
        <h2 className={"mb-2"}>Messages</h2>
        <ul className={"mt-3 max-h-[300px] overflow-y-auto"}>
          {messages.map((message) => {
            const isLoading = isLoadingAnswer(message);

            return (
              <ChatMessage key={message.id} message={message}>
                {isLoading ? (
                  <div className={"chat-bubble"}>
                    <div className={"loading loading-dots loading-lg"}></div>
                  </div>
                ) : (
                  <p className={"chat-bubble"}>{message.content}</p>
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
  prompts: AgentPrompt[];
  onRunPrompt: (params: {
    name: string;
    serverId: string;
    arguments?: Record<string, unknown>;
  }) => void;
}) {
  const [currentPrompt, setCurrentPrompt] = useState<AgentPrompt | null>(null);

  return (
    <Fragment>
      <ul className={"flex flex-row gap-2"}>
        {prompts.map((prompt) => {
          return (
            <li>
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
                }}
                type="button"
              >
                {prompt.name}
              </button>
            </li>
          );
        })}
      </ul>
      <dialog className={"modal"} open={currentPrompt != null}>
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
                arguments: formValues,
                serverId: currentPrompt?.serverId
              });

              setCurrentPrompt(null);
            }}
          >
            <fieldset>
              {Object.values(currentPrompt?.arguments ?? {}).map(
                ({ name, description, required }, index) => {
                  const label = description ?? name;
                  const inputId = `${name}-${index}`;

                  return (
                    <div key={inputId}>
                      <label htmlFor={inputId} className={"label mb-2"}>
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

function App() {
  const [sessionId] = useState(() => {
    return crypto.randomUUID();
  });

  return <Chat sessionId={sessionId} />;
}

const root = createRoot(document.getElementById("root")!);

root.render(<App />);

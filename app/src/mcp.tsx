import { useAgent } from "agents/react";
import { useId, useState } from "react";
import type { MCPClientState } from "transport";

export function Mcp({ sessionId }: { sessionId: string }) {
  const [agentState, setAgentState] = useState<MCPClientState>({
    prompts: [],
    resources: [],
    servers: {},
    tools: []
  });

  const agent = useAgent<MCPClientState>({
    host: "http://localhost:3002",
    agent: "my-agent",
    id: sessionId,
    onStateUpdate(state, _source) {
      setAgentState(state);
    }
  });

  const serverAddressInputId = useId();
  const serversList = Object.values(agentState.servers);

  return (
    <article>
      <section>
        <form>
          <fieldset>
            <div className={"flex flex-col"}>
              <label htmlFor={serverAddressInputId} className={"label mb-2"}>
                MCP server address
              </label>
              <input
                className={"input input-md w-full"}
                type="url"
                name={"address"}
                id={serverAddressInputId}
              />
            </div>
            <button className={"btn mt-4"} type="submit">
              Add MCP server
            </button>
          </fieldset>
        </form>
      </section>
      <section>
        <ul className={"list flex flex-col gap-2 mt-4"}>
          {serversList.map((server) => {
            return (
              <li
                className={"list-row bg-base-200 flex flex-col"}
                key={server.url}
              >
                <dl className={"grid grid-cols-[max-content_auto] gap-2"}>
                  <div className={"grid-cols-subgrid grid"}>
                    <dt className={"font-bold"}>Server URL</dt>
                    <dl>{server.url}</dl>
                  </div>

                  <div className={"grid-cols-subgrid grid"}>
                    <dt className={"font-bold"}>Connection state</dt>
                    <dl>{server.state}</dl>
                  </div>
                </dl>
                <ul className={"flex flex-row gap-1"}>
                  {server.tools.map((serverTool) => {
                    return (
                      <li className={"badge badge-md"}>{serverTool.name}</li>
                    );
                  })}
                </ul>
                <button className={"btn btn-warning"} type="button">
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </article>
  );
}

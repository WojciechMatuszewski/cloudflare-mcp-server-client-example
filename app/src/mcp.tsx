import { useAgent } from "agents/react";
import { useId, useState } from "react";
import type { MCPClientState, MCPServerState } from "transport";

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

  const serverUrlInputId = useId();
  const serversList = Object.values(agentState.servers);

  return (
    <article>
      <section>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const payload = Object.fromEntries(formData.entries());
            agent.call("addServer", [payload]);
          }}
        >
          <fieldset>
            <div className={"flex flex-col"}>
              <label htmlFor={serverUrlInputId} className={"label mb-1"}>
                MCP server address
              </label>
              <input
                className={"input input-md w-full"}
                type="url"
                name={"url"}
                required={true}
                id={serverUrlInputId}
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
                <div className={"flex flex-row items-center gap-2"}>
                  <span>{server.url}</span>
                  <ServerStateIndicator state={server.state} />
                </div>
                <ul className={"flex flex-row gap-1"}>
                  {server.tools.map((serverTool) => {
                    return (
                      <li className={"badge badge-md"}>{serverTool.name}</li>
                    );
                  })}
                </ul>
                <button
                  onClick={() => {
                    agent.call("removeServer", [{ id: server.id }]);
                  }}
                  className={"btn btn-warning"}
                  type="button"
                >
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

function ServerStateIndicator({ state }: { state: MCPServerState }) {
  switch (state) {
    case "authenticating": {
      return <div className={"status status-info"} />;
    }
    case "connecting": {
      return <div className={"status status-info"} />;
    }
    case "ready": {
      return <div className={"status status-success"} />;
    }
    case "discovering": {
      return <div className={"status status-info"} />;
    }
    case "failed": {
      return <div className={"status status-error"} />;
    }
  }

  throw new Error("Unknown status");
}

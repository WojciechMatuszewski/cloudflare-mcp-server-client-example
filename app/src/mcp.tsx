import { useAgent } from "agents/react";
import { useId, useState } from "react";
import type { MCPClientState, MCPServer, MCPServerState } from "transport";
import { authenticate } from "./auth";

export function Mcp({ sessionId }: { sessionId: string }) {
  const [agentState, setAgentState] = useState<MCPClientState>({
    prompts: [],
    resources: [],
    servers: {},
    tools: []
  });

  const agent = useAgent<MCPClientState>({
    host: import.meta.env.VITE_MCP_CLIENT_ADDRESS,
    agent: "mcp-client",
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
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const payload = Object.fromEntries(formData.entries());

            const response = await agent.call("addServer", [payload]);
            if (response.state === "NEEDS_AUTHORIZATION") {
              await authenticate({ serverUrl: payload.url });
            }
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
                <div className={"flex flex-row justify-between items-center"}>
                  <ServerInfo url={server.url} state={server.state} />
                  <AuthorizeButton state={server.state} url={server.url} />
                </div>
                <Tools tools={server.tools} />
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

function AuthorizeButton({
  url,
  state
}: {
  url: string;
  state: MCPServerState;
}) {
  const oauthDiscoveryURL = new URL(
    "/.well-known/oauth-authorization-server",
    url
  );
  if (state !== "needs-authorization") {
    return null;
  }

  return <button className={"btn btn-sm btn-neutral"}>Authorize</button>;
}

function ServerInfo({ state, url }: { state: MCPServerState; url: string }) {
  return (
    <div className={"flex flex-row items-center gap-1"}>
      <span>{url}</span>
      <ServerStateIndicator state={state} />
    </div>
  );
}

function ServerStateIndicator({ state }: { state: MCPServerState }) {
  switch (state) {
    default: {
      return <div className={"status status-lg status-success"} />;
    }
    case "needs-authorization": {
      return <div className={"status status-lg status-warning"} />;
    }
  }
}

function Tools({ tools }: { tools: MCPServer["tools"] }) {
  if (tools.length === 0) {
    return null;
  }

  return (
    <ul className={"flex flex-row gap-1"}>
      {tools.map((serverTool) => {
        return <li className={"badge badge-md"}>{serverTool.name}</li>;
      })}
    </ul>
  );
}

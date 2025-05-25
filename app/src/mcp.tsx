import type { MCPServersState } from "agents";
import { useAgent } from "agents/react";
import { useId, useState } from "react";
import type { MCPServerStatus } from "transport";

export function Mcp({ sessionId }: { sessionId: string }) {
  const [mcpState, setMcpState] = useState<MCPServersState>({
    prompts: [],
    resources: [],
    servers: {},
    tools: []
  });

  console.log(mcpState);

  const agent = useAgent({
    host: import.meta.env.VITE_MCP_CLIENT_ADDRESS,
    agent: "mcp-client",
    id: sessionId,
    onOpen(event) {
      console.log("connected!", event);
    },
    onMcpUpdate: (state) => {
      setMcpState(state);
    }
  });

  const serverUrlInputId = useId();
  const serversList = Object.values(mcpState.servers);

  return (
    <article>
      <section>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const payload = Object.fromEntries(formData.entries());
            await agent.call("addServer", [payload]);
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
                defaultValue={"http://localhost:3003/sse"}
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
                key={server.server_url}
              >
                <div className={"flex flex-row justify-between items-center"}>
                  <ServerInfo url={server.server_url} state={server.state} />
                  {server.auth_url ? (
                    <AuthorizeButton authUrl={server.auth_url} />
                  ) : null}
                </div>
                <Tools tools={[]} />
                <button
                  onClick={() => {
                    agent.call("removeServer", [{ id: server.server_url }]);
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

function AuthorizeButton({ authUrl }: { authUrl: string }) {
  return (
    <button
      className={"btn btn-sm btn-neutral"}
      onClick={() => {
        window.location.href = authUrl;
      }}
    >
      Authorize
    </button>
  );
}

function ServerInfo({ state, url }: { state: MCPServerStatus; url: string }) {
  return (
    <div className={"flex flex-row items-center gap-1"}>
      <span>{url}</span>
      <ServerStateIndicator state={state} />
    </div>
  );
}

function ServerStateIndicator({ state }: { state: MCPServerStatus }) {
  switch (state) {
    default: {
      return <div className={"status status-lg status-success"} />;
    }
    case "needs-authorization": {
      return <div className={"status status-lg status-warning"} />;
    }
  }
}

function Tools({ tools }: { tools: MCPServersState["tools"] }) {
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

import type { MCPServer, MCPServersState } from "agents";
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

  const serversList = Object.entries(mcpState.servers).map(
    ([serverId, serverInfo]) => {
      return {
        ...serverInfo,
        id: serverId
      };
    }
  );

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
            const toolsForServer = mcpState.tools.filter((tool) => {
              return tool.serverId === server.id;
            });

            return (
              <ServerListItem
                key={server.id}
                serverUrl={server.server_url}
                serverState={server.state}
                serverAuthUrl={server.auth_url}
                serverId={server.id}
                onRemoveServer={() => {
                  agent.call("removeServer", [{ id: server.id }]);
                }}
                tools={toolsForServer}
              />
            );
          })}
        </ul>
      </section>
    </article>
  );
}

function ServerListItem({
  serverUrl,
  serverState,
  serverAuthUrl,
  onRemoveServer,
  tools
}: {
  serverUrl: MCPServer["server_url"];
  serverState: MCPServer["state"];
  serverAuthUrl: string | null;
  serverId: string;
  onRemoveServer: VoidFunction;
  tools: MCPServersState["tools"];
}) {
  const displayAuthorizeButton =
    serverState === "authenticating" && serverAuthUrl != null;

  return (
    <li className={"list-row bg-base-200 flex flex-col"} key={serverUrl}>
      <div className={"flex flex-row justify-between items-center"}>
        <ServerInfo url={serverUrl} state={serverState} />
        {displayAuthorizeButton ? (
          <AuthorizeButton authUrl={serverAuthUrl} />
        ) : null}
      </div>

      <Tools tools={tools} />

      <button
        onClick={() => {
          onRemoveServer();
        }}
        className={"btn btn-warning"}
        type="button"
      >
        Remove
      </button>
    </li>
  );
}

function AuthorizeButton({ authUrl }: { authUrl: string }) {
  /**
   * We have to use an external window popup here, otherwise the whole flow won't work.
   * See https://github.com/cloudflare/agents/commit/25aeaf24692bb82601c5df9fdce215cf2c509711#diff-75013b5dc015c5b00a1bebcd93e7c62ac825fe7d590f7ce5e3176399986cd92fR404
   */
  return (
    <button
      className={"btn btn-sm btn-neutral"}
      onClick={() => {
        window.open(
          authUrl,
          "popupWindow",
          "width=600,height=800,resizable=yes,scrollbars=yes,toolbar=yes,menubar=no,location=no,directories=no,status=yes"
        );
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
    case "authenticating": {
      return <div className={"status status-lg status-warning"} />;
    }
    default: {
      return <div className={"status status-lg status-success"} />;
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

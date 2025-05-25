import { useEffect } from "react";
import { authenticate, SESSION_KEYS } from "./auth";
import { useNavigate } from "react-router";
import { useAgent } from "agents/react";
import type { MCPClientState } from "transport";

export function OAuthCallback({ sessionId }: { sessionId: string }) {
  const agent = useAgent<MCPClientState>({
    host: import.meta.env.VITE_MCP_CLIENT_ADDRESS,
    agent: "mcp-client",
    id: sessionId
  });

  const navigate = useNavigate();

  useEffect(() => {
    async function processCallback() {
      const serverUrl = await handleCallback();
      const addServerResponse = await agent.call("addServer", [
        { url: serverUrl }
      ]);
      console.log({ addServerResponse });
      navigate("/mcp", { replace: true });
    }

    void processCallback();
  }, [navigate]);

  return <div>working...</div>;
}

async function handleCallback() {
  const serverUrl = sessionStorage.getItem(SESSION_KEYS.SERVER_URL);
  if (!serverUrl) {
    throw new Error("no server url");
  }

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code) {
    throw new Error("no code!");
  }

  await authenticate({ serverUrl, code });

  return serverUrl;
}

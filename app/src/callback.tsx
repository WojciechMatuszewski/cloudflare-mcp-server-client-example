import { useEffect } from "react";
import { authenticate, SESSION_KEYS } from "./auth";

export function OAuthCallback() {
  useEffect(() => {
    void handleCallback().then(() => {
      window.history.replaceState({}, document.title, "/mcp");
    });
  }, []);

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
}

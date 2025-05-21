import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  getStytchOAuthEndpointUrl,
  stytchBearerTokenAuthMiddleware
} from "./auth.js";

export class OAuthMCPServer extends McpAgent<Env> {
  server = new McpServer({
    name: "OAuthMCPServer",
    version: "1.0.0"
  });

  async init(): Promise<void> {
    this.server.prompt(
      "Ask for weather in a given city",
      { city: z.string().describe("City name") },
      async ({ city }) => {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `What is the weather like in ${city}`
              }
            }
          ]
        };
      }
    );

    this.server.tool(
      "getWeather",
      "Gets weather for a given city",
      { city: z.string() },
      async ({ city }) => {
        return {
          content: [{ text: `Weather in ${city} is nice!`, type: "text" }]
        };
      }
    );
  }
}

export default new Hono<{ Bindings: Env }>()
  .use(cors())
  .get("/.well-known/oauth-authorization-server", async (c) => {
    const url = new URL(c.req.url);
    return c.json({
      issuer: c.env.STYTCH_PROJECT_ID,
      authorization_endpoint: `${url.origin}/oauth/authorize`,
      token_endpoint: getStytchOAuthEndpointUrl(c.env, "oauth2/token"),
      registration_endpoint: getStytchOAuthEndpointUrl(
        c.env,
        "oauth2/register"
      ),
      scopes_supported: ["openid", "profile", "email", "offline_access"],
      response_types_supported: ["code"],
      response_modes_supported: ["query"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"]
    });
  })
  .use("/sse/*", stytchBearerTokenAuthMiddleware)
  .route("/sse", new Hono().mount("/", OAuthMCPServer.mount("/sse").fetch));

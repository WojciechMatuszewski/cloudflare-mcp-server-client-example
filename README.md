# Remove MCP Client & Server on Cloudflare

Cloudflare has great SDKs for running AI Agents. Since I had no idea how they work (this is mostly true now as well), I decided to play around with the code and build a remove MCP server and client to learn.

## Running the application

- Install [wrangler-cli](https://developers.cloudflare.com/workers/wrangler/install-and-update/).

- Install dependencies

```bash
pnpm i
```

- Make sure to populate all the `.env` and `.dev.env` files with values.

  - See the `.env.example` and `.dev.env.example` files.

- Run the application

```bash
pnpm run dev
```

- Open the application in your browser: `http://localhost:3000`

## Playing around

- Try adding the MCP server that sits behind Stytch OAuth authorization (`http://localhost:3003/sse`).
- Try adding the "authless" MCP server (`http://localhost:3002/sse`).
- Try running prompts.

## Learnings

- The `McpAgent` automatically handles state via _durable objects_.

  - It feels _so magical_! I love how easy it is to set up, but I also wonder what is the cost of this abstraction.

    - The data layer is quite hidden, and while you can access it via `this.sql` function, there is no type-safety when writing the query.

  - Documentation mentions that the `McpAgent` inherits the data-isolation characteristics of the `Agent` class – that each agent has it's own, private, separate database. [Link to the documentation](https://developers.cloudflare.com/agents/api-reference/store-and-sync-state/#sql-api)

    - [According to the documentation](https://developers.cloudflare.com/agents/model-context-protocol/mcp-agent-api/#state-synchronization-apis), **state is destroyed when user disconnects**. Makes sense!

- I could not find any mention in the documentation about this, but it seems like the `McpAgent` is an abstraction on top of the `McpServer` class.

- The `/mcp` path exposed by the server handles the _Streamable HTTP_ transport mentioned in the documentation here.

- The "MCP playground" works by creating a _proxy_ MCP client that the frontend application communicates with.

  - The request are never made directly from the frontend application to your server. They always go through the proxy.

- The `McpAgent` class is an abstraction over the `Agent` class that supports the _SSE_ and _Streamable HTTP_ transports.

- You can create _mcp client_ by using the `MCPClientManager` class.

  - **Currently, the _Streamable HTTP_ transport does not seem to be supported**.

- You can add _annotations_ to the current "chat message" via `dataStream.writeMessageAnnotation`.

  - This is pretty neat! I've used this to indicate that the tool call is loading.

- The concept of `prompts` is pretty powerful.

  - You can expose a set of pre-defined prompts to the consuming client. **Those prompts can take arguments!**

- After _running_ a prompt, you have to push the return (an array of messages) into the agent messages.

  - I could not find a good way to do this. I've opted to use `saveMessages` method. I'm unsure if that method is the right one.

    - Why would I want to save _all_ messages only to push a couple of them into the messages array?

- The `callPrompt` RPC that the `client` has is [_stringly-typed_](https://www.hanselman.com/blog/stringly-typed-vs-strongly-typed).

  - I wonder if I can improve the types there somehow?

- When working on the UI, I remembered an old technique for chat windows: making sure the scroll stays at the bottom when new message is added.

  - This works by **using `column-reverse` flexbox layout on the container, and then `.toReverse` on the items**.

    - Now the browsers default scroll position becomes "the bottom". Since you reversed the children, they appear in regular top-to-bottom fashion.

    - This approach is **not without it's drawbacks**.

      - Keyboard navigation now works in reverse order unless you play around with `tabIndex`.

      - The CSS styling that you have on the list and items might need to change since "top" and "bottom" directions are inverted.

- I could not find any way to _disconnect_ from the MCP server via the MCP client.

  - Update: I finally figured it out, but I'm unsure if what I'm doing is the "proper" way to do this.

    - For some reason, the [`closeConnection`](https://github.com/cloudflare/agents/blob/main/packages/agents/src/mcp/client.ts#L230) method does not remove the server from the `mcpConnections` record.

      - On the other hand, if you ever wish to re-connect to that server, keeping the data about the connection might come in handy

- The `this.mcp.connect` and `this.addMcpServer` methods work differently.

  - Perhaps it's because the first one is invoked on the "manager" class and the second comes from the "Agent" class?

- The **`agent` property you pass to `useAgent` hook is a _kebab-case_ value of the name of the Agent class exported in the server file**.

  - I'm NOT a fan of this. Why not let me to configure this. So much magic...

- Apparently, a [bug in Chrome](https://github.com/saadeghi/daisyui/issues/3440#issuecomment-2847662168), prevents the `modal` tag to function properly when used with the `modal` class from daisyui.

- I _struggled_ a lot to wrap my head around how the OAuth flow works. Luckily, the `agents` library now implements the whole flow end-to-end!

  - All is good, but the library lacks documentation. The "implicitness" of the `mcpState` is quite concerning to me.

    - I mean, I like that the library handles that end-to-end, but when you look [at the example](https://github.com/cloudflare/agents/tree/main/examples/mcp-client), you might need to spend some time figuring out _how_ that state is updates and that library manages those updates!

- The OAuth discovery implemented in the `modelcontextprotocol` library _might_ be incompatible with the _StreamableHTTP_ protocol. To be investigated.

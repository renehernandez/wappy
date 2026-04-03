import { env } from "cloudflare:workers";
import { routePartykitRequest } from "partyserver";
import { createRequestHandler } from "react-router";

export { UserRoom } from "./parties/user";
export { SessionRoom } from "./parties/session";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(
    request: Request,
    _env: unknown,
    ctx: ExecutionContext,
  ): Promise<Response> {
    // WebSocket upgrades → Durable Objects
    const partyResponse = await routePartykitRequest(
      request,
      env as unknown as Record<string, unknown>,
    );
    if (partyResponse) return partyResponse;

    // Everything else → React Router (SSR + loaders + actions)
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler;

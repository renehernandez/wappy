import { env } from "cloudflare:workers";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { routePartykitRequest } from "partyserver";

export { UserRoom } from "./parties/user";
export { SessionRoom } from "./parties/session";

export default createServerEntry({
  async fetch(request) {
    // WebSocket upgrades → Durable Objects
    const partyResponse = await routePartykitRequest(
      request,
      env as unknown as Record<string, unknown>,
    );
    if (partyResponse) return partyResponse;

    // Everything else → TanStack Start (SSR + server functions)
    return handler.fetch(request);
  },
});

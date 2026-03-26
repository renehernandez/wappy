import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { routePartykitRequest } from "partyserver";
import {
  handleGetMessages,
  handlePostMessages,
} from "./routes/api/messages/index";
import { handlePostSession } from "./routes/api/sessions/$id";
import {
  handleGetSessions,
  handlePostSessions,
} from "./routes/api/sessions/index";
import { handleGetSync } from "./routes/api/sync/index";

export { UserRoom } from "./parties/user";
export { SessionRoom } from "./parties/session";

async function handleApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const { pathname } = url;

  // GET /api/sessions
  if (pathname === "/api/sessions" && request.method === "GET") {
    return handleGetSessions(request);
  }
  // POST /api/sessions
  if (pathname === "/api/sessions" && request.method === "POST") {
    return handlePostSessions(request);
  }
  // POST /api/sessions/:id
  const sessionUpdateMatch = pathname.match(/^\/api\/sessions\/([^/]+)$/);
  if (sessionUpdateMatch && request.method === "POST") {
    return handlePostSession(request, sessionUpdateMatch[1]);
  }
  // GET /api/messages
  if (pathname === "/api/messages" && request.method === "GET") {
    return handleGetMessages(request);
  }
  // POST /api/messages
  if (pathname === "/api/messages" && request.method === "POST") {
    return handlePostMessages(request);
  }
  // GET /api/sync
  if (pathname === "/api/sync" && request.method === "GET") {
    return handleGetSync(request);
  }

  return null;
}

export default createServerEntry({
  async fetch(request) {
    // WebSocket upgrades → Durable Objects
    const partyResponse = await routePartykitRequest(
      request,
      (globalThis as any).__env,
    );
    if (partyResponse) return partyResponse;

    // REST API routes
    const apiResponse = await handleApiRequest(request);
    if (apiResponse) return apiResponse;

    // Everything else → TanStack Start (SSR + server functions)
    return handler.fetch(request);
  },
});

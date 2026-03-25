import { Server } from "partyserver";

export class UserRoom extends Server {
  static options = { hibernate: true };

  onConnect(_connection: any) {
    // Connection established — nothing to do until a notification arrives
  }

  onMessage(_connection: any, message: string | ArrayBuffer) {
    // Messages come from server functions (via DO stub fetch)
    // Broadcast to all connected browser clients
    const data =
      typeof message === "string" ? message : new TextDecoder().decode(message);
    this.broadcast(data);
  }

  async onRequest(request: Request): Promise<Response> {
    // Server functions send notifications via HTTP POST to the DO
    if (request.method === "POST") {
      const body = await request.text();
      this.broadcast(body);
      return new Response("ok");
    }
    return new Response("Method not allowed", { status: 405 });
  }
}

import { z } from "zod";

export const UserRoomNotification = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("session_created"),
    sessionId: z.string(),
    title: z.string().nullable(),
  }),
  z.object({
    type: z.literal("session_updated"),
    sessionId: z.string(),
    status: z.string(),
  }),
  z.object({
    type: z.literal("message_added"),
    sessionId: z.string(),
    messageSeq: z.number(),
  }),
]);
export type UserRoomNotification = z.infer<typeof UserRoomNotification>;

export const SessionRoomMessage = z.object({
  type: z.literal("message"),
  id: z.string(),
  seq: z.number(),
  role: z.string(),
  content: z.string(),
  createdAt: z.string(),
});
export type SessionRoomMessage = z.infer<typeof SessionRoomMessage>;

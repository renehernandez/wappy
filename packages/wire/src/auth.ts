import { z } from "zod";

export const DeviceCodeRequest = z.object({
  name: z.string().min(1).max(255),
});
export type DeviceCodeRequest = z.infer<typeof DeviceCodeRequest>;

export const DeviceCodeResponse = z.object({
  code: z.string(),
  verifyUrl: z.string().url(),
  expiresIn: z.number(),
});
export type DeviceCodeResponse = z.infer<typeof DeviceCodeResponse>;

export const DevicePollResponse = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pending") }),
  z.object({ status: z.literal("approved"), deviceToken: z.string() }),
  z.object({ status: z.literal("denied") }),
  z.object({ status: z.literal("expired") }),
]);
export type DevicePollResponse = z.infer<typeof DevicePollResponse>;

export const DeviceInfo = z.object({
  id: z.string(),
  name: z.string(),
  lastSeenAt: z.string().nullable(),
  createdAt: z.string(),
  revokedAt: z.string().nullable(),
});
export type DeviceInfo = z.infer<typeof DeviceInfo>;

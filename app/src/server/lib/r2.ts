import { env } from "cloudflare:workers";

export function getR2(): R2Bucket {
  return env.R2;
}

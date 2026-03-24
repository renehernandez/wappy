export interface CfAccessIdentity {
  email: string;
}

/**
 * Extract the user's email from the CF-Access-JWT-Assertion header.
 *
 * In production, Cloudflare Access validates the JWT before it reaches the Worker.
 * We trust the header and decode the payload to read the email claim.
 * The JWT signature is already verified by CF Access at the edge.
 */
export function extractCfAccessIdentity(
  request: Request,
): CfAccessIdentity | null {
  const jwt = request.headers.get("CF-Access-JWT-Assertion");
  if (!jwt) return null;

  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    const email = payload.email;
    if (typeof email !== "string" || email.length === 0) return null;

    return { email };
  } catch {
    return null;
  }
}

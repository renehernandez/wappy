import { describe, expect, it } from "vitest";
import { extractCfAccessIdentity } from "../cf-access";

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

describe("extractCfAccessIdentity", () => {
  it("extracts email from valid JWT", () => {
    const jwt = makeJwt({ email: "user@example.com", sub: "abc123" });
    const request = new Request("https://example.com", {
      headers: { "CF-Access-JWT-Assertion": jwt },
    });

    const identity = extractCfAccessIdentity(request);
    expect(identity).toEqual({ email: "user@example.com" });
  });

  it("returns null when header is missing", () => {
    const request = new Request("https://example.com");
    expect(extractCfAccessIdentity(request)).toBeNull();
  });

  it("returns null for malformed JWT (not 3 parts)", () => {
    const request = new Request("https://example.com", {
      headers: { "CF-Access-JWT-Assertion": "not-a-jwt" },
    });
    expect(extractCfAccessIdentity(request)).toBeNull();
  });

  it("returns null when email claim is missing", () => {
    const jwt = makeJwt({ sub: "abc123" });
    const request = new Request("https://example.com", {
      headers: { "CF-Access-JWT-Assertion": jwt },
    });
    expect(extractCfAccessIdentity(request)).toBeNull();
  });

  it("returns null when email claim is empty string", () => {
    const jwt = makeJwt({ email: "" });
    const request = new Request("https://example.com", {
      headers: { "CF-Access-JWT-Assertion": jwt },
    });
    expect(extractCfAccessIdentity(request)).toBeNull();
  });

  it("returns null when payload is not valid JSON", () => {
    const request = new Request("https://example.com", {
      headers: { "CF-Access-JWT-Assertion": "a.not-base64-json.c" },
    });
    expect(extractCfAccessIdentity(request)).toBeNull();
  });
});

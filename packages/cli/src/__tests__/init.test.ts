import { describe, expect, it } from "vitest";
import { parseDeployUrl } from "../commands/init";

describe("parseDeployUrl", () => {
  it("parses workers.dev URL from deploy output", () => {
    const output = `
Total Upload: 150.00 KiB / gzip: 50.00 KiB
Uploaded wapi (1.23 sec)
Published wapi (0.45 sec)
  https://wapi.my-subdomain.workers.dev
`;
    expect(parseDeployUrl(output)).toBe(
      "https://wapi.my-subdomain.workers.dev",
    );
  });

  it("returns null when no URL found", () => {
    expect(parseDeployUrl("deployed successfully")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { parseDeployUrl } from "../commands/init";

describe("parseDeployUrl", () => {
  it("parses workers.dev URL from deploy output", () => {
    const output = `
Total Upload: 150.00 KiB / gzip: 50.00 KiB
Uploaded wappy (1.23 sec)
Published wappy (0.45 sec)
  https://wappy.my-subdomain.workers.dev
`;
    expect(parseDeployUrl(output)).toBe(
      "https://wappy.my-subdomain.workers.dev",
    );
  });

  it("returns null when no URL found", () => {
    expect(parseDeployUrl("deployed successfully")).toBeNull();
  });
});

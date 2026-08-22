import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyDuitkuCallbackSignature } from "@nsd/payments";

describe("Duitku callback signature", () => {
  const config = {
    merchantCode: "D1234",
    apiKey: "secret-key",
    sandbox: true,
  };

  it("accepts a matching MD5 signature", () => {
    const merchantOrderId = "apc_invoice_1";
    const amount = "500000";
    const signature = createHash("md5")
      .update(`${config.merchantCode}${amount}${merchantOrderId}${config.apiKey}`)
      .digest("hex");

    expect(
      verifyDuitkuCallbackSignature(config, merchantOrderId, amount, signature),
    ).toBe(true);
  });

  it("rejects a tampered signature", () => {
    expect(
      verifyDuitkuCallbackSignature(config, "apc_invoice_1", "500000", "deadbeef"),
    ).toBe(false);
  });
});

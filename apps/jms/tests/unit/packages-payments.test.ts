import { describe, expect, it } from "vitest";
import {
  isMidtransConfigured,
  isMidtransPaymentSettled,
  verifyMidtransNotificationSignature,
} from "@nsd/payments";

describe("@nsd/payments (extracted from academy)", () => {
  it("detects unconfigured Midtrans", () => {
    expect(isMidtransConfigured({})).toBe(false);
    expect(isMidtransConfigured({ serverKey: "invalid" })).toBe(false);
    expect(
      isMidtransConfigured({ serverKey: "Mid-server-test" }),
    ).toBe(true);
  });

  it("recognizes settled Midtrans statuses", () => {
    expect(isMidtransPaymentSettled("settlement")).toBe(true);
    expect(isMidtransPaymentSettled("capture", "accept")).toBe(true);
    expect(isMidtransPaymentSettled("capture", "challenge")).toBe(false);
    expect(isMidtransPaymentSettled("pending")).toBe(false);
  });

  it("verifies Midtrans notification signature", () => {
    const config = { serverKey: "Mid-server-SB-abc" };
    const orderId = "order-1";
    const statusCode = "200";
    const grossAmount = "100000.00";
    const sig = verifyMidtransNotificationSignature(
      config,
      orderId,
      statusCode,
      grossAmount,
      "wrong",
    );
    expect(sig).toBe(false);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const razorpay = vi.hoisted(() => ({
  fetch: vi.fn(),
  refund: vi.fn(),
}));

vi.mock("razorpay", () => ({
  default: class Razorpay {
    payments = {
      fetch: razorpay.fetch,
      refund: razorpay.refund,
    };
  },
}));

import { OfficialRazorpayGateway } from "./razorpay-gateway";

describe("OfficialRazorpayGateway", () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_public";
    process.env.RAZORPAY_KEY_SECRET = "test-secret";
    razorpay.fetch.mockResolvedValue({
      amount: 30_600,
      amount_refunded: 0,
      refund_status: null,
    });
    razorpay.refund.mockResolvedValue({});
  });

  afterEach(() => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    vi.clearAllMocks();
  });

  it("refunds the full amount fetched from Razorpay, including a customer fee", async () => {
    const gateway = new OfficialRazorpayGateway();

    await gateway.refundPayment("pay_test_123", "payment-record-id");

    expect(razorpay.refund).toHaveBeenCalledWith("pay_test_123", expect.objectContaining({
      amount: 30_600,
    }));
  });
});

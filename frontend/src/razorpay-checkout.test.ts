// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { openRazorpayCheckout } from './razorpay-checkout'

afterEach(() => {
  delete window.Razorpay
  vi.useRealTimers()
})

describe('openRazorpayCheckout', () => {
  it('passes the server amount and prefilled contact to mocked Checkout', async () => {
    let receivedOptions: Record<string, unknown> = {}
    class MockRazorpay {
      private readonly options: Record<string, unknown>

      constructor(options: Record<string, unknown>) {
        this.options = options
        receivedOptions = options
      }

      on() {}

      open() {
        const handler = this.options.handler as (response: Record<string, string>) => void
        handler({
          razorpay_order_id: 'order_test',
          razorpay_payment_id: 'pay_test',
          razorpay_signature: 'a'.repeat(64),
        })
      }
    }
    window.Razorpay = MockRazorpay

    const result = await openRazorpayCheckout({
      keyId: 'rzp_test_public',
      orderId: 'order_test',
      amountPaise: 30_000,
      currency: 'INR',
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      prefill: {
        name: 'Maya Shah',
        email: 'maya@example.com',
        contact: '+919876543210',
      },
    })

    expect(receivedOptions).toEqual(expect.objectContaining({
      key: 'rzp_test_public',
      order_id: 'order_test',
      amount: 30_000,
      currency: 'INR',
      prefill: {
        name: 'Maya Shah',
        email: 'maya@example.com',
        contact: '+919876543210',
      },
    }))
    expect(result).toEqual({
      kind: 'success',
      response: {
        razorpay_order_id: 'order_test',
        razorpay_payment_id: 'pay_test',
        razorpay_signature: 'a'.repeat(64),
      },
    })
  })
})

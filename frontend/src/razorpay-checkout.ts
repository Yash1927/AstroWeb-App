import type { BookingCheckout } from './api/bookings'

type RazorpaySuccess = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type CheckoutOutcome =
  | { kind: 'dismissed' }
  | { kind: 'failed' }
  | { kind: 'success'; response: RazorpaySuccess }

type RazorpayInstance = {
  on(event: 'payment.failed', handler: () => void): void
  open(): void
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

let scriptPromise: Promise<void> | null = null

function loadCheckoutScript() {
  if (window.Razorpay) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Payment is unavailable. Please try again.')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.async = true
    script.dataset.razorpayCheckout = 'true'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Payment is unavailable. Please try again.')), { once: true })
    document.head.append(script)
  }).catch((error) => {
    scriptPromise = null
    throw error
  })
  return scriptPromise
}

export async function openRazorpayCheckout(checkout: BookingCheckout): Promise<CheckoutOutcome> {
  await loadCheckoutScript()
  const RazorpayCheckout = window.Razorpay
  if (!RazorpayCheckout) throw new Error('Payment is unavailable. Please try again.')

  return new Promise((resolve) => {
    let settled = false
    const finish = (outcome: CheckoutOutcome) => {
      if (settled) return
      settled = true
      resolve(outcome)
    }
    const secondsLeft = Math.max(1, Math.ceil((Date.parse(checkout.expiresAt) - Date.now()) / 1_000))
    const instance = new RazorpayCheckout({
      key: checkout.keyId,
      amount: checkout.amountPaise,
      currency: checkout.currency,
      name: 'Astromaitreyi',
      image: new URL('/logo.jpg', window.location.origin).toString(),
      description: 'Astrology call',
      order_id: checkout.orderId,
      prefill: checkout.prefill,
      timeout: secondsLeft,
      handler: (response: RazorpaySuccess) => finish({ kind: 'success', response }),
      modal: {
        ondismiss: () => finish({ kind: 'dismissed' }),
      },
    })
    instance.on('payment.failed', () => finish({ kind: 'failed' }))
    instance.open()
  })
}

/** GA4 measurement ID for Stripe checkout purchase attribution */
const GA_MEASUREMENT_ID = 'G-T5FQGSWP1G'

/** Purchase value requested for GA4 (monthly Pro price) */
const STRIPE_PURCHASE_VALUE = 14.99

let ga4ConfigQueued = false

/**
 * Fire GA4 `purchase` after Stripe Checkout success redirect.
 * Queues via gtag/dataLayer so it works before gtag.js finishes loading.
 */
export function fireStripeCheckoutPurchaseGa4() {
  if (typeof window === 'undefined') return

  window.dataLayer = window.dataLayer || []
  if (!window.gtag) {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments)
    }
  }

  if (!ga4ConfigQueued) {
    ga4ConfigQueued = true
    const existing = document.querySelector(
      `script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`
    )
    if (!existing) {
      const s = document.createElement('script')
      s.async = true
      s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
      document.head.appendChild(s)
    }
    window.gtag('js', new Date())
    window.gtag('config', GA_MEASUREMENT_ID)
  }

  window.gtag('event', 'purchase', {
    transaction_id: `stripe_${Date.now()}`,
    value: STRIPE_PURCHASE_VALUE,
    currency: 'USD',
    items: [
      {
        item_id: 'pro_subscription',
        item_name: 'Pro subscription',
        price: STRIPE_PURCHASE_VALUE,
        quantity: 1,
      },
    ],
  })
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing — Unemployed Club',
  description:
    "Simple transparent pricing. Start free, upgrade when you're ready. No hidden fees, cancel anytime.",
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}

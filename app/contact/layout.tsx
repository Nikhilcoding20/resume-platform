import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us — Unemployed Club',
  description: "Get in touch with the Unemployed Club team. We're here to help.",
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}

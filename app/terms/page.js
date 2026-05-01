import PublicOrDashboardHeader from '@/app/components/PublicOrDashboardHeader'

export const metadata = {
  title: 'Terms and Conditions — Unemployed Club',
  description: 'Read the terms and conditions for using Unemployed Club.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicOrDashboardHeader />
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[#eaeaf2] bg-white p-8 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] sm:p-10">
          <h1 className="mb-2 text-3xl font-bold text-[#1a1a2e]">Terms and Conditions</h1>
          <p className="mb-8 text-sm text-[#5c5c7a]">Last updated: April 2026</p>

          <div className="max-w-none space-y-8 text-[15px] leading-relaxed text-[#5c5c7a]">
            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Unemployed Club (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), you agree to be bound by these Terms and
                Conditions. If you do not agree, you may not use the platform. We may update these Terms from time to time.
                Continued use of the service after changes means you accept the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">2. Description of Service</h2>
              <p className="mb-3">
                Unemployed Club provides AI-powered tools to help users create, optimize, and manage job application materials,
                including:
              </p>
              <ul className="list-disc space-y-2.5 pl-5 marker:text-[#6366f1]">
                <li>Resume building and formatting</li>
                <li>Cover letter generation</li>
                <li>ATS (Applicant Tracking System) analysis</li>
                <li>Interview preparation tools</li>
                <li>Job discovery features</li>
              </ul>
              <p className="mt-4">
                The service is provided as is and as available. We do not guarantee job placement, interview success, or specific
                outcomes.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">3. User Accounts</h2>
              <p className="mb-3">To access certain features, you may need to create an account. You agree to:</p>
              <ul className="list-disc space-y-2.5 pl-5 marker:text-[#6366f1]">
                <li>Provide accurate and complete information</li>
                <li>Keep your login credentials secure</li>
                <li>Be responsible for all activity under your account</li>
              </ul>
              <p className="mt-4">We reserve the right to suspend or terminate accounts that violate these Terms.</p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">4. User Content</h2>
              <p className="mb-3">
                You retain ownership of any content you upload (e.g., resumes, job descriptions). By using the platform, you grant
                us a limited license to process and analyze your content solely to provide and improve our services. You agree not
                to upload:
              </p>
              <ul className="list-disc space-y-2.5 pl-5 marker:text-[#6366f1]">
                <li>Sensitive financial information (e.g., bank details)</li>
                <li>Highly confidential or classified information</li>
                <li>Content that violates any laws or third-party rights</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">5. Acceptable Use</h2>
              <p className="mb-3">You agree not to:</p>
              <ul className="list-disc space-y-2.5 pl-5 marker:text-[#6366f1]">
                <li>Use the service for unlawful, harmful, or abusive purposes</li>
                <li>Attempt to reverse engineer or exploit the platform</li>
                <li>Interfere with system security or performance</li>
                <li>Use automated tools to scrape or misuse the service</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">6. AI Disclaimer</h2>
              <p className="mb-3">Our platform uses artificial intelligence to generate and improve content. You understand that:</p>
              <ul className="list-disc space-y-2.5 pl-5 marker:text-[#6366f1]">
                <li>Outputs may not always be accurate, complete, or up-to-date</li>
                <li>You are responsible for reviewing and verifying all generated content</li>
                <li>We are not liable for decisions made based on AI-generated results</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">7. Subscriptions and Payments</h2>
              <p className="mb-3">Some features require a paid subscription.</p>
              <ul className="list-disc space-y-2.5 pl-5 marker:text-[#6366f1]">
                <li>Billing is recurring (monthly or yearly)</li>
                <li>You authorize us to charge your payment method in advance</li>
                <li>You may cancel anytime, but no partial refunds are provided</li>
                <li>Pricing may change with notice</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">8. Intellectual Property</h2>
              <p>
                All platform content, branding, design, and technology (excluding user content) are owned by Unemployed Club. You
                may not copy, reproduce, or redistribute any part of the service without permission.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">9. Termination</h2>
              <p>
                We may suspend or terminate your access if you violate these Terms or misuse the platform. You may stop using the
                service at any time.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">10. Limitation of Liability</h2>
              <p className="mb-3">To the maximum extent permitted by law, Unemployed Club is not liable for:</p>
              <ul className="list-disc space-y-2.5 pl-5 marker:text-[#6366f1]">
                <li>Job outcomes or hiring decisions</li>
                <li>Loss of data or content</li>
                <li>Indirect, incidental, or consequential damages</li>
              </ul>
              <p className="mt-4">Your use of the service is at your own risk.</p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">11. Privacy</h2>
              <p>
                Your use of the platform is also governed by our{' '}
                <a href="/privacy" className="font-medium text-[#6366f1] underline underline-offset-2 hover:text-[#4f46e5]">
                  Privacy Policy
                </a>
                , which explains how we collect and use your data.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">12. Contact</h2>
              <p>
                If you have questions about these Terms, contact:{' '}
                <a
                  href="mailto:hello@unemployedclub.com"
                  className="font-medium text-[#6366f1] underline underline-offset-2 hover:text-[#4f46e5]"
                >
                  hello@unemployedclub.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">13. Governing Law</h2>
              <p>These Terms are governed by the laws of Canada.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

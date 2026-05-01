import PublicOrDashboardHeader from '@/app/components/PublicOrDashboardHeader'

export const metadata = {
  title: 'Privacy Policy — Unemployed Club',
  description: 'How Unemployed Club collects, uses and protects your personal data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicOrDashboardHeader />
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[#eaeaf2] bg-white p-8 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] sm:p-10">
          <h1 className="mb-2 text-3xl font-bold text-[#1a1a2e]">Privacy Policy</h1>
          <p className="mb-8 text-sm text-[#5c5c7a]">Last updated: April 2026</p>

          <div className="max-w-none space-y-8 text-[15px] leading-relaxed text-[#5c5c7a]">
            <p>
              Welcome to Unemployed Club. We take your privacy seriously. This page explains what we collect, how we use it,
              and how we keep it safe when you use{' '}
              <a
                href="https://unemployedclub.com"
                className="font-medium text-[#6366f1] underline underline-offset-2 hover:text-[#4f46e5]"
              >
                unemployedclub.com
              </a>
              . If you have any questions, email us anytime at{' '}
              <a
                href="mailto:hello@unemployedclub.com"
                className="font-medium text-[#6366f1] underline underline-offset-2 hover:text-[#4f46e5]"
              >
                hello@unemployedclub.com
              </a>
              .
            </p>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">1. Who We Are</h2>
              <p>
                Unemployed Club is an AI-powered career platform based in Canada. We help people build resumes, generate cover
                letters, prepare for interviews, and find jobs.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">2. What We Collect</h2>
              <h3 className="mb-2 mt-4 text-base font-semibold text-[#1a1a2e]">a) Information you provide</h3>
              <p className="mb-3">When you use the platform, you may share:</p>
              <ul className="list-disc space-y-2.5 pl-5 marker:text-[#6366f1]">
                <li>Name, email, and login details</li>
                <li>Resume content (experience, education, skills, links)</li>
                <li>Job descriptions you paste in</li>
                <li>Interview responses during practice sessions</li>
                <li>Payment details (handled securely by Stripe — we don&apos;t store card info)</li>
              </ul>
              <h3 className="mb-2 mt-5 text-base font-semibold text-[#1a1a2e]">b) Information collected automatically</h3>
              <p className="mb-3">Like most apps, we collect some basic usage data:</p>
              <ul className="list-disc space-y-2.5 pl-5 marker:text-[#6366f1]">
                <li>IP address and general location</li>
                <li>Browser and device info</li>
                <li>Pages you visit and features you use</li>
                <li>Login times and session activity</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">3. How We Use Your Data</h2>
              <p className="mb-3">We use your information to:</p>
              <ul className="list-disc space-y-2.5 pl-5 marker:text-[#6366f1]">
                <li>Run your account</li>
                <li>Generate resumes, cover letters, and interview feedback</li>
                <li>Analyze resumes for ATS scoring</li>
                <li>Recommend jobs</li>
                <li>Process payments</li>
                <li>Send important emails (like account or billing updates)</li>
                <li>Improve the product and fix issues</li>
              </ul>
              <p className="mt-4">We only use what&apos;s necessary to make the product work better.</p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">4. Tools We Use (Third Parties)</h2>
              <p className="mb-3">We rely on trusted services to run Unemployed Club:</p>
              <ul className="list-disc space-y-2.5 pl-5 marker:text-[#6366f1]">
                <li>Supabase — database &amp; authentication</li>
                <li>Anthropic (Claude AI) — AI processing</li>
                <li>Stripe — payments</li>
                <li>Resend — emails</li>
                <li>RapidAPI / JSearch — job listings</li>
                <li>Vercel — hosting</li>
              </ul>
              <p className="mt-4 font-bold text-[#1a1a2e]">We do not sell your data to anyone.</p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">5. AI &amp; Your Data</h2>
              <p className="mb-3">
                When you use AI features (like resume or cover letter generation), parts of your data are sent to Anthropic
                (Claude) to generate results.
              </p>
              <ul className="list-disc space-y-2.5 pl-5 marker:text-[#6366f1]">
                <li>This is only used to give you outputs</li>
                <li>Your data is not used to train AI models</li>
                <li>We only send what&apos;s needed for the feature to work</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">6. How Long We Keep Data</h2>
              <p className="mb-3">We keep your data only as long as needed:</p>
              <ul className="list-disc space-y-2.5 pl-5 marker:text-[#6366f1]">
                <li>Resume data: deleted within 30 days after account deletion</li>
                <li>Payment records: kept up to 7 years (required by law in Canada)</li>
                <li>Anonymous data may be kept for analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">7. Your Rights</h2>
              <p className="mb-3">Under Canadian privacy law (PIPEDA), you can:</p>
              <ul className="list-disc space-y-2.5 pl-5 marker:text-[#6366f1]">
                <li>Access your data</li>
                <li>Correct your information</li>
                <li>Request deletion</li>
                <li>Withdraw consent</li>
                <li>Ask how your data is used</li>
              </ul>
              <p className="mt-4">
                Just email{' '}
                <a
                  href="mailto:hello@unemployedclub.com"
                  className="font-medium text-[#6366f1] underline underline-offset-2 hover:text-[#4f46e5]"
                >
                  hello@unemployedclub.com
                </a>{' '}
                and we&apos;ll help.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">8. Cookies</h2>
              <p>
                We only use essential cookies to keep you logged in and the app working properly. No ads. No tracking pixels.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">9. Security</h2>
              <p className="mb-3">We take security seriously:</p>
              <ul className="list-disc space-y-2.5 pl-5 marker:text-[#6366f1]">
                <li>SSL encryption (HTTPS)</li>
                <li>Secure authentication via Supabase</li>
                <li>Stripe handles payments (PCI compliant)</li>
                <li>Regular monitoring</li>
              </ul>
              <p className="mt-4">That said, no system is ever 100% secure.</p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">10. Children&apos;s Privacy</h2>
              <p>Unemployed Club is not meant for users under 16. We don&apos;t knowingly collect data from children.</p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">11. Emails</h2>
              <p className="mb-3">We may send:</p>
              <ul className="list-disc space-y-2.5 pl-5 marker:text-[#6366f1]">
                <li>Account or billing emails (required)</li>
                <li>Optional updates or tips (if you opt in)</li>
              </ul>
              <p className="mt-4">You can unsubscribe anytime.</p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">12. Changes</h2>
              <p>We may update this policy occasionally. If anything important changes, we&apos;ll let you know.</p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-[#6366f1]">13. Contact</h2>
              <p className="mb-2 font-semibold text-[#1a1a2e]">Unemployed Club</p>
              <ul className="list-none space-y-1.5 pl-0">
                <li>
                  Email:{' '}
                  <a
                    href="mailto:hello@unemployedclub.com"
                    className="font-medium text-[#6366f1] underline underline-offset-2 hover:text-[#4f46e5]"
                  >
                    hello@unemployedclub.com
                  </a>
                </li>
                <li>
                  Website:{' '}
                  <a
                    href="https://unemployedclub.com"
                    className="font-medium text-[#6366f1] underline underline-offset-2 hover:text-[#4f46e5]"
                  >
                    unemployedclub.com
                  </a>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

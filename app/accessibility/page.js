export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Accessibility Statement</h1>
        <div className="space-y-6 text-gray-600 leading-relaxed">
          <p>
            Unemployed Club is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.
          </p>
          <h2 className="text-xl font-semibold text-gray-900 mt-6">Measures to support accessibility</h2>
          <p>
            We take the following measures to ensure accessibility:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li>Include accessibility as part of our mission statement.</li>
            <li>Integrate accessibility into our procurement practices.</li>
            <li>Provide continual accessibility training for our staff.</li>
            <li>Include people with disabilities in our design personas.</li>
          </ul>
          <h2 className="text-xl font-semibold text-gray-900 mt-6">Feedback</h2>
          <p>
            We welcome your feedback on the accessibility of Unemployed Club. Please let us know if you encounter accessibility barriers by emailing{' '}
            <a href="mailto:hello@unemployedclub.com" className="text-blue-600 hover:underline">
              hello@unemployedclub.com
            </a>{' '}
            or via our Contact page.
          </p>
        </div>
      </div>
    </div>
  )
}

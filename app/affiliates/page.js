export default function AffiliatesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-gray-100 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Affiliate Program</h1>
        <p className="text-gray-600 mb-8 text-lg">
          Help others land their dream jobs with Unemployed Club and earn money while doing it.
        </p>
        
        <div className="grid sm:grid-cols-3 gap-6 mb-10">
          <div className="p-6 bg-blue-50 rounded-xl">
            <h3 className="font-bold text-blue-900 text-xl mb-2">30%</h3>
            <p className="text-blue-700 text-sm">Recurring Commission</p>
          </div>
          <div className="p-6 bg-blue-50 rounded-xl">
            <h3 className="font-bold text-blue-900 text-xl mb-2">60 Days</h3>
            <p className="text-blue-700 text-sm">Cookie Duration</p>
          </div>
          <div className="p-6 bg-blue-50 rounded-xl">
            <h3 className="font-bold text-blue-900 text-xl mb-2">Monthly</h3>
            <p className="text-blue-700 text-sm">Payouts via PayPal</p>
          </div>
        </div>

        <p className="text-gray-600 mb-8">
          Whether you&apos;re a career coach, content creator, or just someone who loves Unemployed Club, our affiliate program is designed to reward you for spreading the word.
        </p>

        <button type="button" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors inline-block">
          Apply to Affiliate Program
        </button>
      </div>
    </div>
  )
}

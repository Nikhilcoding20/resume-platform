export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Cookies and Tracking Policy</h1>
        <div className="prose prose-blue max-w-none text-gray-600 space-y-6">
          <p>Last updated: March 2026</p>
          <p>
            This policy describes how Unemployed Club (&quot;we&quot;, &quot;us&quot;) uses cookies and similar technologies on our website and app.
          </p>
          
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. What are cookies?</h2>
          <p>
            Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work, or work more efficiently, as well as to provide information to the owners of the site.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. How we use cookies</h2>
          <p>
            We use cookies to:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li>Remember your login session so you don't have to log in every time.</li>
            <li>Understand how you use our platform so we can improve the user experience.</li>
            <li>Keep track of your subscription status and plan limits.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Types of cookies we use</h2>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li><strong>Essential Cookies:</strong> These are required for the platform to function properly, such as authentication cookies from Supabase.</li>
            <li><strong>Analytics Cookies:</strong> We use minimal tracking to understand page views and feature usage, helping us focus on building the right tools for you.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Managing cookies</h2>
          <p>
            Most web browsers allow some control of most cookies through the browser settings. To find out more about cookies, including how to see what cookies have been set, visit aboutcookies.org.
          </p>
        </div>
      </div>
    </div>
  )
}

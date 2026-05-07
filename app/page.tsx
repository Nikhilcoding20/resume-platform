'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import PublicSiteHeader from '@/app/components/PublicSiteHeader'

const FEATURE_TOOLKIT_CARDS = [
  {
    title: 'Resume Builder',
    description: 'Create polished, ATS-friendly resumes tailored to specific roles.',
    Icon: IconDoc,
    cta: 'Build Resume',
    href: '/signup',
  },
  {
    title: 'Cover Letter Builder',
    description: 'Generate personalized cover letters that match your resume and target role.',
    Icon: IconLetter,
    cta: 'Write Cover Letter',
    href: '/signup',
  },
  {
    title: 'Resume Analysis',
    description: 'Review keyword alignment, formatting, and role fit before submitting.',
    Icon: IconChart,
    cta: 'Check Score',
    href: '/signup',
  },
  {
    title: 'Interview Practice',
    description: 'Practice behavioral and role-specific questions with structured feedback.',
    Icon: IconMic,
    cta: 'Practice Interviews',
    href: '/signup',
  },
  {
    title: 'Job Opportunities',
    description: 'Save roles, compare opportunities, and manage applications in one place.',
    Icon: IconBriefcase,
    cta: 'Find Jobs',
    href: '/signup',
  },
  {
    title: 'Career Guidance',
    description: 'Get practical recommendations to improve your search strategy.',
    Icon: IconBulb,
    cta: 'Get Advice',
    href: '/signup',
  },
] as const

const HOW_IT_WORKS_CARDS = [
  {
    num: '01',
    title: 'Sign Up Free',
    description: 'Create your workspace and set your target roles.',
    checks: ['No credit card required'] as const,
    Icon: IconUserPlus,
    cta: { label: 'Create Account', href: '/signup', variant: 'solid' as const, arrow: true },
  },
  {
    num: '02',
    title: 'Build Your Resume',
    description: 'Build a tailored resume with clean formatting and role-specific content.',
    checks: ['AI-powered writing', 'ATS optimized', 'Cover letters included'] as const,
    Icon: IconSparklesDoc,
    cta: { label: 'Try Resume Builder', href: '/dashboard/build-resume', variant: 'outline' as const },
  },
  {
    num: '03',
    title: 'Apply to Jobs',
    description: 'Track opportunities, prepare documents, and manage each application.',
    checks: ['Curated job matches', 'One-click apply', 'Track your applications'] as const,
    Icon: IconSearch,
    cta: { label: 'Browse Jobs', href: '/dashboard/jobs', variant: 'outline' as const },
  },
  {
    num: '04',
    title: 'Get Hired',
    description: 'Prepare for interviews and improve your chances with every application.',
    checks: ['Interview practice', 'Expert tips & guides', 'Job search support'] as const,
    Icon: IconBriefcaseWithCheck,
    cta: { label: 'Start Your Journey', href: '/signup', variant: 'solid' as const, arrow: false as const },
  },
] as const

const REVIEWS = [
  {
    quote:
      'The resume analysis helped me identify gaps I was missing and tailor my resume more clearly for each role. It made my applications sharper and easier for recruiters to review.',
    name: 'Nikhil G.',
    title: 'Software Developer',
    initials: 'NG',
  },
  {
    quote:
      'Using the platform gave me a clearer process for each application. I was able to align my resume and cover letter with job requirements much more consistently.',
    name: 'Varun L.',
    title: 'Marketing Specialist',
    initials: 'VL',
  },
  {
    quote:
      'I appreciated how structured everything felt. The suggestions were practical, and I could quickly adapt my resume for product roles without starting from scratch each time.',
    name: 'Eduardo H.',
    title: 'Product Manager',
    initials: 'EH',
  },
  {
    quote:
      'The interview prep and resume feedback helped me present my experience more clearly. I felt more prepared in interviews and more confident in the quality of my applications.',
    name: 'Tanisha H.',
    title: 'UX Designer',
    initials: 'TH',
  },
  {
    quote:
      'Having my resumes, applications, and notes in one place made my job search far more organized. It saved time and helped me stay focused on higher-quality applications.',
    name: 'Burhanuddin K.',
    title: 'Digital Marketer',
    initials: 'BK',
  },
] as const

const FAQ_ITEMS = [
  {
    q: 'Is there a free plan?',
    a: 'Yes, you can start for free and access core resume building and analysis tools. Upgrade when you need more.',
  },
  {
    q: 'How does resume analysis work?',
    a: 'Upload your resume and paste a job description. We analyze keyword alignment, formatting, and role fit and show you where to improve.',
  },
  {
    q: 'Can I tailor my resume for different jobs?',
    a: 'Yes. You can create multiple versions of your resume and tailor each one to a specific role and company.',
  },
  {
    q: 'Does this guarantee interviews or job offers?',
    a: 'No. Unemployed Club helps improve your application quality and keep your search organized. Results depend on many factors.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, cancel anytime from your account settings. You keep access until the end of your billing period.',
  },
  {
    q: 'What file types are supported?',
    a: 'We support PDF, DOC, and DOCX for resume uploads.',
  },
] as const

const ATS_POPULAR_ROLES = [
  'Software Engineer',
  'Product Manager',
  'Data Analyst',
  'Marketing Manager',
  'UX Designer',
  'Business Analyst',
  'Project Manager',
  'Sales Manager',
  'Financial Analyst',
  'HR Manager',
  'Graphic Designer',
  'Content Writer',
  'DevOps Engineer',
  'Customer Success Manager',
  'Operations Manager',
] as const

const ATS_ROLE_DESCRIPTIONS: Record<(typeof ATS_POPULAR_ROLES)[number], string> = {
  'Software Engineer': `We are looking for a passionate and experienced Software Engineer to join our growing engineering team. In this role you will design, develop, test and maintain scalable software applications that serve millions of users. You will collaborate closely with product managers, designers and other engineers to deliver high quality features on time.

The ideal candidate has strong proficiency in Python, JavaScript or TypeScript, experience building RESTful APIs and microservices, and a solid understanding of cloud platforms such as AWS or Google Cloud. You should be comfortable working in an agile environment and have experience with CI/CD pipelines, Docker and version control systems like Git.

Requirements: Bachelor's degree in Computer Science or related field, 3+ years of software development experience, strong problem solving skills, excellent communication and collaboration abilities, experience with SQL and NoSQL databases.`,
  'Product Manager': `We are seeking a strategic and data-driven Product Manager to lead the development of our core product offerings. You will own the product roadmap, define requirements, prioritize features and work cross-functionally with engineering, design, marketing and sales teams to bring products to market. You will be the voice of the customer and ensure we are solving real problems.

The ideal candidate has a deep understanding of user centered design, experience running A/B tests and analyzing product metrics, and the ability to communicate complex ideas clearly to both technical and non-technical stakeholders. Experience in SaaS or consumer tech is strongly preferred.

Requirements: 3+ years of product management experience, strong analytical and strategic thinking skills, proficiency with tools like Jira, Figma and Google Analytics, excellent written and verbal communication, track record of shipping successful products.`,
  'Data Analyst': `We are looking for a detail-oriented Data Analyst to help us turn raw data into actionable business insights. You will work closely with leadership, marketing and operations teams to analyze trends, build dashboards and support data-driven decision making across the organization. You will play a key role in shaping our analytics infrastructure.

The ideal candidate is highly proficient in SQL and Excel, has experience with data visualization tools like Tableau or Power BI, and can clearly communicate findings to non-technical stakeholders. Experience with Python or R for statistical analysis is a strong plus.

Requirements: Bachelor's degree in Statistics, Mathematics, Economics or related field, 2+ years of data analysis experience, strong attention to detail and critical thinking skills, ability to manage multiple projects simultaneously, experience with large datasets and relational databases.`,
  'Marketing Manager': `We are looking for a creative and results-driven Marketing Manager to lead our marketing strategy and execution. You will be responsible for developing integrated marketing campaigns across digital and traditional channels, managing our brand presence, generating leads and measuring campaign performance. You will work closely with the sales and product teams to align messaging and drive revenue growth.

The ideal candidate has hands-on experience with SEO, SEM, email marketing, social media and content strategy. You should be comfortable analyzing marketing data and making data-driven decisions to optimize campaigns. Experience with tools like HubSpot, Google Ads and Mailchimp is preferred.

Requirements: 3+ years of marketing experience, strong written and verbal communication skills, experience managing marketing budgets, proficiency with digital marketing platforms and analytics tools, ability to manage multiple campaigns simultaneously.`,
  'UX Designer': `We are seeking a talented and empathetic UX Designer to create intuitive and delightful user experiences for our products. You will conduct user research, develop personas, create wireframes and prototypes, and collaborate with product and engineering teams to ship polished interfaces. You will be an advocate for the user at every stage of the design process.

The ideal candidate has a strong portfolio demonstrating end-to-end UX work, deep proficiency in Figma or Sketch, and experience conducting usability testing and translating insights into design improvements. You should be comfortable working in fast-paced agile environments and iterating quickly based on feedback.

Requirements: 2+ years of UX design experience, strong portfolio of web and mobile projects, experience with user research methods, proficiency in Figma and prototyping tools, excellent collaboration and communication skills.`,
  'Business Analyst': `We are looking for an analytical and detail-oriented Business Analyst to help identify business needs and translate them into actionable solutions. You will work with stakeholders across the organization to document requirements, map processes, analyze data and support the implementation of new systems and workflows. Your work will directly impact operational efficiency and strategic decision making.

The ideal candidate has strong experience gathering and documenting business requirements, creating process flow diagrams and working with both technical and non-technical teams. Experience with SQL, Excel and project management tools is essential.

Requirements: 2+ years of business analysis experience, strong analytical and problem solving skills, excellent communication and presentation abilities, experience with Agile or Scrum methodologies, proficiency in Microsoft Office Suite and data analysis tools.`,
  'Project Manager': `We are seeking an experienced and organized Project Manager to lead cross-functional projects from initiation to completion. You will be responsible for defining project scope, creating detailed project plans, managing timelines and budgets, coordinating resources and communicating progress to stakeholders. You will ensure projects are delivered on time, within scope and within budget.

The ideal candidate thrives in a fast-paced environment, has strong leadership skills and is comfortable managing multiple projects simultaneously. Experience with project management tools like Jira, Asana or Monday.com is required. PMP certification is a strong asset.

Requirements: 3+ years of project management experience, strong organizational and time management skills, excellent communication and stakeholder management abilities, experience with Agile and Waterfall methodologies, proven track record of delivering complex projects successfully.`,
  'Sales Manager': `We are looking for a motivated and results-oriented Sales Manager to lead and grow our sales team. You will be responsible for developing sales strategies, setting targets, coaching team members and building strong relationships with key clients. You will work closely with marketing and product teams to align on go-to-market strategy and ensure consistent revenue growth.

The ideal candidate has a proven track record in B2B sales, strong leadership and coaching abilities, and deep experience with CRM platforms like Salesforce. You should be data-driven, comfortable analyzing sales metrics and able to identify opportunities for pipeline growth.

Requirements: 3+ years of sales management experience, demonstrated ability to meet and exceed revenue targets, strong negotiation and closing skills, experience managing and mentoring sales teams, proficiency with CRM tools and sales analytics.`,
  'Financial Analyst': `We are seeking a detail-oriented Financial Analyst to support our finance team with planning, analysis and reporting. You will be responsible for building financial models, preparing monthly and quarterly reports, supporting the budgeting process and providing insights to leadership to support strategic decision making. You will play a critical role in helping the business understand its financial performance.

The ideal candidate has strong Excel and financial modeling skills, experience with ERP systems and a solid understanding of accounting principles. CPA or CFA designation is preferred. You should be comfortable working with large datasets and presenting findings clearly to senior leadership.

Requirements: Bachelor's degree in Finance, Accounting or related field, 2+ years of financial analysis experience, advanced Excel skills including pivot tables and financial modeling, strong attention to detail and analytical thinking, excellent written and verbal communication skills.`,
  'HR Manager': `We are looking for an experienced and people-focused HR Manager to oversee all aspects of human resources for our organization. You will be responsible for talent acquisition, employee onboarding, performance management, compensation and benefits administration, employee relations and HR compliance. You will play a key role in building a positive and inclusive workplace culture.

The ideal candidate has strong knowledge of employment law and HR best practices, excellent interpersonal and conflict resolution skills, and experience implementing HR systems and processes. SHRM or CHRP certification is strongly preferred.

Requirements: 3+ years of HR management experience, deep knowledge of employment standards and labour law, experience with HRIS platforms, strong communication and relationship building skills, proven ability to handle sensitive and confidential matters with discretion.`,
  'Graphic Designer': `We are seeking a creative and versatile Graphic Designer to bring our brand to life across digital and print channels. You will create visually compelling designs for marketing campaigns, social media, website assets, presentations and branded materials. You will work closely with the marketing team to ensure all creative output is on brand and meets project objectives.

The ideal candidate has a strong eye for design, deep proficiency in Adobe Creative Suite including Photoshop, Illustrator and InDesign, and experience working in a fast-paced marketing environment. Motion graphics or video editing experience is a plus.

Requirements: 2+ years of graphic design experience, strong portfolio demonstrating range and creativity, proficiency in Adobe Creative Suite and Figma, excellent attention to detail and time management, ability to manage multiple design projects simultaneously.`,
  'Content Writer': `We are looking for a talented Content Writer to create engaging and informative content that attracts and retains our target audience. You will write blog posts, website copy, email campaigns, social media content, case studies and whitepapers. You will work closely with the marketing and SEO teams to ensure all content is optimized for search and aligned with our brand voice.

The ideal candidate is an exceptional writer with strong research skills, a solid understanding of SEO best practices and the ability to adapt their writing style for different audiences and platforms. Experience writing for B2B or SaaS companies is preferred.

Requirements: 2+ years of content writing experience, excellent writing, editing and proofreading skills, strong understanding of SEO and keyword strategy, ability to meet deadlines in a fast-paced environment, experience with CMS platforms like WordPress.`,
  'DevOps Engineer': `We are seeking a skilled DevOps Engineer to help us build, maintain and scale our cloud infrastructure and deployment pipelines. You will be responsible for managing CI/CD pipelines, automating infrastructure provisioning, monitoring system performance and ensuring high availability and security of our production environments. You will work closely with software engineers to streamline the development and deployment process.

The ideal candidate has hands-on experience with AWS or Azure, strong scripting skills in Python or Bash, and deep experience with containerization technologies like Docker and Kubernetes. Experience with infrastructure as code tools like Terraform is strongly preferred.

Requirements: 3+ years of DevOps or infrastructure engineering experience, strong knowledge of cloud platforms, experience with CI/CD tools like Jenkins or GitHub Actions, proficiency with Docker and Kubernetes, excellent problem solving and troubleshooting skills.`,
  'Customer Success Manager': `We are looking for a passionate and customer-focused Customer Success Manager to ensure our clients achieve maximum value from our product. You will be responsible for onboarding new customers, building strong relationships, identifying expansion opportunities and working proactively to reduce churn. You will serve as the primary point of contact for your portfolio of accounts.

The ideal candidate has excellent communication and relationship management skills, a proactive approach to problem solving and a genuine passion for helping customers succeed. Experience with CRM tools and customer success platforms like Gainsight or Intercom is preferred.

Requirements: 2+ years of customer success or account management experience, strong communication and interpersonal skills, ability to manage a large portfolio of accounts, experience with CRM and customer success tools, proven ability to meet retention and expansion targets.`,
  'Operations Manager': `We are seeking an experienced Operations Manager to oversee and optimize our day-to-day business operations. You will be responsible for managing cross-functional teams, improving operational processes, tracking key performance metrics and ensuring the organization runs efficiently and effectively. You will work closely with leadership to execute on strategic initiatives.

The ideal candidate has strong leadership and problem solving skills, experience designing and implementing operational processes and a data-driven approach to decision making. Experience in a high-growth startup or scale-up environment is a strong asset.

Requirements: 3+ years of operations management experience, strong analytical and organizational skills, experience with project management and workflow tools, excellent leadership and team management abilities, proven track record of improving operational efficiency and performance.`,
}

function GradientText({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#06b6d4] bg-clip-text text-transparent ${className}`}
    >
      {children}
    </span>
  )
}

function SectionGlow() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10"
      aria-hidden
      style={{
        background:
          'radial-gradient(ellipse 85% 55% at 50% -10%, rgba(99, 102, 241, 0.09), transparent 55%), radial-gradient(ellipse 70% 45% at 100% 50%, rgba(6, 182, 212, 0.06), transparent 50%), radial-gradient(ellipse 60% 40% at 0% 80%, rgba(99, 102, 241, 0.05), transparent 50%)',
      }}
    />
  )
}

function IconSparklesDoc() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function IconLetter() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function IconChart() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function IconMic() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  )
}

function IconBriefcase() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function IconBulb() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  )
}

function IconUserPlus() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  )
}

function IconDoc() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function IconParty() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  )
}

function IconBriefcaseWithCheck() {
  return (
    <div className="relative inline-flex text-[#6366f1]">
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      <span
        className="absolute -bottom-0.5 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-sm"
        aria-hidden
      >
        ✓
      </span>
    </div>
  )
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

const cardBase =
  'rounded-2xl border border-[#eaeaf2] bg-white p-6 sm:p-8 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.06)] transition-shadow duration-300 hover:shadow-[0_8px_40px_-12px_rgba(99,102,241,0.12)]'

function ReviewCard({ r }: { r: (typeof REVIEWS)[number] }) {
  return (
    <div className={`${cardBase} flex h-full min-h-0 flex-col`}>
      <p className="mb-3 text-base tracking-tight text-amber-400" aria-label="5 out of 5 stars">
        {'\u2605\u2605\u2605\u2605\u2605'}
      </p>
      <p className="mb-6 min-h-0 flex-1 text-sm leading-relaxed text-[#1a1a2e]">&ldquo;{r.quote}&rdquo;</p>
      <div className="mt-auto flex items-center gap-3 border-t border-[#f0f0f8] pt-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#06b6d4] text-sm font-bold text-white">
          {r.initials}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-[#1a1a2e]">{r.name}</p>
          <p className="text-xs text-[#5c5c7a]">{r.title}</p>
        </div>
      </div>
    </div>
  )
}

function HeroDashboardMock() {
  return (
    <div className="relative mx-auto w-full min-w-0 max-w-[min(100%,420px)] lg:max-w-none">
      <div
        className="rounded-2xl border border-[#eaeaf2] bg-white p-3 shadow-[0_20px_50px_-20px_rgba(99,102,241,0.25),0_8px_30px_-12px_rgba(15,23,42,0.12)] ring-1 ring-[#6366f1]/[0.06]"
        style={{ boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.18), 0 0 0 1px rgba(234, 234, 242, 1)' }}
      >
        <div className="mb-3 flex items-center gap-2 border-b border-[#f0f0f8] pb-2">
          <div className="flex gap-1.5 pl-1">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="mx-auto flex-1 rounded-lg bg-[#f8f8ff] px-3 py-1 text-center text-[10px] font-medium text-[#7c7c9a]">
            dashboard.unemployedclub.com
          </div>
        </div>
        <div className="flex gap-3">
          <div className="hidden w-[28%] shrink-0 space-y-2 sm:block">
            <div className="h-2 w-3/4 rounded bg-[#eaeaf2]" />
            <div className="h-2 w-full rounded bg-[#f4f4fa]" />
            <div className="h-2 w-5/6 rounded bg-[#f4f4fa]" />
            <div className="mt-4 h-2 w-full rounded bg-[#f4f4fa]" />
            <div className="h-2 w-4/5 rounded bg-[#f4f4fa]" />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div className="rounded-xl border border-[#eaeaf2] bg-gradient-to-br from-[#fafaff] to-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#6366f1]">ATS match</span>
                <span className="rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold text-emerald-700">Strong</span>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="relative h-20 w-20 shrink-0 rounded-full"
                  style={{
                    background: 'conic-gradient(from -90deg, #6366f1 0deg 331deg, #e8e8f4 331deg 360deg)',
                  }}
                >
                  <div className="absolute inset-[6px] flex items-center justify-center rounded-full bg-white shadow-inner">
                    <span className="bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-xl font-extrabold text-transparent">92%</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-2 w-full rounded bg-[#eaeaf2]" />
                  <div className="h-2 w-4/5 rounded bg-[#f0f0f8]" />
                  <div className="flex gap-2 pt-1">
                    <span className="rounded-md bg-[#eef2ff] px-2 py-0.5 text-[9px] font-semibold text-[#6366f1]">Keywords</span>
                    <span className="rounded-md bg-[#ecfeff] px-2 py-0.5 text-[9px] font-semibold text-cyan-700">Format</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[#eaeaf2] bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold text-[#1a1a2e]">Resume generation</span>
                <span className="flex items-center gap-1 text-[10px] font-medium text-[#6366f1]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6366f1] opacity-40" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#6366f1]" />
                  </span>
                  In progress
                </span>
              </div>
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#f0f0f8]">
                <div
                  className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#06b6d4]"
                  style={{ boxShadow: '0 0 12px rgba(99,102,241,0.45)' }}
                />
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full rounded bg-[#f4f4fa]" />
                <div className="h-2 w-[92%] rounded bg-[#f4f4fa]" />
                <div className="h-2 w-[78%] rounded bg-[#f4f4fa]" />
                <div className="h-2 w-[65%] rounded bg-[#eaeaf2]" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#f0f0f8] pt-3">
                <span className="text-[9px] font-bold uppercase tracking-wide text-[#7c7c9a]">Injected keywords</span>
                {['Stakeholder alignment', 'A/B testing', 'B2B SaaS'].map((t) => (
                  <span key={t} className="rounded-md bg-[#eef2ff] px-2 py-0.5 text-[9px] font-semibold text-[#6366f1]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-[#eaeaf2] bg-gradient-to-br from-white to-[#fafaff] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#5c5c7a]">Matched roles</span>
                <span className="text-[10px] font-bold text-[#6366f1]">View all</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 rounded-lg border border-[#f0f0f8] bg-white px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-bold text-[#1a1a2e]">Product Designer · Series B</p>
                    <p className="text-[9px] text-[#5c5c7a]">Remote · $150K–$185K</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">92%</span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-[#f0f0f8] bg-white px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-bold text-[#1a1a2e]">Senior UX · Fintech</p>
                    <p className="text-[9px] text-[#5c5c7a]">SF hybrid · $165K+</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">88%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ResumeBuilderHighlightMock() {
  const pill =
    'rounded-full px-3 py-1 text-[11px] font-semibold text-white shadow-md bg-gradient-to-r from-[#6366f1] to-[#8b5cf6]'
  return (
    <div className="relative mx-auto w-full min-w-0 max-w-full py-6 lg:max-w-none lg:py-4">
      <div
        className="pointer-events-none absolute left-2 top-8 z-0 h-4 w-4 rotate-45 rounded-sm bg-[#6366f1]/30"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-4 top-24 z-0 h-3 w-3 rotate-45 bg-[#8b5cf6]/35"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-16 left-6 z-0 h-3.5 w-3.5 rotate-45 rounded-sm bg-[#6366f1]/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-24 right-2 z-0 h-4 w-4 rotate-45 bg-[#06b6d4]/25"
        aria-hidden
      />

      <div
        className="absolute left-1/2 top-0 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#e0e7ff] bg-white px-3 py-1.5 text-[11px] font-extrabold tracking-wide text-[#6366f1] shadow-[0_8px_24px_-8px_rgba(99,102,241,0.35)]"
        aria-hidden
      >
        UPDATE ✓
      </div>

      <div className="relative z-[1] mt-10 min-h-[560px] lg:mt-12 lg:min-h-[500px]">
        {/* Back card — job description */}
        <div
          className="relative z-10 mx-auto w-full max-w-[min(100%,340px)] rounded-2xl border border-[#eaeaf2] bg-white p-5 shadow-[0_24px_60px_-16px_rgba(99,102,241,0.2),0_10px_36px_-12px_rgba(15,23,42,0.1),0_0_0_1px_rgba(240,240,248,0.9)] lg:absolute lg:left-0 lg:top-14 lg:mx-0 lg:max-w-[min(100%,340px)]"
        >
          <p className="mb-3 text-sm font-bold text-[#1a1a2e]">Pasted Job Description</p>
          <div className="space-y-2 text-[13px] leading-relaxed text-[#5c5c7a]">
            <p>- UX improvement</p>
            <p>- Design systems</p>
            <p>- Agile environment…</p>
          </div>

          <div className="pointer-events-none absolute -right-2 top-1/2 z-20 -translate-y-1/2 lg:-right-3">
            <span className={`${pill} inline-block shadow-lg`}>+14% activation</span>
          </div>
          <div className="pointer-events-none absolute -top-3 left-6 z-20 lg:left-8">
            <span className={`${pill} shadow-lg`}>UX Design</span>
          </div>
          <div className="pointer-events-none absolute bottom-20 left-1/2 z-20 -translate-x-1/2 lg:bottom-24">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d1fae5] bg-white px-3 py-1 text-[11px] font-semibold text-[#1a1a2e] shadow-md">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
              Agile
            </span>
          </div>

          <button
            type="button"
            className="mt-16 w-full rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] py-3 text-sm font-bold text-white shadow-[0_8px_28px_-6px_rgba(99,102,241,0.45)] lg:mt-20"
          >
            Optimize Resume
          </button>
        </div>

        <div
          className="pointer-events-none absolute left-[40%] top-[48%] z-[18] hidden text-2xl font-bold text-[#6366f1] drop-shadow-[0_2px_8px_rgba(255,255,255,0.9)] lg:block"
          style={{ transform: 'translate(-50%, -50%)' }}
          aria-hidden
        >
          →
        </div>

        {/* Front card — resume */}
        <div
          className="relative z-20 -mt-10 w-full max-w-[min(100%,380px)] rounded-2xl border border-[#eaeaf2] bg-white p-5 shadow-[0_28px_70px_-18px_rgba(99,102,241,0.28),0_14px_44px_-14px_rgba(15,23,42,0.14),0_0_0_1px_rgba(234,234,242,0.95)] lg:absolute lg:right-0 lg:top-2 lg:-mt-0 lg:max-w-[min(100%,380px)]"
        >
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#f0f0f8] pb-4">
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold text-[#1a1a2e]">Alex Rivera</p>
              <p className="mt-0.5 text-xs font-medium text-[#5c5c7a]">Senior Product Designer · Austin, TX</p>
              <p className="mt-2 truncate text-[11px]">
                <span className="text-[#06b6d4]">alex.rivera@email.com</span>
                <span className="text-[#5c5c7a]"> · </span>
                <span className="text-[#6366f1]">linkedin.com/in/arivera</span>
              </p>
            </div>
            <span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
              ATS READY
            </span>
          </div>

          <div className="mb-3">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7c7c9a]">Summary</p>
            <p className="text-xs leading-relaxed text-[#5c5c7a]">
              Product designer shipping B2B SaaS—research through launch, design systems, and cross-functional leadership with PM
              &amp; Eng.
            </p>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-[#eef2ff] px-2 py-0.5 text-[10px] font-semibold text-[#6366f1]">Figma</span>
            <span className="rounded-md bg-[#ecfeff] px-2 py-0.5 text-[10px] font-semibold text-cyan-700">Design systems</span>
            <span className="rounded-md bg-[#f5f3ff] px-2 py-0.5 text-[10px] font-semibold text-[#7c3aed]">A/B testing</span>
          </div>
          <div className="space-y-3 border-t border-[#f0f0f8] pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7c7c9a]">Experience</p>
            <div>
              <p className="text-[11px] font-bold leading-snug text-[#1a1a2e]">
                Acme Analytics <span className="font-medium text-[#5c5c7a]">—</span> Staff Product Designer{' '}
                <span className="font-medium text-[#5c5c7a]">—</span> <span className="text-[10px] font-semibold text-[#5c5c7a]">2021–Present</span>
              </p>
              <ul className="mt-2 space-y-1.5">
                <li className="flex gap-2 text-[11px] leading-snug text-[#5c5c7a]">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#6366f1]" />
                  <span>
                    Led checkout redesign; <span className="font-semibold text-[#06b6d4]">+14% activation</span> and fewer support
                    tickets in Q2.
                  </span>
                </li>
                <li className="flex gap-2 text-[11px] leading-snug text-[#5c5c7a]">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#06b6d4]" />
                  <span>Built component library adopted by 6 product teams; cut design QA cycles by ~30%.</span>
                </li>
                <li className="flex gap-2 text-[11px] leading-snug text-[#5c5c7a]">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#8b5cf6]" />
                  <span>Mentored 3 designers; partnered with PM on roadmap for enterprise tier.</span>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold leading-snug text-[#1a1a2e]">
                Northwind Labs <span className="font-medium text-[#5c5c7a]">—</span> Product Designer II{' '}
                <span className="font-medium text-[#5c5c7a]">—</span>{' '}
                <span className="text-[10px] font-semibold text-[#5c5c7a]">2018–2021</span>
              </p>
              <div className="mt-2 space-y-1">
                <div className="h-1.5 w-full rounded bg-[#eaeaf2]" />
                <div className="h-1.5 w-[92%] rounded bg-[#f0f0f8]" />
                <div className="h-1.5 w-[70%] rounded bg-[#f0f0f8]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MockAtsCircle() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center justify-center rounded-2xl border border-[#eaeaf2] bg-white p-8 shadow-[0_20px_50px_-20px_rgba(99,102,241,0.2)] sm:p-10">
      <div className="mb-4 flex w-full items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7c7c9a]">Job match</span>
        <span className="rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold text-emerald-700">Product Designer</span>
      </div>
      <div
        className="relative h-44 w-44"
        style={{
          background: 'conic-gradient(from -90deg, #6366f1 0deg 320deg, #06b6d4 320deg 350deg, #e8e8f4 350deg 360deg)',
          borderRadius: '50%',
        }}
      >
        <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-white shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)]">
          <span className="bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-5xl font-extrabold text-transparent">89</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-[#7c7c9a]">ATS score</span>
        </div>
      </div>
      <div className="mt-6 w-full space-y-3">
        <div className="flex justify-between text-xs font-medium text-[#5c5c7a]">
          <span>Keyword match</span>
          <span className="font-bold text-[#6366f1]">Strong</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#f0f0f8]">
          <div className="h-full w-[86%] rounded-full bg-gradient-to-r from-[#6366f1] to-[#06b6d4]" />
        </div>
        <div className="flex justify-between text-xs font-medium text-[#5c5c7a]">
          <span>Formatting</span>
          <span className="font-bold text-emerald-600">Good</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#f0f0f8]">
          <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-emerald-500 to-[#06b6d4]" />
        </div>
        <div className="flex justify-between text-xs font-medium text-[#5c5c7a]">
          <span>Skills detected</span>
          <span className="font-bold text-[#1a1a2e]">12 / 15</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {['Figma', 'User research', 'Stakeholder mgmt', 'B2B SaaS', 'Design systems'].map((k) => (
            <span key={k} className="inline-flex items-center gap-0.5 rounded-md border border-[#e8e8f4] bg-[#fafaff] px-2 py-0.5 text-[9px] font-semibold text-[#5c5c7a]">
              <span className="text-emerald-500">✓</span> {k}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function MockInterviewCard() {
  return (
    <div className="rounded-2xl border border-[#eaeaf2] bg-white p-6 shadow-[0_20px_50px_-20px_rgba(99,102,241,0.2)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#f5f3ff] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6366f1]">
          Live practice
        </div>
        <div className="flex items-center gap-2 text-[10px] font-semibold text-[#5c5c7a]">
          <span className="rounded-md bg-[#f0f0f8] px-2 py-0.5 text-[#1a1a2e]">Behavioral</span>
          <span className="tabular-nums text-[#6366f1]">2:14 left</span>
        </div>
      </div>
      <p className="mb-4 text-lg font-bold leading-snug text-[#1a1a2e]">
        Tell me about a time you led a project under a tight deadline.
      </p>
      <div className="mb-3 flex gap-2 text-[10px] font-semibold text-[#5c5c7a]">
        <span className="rounded-lg bg-[#f8f8ff] px-2 py-1 text-[#6366f1]">STAR format</span>
        <span className="rounded-lg bg-[#f8f8ff] px-2 py-1">60–90s target</span>
      </div>
      <div className="rounded-xl border border-dashed border-[#d4d4e8] bg-[#fafaff] p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#06b6d4] text-xs font-bold text-white">
            AI
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#7c7c9a]">Suggested outline</p>
            <p className="truncate text-xs font-semibold text-[#1a1a2e]">Situation → Task → Action → Result</p>
          </div>
        </div>
        <p className="mb-2 text-[11px] leading-relaxed text-[#5c5c7a]">
          Open with the constraint (budget freeze, date), name your role, then quantify the outcome (shipped on time, NPS, revenue).
        </p>
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded bg-[#eaeaf2]" />
          <div className="h-1.5 w-[94%] rounded bg-[#f0f0f8]" />
          <div className="h-1.5 w-[88%] rounded bg-[#f0f0f8]" />
          <div className="h-1.5 w-[72%] rounded bg-[#f0f0f8]" />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 border-t border-[#f0f0f8] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
          <span className="rounded-md border border-[#eaeaf2] bg-white px-2 py-1 text-[#5c5c7a]">
            Clarity <span className="text-[#6366f1]">9</span>
          </span>
          <span className="rounded-md border border-[#eaeaf2] bg-white px-2 py-1 text-[#5c5c7a]">
            Structure <span className="text-[#6366f1]">8</span>
          </span>
          <span className="rounded-md border border-[#eaeaf2] bg-white px-2 py-1 text-[#5c5c7a]">
            Relevance <span className="text-[#6366f1]">8</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-[#5c5c7a]">Score preview</span>
          <span className="rounded-lg bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-sm font-extrabold text-transparent">8.6 / 10</span>
        </div>
      </div>
    </div>
  )
}

function MockJobBoardCard() {
  const jobs = [
    {
      company: 'Stripe',
      title: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      salary: '$210K – $285K',
      posted: 'Posted 2d ago',
      match: '94% match',
    },
    {
      company: 'Notion',
      title: 'Product Designer',
      location: 'New York, NY',
      salary: '$160K – $195K',
      posted: 'Posted 5d ago',
      match: '88% match',
    },
    {
      company: 'Figma',
      title: 'Engineering Manager',
      location: 'Remote (US)',
      salary: '$200K – $260K',
      posted: 'Posted 1w ago',
      match: '91% match',
    },
  ] as const
  return (
    <div className="rounded-2xl border border-[#eaeaf2] bg-white p-4 shadow-[0_20px_50px_-20px_rgba(99,102,241,0.2),0_8px_30px_-12px_rgba(15,23,42,0.08)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f0f8] pb-3">
        <div>
          <span className="text-xs font-bold text-[#1a1a2e]">Recommended for you</span>
          <p className="mt-0.5 text-[10px] text-[#5c5c7a]">Synced from LinkedIn, Indeed &amp; more</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded-full bg-[#f5f3ff] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#6366f1]">
            24 new
          </span>
          <span className="hidden rounded-lg border border-[#eaeaf2] bg-[#fafaff] px-2 py-1 text-[10px] font-semibold text-[#5c5c7a] sm:inline">Save search</span>
        </div>
      </div>
      <div className="mb-2 flex gap-2">
        <span className="rounded-lg bg-[#1a1a2e] px-2.5 py-1 text-[10px] font-bold text-white">All</span>
        <span className="rounded-lg border border-[#eaeaf2] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#5c5c7a]">Remote</span>
        <span className="rounded-lg border border-[#eaeaf2] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#5c5c7a]">Design</span>
      </div>
      <div className="space-y-3">
        {jobs.map((job) => (
          <div
            key={job.company}
            className="flex flex-col gap-3 rounded-xl border border-[#eaeaf2] bg-[#fafaff] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#6366f1]">{job.company}</p>
                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">{job.match}</span>
              </div>
              <p className="mt-1 truncate text-sm font-bold text-[#1a1a2e]">{job.title}</p>
              <p className="mt-0.5 text-xs text-[#5c5c7a]">{job.location}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#7c7c9a]">
                <span className="font-semibold text-[#1a1a2e]">{job.salary}</span>
                <span>{job.posted}</span>
                <span className="text-[#6366f1]">Full-time</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch">
              <button
                type="button"
                className="rounded-lg border border-[#eaeaf2] bg-white px-3 py-2 text-[10px] font-bold text-[#5c5c7a] shadow-sm sm:order-2"
                aria-label="Save job"
              >
                Save
              </button>
              <button
                type="button"
                className="rounded-lg bg-gradient-to-r from-[#6366f1] to-[#06b6d4] px-4 py-2 text-center text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-95 sm:order-1 sm:py-2.5"
              >
                Apply
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockCoverLetterCard() {
  return (
    <div className="rounded-2xl border border-[#eaeaf2] bg-white p-5 shadow-[0_20px_50px_-20px_rgba(99,102,241,0.2),0_8px_30px_-12px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#f0fdfa] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#06b6d4]">
          Tailored draft
        </div>
        <span className="text-[10px] font-semibold text-[#5c5c7a]">Harvard format · 1 page</span>
      </div>
      <div className="rounded-xl border border-[#eaeaf2] bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,1)] sm:p-5">
        <div className="mb-4 border-b border-[#f0f0f8] pb-4 text-[10px] leading-relaxed text-[#5c5c7a] sm:text-[11px]">
          <p className="font-bold text-[#1a1a2e]">Jordan Lee</p>
          <p>jordan.lee@email.com · (415) 555-0192</p>
          <p className="mt-3 font-semibold text-[#1a1a2e]">Hiring Committee</p>
          <p>Acme Labs</p>
          <p>400 Market Street, Suite 1200</p>
          <p>San Francisco, CA 94105</p>
          <p className="mt-3 font-medium text-[#1a1a2e]">March 12, 2026</p>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-wide text-[#6366f1]">Re: Senior Product Designer, Growth</p>
        </div>
        <div className="space-y-2.5 text-[10px] leading-relaxed text-[#5c5c7a] sm:text-[11px] sm:leading-relaxed">
          <p className="font-semibold text-[#1a1a2e]">Dear Hiring Manager,</p>
          <p>
            I am writing to express my strong interest in the role. With experience shipping products used by millions, I am
            excited about the opportunity to contribute to your team&apos;s roadmap and culture.
          </p>
          <p>
            In my current role, I led cross-functional launches that improved conversion by double digits while mentoring junior
            designers. I would welcome the chance to bring that same focus on outcomes and craft to your organization.
          </p>
          <p>
            Thank you for your time and consideration. I would be glad to discuss how my background aligns with your needs in
            more detail.
          </p>
          <p className="pt-1 font-semibold text-[#1a1a2e]">Sincerely,</p>
          <p className="font-bold text-[#1a1a2e]">Jordan Lee</p>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [atsResumeFile, setAtsResumeFile] = useState<File | null>(null)
  const [atsDragActive, setAtsDragActive] = useState(false)
  const [atsJobDescription, setAtsJobDescription] = useState('')
  const [atsCheckerStep, setAtsCheckerStep] = useState<'upload' | 'job' | 'gate'>('upload')
  const [atsSelectedRole, setAtsSelectedRole] = useState<(typeof ATS_POPULAR_ROLES)[number] | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
      else setLoading(false)
    })
  }, [router])

  if (loading) return <div className="min-h-screen bg-white" />

  const handleAtsUpload = (file: File | null) => {
    if (!file) return
    const fileName = file.name.toLowerCase()
    const isAllowed =
      fileName.endsWith('.pdf') || fileName.endsWith('.doc') || fileName.endsWith('.docx')
    if (!isAllowed) return
    setAtsResumeFile(file)
    setAtsCheckerStep('job')
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[#1a1a2e]">
      <PublicSiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden pt-14 pb-20 sm:pt-20 sm:pb-28 lg:pt-24 lg:pb-36">
        <SectionGlow />
        <div className="landing-hero-dots pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-20">
            <div className="min-w-0">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e8e8f4] bg-white px-4 py-2 text-xs font-semibold text-[#5c5c7a] shadow-sm">
                <span className="text-[#6366f1]" aria-hidden>
                  ✦
                </span>
                Career Management Platform
              </div>
              <h1 className="mb-6 text-[1.65rem] font-extrabold leading-[1.15] tracking-tight text-[#1a1a2e] sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
                The club we don&apos;t want you to be a part of for a{' '}
                <GradientText>long time.</GradientText>
              </h1>
              <p className="mb-8 max-w-xl text-base leading-relaxed text-[#5c5c7a] sm:text-lg">
                A career platform that helps job seekers build stronger resumes, optimize applications, prepare for interviews, and track their job search in one place.
              </p>
              <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/signup"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-6 py-3 text-center text-sm font-extrabold text-white shadow-[0_8px_28px_-6px_rgba(99,102,241,0.55),0_4px_14px_-4px_rgba(6,182,212,0.35)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-6px_rgba(99,102,241,0.6),0_6px_18px_-4px_rgba(6,182,212,0.4)] sm:w-auto sm:text-base"
                >
                  Start Free <span aria-hidden>→</span>
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#eaeaf2] bg-white px-6 py-3 text-center text-sm font-semibold text-[#1a1a2e] transition-colors hover:bg-[#f8f8ff] sm:w-auto sm:text-base"
                >
                  View Platform
                </a>
              </div>
            </div>
            <div className="flex w-full min-w-0 justify-center lg:justify-end">
              <HeroDashboardMock />
            </div>
          </div>
        </div>
      </section>

      {/* Free ATS checker */}
      <section className="bg-[#f8f7ff] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#6366f1]">
            FREE TOOL
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-4xl lg:text-5xl">
            Analyze your resume <span className="bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent">before you apply</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#5c5c7a] sm:text-lg">
            Upload your resume to identify formatting issues, missing keywords, and opportunities to improve alignment with the role.
          </p>
        </div>

        <div className="mx-auto mt-12 w-full min-w-0 max-w-4xl px-1 sm:px-0">
          <div className="relative min-h-[620px] rounded-[20px] border border-[#eaeaf2] bg-white p-6 shadow-[0_16px_50px_-20px_rgba(99,102,241,0.25)] sm:min-h-[640px] sm:p-10 md:min-h-[560px]">
            <div
              className={`absolute inset-0 px-6 py-6 transition-opacity duration-500 sm:px-10 sm:py-10 ${
                atsCheckerStep === 'upload' ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366f1] to-[#06b6d4] text-white">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-[#1a1a2e]">Upload your resume</h3>
                <p className="mt-2 text-sm text-[#5c5c7a]">PDF, DOC or DOCX accepted</p>

                <label
                  htmlFor="ats-upload-input"
                  onDragOver={(e) => {
                    e.preventDefault()
                    setAtsDragActive(true)
                  }}
                  onDragLeave={() => setAtsDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setAtsDragActive(false)
                    handleAtsUpload(e.dataTransfer.files?.[0] || null)
                  }}
                  className={`mt-6 block w-full cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                    atsDragActive
                      ? 'border-[#6366f1] bg-[#eef2ff]'
                      : 'border-[#c7d2fe] bg-[#fafaff] hover:border-[#6366f1]'
                  }`}
                >
                  <input
                    id="ats-upload-input"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => handleAtsUpload(e.target.files?.[0] || null)}
                  />
                  <p className="text-sm font-semibold text-[#1a1a2e]">Upload your resume — PDF, DOC, or DOCX accepted</p>
                </label>

                {atsResumeFile ? (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">✓</span>
                    <span className="truncate font-medium">{atsResumeFile.name}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div
              className={`absolute inset-0 px-6 py-6 transition-opacity duration-500 sm:px-10 sm:py-10 ${
                atsCheckerStep === 'job' ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <div className="mx-auto flex h-full max-w-4xl flex-col rounded-2xl border border-[#eaeaf2] bg-white p-4 sm:p-6">
                <div className="mb-4">
                  <p className="text-sm font-bold text-[#1a1a2e]">Step 2 — Select a role or paste your own job description</p>
                </div>

                <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 md:grid-cols-[35%_65%] md:gap-0">
                  <div className="md:border-r md:border-[#eaeaf2] md:pr-4">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#6366f1]">POPULAR ROLES</p>
                    <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                      {ATS_POPULAR_ROLES.map((role) => {
                        const selected = atsSelectedRole === role
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              setAtsSelectedRole(role)
                              setAtsJobDescription(ATS_ROLE_DESCRIPTIONS[role])
                            }}
                            className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition-all ${
                              selected
                                ? 'border border-transparent bg-gradient-to-r from-[#6366f1] to-[#06b6d4] text-white'
                                : 'border border-[#6366f1] bg-white text-[#6366f1]'
                            }`}
                          >
                            {role}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex min-h-0 flex-col gap-4 md:pl-4">
                    <textarea
                      rows={8}
                      value={atsJobDescription}
                      onChange={(e) => {
                        setAtsSelectedRole(null)
                        setAtsJobDescription(e.target.value)
                      }}
                      placeholder="Job description will appear here when you select a role, or paste your own..."
                      className="h-[300px] w-full resize-none rounded-xl border border-[#d1d5db] bg-white px-4 py-3 text-[#1a1a2e] outline-none transition-all placeholder:text-[#9ca3af] focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setAtsCheckerStep('gate')}
                      className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-6 text-sm font-bold text-white shadow-[0_10px_28px_-8px_rgba(99,102,241,0.4)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-8px_rgba(99,102,241,0.5)]"
                    >
                      Check My Score <span aria-hidden>→</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`absolute inset-0 px-6 py-6 transition-opacity duration-500 sm:px-10 sm:py-10 ${
                atsCheckerStep === 'gate' ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-[#6366f1] to-[#06b6d4] text-white">
                  <span className="text-2xl" aria-hidden>🔒</span>
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-[#1a1a2e]">Your ATS score is ready!</h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#5c5c7a]">
                  Create a free account to see your full score, missing keywords and how to improve.
                </p>
                <Link
                  href="/signup?redirect=ats"
                  onClick={() => {
                    try {
                      if (atsResumeFile?.name) {
                        localStorage.setItem('ats_resume_name', atsResumeFile.name)
                      }
                      if (atsJobDescription.trim()) {
                        localStorage.setItem('ats_job_description', atsJobDescription.trim())
                      }
                    } catch {
                      /* ignore */
                    }
                  }}
                  className="mt-5 inline-flex min-h-11 w-full max-w-md items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_28px_-8px_rgba(99,102,241,0.4)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-8px_rgba(99,102,241,0.5)]"
                >
                  See My Full Score <span aria-hidden>→</span>
                </Link>
                <p className="mt-3 text-xs text-[#9ca3af]">Free forever. No credit card needed.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features — toolkit */}
      <section id="features" className="relative scroll-mt-24 py-20 sm:py-28 lg:py-32">
        <SectionGlow />
        <div className="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <div className="mb-4 inline-flex rounded-full bg-[#ede9fe] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#6366f1]">
              Your toolkit for success
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-3xl lg:text-4xl">
              Everything you need to <GradientText>run a smarter job search</GradientText>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#5c5c7a] sm:text-lg">
              Build tailored applications, prepare for interviews, and stay organized across every opportunity.
            </p>
          </div>
          <div className="grid grid-cols-1 auto-rows-fr gap-6 md:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-8">
            {FEATURE_TOOLKIT_CARDS.map(({ title, description, Icon, cta, href }) => (
              <div
                key={title}
                className="flex h-full min-h-0 flex-col rounded-[20px] border border-[#e8e4f5] bg-[#f5f3ff] p-[24px] shadow-[0_2px_12px_-4px_rgba(99,102,241,0.12),0_4px_20px_-8px_rgba(15,23,42,0.06)]"
              >
                <div className="mb-4 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#6366f1] via-[#7c3aed] to-[#06b6d4] text-white shadow-sm [&_svg]:h-6 [&_svg]:w-6">
                  <Icon />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[#1a1a2e]">{title}</h3>
                <p className="mb-6 min-h-0 flex-1 text-sm leading-relaxed text-[#6b7280]">{description}</p>
                <Link
                  href={href}
                  className="mt-auto inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-4 py-3 text-sm font-bold text-white shadow-[0_6px_20px_-6px_rgba(99,102,241,0.45)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-6px_rgba(99,102,241,0.5)]"
                >
                  {cta} <span aria-hidden>→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — path to new job */}
      <section id="how-it-works" className="relative scroll-mt-24 border-t border-[#eaeaf2] bg-white py-20 sm:py-28 lg:py-32">
        <SectionGlow />
        <div className="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <div className="mb-4 inline-flex rounded-full bg-[#6366f1] px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white">
              Your path to a new job
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-3xl lg:text-4xl">
              From resume to interview — <GradientText>organized in 4 steps</GradientText>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#5c5c7a] sm:text-lg">
              Build tailored applications, prepare for interviews, and stay organized across every opportunity.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {HOW_IT_WORKS_CARDS.map(({ num, title, description, checks, Icon, cta }) => (
              <div
                key={num}
                className="flex h-full min-h-0 flex-col rounded-[20px] border border-[#ebe9f5] bg-[#f8f7ff] p-6 shadow-[0_4px_24px_-8px_rgba(99,102,241,0.14),0_2px_8px_-4px_rgba(15,23,42,0.04)]"
              >
                <div className="mb-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#06b6d4] text-[11px] font-extrabold tabular-nums text-white shadow-sm">
                  {num}
                </div>
                <div className="mb-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[#6366f1] [&_svg]:h-7 [&_svg]:w-7">
                  <Icon />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[#1a1a2e]">{title}</h3>
                <p className="mb-4 text-sm leading-relaxed text-[#5c5c7a]">{description}</p>
                <ul className="mb-6 space-y-2">
                  {checks.map((line) => (
                    <li key={line} className="flex gap-2 text-sm leading-snug text-[#5c5c7a]">
                      <span className="shrink-0 font-bold text-[#6366f1]" aria-hidden>
                        ✓
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-1">
                  {cta.variant === 'solid' ? (
                    <Link
                      href={cta.href}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-4 py-3 text-center text-sm font-bold text-white shadow-[0_6px_20px_-6px_rgba(99,102,241,0.45)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-6px_rgba(99,102,241,0.5)]"
                    >
                      {cta.label}
                      {cta.arrow === true ? <span aria-hidden>→</span> : null}
                    </Link>
                  ) : (
                    <Link
                      href={cta.href}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-[#6366f1] bg-transparent px-4 py-3 text-center text-sm font-bold text-[#6366f1] transition-colors hover:bg-[#6366f1]/[0.06]"
                    >
                      {cta.label}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlight 1 — Resume */}
      <section className="relative overflow-hidden bg-[#f8f7ff] py-20 sm:py-28 lg:py-32">
        <SectionGlow />
        <div className="relative z-[1] mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-5 lg:gap-14 lg:px-8">
          <div className="min-w-0 lg:col-span-2">
            <span className="mb-3 inline-block text-xs font-extrabold uppercase tracking-widest text-[#6366f1]">BUILD</span>
            <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-3xl lg:text-4xl">
              <GradientText>Resume Builder</GradientText>
            </h2>
            <p className="mb-8 text-base leading-relaxed text-[#5c5c7a] sm:text-lg">
              Paste a job description and refine your resume with role-specific keywords, measurable achievements, and ATS-friendly formatting.
            </p>
            <Link
              href="/signup"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-8 py-3.5 text-center text-base font-extrabold text-white shadow-[0_12px_36px_-8px_rgba(99,102,241,0.45)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_16px_44px_-8px_rgba(99,102,241,0.5)] sm:w-auto"
            >
              Build Resume <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="min-w-0 lg:col-span-3">
            <ResumeBuilderHighlightMock />
          </div>
        </div>
      </section>

      {/* Highlight 2 — ATS */}
      <section className="relative border-t border-[#eaeaf2] py-20 sm:py-28 lg:py-32">
        <SectionGlow />
        <div className="relative z-[1] mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
          <div className="order-2 flex justify-center lg:order-1">
            <MockAtsCircle />
          </div>
          <div className="order-1 min-w-0 lg:order-2">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-[#06b6d4]">Optimize</span>
            <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-3xl lg:text-4xl">
              ATS <GradientText>Checker</GradientText>
            </h2>
            <p className="mb-6 text-base leading-relaxed text-[#5c5c7a] sm:text-lg">
              See your score, missing keywords, and formatting risks before you submit. Fix gaps in minutes—not after another silent rejection.
            </p>
            <Link href="/signup" className="btn-gradient landing-btn-glow inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white sm:w-auto">
              Analyze Resume
            </Link>
          </div>
        </div>
      </section>

      {/* Highlight 3 — Interview */}
      <section className="relative border-t border-[#eaeaf2] py-20 sm:py-28 lg:py-32">
        <SectionGlow />
        <div className="relative z-[1] mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
          <div className="min-w-0">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-[#8b5cf6]">Practice</span>
            <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-3xl lg:text-4xl">
              Interview <GradientText>Prep</GradientText>
            </h2>
            <p className="mb-6 text-base leading-relaxed text-[#5c5c7a] sm:text-lg">
              Practice role-specific interview questions and get structured feedback on clarity, relevance, and answer quality.
            </p>
            <Link href="/signup" className="btn-gradient landing-btn-glow inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white sm:w-auto">
              Practice Interviews
            </Link>
          </div>
          <div className="min-w-0">
            <MockInterviewCard />
          </div>
        </div>
      </section>

      {/* Highlight 4 — Job Board */}
      <section className="relative border-t border-[#eaeaf2] py-20 sm:py-28 lg:py-32">
        <SectionGlow />
        <div className="relative z-[1] mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
          <div className="min-w-0">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-[#6366f1]">JOB BOARD</span>
            <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-3xl lg:text-4xl">
              Manage every opportunity in <GradientText>one place</GradientText>
            </h2>
            <p className="mb-6 text-base leading-relaxed text-[#5c5c7a] sm:text-lg">
              Save jobs, organize applications, and tailor your resume for each role from a single workspace.
            </p>
            <Link href="/signup" className="btn-gradient landing-btn-glow inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white sm:w-auto">
              Explore Jobs
            </Link>
          </div>
          <div className="min-w-0">
            <MockJobBoardCard />
          </div>
        </div>
      </section>

      {/* Highlight 5 — Cover Letter */}
      <section className="relative border-t border-[#eaeaf2] py-20 sm:py-28 lg:py-32">
        <SectionGlow />
        <div className="relative z-[1] mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
          <div className="order-2 flex justify-center lg:order-1 lg:justify-start">
            <MockCoverLetterCard />
          </div>
          <div className="order-1 min-w-0 lg:order-2">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-[#06b6d4]">COVER LETTER</span>
            <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-3xl lg:text-4xl">
              Tailored cover letters for <GradientText>every role</GradientText>
            </h2>
            <p className="mb-6 text-base leading-relaxed text-[#5c5c7a] sm:text-lg">
              Create personalized cover letters based on your resume, target role, and company details.
            </p>
            <Link href="/signup" className="btn-gradient landing-btn-glow inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white sm:w-auto">
              Create Cover Letter
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section id="pricing" className="relative scroll-mt-24 border-t border-[#eaeaf2] py-20 sm:py-28 lg:py-32">
        <SectionGlow />
        <div className="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-center text-2xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-3xl lg:text-4xl">
            Simple, <GradientText>transparent pricing</GradientText>
          </h2>
          <p className="mx-auto mb-12 max-w-lg text-center text-[#5c5c7a]">Choose the plan that fits your search. Upgrade or cancel anytime.</p>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className={cardBase}>
              <p className="text-sm font-semibold text-[#1a1a2e]">Free</p>
              <p className="mt-2 text-3xl font-extrabold text-[#1a1a2e]">
                $0<span className="text-base font-medium text-[#5c5c7a]">/mo</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm text-[#5c5c7a]">
                <li className="flex gap-2">
                  <span className="font-medium text-[#1a1a2e]" aria-hidden>✓</span> Core resume builder
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-[#1a1a2e]" aria-hidden>✓</span> Limited ATS checks
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-[#1a1a2e]" aria-hidden>✓</span> Basic templates
                </li>
              </ul>
            </div>
            <div className={`${cardBase} relative border-slate-300 ring-1 ring-slate-200`}>
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm">
                Popular
              </span>
              <p className="text-sm font-semibold text-[#1a1a2e]">Pro Monthly</p>
              <p className="mt-2 text-3xl font-extrabold text-[#1a1a2e]">
                $14.99<span className="text-base font-medium text-[#5c5c7a]">/mo</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm text-[#5c5c7a]">
                <li className="flex gap-2">
                  <span className="font-medium text-[#1a1a2e]" aria-hidden>✓</span> Unlimited resumes &amp; letters
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-[#1a1a2e]" aria-hidden>✓</span> Full ATS checker
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-[#1a1a2e]" aria-hidden>✓</span> Interview coach &amp; job board
                </li>
              </ul>
            </div>
            <div className={cardBase}>
              <p className="text-sm font-semibold text-[#1a1a2e]">Pro Annual</p>
              <p className="mt-2 text-3xl font-extrabold text-[#1a1a2e]">
                $8.25<span className="text-base font-medium text-[#5c5c7a]">/mo</span>
              </p>
              <p className="mt-1 text-xs text-[#5c5c7a]">billed annually — best value</p>
              <ul className="mt-4 space-y-3 text-sm text-[#5c5c7a]">
                <li className="flex gap-2">
                  <span className="font-medium text-[#1a1a2e]" aria-hidden>✓</span> Everything in Pro Monthly
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-[#1a1a2e]" aria-hidden>✓</span> Priority support
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-[#1a1a2e]" aria-hidden>✓</span> Lowest per-month price
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex justify-center px-1">
            <Link
              href="/dashboard/pricing"
              className="btn-gradient landing-btn-glow inline-flex min-h-11 w-full max-w-sm items-center justify-center rounded-xl px-6 py-3 text-center text-sm font-semibold text-white sm:w-auto sm:max-w-none"
            >
              View Full Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className="relative scroll-mt-24 border-t border-[#eaeaf2] py-20 sm:py-28 lg:py-32">
        <SectionGlow />
        <div className="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 text-center text-sm font-semibold tracking-wide text-[#5c5c7a]">⭐ Early member reviews</p>
          <h2 className="mb-12 text-center text-2xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-3xl lg:text-4xl">
            Trusted by job seekers <GradientText>building better applications</GradientText>
          </h2>
          <div className="flex w-full flex-col items-center gap-6 lg:gap-8">
            <div className="grid w-full grid-cols-1 auto-rows-fr gap-6 md:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-8">
              {REVIEWS.slice(0, 3).map((r) => (
                <ReviewCard key={r.name} r={r} />
              ))}
            </div>
            <div className="flex w-full justify-center">
              <div className="grid w-full max-w-3xl grid-cols-1 auto-rows-fr gap-6 md:max-w-none md:grid-cols-2 md:gap-6 lg:max-w-4xl lg:gap-8">
                {REVIEWS.slice(3).map((r) => (
                  <ReviewCard key={r.name} r={r} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative border-t border-[#eaeaf2] py-20 sm:py-28 lg:py-32">
        <SectionGlow />
        <div className="relative z-[1] mx-auto w-full max-w-full px-4 sm:px-6 md:max-w-3xl lg:px-8">
          <h2 className="mb-12 text-center text-2xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-3xl lg:text-4xl">
            Frequently asked <GradientText>questions</GradientText>
          </h2>
          <div className="w-full space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={item.q}
                className="w-full overflow-hidden rounded-2xl border border-[#eaeaf2] bg-white shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex min-h-11 w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-semibold text-[#1a1a2e] transition-colors hover:bg-[#f8f8ff] sm:px-5 sm:py-4 sm:text-base"
                >
                  {item.q}
                  <ChevronDown className={`h-5 w-5 shrink-0 text-[#7c7c9a] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="border-t border-[#f0f0f8] px-5 pb-4 pt-0">
                    <p className="pt-3 text-sm leading-relaxed text-[#5c5c7a]">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-20 sm:py-28 lg:py-32">
        <div
          className="mx-4 flex flex-col items-center overflow-hidden rounded-3xl px-5 py-12 text-center sm:mx-6 sm:px-10 sm:py-14 lg:mx-auto lg:max-w-6xl lg:px-16"
          style={{
            background: 'linear-gradient(128deg, #6366f1 0%, #4f46e5 32%, #6d28d9 52%, #0e7490 78%, #06b6d4 100%)',
            boxShadow: '0 28px 60px rgba(99, 102, 241, 0.42), 0 14px 36px rgba(6, 182, 212, 0.22)',
          }}
        >
          <h2 className="mb-4 text-xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_14px_rgba(15,23,42,0.35)] sm:text-3xl lg:text-4xl">
            Ready to quit the club?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-sm font-medium leading-relaxed text-white drop-shadow-[0_1px_8px_rgba(15,23,42,0.25)] sm:text-lg">
            Build stronger applications and stay organized from resume to interview.
          </p>
          <Link
            href="/signup"
            className="inline-flex min-h-11 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-extrabold text-[#6366f1] shadow-[0_12px_40px_-8px_rgba(15,23,42,0.35)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_16px_48px_-8px_rgba(15,23,42,0.4)] sm:w-auto sm:max-w-none"
          >
            Get Started Free <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    </div>
  )
}

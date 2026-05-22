import type { Metadata } from 'next'
import LandingPage from './HomePageClient'

export const metadata: Metadata = {
  title: 'Unemployed Club — AI Resume Builder, ATS Checker & Career Platform',
  description:
    'Build ATS-optimized resumes, generate cover letters, prep for interviews and find jobs — all powered by AI. Join thousands of job seekers landing interviews faster.',
}

export default function HomePage() {
  return <LandingPage />
}

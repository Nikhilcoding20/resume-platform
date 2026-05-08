'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import UpgradeLimitModal from '@/app/components/UpgradeLimitModal'

async function generateResumeApiHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = { 'Content-Type': 'application/json' }
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }
  return headers
}

const JOB_DESCRIPTION_KEY = 'job-description'
const TEMPLATE_KEY = 'selected-template'

/** Strip characters that can cause JSON/URI/display issues. */
function sanitizeString(str) {
  if (str == null || typeof str !== 'string') return ''
  return str
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\u2028/g, '')
    .replace(/\u2029/g, '')
}

/** Safe base64 decode; atob throws "The string contains invalid characters" for invalid base64. */
function safeAtob(base64, context) {
  try {
    const sanitized = String(base64).replace(/\s/g, '').replace(/[\x00-\x1F\x7F]/g, '')
    return atob(sanitized)
  } catch (e) {
    console.error(`[generating/page.js] ${context}: atob failed (invalid base64):`, e)
    throw e
  }
}

/** Parse JSON with try/catch and logging. */
function safeJsonParse(text, context) {
  try {
    return JSON.parse(text)
  } catch (e) {
    console.error(`[generating/page.js] ${context}: JSON.parse failed:`, e)
    throw e
  }
}

/** Read job description from localStorage; decode if stored with encodeURIComponent. */
function getJobDescriptionFromStorage() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(JOB_DESCRIPTION_KEY) : null
    if (raw == null || raw === '') return ''
    try {
      const decoded = decodeURIComponent(raw)
      return sanitizeString(decoded)
    } catch (e) {
      console.error('[generating/page.js] getJobDescriptionFromStorage: decodeURIComponent failed:', e)
      return sanitizeString(raw)
    }
  } catch (e) {
    console.error('[generating/page.js] getJobDescriptionFromStorage: localStorage.getItem failed:', e)
    return ''
  }
}

/** Read template from localStorage with try/catch. */
function getTemplateFromStorage() {
  try {
    return localStorage.getItem(TEMPLATE_KEY) || ''
  } catch (e) {
    console.error('[generating/page.js] getTemplateFromStorage: localStorage.getItem failed:', e)
    return ''
  }
}


const RESUME_TIPS = [
  {
    text: 'Resumes with quantified achievements are 40% more likely to get interviews.',
    emoji: '📊',
    source: 'LinkedIn & hiring research · Interview callback rates',
  },
  {
    text: 'Use strong action verbs like Achieved, Launched, and Optimized at the start of every bullet.',
    emoji: '⚡',
    source: 'Resume best practices · Recruiter preferences',
  },
  {
    text: '75% of resumes are rejected by ATS before a human ever sees them.',
    emoji: '🤖',
    source: 'Industry ATS data · First-pass screening',
  },
  {
    text: 'Mirror exact keywords from the job description in your resume.',
    emoji: '🔑',
    source: 'ATS optimization · Keyword matching',
  },
  {
    text: 'Recruiters spend only about 7 seconds scanning a resume on first pass.',
    emoji: '⏱️',
    source: 'Eye-tracking studies · First impressions',
  },
  {
    text: 'Keep your resume to one page if you have less than 10 years of experience.',
    emoji: '📄',
    source: 'Career coaches · Length guidelines',
  },
  {
    text: 'Our AI is crafting your perfect tailored resume right now…',
    emoji: '✨',
    source: 'Unemployed Club · Tailored to your job',
  },
]

const TIP_INTERVAL_MS = 5000
const EXIT_ANIM_MS = 500
const LOADING_PROGRESS_DURATION_MS = 40000
const LOADING_PROGRESS_TARGET = 90
const COMPLETE_PROGRESS_DURATION_MS = 450

function buildResumeText(content) {
  if (!content) return ''
  const {
    name,
    email,
    phone,
    location,
    linkedin_url: linkedinUrl,
    portfolio_url: portfolioUrl,
    summary,
    experience,
    skills,
    skillGroups,
    education,
    certifications,
  } = content
  let t = [name, summary].filter(Boolean).join('\n\n')
  const contactBits = [email, phone, location, linkedinUrl, portfolioUrl].filter(Boolean)
  if (contactBits.length) t += '\n\n' + contactBits.join(' · ')
  if (Array.isArray(experience) && experience.length) {
    experience.forEach((job) => {
      t += '\n\n' + [job.title, job.company, job.dates].filter(Boolean).join(' ')
      if (Array.isArray(job.bullets)) t += '\n' + job.bullets.join('\n')
    })
  }
  if (Array.isArray(skillGroups) && skillGroups.length) {
    t += '\n\nSkills:'
    skillGroups.forEach((g) => {
      const cat = g?.category || 'Skills'
      const list = Array.isArray(g?.skills) ? g.skills.join(', ') : ''
      if (list) t += `\n${cat}: ${list}`
    })
  } else if (Array.isArray(skills) && skills.length) {
    t += '\n\nSkills: ' + skills.join(', ')
  }
  if (Array.isArray(education) && education.length) {
    t += '\n\nEducation:'
    education.forEach((e) => {
      const line = [e.degree, e.institution, e.graduationYear].filter(Boolean).join(' — ')
      if (line) t += '\n' + line
    })
  }
  if (Array.isArray(certifications) && certifications.length) {
    t += '\n\nCertifications:'
    certifications.forEach((c) => {
      const line = [c.name, c.issuer, c.year].filter(Boolean).join(' — ')
      if (line) t += '\n' + line
    })
  }
  return t
}

/** Normalize API resume content for editing (skill groups, arrays). */
function ensureResumeContentShape(c) {
  if (!c || typeof c !== 'object') return c
  const next = { ...c }
  if (!Array.isArray(next.experience)) next.experience = []
  if (!Array.isArray(next.education)) next.education = []
  if (!Array.isArray(next.certifications)) next.certifications = []
  next.experience = next.experience.map((job) => ({
    title: job?.title != null ? String(job.title) : '',
    company: job?.company != null ? String(job.company) : '',
    dates: job?.dates != null ? String(job.dates) : '',
    bullets: Array.isArray(job?.bullets)
      ? job.bullets.map((b) => String(b))
      : typeof job?.bullets === 'string'
        ? job.bullets.split(/\r?\n/).map((s) => s.trimEnd())
        : [],
  }))
  next.education = next.education.map((row) => ({
    degree: row?.degree != null ? String(row.degree) : '',
    institution: row?.institution != null ? String(row.institution) : '',
    graduationYear: row?.graduationYear != null ? String(row.graduationYear) : '',
  }))
  next.certifications = next.certifications.map((row) => ({
    name: row?.name != null ? String(row.name) : '',
    issuer: row?.issuer != null ? String(row.issuer) : '',
    year: row?.year != null ? String(row.year) : '',
  }))
  if (!Array.isArray(next.skillGroups) || next.skillGroups.length === 0) {
    if (Array.isArray(next.skills) && next.skills.length) {
      next.skillGroups = [{ category: 'Skills', skills: next.skills.map((s) => String(s)) }]
    } else {
      next.skillGroups = [{ category: 'Technical skills', skills: [] }]
    }
  } else {
    next.skillGroups = next.skillGroups.map((g) => ({
      category: g?.category != null ? String(g.category) : 'Skills',
      skills: Array.isArray(g?.skills) ? g.skills.map((s) => String(s)) : [],
    }))
  }
  return next
}

function scoreBand(score) {
  if (score >= 90) {
    return {
      ring: 'stroke-emerald-500',
      text: 'text-emerald-600',
      message: 'Excellent match for this role!',
    }
  }
  if (score >= 75) {
    return {
      ring: 'stroke-teal-500',
      text: 'text-teal-600',
      message: 'Strong match for this role!',
    }
  }
  if (score >= 60) {
    return {
      ring: 'stroke-amber-500',
      text: 'text-amber-600',
      message: 'Good match with room to improve',
    }
  }
  return {
    ring: 'stroke-rose-500',
    text: 'text-rose-600',
    message:
      'Your background is strong but this role requires different experience. Use the boost section below to improve your match.',
  }
}

function GeneratingLoadingUI({ tips, progress }) {
  const [tipIndex, setTipIndex] = useState(0)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    let timeoutId
    const id = setInterval(() => {
      setExiting(true)
      timeoutId = setTimeout(() => {
        setTipIndex((i) => (i + 1) % tips.length)
        setExiting(false)
      }, EXIT_ANIM_MS)
    }, TIP_INTERVAL_MS)
    return () => {
      clearInterval(id)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [tips.length])

  const tip = tips[tipIndex]
  const pct = Math.round(progress)

  return (
    <div className="fixed inset-0 z-[200] flex min-h-screen flex-col bg-white" aria-busy="true" aria-live="polite">
      <div className="shrink-0 px-4 py-5 sm:px-8 bg-[#f8f8ff] border-b border-[#eaeaf2]">
        <h1 className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#06b6d4] bg-clip-text text-transparent text-center">
          Getting you closer to your dream job!
        </h1>
        <div className="mt-4 space-y-2 overflow-visible">
          <div className="relative overflow-visible px-4 py-2 sm:px-6 sm:py-2.5">
            <div className="relative h-[100px] sm:h-[100px] overflow-visible">
              <div className="absolute inset-x-0 top-1/2 h-16 sm:h-16 -translate-y-1/2 rounded-full bg-gradient-to-b from-[#d8dde4] via-[#cfd5dd] to-[#e5e9ef] border border-[#c2c9d3] shadow-[inset_0_2px_10px_rgba(255,255,255,0.45),inset_0_-10px_18px_rgba(0,0,0,0.08)] overflow-visible">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0 border-t-2 border-dashed border-white/85" />
                <div className="absolute inset-x-0 top-[38%] -translate-y-1/2 h-0 border-t border-dashed border-white/45" />
                <div className="absolute inset-x-0 top-[62%] -translate-y-1/2 h-0 border-t border-dashed border-white/45" />

                <div className="absolute left-3 sm:left-4 top-2 bottom-2 flex items-center gap-1.5">
                  <div className="h-full w-1.5 rounded-full bg-white shadow-sm" />
                  <span className="text-[9px] font-black leading-none tracking-[0.22em] text-slate-700">START</span>
                </div>

                <div className="absolute right-3 sm:right-4 top-2 bottom-2 flex items-center gap-1.5">
                  <span className="text-[9px] font-black leading-none tracking-[0.22em] text-slate-700">FINISH</span>
                  <div className="flex items-center gap-1">
                    <div className="h-full w-1.5 rounded-full bg-white shadow-sm" />
                    <div className="grid h-5 w-5 grid-cols-2 overflow-hidden rounded-sm border border-slate-700 shadow-sm">
                      <div className="bg-slate-900" />
                      <div className="bg-white" />
                      <div className="bg-white" />
                      <div className="bg-slate-900" />
                    </div>
                  </div>
                </div>

                <span
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 inline-flex items-center justify-center will-change-[left]"
                  style={{ left: `${pct}%` }}
                  aria-label="Resume progress"
                >
                  <img
                    src="/images/running2.png"
                    alt="Running toward your next role"
                    width={60}
                    height={60}
                    className="h-[60px] w-[60px] object-contain drop-shadow-[0_2px_2px_rgba(15,23,42,0.2)]"
                  />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 bg-dot-grid-light">
        <div
          key={tipIndex}
          className={`w-full max-w-lg rounded-2xl border border-[#eaeaf2] bg-white px-6 py-8 shadow-lg shadow-slate-200/60 relative overflow-hidden ${
            exiting ? 'animate-tip-card-out' : 'animate-tip-card-in'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#06b6d4]" />
          <div className="mb-4 flex justify-center text-4xl">{tip.emoji}</div>
          <p className="text-center font-semibold text-[#1a1a2e] text-lg">{tip.text}</p>
          <p className="mt-4 text-center text-sm text-[#5c5c7a]">{tip.source}</p>
        </div>
        <div className="mt-8 flex gap-2">
          {tips.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === tipIndex ? 'w-6 bg-gradient-to-r from-[#6366f1] to-[#a855f7]' : 'w-1.5 bg-[#eaeaf2]'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function GeneratingPage() {
  const router = useRouter()
  const [status, setStatus] = useState('loading')
  const [profile, setProfile] = useState(null)
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null)
  const [pdfFilename, setPdfFilename] = useState('resume.pdf')
  const [resumeContent, setResumeContent] = useState(null)
  const [atsReview, setAtsReview] = useState(null)
  const [error, setError] = useState(null)
  const [showMakeChanges, setShowMakeChanges] = useState(false)
  const [changeFeedback, setChangeFeedback] = useState('')
  const [regenerateLoading, setRegenerateLoading] = useState(false)
  const [coverLetterLoading, setCoverLetterLoading] = useState(false)
  const [coverLetterError, setCoverLetterError] = useState(null)
  const [boostQuestions, setBoostQuestions] = useState([])
  const [boostAnswers, setBoostAnswers] = useState([]) // [{ yes: boolean, detail: string }, ...]
  const [boostQuestionsLoading, setBoostQuestionsLoading] = useState(false)
  const [boostQuestionsError, setBoostQuestionsError] = useState(null)
  const [boostResumeLoading, setBoostResumeLoading] = useState(false)
  const [showResumeEditor, setShowResumeEditor] = useState(false)
  const [saveEditorLoading, setSaveEditorLoading] = useState(false)
  const [saveEditorError, setSaveEditorError] = useState(null)
  const [showLimitOverlay, setShowLimitOverlay] = useState(false)
  const [limitOverlayVariant, setLimitOverlayVariant] = useState('resume')
  const [progress, setProgress] = useState(0)
  const progressAnimationRef = useRef(null)
  const progressValueRef = useRef(0)
  const pdfPreviewRef = useRef(null)
  const [pdfPreviewScale, setPdfPreviewScale] = useState(1)
  const A4_PDF_WIDTH = 595
  const A4_PDF_HEIGHT = 850

  useEffect(() => {
    progressValueRef.current = progress
  }, [progress])

  useEffect(() => {
    if (status !== 'review' || !pdfBlobUrl || !pdfPreviewRef.current) return
    const el = pdfPreviewRef.current
    const updateScale = () => {
      const w = el.offsetWidth
      setPdfPreviewScale(w > 0 ? w / A4_PDF_WIDTH : 1)
    }
    updateScale()
    const ro = new ResizeObserver(updateScale)
    ro.observe(el)
    return () => ro.disconnect()
  }, [status, pdfBlobUrl])

  const stopProgress = () => {
    if (progressAnimationRef.current) {
      cancelAnimationFrame(progressAnimationRef.current)
      progressAnimationRef.current = null
    }
  }

  const animateProgressTo = (target, durationMs) => {
    stopProgress()
    return new Promise((resolve) => {
      const from = progressValueRef.current
      if (durationMs <= 0 || Math.abs(target - from) < 0.01) {
        setProgress(target)
        progressValueRef.current = target
        resolve()
        return
      }

      const start = performance.now()
      const step = (now) => {
        const elapsed = now - start
        const t = Math.min(1, elapsed / durationMs)
        const eased = 1 - Math.pow(1 - t, 3)
        const next = from + (target - from) * eased
        setProgress(next)
        progressValueRef.current = next
        if (t < 1) {
          progressAnimationRef.current = requestAnimationFrame(step)
          return
        }
        progressAnimationRef.current = null
        resolve()
      }

      progressAnimationRef.current = requestAnimationFrame(step)
    })
  }

  useEffect(() => {
    if (status !== 'loading') {
      stopProgress()
      return
    }
    setProgress(0)
    progressValueRef.current = 0

    const start = performance.now()
    const step = (now) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / LOADING_PROGRESS_DURATION_MS)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = Math.min(LOADING_PROGRESS_TARGET, eased * LOADING_PROGRESS_TARGET)
      setProgress(next)
      progressValueRef.current = next
      if (t < 1) {
        progressAnimationRef.current = requestAnimationFrame(step)
        return
      }
      progressAnimationRef.current = null
    }

    progressAnimationRef.current = requestAnimationFrame(step)
    return stopProgress
  }, [status])

  useEffect(() => {
    async function generate() {
      const jobDescription = getJobDescriptionFromStorage()
      const templateName = getTemplateFromStorage()

      if (!jobDescription || !templateName) {
        setError('Missing job description or template. Please start over.')
        setStatus('error')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('resume_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileError || !profileData) {
        setError('No resume profile found. Please build or upload a resume first.')
        setStatus('error')
        return
      }
      setProfile(profileData)

      let additionalInstructions = ''
      try {
        additionalInstructions = (sessionStorage.getItem('resume-generate-additional-instructions') || '').trim()
      } catch (e) {
        console.warn('[generating/page.js] generate(): sessionStorage read failed:', e)
      }

      try {
        const payload = {
          profile: profileData,
          jobDescription: sanitizeString(jobDescription),
          templateName,
          includeContent: true,
          userId: user.id,
        }
        if (additionalInstructions) {
          payload.additionalInstructions = sanitizeString(additionalInstructions).slice(0, 12000)
        }
        const res = await fetch('/api/generate-resume', {
          method: 'POST',
          headers: await generateResumeApiHeaders(),
          body: JSON.stringify(payload),
        })

        if (res.status === 403) {
          setLimitOverlayVariant('resume')
          setShowLimitOverlay(true)
          setStatus('error')
          return
        }
        let data
        try {
          const text = await res.text()
          data = safeJsonParse(text, 'generate(): generate-resume response')
        } catch (parseErr) {
          setError('Invalid response from server')
          setStatus('error')
          return
        }
        if (!res.ok) {
          throw new Error((data && data.error) || `Request failed (${res.status})`)
        }

        const { pdfBase64, filename, content } = data
        if (!content || !pdfBase64) {
          setError('Invalid response from server')
          setStatus('error')
          return
        }

        let binary
        try {
          binary = safeAtob(pdfBase64, 'generate(): pdf base64 decode')
        } catch (atobErr) {
          setError('Invalid PDF data from server')
          setStatus('error')
          return
        }
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setPdfFilename(sanitizeString(filename) || 'resume.pdf')
        setPdfBlobUrl(url)
        setResumeContent(ensureResumeContentShape(content))

        try {
          sessionStorage.removeItem('resume-generate-additional-instructions')
        } catch (e) {
          console.warn('[generating/page.js] generate(): sessionStorage remove failed:', e)
        }

        try {
          const atsRes = await fetch('/api/ats-checker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resumeText: buildResumeText(content),
              jobDescription: sanitizeString(jobDescription),
            }),
          })
          if (atsRes.ok) {
            const atsText = await atsRes.text()
            let atsData
            try {
              atsData = safeJsonParse(atsText, 'generate(): ats-checker response')
            } catch (e) {
              console.error('[generating/page.js] generate(): ats-checker JSON parse failed, using empty ATS', e)
              setAtsReview({ score: 0, strengths: [], improvements: [] })
            }
            if (atsData) {
              const score = typeof atsData.overall_score === 'number' ? Math.min(100, Math.max(0, Math.round(atsData.overall_score))) : 0
              const strengths = Array.isArray(atsData.what_is_working) ? atsData.what_is_working.slice(0, 5) : []
              const improvements = Array.isArray(atsData.quick_wins) ? atsData.quick_wins.slice(0, 3) : (Array.isArray(atsData.recommendations) ? atsData.recommendations.slice(0, 3).map((r) => (r?.tip != null ? r.tip : String(r))) : [])
              setAtsReview({ score, strengths, improvements })
            }
          } else {
            setAtsReview({ score: 0, strengths: [], improvements: [] })
          }
        } catch (atsErr) {
          console.error('[generating/page.js] generate(): ats-checker request failed:', atsErr)
          setAtsReview({ score: 0, strengths: [], improvements: [] })
        }
        await animateProgressTo(100, COMPLETE_PROGRESS_DURATION_MS)
        setStatus('review')
      } catch (err) {
        console.error('[generating/page.js] generate():', err)
        setError(err.message || 'Failed to generate resume')
        setStatus('error')
      }
    }

    generate()
  }, [router])

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
    }
  }, [pdfBlobUrl])

  useEffect(() => {
    if (status !== 'review') return
    let jobDescription
    try {
      jobDescription = getJobDescriptionFromStorage()
    } catch (e) {
      console.error('[generating/page.js] boost questions: getJobDescriptionFromStorage failed:', e)
      return
    }
    if (!jobDescription || !jobDescription.trim()) return
    setBoostQuestionsLoading(true)
    setBoostQuestionsError(null)
    fetch('/api/boost-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobDescription: sanitizeString(jobDescription) }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Failed to load boost questions')
        const list = Array.isArray(data.questions) ? data.questions : []
        setBoostQuestions(list)
        setBoostAnswers(list.map(() => ({ yes: false, detail: '' })))
      })
      .catch((err) => {
        console.error('[generating/page.js] boost questions:', err)
        setBoostQuestionsError(err.message || 'Failed to load questions')
        setBoostQuestions([])
        setBoostAnswers([])
      })
      .finally(() => setBoostQuestionsLoading(false))
  }, [status])

  async function handleRegenerate() {
    const jobDescription = getJobDescriptionFromStorage()
    const templateName = getTemplateFromStorage()
    if (!profile || !resumeContent || !jobDescription || !templateName || !changeFeedback.trim()) return
    setRegenerateLoading(true)
    setStatus('loading')
    setProgress(0)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const res = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: await generateResumeApiHeaders(),
        body: JSON.stringify({
          profile,
          jobDescription: sanitizeString(jobDescription),
          templateName,
          includeContent: true,
          feedback: sanitizeString(changeFeedback.trim()),
          previousContent: resumeContent,
          userId: user.id || profile?.user_id,
        }),
      })
      if (res.status === 403) {
        setLimitOverlayVariant('resume')
        setShowLimitOverlay(true)
        setStatus('error')
        return
      }
      let data
      try {
        const text = await res.text()
        data = safeJsonParse(text, 'handleRegenerate(): generate-resume response')
      } catch (parseErr) {
        console.error('[generating/page.js] handleRegenerate(): generate-resume response JSON parse failed:', parseErr)
        setError('Invalid response from server')
        setStatus('error')
        return
      }
      if (!res.ok) {
        throw new Error((data && data.error) || `Request failed (${res.status})`)
      }
      const { pdfBase64, filename, content } = data
      if (!content || !pdfBase64) {
        setError('Invalid response from server')
        setStatus('error')
        return
      }

      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
      let binary
      try {
        binary = safeAtob(pdfBase64, 'handleRegenerate(): pdf base64 decode')
      } catch (atobErr) {
        setError('Invalid PDF data from server')
        setStatus('error')
        return
      }
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfFilename(sanitizeString(filename) || 'resume.pdf')
      setPdfBlobUrl(url)
      setResumeContent(ensureResumeContentShape(content))

      try {
        const atsRes = await fetch('/api/ats-checker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeText: buildResumeText(content), jobDescription: sanitizeString(jobDescription) }),
        })
        if (atsRes.ok) {
          const atsText = await atsRes.text()
          try {
            const atsData = safeJsonParse(atsText, 'handleRegenerate(): ats-checker response')
            const score = typeof atsData.overall_score === 'number' ? Math.min(100, Math.max(0, Math.round(atsData.overall_score))) : 0
            const strengths = Array.isArray(atsData.what_is_working) ? atsData.what_is_working.slice(0, 5) : []
            const improvements = Array.isArray(atsData.quick_wins) ? atsData.quick_wins.slice(0, 3) : (Array.isArray(atsData.recommendations) ? atsData.recommendations.slice(0, 3).map((r) => (r?.tip != null ? r.tip : String(r))) : [])
            setAtsReview({ score, strengths, improvements })
          } catch (atsParseErr) {
            console.error('[generating/page.js] handleRegenerate(): ats-checker JSON parse failed:', atsParseErr)
            setAtsReview({ score: 0, strengths: [], improvements: [] })
          }
        } else {
          setAtsReview({ score: 0, strengths: [], improvements: [] })
        }
      } catch (atsErr) {
        console.error('[generating/page.js] handleRegenerate(): ats-checker request failed:', atsErr)
        setAtsReview({ score: 0, strengths: [], improvements: [] })
      }
      await animateProgressTo(100, COMPLETE_PROGRESS_DURATION_MS)
      setStatus('review')
      setShowMakeChanges(false)
      setChangeFeedback('')
    } catch (err) {
      console.error('[generating/page.js] handleRegenerate():', err)
      setError(err.message || 'Failed to regenerate resume')
      setStatus('error')
    } finally {
      setRegenerateLoading(false)
    }
  }

  async function handleBoostResume() {
    const jobDescription = getJobDescriptionFromStorage()
    const templateName = getTemplateFromStorage()
    if (!profile || !resumeContent || !jobDescription || !templateName) return
    const parts = boostQuestions
      .map((q, i) => {
        const a = boostAnswers[i]
        if (!a || !a.yes) return null
        const detail = (a.detail || '').trim()
        return detail ? `Q: ${q}\nA: Yes. ${detail}` : `Q: ${q}\nA: Yes.`
      })
      .filter(Boolean)
    if (parts.length === 0) return
    const feedback = `The candidate has the following additional experience to add to the resume. Integrate these into the resume where relevant.\n\n${parts.join('\n\n')}`
    setBoostResumeLoading(true)
    setStatus('loading')
    setProgress(0)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const res = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: await generateResumeApiHeaders(),
        body: JSON.stringify({
          profile,
          jobDescription: sanitizeString(jobDescription),
          templateName,
          includeContent: true,
          feedback: sanitizeString(feedback),
          previousContent: resumeContent,
          userId: user.id || profile?.user_id,
        }),
      })
      if (res.status === 403) {
        setLimitOverlayVariant('resume')
        setShowLimitOverlay(true)
        setStatus('error')
        return
      }
      let data
      try {
        const text = await res.text()
        data = safeJsonParse(text, 'handleBoostResume(): generate-resume response')
      } catch (parseErr) {
        console.error('[generating/page.js] handleBoostResume(): response JSON parse failed:', parseErr)
        setError('Invalid response from server')
        setStatus('error')
        return
      }
      if (!res.ok) {
        throw new Error((data && data.error) || `Request failed (${res.status})`)
      }
      const { pdfBase64, filename, content } = data
      if (!content || !pdfBase64) {
        setError('Invalid response from server')
        setStatus('error')
        return
      }
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
      let binary
      try {
        binary = safeAtob(pdfBase64, 'handleBoostResume(): pdf base64 decode')
      } catch (atobErr) {
        setError('Invalid PDF data from server')
        setStatus('error')
        return
      }
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfFilename(sanitizeString(filename) || 'resume.pdf')
      setPdfBlobUrl(url)
      setResumeContent(ensureResumeContentShape(content))
      try {
        const atsRes = await fetch('/api/ats-checker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeText: buildResumeText(content), jobDescription: sanitizeString(jobDescription) }),
        })
        if (atsRes.ok) {
          const atsText = await atsRes.text()
          try {
            const atsData = safeJsonParse(atsText, 'handleBoostResume(): ats-checker response')
            const score = typeof atsData.overall_score === 'number' ? Math.min(100, Math.max(0, Math.round(atsData.overall_score))) : 0
            const strengths = Array.isArray(atsData.what_is_working) ? atsData.what_is_working.slice(0, 5) : []
            const improvements = Array.isArray(atsData.quick_wins) ? atsData.quick_wins.slice(0, 3) : (Array.isArray(atsData.recommendations) ? atsData.recommendations.slice(0, 3).map((r) => (r?.tip != null ? r.tip : String(r))) : [])
            setAtsReview({ score, strengths, improvements })
          } catch (atsParseErr) {
            console.error('[generating/page.js] handleBoostResume(): ats-checker JSON parse failed:', atsParseErr)
            setAtsReview({ score: 0, strengths: [], improvements: [] })
          }
        } else {
          setAtsReview({ score: 0, strengths: [], improvements: [] })
        }
      } catch (atsErr) {
        console.error('[generating/page.js] handleBoostResume(): ats-checker request failed:', atsErr)
        setAtsReview({ score: 0, strengths: [], improvements: [] })
      }
      await animateProgressTo(100, COMPLETE_PROGRESS_DURATION_MS)
      setStatus('review')
    } catch (err) {
      console.error('[generating/page.js] handleBoostResume():', err)
      setError(err.message || 'Failed to boost resume')
      setStatus('error')
    } finally {
      setBoostResumeLoading(false)
    }
  }

  async function handleSaveEditedResume() {
    if (!profile || !resumeContent) return
    let jobDescription = ''
    try {
      jobDescription = getJobDescriptionFromStorage()
    } catch (e) {
      console.error('[generating/page.js] handleSaveEditedResume: getJobDescriptionFromStorage failed:', e)
    }
    const templateName = getTemplateFromStorage()
    if (!templateName) {
      setSaveEditorError('Could not read template. Try choosing a template again from the dashboard.')
      return
    }
    setSaveEditorLoading(true)
    setSaveEditorError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const res = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: await generateResumeApiHeaders(),
        body: JSON.stringify({
          profile,
          jobDescription: sanitizeString(jobDescription || ''),
          templateName,
          includeContent: true,
          userId: user.id || profile.user_id,
          renderFromContent: true,
          resumeContent,
        }),
      })
      let data
      try {
        const text = await res.text()
        data = safeJsonParse(text, 'handleSaveEditedResume(): generate-resume response')
      } catch (parseErr) {
        console.error('[generating/page.js] handleSaveEditedResume(): JSON parse failed:', parseErr)
        setSaveEditorError('Invalid response from server')
        return
      }
      if (!res.ok) {
        throw new Error((data && data.error) || `Request failed (${res.status})`)
      }
      const { pdfBase64, filename, content } = data
      if (!content || !pdfBase64) {
        setSaveEditorError('Invalid response from server')
        return
      }
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
      let binary
      try {
        binary = safeAtob(pdfBase64, 'handleSaveEditedResume(): pdf base64 decode')
      } catch (atobErr) {
        setSaveEditorError('Invalid PDF data from server')
        return
      }
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfFilename(sanitizeString(filename) || 'resume.pdf')
      setPdfBlobUrl(url)
      const shaped = ensureResumeContentShape(content)
      setResumeContent(shaped)
      try {
        const atsRes = await fetch('/api/ats-checker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resumeText: buildResumeText(shaped),
            jobDescription: sanitizeString(jobDescription || ''),
          }),
        })
        if (atsRes.ok) {
          const atsText = await atsRes.text()
          try {
            const atsData = safeJsonParse(atsText, 'handleSaveEditedResume(): ats-checker response')
            const score = typeof atsData.overall_score === 'number' ? Math.min(100, Math.max(0, Math.round(atsData.overall_score))) : 0
            const strengths = Array.isArray(atsData.what_is_working) ? atsData.what_is_working.slice(0, 5) : []
            const improvements = Array.isArray(atsData.quick_wins) ? atsData.quick_wins.slice(0, 3) : (Array.isArray(atsData.recommendations) ? atsData.recommendations.slice(0, 3).map((r) => (r?.tip != null ? r.tip : String(r))) : [])
            setAtsReview({ score, strengths, improvements })
          } catch (atsParseErr) {
            console.error('[generating/page.js] handleSaveEditedResume(): ats-checker JSON parse failed:', atsParseErr)
            setAtsReview({ score: 0, strengths: [], improvements: [] })
          }
        }
      } catch (atsErr) {
        console.error('[generating/page.js] handleSaveEditedResume(): ats-checker failed:', atsErr)
      }
    } catch (err) {
      console.error('[generating/page.js] handleSaveEditedResume():', err)
      setSaveEditorError(err.message || 'Failed to update PDF')
    } finally {
      setSaveEditorLoading(false)
    }
  }

  return (
    <div
      className={
        status === 'review' && resumeContent
          ? 'relative flex w-full min-w-0 max-w-full flex-col min-h-[60vh]'
          : 'relative mx-auto flex max-w-xl min-w-0 flex-col items-center justify-center min-h-[60vh]'
      }
    >
      <UpgradeLimitModal
        open={showLimitOverlay}
        variant={limitOverlayVariant}
        onClose={() => setShowLimitOverlay(false)}
      />
      {status === 'loading' && (
        <GeneratingLoadingUI tips={RESUME_TIPS} progress={progress} />
      )}

      {status === 'error' && (
        <div className="text-center rounded-2xl p-8 border border-[#eaeaf2] bg-white shadow-lg max-w-lg mx-auto">
          <p className="text-red-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/dashboard/new-resume" className="px-6 py-3 btn-gradient ds-btn-glow text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all">Start Over</Link>
            <Link href="/dashboard" className="px-6 py-3 border border-[#eaeaf2] text-[#5c5c7a] hover:border-[#6366f1]/40 rounded-xl font-medium transition-all">Dashboard</Link>
          </div>
        </div>
      )}

      {status === 'review' && resumeContent && (
        <div className="flex min-h-screen w-full min-w-0 max-w-full flex-col bg-slate-100 px-4 sm:px-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent pt-8 pb-6">
            Review Your Resume
          </h2>

          <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-6 pb-6 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-[4%]">
            {/* Left column — 58% — PDF preview (A4, scaled to fit) */}
            <div className="min-w-0 overflow-hidden flex justify-start">
              <div
                ref={pdfPreviewRef}
                className="w-full overflow-hidden rounded-xl shadow-lg shadow-slate-200/60 border border-slate-200/80 bg-white"
                style={{ height: A4_PDF_HEIGHT * pdfPreviewScale }}
              >
                {pdfBlobUrl && (
                  <div
                    className="origin-top-left"
                    style={{
                      width: A4_PDF_WIDTH,
                      height: A4_PDF_HEIGHT,
                      transform: `scale(${pdfPreviewScale})`,
                    }}
                  >
                    <iframe
                      src={pdfBlobUrl}
                      title="Resume preview"
                      width={A4_PDF_WIDTH}
                      height={A4_PDF_HEIGHT}
                      className="block border-0"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right column — 38% — ATS card (no scroll so all content visible) */}
            <div className="min-w-0 flex flex-col overflow-visible">
              <div className="bg-white rounded-xl shadow-lg shadow-slate-200/60 border border-slate-200/80 p-6 h-fit shrink-0">
                <div className="flex flex-col items-center mb-6">
                  {atsReview && (
                    <div className="mb-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-center">
                        ATS Match Score
                      </p>
                    </div>
                  )}
                  {atsReview && (
                    <div className="mb-2 text-center text-[13px] font-medium text-slate-700">
                      {scoreBand(atsReview.score).message}
                    </div>
                  )}
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#eaeaf2" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="45"
                        fill="none"
                        strokeWidth="8"
                        strokeLinecap="round"
                        className={atsReview ? scoreBand(atsReview.score).ring : 'stroke-[#eaeaf2]'}
                        strokeDasharray={atsReview ? `${(atsReview.score / 100) * 283} 283` : '0 283'}
                        strokeDashoffset={0}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className={`text-2xl font-bold ${
                          atsReview ? scoreBand(atsReview.score).text : 'text-slate-400'
                        }`}
                      >
                        {atsReview?.score ?? '—'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[13px] text-slate-500 mt-2">out of 100</p>
                </div>
                {atsReview && atsReview.strengths?.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">Strengths</h3>
                    <ul className="space-y-1.5">
                      {atsReview.strengths.map((s, i) => (
                        <li key={i} className="text-[13px] text-slate-700 flex items-start gap-2">
                          <svg className="w-4 h-4 shrink-0 mt-0.5 text-[#06b6d4]" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {atsReview && atsReview.improvements?.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">Improvements</h3>
                    <ul className="space-y-1.5">
                      {atsReview.improvements.map((imp, i) => (
                        <li key={i} className="text-[13px] text-slate-700 flex items-start gap-2">
                          <svg className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Boost Your ATS Score */}
                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-3">Boost Your ATS Score</h3>
                  {boostQuestionsLoading && (
                    <p className="text-[13px] text-slate-500">Loading questions…</p>
                  )}
                  {boostQuestionsError && (
                    <p className="text-[13px] text-rose-600 mb-3">{boostQuestionsError}</p>
                  )}
                  {!boostQuestionsLoading && boostQuestions.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {boostQuestions.map((q, i) => (
                        <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                          <p className="text-[13px] font-medium text-slate-800 mb-2">{q}</p>
                          <label className="flex items-center gap-2 mb-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={boostAnswers[i]?.yes ?? false}
                              onChange={() => {
                                setBoostAnswers((prev) => {
                                  const next = [...(prev || [])]
                                  while (next.length <= i) next.push({ yes: false, detail: '' })
                                  next[i] = { ...next[i], yes: !next[i].yes }
                                  return next
                                })
                              }}
                              className="rounded border-slate-300 text-[#6366f1] focus:ring-[#6366f1]"
                            />
                            <span className="text-[12px] text-slate-600">Yes, I have this</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Tell us more if yes"
                            value={boostAnswers[i]?.detail ?? ''}
                            onChange={(e) => {
                              setBoostAnswers((prev) => {
                                const next = [...(prev || [])]
                                while (next.length <= i) next.push({ yes: false, detail: '' })
                                next[i] = { ...next[i], detail: e.target.value }
                                return next
                              })
                            }}
                            className="w-full px-3 py-2 text-[12px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] outline-none text-slate-900 placeholder-slate-400"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {!boostQuestionsLoading && boostQuestions.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBoostResume}
                      disabled={boostResumeLoading || !boostAnswers.some((a, i) => boostAnswers[i]?.yes)}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-opacity text-[13px]"
                    >
                      {boostResumeLoading ? 'Boosting…' : 'Boost My Resume With These'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Full-width bottom: Download + Make Changes */}
          <div className="w-full py-6 bg-white border-t border-slate-200 flex flex-col gap-4">
            <div className="flex gap-3 w-full">
              <a
                href={pdfBlobUrl}
                download={pdfFilename}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-center transition-colors text-[14px]"
              >
                Download Resume
              </a>
              <button
                type="button"
                onClick={() => setShowMakeChanges(!showMakeChanges)}
                className="flex-1 py-3.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-semibold rounded-xl transition-colors text-[14px]"
              >
                Make Changes
              </button>
              <Link
                href="/dashboard"
                className="flex-1 py-3.5 bg-white border-[1.5px] border-[#e5e7eb] text-slate-900 font-semibold rounded-xl text-center transition-colors text-[14px] hover:bg-slate-50"
              >
                Back to Dashboard
              </Link>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/50 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowResumeEditor((o) => !o)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50/90"
              >
                <div>
                  <span className="block text-[14px] font-semibold text-slate-900">Edit resume sections</span>
                  <span className="mt-0.5 block text-[12px] text-slate-500">
                    Adjust text directly — save to refresh the preview PDF (contact info stays from your profile).
                  </span>
                </div>
                <svg
                  className={`h-5 w-5 shrink-0 text-[#6366f1] transition-transform ${showResumeEditor ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showResumeEditor && resumeContent && (
                <div className="space-y-5 border-t border-slate-100 px-5 py-5 bg-gradient-to-b from-white to-slate-50/50">
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#6366f1] mb-3">Summary</h3>
                    <textarea
                      value={resumeContent.summary ?? ''}
                      onChange={(e) =>
                        setResumeContent((p) => (p ? { ...p, summary: e.target.value } : p))
                      }
                      rows={5}
                      className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none text-slate-900 placeholder-slate-400 resize-y"
                      placeholder="Professional summary…"
                    />
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#6366f1]">Experience</h3>
                      <button
                        type="button"
                        onClick={() =>
                          setResumeContent((p) =>
                            p
                              ? {
                                  ...p,
                                  experience: [...(p.experience || []), { title: '', company: '', dates: '', bullets: [] }],
                                }
                              : p
                          )
                        }
                        className="text-[12px] font-semibold text-teal-600 hover:text-teal-700"
                      >
                        + Add job
                      </button>
                    </div>
                    <div className="space-y-4">
                      {(resumeContent.experience || []).length === 0 && (
                        <p className="text-[13px] text-slate-500">No roles yet. Add a job to include experience.</p>
                      )}
                      {(resumeContent.experience || []).map((job, jobIdx) => (
                        <div
                          key={jobIdx}
                          className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 space-y-3"
                        >
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                setResumeContent((p) => {
                                  if (!p) return p
                                  const exp = [...(p.experience || [])]
                                  exp.splice(jobIdx, 1)
                                  return { ...p, experience: exp }
                                })
                              }
                              className="text-[12px] text-rose-600 hover:text-rose-700 font-medium"
                            >
                              Remove job
                            </button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-[12px] font-medium text-slate-600">
                              Title
                              <input
                                type="text"
                                value={job.title ?? ''}
                                onChange={(e) =>
                                  setResumeContent((p) => {
                                    if (!p) return p
                                    const exp = [...(p.experience || [])]
                                    exp[jobIdx] = { ...exp[jobIdx], title: e.target.value }
                                    return { ...p, experience: exp }
                                  })
                                }
                                className="mt-1 w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none"
                              />
                            </label>
                            <label className="block text-[12px] font-medium text-slate-600">
                              Company
                              <input
                                type="text"
                                value={job.company ?? ''}
                                onChange={(e) =>
                                  setResumeContent((p) => {
                                    if (!p) return p
                                    const exp = [...(p.experience || [])]
                                    exp[jobIdx] = { ...exp[jobIdx], company: e.target.value }
                                    return { ...p, experience: exp }
                                  })
                                }
                                className="mt-1 w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none"
                              />
                            </label>
                          </div>
                          <label className="block text-[12px] font-medium text-slate-600">
                            Dates
                            <input
                              type="text"
                              value={job.dates ?? ''}
                              onChange={(e) =>
                                setResumeContent((p) => {
                                  if (!p) return p
                                  const exp = [...(p.experience || [])]
                                  exp[jobIdx] = { ...exp[jobIdx], dates: e.target.value }
                                  return { ...p, experience: exp }
                                })
                              }
                              placeholder="e.g. Jan 2022 – Present"
                              className="mt-1 w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none"
                            />
                          </label>
                          <label className="block text-[12px] font-medium text-slate-600">
                            Bullet points (one per line)
                            <textarea
                              value={Array.isArray(job.bullets) ? job.bullets.join('\n') : ''}
                              onChange={(e) =>
                                setResumeContent((p) => {
                                  if (!p) return p
                                  const exp = [...(p.experience || [])]
                                  const lines = e.target.value.split(/\r?\n/)
                                  exp[jobIdx] = { ...exp[jobIdx], bullets: lines }
                                  return { ...p, experience: exp }
                                })
                              }
                              rows={5}
                              className="mt-1 w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none font-mono text-slate-800 resize-y"
                              placeholder="Led migration of…"
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-teal-600">Education</h3>
                      <button
                        type="button"
                        onClick={() =>
                          setResumeContent((p) =>
                            p
                              ? {
                                  ...p,
                                  education: [...(p.education || []), { degree: '', institution: '', graduationYear: '' }],
                                }
                              : p
                          )
                        }
                        className="text-[12px] font-semibold text-teal-600 hover:text-teal-700"
                      >
                        + Add entry
                      </button>
                    </div>
                    <div className="space-y-4">
                      {(resumeContent.education || []).length === 0 && (
                        <p className="text-[13px] text-slate-500">No education listed.</p>
                      )}
                      {(resumeContent.education || []).map((edu, eduIdx) => (
                        <div key={eduIdx} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 grid gap-3 sm:grid-cols-3">
                          <label className="block text-[12px] font-medium text-slate-600 sm:col-span-1">
                            Degree
                            <input
                              type="text"
                              value={edu.degree ?? ''}
                              onChange={(e) =>
                                setResumeContent((p) => {
                                  if (!p) return p
                                  const list = [...(p.education || [])]
                                  list[eduIdx] = { ...list[eduIdx], degree: e.target.value }
                                  return { ...p, education: list }
                                })
                              }
                              className="mt-1 w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none"
                            />
                          </label>
                          <label className="block text-[12px] font-medium text-slate-600 sm:col-span-1">
                            Institution
                            <input
                              type="text"
                              value={edu.institution ?? ''}
                              onChange={(e) =>
                                setResumeContent((p) => {
                                  if (!p) return p
                                  const list = [...(p.education || [])]
                                  list[eduIdx] = { ...list[eduIdx], institution: e.target.value }
                                  return { ...p, education: list }
                                })
                              }
                              className="mt-1 w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none"
                            />
                          </label>
                          <div className="flex gap-2 sm:col-span-1 items-end">
                            <label className="block text-[12px] font-medium text-slate-600 flex-1">
                              Graduation year
                              <input
                                type="text"
                                value={edu.graduationYear ?? ''}
                                onChange={(e) =>
                                  setResumeContent((p) => {
                                    if (!p) return p
                                    const list = [...(p.education || [])]
                                    list[eduIdx] = { ...list[eduIdx], graduationYear: e.target.value }
                                    return { ...p, education: list }
                                  })
                                }
                                className="mt-1 w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setResumeContent((p) => {
                                  if (!p) return p
                                  const list = [...(p.education || [])]
                                  list.splice(eduIdx, 1)
                                  return { ...p, education: list }
                                })
                              }
                              className="mb-0.5 shrink-0 px-2 py-2 text-[12px] text-rose-600 hover:bg-rose-50 rounded-lg font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#6366f1]">Skills</h3>
                      <button
                        type="button"
                        onClick={() =>
                          setResumeContent((p) =>
                            p
                              ? {
                                  ...p,
                                  skillGroups: [...(p.skillGroups || []), { category: 'Skills', skills: [] }],
                                }
                              : p
                          )
                        }
                        className="text-[12px] font-semibold text-teal-600 hover:text-teal-700"
                      >
                        + Add category
                      </button>
                    </div>
                    <div className="space-y-4">
                      {(resumeContent.skillGroups || []).map((group, gi) => (
                        <div key={gi} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 space-y-2">
                          <div className="flex gap-2 items-start">
                            <label className="flex-1 text-[12px] font-medium text-slate-600">
                              Category name
                              <input
                                type="text"
                                value={group.category ?? ''}
                                onChange={(e) =>
                                  setResumeContent((p) => {
                                    if (!p) return p
                                    const sg = [...(p.skillGroups || [])]
                                    sg[gi] = { ...sg[gi], category: e.target.value }
                                    return { ...p, skillGroups: sg }
                                  })
                                }
                                className="mt-1 w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setResumeContent((p) => {
                                  if (!p) return p
                                  const sg = [...(p.skillGroups || [])]
                                  sg.splice(gi, 1)
                                  return { ...p, skillGroups: sg.length ? sg : [{ category: 'Skills', skills: [] }] }
                                })
                              }
                              className="mt-6 shrink-0 text-[12px] text-rose-600 hover:text-rose-700 font-medium"
                            >
                              Remove
                            </button>
                          </div>
                          <label className="block text-[12px] font-medium text-slate-600">
                            Skills (one per line)
                            <textarea
                              value={(group.skills || []).join('\n')}
                              onChange={(e) =>
                                setResumeContent((p) => {
                                  if (!p) return p
                                  const sg = [...(p.skillGroups || [])]
                                  const lines = e.target.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
                                  sg[gi] = { ...sg[gi], skills: lines }
                                  return { ...p, skillGroups: sg }
                                })
                              }
                              rows={4}
                              className="mt-1 w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none resize-y"
                              placeholder={`Python\nAWS`}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-teal-600">Certifications</h3>
                      <button
                        type="button"
                        onClick={() =>
                          setResumeContent((p) =>
                            p
                              ? {
                                  ...p,
                                  certifications: [...(p.certifications || []), { name: '', issuer: '', year: '' }],
                                }
                              : p
                          )
                        }
                        className="text-[12px] font-semibold text-teal-600 hover:text-teal-700"
                      >
                        + Add certification
                      </button>
                    </div>
                    <div className="space-y-4">
                      {(resumeContent.certifications || []).length === 0 && (
                        <p className="text-[13px] text-slate-500">No certifications listed.</p>
                      )}
                      {(resumeContent.certifications || []).map((cert, ci) => (
                        <div key={ci} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 grid gap-3 sm:grid-cols-3">
                          <label className="block text-[12px] font-medium text-slate-600">
                            Name
                            <input
                              type="text"
                              value={cert.name ?? ''}
                              onChange={(e) =>
                                setResumeContent((p) => {
                                  if (!p) return p
                                  const list = [...(p.certifications || [])]
                                  list[ci] = { ...list[ci], name: e.target.value }
                                  return { ...p, certifications: list }
                                })
                              }
                              className="mt-1 w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none"
                            />
                          </label>
                          <label className="block text-[12px] font-medium text-slate-600">
                            Issuer
                            <input
                              type="text"
                              value={cert.issuer ?? ''}
                              onChange={(e) =>
                                setResumeContent((p) => {
                                  if (!p) return p
                                  const list = [...(p.certifications || [])]
                                  list[ci] = { ...list[ci], issuer: e.target.value }
                                  return { ...p, certifications: list }
                                })
                              }
                              className="mt-1 w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none"
                            />
                          </label>
                          <div className="flex gap-2 items-end">
                            <label className="block text-[12px] font-medium text-slate-600 flex-1">
                              Year
                              <input
                                type="text"
                                value={cert.year ?? ''}
                                onChange={(e) =>
                                  setResumeContent((p) => {
                                    if (!p) return p
                                    const list = [...(p.certifications || [])]
                                    list[ci] = { ...list[ci], year: e.target.value }
                                    return { ...p, certifications: list }
                                  })
                                }
                                className="mt-1 w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setResumeContent((p) => {
                                  if (!p) return p
                                  const list = [...(p.certifications || [])]
                                  list.splice(ci, 1)
                                  return { ...p, certifications: list }
                                })
                              }
                              className="mb-0.5 shrink-0 px-2 py-2 text-[12px] text-rose-600 hover:bg-rose-50 rounded-lg font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {saveEditorError && (
                    <p className="text-[13px] text-rose-600" role="alert">
                      {saveEditorError}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveEditedResume}
                    disabled={saveEditorLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] hover:opacity-95 disabled:opacity-50 text-white font-semibold text-[14px] shadow-md shadow-indigo-200/50 transition-opacity"
                  >
                    {saveEditorLoading ? 'Saving & updating PDF…' : 'Save changes'}
                  </button>
                </div>
              )}
            </div>

            {showMakeChanges && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <label className="block text-[13px] font-medium text-slate-800">
                  Describe the changes you want (e.g. &quot;make summary shorter&quot;, &quot;add more keywords&quot;)
                </label>
                <textarea
                  value={changeFeedback}
                  onChange={(e) => setChangeFeedback(e.target.value)}
                  placeholder="e.g. Make summary shorter, add more keywords from the job description..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] outline-none text-slate-900 placeholder-slate-400 resize-y text-[13px]"
                />
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={regenerateLoading || !changeFeedback.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#6366f1] to-[#a855f7] disabled:opacity-50 text-white font-semibold rounded-lg transition-opacity text-[13px]"
                >
                  {regenerateLoading ? 'Regenerating…' : 'Regenerate'}
                </button>
              </div>
            )}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center gap-3">
              <p className="text-[13px] text-slate-500">Want a matching cover letter?</p>
              <button
                type="button"
                onClick={async () => {
                  if (!profile) return
                  let jobDescription
                  try {
                    jobDescription = getJobDescriptionFromStorage()
                  } catch (e) {
                    console.error('[generating/page.js] cover letter: getJobDescriptionFromStorage failed:', e)
                    setCoverLetterError('Job description not found. Please start over.')
                    return
                  }
                  if (!jobDescription) {
                    setCoverLetterError('Job description not found. Please start over.')
                    return
                  }
                  setCoverLetterLoading(true)
                  setCoverLetterError(null)
                  try {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) {
                      router.replace('/login')
                      return
                    }
                    const { data: { session: coverSession } } = await supabase.auth.getSession()
                    const res = await fetch('/api/generate-cover-letter', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(coverSession?.access_token
                          ? { Authorization: `Bearer ${coverSession.access_token}` }
                          : {}),
                      },
                      body: JSON.stringify({ profile, jobDescription: sanitizeString(jobDescription), userId: user.id || profile.user_id }),
                    })
                    if (res.status === 403) {
                      setLimitOverlayVariant('cover-letter')
                      setShowLimitOverlay(true)
                      return
                    }
                    if (!res.ok) {
                      let errData = {}
                      try {
                        const errText = await res.text()
                        errData = safeJsonParse(errText, 'cover letter: error response')
                      } catch (parseErr) {
                        console.error('[generating/page.js] cover letter: error response JSON parse failed:', parseErr)
                      }
                      throw new Error(errData.error || 'Failed to generate cover letter')
                    }
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const disposition = res.headers.get('Content-Disposition')
                    const match = disposition?.match(/filename="?([^";\n]+)"?/)
                    const filename = sanitizeString(match?.[1]) || 'cover_letter.pdf'
                    const a = document.createElement('a')
                    a.href = url
                    a.download = filename
                    a.click()
                    URL.revokeObjectURL(url)
                  } catch (err) {
                    console.error('[generating/page.js] cover letter:', err)
                    setCoverLetterError(err.message || 'Failed to generate cover letter')
                  } finally {
                    setCoverLetterLoading(false)
                  }
                }}
                disabled={coverLetterLoading}
                className="px-5 py-2.5 bg-[#06b6d4] hover:bg-[#0891b2] disabled:opacity-50 text-white font-medium rounded-lg transition-colors text-[13px]"
              >
                {coverLetterLoading ? 'Generating...' : 'Generate Cover Letter'}
              </button>
              <Link href="/dashboard/choose-template" className="text-[13px] text-slate-500 hover:text-[#6366f1] font-medium">
                Change Template
              </Link>
              {coverLetterError && <p className="w-full mt-1 text-[13px] text-red-600">{coverLetterError}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

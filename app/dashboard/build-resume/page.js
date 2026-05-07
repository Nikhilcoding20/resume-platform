'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUsage, canCreateResumeForUser } from '@/lib/checkUsage'
import UpgradeLimitModal from '@/app/components/UpgradeLimitModal'

const TOTAL_STEPS = 6

const emptyJob = {
  jobTitle: '',
  companyName: '',
  startDate: '',
  endDate: '',
  description: '',
}

const emptyEducation = {
  degreeName: '',
  schoolName: '',
  graduationYear: '',
}

const emptyProject = {
  projectName: '',
  description: '',
  url: '',
}

const emptyCertification = {
  certificationName: '',
  issuer: '',
  year: '',
}

export default function BuildResumePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState(null)
  const [initLoading, setInitLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    city: '',
    country: '',
    summary: '',
    workExperience: [{ ...emptyJob }],
    education: [{ ...emptyEducation }],
    skills: [],
    linkedinUrl: '',
    portfolioUrl: '',
    projects: [{ ...emptyProject }],
    certifications: [{ ...emptyCertification }],
  })
  const [skillInput, setSkillInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    let cancelled = false
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      if (cancelled) return
      setUserId(user.id)
      const usage = await getUsage(supabase, user.id)
      if (!cancelled && !(await canCreateResumeForUser(supabase, user.id, usage))) {
        setShowUpgradeModal(true)
      }
      if (!cancelled) setInitLoading(false)
    }
    init()
    return () => { cancelled = true }
  }, [router])

  const progress = (step / TOTAL_STEPS) * 100

  function scrollToFirstError() {
    const el = document.querySelector('[data-error="true"]')
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  function validateStep(currentStep) {
    const newErrors = {}

    if (currentStep === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = 'This field is required'
      if (!formData.email.trim()) newErrors.email = 'This field is required'
      if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'This field is required'
    }

    if (currentStep === 2) {
      const jobsErrors = formData.workExperience.map((job) => {
        const je = {}
        if (!job.jobTitle.trim()) je.jobTitle = 'This field is required'
        if (!job.companyName.trim()) je.companyName = 'This field is required'
        return je
      })
      const hasAtLeastOne = formData.workExperience.length > 0 &&
        formData.workExperience.some((job) => job.jobTitle.trim() && job.companyName.trim())
      if (!hasAtLeastOne) {
        jobsErrors[0] = {
          ...(jobsErrors[0] || {}),
          jobTitle: jobsErrors[0]?.jobTitle || 'This field is required',
          companyName: jobsErrors[0]?.companyName || 'This field is required',
        }
      }
      newErrors.workExperience = jobsErrors
    }

    if (currentStep === 3) {
      const eduErrors = formData.education.map((edu) => {
        const ee = {}
        if (!edu.degreeName.trim()) ee.degreeName = 'This field is required'
        if (!edu.schoolName.trim()) ee.schoolName = 'This field is required'
        return ee
      })
      const hasAtLeastOneEdu = formData.education.length > 0 &&
        formData.education.some((edu) => edu.degreeName.trim() && edu.schoolName.trim())
      if (!hasAtLeastOneEdu) {
        eduErrors[0] = {
          ...(eduErrors[0] || {}),
          degreeName: eduErrors[0]?.degreeName || 'This field is required',
          schoolName: eduErrors[0]?.schoolName || 'This field is required',
        }
      }
      newErrors.education = eduErrors
    }

    if (currentStep === 4) {
      if (!Array.isArray(formData.skills) || formData.skills.length < 3) {
        newErrors.skills = 'Please add at least 3 skills'
      }
    }

    setErrors((prev) => ({ ...prev, ...newErrors }))

    const hasError =
      Object.keys(newErrors).length > 0 &&
      Object.values(newErrors).some((val) => {
        if (Array.isArray(val)) return val.some((v) => v && Object.keys(v).length > 0)
        return Boolean(val)
      })

    if (hasError && typeof window !== 'undefined') {
      setTimeout(scrollToFirstError, 0)
    }

    return !hasError
  }

  function updateField(section, field, value, index) {
    if (index !== undefined) {
      setFormData((prev) => ({
        ...prev,
        [section]: prev[section].map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        ),
      }))
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }
  }

  function addJob() {
    setFormData((prev) => ({
      ...prev,
      workExperience: [...prev.workExperience, { ...emptyJob }],
    }))
  }

  function removeJob(index) {
    setFormData((prev) => ({
      ...prev,
      workExperience: prev.workExperience.filter((_, i) => i !== index),
    }))
  }

  function addEducation() {
    setFormData((prev) => ({
      ...prev,
      education: [...prev.education, { ...emptyEducation }],
    }))
  }

  function removeEducation(index) {
    setFormData((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }))
  }

  function addProject() {
    setFormData((prev) => ({
      ...prev,
      projects: [...prev.projects, { ...emptyProject }],
    }))
  }

  function removeProject(index) {
    setFormData((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }))
  }

  function addCertification() {
    setFormData((prev) => ({
      ...prev,
      certifications: [...prev.certifications, { ...emptyCertification }],
    }))
  }

  function removeCertification(index) {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }))
  }

  function handleSkillKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = skillInput.trim()
      if (trimmed && !formData.skills.includes(trimmed)) {
        setFormData((prev) => ({
          ...prev,
          skills: [...prev.skills, trimmed],
        }))
        setSkillInput('')
      }
    }
  }

  function removeSkill(skill) {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }))
  }

  async function handleSave() {
    if (!userId) return
    setSaving(true)

    const payload = {
      user_id: userId,
      full_name: formData.fullName,
      email: formData.email,
      phone_number: formData.phoneNumber,
      city: formData.city || null,
      country: formData.country || null,
      summary: formData.summary || null,
      work_experience: formData.workExperience,
      education: formData.education,
      skills: formData.skills,
      linkedin_url: formData.linkedinUrl || null,
      portfolio_url: formData.portfolioUrl || null,
      projects: formData.projects,
      certifications: formData.certifications,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('resume_profiles')
      .upsert(payload, { onConflict: 'user_id' })

    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  if (initLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto w-full min-w-0 px-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    )
  }

  if (showUpgradeModal) {
    return (
      <>
        <div className="max-w-2xl mx-auto w-full min-w-0 opacity-50 pointer-events-none px-4">
          <div className="mb-8"><span>Step {step} of {TOTAL_STEPS}</span></div>
        </div>
        <UpgradeLimitModal
          open={showUpgradeModal}
          variant="resume"
          onClose={() => setShowUpgradeModal(false)}
        />
      </>
    )
  }

  return (
    <div className="max-w-2xl mx-auto w-full min-w-0 px-1 sm:px-0">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Step {step} of {TOTAL_STEPS}</span>
        </div>
        <div className="h-2 bg-[#eaeaf2] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          Profile saved successfully! Redirecting to dashboard...
        </div>
      )}

      {/* Step 1: Personal Info */}
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#1a1a2e]">Personal Info</h2>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => updateField(null, 'fullName', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] ${
                  errors.fullName ? 'border-red-500' : 'border-[#eaeaf2]'
                }`}
                data-error={Boolean(errors.fullName)}
                placeholder="John Doe"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField(null, 'email', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] ${
                  errors.email ? 'border-red-500' : 'border-[#eaeaf2]'
                }`}
                data-error={Boolean(errors.email)}
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => updateField(null, 'phoneNumber', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] ${
                  errors.phoneNumber ? 'border-red-500' : 'border-[#eaeaf2]'
                }`}
                data-error={Boolean(errors.phoneNumber)}
                placeholder="+1 234 567 8900"
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => updateField(null, 'city', e.target.value)}
                className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                placeholder="San Francisco"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => updateField(null, 'country', e.target.value)}
                className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                placeholder="United States"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Professional Summary</label>
              <textarea
                value={formData.summary}
                onChange={(e) => updateField(null, 'summary', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                placeholder="Brief overview of your professional background and goals..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Work Experience */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#1a1a2e]">Work Experience</h2>
          {formData.workExperience.map((job, index) => (
            <div key={index} className="p-4 border border-[#eaeaf2] rounded-lg space-y-4">
              {formData.workExperience.length > 1 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeJob(index)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <input
                  type="text"
                  value={job.jobTitle}
                  onChange={(e) => updateField('workExperience', 'jobTitle', e.target.value, index)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] ${
                    errors.workExperience?.[index]?.jobTitle ? 'border-red-500' : 'border-[#eaeaf2]'
                  }`}
                  data-error={Boolean(errors.workExperience?.[index]?.jobTitle)}
                  placeholder="Software Engineer"
                />
                {errors.workExperience?.[index]?.jobTitle && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.workExperience[index].jobTitle}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={job.companyName}
                  onChange={(e) => updateField('workExperience', 'companyName', e.target.value, index)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] ${
                    errors.workExperience?.[index]?.companyName ? 'border-red-500' : 'border-[#eaeaf2]'
                  }`}
                  data-error={Boolean(errors.workExperience?.[index]?.companyName)}
                  placeholder="Acme Inc"
                />
                {errors.workExperience?.[index]?.companyName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.workExperience[index].companyName}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="text"
                    value={job.startDate}
                    onChange={(e) => updateField('workExperience', 'startDate', e.target.value, index)}
                    className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                    placeholder="Jan 2020"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="text"
                    value={job.endDate}
                    onChange={(e) => updateField('workExperience', 'endDate', e.target.value, index)}
                    className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                    placeholder="Present"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={job.description}
                  onChange={(e) => updateField('workExperience', 'description', e.target.value, index)}
                  rows={4}
                  className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                  placeholder="Describe your responsibilities and achievements..."
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addJob}
            className="w-full py-3 border-2 border-dashed border-[#eaeaf2] rounded-lg text-[#5c5c7a] hover:border-[#6366f1] hover:text-[#6366f1] transition-colors"
          >
            Add Another Job
          </button>
        </div>
      )}

      {/* Step 3: Education */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#1a1a2e]">Education</h2>
          {formData.education.map((edu, index) => (
            <div key={index} className="p-4 border border-[#eaeaf2] rounded-lg space-y-4">
              {formData.education.length > 1 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeEducation(index)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Degree Name</label>
                <input
                  type="text"
                  value={edu.degreeName}
                  onChange={(e) => updateField('education', 'degreeName', e.target.value, index)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] ${
                    errors.education?.[index]?.degreeName ? 'border-red-500' : 'border-[#eaeaf2]'
                  }`}
                  data-error={Boolean(errors.education?.[index]?.degreeName)}
                  placeholder="Bachelor of Science in Computer Science"
                />
                {errors.education?.[index]?.degreeName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.education[index].degreeName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                <input
                  type="text"
                  value={edu.schoolName}
                  onChange={(e) => updateField('education', 'schoolName', e.target.value, index)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] ${
                    errors.education?.[index]?.schoolName ? 'border-red-500' : 'border-[#eaeaf2]'
                  }`}
                  data-error={Boolean(errors.education?.[index]?.schoolName)}
                  placeholder="Stanford University"
                />
                {errors.education?.[index]?.schoolName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.education[index].schoolName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label>
                <input
                  type="text"
                  value={edu.graduationYear}
                  onChange={(e) => updateField('education', 'graduationYear', e.target.value, index)}
                  className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                  placeholder="2020"
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addEducation}
            className="w-full py-3 border-2 border-dashed border-[#eaeaf2] rounded-lg text-[#5c5c7a] hover:border-[#6366f1] hover:text-[#6366f1] transition-colors"
          >
            Add Another Education
          </button>
        </div>
      )}

      {/* Step 4: Skills */}
      {step === 4 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#1a1a2e]">Skills</h2>
          <p className="text-sm text-gray-500">Type a skill and press Enter to add it.</p>
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleSkillKeyDown}
            className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
            placeholder="e.g. JavaScript, React, Python"
          />
          <div className="flex flex-wrap gap-2">
            {formData.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                  aria-label={`Remove ${skill}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          {errors.skills && (
            <p className="mt-2 text-sm text-red-600" data-error="true">
              {errors.skills}
            </p>
          )}
        </div>
      )}

      {/* Step 5: Extra Details */}
      {step === 5 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#1a1a2e]">Extra Details</h2>
          <p className="text-sm text-gray-500">All fields below are optional.</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LinkedIn URL <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={formData.linkedinUrl}
              onChange={(e) => updateField(null, 'linkedinUrl', e.target.value)}
              className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Portfolio URL <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={formData.portfolioUrl}
              onChange={(e) => updateField(null, 'portfolioUrl', e.target.value)}
              className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
              placeholder="https://yourportfolio.com"
            />
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Projects <span className="text-gray-400 font-normal">(optional)</span>
            </h3>
            {formData.projects.map((project, index) => (
              <div key={index} className="p-4 border border-[#eaeaf2] rounded-lg space-y-4 mb-4">
                {formData.projects.length > 1 && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeProject(index)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-[#5c5c7a] mb-1">Project Name</label>
                  <input
                    type="text"
                    value={project.projectName}
                    onChange={(e) => updateField('projects', 'projectName', e.target.value, index)}
                    className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                    placeholder="e.g. E-commerce Dashboard"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5c5c7a] mb-1">Description</label>
                  <textarea
                    value={project.description}
                    onChange={(e) => updateField('projects', 'description', e.target.value, index)}
                    rows={3}
                    className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                    placeholder="Brief description of the project..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5c5c7a] mb-1">URL</label>
                  <input
                    type="url"
                    value={project.url}
                    onChange={(e) => updateField('projects', 'url', e.target.value, index)}
                    className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                    placeholder="https://..."
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addProject}
              className="w-full py-3 border-2 border-dashed border-[#eaeaf2] rounded-lg text-[#5c5c7a] hover:border-[#6366f1] hover:text-[#6366f1] transition-colors"
            >
              Add Another Project
            </button>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Certifications <span className="text-gray-400 font-normal">(optional)</span>
            </h3>
            {formData.certifications.map((cert, index) => (
              <div key={index} className="p-4 border border-[#eaeaf2] rounded-lg space-y-4 mb-4">
                {formData.certifications.length > 1 && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeCertification(index)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-[#5c5c7a] mb-1">Certification Name</label>
                  <input
                    type="text"
                    value={cert.certificationName}
                    onChange={(e) => updateField('certifications', 'certificationName', e.target.value, index)}
                    className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                    placeholder="e.g. AWS Certified Solutions Architect"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5c5c7a] mb-1">Issuer</label>
                  <input
                    type="text"
                    value={cert.issuer}
                    onChange={(e) => updateField('certifications', 'issuer', e.target.value, index)}
                    className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                    placeholder="e.g. Amazon Web Services"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5c5c7a] mb-1">Year</label>
                  <input
                    type="text"
                    value={cert.year}
                    onChange={(e) => updateField('certifications', 'year', e.target.value, index)}
                    className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1]"
                    placeholder="e.g. 2024"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addCertification}
              className="w-full py-3 border-2 border-dashed border-[#eaeaf2] rounded-lg text-[#5c5c7a] hover:border-[#6366f1] hover:text-[#6366f1] transition-colors"
            >
              Add Another Certification
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Review */}
      {step === 6 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#1a1a2e]">Review</h2>
          <div className="space-y-6 text-gray-700">
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Personal Info</h3>
              <div className="bg-white p-4 rounded-lg border border-[#eaeaf2]">
                <p className="font-medium text-[#1a1a2e]">{formData.fullName || '—'}</p>
                <p>{formData.email || '—'}</p>
                <p>{formData.phoneNumber || '—'}</p>
                <p>{[formData.city, formData.country].filter(Boolean).join(', ') || '—'}</p>
                {formData.summary && (
                  <p className="mt-2 text-sm whitespace-pre-wrap">{formData.summary}</p>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Work Experience</h3>
              <div className="space-y-4">
                {formData.workExperience.map((job, i) => (
                  <div key={i} className="bg-white p-4 rounded-lg border border-[#eaeaf2]">
                    <p className="font-medium text-[#1a1a2e]">{job.jobTitle || '—'} at {job.companyName || '—'}</p>
                    <p className="text-sm text-gray-500">{job.startDate || '—'} – {job.endDate || '—'}</p>
                    {job.description && <p className="mt-2 text-sm whitespace-pre-wrap">{job.description}</p>}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Education</h3>
              <div className="space-y-4">
                {formData.education.map((edu, i) => (
                  <div key={i} className="bg-white p-4 rounded-lg border border-[#eaeaf2]">
                    <p className="font-medium text-[#1a1a2e]">{edu.degreeName || '—'}</p>
                    <p>{edu.schoolName || '—'}</p>
                    <p className="text-sm text-gray-500">{edu.graduationYear || '—'}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {formData.skills.length ? (
                  formData.skills.map((skill) => (
                    <span key={skill} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-400">—</p>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Extra Details</h3>
              <div className="bg-white p-4 rounded-lg border border-[#eaeaf2] space-y-2">
                {(formData.linkedinUrl || formData.portfolioUrl) && (
                  <>
                    {formData.linkedinUrl && <p><span className="text-gray-500">LinkedIn:</span> <a href={formData.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{formData.linkedinUrl}</a></p>}
                    {formData.portfolioUrl && <p><span className="text-gray-500">Portfolio:</span> <a href={formData.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{formData.portfolioUrl}</a></p>}
                  </>
                )}
                {formData.projects.some((p) => p.projectName || p.description || p.url) && (
                  <div className="mt-2">
                    <p className="text-gray-500 text-sm font-medium mb-1">Projects:</p>
                    {formData.projects.filter((p) => p.projectName || p.description || p.url).map((p, i) => (
                      <div key={i} className="mb-2">
                        <p className="font-medium text-[#1a1a2e]">{p.projectName || '—'}</p>
                        {p.description && <p className="text-sm">{p.description}</p>}
                        {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">{p.url}</a>}
                      </div>
                    ))}
                  </div>
                )}
                {formData.certifications.some((c) => c.certificationName || c.issuer || c.year) && (
                  <div className="mt-2">
                    <p className="text-gray-500 text-sm font-medium mb-1">Certifications:</p>
                    {formData.certifications.filter((c) => c.certificationName || c.issuer || c.year).map((c, i) => (
                      <div key={i} className="mb-2">
                        <p className="font-medium text-[#1a1a2e]">{c.certificationName || '—'}</p>
                        <p className="text-sm">{(c.issuer || '—')} {c.year && `(${c.year})`}</p>
                      </div>
                    ))}
                  </div>
                )}
                {!formData.linkedinUrl && !formData.portfolioUrl && !formData.projects.some((p) => p.projectName || p.description || p.url) && !formData.certifications.some((c) => c.certificationName || c.issuer || c.year) && (
                  <p className="text-gray-400">—</p>
                )}
              </div>
            </section>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 px-4 btn-gradient ds-btn-glow disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      )}

      {/* Navigation buttons */}
      {!success && (
        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => {
                if (validateStep(step)) setStep((s) => s + 1)
              }}
              className="px-6 py-2 btn-gradient ds-btn-glow text-white font-medium rounded-xl"
            >
              Next
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

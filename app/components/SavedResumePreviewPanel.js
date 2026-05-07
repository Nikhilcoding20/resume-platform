'use client'

function parseJsonArray(value) {
  if (!value) return []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Mini document thumbnail for Interview Prep: 700px-wide resume scaled to ~280px (scale 0.4), clipped in a 280×380 viewport.
 */
export default function SavedResumePreviewPanel({ profile, authUser }) {
  if (!profile) return null

  const workExp = parseJsonArray(profile.work_experience)
  const education = parseJsonArray(profile.education)
  const skills = parseJsonArray(profile.skills)
  const projects = parseJsonArray(profile.projects)
  const certifications = parseJsonArray(profile.certifications)

  const displayName =
    profile.full_name ||
    authUser?.user_metadata?.full_name ||
    authUser?.email ||
    'Your Name'

  return (
    <div className="mt-3 w-full max-w-[min(100%,280px)] mx-auto sm:mx-0">
      <div
        className="h-[380px] w-full overflow-hidden border border-[#e5e7eb] bg-white"
        style={{ borderRadius: 8 }}
      >
        <div
          style={{
            width: 700,
            transform: 'scale(0.4)',
            transformOrigin: 'top left',
          }}
        >
          <div className="w-[700px] border-b border-slate-100 bg-white px-8 py-6">
            <div className="mb-4 text-center">
              <p className="text-2xl font-bold leading-tight text-slate-900">{displayName}</p>
              <p className="mt-2 text-sm leading-snug text-slate-600">
                {[profile.email, profile.phone_number, [profile.city, profile.country].filter(Boolean).join(', ')]
                  .filter(Boolean)
                  .join('  •  ')}
              </p>
            </div>

            <div className="mb-4 h-px bg-slate-200" />

            {profile.summary && (
              <section className="mb-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Summary</h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800">{profile.summary}</p>
              </section>
            )}

            {workExp.length > 0 && (
              <section className="mb-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Experience</h3>
                <div className="space-y-3">
                  {workExp.map((job, i) => (
                    <div key={i} className="text-sm leading-relaxed text-slate-800">
                      <p className="font-semibold text-slate-900">
                        {job.jobTitle || '—'}
                        {job.companyName && (
                          <span className="font-normal text-slate-700"> @ {job.companyName}</span>
                        )}
                      </p>
                      {(job.startDate || job.endDate) && (
                        <p className="mb-1 text-xs text-slate-500">
                          {job.startDate || '—'} – {job.endDate || 'Present'}
                        </p>
                      )}
                      {job.description && (
                        <p className="whitespace-pre-line text-sm text-slate-800">{job.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {education.length > 0 && (
              <section className="mb-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Education</h3>
                <div className="space-y-2">
                  {education.map((edu, i) => (
                    <div key={i} className="text-sm leading-relaxed text-slate-800">
                      <p className="font-semibold text-slate-900">{edu.degreeName || '—'}</p>
                      <p className="text-sm text-slate-700">
                        {edu.schoolName || '—'}
                        {edu.graduationYear && ` • ${edu.graduationYear}`}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {skills.length > 0 && (
              <section className="mb-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Skills</h3>
                <p className="text-sm leading-relaxed text-slate-800">{skills.join(', ')}</p>
              </section>
            )}

            {certifications.length > 0 && (
              <section className="mb-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Certifications</h3>
                <div className="space-y-2">
                  {certifications.map((cert, i) => (
                    <div key={i} className="text-sm leading-relaxed text-slate-800">
                      <p className="font-semibold text-slate-900">{cert.certificationName || '—'}</p>
                      {(cert.issuer || cert.year) && (
                        <p className="text-sm text-slate-700">
                          {cert.issuer || '—'}
                          {cert.year && ` • ${cert.year}`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {projects.length > 0 && (
              <section className="mb-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Projects</h3>
                <div className="space-y-2">
                  {projects.map((project, i) => (
                    <div key={i} className="text-sm leading-relaxed text-slate-800">
                      <p className="font-semibold text-slate-900">{project.projectName || '—'}</p>
                      {project.description && <p className="text-sm text-slate-700">{project.description}</p>}
                      {project.url && <p className="truncate text-xs text-slate-500">{project.url}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

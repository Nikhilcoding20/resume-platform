import { supabase } from '@/lib/supabase'

function deriveJobTitleFromJobDescription(jd) {
  const s = (jd == null ? '' : String(jd)).trim()
  if (!s) return 'Tailored resume'
  const line = s.split(/\r?\n/).find((l) => l.trim()) || ''
  const cleaned = line.trim().replace(/^[-*•\d.)\s]+/i, '').slice(0, 120)
  return cleaned || 'Tailored resume'
}

/**
 * Saves a generated PDF to Storage (if available) and inserts a generated_resumes row.
 * Fails silently on storage errors but still inserts when possible so the resume appears in the list.
 */
export async function persistGeneratedResume({ userId, pdfBlob, templateName, jobDescription }) {
  if (!userId || !pdfBlob) return

  const job_title = deriveJobTitleFromJobDescription(jobDescription)
  const template = (templateName || '').trim() || 'default'
  const rowId = crypto.randomUUID()
  const path = `${userId}/${rowId}.pdf`

  let storage_path = null
  const { error: uploadError } = await supabase.storage
    .from('resume-files')
    .upload(path, pdfBlob, { contentType: 'application/pdf', upsert: false })

  if (!uploadError) {
    storage_path = path
  } else {
    console.warn(
      '[persistGeneratedResume] Storage upload failed (listing still works; download may be unavailable):',
      uploadError.message
    )
  }

  const { error: insertError } = await supabase.from('generated_resumes').insert({
    id: rowId,
    user_id: userId,
    template,
    job_title,
    storage_path,
  })

  if (insertError) {
    if (storage_path) {
      await supabase.storage.from('resume-files').remove([path]).catch(() => {})
    }
    throw insertError
  }
}

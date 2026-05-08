import { randomUUID } from 'crypto'
import { deriveJobTitleFromJobDescription } from '@/lib/deriveJobTitleFromJobDescription'

/**
 * Upload PDF to resume-files and insert generated_resumes.
 * Prefer service role in production; JWT-scoped client also works when the request carries the user's Bearer token.
 * On insert failure after upload, removes the uploaded object. Logs errors; does not throw.
 */
export async function persistGeneratedResumeServer(supabaseService, { userId, pdfBuffer, template, jobDescription }) {
  if (!supabaseService || !userId || !pdfBuffer?.length) {
    return { ok: false }
  }

  const uid = String(userId)
  const tpl = (template || '').trim() || 'ats'
  const job_title = deriveJobTitleFromJobDescription(jobDescription)
  const rowId = randomUUID()
  const path = `${uid}/${rowId}.pdf`

  let storage_path = null
  const { error: uploadError } = await supabaseService.storage
    .from('resume-files')
    .upload(path, pdfBuffer, { contentType: 'application/pdf', upsert: false })

  if (!uploadError) {
    storage_path = path
  } else {
    console.warn('[persistGeneratedResumeServer] storage upload failed:', uploadError.message)
  }

  const { error: insertError } = await supabaseService.from('generated_resumes').insert({
    id: rowId,
    user_id: uid,
    template: tpl,
    job_title,
    storage_path,
  })

  if (insertError) {
    console.error('[persistGeneratedResumeServer] insert failed:', insertError)
    if (storage_path) {
      await supabaseService.storage.from('resume-files').remove([path]).catch(() => {})
    }
    return { ok: false, error: insertError.message }
  }

  return { ok: true, id: rowId }
}

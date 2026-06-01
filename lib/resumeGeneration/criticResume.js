import { CRITIC_PROMPT } from '@/lib/resumeGeneration/prompts'
import { normalizeResumeDocument, parseAiJson } from '@/lib/resumeGeneration/normalizeResumeDocument'
import { bulletHasMetric, selectBestBullets } from '@/lib/resumeGeneration/renderResumeHtml'

function bulletsForRoleIndex(jobIndex) {
  return jobIndex < 2 ? 4 : 3
}

function normalizeBulletKey(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s%$]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function bulletAlreadyPresent(bullet, list) {
  const key = normalizeBulletKey(bullet)
  return (list || []).some((b) => normalizeBulletKey(b) === key)
}

/** Re-instate quantified bullets the critic dropped; prefer metrics over vague bullets. */
export function preserveQuantifiedBullets(original, revised) {
  const out = JSON.parse(JSON.stringify(revised))
  const origExp = original?.experience || []
  const revExp = out.experience || []

  out.experience = revExp.map((job, i) => {
    const origJob =
      origExp.find(
        (o) =>
          o.company?.toLowerCase() === job.company?.toLowerCase() &&
          o.title?.toLowerCase() === job.title?.toLowerCase()
      ) || origExp[i]
    if (!origJob) return job

    let bullets = [...(job.bullets || [])]
    const metricBullets = (origJob.bullets || []).filter(bulletHasMetric)
    const maxCount = bulletsForRoleIndex(i)

    for (const metricBullet of metricBullets) {
      if (bulletAlreadyPresent(metricBullet, bullets)) continue

      if (bullets.length < maxCount) {
        bullets.push(metricBullet)
        continue
      }

      const weakIdx = bullets.findIndex((b) => !bulletHasMetric(b))
      if (weakIdx >= 0) {
        bullets[weakIdx] = metricBullet
      }
    }

    return {
      ...job,
      bullets: selectBestBullets(bullets, maxCount, 3),
    }
  })

  return out
}

/**
 * Second-pass AI critic: fixes bullets, summary, tense, metrics before render.
 */
export async function runResumeCritic(anthropic, document, profile) {
  const userMessage = `Resume JSON to review and fix:\n${JSON.stringify(document, null, 2)}\n\nJob description (for context only — do not invent experience):\n${profile?._jobDescription || '(not provided)'}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: `${CRITIC_PROMPT}\n\n${userMessage}` }],
  })

  const textBlocks = (message.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
  const rawText = textBlocks.join('').trim()

  if (!rawText) {
    console.warn('[generate-resume] critic returned empty; using pre-critic document')
    return document
  }

  let parsed
  try {
    parsed = parseAiJson(rawText)
  } catch (e) {
    console.warn('[generate-resume] critic JSON parse failed; using pre-critic document', e)
    return document
  }

  const { document: fixed } = normalizeResumeDocument(parsed, profile)
  return preserveQuantifiedBullets(document, fixed)
}

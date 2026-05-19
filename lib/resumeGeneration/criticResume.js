import { CRITIC_PROMPT } from '@/lib/resumeGeneration/prompts'
import { normalizeResumeDocument, parseAiJson } from '@/lib/resumeGeneration/normalizeResumeDocument'

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
  return fixed
}

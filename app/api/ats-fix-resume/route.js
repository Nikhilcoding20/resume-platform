import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { launchChromiumForPdf } from '@/lib/launchChromiumForPdf'

const PROMPT = `You are a professional resume writer and ATS expert. Rewrite this resume applying ALL of the ATS suggestions and improvements provided. Optimize it for the job description. Rules: Keep all factual content. Add missing keywords naturally. Improve bullet points with strong action verbs and metrics. Never invent experience. Return the improved resume as clean HTML. Use: h1 for the name, h2 for section headers (SUMMARY, EXPERIENCE, SKILLS, etc.), p for paragraphs, ul/li for bullet points. Use inline styles for a professional ATS-friendly black and white layout (font-family: Arial, color: #000, no colors). Return ONLY the HTML — no explanation, no markdown, no backticks.`

function jsonError(message, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { resumeText, atsAnalysis, jobDescription } = body

    if (!resumeText || typeof resumeText !== 'string') {
      return jsonError('Resume text is required.', 400)
    }
    if (!atsAnalysis || typeof atsAnalysis !== 'object') {
      return jsonError('ATS analysis is required.', 400)
    }
    if (!jobDescription || typeof jobDescription !== 'string') {
      return jsonError('Job description is required.', 400)
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return jsonError('Server configuration error: Anthropic API key is not set.', 500)
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const suggestionsContext = JSON.stringify(atsAnalysis, null, 2)
    const userMessage = `Original resume:\n\n${resumeText}\n\n---\n\nJob description:\n\n${jobDescription}\n\n---\n\nATS analysis and suggestions to apply:\n\n${suggestionsContext}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8192,
      messages: [{ role: 'user', content: `${PROMPT}\n\n${userMessage}` }],
    })

    const textBlocks = (message.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
    const rawText = textBlocks.join('').trim()

    if (!rawText) {
      return jsonError('AI returned no data.', 500)
    }

    let html = rawText.replace(/^```(?:html)?\s*|\s*```$/g, '').trim()
    if (!html.toLowerCase().includes('<html')) {
      html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: Arial, sans-serif; font-size: 11pt; color: #000; padding: 40px; max-width: 8.5in; margin: 0 auto;">${html}</body></html>`
    }

    const browser = await launchChromiumForPdf()

    try {
      const page = await browser.newPage()
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 10000,
      })

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0.4in', right: '0.4in', bottom: '0.4in', left: '0.4in' },
        scale: 0.92,
      })

      await browser.close()

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="improved-resume.pdf"',
        },
      })
    } catch (pdfErr) {
      await browser.close()
      throw pdfErr
    }
  } catch (err) {
    console.error('[ats-fix-resume] Error:', err)
    return jsonError(err.message || 'Failed to generate improved resume.', 500)
  }
}

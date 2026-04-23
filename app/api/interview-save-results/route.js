import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isPro } from '@/lib/subscription'

function jsonError(message, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonError('Server configuration error: Supabase not initialized', 500)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: request.headers.get('Authorization') || '' } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return jsonError('Authentication required. Please log in again.', 401)
    }

    if (!(await isPro(supabase, user.id))) {
      return jsonError('AI Interview Coach is available on Pro plans only.', 403)
    }

    const body = await request.json()
    const { sessionId, answers, scores } = body

    if (!sessionId) return jsonError('sessionId is required.', 400)
    if (!Array.isArray(answers)) return jsonError('answers must be an array.', 400)
    if (!scores || typeof scores !== 'object') return jsonError('scores must be an object.', 400)

    const updatePayload = {
      answers,
      scores,
    }

    console.log('[interview-save-results] Updating session:', sessionId, 'user:', user.id, 'answersCount:', answers.length, 'scores:', JSON.stringify(scores).slice(0, 200))

    const { data, error: updateErr } = await supabase
      .from('interview_sessions')
      .update(updatePayload)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select('id')
      .single()

    if (updateErr) {
      console.error('[interview-save-results] Supabase update error:', {
        message: updateErr.message,
        code: updateErr.code,
        details: updateErr.details,
        hint: updateErr.hint,
      })
      return jsonError(`Failed to save results: ${updateErr.message}`, 500)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[interview-save-results] Error:', err)
    return jsonError(err.message || 'Failed to save results', 500)
  }
}

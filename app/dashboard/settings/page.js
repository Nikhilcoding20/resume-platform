'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [fullName, setFullName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nameLoading, setNameLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [nameMessage, setNameMessage] = useState(null)
  const [passwordMessage, setPasswordMessage] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setFullName(user?.user_metadata?.full_name || '')
    })
  }, [])

  const handleUpdateName = async (e) => {
    e.preventDefault()
    if (!user) return
    setNameLoading(true)
    setNameMessage(null)
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() || null } })
      if (error) throw error
      setNameMessage({ type: 'success', text: 'Name updated successfully.' })
    } catch (err) {
      setNameMessage({ type: 'error', text: err?.message || 'Failed to update name.' })
    } finally {
      setNameLoading(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (!user) return
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }
    setPasswordLoading(true)
    setPasswordMessage(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordMessage({ type: 'success', text: 'Password updated successfully.' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err?.message || 'Failed to update password.' })
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/')
    router.refresh()
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-[#5c5c7a]">Loading...</p>
      </div>
    )
  }

  const input = 'w-full px-4 py-2.5 border border-[#eaeaf2] rounded-xl text-[#1a1a2e] focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none transition-all'
  const card = 'ds-card ds-card-interactive p-6 relative overflow-hidden'

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6 text-[#1a1a2e]">
        Account <span className="bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">settings</span>
      </h1>
      <div className="space-y-6 max-w-xl">
        <div className={card}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4]" />
          <h2 className="text-sm font-semibold text-[#1a1a2e] mb-1 mt-1">Email</h2>
          <p className="text-[#5c5c7a]">{user.email || '—'}</p>
        </div>
        <div className={card}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#06b6d4]" />
          <h2 className="text-sm font-semibold text-[#1a1a2e] mb-3 mt-1">Display name</h2>
          <form onSubmit={handleUpdateName} className="space-y-3">
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" className={input} />
            {nameMessage && <p className={`text-sm ${nameMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{nameMessage.text}</p>}
            <button type="submit" disabled={nameLoading} className="px-4 py-2 btn-gradient ds-btn-glow rounded-xl font-semibold text-white text-sm disabled:opacity-50 transition-all">
              {nameLoading ? 'Updating…' : 'Update name'}
            </button>
          </form>
        </div>
        <div className={card}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#06b6d4] via-[#6366f1] to-[#8b5cf6]" />
          <h2 className="text-sm font-semibold text-[#1a1a2e] mb-3 mt-1">Change password</h2>
          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" minLength={6} className={input} />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" minLength={6} className={input} />
            {passwordMessage && <p className={`text-sm ${passwordMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{passwordMessage.text}</p>}
            <button type="submit" disabled={passwordLoading} className="px-4 py-2 btn-gradient ds-btn-glow rounded-xl font-semibold text-white text-sm disabled:opacity-50 transition-all">
              {passwordLoading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
        <div className="rounded-2xl border border-red-100/80 bg-red-50/40 p-6 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.06)]">
          <h2 className="text-sm font-semibold text-[#1a1a2e] mb-3">Sign out</h2>
          <button type="button" onClick={handleLogout} className="px-4 py-2 border border-red-200 bg-white text-red-700 font-medium rounded-xl hover:bg-red-50 transition-colors">
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}

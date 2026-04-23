'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STORAGE_KEY = 'selected-template'

const TEMPLATES = [
  { id: 'ats', name: 'ATS Optimized', description: 'Black and white, passes ATS scanners.', mockup: (
    <div className="w-full h-32 bg-white border border-[#eaeaf2] rounded-lg overflow-hidden flex flex-col">
      <div className="h-4 bg-black mx-2 mt-2 rounded-sm" />
      <div className="h-1 bg-slate-200 mx-2 mt-2" />
      <div className="h-2 bg-slate-300 mx-2 mt-1 w-3/4 rounded" />
    </div>
  )},
  { id: 'modern', name: 'Modern', description: 'Sidebar layout, professional.', mockup: (
    <div className="w-full h-32 bg-white border border-[#eaeaf2] rounded-lg overflow-hidden flex">
      <div className="w-12 bg-gradient-to-b from-[#6366f1] to-[#06b6d4] shrink-0" />
      <div className="flex-1 p-2 space-y-2"><div className="h-2 bg-slate-200 rounded w-full" /><div className="h-2 bg-slate-100 rounded w-4/5" /></div>
    </div>
  )},
  { id: 'minimal', name: 'Minimal', description: 'Clean white space.', mockup: (
    <div className="w-full h-32 bg-white border border-[#eaeaf2] rounded-lg p-2 space-y-2">
      <div className="h-3 bg-slate-200 rounded w-2/3" /><div className="h-px bg-slate-200" /><div className="h-2 bg-slate-100 rounded w-full" />
    </div>
  )},
  { id: 'creative', name: 'Creative', description: 'Header accent, two columns.', mockup: (
    <div className="w-full h-32 bg-white border border-[#eaeaf2] rounded-lg overflow-hidden flex flex-col">
      <div className="h-8 bg-gradient-to-r from-[#6366f1] to-[#a855f7]" />
      <div className="flex-1 flex gap-1 p-1"><div className="flex-1 border-l-2 border-[#6366f1] pl-1"><div className="h-2 bg-slate-200 rounded mt-1" /></div><div className="flex-1 border-l-2 border-[#06b6d4] pl-1"><div className="h-2 bg-slate-200 rounded mt-1" /></div></div>
    </div>
  )},
]

export default function ChooseTemplatePage() {
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent mb-2">Choose a template</h1>
      <p className="text-[#5c5c7a] mb-8">Select a resume template for your AI-generated resume.</p>
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedTemplate(t.id)}
            className={`text-left p-6 rounded-xl border-2 bg-white transition-all duration-300 hover:shadow-lg hover:shadow-indigo-100/80 ${
              selectedTemplate === t.id
                ? 'border-[#6366f1] shadow-lg shadow-indigo-100 ring-2 ring-[#6366f1]/20'
                : 'border-[#eaeaf2] hover:border-[#6366f1]/40'
            } relative overflow-hidden`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#06b6d4] opacity-80" />
            <div className="mb-4 mt-2">{t.mockup}</div>
            <h2 className="text-lg font-semibold text-[#1a1a2e]">{t.name}</h2>
            <p className="text-sm text-[#5c5c7a]">{t.description}</p>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => { if (selectedTemplate) { localStorage.setItem(STORAGE_KEY, selectedTemplate); router.push('/dashboard/generating') } }}
        disabled={!selectedTemplate}
        className="px-8 py-3 btn-gradient ds-btn-glow rounded-xl font-semibold text-white disabled:opacity-40 shadow-md hover:shadow-lg transition-all"
      >
        Continue
      </button>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, Link } from 'next/navigation'
import { ChevronLeft, Info } from 'lucide-react'

interface Project {
  id: string
  name: string
  industry: string
  created_at: string
}

export default function ProjectWorkspace() {
  const { projectId } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (projectId) fetchProject()
  }, [projectId])

  const fetchProject = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (data) setProject(data)
    setLoading(false)
  }

  if (loading) return <div className="p-8">Loading workspace...</div>
  if (!project) return <div className="p-8 text-red-600 text-center">Project not found or access denied.</div>

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <a href="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronLeft size={20} />
        </a>
        <h1 className="text-xl font-bold text-slate-900">{project.name} Workspace</h1>
      </nav>

      <main className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <div className="flex items-start gap-4 mb-8">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Info size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Project Details</h2>
              <p className="text-slate-500 mt-1">Basic information about this operational model.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 py-6 border-y border-slate-100">
            <div>
              <span className="block text-sm font-medium text-slate-500 mb-1">Project Name</span>
              <span className="text-lg text-slate-900 font-medium">{project.name}</span>
            </div>
            <div>
              <span className="block text-sm font-medium text-slate-500 mb-1">Industry</span>
              <span className="text-lg text-slate-900 font-medium">{project.industry}</span>
            </div>
            <div>
              <span className="block text-sm font-medium text-slate-500 mb-1">Created At</span>
              <span className="text-slate-900">{new Date(project.created_at).toLocaleString()}</span>
            </div>
            <div>
              <span className="block text-sm font-medium text-slate-500 mb-1">Project ID</span>
              <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 break-all">{project.id}</code>
            </div>
          </div>

          <div className="mt-12 text-center p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-slate-500">Wait for Phase 1: Intake Engine to proceed with operational model building.</p>
          </div>
        </div>
      </main>
    </div>
  )
}

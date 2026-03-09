'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Layout, LogOut } from 'lucide-react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  industry: string
  created_at: string
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', industry: '' })
  const supabase = createClient()

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setProjects(data)
    setLoading(false)
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('projects')
      .insert([
        { name: newProject.name, industry: newProject.industry, user_id: user.id }
      ])
      .select()

    if (data) {
      setProjects([data[0], ...projects])
      setShowModal(false)
      setNewProject({ name: '', industry: '' })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-900">Operations Architect</h1>
        <div className="flex items-center gap-4">
          <button onClick={handleLogout} className="text-slate-600 hover:text-slate-900 flex items-center gap-2">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold text-slate-800">Your Projects</h2>
          <button
            onClick={() => setShowModal(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-slate-800 transition-colors"
          >
            <Plus size={20} />
            New Project
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
            <Layout size={40} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No projects yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 font-semibold text-slate-700">Project Name</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Industry</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Created</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-800 font-medium">{project.name}</td>
                    <td className="px-6 py-4 text-slate-600">{project.industry}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(project.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/project/${project.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Open Workspace
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
            <h3 className="text-xl font-bold mb-6">Create New Project</h3>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                <input
                  required
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
                <input
                  required
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                  value={newProject.industry}
                  onChange={(e) => setNewProject({ ...newProject, industry: e.target.value })}
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

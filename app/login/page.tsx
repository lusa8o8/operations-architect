'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm border border-slate-200 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Operations Architect</h1>
        <p className="text-slate-600 mb-8">Build operational systems.</p>
        
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-300 rounded-md shadow-sm text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'student' | 'landlord'>('student')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function signUp() {
    setLoading(true)
    setMsg('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: role } }
    })

    if (error) {
      setMsg(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          role: role,
          email: email
        })

      if (profileError) {
        setMsg('Error creating profile')
        setLoading(false)
        return
      }

      if (role === 'student') {
        router.push('/browse')
      } else {
        router.push('/dashboard')
      }
    }
    setLoading(false)
  }

  async function logIn() {
    setLoading(true)
    setMsg('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setMsg(error.message)
        setLoading(false)
        return
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        const dbRole = profile?.role || 'student'

      // 1. Handle Admin Accounts (Must select 'Landlord' to access dashboard)
      if (dbRole === 'admin') {
        if (role !== 'landlord') {
          setMsg('⚠️ This is an Admin account. Please select the "Landlord" button to log in.')
          setLoading(false)
          return
        }
        // Admin selected Landlord, redirect to admin panel
        window.location.href = '/admin'
        return
      }

      // 2. Handle Agent Accounts (Must select 'Landlord' to access agent portal)
      if (dbRole === 'agent') {
        if (role !== 'landlord') {
          setMsg('⚠️ This is an Agent account. Please select the "Landlord" button to log in.')
          setLoading(false)
          return
        }
        // Agent selected Landlord, redirect to agent portal
        window.location.href = '/agent'
        return
      }

      // 3. Strict check for normal users (student/landlord)
      if (dbRole !== role) {
        setMsg(`⚠️ This account is registered as a ${dbRole}. Please select the ${dbRole} button to log in.`)
        setLoading(false)
        return
      }

      // 4. Redirect normal users
      if (dbRole === 'student') {
        window.location.href = '/browse'
      } else {
        window.location.href = '/dashboard'
      }
        
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: 20
    }}>
      <div style={{
        background: 'white',
        padding: '50px 40px',
        borderRadius: 24,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: 450
      }}>
        {/* Vesta Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ 
            fontSize: 48, 
            fontWeight: 900,
            background: 'linear-gradient(135deg, #D4873A 0%, #B56B2E 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 8,
            letterSpacing: '-2px'
          }}>
            Vesta
          </div>
          <p style={{ color: '#6B5B4E', fontSize: 14, margin: 0 }}>Student Accommodation Platform</p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px',
              marginBottom: 16,
              border: '2px solid #DDD0C4',
              borderRadius: 12,
              fontSize: 15,
              boxSizing: 'border-box',
              transition: 'border-color 0.3s'
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px',
              border: '2px solid #DDD0C4',
              borderRadius: 12,
              fontSize: 15,
              boxSizing: 'border-box',
              transition: 'border-color 0.3s'
            }}
          />
        </div>

        {msg && (
          <div style={{
            padding: '12px 16px',
            background: '#FFF3CD',
            color: '#856404',
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span>⚠️</span>
            {msg}
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <p style={{ 
            fontSize: 13, 
            fontWeight: 600, 
            color: '#1C1209',
            marginBottom: 12
          }}>
            I am a:
          </p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setRole('student')}
              style={{
                flex: 1,
                padding: '10px',
                background: role === 'student' ? '#D4873A' : 'white',
                color: role === 'student' ? 'white' : '#1C1209',
                border: '1px solid #DDD0C4',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13
              }}
            >
              🎓 Student
            </button>
            <button
              type="button"
              onClick={() => setRole('landlord')}
              style={{
                flex: 1,
                padding: '10px',
                background: role === 'landlord' ? '#D4873A' : 'white',
                color: role === 'landlord' ? 'white' : '#1C1209',
                border: '1px solid #DDD0C4',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13
              }}
            >
              🏠 Landlord
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#999', margin: 0, textAlign: 'center' }}>
            Admin & Agent accounts use the Landlord button
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button
            onClick={logIn}
            disabled={loading}
            style={{
              flex: 1,
              padding: '14px',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #D4873A 0%, #B56B2E 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: 15,
              boxShadow: '0 4px 12px rgba(212, 135, 58, 0.3)'
            }}
          >
            {loading ? 'Please wait...' : 'Log In'}
          </button>
          <button
            onClick={signUp}
            disabled={loading}
            style={{
              flex: 1,
              padding: '14px',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #1C1209 0%, #3D2416 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: 15,
              boxShadow: '0 4px 12px rgba(28, 18, 9, 0.3)'
            }}
          >
            Sign Up
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <p style={{ color: '#8B735F', fontSize: 13, marginBottom: 12 }}>
            Just browsing?
          </p>
          <button
            onClick={() => router.push('/browse')}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              color: '#D4873A',
              border: '2px solid #D4873A',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14
            }}
          >
            Browse Student Housing →
          </button>
        </div>
      </div>
    </div>
  )
}

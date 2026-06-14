'use client'
import { createClient } from '@supabase/supabase-js'
import { useState } from 'react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false) // New state for password visibility
  const [role, setRole] = useState<'student' | 'landlord'>('student')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

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
          name: email.split('@')[0], 
          role: role
        })
      
      if (profileError) {
        setMsg('Account created but profile failed: ' + profileError.message)
        setLoading(false)
        return
      }

      if (role === 'student') {
        window.location.href = '/browse'
      } else {
        window.location.href = '/dashboard'
      }
    }
  }

  async function logIn() {
    setLoading(true)
    setMsg('')
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
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

      if (profile?.role === 'student') {
        window.location.href = '/browse'
      } else {
        window.location.href = '/dashboard'
      }
    }
    setLoading(false)
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
        maxWidth: 450,
        width: '100%'
      }}>
        {/* LOGO */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: 30,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <img 
            src="/logo.png" 
            alt="Vesta" 
            style={{ 
              height: '100px', 
              width: 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
              marginBottom: '8px'
            }} 
          />
          <p style={{ 
            color: '#6B5B4E', 
            margin: 0, 
            fontSize: 13,
            letterSpacing: '0.5px'
          }}>
            Student Accommodation Platform
          </p>
        </div>
        
        {/* Email Input */}
        <input
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '12px 14px', 
            marginBottom: 12, 
            boxSizing: 'border-box', 
            border: '1px solid #DDD0C4', 
            borderRadius: 8, 
            fontSize: 16,
            color: '#000000',
            background: '#FFFFFF',
            outline: 'none'
          }}
        />
        
        {/* Password Input with Show/Hide Toggle */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px 40px 12px 14px', /* Extra padding on the right for the button */
              boxSizing: 'border-box', 
              border: '1px solid #DDD0C4', 
              borderRadius: 8, 
              fontSize: 16,
              color: '#000000',
              background: '#FFFFFF',
              outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              color: '#6B5B4E',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        {/* Role Selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#1C1209', fontSize: 13 }}>I am a:</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              type="button"
              onClick={() => setRole('student')}
              style={{ 
                flex: 1, padding: '10px', 
                background: role === 'student' ? '#D4873A' : 'white', 
                color: role === 'student' ? 'white' : '#1C1209',
                border: '1px solid #DDD0C4', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 
              }}
            >
              🎓 Student
            </button>
            <button 
              type="button"
              onClick={() => setRole('landlord')}
              style={{ 
                flex: 1, padding: '10px', 
                background: role === 'landlord' ? '#D4873A' : 'white', 
                color: role === 'landlord' ? 'white' : '#1C1209',
                border: '1px solid #DDD0C4', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 
              }}
            >
              🏠 Landlord
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#6B5B4E', marginTop: 6, textAlign: 'center' }}>
            Current selection: <strong>{role.toUpperCase()}</strong>
          </p>
        </div>
        
        {/* Login and Signup Buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button 
            onClick={logIn} 
            disabled={loading}
            style={{ flex: 1, padding: '12px', background: '#D4873A', color: 'white', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Processing...' : 'Log In'}
          </button>
          <button 
            onClick={signUp} 
            disabled={loading}
            style={{ flex: 1, padding: '12px', background: '#333', color: 'white', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Processing...' : 'Sign Up'}
          </button>
        </div>

        {/* Error/Success Message */}
        {msg && (
          <div style={{ padding: 12, background: '#F8D7DA', color: '#721C24', borderRadius: 8, fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
            {msg}
          </div>
        )}

        {/* Browse Link */}
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ color: '#6B5B4E', fontSize: 13, marginBottom: 8 }}>Just browsing?</p>
          <button 
            onClick={() => window.location.href = '/browse'}
            style={{ padding: '10px 24px', background: 'transparent', color: '#D4873A', border: '2px solid #D4873A', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >
            Browse Student Housing →
          </button>
        </div>
      </div>
    </div>
  )
}
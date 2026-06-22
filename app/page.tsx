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
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<'student' | 'landlord'>('student')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

    // FEATURE 2: Prevent Duplicate Signups
  async function signUp() {
    setLoading(true)
    setMsg('')
    
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: { role: role } }
    })
    
    if (error) {
      // Check for duplicate email error
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        setMsg('⚠️ An account with this email already exists. Please log in instead.')
      } else {
        setMsg(error.message)
      }
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
    setLoading(false)
  }

  // FEATURE 1: 3-Strike Lockout
  async function logIn() {
    setLoading(true)
    setMsg('')
    
    // Check if user is locked out
    const failedAttempts = parseInt(localStorage.getItem(`failed_attempts_${email}`) || '0')
    
    if (failedAttempts >= 3) {
      const lockoutTime = parseInt(localStorage.getItem(`lockout_time_${email}`) || '0')
      const now = Date.now()
      // 15 minute lockout
      if (now - lockoutTime < 15 * 60 * 1000) { 
        const minutesLeft = Math.ceil((15 * 60 * 1000 - (now - lockoutTime)) / 60000)
        setMsg(`🔒 Too many failed attempts. Please try again in ${minutesLeft} minutes.`)
        setLoading(false)
        return
      } else {
        // Reset counter after 15 minutes
        localStorage.removeItem(`failed_attempts_${email}`)
        localStorage.removeItem(`lockout_time_${email}`)
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      // Increment failed attempts
      const newAttempts = failedAttempts + 1
      localStorage.setItem(`failed_attempts_${email}`, newAttempts.toString())
      
      if (newAttempts >= 3) {
        localStorage.setItem(`lockout_time_${email}`, Date.now().toString())
        setMsg('🔒 Account temporarily locked due to too many failed attempts. Try again in 15 minutes.')
      } else {
        setMsg(`⚠️ Invalid credentials. ${3 - newAttempts} attempts remaining.`)
      }
      setLoading(false)
      return
    }

    if (data.user) {
      // Reset failed attempts on successful login
      localStorage.removeItem(`failed_attempts_${email}`)
      localStorage.removeItem(`lockout_time_${email}`)

     const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('role, is_locked')
  .eq('id', data.user.id)
  .single()

// DEBUG: Log what we're getting
console.log('Profile query result:', profile)
console.log('Profile error:', profileError)
console.log('User ID:', data.user.id)

if (profileError) {
  console.error('Error fetching profile:', profileError)
}

if (profile?.is_locked) {
  setMsg('🔒 Your account has been locked by an administrator. Please contact support.')
  await supabase.auth.signOut()
  setLoading(false)
  return
}

const dbRole = profile?.role || 'student'
console.log('Detected role:', dbRole)

      if (dbRole === 'admin' && role !== 'landlord') {
        setMsg('⚠️ This is an Admin account. Please select the "Landlord" button to log in.')
        setLoading(false)
        return
      }
      if (dbRole === 'agent' && role !== 'landlord') {
        setMsg('⚠️ This is an Agent account. Please select the "Landlord" button to log in.')
        setLoading(false)
        return
      }
      if (dbRole !== role && dbRole !== 'admin' && dbRole !== 'agent') {
        setMsg(`⚠️ This account is registered as a ${dbRole}. Please select the ${dbRole} button to log in.`)
        setLoading(false)
        return
      }

      if (dbRole === 'student') {
        window.location.href = '/browse'
      } else if (dbRole === 'admin') {
        window.location.href = '/admin'
      } else if (dbRole === 'agent') {
        window.location.href = '/agent'
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
          <p style={{ color: '#6B5B4E', margin: 0, fontSize: 13, letterSpacing: '0.5px' }}>
            Student Accommodation Platform
          </p>
        </div>
        
        {/* Email Input */}
        <input
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ 
            width: '100%', padding: '12px 14px', marginBottom: 12, boxSizing: 'border-box', 
            border: '1px solid #DDD0C4', borderRadius: 8, fontSize: 16,
            color: '#000000', background: '#FFFFFF', outline: 'none'
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
              width: '100%', padding: '12px 45px 12px 14px', boxSizing: 'border-box', 
              border: '1px solid #DDD0C4', borderRadius: 8, fontSize: 16,
              color: '#000000', background: '#FFFFFF', outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: '20px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
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

        {/* Error Message */}
        {msg && (
          <div style={{ padding: 12, background: '#F8D7DA', color: '#721C24', borderRadius: 8, fontSize: 13, textAlign: 'center', marginBottom: 16, border: '1px solid #F5C6CB' }}>
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

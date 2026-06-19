'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function AgentSettings() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [name, setName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const router = useRouter()

  useEffect(() => { checkAgent() }, [])

  async function checkAgent() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'agent') {
      alert('Access denied.')
      await supabase.auth.signOut()
      router.push('/')
      return
    }

    setUser(user)
    setProfile(profile)
    setName(profile.name || '')
  }

  async function updateProfile() {
    setLoading(true)
    setMsg('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: name })
        .eq('id', user.id)

      if (error) throw error

      alert('✅ Profile updated successfully!')
      if (profile) setProfile({ ...profile, name })
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function updatePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all password fields')
      return
    }

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match!')
      return
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setMsg('')

    try {
      // First verify current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      })

      if (signInError) {
        alert('Current password is incorrect')
        return
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      alert('✅ Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!user || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <nav style={{ 
        background: 'white', 
        padding: '16px 60px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        boxShadow: '0 2px 20px rgba(0,0,0,0.05)' 
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: '#1C1209' }}>Agent Settings</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6B5B4E' }}>
            Manage your profile and password
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => router.push('/agent')}
            style={{ padding: '10px 20px', background: '#2196F3', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            ← Back to Portal
          </button>
          <button 
            onClick={handleSignOut}
            style={{ padding: '10px 20px', background: '#F44336', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{ padding: '40px 60px', maxWidth: 800, margin: '0 auto' }}>
        {/* Profile Section */}
        <div style={{ 
          background: 'white', 
          padding: 32, 
          borderRadius: 12, 
          marginBottom: 24,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)' 
        }}>
          <h2 style={{ margin: '0 0 24px 0', color: '#1C1209', fontSize: 20 }}>Profile Information</h2>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#1C1209', fontSize: 13 }}>
              Email Address
            </label>
            <input
              type="email"
              value={user.email || ''}
              disabled
              style={{ 
                width: '100%', 
                padding: '12px 14px', 
                border: '2px solid #DDD0C4', 
                borderRadius: 8, 
                fontSize: 14,
                background: '#f5f5f5',
                color: '#666'
              }}
            />
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#999' }}>Email cannot be changed</p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#1C1209', fontSize: 13 }}>
              Full Name
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px 14px', 
                border: '2px solid #DDD0C4', 
                borderRadius: 8, 
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button 
            onClick={updateProfile}
            disabled={loading || !name}
            style={{ 
              padding: '12px 24px', 
              background: loading || !name ? '#ccc' : '#007BFF', 
              color: 'white', 
              border: 'none', 
              borderRadius: 8, 
              cursor: loading || !name ? 'not-allowed' : 'pointer',
              fontWeight: 600
            }}
          >
            {loading ? 'Saving...' : 'Update Profile'}
          </button>
        </div>

        {/* Password Section */}
        <div style={{ 
          background: 'white', 
          padding: 32, 
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)' 
        }}>
          <h2 style={{ margin: '0 0 24px 0', color: '#1C1209', fontSize: 20 }}>Change Password</h2>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#1C1209', fontSize: 13 }}>
              Current Password
            </label>
            <input
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px 14px', 
                border: '2px solid #DDD0C4', 
                borderRadius: 8, 
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#1C1209', fontSize: 13 }}>
              New Password
            </label>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px 14px', 
                border: '2px solid #DDD0C4', 
                borderRadius: 8, 
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#1C1209', fontSize: 13 }}>
              Confirm New Password
            </label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px 14px', 
                border: '2px solid #DDD0C4', 
                borderRadius: 8, 
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button 
            onClick={updatePassword}
            disabled={loading}
            style={{ 
              padding: '12px 24px', 
              background: loading ? '#ccc' : '#4CAF50', 
              color: 'white', 
              border: 'none', 
              borderRadius: 8, 
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600
            }}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  )
}

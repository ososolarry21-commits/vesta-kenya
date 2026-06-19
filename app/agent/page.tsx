'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function AgentPortal() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => { checkAgent() }, [])

  async function checkAgent() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'agent') {
      alert('Access denied. Agent portal is for agents only.')
      await supabase.auth.signOut()
      router.push('/')
      return
    }

    setUser(user)
    setProfile(profile)
    await fetchAssignments(user.id)
    setLoading(false)
  }

  async function fetchAssignments(agentId: string) {
    const { data } = await supabase
      .from('verification_assignments')
      .select(`
        *,
        listings (
          name,
          area,
          city,
          price,
          type
        )
      `)
      .eq('agent_id', agentId)
      .in('status', ['pending', 'completed'])
      .order('assigned_at', { ascending: false })

    if (data) setAssignments(data)
  }

  async function handleUpload(assignmentId: string, listingId: string, file: File) {
    setUploadingId(assignmentId)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `agent-proof-${listingId}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('verification-proofs')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('verification-proofs').getPublicUrl(fileName)

      await supabase
        .from('verification_assignments')
        .update({
          proof_url: data.publicUrl,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', assignmentId)

      await supabase
        .from('listings')
        .update({ verification_payment_received: true })
        .eq('id', listingId)

      alert('✅ Proof uploaded successfully! Admin will review.')
      if (user) await fetchAssignments(user.id)
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setUploadingId(null)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
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
          <h1 style={{ margin: 0, fontSize: 24, color: '#1C1209' }}>Agent Portal</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6B5B4E' }}>
            Welcome, {profile?.name || user?.email}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => router.push('/agent/settings')}
            style={{ padding: '10px 20px', background: '#6C757D', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            ⚙️ Settings
          </button>
          <button 
            onClick={handleSignOut}
            style={{ padding: '10px 20px', background: '#F44336', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{ padding: '40px 60px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 30 }}>
          <h2 style={{ color: '#1C1209', marginBottom: 8 }}>Your Assigned Verifications</h2>
          <p style={{ color: '#6B5B4E', margin: 0 }}>
            Visit each property, take photos, and upload proof of verification.
          </p>
        </div>

        {assignments.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 60, 
            background: 'white', 
            borderRadius: 12,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <p style={{ color: '#6B5B4E' }}>No pending verifications assigned to you.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>
            {assignments.map((assignment) => (
              <div key={assignment.id} style={{
                background: 'white',
                padding: 24,
                borderRadius: 12,
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                opacity: assignment.status === 'completed' ? 0.7 : 1
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 300 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <h3 style={{ margin: 0, color: '#1C1209' }}>
                        {assignment.listings?.name}
                      </h3>
                      {assignment.status === 'completed' && (
                        <span style={{ background: '#4CAF50', color: 'white', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                          ✓ COMPLETED
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '4px 0', color: '#6B5B4E', fontSize: 14 }}>
                      📍 {assignment.listings?.area}, {assignment.listings?.city}
                    </p>
                    <p style={{ margin: '4px 0', color: '#6B5B4E', fontSize: 14 }}>
                      🏠 {assignment.listings?.type} • KSh {assignment.listings?.price?.toLocaleString()}/mo
                    </p>
                    <p style={{ margin: '12px 0 0 0', fontSize: 12, color: '#999' }}>
                      Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                    </p>
                    
                    {assignment.status === 'completed' && assignment.proof_url && (
                      <div style={{ marginTop: 16, padding: 12, background: '#E8F5E9', borderRadius: 8 }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: 12, color: '#2E7D32', fontWeight: 600 }}>
                          ✓ Proof uploaded successfully
                        </p>
                        <img 
                          src={assignment.proof_url} 
                          alt="Verification proof" 
                          style={{ maxWidth: '200px', borderRadius: 6, border: '2px solid #4CAF50' }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    {assignment.status === 'pending' ? (
                      <label style={{ 
                        display: 'inline-block',
                        padding: '10px 20px', 
                        background: uploadingId === assignment.id ? '#999' : '#007BFF', 
                        color: 'white', 
                        borderRadius: 8, 
                        cursor: uploadingId === assignment.id ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        fontSize: 14
                      }}>
                        {uploadingId === assignment.id ? 'Uploading...' : '📸 Upload Proof'}
                        <input 
                          type="file" 
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleUpload(assignment.id, assignment.listing_id, file)
                          }}
                          disabled={uploadingId === assignment.id}
                        />
                      </label>
                    ) : (
                      <span style={{ 
                        padding: '8px 16px', 
                        background: '#E8F5E9', 
                        color: '#2E7D32', 
                        borderRadius: 6, 
                        fontWeight: 600,
                        fontSize: 13
                      }}>
                        ✓ Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

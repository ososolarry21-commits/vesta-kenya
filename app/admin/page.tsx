'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function AdminPanel() {
  const [user, setUser] = useState<any>(null)
  const [listings, setListings] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'pending_approval' | 'pending_verification' | 'verified'>('all')
  const [loading, setLoading] = useState(true)
  
  // New states for Agent Proof Modal
  const [showProofModal, setShowProofModal] = useState(false)
  const [proofListingId, setProofListingId] = useState('')
  const [proofImage, setProofImage] = useState<File | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)

  const router = useRouter()

  useEffect(() => { checkAdmin() }, [])

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    if (profile?.role !== 'admin') {
      await supabase.auth.signOut()
      router.push('/')
      return
    }

    setUser(user)
    await fetchListings()
    setLoading(false)
  }

  async function fetchListings() {
    const { data } = await supabase
      .from('listings')
      .select('*, profiles:landlord_id(name, email)')
      .order('created_at', { ascending: false })
    if (data) setListings(data)
  }

  async function approveListing(listingId: string) {
    if (!confirm('Approve this listing?')) return
    await supabase.from('listings').update({ status: 'approved' }).eq('id', listingId)
    await fetchListings()
  }

  async function rejectListing(listingId: string) {
    if (!confirm('Reject this listing?')) return
    await supabase.from('listings').update({ status: 'rejected' }).eq('id', listingId)
    await fetchListings()
  }

  async function handleVerifyWithProof() {
    if (!proofListingId) return
    if (!proofImage) { alert('Please upload a proof photo first!'); return }

    setUploadingProof(true)
    try {
      // 1. Upload photo to Supabase Storage
      const fileExt = proofImage.name.split('.').pop()
      const fileName = `proof-${proofListingId}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('verification-proofs')
        .upload(fileName, proofImage)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('verification-proofs').getPublicUrl(fileName)

      // 2. Mark as verified and save photo URL
      await supabase
        .from('listings')
        .update({ 
          is_verified: true,
          verified_at: new Date().toISOString(),
          verification_receipt: data.publicUrl 
        })
        .eq('id', proofListingId)
      
      alert('Property verified successfully!')
      setShowProofModal(false)
      setProofImage(null)
      await fetchListings()
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setUploadingProof(false)
    }
  }

  async function deleteListing(listingId: string) {
    if (!confirm('Delete this listing permanently?')) return
    await supabase.from('listings').delete().eq('id', listingId)
    await fetchListings()
  }

  const filteredListings = listings.filter(listing => {
    if (filter === 'all') return true
    if (filter === 'pending_approval') return listing.status === 'pending'
    if (filter === 'pending_verification') return listing.verification_payment_received && !listing.is_verified
    if (filter === 'verified') return listing.is_verified
    return true
  })

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5', padding: 40, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
        <h1 style={{ margin: 0 }}>Admin Panel</h1>
        <button onClick={() => router.push('/dashboard')} style={{ padding: '10px 20px', background: '#1C1209', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Back to Dashboard</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {['all', 'pending_approval', 'pending_verification', 'verified'].map(f => (
          <button key={f} onClick={() => setFilter(f as any)} style={{ padding: '10px 20px', background: filter === f ? '#1C1209' : 'white', color: filter === f ? 'white' : 'black', border: 'none', borderRadius: 8, cursor: 'pointer', textTransform: 'capitalize' }}>
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Listings */}
      <div style={{ display: 'grid', gap: 16 }}>
        {filteredListings.map((listing) => (
          <div key={listing.id} style={{ background: 'white', padding: 24, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div>
              <h3 style={{ margin: '0 0 8px 0' }}>{listing.name}</h3>
              <p style={{ margin: 0, color: '#666' }}>{listing.area}, {listing.city} • KSh {listing.price}/mo</p>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#888' }}>Landlord: {listing.profiles?.name}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {listing.status === 'pending' && (
                <>
                  <button onClick={() => approveListing(listing.id)} style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Approve</button>
                  <button onClick={() => rejectListing(listing.id)} style={{ padding: '8px 16px', background: '#F44336', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Reject</button>
                </>
              )}
              
              {listing.verification_payment_received && !listing.is_verified && (
                <button 
                  onClick={() => { setProofListingId(listing.id); setShowProofModal(true) }}
                  style={{ padding: '8px 16px', background: '#007BFF', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ✓ Mark as Verified
                </button>
              )}
              
              {listing.is_verified && <span style={{ padding: '8px 16px', background: '#E3F2FD', color: '#007BFF', borderRadius: 6, fontWeight: 'bold' }}>VERIFIED</span>}
              
              <button onClick={() => deleteListing(listing.id)} style={{ padding: '8px 16px', background: '#eee', color: 'red', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Proof Modal */}
      {showProofModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: 30, borderRadius: 12, maxWidth: 400, width: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Agent Verification Proof</h3>
            <p style={{ color: '#666', fontSize: 14 }}>Upload a photo of the property to confirm the agent visited.</p>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setProofImage(e.target.files?.[0] || null)} 
              style={{ width: '100%', marginBottom: 20, padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowProofModal(false)} style={{ flex: 1, padding: 10, background: '#eee', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleVerifyWithProof} disabled={uploadingProof} style={{ flex: 1, padding: 10, background: '#007BFF', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                {uploadingProof ? 'Uploading...' : 'Confirm Verification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
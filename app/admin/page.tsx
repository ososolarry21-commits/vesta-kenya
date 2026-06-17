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
      const fileExt = proofImage.name.split('.').pop()
      const fileName = `proof-${proofListingId}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('verification-proofs')
        .upload(fileName, proofImage)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('verification-proofs').getPublicUrl(fileName)

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

  const stats = {
    total: listings.length,
    pending: listings.filter(l => l.status === 'pending').length,
    awaitingVerification: listings.filter(l => l.verification_payment_received && !l.is_verified).length,
    verified: listings.filter(l => l.is_verified).length
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
        <h1 style={{ margin: 0, fontSize: 24, color: '#1C1209' }}>Admin Panel</h1>
        <button 
          onClick={() => router.push('/dashboard')}
          style={{ padding: '10px 20px', background: '#1C1209', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          Back to Dashboard
        </button>
      </nav>

      <div style={{ padding: '40px 60px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30 }}>
          <div style={{ background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#1C1209' }}>{stats.total}</div>
            <div style={{ color: '#6B5B4E', fontSize: 13 }}>Total Listings</div>
          </div>
          <div style={{ background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#FF9800' }}>{stats.pending}</div>
            <div style={{ color: '#6B5B4E', fontSize: 13 }}>Pending Approval</div>
          </div>
          <div style={{ background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#2196F3' }}>{stats.awaitingVerification}</div>
            <div style={{ color: '#6B5B4E', fontSize: 13 }}>Awaiting Verification</div>
          </div>
          <div style={{ background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#4CAF50' }}>{stats.verified}</div>
            <div style={{ color: '#6B5B4E', fontSize: 13 }}>Verified Properties</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <button 
            onClick={() => setFilter('all')}
            style={{ 
              padding: '10px 20px', 
              background: filter === 'all' ? '#1C1209' : 'white', 
              color: filter === 'all' ? 'white' : '#1C1209',
              border: 'none', 
              borderRadius: 8, 
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            All Listings
          </button>
          <button 
            onClick={() => setFilter('pending_approval')}
            style={{ 
              padding: '10px 20px', 
              background: filter === 'pending_approval' ? '#FF9800' : 'white', 
              color: filter === 'pending_approval' ? 'white' : '#1C1209',
              border: 'none', 
              borderRadius: 8, 
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Pending Approval ({stats.pending})
          </button>
          <button 
            onClick={() => setFilter('pending_verification')}
            style={{ 
              padding: '10px 20px', 
              background: filter === 'pending_verification' ? '#2196F3' : 'white', 
              color: filter === 'pending_verification' ? 'white' : '#1C1209',
              border: 'none', 
              borderRadius: 8, 
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Awaiting Verification ({stats.awaitingVerification})
          </button>
          <button 
            onClick={() => setFilter('verified')}
            style={{ 
              padding: '10px 20px', 
              background: filter === 'verified' ? '#4CAF50' : 'white', 
              color: filter === 'verified' ? 'white' : '#1C1209',
              border: 'none', 
              borderRadius: 8, 
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Verified ({stats.verified})
          </button>
        </div>

        {/* Listings */}
        {filteredListings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 12 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <p style={{ color: '#6B5B4E' }}>No listings found</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {filteredListings.map((listing) => (
              <div key={listing.id} style={{ 
                background: 'white', 
                padding: 24, 
                borderRadius: 12, 
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 300 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <h3 style={{ margin: 0, color: '#1C1209' }}>{listing.name}</h3>
                      {listing.is_verified && (
                        <span style={{ background: 'linear-gradient(135deg, #007BFF, #0056b3)', color: 'white', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                          ✓ VERIFIED
                        </span>
                      )}
                      {listing.verification_payment_received && !listing.is_verified && (
                        <span style={{ background: '#2196F3', color: 'white', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                          💰 Payment Received
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '4px 0', color: '#6B5B4E', fontSize: 14 }}>
                      📍 {listing.area}, {listing.city}
                    </p>
                    <p style={{ margin: '4px 0', color: '#6B5B4E', fontSize: 14 }}>
                      👤 {listing.profiles?.name || 'Unknown'} ({listing.profiles?.email || 'No email'})
                    </p>
                    <p style={{ margin: '4px 0', color: '#D4873A', fontSize: 14, fontWeight: 600 }}>
                      KSh {listing.price?.toLocaleString()}/month
                    </p>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: 6, 
                        fontSize: 12, 
                        fontWeight: 600,
                        background: listing.status === 'approved' ? '#D4EDDA' : listing.status === 'pending' ? '#FFF3CD' : '#F8D7DA',
                        color: listing.status === 'approved' ? '#155724' : listing.status === 'pending' ? '#856404' : '#721C24'
                      }}>
                        {listing.status === 'approved' ? 'Approved' : listing.status === 'pending' ? 'Pending Approval' : 'Rejected'}
                      </span>
                      {listing.verification_receipt && !listing.is_verified && (
                        <span style={{ background: '#E3F2FD', color: '#1976D2', padding: '4px 10px', borderRadius: 6, fontSize: 11 }}>
                          Receipt: {listing.verification_receipt}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {listing.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => approveListing(listing.id)}
                          style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                        >
                          ✓ Approve
                        </button>
                        <button 
                          onClick={() => rejectListing(listing.id)}
                          style={{ padding: '8px 16px', background: '#F44336', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                        >
                          ✗ Reject
                        </button>
                      </>
                    )}
                    
                    {listing.verification_payment_received && !listing.is_verified && (
                      <button 
                        onClick={() => {
                          setProofListingId(listing.id)
                          setShowProofModal(true)
                        }}
                        style={{ 
                          padding: '8px 16px', 
                          background: 'linear-gradient(135deg, #007BFF, #0056b3)', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: 6, 
                          cursor: 'pointer', 
                          fontWeight: 700 
                        }}
                      >
                        ✓ Mark as Verified
                      </button>
                    )}
                    
                    <button 
                      onClick={() => deleteListing(listing.id)}
                      style={{ padding: '8px 16px', background: '#F8D7DA', color: '#721C24', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agent Proof Modal */}
      {showProofModal && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.7)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            background: 'white', 
            padding: 40, 
            borderRadius: 16, 
            maxWidth: 400, 
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ margin: '0 0 16px 0', color: '#007BFF', textAlign: 'center', fontSize: 24 }}>
              Agent Verification Proof
            </h2>
            <p style={{ color: '#6B5B4E', textAlign: 'center', marginBottom: 24, fontSize: 14 }}>
              Upload a photo of the property to confirm the agent visited.
            </p>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setProofImage(e.target.files?.[0] || null)} 
              style={{ width: '100%', marginBottom: 20, padding: 12, border: '2px solid #DDD0C4', borderRadius: 8 }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => {
                  setShowProofModal(false)
                  setProofImage(null)
                }}
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  background: '#f0f0f0', 
                  color: '#333', 
                  border: 'none', 
                  borderRadius: 8, 
                  cursor: 'pointer', 
                  fontWeight: 600 
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleVerifyWithProof}
                disabled={uploadingProof}
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  background: uploadingProof ? '#999' : '#007BFF', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 8, 
                  cursor: uploadingProof ? 'not-allowed' : 'pointer', 
                  fontWeight: 700 
                }}
              >
                {uploadingProof ? 'Uploading...' : 'Confirm Verification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
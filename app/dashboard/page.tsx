'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const AMENITIES_LIST = ['WiFi', 'Water', 'Parking', 'Security', 'Furnished', 'Laundry', 'Balcony', 'Backup Generator']

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [listings, setListings] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)
  const [selectedListing, setSelectedListing] = useState<any>(null)
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: '',
    type: 'Bedsitter',
    price: '',
    deposit: '',
    area: '',
    city: '',
    institution: '',
    distance: '',
    gender: 'Mixed',
    description: '',
    amenities: [] as string[]
  })
  
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  useEffect(() => { checkUser() }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/')
      return
    }
  
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
  
    // Block students from accessing landlord dashboard
    if (profile?.role === 'student') {
      router.push('/browse')
      return
    }
  
    setUser(user)
    setProfile(profile)
    await fetchListings(user.id)
    setLoading(false)
  }

  async function fetchListings(userId: string) {
    const { data } = await supabase.from('listings').select('*').eq('landlord_id', userId).order('created_at', { ascending: false })
    if (data) {
      setListings(data)
      setStats({
        total: data.length,
        active: data.filter((l: any) => l.status === 'approved').length,
        pending: data.filter((l: any) => l.status === 'pending').length
      })
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setImages(selectedFiles)
      const previews = selectedFiles.map(file => URL.createObjectURL(file))
      setImagePreviews(previews)
    }
  }

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => {
      const current = prev.amenities
      if (current.includes(amenity)) {
        return { ...prev, amenities: current.filter(a => a !== amenity) }
      } else {
        return { ...prev, amenities: [...current, amenity] }
      }
    })
  }

  const uploadImages = async (listingId: string): Promise<string[]> => {
    const imageUrls: string[] = []
    for (let i = 0; i < images.length; i++) {
      const file = images[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${listingId}-${Date.now()}-${i}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('property-images').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('property-images').getPublicUrl(fileName)
      imageUrls.push(data.publicUrl)
    }
    return imageUrls
  }

  async function handleAddListing(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    try {
      const { data: listingData, error: insertError } = await supabase.from('listings').insert({
        ...formData,
        landlord_id: user.id,
        price: Number(formData.price),
        deposit: formData.deposit ? Number(formData.deposit) : null,
        status: 'pending',
        images: []
      }).select().single()

      if (insertError) throw insertError

      if (images.length > 0) {
        setUploadingImages(true)
        const imageUrls = await uploadImages(listingData.id)
        await supabase.from('listings').update({ images: imageUrls }).eq('id', listingData.id)
        setUploadingImages(false)
      }

      alert('Listing created successfully! Wait for admin approval.')
      setShowAddForm(false)
      setImages([])
      setImagePreviews([])
      setFormData({ name: '', type: 'Bedsitter', price: '', deposit: '', area: '', city: '', institution: '', distance: '', gender: 'Mixed', description: '', amenities: [] })
      await fetchListings(user.id)
    } catch (error: any) {
      alert('Error creating listing: ' + error.message)
    }
  }

  function openPaymentModal(listing: any) {
    setSelectedListing(listing)
    setShowPaymentModal(true)
  }

  async function handlePayment() {
    if (!phoneNumber || phoneNumber.length < 10) { alert('Please enter a valid phone number'); return }
    if (!selectedListing) { alert('No listing selected'); return }

    setProcessingPayment(true)
    let formattedPhone = phoneNumber.replace(/\D/g, '')
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.substring(1)
    else if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone

    try {
      const response = await fetch('/api/mpesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formattedPhone, amount: 500, email: user.email, listingId: selectedListing.id, listingName: selectedListing.name })
      })
      const data = await response.json()
      if (data.ResponseCode === '0') {
        alert('Payment request sent! Check your phone to enter PIN.')
        setShowPaymentModal(false)
        setPhoneNumber('')
        setSelectedListing(null)
        // Wait a few seconds then refresh to see the new status
        setTimeout(() => fetchListings(user.id), 3000)
      } else {
        alert('Payment failed: ' + (data.errorMessage || 'Unknown error'))
      }
    } catch (error) {
      alert('Failed to initiate payment.')
    } finally {
      setProcessingPayment(false)
    }
  }

  async function deleteListing(id: string) {
    if (!confirm('Delete this listing?')) return
    const { error } = await supabase.from('listings').delete().eq('id', id)
    if (error) alert('Error deleting: ' + error.message)
    else await fetchListings(user!.id)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#FDF8F3', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <nav style={{ background: 'white', padding: '16px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 20px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => router.push('/')}>
          <img src="/logo.png" alt="Vesta" style={{ height: '50px', width: 'auto', objectFit: 'contain' }} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {profile?.role === 'admin' && <button onClick={() => router.push('/admin')} style={{ padding: '10px 20px', background: '#1C1209', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Admin Panel</button>}
          <button onClick={() => router.push('/dashboard/settings')} style={{ padding: '10px 20px', background: 'transparent', color: '#1C1209', border: '2px solid #DDD0C4', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Settings</button>
          <button onClick={signOut} style={{ padding: '10px 20px', background: 'transparent', color: '#DC3545', border: '2px solid #DC3545', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Sign Out</button>
        </div>
      </nav>

      <div style={{ background: 'linear-gradient(135deg, #1C1209 0%, #3A2A1D 100%)', padding: '60px 60px 40px', color: 'white' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px 0' }}>Welcome back, {profile?.name || 'Landlord'}! 👋</h1>
        <p style={{ margin: 0, opacity: 0.9 }}>Manage your student accommodation listings</p>
      </div>

      <div style={{ padding: '40px 60px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 40 }}>
          <div style={{ background: 'white', padding: 30, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#D4873A', marginBottom: 8 }}>{stats.total}</div>
            <div style={{ color: '#6B5B4E', fontSize: 14 }}>Total Listings</div>
          </div>
          <div style={{ background: 'white', padding: 30, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#2A7A5A', marginBottom: 8 }}>{stats.active}</div>
            <div style={{ color: '#6B5B4E', fontSize: 14 }}>Active Listings</div>
          </div>
          <div style={{ background: 'white', padding: 30, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#007BFF', marginBottom: 8 }}>{stats.pending}</div>
            <div style={{ color: '#6B5B4E', fontSize: 14 }}>Pending Approval</div>
          </div>
        </div>

        <div style={{ marginBottom: 30 }}>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{ padding: '14px 28px', background: '#D4873A', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
            {showAddForm ? 'Cancel' : '+ Add New Listing'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddListing} style={{ background: 'white', padding: 30, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: 40 }}>
            <h2 style={{ margin: '0 0 24px 0', color: '#1C1209' }}>Create New Listing</h2>
            
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#1C1209' }}>Property Images</label>
              <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ width: '100%', padding: '12px', border: '2px dashed #DDD0C4', borderRadius: 8 }} />
              {imagePreviews.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginTop: 16 }}>
                  {imagePreviews.map((preview, index) => <div key={index} style={{ borderRadius: 8, overflow: 'hidden', aspectRatio: '1' }}><img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>)}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              <input placeholder="Property Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required style={{ padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8 }} />
              <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} style={{ padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8 }}>
                <option>Bedsitter</option><option>Single Room</option><option>1-Bedroom</option><option>Shared Room</option><option>Hostel</option><option>Studio</option>
              </select>
              <input type="number" placeholder="Price (KSh/month)" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required style={{ padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8 }} />
              <input type="number" placeholder="Deposit (KSh)" value={formData.deposit} onChange={(e) => setFormData({...formData, deposit: e.target.value})} style={{ padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8 }} />
              <input placeholder="Area/Location" value={formData.area} onChange={(e) => setFormData({...formData, area: e.target.value})} required style={{ padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8 }} />
              <input placeholder="City" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} required style={{ padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8 }} />
              <input placeholder="Nearest Institution" value={formData.institution} onChange={(e) => setFormData({...formData, institution: e.target.value})} required style={{ padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8 }} />
              <input placeholder="Distance" value={formData.distance} onChange={(e) => setFormData({...formData, distance: e.target.value})} style={{ padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8 }} />
              <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} style={{ padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8 }}>
                <option>Mixed</option><option>Ladies Only</option><option>Gents Only</option>
              </select>
            </div>

            {/* AMENITIES SECTION */}
            <div style={{ marginTop: 24, marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 12, fontWeight: 600, color: '#1C1209' }}>Amenities & Features</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {AMENITIES_LIST.map(amenity => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    style={{
                      padding: '10px 16px',
                      background: formData.amenities.includes(amenity) ? '#D4873A' : '#f0f0f0',
                      color: formData.amenities.includes(amenity) ? 'white' : '#333',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 14
                    }}
                  >
                    {formData.amenities.includes(amenity) ? '✓ ' : ''}{amenity}
                  </button>
                ))}
              </div>
            </div>

            <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={4} style={{ width: '100%', padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8, boxSizing: 'border-box' }} />

            <button type="submit" disabled={uploadingImages} style={{ marginTop: 20, padding: '14px 32px', background: uploadingImages ? '#999' : '#2A7A5A', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>
              {uploadingImages ? 'Uploading...' : 'Submit for Approval'}
            </button>
          </form>
        )}

        <h2 style={{ margin: '0 0 24px 0', color: '#1C1209' }}>Your Listings</h2>
        
        {listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 16 }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>📭</div>
            <h3 style={{ color: '#1C1209', marginBottom: 12 }}>No listings yet</h3>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {listings.map((listing) => (
              <div key={listing.id} style={{ background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1 }}>
                  {listing.images && listing.images.length > 0 && <img src={listing.images[0]} alt={listing.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />}
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', color: '#1C1209' }}>{listing.name}</h3>
                    <p style={{ margin: '0 0 8px 0', color: '#6B5B4E', fontSize: 14 }}>{listing.area}, {listing.city}</p>
                    <div style={{ display: 'flex', gap: 12, fontSize: 14, flexWrap: 'wrap' }}>
                      <span style={{ background: '#F0EAE3', padding: '4px 10px', borderRadius: 6 }}>{listing.type}</span>
                      <span style={{ fontWeight: 700, color: '#D4873A' }}>KSh {listing.price?.toLocaleString()}/mo</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: listing.status === 'approved' ? '#D4EDDA' : listing.status === 'pending' ? '#FFF3CD' : '#F8D7DA', color: listing.status === 'approved' ? '#155724' : listing.status === 'pending' ? '#856404' : '#721C24' }}>
                    {listing.status === 'approved' ? 'Approved' : listing.status === 'pending' ? 'Pending' : 'Rejected'}
                  </span>
                  {listing.is_verified && <span style={{ background: 'linear-gradient(135deg, #007BFF, #0056b3)', color: 'white', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>✓ VERIFIED</span>}
                  {listing.verification_payment_received && !listing.is_verified && <span style={{ background: '#E3F2FD', color: '#1976D2', padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>💰 Payment Received - Awaiting Verification</span>}
                  {!listing.is_verified && !listing.verification_payment_received && listing.status === 'approved' && (
                    <button onClick={() => openPaymentModal(listing)} style={{ padding: '8px 16px', background: '#00C35D', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>Verify - KSh 500</button>
                  )}
                                    {listing.checkout_request_id && !listing.is_verified && !listing.verification_payment_received && (
                    <button 
                      onClick={async () => {
                        const res = await fetch('/api/mpesa/query', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            checkoutRequestId: listing.checkout_request_id, 
                            listingId: listing.id 
                          })
                        })
                        const data = await res.json()
                        alert(data.message)
                        if (data.success) await fetchListings(user.id)
                      }}
                      style={{ padding: '8px 16px', background: '#FF9800', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                    >
                      Check Payment Status
                    </button>
                  )}
                  <button onClick={() => deleteListing(listing.id)} style={{ padding: '8px 16px', background: '#F8D7DA', color: '#721C24', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPaymentModal && selectedListing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: 40, borderRadius: 16, maxWidth: 400, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 16px 0', color: '#00C35D', textAlign: 'center', fontSize: 28, fontWeight: 'bold' }}>💚 Pay with M-Pesa</h2>
            <p style={{ color: '#6B5B4E', textAlign: 'center', marginBottom: 8, fontSize: 15 }}>Verify: <strong>{selectedListing.name}</strong></p>
            <p style={{ color: '#1C1209', textAlign: 'center', marginBottom: 24, fontSize: 24, fontWeight: 'bold' }}>KSh 500</p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#1C1209' }}>M-Pesa Phone Number</label>
              <input type="tel" placeholder="254712345678" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8, fontSize: 16, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setShowPaymentModal(false); setPhoneNumber(''); setSelectedListing(null) }} style={{ flex: 1, padding: '12px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handlePayment} disabled={processingPayment} style={{ flex: 1, padding: '12px', background: processingPayment ? '#999' : '#00C35D', color: 'white', border: 'none', borderRadius: 8, cursor: processingPayment ? 'not-allowed' : 'pointer', fontWeight: 700 }}>{processingPayment ? 'Processing...' : 'Pay KSh 500'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
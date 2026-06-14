'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

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

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return
    }

    setUser(user)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(profileData)
    await fetchListings(user.id)
    setLoading(false)
  }

  async function fetchListings(userId: string) {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('landlord_id', userId)
      .order('created_at', { ascending: false })

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

  const uploadImages = async (listingId: string): Promise<string[]> => {
    const imageUrls: string[] = []
    for (let i = 0; i < images.length; i++) {
      const file = images[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${listingId}-${Date.now()}-${i}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Image upload error:', uploadError)
        throw uploadError
      }

      const { data } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName)
      
      imageUrls.push(data.publicUrl)
    }
    return imageUrls
  }

  async function handleAddListing(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    try {
      const { data: listingData, error: insertError } = await supabase
        .from('listings')
        .insert({
          ...formData,
          landlord_id: user.id,
          price: Number(formData.price),
          deposit: formData.deposit ? Number(formData.deposit) : null,
          status: 'pending',
          images: []
        })
        .select()
        .single()

      if (insertError) throw insertError

      let imageUrls: string[] = []
      if (images.length > 0) {
        setUploadingImages(true)
        try {
          imageUrls = await uploadImages(listingData.id)
          await supabase
            .from('listings')
            .update({ images: imageUrls })
            .eq('id', listingData.id)
        } catch (uploadErr) {
          console.error('Upload failed:', uploadErr)
        }
        setUploadingImages(false)
      }

      alert('Listing created successfully! Wait for admin approval.')
      setShowAddForm(false)
      setImages([])
      setImagePreviews([])
      setFormData({
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
        amenities: []
      })
      await fetchListings(user.id)
    } catch (error: any) {
      alert('Error creating listing: ' + error.message)
    }
  }

  // M-Pesa Payment Function
  async function handlePayment() {
    if (!phoneNumber || phoneNumber.length < 10) {
      alert('Please enter a valid phone number')
      return
    }

    setProcessingPayment(true)
    
    // Format phone number (remove 0, add 254)
    let formattedPhone = phoneNumber.replace(/\D/g, '')
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1)
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone
    }

    try {
      const response = await fetch('/api/mpesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          amount: 1000 // Account verification fee
        })
      })

      const data = await response.json()

      if (data.ResponseCode === '0') {
        alert('Payment request sent! Check your phone to enter PIN.')
        setShowPaymentModal(false)
      } else {
        alert('Payment failed: ' + (data.errorMessage || 'Unknown error'))
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Failed to initiate payment. Please try again.')
    } finally {
      setProcessingPayment(false)
    }
  }

  async function deleteListing(id: string) {
    if (!confirm('Delete this listing?')) return

    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error deleting: ' + error.message)
    } else {
      await fetchListings(user!.id)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FDF8F3' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FDF8F3', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <nav style={{ 
        background: 'white', 
        padding: '16px 60px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        boxShadow: '0 2px 20px rgba(0,0,0,0.05)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => router.push('/')}>
          <img 
            src="/logo.png" 
            alt="Vesta" 
            style={{ height: '50px', width: 'auto', objectFit: 'contain' }} 
          />
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          {profile?.role === 'admin' && (
            <button 
              onClick={() => router.push('/admin')}
              style={{ padding: '10px 20px', background: '#1C1209', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
            >
              Admin Panel
            </button>
          )}
          <button 
            onClick={() => router.push('/dashboard/settings')}
            style={{ padding: '10px 20px', background: 'transparent', color: '#1C1209', border: '2px solid #DDD0C4', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
          >
            Settings
          </button>
          <button 
            onClick={signOut} 
            style={{ padding: '10px 20px', background: 'transparent', color: '#DC3545', border: '2px solid #DC3545', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{ 
        background: 'linear-gradient(135deg, #1C1209 0%, #3A2A1D 100%)',
        padding: '60px 60px 40px',
        color: 'white'
      }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px 0' }}>
          Welcome back, {profile?.name || 'Landlord'}! 👋
        </h1>
        <p style={{ margin: 0, opacity: 0.9 }}>Manage your student accommodation listings</p>
      </div>

      <div style={{ padding: '40px 60px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Stats Cards */}
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

        {/* Verification Badge Section */}
        {!profile?.is_verified && (
          <div style={{ 
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', 
            padding: 30, 
            borderRadius: 16, 
            marginBottom: 40,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 20
          }}>
            <div>
              <h2 style={{ margin: '0 0 8px 0', color: '#1C1209', fontSize: 24 }}>🏆 Get Verified Badge</h2>
              <p style={{ margin: 0, color: '#333', fontSize: 14 }}>Pay KSh 1,000 to get a verified badge and increase trust with students</p>
            </div>
            <button 
              onClick={() => setShowPaymentModal(true)}
              style={{ 
                padding: '14px 32px', 
                background: '#1C1209', 
                color: 'white', 
                border: 'none', 
                borderRadius: 10, 
                cursor: 'pointer', 
                fontWeight: 700,
                fontSize: 15,
                whiteSpace: 'nowrap'
              }}
            >
              Pay Now with M-Pesa
            </button>
          </div>
        )}

        {profile?.is_verified && (
          <div style={{ 
            background: 'linear-gradient(135deg, #2A7A5A 0%, #1C5A42 100%)', 
            padding: 30, 
            borderRadius: 16, 
            marginBottom: 40,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{ fontSize: 48 }}>⭐</div>
            <div>
              <h2 style={{ margin: '0 0 4px 0', color: 'white', fontSize: 24 }}>Verified Landlord</h2>
              <p style={{ margin: 0, color: '#E0F0E8', fontSize: 14 }}>You have a verified badge - students trust you more!</p>
            </div>
          </div>
        )}

        {/* Add Listing Button */}
        <div style={{ marginBottom: 30 }}>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ 
              padding: '14px 28px', 
              background: '#D4873A', 
              color: 'white', 
              border: 'none', 
              borderRadius: 10, 
              cursor: 'pointer', 
              fontWeight: 700,
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            {showAddForm ? 'Cancel' : '+ Add New Listing'}
          </button>
        </div>

        {/* Add Listing Form */}
        {showAddForm && (
          <form onSubmit={handleAddListing} style={{ background: 'white', padding: 30, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: 40 }}>
            <h2 style={{ margin: '0 0 24px 0', color: '#1C1209' }}>Create New Listing</h2>
            
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#1C1209' }}>Property Images</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                style={{ width: '100%', padding: '12px', border: '2px dashed #DDD0C4', borderRadius: 8, cursor: 'pointer' }}
              />
              <p style={{ fontSize: 12, color: '#6B5B4E', marginTop: 6 }}>Upload multiple images (JPG, PNG)</p>
              
              {imagePreviews.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginTop: 16 }}>
                  {imagePreviews.map((preview, index) => (
                    <div key={index} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1' }}>
                      <img src={preview} alt={`Preview ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              <input
                placeholder="Property Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                style={{ padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8, fontSize: 14 }}
              />
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                style={{ padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8, fontSize: 14 }}
              >
                <option>Bedsitter</option>
                <option>Single Room</option>
                <option>1-Bedroom</option>
                <option>Shared Room</option>
                <option>Hostel</option>
                <option>Studio</option>
              </select>
              <input
                type="number"
                placeholder="Price (KSh/month)"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                required
                style={{ padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8, fontSize: 14 }}
              />
              <input
                type="number"
                placeholder="Deposit (KSh)"
                value={formData.deposit}
                onChange={(e) => setFormData({...formData, deposit: e.target.value})}
                style={{ padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8, fontSize: 14 }}
              />
              <input
                placeholder="Area/Location"
                value={formData.area}
                onChange={(e) => setFormData({...formData, area: e.target.value})}
                required
                style={{ padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8, fontSize: 14 }}
              />
              <input
                placeholder="City"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                required
                style={{ padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8, fontSize: 14 }}
              />
              <input
                placeholder="Nearest Institution"
                value={formData.institution}
                onChange={(e) => setFormData({...formData, institution: e.target.value})}
                required
                style={{ padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8, fontSize: 14 }}
              />
              <input
                placeholder="Distance (e.g., 500m from campus)"
                value={formData.distance}
                onChange={(e) => setFormData({...formData, distance: e.target.value})}
                style={{ padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8, fontSize: 14 }}
              />
              <select
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                style={{ padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8, fontSize: 14 }}
              >
                <option>Mixed</option>
                <option>Ladies Only</option>
                <option>Gents Only</option>
              </select>
            </div>

            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={4}
              style={{ width: '100%', padding: '12px 16px', border: '2px solid #DDD0C4', borderRadius: 8, fontSize: 14, marginTop: 16, boxSizing: 'border-box' }}
            />

            <button 
              type="submit"
              disabled={uploadingImages}
              style={{ 
                marginTop: 20,
                padding: '14px 32px', 
                background: uploadingImages ? '#999' : '#2A7A5A', 
                color: 'white', 
                border: 'none', 
                borderRadius: 10, 
                cursor: uploadingImages ? 'not-allowed' : 'pointer', 
                fontWeight: 700,
                fontSize: 15
              }}
            >
              {uploadingImages ? 'Uploading Images...' : 'Submit for Approval'}
            </button>
          </form>
        )}

        {/* Listings */}
        <h2 style={{ margin: '0 0 24px 0', color: '#1C1209' }}>Your Listings</h2>
        
        {listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 16 }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>📭</div>
            <h3 style={{ color: '#1C1209', marginBottom: 12 }}>No listings yet</h3>
            <p style={{ color: '#6B5B4E' }}>Click "Add New Listing" to get started</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {listings.map((listing) => (
              <div key={listing.id} style={{ background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {listing.images && listing.images.length > 0 && (
                    <img 
                      src={listing.images[0]} 
                      alt={listing.name}
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }}
                    />
                  )}
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', color: '#1C1209' }}>{listing.name}</h3>
                    <p style={{ margin: '0 0 8px 0', color: '#6B5B4E', fontSize: 14 }}>{listing.area}, {listing.city}</p>
                    <div style={{ display: 'flex', gap: 12, fontSize: 14 }}>
                      <span style={{ background: '#F0EAE3', padding: '4px 10px', borderRadius: 6 }}>{listing.type}</span>
                      <span style={{ fontWeight: 700, color: '#D4873A' }}>KSh {listing.price?.toLocaleString()}/mo</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ 
                    padding: '6px 14px', 
                    borderRadius: 6, 
                    fontSize: 12, 
                    fontWeight: 600,
                    background: listing.status === 'approved' ? '#D4EDDA' : listing.status === 'pending' ? '#FFF3CD' : '#F8D7DA',
                    color: listing.status === 'approved' ? '#155724' : listing.status === 'pending' ? '#856404' : '#721C24'
                  }}>
                    {listing.status === 'approved' ? 'Approved' : listing.status === 'pending' ? 'Pending' : 'Rejected'}
                  </span>
                  {listing.is_verified && (
                    <span style={{ background: 'linear-gradient(135deg, #007BFF, #0056b3)', color: 'white', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                      VERIFIED
                    </span>
                  )}
                  <button 
                    onClick={() => deleteListing(listing.id)}
                    style={{ padding: '8px 16px', background: '#F8D7DA', color: '#721C24', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
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
            <h2 style={{ margin: '0 0 16px 0', color: '#1C1209', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              {/* M-Pesa Logo - Inline SVG */}
              <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="120" height="40" rx="4" fill="#00C35D"/>
                <text x="60" y="25" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="bold" fill="white" textAnchor="middle">M-Pesa</text>
              </svg>
            </h2>
            <p style={{ color: '#6B5B4E', textAlign: 'center', marginBottom: 24 }}>
              Pay KSh 1,000 to get your verified badge
            </p>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#1C1209' }}>M-Pesa Phone Number</label>
              <input
                type="tel"
                placeholder="254712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px 16px', 
                  border: '2px solid #DDD0C4', 
                  borderRadius: 8, 
                  fontSize: 16,
                  boxSizing: 'border-box'
                }}
              />
              <p style={{ fontSize: 12, color: '#6B5B4E', marginTop: 6 }}>
                Enter your M-Pesa number (e.g., 254712345678)
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => setShowPaymentModal(false)}
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
                onClick={handlePayment}
                disabled={processingPayment}
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  background: processingPayment ? '#999' : '#2A7A5A', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 8, 
                  cursor: processingPayment ? 'not-allowed' : 'pointer', 
                  fontWeight: 700 
                }}
              >
                {processingPayment ? 'Processing...' : 'Pay KSh 1,000'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
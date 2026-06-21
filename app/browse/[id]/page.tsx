'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams, useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function ListingDetails() {
  const { id } = useParams()
  const router = useRouter()
  const [listing, setListing] = useState<any>(null)
  const [landlord, setLandlord] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentImage, setCurrentImage] = useState(0)
  const [showContact, setShowContact] = useState(false)
  
  // New State for Save Feature
  const [user, setUser] = useState<any>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      // 1. Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)
      
      // 2. Check if property is already saved
      if (currentUser && id) {
        const { data } = await supabase
          .from('saved_properties')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('listing_id', id)
          .maybeSingle()
        
        if (data) setIsSaved(true)
      }
      
      // 3. Fetch listing details
      if (id) fetchListing()
    }
    
    init()
  }, [id])

  async function fetchListing() {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          profiles:landlord_id (name, email, phone)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      
      setListing(data)
      setLandlord(data.profiles)
    } catch (error) {
      console.error('Error fetching listing:', error)
    } finally {
      setLoading(false)
    }
  }

  // --- CONTACT TRACKING FUNCTION ---
  async function trackContact() {
    try {
      await supabase
        .from('listings')
        .update({ contacts: (listing.contacts || 0) + 1 })
        .eq('id', listing.id)
      
      setListing({ ...listing, contacts: (listing.contacts || 0) + 1 })
    } catch (error) {
      console.error('Error tracking contact:', error)
    }
  }

  const handleContactClick = () => {
    trackContact()
    setShowContact(true)
  }

  // --- SAVE PROPERTY FUNCTION ---
  const handleSaveProperty = async () => {
    if (!user) {
      alert("Please log in to save properties to your favorites.")
      router.push('/')
      return
    }

    setSaving(true)
    try {
      if (isSaved) {
        // Remove from saved
        await supabase
          .from('saved_properties')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listing.id)
        setIsSaved(false)
      } else {
        // Add to saved
        await supabase
          .from('saved_properties')
          .insert({ user_id: user.id, listing_id: listing.id })
        setIsSaved(true)
      }
    } catch (error) {
      console.error("Error saving property:", error)
      alert("Could not update favorites. Please try again.")
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FDF8F3' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
          <div style={{ color: '#6B5B4E' }}>Loading property details...</div>
        </div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FDF8F3' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
          <h2 style={{ color: '#1C1209' }}>Property Not Found</h2>
          <button onClick={() => router.push('/browse')} style={{ marginTop: 20, padding: '10px 20px', background: '#D4873A', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Back to Browse
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FDF8F3', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Navigation */}
      <nav style={{ background: 'white', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 15px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => router.push('/')}>
          <img src="/logo.png" alt="Vesta" style={{ height: '45px', width: 'auto', objectFit: 'contain' }} />
        </div>
        <button onClick={() => router.push('/browse')} style={{ padding: '8px 16px', background: '#F0EAE3', color: '#1C1209', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          ← Back to Listings
        </button>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px' }}>
              {/* Image Gallery */}
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', marginBottom: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        {/* Main Image Display */}
        <div style={{ 
          height: 400, 
          background: (() => {
            const images = listing.images || [];
            const currentImg = Array.isArray(images) ? images[currentImage] : images;
            return currentImg ? `url("${currentImg}") center/cover` : 'linear-gradient(135deg, #D4873A, #E8B86D)';
          })(),
          transition: 'background 0.3s ease'
        }}>
          {!listing.images || listing.images.length === 0}
        </div>
        
        {/* Navigation Arrows */}
        {(() => {
          const images = listing.images || [];
          const imageCount = Array.isArray(images) ? images.length : (images ? 1 : 0);
          
          return imageCount > 1 ? (
            <>
              <button 
                onClick={() => setCurrentImage(prev => prev === 0 ? imageCount - 1 : prev - 1)}
                style={{ 
                  position: 'absolute', 
                  left: 16, 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  background: 'rgba(255,255,255,0.9)', 
                  border: 'none', 
                  borderRadius: '50%', 
                  width: 40, 
                  height: 40, 
                  cursor: 'pointer', 
                  fontSize: 20, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#1C1209'
                }}
              >
                ‹
              </button>
              <button 
                onClick={() => setCurrentImage(prev => prev === imageCount - 1 ? 0 : prev + 1)}
                style={{ 
                  position: 'absolute', 
                  right: 16, 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  background: 'rgba(255,255,255,0.9)', 
                  border: 'none', 
                  borderRadius: '50%', 
                  width: 40, 
                  height: 40, 
                  cursor: 'pointer', 
                  fontSize: 20, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#1C1209'
                }}
              >
                ›
              </button>
              
              {/* Image Dots Indicator */}
              <div style={{ 
                position: 'absolute', 
                bottom: 16, 
                left: '50%', 
                transform: 'translateX(-50%)', 
                display: 'flex', 
                gap: 6 
              }}>
                {Array.from({ length: imageCount }, (_, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      background: idx === currentImage ? 'white' : 'rgba(255,255,255,0.5)', 
                      transition: 'all 0.2s' 
                    }}
                  />
                ))}
              </div>
            </>
          ) : null;
        })()}
        
        {/* Badges */}
        <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}>
          {listing.is_verified && (
            <span style={{ 
              background: 'linear-gradient(135deg, #007BFF, #0056b3)', 
              color: 'white', 
              padding: '6px 12px', 
              borderRadius: 8, 
              fontSize: 12, 
              fontWeight: 800, 
              boxShadow: '0 2px 10px rgba(0,123,255,0.3)' 
            }}>
              ★ VERIFIED
            </span>
          )}
          <span style={{ 
            background: 'rgba(28,18,9,0.85)', 
            color: 'white', 
            padding: '6px 12px', 
            borderRadius: 8, 
            fontSize: 12, 
            fontWeight: 700, 
            backdropFilter: 'blur(4px)' 
          }}>
            {listing.type}
          </span>
        </div>
      </div>

        {/* Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {/* Left Column: Details */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
              <div>
                <h1 style={{ margin: '0 0 8px 0', fontSize: 28, fontWeight: 800, color: '#1C1209' }}>{listing.name}</h1>
                <p style={{ margin: 0, fontSize: 16, color: '#6B5B4E' }}>📍 {listing.area}, {listing.city}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#D4873A' }}>KSh {listing.price?.toLocaleString()}</div>
                <div style={{ fontSize: 13, color: '#6B5B4E' }}>per month</div>
              </div>
            </div>

            <div style={{ background: 'white', padding: 24, borderRadius: 12, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#1C1209', fontSize: 18 }}>Property Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Type</div>
                  <div style={{ fontWeight: 600, color: '#1C1209' }}>{listing.type}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Gender</div>
                  <div style={{ fontWeight: 600, color: '#1C1209' }}>{listing.gender}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Deposit</div>
                  <div style={{ fontWeight: 600, color: '#1C1209' }}>{listing.deposit ? `KSh ${listing.deposit.toLocaleString()}` : 'None'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Distance</div>
                  <div style={{ fontWeight: 600, color: '#1C1209' }}>{listing.distance || 'N/A'}</div>
                </div>
              </div>
            </div>

            {listing.description && (
              <div style={{ background: 'white', padding: 24, borderRadius: 12, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#1C1209', fontSize: 18 }}>Description</h3>
                <p style={{ margin: 0, color: '#4a4a4a', lineHeight: 1.6, fontSize: 15 }}>{listing.description}</p>
              </div>
            )}

            {listing.amenities && listing.amenities.length > 0 && (
              <div style={{ background: 'white', padding: 24, borderRadius: 12, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#1C1209', fontSize: 18 }}>Amenities</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {listing.amenities.map((amenity: string, idx: number) => (
                    <span key={idx} style={{ background: '#F0EAE3', color: '#1C1209', padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
                      ✓ {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Contact & Info */}
          <div>
            <div style={{ background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', position: 'sticky', top: 90 }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#1C1209', fontSize: 18 }}>Interested in this property?</h3>
              
              {/* SAVE PROPERTY BUTTON */}
              <button 
                onClick={handleSaveProperty}
                disabled={saving}
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  background: isSaved ? '#E8F5E9' : 'white', 
                  color: isSaved ? '#2E7D32' : '#1C1209', 
                  border: '2px solid #DDD0C4', 
                  borderRadius: 10, 
                  cursor: saving ? 'not-allowed' : 'pointer', 
                  fontWeight: 700, 
                  fontSize: 15,
                  marginBottom: 15,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.2s'
                }}
              >
                {saving ? 'Processing...' : (isSaved ? '❤️ Saved to Favorites' : '🤍 Save to Favorites')}
              </button>

              {!showContact ? (
                <button 
                  onClick={handleContactClick}
                  style={{ 
                    width: '100%', 
                    padding: '16px', 
                    background: 'linear-gradient(135deg, #00C35D, #009E4B)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 10, 
                    cursor: 'pointer', 
                    fontWeight: 700, 
                    fontSize: 16,
                    boxShadow: '0 4px 15px rgba(0, 195, 93, 0.3)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  📞 Contact Landlord
                </button>
              ) : (
                <div style={{ background: '#E8F5E9', padding: 20, borderRadius: 10, border: '1px solid #C8E6C9' }}>
                  <div style={{ fontSize: 14, color: '#2E7D32', fontWeight: 600, marginBottom: 16 }}>
                    ✅ Contact Details Revealed
                  </div>
                  
                  {/* Landlord Name */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Landlord Name</div>
                    <div style={{ fontWeight: 700, color: '#1C1209', fontSize: 16 }}>{landlord?.name || 'Property Manager'}</div>
                  </div>
                  
                  {/* Phone Number */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Phone Number</div>
                    <div style={{ fontWeight: 700, color: '#1C1209', fontSize: 16 }}>
                      {landlord?.phone || 'Not provided'}
                    </div>
                  </div>
                  
                  {/* WhatsApp Button */}
                  {landlord?.phone && (
                    <button 
                      onClick={() => {
                        const phone = landlord.phone.replace(/\D/g, '')
                        const message = `Hi, I'm interested in ${listing.name} - KSh ${listing.price?.toLocaleString()}/month. Is it still available?`
                        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
                        window.open(whatsappUrl, '_blank')
                      }}
                      style={{ 
                        width: '100%', 
                        padding: '14px', 
                        background: '#25D366', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: 8, 
                        cursor: 'pointer', 
                        fontWeight: 700,
                        fontSize: 15,
                        marginBottom: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      💬 Chat on WhatsApp
                    </button>
                  )}
                  
                  {/* Call Button */}
                  {landlord?.phone && (
                    <button 
                      onClick={() => window.location.href = `tel:${landlord.phone}`}
                      style={{ 
                        width: '100%', 
                        padding: '14px', 
                        background: '#007BFF', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: 8, 
                        cursor: 'pointer', 
                        fontWeight: 700,
                        fontSize: 15,
                        marginBottom: 10
                      }}
                    >
                      📞 Call Now
                    </button>
                  )}
                  
                  {/* Email as fallback */}
                  {landlord?.email && (
                    <button 
                      onClick={() => window.location.href = `mailto:${landlord.email}?subject=Inquiry about ${listing.name}`}
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        background: 'white', 
                        color: '#007BFF', 
                        border: '2px solid #007BFF', 
                        borderRadius: 8, 
                        cursor: 'pointer', 
                        fontWeight: 600,
                        fontSize: 14
                      }}
                    >
                      ✉️ Send Email
                    </button>
                  )}
                </div>
              )}
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#6B5B4E', fontSize: 14 }}>Nearest Institution</span>
                  <span style={{ fontWeight: 600, color: '#1C1209', fontSize: 14 }}>{listing.institution}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6B5B4E', fontSize: 14 }}>Property ID</span>
                  <span style={{ fontWeight: 600, color: '#999', fontSize: 12 }}>#{listing.id.substring(0, 8)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

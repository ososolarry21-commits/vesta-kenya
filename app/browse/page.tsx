'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function BrowseListings() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchListings();
  }, []);

  async function fetchListings() {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching listings:', error);
    else setListings(data || []);
    setLoading(false);
  }

  async function trackView(listingId: string) {
    try {
      await supabase
        .from('listings')
        .update({ views: (listings.find(l => l.id === listingId)?.views || 0) + 1 })
        .eq('id', listingId);
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  }

  const filteredListings = listings.filter((listing) => {
    const matchesSearch =
      searchTerm === '' ||
      listing.institution?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === '' || listing.type === filterType;
    const matchesGender =
      filterGender === '' || listing.gender === filterGender;
    const matchesPrice = maxPrice === '' || listing.price <= Number(maxPrice);

    return matchesSearch && matchesType && matchesGender && matchesPrice;
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FDF8F3',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflowX: 'hidden',
      }}
    >
      {/* Navigation */}
      <nav
        style={{
          background: 'white',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 15px rgba(0,0,0,0.05)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        {/* AESTHETIC LOGO */}
        <div
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => router.push('/')}
        >
          <img
            src="/logo.png"
            alt="Vesta"
            style={{
              height: '45px',
              width: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => router.push('/browse/saved')}
            style={{
              padding: '8px 12px',
              background: 'transparent',
              border: '2px solid #DDD0C4',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            ❤️
          </button>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '8px 16px',
              background: '#D4873A',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1C1209 0%, #3A2A1D 100%)',
          minHeight: '220px',
          padding: '40px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'clamp(24px, 5vw, 36px)',
              fontWeight: 700,
              margin: 0,
              color: 'white',
              lineHeight: 1.3,
            }}
          >
            Find Your Perfect
            <br />
            Student Home 🏠
          </h1>
          <p
            style={{
              fontSize: 14,
              opacity: 0.8,
              margin: '12px 0 0 0',
              color: '#DDD0C4',
            }}
          >
            Browse verified student accommodation near top Kenyan universities
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div
        style={{
          padding: '20px',
          background: 'white',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <input
            placeholder="🔍 Search universities, areas, or property names..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '14px',
              border: '2px solid #DDD0C4',
              borderRadius: 10,
              fontSize: 16,
              outline: 'none',
              marginBottom: 12,
              boxSizing: 'border-box',
              color: '#1C1209',
            }}
          />

          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              width: '100%',
              padding: '12px',
              background: showFilters ? '#1C1209' : '#F0EAE3',
              color: showFilters ? 'white' : '#1C1209',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              marginBottom: 12,
              transition: 'all 0.2s ease',
            }}
          >
            {showFilters ? '✕ Hide Filters' : '️ Show Filters'}
          </button>

          {showFilters && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                animation: 'slideDown 0.3s ease-out',
              }}
            >
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #DDD0C4',
                  borderRadius: 8,
                  fontSize: 16,
                  background: 'white',
                  color: '#1C1209',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">All Property Types</option>
                <option>Bedsitter</option>
                <option>Single Room</option>
                <option>1-Bedroom</option>
                <option>Shared Room</option>
                <option>Hostel</option>
                <option>Studio</option>
              </select>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #DDD0C4',
                  borderRadius: 8,
                  fontSize: 16,
                  background: 'white',
                  color: '#1C1209',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">All Genders</option>
                <option>Mixed</option>
                <option>Ladies Only</option>
                <option>Gents Only</option>
              </select>
              <input
                type="number"
                placeholder="💰 Max Price (KSh)"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #DDD0C4',
                  borderRadius: 8,
                  fontSize: 16,
                  boxSizing: 'border-box',
                  color: '#1C1209',
                }}
              />
            </div>
          )}

          <div style={{ fontSize: 13, color: '#6B5B4E', marginTop: 8 }}>
            Showing <strong>{filteredListings.length}</strong> of{' '}
            {listings.length} listings
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      <div style={{ padding: '20px', maxWidth: 1200, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6B5B4E' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
            <div>Loading listings...</div>
          </div>
        ) : filteredListings.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 60,
              background: 'white',
              borderRadius: 16,
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 20 }}>🔍</div>
            <h2 style={{ color: '#1C1209', marginBottom: 12, fontSize: 20 }}>
              No Listings Found
            </h2>
            <p style={{ color: '#6B5B4E', fontSize: 14 }}>
              Try adjusting your search filters
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 20,
            }}
          >
            {filteredListings.map((listing, index) => (
              <div
                key={listing.id}
                onClick={() => {
                  trackView(listing.id);
                  router.push(`/browse/${listing.id}`);
                }}
                style={{
                  background: 'white',
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow =
                    '0 12px 30px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow =
                    '0 4px 20px rgba(0,0,0,0.06)';
                }}
              >
                <div
                  style={{
                    height: 200,
                    background: listing.images?.[0]
                      ? `url("${listing.images[0]}") center/cover`
                      : 'linear-gradient(135deg, #D4873A, #E8B86D)',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      background: 'rgba(28,18,9,0.85)',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {listing.type}
                  </div>
                  {listing.is_verified && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        background: 'linear-gradient(135deg, #007BFF, #0056b3)',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 800,
                        boxShadow: '0 2px 10px rgba(0,123,255,0.3)',
                      }}
                    >
                      ★ VERIFIED
                    </div>
                  )}
                </div>
                <div style={{ padding: 16 }}>
                  <h3
                    style={{
                      margin: '0 0 6px 0',
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#1C1209',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {listing.name}
                  </h3>
                  <p
                    style={{
                      margin: '0 0 12px 0',
                      fontSize: 13,
                      color: '#6B5B4E',
                    }}
                  >
                    📍 {listing.area}, {listing.city}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: '#D4873A',
                      }}
                    >
                      KSh {listing.price?.toLocaleString()}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#6B5B4E',
                        background: '#F0EAE3',
                        padding: '4px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {listing.gender}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B5B4E' }}>
                    🎓 {listing.institution} • {listing.distance}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

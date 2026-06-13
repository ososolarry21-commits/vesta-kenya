'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function SavedHomes() {
  const [savedListings, setSavedListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);

      // 1. Get all saved listing IDs for this user
      const { data: savedData } = await supabase
        .from('saved_properties')
        .select('listing_id')
        .eq('user_id', user.id);

      if (savedData && savedData.length > 0) {
        const listingIds = savedData.map((s) => s.listing_id);

        // 2. Fetch the actual listings
        const { data: listings } = await supabase
          .from('listings')
          .select('*')
          .in('id', listingIds);

        setSavedListings(listings || []);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const removeSaved = async (listingId: string) => {
    await supabase
      .from('saved_properties')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId);
    setSavedListings(savedListings.filter((l) => l.id !== listingId));
  };

  if (loading)
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Loading...
      </div>
    );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FDF8F3',
        fontFamily: 'sans-serif',
      }}
    >
      <nav
        style={{
          background: 'white',
          padding: '20px 60px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 20px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
          }}
          onClick={() => router.push('/browse')}
        >
          <div style={{ fontSize: 32 }}>🎓</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1C1209' }}>
            Vesta<span style={{ color: '#D4873A' }}>.</span>
          </div>
        </div>
        <button
          onClick={() => router.push('/browse')}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            border: '2px solid #DDD0C4',
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          ← Back to Browse
        </button>
      </nav>

      <div style={{ padding: '40px 60px', maxWidth: 1400, margin: '0 auto' }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#1C1209',
            marginBottom: 30,
          }}
        >
          ❤️ My Saved Homes ({savedListings.length})
        </h1>

        {savedListings.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 60,
              background: 'white',
              borderRadius: 16,
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 20 }}>💔</div>
            <h2 style={{ color: '#1C1209' }}>No saved homes yet</h2>
            <p style={{ color: '#6B5B4E' }}>
              Browse properties and click the heart icon to save them here.
            </p>
            <button
              onClick={() => router.push('/browse')}
              style={{
                marginTop: 20,
                padding: '12px 24px',
                background: '#D4873A',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Browse Homes
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 24,
            }}
          >
            {savedListings.map((listing) => (
              <div
                key={listing.id}
                style={{
                  background: 'white',
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                }}
              >
                <div
                  onClick={() => router.push(`/browse/${listing.id}`)}
                  style={{
                    height: 200,
                    background: listing.images?.[0]
                      ? `url("${listing.images[0]}") center/cover`
                      : '#eee',
                    cursor: 'pointer',
                  }}
                />
                <div style={{ padding: 20 }}>
                  <h3
                    style={{
                      margin: '0 0 8px 0',
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#1C1209',
                    }}
                  >
                    {listing.name}
                  </h3>
                  <p
                    style={{
                      margin: '0 0 12px 0',
                      fontSize: 14,
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
                    }}
                  >
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: '#D4873A',
                      }}
                    >
                      KSh {listing.price?.toLocaleString()}/mo
                    </div>
                    <button
                      onClick={() => removeSaved(listing.id)}
                      style={{
                        padding: '8px 16px',
                        background: '#FEE2E2',
                        color: '#DC2626',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

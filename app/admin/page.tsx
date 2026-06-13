'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function AdminPanel() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [listings, setListings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }
    setUser(user);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      setIsAdmin(false);
    } else {
      setIsAdmin(true);
      fetchListings();
      fetchReviews();
    }
    setLoading(false);
  }

  async function fetchListings() {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setListings(data);
  }

  async function fetchReviews() {
    const { data } = await supabase
      .from('reviews')
      .select('*, listings(name), profiles(name)')
      .order('created_at', { ascending: false });
    if (data) setReviews(data);
  }

  async function updateStatus(id: string, newStatus: string) {
    await supabase.from('listings').update({ status: newStatus }).eq('id', id);
    fetchListings();
  }

  async function submitResponse(reviewId: string) {
    await supabase
      .from('reviews')
      .update({ admin_response: responseText })
      .eq('id', reviewId);
    setRespondingId(null);
    setResponseText('');
    fetchReviews();
  }

  if (loading) return <div style={{ padding: 40 }}>Loading admin panel...</div>;

  if (!isAdmin) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FDF8F3',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            background: 'white',
            padding: 40,
            borderRadius: 16,
          }}
        >
          <h2> Access Denied</h2>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              padding: '10px 20px',
              background: '#D4873A',
              color: 'white',
              border: 'none',
              borderRadius: 8,
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const filteredListings = listings.filter((l) => l.status === activeTab);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FDF8F3',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header */}
      <nav
        style={{
          background: '#1C1209',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'white',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => router.push('/')}
        >
          <img
            src="/logo.png"
            alt="Vesta"
            style={{
              height: '40px',
              width: 'auto',
              filter: 'brightness(0) invert(1)',
            }}
          />
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid #D4873A',
            color: '#D4873A',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Back to Dashboard
        </button>
      </nav>

      <div style={{ padding: '20px', maxWidth: 1200, margin: '0 auto' }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#1C1209',
            marginBottom: 20,
          }}
        >
          Admin Moderation
        </h1>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 20,
            overflowX: 'auto',
            paddingBottom: 8,
          }}
        >
          {['pending', 'approved', 'rejected', 'reviews'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 20px',
                background: activeTab === tab ? '#D4873A' : 'white',
                color: activeTab === tab ? 'white' : '#1C1209',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
              }}
            >
              {tab}{' '}
              {tab === 'reviews'
                ? `(${reviews.length})`
                : `(${listings.filter((l) => l.status === tab).length})`}
            </button>
          ))}
        </div>

        {/* REVIEWS TAB CONTENT */}
        {activeTab === 'reviews' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reviews.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: 40,
                  background: 'white',
                  borderRadius: 12,
                }}
              >
                No reviews yet.
              </div>
            ) : (
              reviews.map((review) => (
                <div
                  key={review.id}
                  style={{
                    background: 'white',
                    padding: 20,
                    borderRadius: 12,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <strong>{review.profiles?.name}</strong> reviewed{' '}
                      <strong>{review.listings?.name}</strong>
                      <span style={{ color: '#FFD700', marginLeft: 8 }}>
                        {'★'.repeat(review.rating)}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: '#666' }}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 12px 0', color: '#333' }}>
                    {review.comment}
                  </p>

                  {review.admin_response ? (
                    <div
                      style={{
                        background: '#F0F7FF',
                        padding: 12,
                        borderRadius: 8,
                        borderLeft: '4px solid #007BFF',
                      }}
                    >
                      <strong style={{ color: '#007BFF', fontSize: 13 }}>
                        Admin Response:
                      </strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: 14 }}>
                        {review.admin_response}
                      </p>
                    </div>
                  ) : respondingId === review.id ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Type your response..."
                        style={{
                          flex: 1,
                          padding: 10,
                          border: '1px solid #DDD0C4',
                          borderRadius: 6,
                        }}
                      />
                      <button
                        onClick={() => submitResponse(review.id)}
                        style={{
                          padding: '10px 16px',
                          background: '#007BFF',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                        }}
                      >
                        Send
                      </button>
                      <button
                        onClick={() => setRespondingId(null)}
                        style={{
                          padding: '10px 16px',
                          background: '#eee',
                          color: '#333',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRespondingId(review.id)}
                      style={{
                        padding: '8px 16px',
                        background: '#007BFF',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      Respond to Review
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* LISTINGS TAB CONTENT */}
        {activeTab !== 'reviews' &&
          (filteredListings.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                background: 'white',
                borderRadius: 12,
              }}
            >
              No {activeTab} listings found.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {filteredListings.map((listing) => (
                <div
                  key={listing.id}
                  style={{
                    background: 'white',
                    padding: 20,
                    borderRadius: 12,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    display: 'flex',
                    gap: 20,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 8,
                      flexShrink: 0,
                      background: listing.images?.[0]
                        ? `url("${listing.images[0]}") center/cover`
                        : '#eee',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: 18 }}>
                      {listing.name}
                    </h3>
                    <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
                      📍 {listing.area} • KSh {listing.price?.toLocaleString()}
                    </p>
                  </div>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                  >
                    {activeTab === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(listing.id, 'approved')}
                          style={{
                            padding: '8px 16px',
                            background: '#2A7A5A',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(listing.id, 'rejected')}
                          style={{
                            padding: '8px 16px',
                            background: '#DC3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {activeTab === 'approved' && (
                      <>
                        <button
                          onClick={async () => {
                            await supabase
                              .from('listings')
                              .update({ is_verified: !listing.is_verified })
                              .eq('id', listing.id);
                            fetchListings();
                          }}
                          style={{
                            padding: '8px 16px',
                            background: listing.is_verified
                              ? '#FFC107'
                              : '#007BFF',
                            color: listing.is_verified ? '#000' : 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          {listing.is_verified
                            ? '★ Remove Verification'
                            : '★ Mark Verified'}
                        </button>
                        <button
                          onClick={() => updateStatus(listing.id, 'pending')}
                          style={{
                            padding: '8px 16px',
                            background: '#F0EAE3',
                            color: '#1C1209',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          Revert
                        </button>
                      </>
                    )}
                    {activeTab === 'rejected' && (
                      <button
                        onClick={() => updateStatus(listing.id, 'approved')}
                        style={{
                          padding: '8px 16px',
                          background: '#2A7A5A',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                        }}
                      >
                        Approve Anyway
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

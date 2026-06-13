'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function PropertyPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [listing, setListing] = useState<any>(null);
  const [landlordPhone, setLandlordPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Review States
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      const { data: listingData } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();
      if (!listingData) {
        router.push('/browse');
        return;
      }
      setListing(listingData);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', listingData.landlord_id)
        .single();
      if (profileData?.phone) setLandlordPhone(profileData.phone);

      // Fetch Reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, profiles(name, role)')
        .eq('listing_id', id)
        .order('created_at', { ascending: false });

      if (reviewsData) setReviews(reviewsData);

      if (user) {
        const { data: savedData } = await supabase
          .from('saved_properties')
          .select('id')
          .eq('user_id', user.id)
          .eq('listing_id', id)
          .single();
        setIsSaved(!!savedData);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleWhatsAppClick = () => {
    let cleanNumber = landlordPhone.replace(/[\s\-\+]/g, '');
    if (cleanNumber.startsWith('0'))
      cleanNumber = '254' + cleanNumber.substring(1);
    else if (!cleanNumber.startsWith('254')) cleanNumber = '254' + cleanNumber;

    const message = encodeURIComponent(
      `Hi! I found your listing "${listing.name}" on Vesta Kenya. Is it still available?`
    );
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  const toggleSave = async () => {
    if (!user) {
      alert('Please log in to save properties!');
      router.push('/');
      return;
    }
    setSaving(true);
    if (isSaved) {
      await supabase
        .from('saved_properties')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', id);
      setIsSaved(false);
    } else {
      await supabase
        .from('saved_properties')
        .insert({ user_id: user.id, listing_id: id });
      setIsSaved(true);
    }
    setSaving(false);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to leave a review!');
      router.push('/');
      return;
    }
    setSubmittingReview(true);

    const { error } = await supabase.from('reviews').insert({
      listing_id: id,
      user_id: user.id,
      rating: rating,
      comment: comment,
    });

    if (error) {
      alert('Error submitting review: ' + error.message);
    } else {
      setComment('');
      setRating(5);
      // Refresh reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, profiles(name, role)')
        .eq('listing_id', id)
        .order('created_at', { ascending: false });
      if (reviewsData) setReviews(reviewsData);
    }
    setSubmittingReview(false);
  };

  if (loading)
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
        Loading...
      </div>
    );
  if (!listing) return null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FDF8F3',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Navigation */}
      <nav
        style={{
          background: 'white',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 20px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => router.push('/browse')}
        >
          <img
            src="/logo.png"
            alt="Vesta"
            style={{ height: '45px', width: 'auto', objectFit: 'contain' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => router.push('/browse/saved')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '2px solid #DDD0C4',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ❤️ Saved
          </button>
          <button
            onClick={() => router.push('/browse')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '2px solid #DDD0C4',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ← Back
          </button>
        </div>
      </nav>

      {/* Main Image */}
      <div
        style={{
          height: 350,
          background: listing.images?.[0]
            ? `url("${listing.images[0]}") center/cover`
            : 'linear-gradient(135deg, #D4873A, #E8B86D)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            left: 20,
            right: 20,
            color: 'white',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              background: '#D4873A',
              padding: '6px 16px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            {listing.type}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>
              {listing.name}
            </h1>
            {listing.is_verified && (
              <span
                style={{
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  color: '#1C1209',
                  fontSize: 12,
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontWeight: 800,
                }}
              >
                ★ VESTA VERIFIED
              </span>
            )}
          </div>
          <p style={{ fontSize: 16, margin: '8px 0 0 0', opacity: 0.9 }}>
            📍 {listing.area}, {listing.city}
          </p>
        </div>
      </div>

      {/* Content Grid */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 30,
        }}
      >
        {/* Left Column: Details & Reviews */}
        <div>
          {/* Property Details */}
          <div
            style={{
              background: 'white',
              padding: 24,
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              marginBottom: 24,
            }}
          >
            <h2 style={{ color: '#1C1209', marginTop: 0 }}>
              About this property
            </h2>
            <p style={{ color: '#6B5B4E', lineHeight: 1.6 }}>
              {listing.description || 'No description provided.'}
            </p>

            <h3 style={{ color: '#1C1209', marginTop: 24 }}>
              Amenities & Features
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {listing.amenities?.map((amenity: string, i: number) => (
                <span
                  key={i}
                  style={{
                    background: '#F0EAE3',
                    color: '#1C1209',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>

          {/* REVIEWS SECTION */}
          <div
            style={{
              background: 'white',
              padding: 24,
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            }}
          >
            <h2
              style={{
                color: '#1C1209',
                marginTop: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              Student Reviews
              <span style={{ fontSize: 14, color: '#6B5B4E', fontWeight: 500 }}>
                {reviews.length} reviews
              </span>
            </h2>

            {/* Submit Review Form */}
            <form
              onSubmit={submitReview}
              style={{
                marginBottom: 24,
                padding: 16,
                background: '#FDF8F3',
                borderRadius: 12,
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>
                Leave a Review
              </h3>
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{ fontSize: 13, fontWeight: 600, color: '#1C1209' }}
                >
                  Rating:
                </label>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 24,
                        color: star <= rating ? '#FFD700' : '#DDD0C4',
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                placeholder="Share your experience with this property..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                rows={3}
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #DDD0C4',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box',
                  marginBottom: 12,
                }}
              />
              <button
                type="submit"
                disabled={submittingReview}
                style={{
                  padding: '10px 20px',
                  background: '#D4873A',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {submittingReview ? 'Posting...' : 'Post Review'}
              </button>
            </form>

            {/* Reviews List */}
            {reviews.length === 0 ? (
              <p style={{ color: '#6B5B4E', textAlign: 'center', padding: 20 }}>
                No reviews yet. Be the first!
              </p>
            ) : (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    style={{
                      borderBottom: '1px solid #F0EAE3',
                      paddingBottom: 16,
                    }}
                  >
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            background: '#D4873A',
                            color: 'white',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          {review.profiles?.name?.charAt(0).toUpperCase() ||
                            'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {review.profiles?.name || 'Anonymous'}
                          </div>
                          <div style={{ color: '#FFD700', fontSize: 12 }}>
                            {'★'.repeat(review.rating)}
                            {'☆'.repeat(5 - review.rating)}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: '#999' }}>
                        {new Date(review.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <p
                      style={{
                        margin: '0 0 12px 0',
                        fontSize: 14,
                        color: '#333',
                        lineHeight: 1.5,
                      }}
                    >
                      {review.comment}
                    </p>

                    {/* Admin Response */}
                    {review.admin_response && (
                      <div
                        style={{
                          background: '#F0F7FF',
                          padding: 12,
                          borderRadius: 8,
                          borderLeft: '4px solid #007BFF',
                          marginLeft: 40,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#007BFF',
                            marginBottom: 4,
                          }}
                        >
                          ️ Vesta Admin Response
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: '#333' }}>
                          {review.admin_response}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pricing & Contact */}
        <div>
          <div
            style={{
              background: 'white',
              padding: 24,
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              position: 'sticky',
              top: 20,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: '#D4873A',
                marginBottom: 8,
              }}
            >
              KSh {listing.price?.toLocaleString()}
              <span style={{ fontSize: 14, color: '#6B5B4E', fontWeight: 500 }}>
                /month
              </span>
            </div>
            {listing.deposit && (
              <div style={{ fontSize: 14, color: '#6B5B4E', marginBottom: 20 }}>
                Deposit: KSh {listing.deposit?.toLocaleString()}
              </div>
            )}

            <div
              style={{
                borderTop: '1px solid #eee',
                paddingTop: 16,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span style={{ color: '#6B5B4E', fontSize: 13 }}>
                  Property Type
                </span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {listing.type}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span style={{ color: '#6B5B4E', fontSize: 13 }}>Gender</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {listing.gender}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B5B4E', fontSize: 13 }}>Distance</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {listing.distance}
                </span>
              </div>
            </div>

            <button
              onClick={toggleSave}
              disabled={saving}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: 12,
                background: isSaved ? '#FEE2E2' : 'white',
                color: isSaved ? '#DC2626' : '#1C1209',
                border: isSaved ? '2px solid #DC2626' : '2px solid #DDD0C4',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isSaved ? '❤️ Saved' : ' Save Property'}
            </button>

            <button
              onClick={handleWhatsAppClick}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #25D366, #128C7E)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Contact via WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

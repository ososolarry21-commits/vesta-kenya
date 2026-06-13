'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function NewListing() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    area: '',
    city: 'Nairobi',
    price: '',
    deposit: '',
    institution: '',
    distance: '',
    type: 'Bedsitter',
    gender: 'Mixed',
    description: '',
    amenities: '',
    phone: '', // Added phone here
  });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/');
      else setUser(data.user);
    });
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImages(files);
      const previews = files.map((file) => URL.createObjectURL(file));
      setImagePreviews(previews);
    }
  };

  async function uploadImages(listingId: string) {
    const urls: string[] = [];
    for (const image of images) {
      const fileExt = image.name.split('.').pop();
      const fileName = `${listingId}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, image);

      if (uploadError) continue;

      const { data } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);
      if (data.publicUrl) urls.push(data.publicUrl);
    }
    return urls;
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // 1. Update the user's profile with their phone number
      if (form.phone) {
        await supabase
          .from('profiles')
          .update({ phone: form.phone })
          .eq('id', user.id);
      }

      const amenitiesArray = form.amenities
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a);

      // 2. Create the listing
      const { data: listingData, error: insertError } = await supabase
        .from('listings')
        .insert({
          landlord_id: user.id,
          name: form.name,
          area: form.area,
          city: form.city,
          price: Number(form.price),
          deposit: Number(form.deposit),
          institution: form.institution,
          distance: form.distance,
          type: form.type,
          gender: form.gender,
          description: form.description,
          amenities: amenitiesArray,
          images: [],
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Upload images if any
      if (images.length > 0) {
        setUploadingImages(true);
        const imageUrls = await uploadImages(listingData.id);
        await supabase
          .from('listings')
          .update({ images: imageUrls })
          .eq('id', listingData.id);
        setUploadingImages(false);
      }

      setSuccess(true);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FDF8F3',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            background: 'white',
            padding: 60,
            borderRadius: 24,
            boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 20 }}>🎓✅</div>
          <h2 style={{ fontSize: 28, color: '#1C1209', marginBottom: 12 }}>
            Listing Submitted!
          </h2>
          <p style={{ color: '#6B5B4E', marginBottom: 32 }}>
            Your student accommodation is pending review.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              padding: '14px 32px',
              background: '#D4873A',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FDF8F3',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
          onClick={() => router.push('/dashboard')}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1C1209' }}>
            Vesta<span style={{ color: '#D4873A' }}>.</span>
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            border: '2px solid #DDD0C4',
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          ← Back
        </button>
      </nav>

      <div
        style={{
          background:
            'url("https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1920&h=400&fit=crop") center/cover',
          height: 250,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          padding: '0 60px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to right, rgba(28,18,9,0.9), rgba(28,18,9,0.4))',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, color: 'white' }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>
            List Student Accommodation
          </h1>
          <p style={{ fontSize: 16, opacity: 0.8, margin: '8px 0 0 0' }}>
            Reach thousands of students from top Kenyan universities.
          </p>
        </div>
      </div>

      <div
        style={{
          maxWidth: 900,
          margin: '-40px auto 60px',
          padding: '0 20px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'white',
            padding: 40,
            borderRadius: 20,
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
          }}
        >
          {/* Image Upload */}
          <div
            style={{
              marginBottom: 30,
              padding: 30,
              background:
                'linear-gradient(135deg, rgba(212,135,58,0.05), rgba(232,184,109,0.05))',
              borderRadius: 16,
              border: '2px dashed #D4873A',
            }}
          >
            <label style={labelStyle}>📸 Property Photos</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              style={inputStyle}
            />
            {imagePreviews.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 12,
                  marginTop: 20,
                }}
              >
                {imagePreviews.map((preview, index) => (
                  <div
                    key={index}
                    style={{
                      position: 'relative',
                      borderRadius: 10,
                      overflow: 'hidden',
                      aspectRatio: '1',
                    }}
                  >
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        background: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {index === 0 ? ' Cover' : `#${index + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Basic Info */}
          <h3 style={{ color: '#D4873A', marginBottom: 20, marginTop: 0 }}>
            🏠 Basic Information
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 20,
              marginBottom: 20,
            }}
          >
            <div>
              <label style={labelStyle}>Property Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. JKUAT Gate B Bedsitters"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Room Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                style={inputStyle}
              >
                <option>Bedsitter</option>
                <option>Single Room</option>
                <option>1-Bedroom</option>
                <option>Shared Room</option>
                <option>Hostel</option>
                <option>Studio</option>
              </select>
            </div>
          </div>

          {/* Location & Proximity */}
          <h3 style={{ color: '#D4873A', marginBottom: 20, marginTop: 30 }}>
            {' '}
            Location & Campus Proximity
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 20,
              marginBottom: 20,
            }}
          >
            <div>
              <label style={labelStyle}>Area *</label>
              <input
                required
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                placeholder="e.g. Juja, Roysambu"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>City *</label>
              <input
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="e.g. Nairobi"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Distance to Campus *</label>
              <input
                required
                value={form.distance}
                onChange={(e) => setForm({ ...form, distance: e.target.value })}
                placeholder="e.g. 5 mins walk"
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Nearest University/College *</label>
            <input
              required
              value={form.institution}
              onChange={(e) =>
                setForm({ ...form, institution: e.target.value })
              }
              placeholder="e.g. University of Nairobi, JKUAT, Strathmore..."
              style={inputStyle}
            />
          </div>

          {/* Financials */}
          <h3 style={{ color: '#D4873A', marginBottom: 20, marginTop: 30 }}>
            {' '}
            Financials
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 20,
              marginBottom: 20,
            }}
          >
            <div>
              <label style={labelStyle}>Monthly Rent (KSh) *</label>
              <input
                required
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="e.g. 8500"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Deposit (KSh)</label>
              <input
                type="number"
                value={form.deposit}
                onChange={(e) => setForm({ ...form, deposit: e.target.value })}
                placeholder="e.g. 8500"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Rules & Amenities */}
          <h3 style={{ color: '#D4873A', marginBottom: 20, marginTop: 30 }}>
            📋 Rules & Amenities
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 20,
              marginBottom: 20,
            }}
          >
            <div>
              <label style={labelStyle}>Gender Preference *</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                style={inputStyle}
              >
                <option>Mixed</option>
                <option>Ladies Only</option>
                <option>Gents Only</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Amenities (comma separated)</label>
              <input
                value={form.amenities}
                onChange={(e) =>
                  setForm({ ...form, amenities: e.target.value })
                }
                placeholder="e.g. WiFi, Borehole, Security, Parking"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 30 }}>
            <label style={labelStyle}>Description & House Rules</label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={4}
              placeholder="Describe the property, visiting hours, noise rules, etc..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* NEW: Contact Information */}
          <h3 style={{ color: '#D4873A', marginBottom: 20, marginTop: 30 }}>
            📞 Contact Information
          </h3>
          <div style={{ marginBottom: 30 }}>
            <label style={labelStyle}>WhatsApp / Phone Number *</label>
            <input
              required
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g. 0712345678"
              style={inputStyle}
            />
            <p style={{ fontSize: 12, color: '#6B5B4E', margin: '6px 0 0 0' }}>
              Students will use this number to contact you via WhatsApp.
            </p>
          </div>

          <button
            disabled={loading || uploadingImages}
            style={{
              width: '100%',
              padding: '16px',
              background:
                loading || uploadingImages
                  ? '#ccc'
                  : 'linear-gradient(135deg, #D4873A, #E8B86D)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              cursor: loading || uploadingImages ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 20px rgba(212,135,58,0.3)',
            }}
          >
            {uploadingImages
              ? '📸 Uploading Images...'
              : loading
              ? 'Submitting...'
              : 'Submit Listing for Review'}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  marginBottom: 8,
  fontWeight: 600,
  color: '#1C1209',
  fontSize: 14,
};
const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  border: '1px solid #DDD0C4',
  borderRadius: 10,
  fontSize: 15,
  boxSizing: 'border-box' as const,
  outline: 'none',
};

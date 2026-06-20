'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useParams } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function EditListing() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [fetching, setFetching] = useState(true);
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;

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
  });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [removeImages, setRemoveImages] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/');
      else {
        setUser(data.user);
        fetchListing(data.user.id);
      }
    });
  }, []);

  async function fetchListing(userId: string) {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .eq('landlord_id', userId)
      .single();

    if (error || !data) {
      alert("Listing not found or you don't have permission to edit it.");
      router.push('/dashboard');
      return;
    }

    setForm({
      name: data.name || '',
      area: data.area || '',
      city: data.city || 'Nairobi',
      price: data.price?.toString() || '',
      deposit: data.deposit?.toString() || '',
      institution: data.institution || '',
      distance: data.distance || '',
      type: data.type || 'Bedsitter',
      gender: data.gender || 'Mixed',
      description: data.description || '',
      amenities: data.amenities?.join(', ') || '',
    });

    setExistingImages(data.images || []);
    setFetching(false);
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImages(files);
      const previews = files.map((file) => URL.createObjectURL(file));
      setImagePreviews(previews);
    }
  };

  const handleRemoveExistingImage = (imageUrl: string) => {
    setRemoveImages([...removeImages, imageUrl]);
    setExistingImages(existingImages.filter((img) => img !== imageUrl));
  };

  async function uploadImages() {
    const urls: string[] = [...existingImages];
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
      const amenitiesArray = form.amenities
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a);

      let finalImages = existingImages;
      if (images.length > 0 || removeImages.length > 0) {
        setUploadingImages(true);
        finalImages = await uploadImages();
        setUploadingImages(false);
      }

      const { error } = await supabase
        .from('listings')
        .update({
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
          images: finalImages,
          status: 'pending', // Reset to pending when edited
        })
        .eq('id', listingId);

      if (error) throw error;

      alert('Listing updated successfully! It will be reviewed again.');
      router.push('/dashboard');
    } catch (error: any) {
      alert('Error updating listing: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
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
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 16, color: '#6B5B4E' }}>
            Loading listing...
          </div>
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
          ← Back to Dashboard
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
            Edit Property Listing
          </h1>
          <p style={{ fontSize: 16, opacity: 0.8, margin: '8px 0 0 0' }}>
            Update your property details. Note: Changes will require
            re-approval.
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
          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div style={{ marginBottom: 30 }}>
              <label style={labelStyle}>Current Photos</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 12,
                }}
              >
                {existingImages.map((img, index) => (
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
                      src={img}
                      alt={`Current ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingImage(img)}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: '#DC3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: 28,
                        height: 28,
                        cursor: 'pointer',
                        fontSize: 16,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ×
                    </button>
                    {index === 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 8,
                          left: 8,
                          background: 'rgba(212,135,58,0.95)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        🏆 Cover
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload New Images */}
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
            <label
              style={{
                display: 'block',
                marginBottom: 12,
                fontWeight: 700,
                color: '#1C1209',
                fontSize: 16,
              }}
            >
              📸 Add New Photos
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              style={{
                width: '100%',
                padding: '16px',
                background: 'white',
                border: '2px solid #DDD0C4',
                borderRadius: 10,
                fontSize: 14,
                cursor: 'pointer',
              }}
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
                      alt={`New ${index + 1}`}
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
                        background: 'rgba(42,157,90,0.95)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      NEW
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Fields */}
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
                style={inputStyle as React.CSSProperties}
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

          <h3 style={{ color: '#D4873A', marginBottom: 20, marginTop: 30 }}>
            📍 Location & Campus Proximity
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

          <h3 style={{ color: '#D4873A', marginBottom: 20, marginTop: 30 }}>
            💰 Financials
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

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              style={{
                flex: 1,
                padding: '16px',
                background: '#F0EAE3',
                color: '#1C1209',
                border: 'none',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              disabled={loading || uploadingImages}
              style={{
                flex: 2,
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
                ? ' Uploading Images...'
                : loading
                ? 'Updating Listing...'
                : 'Update Listing'}
            </button>
          </div>
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
  boxSizing: 'border-box',
  outline: 'none',
};

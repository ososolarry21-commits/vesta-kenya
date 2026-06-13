'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);

      const { data } = await supabase
        .from('profiles')
        .select('name, phone')
        .eq('id', user.id)
        .single();

      if (data) {
        setName(data.name || '');
        setPhone(data.phone || '');
      }
    };
    loadData();
  }, []);

  async function handleUpdateProfile(e: any) {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    const { error } = await supabase
      .from('profiles')
      .update({ name, phone })
      .eq('id', user.id);

    if (error) {
      setMsg('Error updating profile: ' + error.message);
    } else {
      setMsg('Profile updated successfully!');
    }
    setLoading(false);
  }

  async function handleUpdatePassword(e: any) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMsg('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setMsg('');

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setMsg('Error changing password: ' + error.message);
    } else {
      setMsg('Password changed successfully!');
      setNewPassword(''); // Clear the field
    }
    setLoading(false);
  }

  if (!user) return <div style={{ padding: 40 }}>Loading...</div>;

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

      <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#1C1209',
            marginBottom: 30,
          }}
        >
          Account Settings
        </h1>

        {msg && (
          <div
            style={{
              padding: '16px',
              background: msg.includes('successfully') ? '#D4EDDA' : '#F8D7DA',
              color: msg.includes('successfully') ? '#155724' : '#721C24',
              borderRadius: 10,
              marginBottom: 24,
              fontWeight: 600,
            }}
          >
            {msg}
          </div>
        )}

        {/* Profile Settings */}
        <div
          style={{
            background: 'white',
            padding: 32,
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: '#1C1209',
              fontSize: 20,
              marginBottom: 24,
            }}
          >
            Profile Information
          </h2>
          <form onSubmit={handleUpdateProfile}>
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  color: '#1C1209',
                }}
              >
                Full Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid #DDD0C4',
                  borderRadius: 10,
                  fontSize: 15,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  color: '#1C1209',
                }}
              >
                WhatsApp / Phone Number
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0712345678"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid #DDD0C4',
                  borderRadius: 10,
                  fontSize: 15,
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ fontSize: 12, color: '#6B5B4E', marginTop: 6 }}>
                This number will be used for the WhatsApp contact button on your
                listings.
              </p>
            </div>
            <button
              disabled={loading}
              style={{
                padding: '12px 24px',
                background: '#D4873A',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              {loading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Password Settings */}
        <div
          style={{
            background: 'white',
            padding: 32,
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: '#1C1209',
              fontSize: 20,
              marginBottom: 24,
            }}
          >
            Change Password
          </h2>
          <form onSubmit={handleUpdatePassword}>
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  color: '#1C1209',
                }}
              >
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter a new password (min 6 characters)"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid #DDD0C4',
                  borderRadius: 10,
                  fontSize: 15,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              disabled={loading || !newPassword}
              style={{
                padding: '12px 24px',
                background: '#333',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: loading || !newPassword ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

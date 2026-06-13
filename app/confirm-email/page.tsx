'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function ConfirmEmail() {
  const [status, setStatus] = useState('verifying');
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');

    if (type === 'signup' && token) {
      verifyEmail(token);
    }
  }, [searchParams]);

  async function verifyEmail(token: string) {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'signup',
      });

      if (error) throw error;

      setStatus('success');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (error: any) {
      console.error('Verification error:', error);
      setStatus('error');
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 20,
      }}
    >
      <div
        style={{
          background: 'white',
          padding: 48,
          borderRadius: 24,
          textAlign: 'center',
          maxWidth: 450,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {status === 'verifying' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 20 }}>⏳</div>
            <h2 style={{ color: '#1C1209', marginBottom: 12 }}>
              Verifying your email...
            </h2>
            <p style={{ color: '#6B5B4E' }}>
              Please wait while we confirm your account.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
            <h2 style={{ color: '#2A7A5A', marginBottom: 12 }}>
              Email Verified!
            </h2>
            <p style={{ color: '#6B5B4E', marginBottom: 24 }}>
              Your account has been successfully verified. Redirecting to
              login...
            </p>
            <div
              style={{
                width: 50,
                height: 50,
                border: '4px solid #F0EAE3',
                borderTop: '4px solid #D4873A',
                borderRadius: '50%',
                margin: '0 auto',
                animation: 'spin 1s linear infinite',
              }}
            />
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 20 }}>❌</div>
            <h2 style={{ color: '#DC2626', marginBottom: 12 }}>
              Verification Failed
            </h2>
            <p style={{ color: '#6B5B4E', marginBottom: 24 }}>
              The verification link is invalid or has expired. Please sign up
              again.
            </p>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '12px 32px',
                background: '#D4873A',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Go to Login
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

'use client'
import { useEffect } from 'react'
import './globals.css'
import Footer from './components/footer'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase for the logout function
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export const metadata = {
  title: 'Vesta Kenya',
  description: 'Student Accommodation Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  
  // 90-Minute Security Timeout
  useEffect(() => {
    let logoutTimer: any;
    let warningTimer: any;

    const TIMEOUT_MS = 90 * 60 * 1000; // 90 minutes
    const WARNING_MS = 5 * 60 * 1000;  // Warn 5 minutes before

    const resetTimers = () => {
      clearTimeout(logoutTimer);
      clearTimeout(warningTimer);

      // Set warning (at 85 minutes)
      warningTimer = setTimeout(() => {
        alert("️ Security Alert: Your session will expire in 5 minutes due to inactivity. Please click OK to stay logged in.");
      }, TIMEOUT_MS - WARNING_MS);

      // Set logout (at 90 minutes)
      logoutTimer = setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
      }, TIMEOUT_MS);
    };

    // Reset timer whenever the user moves mouse, types, or scrolls
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, resetTimers));

    // Start the timer when page loads
    resetTimers();

    return () => {
      clearTimeout(logoutTimer);
      clearTimeout(warningTimer);
      events.forEach(evt => window.removeEventListener(evt, resetTimers));
    };
  }, []);

  return (
    <html lang="en">
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', margin: 0 }}>
        {children}
        <Footer />
      </body>
    </html>
  )
}

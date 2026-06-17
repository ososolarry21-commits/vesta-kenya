import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || ''
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || ''
const SHORTCODE = process.env.MPESA_SHORTCODE || '174379'
const PASSKEY = process.env.MPESA_PASSKEY || ''
const ENVIRONMENT = process.env.MPESA_ENVIRONMENT || 'sandbox'

const BASE_URL = ENVIRONMENT === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke'

async function getAccessToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64')
  const response = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { 'Authorization': `Basic ${auth}` }
  })
  const data = await response.json()
  return data.access_token
}

export async function POST(request: Request) {
  try {
    const { checkoutRequestId, listingId } = await request.json()
    
    const accessToken = await getAccessToken()
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64')
    
    const response = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      })
    })
    
    const data = await response.json()
    
    // If Safaricom says the payment was successful, update our database
    if (data.ResultCode === '0') {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      )
      
      await supabase
        .from('listings')
        .update({ 
          verification_payment_received: true,
          verification_receipt: 'Confirmed via Status Check',
          verification_requested_at: new Date().toISOString()
        })
        .eq('id', listingId)
        
      return NextResponse.json({ success: true, message: 'Payment confirmed and database updated!' })
    }
    
    return NextResponse.json({ success: false, message: data.ResultDesc || 'Payment not found or pending.' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}
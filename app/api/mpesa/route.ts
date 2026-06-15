import { NextResponse } from 'next/server'

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || ''
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || ''
const SHORTCODE = process.env.MPESA_SHORTCODE || '174379'
const PASSKEY = process.env.MPESA_PASSKEY || ''
const ENVIRONMENT = process.env.MPESA_ENVIRONMENT || 'sandbox'

const BASE_URL = ENVIRONMENT === 'production' 
  ? 'https://api.safaricom.co.ke' 
  : 'https://sandbox.safaricom.co.ke'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vesta-kenya.vercel.app'

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
    const { phoneNumber, amount, email } = await request.json()
    
    const accessToken = await getAccessToken()
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64')
    
    const callBackURL = `${APP_URL}/api/mpesa/callback`
    
    const response = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: SHORTCODE,
        PhoneNumber: phoneNumber,
        CallBackURL: callBackURL,
        AccountReference: email, // We use the email as the reference!
        TransactionDesc: 'Vesta Verification Fee'
      })
    })
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('M-Pesa Error:', error)
    return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 })
  }
}
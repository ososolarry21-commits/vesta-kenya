import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { Body } = body
    
    // Extract the result code and merchant request ID
    const resultCode = Body.stkCallback.ResultCode
    const merchantRequestId = Body.stkCallback.MerchantRequestID
    
    if (resultCode === 0) {
      // Payment successful
      const metadata = Body.stkCallback.CallbackMetadata.Item
      
      const mpesaReceipt = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value
      const amount = metadata.find((item: any) => item.Name === 'Amount')?.Value
      const phoneNumber = metadata.find((item: any) => item.Name === 'PhoneNumber')?.Value
      
      // Here you would update the landlord's profile to mark them as verified
      // For now, we'll just log it
      console.log('Payment successful:', {
        receipt: mpesaReceipt,
        amount,
        phoneNumber
      })
      
      // TODO: Update landlord profile in database
      // await supabase.from('profiles').update({ is_verified: true }).eq('phone', phoneNumber)
    } else {
      // Payment failed or cancelled
      console.log('Payment failed or cancelled:', Body.stkCallback.ResultDesc)
    }
    
    return NextResponse.json({ result: 'success' })
  } catch (error) {
    console.error('Callback Error:', error)
    return NextResponse.json({ error: 'Callback failed' }, { status: 500 })
  }
}
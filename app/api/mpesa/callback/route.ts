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
    
    const resultCode = Body.stkCallback.ResultCode
    
    console.log('M-Pesa Callback received:', { resultCode })
    
    if (resultCode === 0) {
      const metadata = Body.stkCallback.CallbackMetadata.Item
      
      const mpesaReceipt = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value
      const amount = metadata.find((item: any) => item.Name === 'Amount')?.Value
      const phoneNumber = metadata.find((item: any) => item.Name === 'PhoneNumber')?.Value
      
      // Get the listing ID from AccountReference
      const accountReference = metadata.find((item: any) => item.Name === 'AccountReference')?.Value
      const [listingId] = accountReference?.split(':') || []

      console.log('Payment successful for listing:', listingId, 'Receipt:', mpesaReceipt)
      
      if (listingId) {
        // Mark payment as received but NOT verified yet
        // Admin will manually verify after physical inspection
        const { error: updateError } = await supabase
          .from('listings')
          .update({ 
            verification_payment_received: true,
            verification_receipt: mpesaReceipt,
            verification_requested_at: new Date().toISOString(),
            is_verified: false // Don't auto-verify!
          })
          .eq('id', listingId)
        
        if (updateError) {
          console.error('Error updating listing:', updateError)
        } else {
          console.log('✅ Payment recorded. Awaiting admin verification.')
        }
      }
    } else {
      console.log('Payment failed or cancelled:', Body.stkCallback.ResultDesc)
    }
    
    return NextResponse.json({ result: 'success' })
  } catch (error) {
    console.error('Callback Error:', error)
    return NextResponse.json({ error: 'Callback failed' }, { status: 500 })
  }
}
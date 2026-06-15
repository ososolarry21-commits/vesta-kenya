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
      // AccountReference format: "listingId:email"
      const [listingId, email] = accountReference?.split(':') || []

      console.log('Payment successful for listing:', listingId)
      
      if (listingId) {
        // Update the specific listing as verified
        const { error: updateError } = await supabase
          .from('listings')
          .update({ 
            is_verified: true,
            verified_at: new Date().toISOString(),
            verification_receipt: mpesaReceipt
          })
          .eq('id', listingId)
        
        if (updateError) {
          console.error('Error updating listing verification:', updateError)
        } else {
          console.log('✅ Listing verified successfully!')
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
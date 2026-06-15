import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  // WE USE THE SERVICE ROLE KEY HERE TO BYPASS SECURITY
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
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
      const accountReference = metadata.find((item: any) => item.Name === 'AccountReference')?.Value
      const [listingId] = accountReference?.split(':') || []

      console.log('Payment successful for listing:', listingId)
      
      if (listingId) {
        // This will now work because we are using the Service Role Key
        const { data, error } = await supabase
          .from('listings')
          .update({ 
            verification_payment_received: true,
            verification_receipt: mpesaReceipt,
            verification_requested_at: new Date().toISOString(),
            is_verified: false 
          })
          .eq('id', listingId)
          .select()
        
        if (error) {
          console.error('Error updating listing:', error)
        } else {
          console.log('✅ Database updated successfully!', data)
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
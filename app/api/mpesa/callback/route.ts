import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { Body } = body
    
    console.log('📥 M-Pesa Callback received')
    
    const resultCode = Body.stkCallback.ResultCode
    
    if (resultCode === 0) {
      const metadata = Body.stkCallback.CallbackMetadata.Item
      
      const mpesaReceipt = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value
      const accountReference = metadata.find((item: any) => item.Name === 'AccountReference')?.Value
      const [listingId] = accountReference?.split(':') || []

      console.log('✅ Payment successful for listing:', listingId)
      
      if (listingId) {
        // Use SERVICE ROLE KEY to bypass RLS
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        )
        
        const { data, error } = await supabase
          .from('listings')
          .update({ 
            verification_payment_received: true,
            verification_receipt: mpesaReceipt,
            verification_requested_at: new Date().toISOString()
          })
          .eq('id', listingId)
        
        if (error) {
          console.error('❌ Database update failed:', error)
        } else {
          console.log('✅ Database updated successfully!')
        }
      }
    } else {
      console.log('❌ Payment failed:', Body.stkCallback.ResultDesc)
    }
    
    return NextResponse.json({ result: 'success' })
  } catch (error) {
    console.error('💥 Callback error:', error)
    return NextResponse.json({ error: 'Callback failed' }, { status: 500 })
  }
}
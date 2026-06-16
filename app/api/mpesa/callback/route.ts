import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { Body } = body
    
    console.log('📥 Callback received:', JSON.stringify(Body, null, 2))
    
    const resultCode = Body.stkCallback.ResultCode
    
    if (resultCode === 0) {
      const metadata = Body.stkCallback.CallbackMetadata.Item
      
      const mpesaReceipt = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value
      const accountReference = metadata.find((item: any) => item.Name === 'AccountReference')?.Value
      
      console.log('AccountReference:', accountReference)
      
      // Extract listingId from "listingId:email" format
      const [listingId] = accountReference?.split(':') || []
      
      console.log('✅ Payment successful! Listing ID:', listingId, 'Receipt:', mpesaReceipt)
      
      if (listingId) {
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
          .select()
        
        if (error) {
          console.error('❌ Database error:', error)
        } else {
          console.log('✅ Database updated:', data)
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
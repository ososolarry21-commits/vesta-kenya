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
      
      // Get the email from AccountReference
      const accountReference = metadata.find((item: any) => item.Name === 'AccountReference')?.Value
      const userEmail = accountReference

      console.log('Payment successful for:', userEmail)
      
      if (userEmail) {
        // Find user by email and mark as verified
        const { data: userProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', userEmail)
          .single()
        
        if (fetchError) {
          console.error('Error finding user:', fetchError)
        } else if (userProfile) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              verified: true,
              verified_at: new Date().toISOString(),
              verification_receipt: mpesaReceipt
            })
            .eq('id', userProfile.id)
          
          if (updateError) {
            console.error('Error updating verification:', updateError)
          } else {
            console.log('✅ User verified successfully!')
          }
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
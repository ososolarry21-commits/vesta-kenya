import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { Body } = body
    
    console.log(' Callback received')
    const resultCode = Body.stkCallback.ResultCode
    
    if (resultCode === 0) {
      const metadata = Body.stkCallback.CallbackMetadata.Item
      const mpesaReceipt = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value
      const accountReference = metadata.find((item: any) => item.Name === 'AccountReference')?.Value
      const [listingId] = accountReference?.split(':') || []

      if (listingId) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        )
        
        // 1. Update Database
        await supabase
          .from('listings')
          .update({ 
            verification_payment_received: true,
            verification_receipt: mpesaReceipt,
            verification_requested_at: new Date().toISOString()
          })
          .eq('id', listingId)

        // 2. Send Email to Admin
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        })

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: process.env.EMAIL_USER,
          subject: ' New Verification Payment Received!',
          text: `A payment was received for listing ID: ${listingId}. Receipt: ${mpesaReceipt}. Please send your agent to verify.`
        })
        
        console.log(' Database updated and Email sent!')
      }
    }
    return NextResponse.json({ result: 'success' })
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.json({ error: 'Callback failed' }, { status: 500 })
  }
}
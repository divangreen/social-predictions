import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

  const priceId = process.env.STRIPE_PRO_PRICE_ID
  if (!priceId) return NextResponse.json({ error: 'Price not configured' }, { status: 500 })

  const stripe = new Stripe(stripeKey)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { data: profile } = await supabase.from('users').select('username').eq('id', user.id).single()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/pro?success=1`,
    cancel_url: `${siteUrl}/pro`,
    customer_email: user.email,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}

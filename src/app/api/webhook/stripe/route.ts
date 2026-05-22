import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { Database } from '@/types/database'

function makeSupabase() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const stripe = new Stripe(stripeKey)
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = makeSupabase()

  async function setProStatus(userId: string, isPro: boolean) {
    await supabase.from('users').update({ is_pro: isPro } as never).eq('id', userId)
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      if (userId) await setProStatus(userId, true)
      break
    }
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.user_id
      if (userId) await setProStatus(userId, false)
      break
    }
    case 'customer.subscription.resumed':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.user_id
      if (userId) {
        const active = subscription.status === 'active' || subscription.status === 'trialing'
        await setProStatus(userId, active)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}

'use server'

import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

function createAdminClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function deletePrediction(predictionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify ownership with the session client before deleting
  const { data: prediction } = await supabase
    .from('predictions')
    .select('id')
    .eq('id', predictionId)
    .eq('user_id', user.id)
    .single()

  if (!prediction) return { error: 'Prediction not found or not yours' }

  // Use service role client for the delete so RLS does not silently swallow it
  const admin = createAdminClient()
  const { error } = await admin
    .from('predictions')
    .delete()
    .eq('id', predictionId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { success: true }
}

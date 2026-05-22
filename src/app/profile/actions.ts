'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function deletePrediction(predictionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('predictions')
    .delete()
    .eq('id', predictionId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { success: true }
}

import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { randomString } from '@/lib/crypto-random';

/**
 * Generate a unique verification code for certificates.
 * Uses an uppercase alphabet with ambiguous characters (0/O, 1/I) excluded
 * so codes remain readable when printed or typed.
 */
export async function generate_verification_code(): Promise<string> {
  const supabase = createServiceSupabaseClient();
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  for (let attempts = 0; attempts < 10; attempts++) {
    const code = randomString(8, alphabet);

    const { error } = await supabase
      .from('certificates')
      .select('id')
      .eq('verification_code', code)
      .single();

    if (error && error.code === 'PGRST116') return code;
  }

  return `CERT-${Date.now().toString(36).toUpperCase()}`;
}


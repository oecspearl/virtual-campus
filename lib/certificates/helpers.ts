import { createServiceSupabaseClient } from '@/lib/supabase-server';

/**
 * Generate a unique verification code for certificates
 */
export async function generate_verification_code(): Promise<string> {
  const supabase = createServiceSupabaseClient();
  
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    // Generate random 8-character alphanumeric code (uppercase)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if code exists
    const { data, error } = await supabase
      .from('certificates')
      .select('id')
      .eq('verification_code', code)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // Code doesn't exist - good to use
      return code;
    }
    
    attempts++;
  }
  
  // Fallback: use UUID-based code
  return `CERT-${Date.now().toString(36).toUpperCase()}`;
}


import { createServiceSupabaseClient } from '@/lib/supabase-server';

interface BadgeAssertion {
  '@context': string[];
  type: string[];
  id: string;
  recipient: {
    type: string;
    identity: string;
    hashed: boolean;
    salt?: string;
  };
  badge: {
    type: string;
    id: string;
    name: string;
    description: string;
    image: string;
    criteria: {
      type: string;
      id: string;
    };
    issuer: {
      type: string;
      id: string;
      name: string;
      url?: string;
      email?: string;
    };
  };
  issuedOn: string;
  evidence?: Array<{
    type: string;
    id: string;
  }>;
  verification: {
    type: string;
    verificationProperty: string;
  };
}

/**
 * Generate OpenBadges 2.0 compliant badge assertion
 */
export async function generateBadgeAssertion(
  userId: string,
  badgeId: string,
  courseId: string | null,
  evidenceUrl?: string
): Promise<BadgeAssertion> {
  const supabase = createServiceSupabaseClient();
  
  // Get badge details
  const { data: badge, error: badgeError } = await supabase
    .from('badges')
    .select('*')
    .eq('id', badgeId)
    .single();
  
  if (badgeError || !badge) {
    throw new Error('Badge not found');
  }
  
  // Get user email for identity
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();
  
  if (userError || !user) {
    throw new Error('User not found');
  }
  
  // Get issuer info
  const issuerUrl = badge.issuer_url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/badges/issuer`;
  const badgeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/badges/${badgeId}`;
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/badges/verify/${badgeId}`;
  const criteriaUrl = badge.criteria_url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/badges/${badgeId}/criteria`;
  
  // Create assertion ID
  const assertionId = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/badges/assertions/${userId}/${badgeId}`;
  
  // Build evidence array
  const evidence = [];
  if (evidenceUrl) {
    evidence.push({
      type: 'Evidence',
      id: evidenceUrl
    });
  }
  if (courseId) {
    evidence.push({
      type: 'Course',
      id: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/course/${courseId}`
    });
  }
  
  const assertion: BadgeAssertion = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://purl.imsglobal.org/spec/ob/v3p0/context.json'
    ],
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    id: assertionId,
    recipient: {
      type: 'email',
      identity: `sha256$${await hashEmail(user.email)}`,
      hashed: true
    },
    badge: {
      type: 'Achievement',
      id: badgeUrl,
      name: badge.name,
      description: badge.description,
      image: badge.image_url,
      criteria: {
        type: 'Criteria',
        id: criteriaUrl
      },
      issuer: {
        type: 'Profile',
        id: issuerUrl,
        name: badge.issuer_name,
        url: badge.issuer_url || undefined,
        email: badge.issuer_email || undefined
      }
    },
    issuedOn: new Date().toISOString(),
    evidence: evidence.length > 0 ? evidence : undefined,
    verification: {
      type: 'hosted',
      verificationProperty: 'id'
    }
  };
  
  return assertion;
}

/**
 * Hash email for privacy (SHA-256)
 */
async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify badge assertion
 */
export async function verifyBadgeAssertion(
  assertionId: string
): Promise<{ valid: boolean; assertion?: BadgeAssertion; error?: string }> {
  try {
    // Extract user ID and badge ID from assertion URL
    const match = assertionId.match(/\/assertions\/([^/]+)\/([^/]+)/);
    if (!match) {
      return { valid: false, error: 'Invalid assertion ID format' };
    }
    
    const [, userId, badgeId] = match;
    
    const supabase = createServiceSupabaseClient();
    
    // Get user badge record
    const { data: userBadge, error } = await supabase
      .from('user_badges')
      .select('*, badge:badges(*)')
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .single();
    
    if (error || !userBadge) {
      return { valid: false, error: 'Badge assertion not found' };
    }
    
    if (!userBadge.badge_assertion) {
      return { valid: false, error: 'Badge assertion data missing' };
    }
    
    return {
      valid: true,
      assertion: userBadge.badge_assertion as BadgeAssertion
    };
  } catch (error: any) {
    return { valid: false, error: error.message || 'Verification failed' };
  }
}


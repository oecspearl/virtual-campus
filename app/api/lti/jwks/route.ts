/**
 * LTI 1.3 JWKS (JSON Web Key Set) Endpoint
 * Provides public keys for JWT verification
 */

import { NextResponse } from 'next/server';
import { getPlatformConfig } from '@/lib/lti/core';
import crypto from 'crypto';

export async function GET() {
  try {
    const platformConfig = await getPlatformConfig();
    
    // Extract public key from PEM
    const publicKey = crypto.createPublicKey(platformConfig.platform_public_key);
    const jwk = publicKey.export({ format: 'jwk' });

    // Build JWKS
    const jwks = {
      keys: [
        {
          kty: jwk.kty,
          use: 'sig',
          kid: 'lti-platform-key',
          alg: 'RS256',
          n: jwk.n,
          e: jwk.e,
        },
      ],
    };

    return NextResponse.json(jwks, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('JWKS error:', error);
    return NextResponse.json(
      { error: 'Failed to generate JWKS' },
      { status: 500 }
    );
  }
}


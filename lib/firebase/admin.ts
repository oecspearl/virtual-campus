/**
 * Firebase Admin SDK Configuration (Server-side)
 *
 * Setup instructions:
 * 1. Go to Firebase Console > Project Settings > Service Accounts
 * 2. Click "Generate new private key"
 * 3. Save the JSON file securely
 * 4. Set environment variables from the JSON file:
 *    - FIREBASE_PROJECT_ID
 *    - FIREBASE_CLIENT_EMAIL
 *    - FIREBASE_PRIVATE_KEY (the entire private key including -----BEGIN... and -----END...)
 */

import * as admin from 'firebase-admin';

let initialized = false;

/**
 * Initialize Firebase Admin SDK
 */
export function initializeFirebaseAdmin(): admin.app.App | null {
  if (initialized && admin.apps.length > 0) {
    return admin.apps[0] ?? null;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase Admin SDK credentials not configured. Push notifications will be disabled.');
    return null;
  }

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    initialized = true;
    return app;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    return null;
  }
}

/**
 * Send push notification via FCM
 */
export async function sendPushNotificationFCM(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  options?: {
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
    requireInteraction?: boolean;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const app = initializeFirebaseAdmin();

  if (!app) {
    return { success: false, error: 'Firebase Admin SDK not initialized' };
  }

  try {
    const message: admin.messaging.Message = {
      token,
      notification: {
        title,
        body,
      },
      webpush: {
        notification: {
          title,
          body,
          icon: options?.icon || '/icons/icon-192x192.png',
          badge: options?.badge || '/icons/badge-72x72.png',
          tag: options?.tag,
          requireInteraction: options?.requireInteraction,
        },
        fcmOptions: {
          link: options?.url || '/',
        },
      },
      data: data
        ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
        : undefined,
    };

    const response = await admin.messaging().send(message);

    return { success: true, messageId: response };
  } catch (error: any) {
    console.error('FCM send error:', error);

    // Handle specific error codes
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      return { success: false, error: 'Invalid or expired token' };
    }

    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to multiple tokens
 */
export async function sendPushNotificationMultiple(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
  options?: {
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
  }
): Promise<{ successCount: number; failureCount: number; invalidTokens: string[] }> {
  const app = initializeFirebaseAdmin();

  if (!app) {
    return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
  }

  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  try {
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title,
        body,
      },
      webpush: {
        notification: {
          title,
          body,
          icon: options?.icon || '/icons/icon-192x192.png',
          badge: options?.badge || '/icons/badge-72x72.png',
          tag: options?.tag,
        },
        fcmOptions: {
          link: options?.url || '/',
        },
      },
      data: data
        ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
        : undefined,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // Collect invalid tokens
    const invalidTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        if (
          resp.error.code === 'messaging/invalid-registration-token' ||
          resp.error.code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens,
    };
  } catch (error: any) {
    console.error('FCM multicast error:', error);
    return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
  }
}

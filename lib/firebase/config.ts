/**
 * Firebase Configuration
 *
 * Setup instructions:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project or select existing
 * 3. Go to Project Settings > General > Your apps > Add app > Web
 * 4. Copy the firebaseConfig values to your .env.local file
 * 5. Go to Project Settings > Cloud Messaging > Web Push certificates
 * 6. Generate a key pair and copy the public key (VAPID key)
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// VAPID key for web push (get from Firebase Console > Cloud Messaging > Web Push certificates)
export const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/**
 * Initialize Firebase app (client-side only)
 */
export function initializeFirebase(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('Firebase config not set. Push notifications will be disabled.');
    return null;
  }

  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  return app;
}

/**
 * Get Firebase Messaging instance (client-side only)
 */
export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null;

  if (!app) {
    app = initializeFirebase();
  }

  if (!app) return null;

  if (!messaging) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.error('Failed to initialize Firebase Messaging:', error);
      return null;
    }
  }

  return messaging;
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // Check if notifications are supported
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return null;
  }

  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported');
    return null;
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    // Get messaging instance
    const messaging = getFirebaseMessaging();
    if (!messaging) return null;

    // Get token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    return token;
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
  const messaging = getFirebaseMessaging();
  if (!messaging) return null;

  return onMessage(messaging, (payload) => {
    callback(payload);
  });
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

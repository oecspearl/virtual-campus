/**
 * Google OAuth utilities for client-side Google Workspace integration.
 * Handles OAuth2 token acquisition for Google APIs like Drive Picker.
 */

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
const GOOGLE_APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID || '';

// Scopes for Google Workspace features
const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

export function isGoogleWorkspaceConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_API_KEY);
}

export function getGoogleConfig() {
  return {
    clientId: GOOGLE_CLIENT_ID,
    apiKey: GOOGLE_API_KEY,
    appId: GOOGLE_APP_ID,
  };
}

export { SCOPES };

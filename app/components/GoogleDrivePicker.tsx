'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/app/components/Button';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  iconUrl: string;
  embedUrl: string;
  size?: number;
  lastModified?: string;
}

interface GoogleDrivePickerProps {
  onSelect: (files: GoogleDriveFile[]) => void;
  multiSelect?: boolean;
  mimeTypes?: string[];
  buttonLabel?: string;
  buttonVariant?: 'primary' | 'outline' | 'ghost';
  className?: string;
}

// Map Google Drive mime types to embed URLs
function getEmbedUrl(fileId: string, mimeType: string): string {
  if (mimeType === 'application/vnd.google-apps.document') {
    return `https://docs.google.com/document/d/${fileId}/preview`;
  }
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    return `https://docs.google.com/spreadsheets/d/${fileId}/preview`;
  }
  if (mimeType === 'application/vnd.google-apps.presentation') {
    return `https://docs.google.com/presentation/d/${fileId}/preview`;
  }
  if (mimeType === 'application/vnd.google-apps.form') {
    return `https://docs.google.com/forms/d/${fileId}/viewform`;
  }
  if (mimeType === 'application/pdf') {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  if (mimeType.startsWith('image/')) {
    return `https://drive.google.com/uc?id=${fileId}`;
  }
  if (mimeType.startsWith('video/')) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

// Map mime types to resource types for library resources
export function mimeToResourceType(mimeType: string): string {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/vnd.google-apps.presentation') return 'document';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'document';
  if (mimeType === 'application/vnd.google-apps.document') return 'document';
  if (mimeType === 'application/vnd.google-apps.form') return 'template';
  if (mimeType === 'application/pdf') return 'document';
  return 'document';
}

// Human-readable Google file type labels
export function getGoogleFileTypeLabel(mimeType: string): string {
  const typeMap: Record<string, string> = {
    'application/vnd.google-apps.document': 'Google Doc',
    'application/vnd.google-apps.spreadsheet': 'Google Sheet',
    'application/vnd.google-apps.presentation': 'Google Slides',
    'application/vnd.google-apps.form': 'Google Form',
    'application/vnd.google-apps.drawing': 'Google Drawing',
    'application/pdf': 'PDF',
  };
  if (mimeType in typeMap) return typeMap[mimeType];
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  return 'File';
}

declare global {
  interface Window {
    google?: any;
    gapi?: any;
    __googlePickerCallback?: (data: any) => void;
  }
}

// Load Google API scripts
function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export default function GoogleDrivePicker({
  onSelect,
  multiSelect = false,
  mimeTypes,
  buttonLabel = 'Google Drive',
  buttonVariant = 'outline',
  className = '',
}: GoogleDrivePickerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID || '';

  useEffect(() => {
    setConfigured(!!(clientId && apiKey));
  }, [clientId, apiKey]);

  const loadGoogleApis = useCallback(async () => {
    await Promise.all([
      loadScript('https://apis.google.com/js/api.js', 'google-api-script'),
      loadScript('https://accounts.google.com/gsi/client', 'google-gsi-script'),
    ]);

    // Load the picker API via gapi
    await new Promise<void>((resolve, reject) => {
      window.gapi.load('picker', { callback: resolve, onerror: reject });
    });
  }, []);

  const getOAuthToken = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          resolve(response.access_token);
        },
      });
      tokenClient.requestAccessToken({ prompt: '' });
    });
  }, [clientId]);

  const createPicker = useCallback((accessToken: string) => {
    const docsView = new window.google.picker.DocsView()
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false);

    if (mimeTypes && mimeTypes.length > 0) {
      docsView.setMimeTypes(mimeTypes.join(','));
    }

    const pickerBuilder = new window.google.picker.PickerBuilder()
      .setDeveloperKey(apiKey)
      .setAppId(appId)
      .setOAuthToken(accessToken)
      .addView(docsView)
      .addView(new window.google.picker.DocsUploadView())
      .setTitle('Select files from Google Drive')
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const files: GoogleDriveFile[] = data.docs.map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            mimeType: doc.mimeType,
            url: doc.url,
            iconUrl: doc.iconUrl,
            embedUrl: getEmbedUrl(doc.id, doc.mimeType),
            size: doc.sizeBytes ? parseInt(doc.sizeBytes) : undefined,
            lastModified: doc.lastEditedUtc ? new Date(doc.lastEditedUtc).toISOString() : undefined,
          }));
          onSelect(files);
        }
      });

    if (multiSelect) {
      pickerBuilder.enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED);
    }

    pickerBuilder.build().setVisible(true);
  }, [apiKey, appId, multiSelect, mimeTypes, onSelect]);

  const handleOpenPicker = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      await loadGoogleApis();
      const token = await getOAuthToken();
      createPicker(token);
    } catch (err: any) {
      console.error('Google Drive Picker error:', err);
      setError(err.message || 'Failed to open Google Drive');
    } finally {
      setLoading(false);
    }
  }, [loadGoogleApis, getOAuthToken, createPicker]);

  if (!configured) {
    return null;
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant={buttonVariant}
        onClick={handleOpenPicker}
        disabled={loading}
      >
        <Icon icon="mdi:google-drive" className="w-5 h-5 mr-2" />
        {loading ? 'Opening...' : buttonLabel}
      </Button>
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

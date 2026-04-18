'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { InlineLoader } from '@/app/components/ui/LoadingIndicator';

export interface ImageUploadSectionProps {
  label: string;
  description: string;
  /** Current image URL (if any) — shown as a thumbnail until a new file is picked. */
  currentUrl: string;
  /** Logical type tag passed through to the upload callback (e.g. "logo_header"). */
  imageType: string;
  /** Performs the upload and returns the new image URL. */
  onUpload: (type: string, file: File) => Promise<string>;
  disabled: boolean;
}

/**
 * Image picker + thumbnail preview. Validates that the selected file is an
 * image, shows a data-URL preview immediately, and delegates the actual
 * upload to the caller (which usually hits a tenant-scoped storage API).
 *
 * The input element itself is hidden — a sibling <label> acts as the click
 * target so we can style the button without a native file-input.
 */
export default function ImageUploadSection({
  label,
  description,
  currentUrl,
  imageType,
  onUpload,
  disabled,
}: ImageUploadSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  // Keep the preview in sync when the parent's stored URL changes (e.g. after
  // a successful save or a tenant switch).
  useEffect(() => {
    setPreview(currentUrl);
  }, [currentUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setUploading(true);
      await onUpload(imageType, file);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <p className="text-xs text-gray-500 mb-3">{description}</p>

      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt={label}
                className="w-32 h-32 object-contain border border-gray-300 rounded-lg bg-white"
                onError={() => setPreview(null)}
              />
            </div>
          ) : (
            <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
              <Icon icon="mdi:image" className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="hidden"
            id={`upload-${imageType}`}
          />
          <label
            htmlFor={`upload-${imageType}`}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
              disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {uploading ? (
              <>
                <InlineLoader className="mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Icon icon="mdi:upload" className="w-5 h-5 mr-2" />
                {preview ? 'Change Image' : 'Upload Image'}
              </>
            )}
          </label>
          <p className="text-xs text-gray-500 mt-2">
            Recommended: PNG, JPG, or WebP. Max 5MB.
          </p>
        </div>
      </div>
    </div>
  );
}

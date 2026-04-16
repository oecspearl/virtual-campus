'use client';

import { useState, useEffect } from 'react';
import {
  Subtitles,
  Upload,
  Trash2,
  Plus,
  Check,
  X,
  Globe,
  FileText,
  Wand2,
  Loader2,
} from 'lucide-react';
import LoadingIndicator from '@/app/components/ui/LoadingIndicator';

interface Caption {
  id: string;
  language: string;
  label: string;
  caption_url: string;
  caption_format: 'vtt' | 'srt';
  is_default: boolean;
  auto_generated: boolean;
}

interface CaptionManagerProps {
  videoUrl: string;
  lessonId?: string;
  onCaptionsChange?: (captions: Caption[]) => void;
  className?: string;
}

const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
];

export default function CaptionManager({
  videoUrl,
  lessonId,
  onCaptionsChange,
  className = '',
}: CaptionManagerProps) {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newCaption, setNewCaption] = useState({
    language: 'en',
    label: '',
    file: null as File | null,
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeStatus, setTranscribeStatus] = useState<string | null>(null);

  // Fetch existing captions
  useEffect(() => {
    async function fetchCaptions() {
      try {
        const response = await fetch(
          `/api/accessibility/captions?video_url=${encodeURIComponent(videoUrl)}`
        );
        if (response.ok) {
          const data = await response.json();
          setCaptions(data.captions || []);
        }
      } catch (err) {
        console.error('Failed to fetch captions:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (videoUrl) {
      fetchCaptions();
    }
  }, [videoUrl]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['.vtt', '.srt', 'text/vtt', 'application/x-subrip'];
      const isValid =
        validTypes.some(type => file.name.endsWith(type)) ||
        validTypes.includes(file.type);

      if (!isValid) {
        setError('Please upload a VTT or SRT file');
        return;
      }

      setNewCaption(prev => ({ ...prev, file }));
      setError(null);
    }
  };

  // Upload caption
  const handleUpload = async () => {
    if (!newCaption.file) {
      setError('Please select a file');
      return;
    }

    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', newCaption.file);
      formData.append('video_url', videoUrl);
      formData.append('language', newCaption.language);
      formData.append(
        'label',
        newCaption.label ||
          LANGUAGE_OPTIONS.find(l => l.code === newCaption.language)?.name ||
          newCaption.language
      );
      if (lessonId) {
        formData.append('lesson_id', lessonId);
      }

      setUploadProgress(30);

      const response = await fetch('/api/accessibility/captions', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(70);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      setUploadProgress(100);

      // Add new caption to list
      setCaptions(prev => [...prev, data.caption]);
      onCaptionsChange?.([...captions, data.caption]);

      // Reset form
      setNewCaption({ language: 'en', label: '', file: null });
      setIsAdding(false);
      setUploadProgress(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadProgress(0);
    }
  };

  // Delete caption
  const handleDelete = async (captionId: string) => {
    if (!confirm('Are you sure you want to delete this caption track?')) return;

    try {
      const response = await fetch(`/api/accessibility/captions/${captionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const updated = captions.filter(c => c.id !== captionId);
        setCaptions(updated);
        onCaptionsChange?.(updated);
      }
    } catch (err) {
      console.error('Failed to delete caption:', err);
    }
  };

  // Set default caption
  const handleSetDefault = async (captionId: string) => {
    try {
      const response = await fetch(`/api/accessibility/captions/${captionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      });

      if (response.ok) {
        const updated = captions.map(c => ({
          ...c,
          is_default: c.id === captionId,
        }));
        setCaptions(updated);
        onCaptionsChange?.(updated);
      }
    } catch (err) {
      console.error('Failed to update caption:', err);
    }
  };

  // Auto-generate transcript using Whisper
  const handleAutoTranscribe = async () => {
    if (!lessonId) {
      setError('Lesson ID is required for auto-transcription');
      return;
    }

    setIsTranscribing(true);
    setTranscribeStatus('Downloading video and sending to AI...');
    setError(null);

    try {
      const response = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transcription failed');
      }

      setTranscribeStatus(null);

      // Add the new caption to the list (or replace existing auto-generated)
      if (data.caption) {
        setCaptions(prev => {
          const filtered = prev.filter(
            c => !(c.auto_generated && c.language === data.caption.language)
          );
          return [...filtered, data.caption];
        });
        onCaptionsChange?.([
          ...captions.filter(
            c => !(c.auto_generated && c.language === data.caption.language)
          ),
          data.caption,
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-transcription failed');
      setTranscribeStatus(null);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Subtitles className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Video Captions</h3>
          </div>
          <div className="flex items-center gap-2">
            {lessonId && !isAdding && (
              <button
                onClick={handleAutoTranscribe}
                disabled={isTranscribing}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Auto-generate transcript using AI"
              >
                {isTranscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                {isTranscribing ? 'Transcribing...' : 'Auto-Generate'}
              </button>
            )}
            {!isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Caption
              </button>
            )}
          </div>
        </div>
        {/* Transcription status */}
        {transcribeStatus && (
          <div className="mt-3 flex items-center gap-2 text-sm text-purple-700 bg-purple-50 px-3 py-2 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            <span>{transcribeStatus}</span>
          </div>
        )}
      </div>

      {/* Add caption form */}
      {isAdding && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="space-y-4">
            {/* Language selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <select
                  value={newCaption.language}
                  onChange={e =>
                    setNewCaption(prev => ({ ...prev, language: e.target.value }))
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {LANGUAGE_OPTIONS.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Label (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label (optional)
              </label>
              <input
                type="text"
                value={newCaption.label}
                onChange={e =>
                  setNewCaption(prev => ({ ...prev, label: e.target.value }))
                }
                placeholder="e.g., English (Auto-generated)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Caption File (VTT or SRT)
              </label>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {newCaption.file ? newCaption.file.name : 'Choose file...'}
                  </span>
                  <input
                    type="file"
                    accept=".vtt,.srt,text/vtt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Upload progress */}
            {uploadProgress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            {/* Error message */}
            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <X className="w-4 h-4" /> {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewCaption({ language: 'en', label: '', file: null });
                  setError(null);
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!newCaption.file || uploadProgress > 0}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Upload Caption
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Captions list */}
      <div className="divide-y divide-gray-100">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <LoadingIndicator variant="dots" size="sm" text="Loading captions..." />
          </div>
        ) : captions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No captions uploaded yet</p>
            <p className="text-sm mt-1">
              Add captions to make your video accessible
            </p>
          </div>
        ) : (
          captions.map(caption => (
            <div
              key={caption.id}
              className="p-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {caption.label ||
                        LANGUAGE_OPTIONS.find(l => l.code === caption.language)
                          ?.name ||
                        caption.language}
                    </span>
                    {caption.is_default && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        Default
                      </span>
                    )}
                    {caption.auto_generated && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                        Auto-generated
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {caption.caption_format.toUpperCase()} format
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!caption.is_default && (
                  <button
                    onClick={() => handleSetDefault(caption.id)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Set as default"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(caption.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete caption"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

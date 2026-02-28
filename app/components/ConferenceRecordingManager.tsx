'use client';

import { useState, useEffect } from 'react';
import {
  Video,
  Upload,
  Link as LinkIcon,
  Trash2,
  Plus,
  X,
  Play,
  Clock,
  FileVideo,
  Check,
  Loader2
} from 'lucide-react';

interface Recording {
  id: string;
  recording_url: string;
  title: string;
  recording_duration?: number;
  file_size?: number;
  status: string;
  created_at: string;
}

interface ConferenceRecordingManagerProps {
  conferenceId: string;
  courseId: string;
  conferenceTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onRecordingAdded?: () => void;
}

export default function ConferenceRecordingManager({
  conferenceId,
  courseId,
  conferenceTitle,
  isOpen,
  onClose,
  onRecordingAdded
}: ConferenceRecordingManagerProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [recordingTitle, setRecordingTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url');

  useEffect(() => {
    if (isOpen) {
      fetchRecordings();
    }
  }, [isOpen, conferenceId]);

  const fetchRecordings = async () => {
    try {
      const response = await fetch(`/api/conferences/${conferenceId}/recording`);
      const data = await response.json();
      if (response.ok) {
        setRecordings(data.recordings || []);
      }
    } catch (err) {
      console.error('Failed to fetch recordings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUploading(true);

    try {
      let fileId = null;

      // If file upload, upload the file first
      if (uploadMethod === 'file' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('folder', 'recordings');

        const uploadResponse = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file');
        }

        const uploadData = await uploadResponse.json();
        fileId = uploadData.file?.id || uploadData.id;
      }

      // Add recording record
      const response = await fetch(`/api/conferences/${conferenceId}/recording`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recording_url: uploadMethod === 'url' ? recordingUrl : null,
          file_id: fileId,
          title: recordingTitle || `Recording - ${conferenceTitle}`
        })
      });

      const data = await response.json();

      if (response.ok) {
        setRecordings(prev => [data.recording, ...prev]);
        setShowAddForm(false);
        setRecordingUrl('');
        setRecordingTitle('');
        setSelectedFile(null);
        setSuccess('Recording added successfully!');
        onRecordingAdded?.();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to add recording');
      }
    } catch (err) {
      setError('Failed to add recording');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteRecording = async (recordingId: string) => {
    if (!confirm('Are you sure you want to delete this recording?')) return;

    try {
      const response = await fetch(
        `/api/conferences/${conferenceId}/recording?recording_id=${recordingId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setRecordings(prev => prev.filter(r => r.id !== recordingId));
        setSuccess('Recording deleted');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Failed to delete recording:', err);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Video className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Manage Recordings</h2>
              <p className="text-orange-100 text-sm">{conferenceTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Success/Error messages */}
          {success && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-2">
              <Check className="w-5 h-5" />
              {success}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}

          {/* Add Recording Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-6 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400"
            >
              <Plus className="w-5 h-5" />
              Add Recording
            </button>
          )}

          {/* Add Recording Form */}
          {showAddForm && (
            <form onSubmit={handleAddRecording} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Add New Recording</h3>

              {/* Upload method tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setUploadMethod('url')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    uploadMethod === 'url'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                  }`}
                >
                  <LinkIcon className="w-4 h-4 inline mr-2" />
                  URL Link
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMethod('file')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    uploadMethod === 'file'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                  }`}
                >
                  <Upload className="w-4 h-4 inline mr-2" />
                  Upload File
                </button>
              </div>

              {/* Title input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={recordingTitle}
                  onChange={(e) => setRecordingTitle(e.target.value)}
                  placeholder={`Recording - ${conferenceTitle}`}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* URL or File input */}
              {uploadMethod === 'url' ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Recording URL
                  </label>
                  <input
                    type="url"
                    value={recordingUrl}
                    onChange={(e) => setRecordingUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/... or YouTube/Vimeo link"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Paste a Google Drive, YouTube, Vimeo, or direct video URL
                  </p>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Video File
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-orange-100 file:text-orange-700"
                  />
                  {selectedFile && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>
              )}

              {/* Form actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setRecordingUrl('');
                    setRecordingTitle('');
                    setSelectedFile(null);
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || (uploadMethod === 'url' ? !recordingUrl : !selectedFile)}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {uploadMethod === 'file' ? 'Uploading...' : 'Adding...'}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Recording
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Recordings List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : recordings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileVideo className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No recordings yet.</p>
              <p className="text-sm">Add a recording URL or upload a video file.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recordings.map(recording => (
                <div
                  key={recording.id}
                  className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Play className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {recording.title}
                      </h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        {recording.recording_duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(recording.recording_duration)}
                          </span>
                        )}
                        {recording.file_size && (
                          <span>{formatFileSize(recording.file_size)}</span>
                        )}
                        <span>
                          {new Date(recording.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Recording actions */}
                      <div className="mt-3 flex items-center gap-2">
                        <a
                          href={recording.recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-lg text-sm hover:bg-orange-200 dark:hover:bg-orange-900/50"
                        >
                          <Play className="w-3 h-3 inline mr-1" />
                          Watch
                        </a>
                        <button
                          onClick={() => handleDeleteRecording(recording.id)}
                          className="px-3 py-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-sm"
                        >
                          <Trash2 className="w-3 h-3 inline mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

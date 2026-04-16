'use client';

import React from 'react';
import TextEditor from '@/app/components/editor/TextEditor';
import FileUpload from '@/app/components/file-upload/FileUpload';

interface VideoModeEditorProps {
  content: any[];
  setContent: (content: any[]) => void;
  title: string;
  lessonId?: string;
  generatingChapters: boolean;
  setGeneratingChapters: (v: boolean) => void;
}

export default function VideoModeEditor({
  content,
  setContent,
  title,
  lessonId,
  generatingChapters,
  setGeneratingChapters,
}: VideoModeEditorProps) {
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const [transcribeError, setTranscribeError] = React.useState<string | null>(null);
  const vd = content[0]?.data || {};
  const updateVideo = (patch: Record<string, any>) => {
    const videoItem = {
      type: 'video' as const,
      title: content[0]?.title || 'Video',
      data: { ...vd, ...patch },
      id: content[0]?.id || `video-${Date.now()}`,
    };
    setContent([videoItem]);
  };

  return (
    <>
      {/* Card 1: Video Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Video Content</h2>
        <p className="text-sm text-gray-500 mb-4">This lesson will display a single video as its primary content.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Video URL</label>
            <input
              value={vd.url || ''}
              onChange={(e) => updateVideo({ url: e.target.value })}
              placeholder="Paste YouTube, Vimeo, or direct video URL"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-oecs-lime-green focus:ring-1 focus:ring-oecs-lime-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Or Upload a Video File</label>
            <FileUpload onUploaded={(res) => updateVideo({ url: res.fileUrl, fileName: res.fileName, fileId: res.fileId })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Video Title</label>
            <input
              value={vd.title || ''}
              onChange={(e) => updateVideo({ title: e.target.value })}
              placeholder="Enter a title for the video"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-oecs-lime-green focus:ring-1 focus:ring-oecs-lime-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description / Notes for Students</label>
            <TextEditor
              value={vd.description || ''}
              onChange={(html) => updateVideo({ description: html })}
              placeholder="Add context, key points, or viewing instructions..."
              height={200}
            />
          </div>

          {/* Prevent Skipping Toggle */}
          <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <input
              type="checkbox"
              id="video-prevent-skip"
              checked={Boolean(vd.preventSkipping)}
              onChange={(e) => updateVideo({ preventSkipping: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="video-prevent-skip" className="cursor-pointer">
              <span className="text-sm font-medium text-orange-900">Prevent skipping ahead</span>
              <p className="text-xs text-orange-700">Students must watch sequentially — they cannot skip forward past what they have already seen. Useful for compliance training.</p>
            </label>
          </div>

          {vd.url && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-green-900">Video configured</span>
              </div>
              <p className="text-xs text-green-700 mt-1 truncate">{vd.url}</p>
            </div>
          )}
        </div>
      </div>

      {/* Card 2: Chapters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Chapters</h2>
            <p className="text-xs text-gray-500 mt-0.5">Break the video into navigable segments. Research shows 6-7 minute segments are optimal.</p>
          </div>
          <div className="flex items-center gap-2">
            {(vd.captions || []).length > 0 && (
              <button
                type="button"
                disabled={generatingChapters}
                onClick={async () => {
                  const captionTrack = (vd.captions || []).find((c: any) => c.src);
                  if (!captionTrack) {
                    alert('Upload a caption/transcript file first, then use this to auto-generate chapters.');
                    return;
                  }
                  setGeneratingChapters(true);
                  try {
                    const captionRes = await fetch(captionTrack.src);
                    if (!captionRes.ok) throw new Error('Failed to fetch caption file');
                    const transcriptText = await captionRes.text();

                    const res = await fetch('/api/ai/video-chapters', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        transcript: transcriptText,
                        videoDuration: vd.duration || 0,
                        videoTitle: vd.title || title,
                      }),
                    });
                    if (!res.ok) {
                      const err = await res.json();
                      throw new Error(err.error || 'Failed to generate chapters');
                    }
                    const data = await res.json();
                    if (data.chapters && data.chapters.length > 0) {
                      updateVideo({ chapters: data.chapters });
                    }
                  } catch (err: any) {
                    alert(`Failed to generate chapters: ${err.message}`);
                  } finally {
                    setGeneratingChapters(false);
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                {generatingChapters ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Generating…
                  </>
                ) : (
                  <>✨ AI Generate</>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const chapters = [...(vd.chapters || []), { time: 0, title: '', description: '' }];
                updateVideo({ chapters });
              }}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              + Add Chapter
            </button>
          </div>
        </div>
        {(vd.chapters || []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            No chapters added.
            {(vd.captions || []).length > 0
              ? ' Click "AI Generate" to auto-create chapters from your transcript.'
              : ' Add a caption track in Accessibility below, then use AI to auto-generate chapters.'}
          </p>
        ) : (
          <div className="space-y-3">
            {(vd.chapters || []).map((ch: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border">
                <div className="w-20 flex-shrink-0">
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Time (s)</label>
                  <input
                    type="number"
                    min="0"
                    value={ch.time || 0}
                    onChange={(e) => {
                      const chapters = [...(vd.chapters || [])];
                      chapters[i] = { ...chapters[i], time: Number(e.target.value) || 0 };
                      updateVideo({ chapters });
                    }}
                    className="w-full rounded border bg-white px-2 py-1.5 text-sm text-gray-900"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Title</label>
                  <input
                    value={ch.title || ''}
                    onChange={(e) => {
                      const chapters = [...(vd.chapters || [])];
                      chapters[i] = { ...chapters[i], title: e.target.value };
                      updateVideo({ chapters });
                    }}
                    placeholder="Chapter title"
                    className="w-full rounded border bg-white px-2 py-1.5 text-sm text-gray-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const chapters = (vd.chapters || []).filter((_: any, j: number) => j !== i);
                    updateVideo({ chapters });
                  }}
                  className="mt-5 text-xs text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card 3: Accessibility */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Accessibility</h2>
        <p className="text-xs text-gray-500 mb-4">Captions and audio descriptions for WCAG compliance. Captions are legally required; audio descriptions required by April 2026.</p>

        {/* Captions */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-800">Captions / Subtitles</h3>
            <div className="flex items-center gap-2">
              {lessonId && vd.url && (
                <button
                  type="button"
                  disabled={isTranscribing}
                  onClick={async () => {
                    if (!lessonId) return;
                    setIsTranscribing(true);
                    setTranscribeError(null);
                    try {
                      const res = await fetch('/api/ai/transcribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ lessonId }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Transcription failed');

                      // Add the auto-generated caption as a track in the video content
                      const caption = data.caption;
                      if (caption) {
                        const existingCaptions = (vd.captions || []).filter(
                          (c: any) => c.srclang !== caption.language
                        );
                        const newCaption = {
                          src: caption.caption_url || '',
                          srclang: caption.language === 'english' ? 'en' : caption.language,
                          label: caption.label || 'English (Auto-generated)',
                          default: true,
                          autoGenerated: true,
                        };
                        updateVideo({
                          captions: [
                            ...existingCaptions.map((c: any) => ({ ...c, default: false })),
                            newCaption,
                          ],
                        });
                      }

                      const stats = data.stats;
                      alert(`Transcript generated successfully!\n\n${stats.segments} segments, ${Math.round(stats.duration)}s duration.\nEstimated cost: ${stats.estimatedCost}`);
                    } catch (err: any) {
                      setTranscribeError(err.message);
                    } finally {
                      setIsTranscribing(false);
                    }
                  }}
                  className="px-3 py-1 text-xs font-medium bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {isTranscribing ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Transcribing…
                    </>
                  ) : (
                    <>✨ Auto-Transcribe</>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const captions = [...(vd.captions || []), { src: '', srclang: 'en', label: 'English', default: (vd.captions || []).length === 0 }];
                  updateVideo({ captions });
                }}
                className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                + Add Caption Track
              </button>
            </div>
          </div>
          {transcribeError && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {transcribeError}
            </div>
          )}
          {isTranscribing && (
            <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-700 flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Downloading video and generating transcript with AI... This may take a minute for longer videos.
            </div>
          )}
          {(vd.captions || []).length === 0 && !isTranscribing ? (
            <p className="text-sm text-gray-400 text-center py-3">
              No captions added.
              {lessonId && vd.url
                ? ' Click "Auto-Transcribe" to generate captions with AI, or upload VTT/SRT files manually.'
                : ' Upload VTT or SRT files for each language.'}
            </p>
          ) : (
            <div className="space-y-2">
              {(vd.captions || []).map((cap: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border">
                  <select
                    value={cap.srclang || 'en'}
                    onChange={(e) => {
                      const captions = [...(vd.captions || [])];
                      const langLabels: Record<string, string> = { en: 'English', es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese', it: 'Italian', nl: 'Dutch', ru: 'Russian', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', ar: 'Arabic', hi: 'Hindi' };
                      captions[i] = { ...captions[i], srclang: e.target.value, label: langLabels[e.target.value] || e.target.value };
                      updateVideo({ captions });
                    }}
                    className="rounded border bg-white px-2 py-1 text-xs text-gray-900 w-28"
                  >
                    {[['en', 'English'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['pt', 'Portuguese'], ['it', 'Italian'], ['nl', 'Dutch'], ['ru', 'Russian'], ['zh', 'Chinese'], ['ja', 'Japanese'], ['ko', 'Korean'], ['ar', 'Arabic'], ['hi', 'Hindi']].map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                  <input
                    value={cap.src || ''}
                    onChange={(e) => {
                      const captions = [...(vd.captions || [])];
                      captions[i] = { ...captions[i], src: e.target.value };
                      updateVideo({ captions });
                    }}
                    placeholder="Caption file URL (.vtt or .srt)"
                    className="flex-1 rounded border bg-white px-2 py-1 text-xs text-gray-900"
                  />
                  <FileUpload onUploaded={(res) => {
                    const captions = [...(vd.captions || [])];
                    captions[i] = { ...captions[i], src: res.fileUrl };
                    updateVideo({ captions });
                  }} />
                  <label className="flex items-center gap-1 text-xs text-gray-600">
                    <input
                      type="radio"
                      name="default-caption"
                      checked={Boolean(cap.default)}
                      onChange={() => {
                        const captions = (vd.captions || []).map((c: any, j: number) => ({ ...c, default: j === i }));
                        updateVideo({ captions });
                      }}
                      className="h-3 w-3"
                    />
                    Default
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const captions = (vd.captions || []).filter((_: any, j: number) => j !== i);
                      updateVideo({ captions });
                    }}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audio Description */}
        <div>
          <h3 className="text-sm font-medium text-gray-800 mb-2">Audio Description Track</h3>
          <p className="text-xs text-gray-500 mb-2">An audio narration describing visual information for blind/low-vision users.</p>
          <div className="flex items-center gap-2">
            <input
              value={vd.audioDescriptionSrc || ''}
              onChange={(e) => updateVideo({ audioDescriptionSrc: e.target.value })}
              placeholder="Audio description file URL (.mp3, .ogg)"
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-oecs-lime-green focus:ring-1 focus:ring-oecs-lime-green"
            />
            <FileUpload onUploaded={(res) => updateVideo({ audioDescriptionSrc: res.fileUrl })} />
          </div>
        </div>
      </div>
    </>
  );
}

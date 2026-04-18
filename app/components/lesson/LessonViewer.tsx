'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import TextEditor from '@/app/components/editor/TextEditor';
import type { CheckpointQuestion } from '@/app/components/media/InteractiveVideoPlayer';

const VideoPlayer = dynamic(() => import('@/app/components/media/VideoPlayer'), {
  ssr: false,
  loading: () => <div className="w-full aspect-video bg-gray-100 animate-pulse rounded-lg" />,
});

const InteractiveVideoPlayer = dynamic(() => import('@/app/components/media/InteractiveVideoPlayer'), {
  ssr: false,
  loading: () => <div className="w-full aspect-video bg-gray-100 animate-pulse rounded-lg" />,
});

const CodeSandbox = dynamic(() => import('@/app/components/media/CodeSandbox'), {
  ssr: false,
  loading: () => <div className="w-full aspect-video bg-gray-100 animate-pulse rounded-lg" />,
});

const WhiteboardViewer = dynamic(() => import('@/app/components/whiteboard/WhiteboardViewer'), {
  ssr: false,
  loading: () => <div className="w-full aspect-video bg-gray-100 animate-pulse rounded-lg" />,
});
import AutoResizeTextContent from '@/app/components/AutoResizeTextContent';
import QuizStatusButton from '@/app/components/quiz/QuizStatusButton';
import { sanitizeHtml } from '@/lib/sanitize';
import SlideshowViewer from '@/app/components/media/SlideshowViewer';
import { BookmarkButton, NotesPanel } from '@/app/components/student';
import Link from 'next/link';
import { Bookmark, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';
import { useActivityLogger, ACTIVITY_TYPES, ITEM_TYPES, ACTIONS } from '@/lib/hooks/useActivityLogger';
import LoadingIndicator from '@/app/components/ui/LoadingIndicator';
import StudyToolbar from './viewer/StudyToolbar';
import FullscreenContentOverlay from './viewer/FullscreenContentOverlay';
import OrphanContentCard from './viewer/OrphanContentCard';
import ContentProgressCheckboxExtracted from './viewer/ContentProgressCheckbox';
import LabelBlock from './viewer/blocks/LabelBlock';
import ImageBlock from './viewer/blocks/ImageBlock';
import EmbedBlock from './viewer/blocks/EmbedBlock';
import AudioBlock from './viewer/blocks/AudioBlock';
import PdfBlock from './viewer/blocks/PdfBlock';
import FileBlock from './viewer/blocks/FileBlock';
import { useCollapseState } from './viewer/hooks/useCollapseState';
import { useContentProgress } from './viewer/hooks/useContentProgress';
import { useQuizAssignmentData } from './viewer/hooks/useQuizAssignmentData';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ContentItem = {
  type: 'video'|'text'|'slideshow'|'file'|'embed'|'quiz'|'assignment'|'image'|'pdf'|'audio'|'interactive_video'|'code_sandbox'|'label'|'survey'|'whiteboard';
  title: string;
  data: any;
  id?: string;
};

// Component to log content view when it becomes visible
function VideoContentLogger({ isVisible, onView }: { isVisible: boolean; onView: () => void }) {
  const hasLogged = React.useRef(false);

  React.useEffect(() => {
    if (isVisible && !hasLogged.current) {
      hasLogged.current = true;
      onView();
    }
  }, [isVisible, onView]);

  return null;
}

interface LessonViewerProps {
  content: ContentItem[];
  lessonId: string;
  courseId?: string;
  lessonTitle?: string;
  isInstructor?: boolean;
  onContentUpdate?: () => void;
}

export default function LessonViewer({ content, lessonId, courseId, lessonTitle, isInstructor = false, onContentUpdate }: LessonViewerProps) {
  const { logActivity } = useActivityLogger();
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [isNotesPanelOpen, setIsNotesPanelOpen] = React.useState(false);

  // Quiz + assignment records (auto-fetched based on content)
  const { quizData, assignmentData, loadingData, notFoundQuizzes, notFoundAssignments } =
    useQuizAssignmentData(content);

  // Profile + content-progress (completion checkboxes)
  const { profileId, contentProgress, toggleContentComplete } = useContentProgress(lessonId);

  // Fullscreen text content state
  const [fullscreenContent, setFullscreenContent] = React.useState<{ title: string; html: string } | null>(null);

  // Close fullscreen on Escape key
  React.useEffect(() => {
    if (!fullscreenContent) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenContent(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [fullscreenContent]);

  // Collapsible content state — localStorage-backed, labels never auto-collapse.
  const {
    toggleCollapse,
    collapseAll,
    expandAll,
    isCollapsed,
    collapsedCount,
    allCollapsed,
  } = useCollapseState(lessonId, content);

  // Log lesson viewed activity (students only)
  React.useEffect(() => {
    if (isInstructor) return;

    logActivity({
      courseId,
      activityType: ACTIVITY_TYPES.LESSON_VIEWED,
      itemId: lessonId,
      itemType: ITEM_TYPES.LESSON,
      action: ACTIONS.VIEWED,
      metadata: { lessonTitle, contentCount: content.length }
    });
  }, [lessonId, courseId, lessonTitle, isInstructor, content.length, logActivity]);

  // Log file/resource access activity
  const logContentAccess = (contentType: string, contentTitle: string, action: string, metadata?: Record<string, unknown>) => {
    if (isInstructor) return;

    logActivity({
      courseId,
      activityType: contentType === 'pdf' ? 'pdf_viewed' : contentType === 'file' ? 'file_downloaded' : `${contentType}_accessed`,
      itemId: lessonId,
      itemType: contentType,
      action,
      metadata: {
        lessonId,
        lessonTitle,
        contentTitle,
        ...metadata
      }
    });
  };

  // Thin wrapper around the extracted ContentProgressCheckbox that binds
  // the block index + item to the hook's toggle function and hides the
  // checkbox entirely for label blocks.
  const ContentProgressCheckbox = ({ index, item }: { index: number; item: ContentItem }) => {
    if (item.type === 'label') return null;
    return (
      <ContentProgressCheckboxExtracted
        isComplete={contentProgress[index] || false}
        onToggle={() => toggleContentComplete(index, item)}
      />
    );
  };

  // Remove orphan content item (quiz or assignment that no longer exists)
  const removeOrphanContent = async (contentType: 'quiz' | 'assignment', itemId: string) => {
    if (!confirm("This item no longer exists. Would you like to remove it from this lesson?")) {
      return;
    }

    try {
      // Fetch current lesson content
      const lessonResponse = await fetch(`/api/lessons/${lessonId}`);
      if (!lessonResponse.ok) {
        alert("Failed to fetch lesson data");
        return;
      }

      const lessonData = await lessonResponse.json();
      const currentContent = lessonData.content || [];

      // Filter out the orphan item
      const updatedContent = currentContent.filter((item: any) => {
        if (contentType === 'quiz' && item?.type === 'quiz' && item?.data?.quizId === itemId) {
          return false;
        }
        if (contentType === 'assignment' && item?.type === 'assignment' && item?.data?.assignmentId === itemId) {
          return false;
        }
        return true;
      });

      // Update the lesson
      const updateResponse = await fetch(`/api/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lessonData, content: updatedContent })
      });

      if (!updateResponse.ok) {
        alert("Failed to update lesson");
        return;
      }

      // Refresh the lesson content
      onContentUpdate?.();
    } catch (error) {
      console.error('Error removing orphan content:', error);
      alert("Failed to remove item. Please try again.");
    }
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) {
      return;
    }

    try {
      setDeleting(quizId);
      
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to delete quiz: ${errorData.error}`);
        return;
      }

      alert("Quiz deleted successfully");
      onContentUpdate?.();
    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert("Failed to delete quiz. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const deleteAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this assignment? This action cannot be undone.")) {
      return;
    }

    try {
      setDeleting(assignmentId);
      
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to delete assignment: ${errorData.error}`);
        return;
      }

      alert("Assignment deleted successfully");
      onContentUpdate?.();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert("Failed to delete assignment. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const renderContentItem = (item: ContentItem, index: number) => {
    switch (item.type) {
      case 'text':
        return (
          <div className="bg-white rounded-lg border border-gray-200/80 transition-colors">
            {item.title && (
              <div
                className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
                onClick={() => toggleCollapse(index)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">Reading</span>
                    <span className="truncate">{item.title}</span>
                  </h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <ContentProgressCheckbox index={index} item={item} />
                    <BookmarkButton
                      type="lesson_content"
                      id={lessonId}
                      size="sm"
                      className="text-white/50 hover:text-white/80"
                      metadata={{ content_type: 'text', content_title: item.title, content_index: index }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const html = typeof item.data === 'string' ? item.data : (item.data?.html || '');
                        setFullscreenContent({ title: item.title, html });
                      }}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                      title="View fullscreen"
                    >
                      <Maximize2 className="w-4 h-4 text-white/50" />
                    </button>
                    <div className="p-1 rounded hover:bg-white/10 transition-colors">
                      {isCollapsed(index) ? (
                        <ChevronDown className="w-4 h-4 text-white/50" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-white/50" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed(index) ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'}`}>
              <div className="relative p-4 sm:p-6">
                {!item.title && (
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => {
                        const html = typeof item.data === 'string' ? item.data : (item.data?.html || '');
                        setFullscreenContent({ title: item.title || 'Content', html });
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-400 hover:text-slate-600 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors text-xs"
                      title="View fullscreen"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Fullscreen</span>
                    </button>
                  </div>
                )}
                <AutoResizeTextContent
                  content={typeof item.data === 'string' ? item.data : (item.data?.html || '')}
                  minHeight={150}
                  maxHeight={1000}
                  className="text-content prose prose-sm sm:prose-base max-w-none prose-headings:font-medium prose-headings:text-slate-800"
                />
              </div>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
            {item.title && (
              <div
                className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
                onClick={() => toggleCollapse(index)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">Video</span>
                    <span className="truncate">{item.title}</span>
                  </h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <ContentProgressCheckbox index={index} item={item} />
                    <BookmarkButton
                      type="lesson_content"
                      id={lessonId}
                      size="sm"
                      className="text-white/50 hover:text-white/80"
                      metadata={{ content_type: 'video', content_title: item.title, content_index: index }}
                    />
                    <div className="p-1 rounded hover:bg-white/10 transition-colors">
                      {isCollapsed(index) ? (
                        <ChevronDown className="w-4 h-4 text-white/50" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-white/50" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed(index) ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'}`}>
              <div className="p-4 sm:p-6">
                <VideoContentLogger
                  isVisible={!isCollapsed(index)}
                  onView={() => logContentAccess('video', item.title || item.data?.title || 'Video', 'viewed', { videoUrl: item.data?.url })}
                />
                <VideoPlayer
                  src={item.data?.url || item.data}
                  title={item.data?.title || 'Video Content'}
                  lessonId={lessonId}
                  contentIndex={index}
                  chapters={item.data?.chapters}
                  captions={item.data?.captions}
                  audioDescriptionSrc={item.data?.audioDescriptionSrc}
                  preventSkipping={item.data?.preventSkipping}
                  courseId={courseId}
                  onDurationDetected={(dur) => {
                    // Store duration in item data for analytics
                    if (item.data && !item.data.duration) {
                      item.data.duration = dur;
                    }
                  }}
                  onWatchProgress={(data) => {
                    // Report watch progress to analytics API
                    if (profileId) {
                      fetch(`/api/progress/${profileId}/${lessonId}/content`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          content_index: index,
                          content_type: 'video',
                          content_title: item.title || item.data?.title,
                          completed: data.percentWatched >= 90,
                          metadata: {
                            percentWatched: data.percentWatched,
                            totalWatchTime: Math.round(data.totalWatchTime),
                            videoDuration: Math.round(data.duration),
                            lastPosition: Math.round(data.currentTime),
                          }
                        })
                      }).catch(() => {});
                    }
                  }}
                />
                {item.data?.description && (
                  <div className="mt-4 pl-4 border-l-2 border-slate-200">
                    <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Notes</h4>
                    <div
                      className="prose prose-sm max-w-none text-slate-600 prose-headings:text-slate-800 prose-headings:font-medium"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.data.description) }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'audio':
        return (
          <AudioBlock
            index={index}
            lessonId={lessonId}
            title={item.title}
            fileId={item.data?.fileId}
            url={item.data?.url}
            fileName={item.data?.fileName}
            transcript={item.data?.transcript}
            showTranscript={item.data?.showTranscript}
            isCollapsed={isCollapsed(index)}
            onToggleCollapse={() => toggleCollapse(index)}
            isComplete={contentProgress[index] || false}
            onToggleComplete={() => toggleContentComplete(index, item)}
          />
        );

      case 'interactive_video':
        return (
          <div className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
            {item.title && (
              <div
                className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
                onClick={() => toggleCollapse(index)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">Interactive</span>
                    <span className="truncate">{item.title}</span>
                    {item.data?.checkpoints?.length > 0 && (
                      <span className="ml-3 px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-slate-400 font-normal">
                        {item.data.checkpoints.length} checkpoint{item.data.checkpoints.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <ContentProgressCheckbox index={index} item={item} />
                    <BookmarkButton
                      type="lesson_content"
                      id={lessonId}
                      size="sm"
                      className="text-white/50 hover:text-white/80"
                      metadata={{ content_type: 'interactive_video', content_title: item.title, content_index: index }}
                    />
                    <div className="p-1 rounded hover:bg-white/10 transition-colors">
                      {isCollapsed(index) ? (
                        <ChevronDown className="w-4 h-4 text-white/50" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-white/50" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed(index) ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'}`}>
              <div className="p-4 sm:p-6">
              {item.data?.fileId || item.data?.url || item.data?.videoUrl ? (
                <>
                  <InteractiveVideoPlayer
                    src={item.data?.url || item.data?.videoUrl || `/api/files/${item.data?.fileId}`}
                    title={item.data?.title || item.title || 'Interactive Video'}
                    checkpoints={(item.data?.checkpoints || []).map((cp: any) => ({
                      id: cp.id || cp.timestamp?.toString(),
                      timestamp: Number(cp.timestamp || 0),
                      questionText: cp.questionText || cp.question_text || '',
                      questionType: cp.questionType || cp.question_type || 'multiple_choice',
                      options: cp.options || [],
                      correctAnswer: cp.correctAnswer || cp.correct_answer,
                      feedback: cp.feedback || '',
                      points: cp.points || 1
                    }))}
                    showProgress={true}
                  />
                  {/* Video Description/Notes for Students */}
                  {item.data?.description && (
                    <div className="mt-4 pl-4 border-l-2 border-slate-200">
                      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Notes</h4>
                      <div
                        className="prose prose-sm max-w-none text-slate-600 prose-headings:text-slate-800 prose-headings:font-medium"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.data.description) }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="p-12 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500 bg-gray-50">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg font-medium">Interactive video not configured yet</p>
                  <p className="text-sm">Upload a video and add checkpoints to see it here</p>
                </div>
              )}
              </div>
            </div>
          </div>
        );

      case 'code_sandbox':
        return (
          <div className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
            {item.title && (
              <div
                className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
                onClick={() => toggleCollapse(index)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">Code</span>
                    <span className="truncate">{item.title}</span>
                  </h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <ContentProgressCheckbox index={index} item={item} />
                    <BookmarkButton
                      type="lesson_content"
                      id={lessonId}
                      size="sm"
                      className="text-white/50 hover:text-white/80"
                      metadata={{ content_type: 'code_sandbox', content_title: item.title, content_index: index }}
                    />
                    <div className="p-1 rounded hover:bg-white/10 transition-colors">
                      {isCollapsed(index) ? (
                        <ChevronDown className="w-4 h-4 text-white/50" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-white/50" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed(index) ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'}`}>
              <div className="p-0">
                <CodeSandbox
                  title={item.data?.title || item.title || 'Code Sandbox'}
                  language={item.data?.language || 'javascript'}
                  initialCode={item.data?.code || item.data?.initialCode}
                  template={item.data?.template}
                  instructions={item.data?.instructions}
                  readOnly={item.data?.readOnly || false}
                />
              </div>
            </div>
          </div>
        );

      case 'whiteboard':
        return (
          <div className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
            {item.title && (
              <div
                className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
                onClick={() => toggleCollapse(index)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">Board</span>
                    <span className="truncate">{item.title}</span>
                  </h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <ContentProgressCheckbox index={index} item={item} />
                    <div className="p-1 rounded hover:bg-white/10 transition-colors">
                      {isCollapsed(index) ? (
                        <ChevronDown className="w-4 h-4 text-white/50" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-white/50" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed(index) ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'}`}>
              <div className="p-4">
                <WhiteboardViewer
                  whiteboardId={item.data?.whiteboard_id}
                  elements={item.data?.elements}
                  appState={item.data?.app_state}
                  title={item.title}
                  height="450px"
                />
              </div>
            </div>
          </div>
        );

      case 'image':
        return (
          <ImageBlock
            index={index}
            lessonId={lessonId}
            title={item.title}
            fileId={item.data?.fileId}
            url={item.data?.url}
            alt={item.data?.title}
            isCollapsed={isCollapsed(index)}
            onToggleCollapse={() => toggleCollapse(index)}
            isComplete={contentProgress[index] || false}
            onToggleComplete={() => toggleContentComplete(index, item)}
          />
        );

      case 'pdf':
        return (
          <PdfBlock
            index={index}
            lessonId={lessonId}
            title={item.title}
            fileId={item.data?.fileId}
            url={item.data?.url}
            fileName={item.data?.fileName}
            isCollapsed={isCollapsed(index)}
            onToggleCollapse={() => toggleCollapse(index)}
            isComplete={contentProgress[index] || false}
            onToggleComplete={() => toggleContentComplete(index, item)}
            onOpen={(fileName) =>
              logContentAccess('pdf', fileName, 'viewed', { fileName })
            }
          />
        );

      case 'file':
        return (
          <FileBlock
            index={index}
            lessonId={lessonId}
            title={item.data?.title}
            fileId={item.data?.fileId}
            url={item.data?.url}
            fileName={item.data?.fileName}
            isCollapsed={isCollapsed(index)}
            onToggleCollapse={() => toggleCollapse(index)}
            isComplete={contentProgress[index] || false}
            onToggleComplete={() => toggleContentComplete(index, item)}
            onDownload={(fileName) =>
              logContentAccess('file', fileName, 'downloaded', { fileName })
            }
          />
        );

      case 'embed':
        return (
          <EmbedBlock
            index={index}
            lessonId={lessonId}
            title={item.data?.title}
            url={item.data?.url || item.data}
            isCollapsed={isCollapsed(index)}
            onToggleCollapse={() => toggleCollapse(index)}
            isComplete={contentProgress[index] || false}
            onToggleComplete={() => toggleContentComplete(index, item)}
          />
        );

      case 'slideshow': {
        // Extract slideshow URL - handle both string and object formats
        let slideshowUrl = '';
        if (typeof item.data === 'string') {
          slideshowUrl = item.data;
        } else if (item.data?.url) {
          slideshowUrl = item.data.url;
        } else if (item.data) {
          // Fallback: try to stringify if it's not a string
          slideshowUrl = String(item.data);
        }

        const slideshowTitle = item.data?.title || item.title || 'Slideshow';
        const slideshowEmbedType = item.data?.embedType || 'auto';

        // Only render if we have a valid URL
        if (!slideshowUrl || slideshowUrl.trim() === '') {
          return (
            <div key={index} className="group bg-white rounded-lg overflow-hidden border border-gray-200 shadow-md p-4">
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900 mb-2">{slideshowTitle}</p>
                <p className="text-red-600">No slideshow URL provided. Please edit this lesson to add a slideshow URL.</p>
              </div>
            </div>
          );
        }

        return (
          <div key={index} className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
            <div
              className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
              onClick={() => toggleCollapse(index)}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">Slides</span>
                  <span className="truncate">{slideshowTitle}</span>
                </h3>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <ContentProgressCheckbox index={index} item={item} />
                  <BookmarkButton
                    type="lesson_content"
                    id={lessonId}
                    size="sm"
                    className="text-white/50 hover:text-white/80"
                    metadata={{ content_type: 'slideshow', content_title: slideshowTitle, content_index: index }}
                  />
                  <div className="p-1 rounded hover:bg-white/10 transition-colors">
                    {isCollapsed(index) ? (
                      <ChevronDown className="w-4 h-4 text-white/50" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-white/50" />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed(index) ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'}`}>
              <div className="p-4 sm:p-6">
                <SlideshowViewer
                  url={slideshowUrl.trim()}
                  title={slideshowTitle}
                  embedType={slideshowEmbedType}
                />
              </div>
            </div>
          </div>
        );
      }

      case 'quiz':
        // Check if this quiz was deleted (not found)
        if (item.data?.quizId && notFoundQuizzes.has(item.data.quizId)) {
          return (
            <OrphanContentCard
              kind="quiz"
              canRemove={isInstructor}
              onRemove={() => removeOrphanContent('quiz', item.data.quizId)}
            />
          );
        }

        return (
          <div className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
            {item.title && (
              <div
                className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
                onClick={() => toggleCollapse(index)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">Quiz</span>
                    <span className="truncate">{item.title}</span>
                  </h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <ContentProgressCheckbox index={index} item={item} />
                    <div className="p-1 rounded hover:bg-white/10 transition-colors">
                      {isCollapsed(index) ? (
                        <ChevronDown className="w-4 h-4 text-white/50" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-white/50" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed(index) ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'}`}>
              <div className="p-4 sm:p-6">
              {item.data?.quizId ? (
                <div className="border border-gray-100 rounded-md overflow-hidden" style={{ willChange: 'auto' }}>
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                      <div className="flex-1 min-w-0 w-full min-h-[60px]">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-slate-800 text-sm sm:text-base">Quiz</h4>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded uppercase tracking-wider">Assessment</span>
                        </div>
                        {loadingData.has(item.data.quizId) ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500 pb-2">
                            <LoadingIndicator variant="dots" size="xs" text="Loading quiz details..." />
                          </div>
                        ) : quizData[item.data.quizId] ? (
                          <div className="space-y-3">
                            <div className="text-sm sm:text-base text-gray-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(quizData[item.data.quizId].description || "Test your knowledge and understanding") }} />
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                              <span>{quizData[item.data.quizId].points || 100} pts</span>
                              <span className="text-slate-200">|</span>
                              <span>{quizData[item.data.quizId].questions?.length || 0} questions</span>
                              {quizData[item.data.quizId].time_limit && (
                                <>
                                  <span className="text-slate-200">|</span>
                                  <span>{quizData[item.data.quizId].time_limit} min</span>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-gray-600">Test your knowledge and understanding</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6 w-full sm:w-auto min-h-[40px]">
                      {quizData[item.data.quizId] ? (
                        <QuizStatusButton quiz={quizData[item.data.quizId]} quizId={item.data.quizId} />
                      ) : (
                        <div className="px-4 py-2 bg-gray-200 text-gray-600 text-sm font-medium rounded-lg cursor-not-allowed self-start">
                          Loading...
                        </div>
                      )}
                      {isInstructor && (
                        <>
                          <Link
                            href={`/quizzes/${item.data.quizId}/edit`}
                            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                            title="Edit Quiz"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="hidden sm:inline">Edit Quiz</span>
                            <span className="sm:hidden">Edit</span>
                          </Link>
                          <button
                            onClick={() => deleteQuiz(item.data.quizId)}
                            disabled={deleting === item.data.quizId}
                            className="inline-flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            title="Delete Quiz"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="hidden sm:inline">{deleting === item.data.quizId ? "Deleting..." : "Delete"}</span>
                            <span className="sm:hidden">{deleting === item.data.quizId ? "Deleting..." : "Delete"}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500 bg-gray-50">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-medium">Quiz not configured yet</p>
                  <p className="text-sm">Create a quiz to test your students</p>
                </div>
              )}
              </div>
            </div>
          </div>
        );

      case 'assignment':
        // Check if this assignment was deleted (not found)
        if (item.data?.assignmentId && notFoundAssignments.has(item.data.assignmentId)) {
          return (
            <OrphanContentCard
              kind="assignment"
              canRemove={isInstructor}
              onRemove={() => removeOrphanContent('assignment', item.data.assignmentId)}
            />
          );
        }

        return (
          <div key={index} className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
            <div
              className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
              onClick={() => toggleCollapse(index)}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">Assignment</span>
                  <span className="truncate">{item.title || 'Assignment'}</span>
                </h3>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <ContentProgressCheckbox index={index} item={item} />
                  <div className="p-1 rounded hover:bg-white/10 transition-colors">
                    {isCollapsed(index) ? (
                      <ChevronDown className="w-4 h-4 text-white/50" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-white/50" />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed(index) ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'}`}>
              <div className="p-4 sm:p-6">
              {item.data?.assignmentId ? (
                <div className="border border-gray-100 rounded-md overflow-hidden" style={{ willChange: 'auto' }}>
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                      <div className="flex-1 min-w-0 w-full min-h-[60px]">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-slate-800 text-sm sm:text-base">Assignment</h4>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded uppercase tracking-wider">Submission</span>
                        </div>
                        {loadingData.has(item.data.assignmentId) ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500 pb-2">
                            <LoadingIndicator variant="dots" size="xs" text="Loading assignment details..." />
                          </div>
                        ) : assignmentData[item.data.assignmentId] ? (
                          <div className="space-y-3">
                            <div className="text-sm sm:text-base text-gray-700 leading-relaxed line-clamp-2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(assignmentData[item.data.assignmentId].description || "Complete this assignment") }} />
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                              <span>{assignmentData[item.data.assignmentId].points || 100} pts</span>
                              {assignmentData[item.data.assignmentId].due_date && (
                                <>
                                  <span className="text-slate-200">|</span>
                                  <span>Due: {new Date(assignmentData[item.data.assignmentId].due_date).toLocaleDateString()}</span>
                                </>
                              )}
                              <span className="text-slate-200">|</span>
                              <span>{assignmentData[item.data.assignmentId].submission_types?.join(', ') || 'File'} submission</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-gray-600">Complete this assignment</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6 w-full sm:w-auto min-h-[40px]">
                      <Link
                        href={`/assignment/${item.data.assignmentId}`}
                        className="inline-flex items-center justify-center px-4 py-2 border border-teal-600 text-teal-700 hover:bg-teal-50 rounded-md text-sm transition-colors self-start"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Assignment
                      </Link>
                      {isInstructor && (
                        <>
                          <Link
                            href={`/assignments/${item.data.assignmentId}/edit`}
                            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                            title="Edit Assignment"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="hidden sm:inline">Edit Assignment</span>
                            <span className="sm:hidden">Edit</span>
                          </Link>
                          <button
                            onClick={() => deleteAssignment(item.data.assignmentId)}
                            disabled={deleting === item.data.assignmentId}
                            className="inline-flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            title="Delete Assignment"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="hidden sm:inline">{deleting === item.data.assignmentId ? "Deleting..." : "Delete"}</span>
                            <span className="sm:hidden">{deleting === item.data.assignmentId ? "Deleting..." : "Delete"}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                  Assignment not configured yet
                </div>
              )}
              </div>
            </div>
          </div>
        );

      case 'label':
        return (
          <LabelBlock
            text={item.data?.text || item.title || ''}
            style={item.data?.style || 'heading'}
            size={item.data?.size || 'medium'}
          />
        );

      case 'survey':
        const surveyId = item.data?.surveyId;
        return (
          <div key={index} className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
            <div
              className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
              onClick={() => toggleCollapse(index)}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">Survey</span>
                  <span className="truncate">{item.title || 'Survey'}</span>
                </h3>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <ContentProgressCheckbox index={index} item={item} />
                  <BookmarkButton
                    type="lesson_content"
                    id={lessonId}
                    size="sm"
                    className="text-white/50 hover:text-white/80"
                    metadata={{ content_type: 'survey', content_title: item.title, content_index: index }}
                  />
                  <div className="p-1 rounded hover:bg-white/10 transition-colors">
                    {isCollapsed(index) ? (
                      <ChevronDown className="w-4 h-4 text-white/50" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-white/50" />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed(index) ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'}`}>
              <div className="p-4 sm:p-6">
                {surveyId ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500">{item.data?.description || 'Please complete this survey to provide feedback.'}</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link
                        href={`/surveys/${surveyId}/take`}
                        className="inline-flex items-center justify-center px-4 py-2 border border-teal-600 text-teal-700 hover:bg-teal-50 rounded-md text-sm transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        Take Survey
                      </Link>
                      {isInstructor && (
                        <>
                          <Link
                            href={`/surveys/${surveyId}/results`}
                            className="inline-flex items-center justify-center px-6 py-3 border border-teal-600 text-teal-700 hover:bg-teal-50 rounded-lg font-medium transition-all duration-200 text-sm"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            View Results
                          </Link>
                          <Link
                            href={`/surveys/${surveyId}/edit`}
                            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200 text-sm"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Survey
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500 bg-gray-50">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <p className="text-lg font-medium">Survey not configured</p>
                    <p className="text-sm">Add a survey ID to enable this content</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div key={index} className="my-4 p-4 border rounded-lg bg-gray-50">
            <p className="text-gray-500">Unknown content type: {item.type}</p>
          </div>
        );
    }
  };

  if (!content || content.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Available</h3>
        <p className="text-gray-500">This lesson doesn't have any materials yet.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Tools Toolbar */}
      <StudyToolbar
        allCollapsed={allCollapsed}
        collapsedCount={collapsedCount}
        lessonId={lessonId}
        onCollapseAll={collapseAll}
        onExpandAll={expandAll}
        onOpenNotes={() => setIsNotesPanelOpen(true)}
      />

      {/* Lesson Content */}
      <div className="space-y-4 sm:space-y-5">
        {content.map((item, index) => (
          <div key={item.id || index} id={`content-${index}`} className="group scroll-mt-20">
            {renderContentItem(item, index)}
          </div>
        ))}
      </div>

      {/* Notes Panel */}
      <NotesPanel
        lessonId={lessonId}
        isOpen={isNotesPanelOpen}
        onClose={() => setIsNotesPanelOpen(false)}
      />

      {/* Fullscreen Text Content Overlay */}
      {fullscreenContent && (
        <FullscreenContentOverlay
          title={fullscreenContent.title}
          html={fullscreenContent.html}
          onClose={() => setFullscreenContent(null)}
        />
      )}
    </div>
  );
}

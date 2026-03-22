'use client';

import React from 'react';
import TextEditor from '@/app/components/TextEditor';
import VideoPlayer from '@/app/components/VideoPlayer';
import AudioPlayer from '@/app/components/AudioPlayer';
import InteractiveVideoPlayer, { CheckpointQuestion } from '@/app/components/InteractiveVideoPlayer';
import CodeSandbox from '@/app/components/CodeSandbox';
import WhiteboardViewer from '@/app/components/WhiteboardViewer';
import AutoResizeTextContent from '@/app/components/AutoResizeTextContent';
import QuizStatusButton from '@/app/components/QuizStatusButton';
import { sanitizeHtml } from '@/lib/sanitize';
import SlideshowViewer from '@/app/components/SlideshowViewer';
import GoogleFileEmbed, { isGoogleWorkspaceUrl } from '@/app/components/GoogleFileEmbed';
import { BookmarkButton, NotesPanel } from '@/app/components/student';
import Link from 'next/link';
import { StickyNote, Bookmark, ChevronDown, ChevronUp, ChevronsDownUp, ChevronsUpDown, Check, Square, Maximize2, X } from 'lucide-react';
import { useActivityLogger, ACTIVITY_TYPES, ITEM_TYPES, ACTIONS } from '@/lib/hooks/useActivityLogger';
import LoadingIndicator from '@/app/components/LoadingIndicator';

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
  const [quizData, setQuizData] = React.useState<Record<string, any>>({});
  const [assignmentData, setAssignmentData] = React.useState<Record<string, any>>({});
  const [loadingData, setLoadingData] = React.useState<Set<string>>(new Set());
  const [notFoundQuizzes, setNotFoundQuizzes] = React.useState<Set<string>>(new Set());
  const [notFoundAssignments, setNotFoundAssignments] = React.useState<Set<string>>(new Set());
  const [isNotesPanelOpen, setIsNotesPanelOpen] = React.useState(false);

  // Content progress state
  const [contentProgress, setContentProgress] = React.useState<Record<number, boolean>>({});
  const [profile, setProfile] = React.useState<{ id: string } | null>(null);

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

  // Collapsible content state
  const [collapsedItems, setCollapsedItems] = React.useState<Set<number>>(new Set());

  // Load collapsed state from localStorage on mount
  React.useEffect(() => {
    const storageKey = `lesson-collapsed-${lessonId}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCollapsedItems(new Set(parsed));
        }
      }
    } catch (e) {
      console.error('Error loading collapsed state:', e);
    }
  }, [lessonId]);

  // Save collapsed state to localStorage when it changes
  React.useEffect(() => {
    const storageKey = `lesson-collapsed-${lessonId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(collapsedItems)));
    } catch (e) {
      console.error('Error saving collapsed state:', e);
    }
  }, [collapsedItems, lessonId]);

  // Toggle collapse for a single item
  const toggleCollapse = (index: number) => {
    setCollapsedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Collapse all items
  const collapseAll = () => {
    const allIndices = content.map((_, index) => index).filter(index => {
      // Don't collapse labels
      return content[index].type !== 'label';
    });
    setCollapsedItems(new Set(allIndices));
  };

  // Expand all items
  const expandAll = () => {
    setCollapsedItems(new Set());
  };

  // Check if item is collapsed
  const isCollapsed = (index: number) => collapsedItems.has(index);

  // Fetch profile and content progress on mount
  React.useEffect(() => {
    const fetchProgress = async () => {
      try {
        const profileRes = await fetch('/api/auth/profile', { cache: 'no-store' });
        const profileData = profileRes.ok ? await profileRes.json() : null;
        setProfile(profileData);

        if (profileData?.id) {
          const progressRes = await fetch(`/api/progress/${profileData.id}/${lessonId}/content`, { cache: 'no-store' });
          if (progressRes.ok) {
            const progressData = await progressRes.json();
            const progressMap: Record<number, boolean> = {};
            (progressData || []).forEach((item: { content_index: number; completed: boolean }) => {
              progressMap[item.content_index] = item.completed;
            });
            setContentProgress(progressMap);
          }
        }
      } catch (error) {
        console.error('Failed to fetch content progress:', error);
      }
    };

    fetchProgress();
  }, [lessonId]);

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

  // Toggle content item completion
  const toggleContentComplete = async (index: number, item: ContentItem) => {
    if (!profile?.id) return;

    const newCompleted = !contentProgress[index];

    // Optimistic update
    setContentProgress(prev => ({ ...prev, [index]: newCompleted }));

    try {
      await fetch(`/api/progress/${profile.id}/${lessonId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_index: index,
          content_type: item.type,
          content_title: item.title,
          content_id: item.id,
          completed: newCompleted
        })
      });
    } catch (error) {
      console.error('Failed to toggle content progress:', error);
      // Revert on error
      setContentProgress(prev => ({ ...prev, [index]: !newCompleted }));
    }
  };

  // Progress checkbox component
  const ContentProgressCheckbox = ({ index, item }: { index: number; item: ContentItem }) => {
    if (item.type === 'label') return null;

    const isComplete = contentProgress[index] || false;

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleContentComplete(index, item);
        }}
        className={`p-1 rounded transition-colors ${
          isComplete
            ? 'text-teal-400 hover:text-teal-300'
            : 'text-white/30 hover:text-white/60'
        }`}
        title={isComplete ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {isComplete ? (
          <Check className="w-4 h-4" />
        ) : (
          <Square className="w-4 h-4" />
        )}
      </button>
    );
  };

  // Fetch quiz data
  const fetchQuizData = async (quizId: string) => {
    if (quizData[quizId] || loadingData.has(quizId) || notFoundQuizzes.has(quizId)) return;

    setLoadingData(prev => new Set(prev).add(quizId));
    try {
      const response = await fetch(`/api/quizzes/${quizId}`);
      if (response.ok) {
        const data = await response.json();
        setQuizData(prev => ({ ...prev, [quizId]: data }));
      } else if (response.status === 404) {
        // Quiz was deleted - mark it as not found
        setNotFoundQuizzes(prev => new Set(prev).add(quizId));
      }
    } catch (error) {
      console.error('Error fetching quiz data:', error);
    } finally {
      setLoadingData(prev => {
        const newSet = new Set(prev);
        newSet.delete(quizId);
        return newSet;
      });
    }
  };

  // Fetch assignment data
  const fetchAssignmentData = async (assignmentId: string) => {
    if (assignmentData[assignmentId] || loadingData.has(assignmentId) || notFoundAssignments.has(assignmentId)) return;

    setLoadingData(prev => new Set(prev).add(assignmentId));
    try {
      const response = await fetch(`/api/assignments/${assignmentId}`);
      if (response.ok) {
        const data = await response.json();
        setAssignmentData(prev => ({ ...prev, [assignmentId]: data }));
      } else if (response.status === 404) {
        // Assignment was deleted - mark it as not found
        setNotFoundAssignments(prev => new Set(prev).add(assignmentId));
      }
    } catch (error) {
      console.error('Error fetching assignment data:', error);
    } finally {
      setLoadingData(prev => {
        const newSet = new Set(prev);
        newSet.delete(assignmentId);
        return newSet;
      });
    }
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

  // Fetch data for quizzes and assignments when content changes
  React.useEffect(() => {
    content.forEach(item => {
      if (item.type === 'quiz' && item.data?.quizId) {
        fetchQuizData(item.data.quizId);
      } else if (item.type === 'assignment' && item.data?.assignmentId) {
        fetchAssignmentData(item.data.assignmentId);
      }
    });
  }, [content]);

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
          <div className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
            {item.title && (
              <div
                className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
                onClick={() => toggleCollapse(index)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">Audio</span>
                    <span className="truncate">{item.title}</span>
                  </h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <ContentProgressCheckbox index={index} item={item} />
                    <BookmarkButton
                      type="lesson_content"
                      id={lessonId}
                      size="sm"
                      className="text-white/50 hover:text-white/80"
                      metadata={{ content_type: 'audio', content_title: item.title, content_index: index }}
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
                {item.data?.fileId || item.data?.url || item.data ? (
                  <AudioPlayer
                    src={item.data?.url || `/api/files/${item.data?.fileId}` || item.data}
                    title={item.data?.title || item.data?.fileName || 'Audio Content'}
                    transcript={item.data?.transcript}
                    showTranscript={item.data?.showTranscript}
                  />
                ) : (
                  <div className="p-12 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500 bg-gray-50">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <p className="text-lg font-medium">Audio not uploaded yet</p>
                    <p className="text-sm">Upload an audio file to see it here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
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
          <div className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
            {item.title && (
              <div
                className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
                onClick={() => toggleCollapse(index)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">Image</span>
                    <span className="truncate">{item.title}</span>
                  </h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <ContentProgressCheckbox index={index} item={item} />
                    <BookmarkButton
                      type="lesson_content"
                      id={lessonId}
                      size="sm"
                      className="text-white/50 hover:text-white/80"
                      metadata={{ content_type: 'image', content_title: item.title, content_index: index }}
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
                {item.data?.fileId ? (
                  <div className="text-center">
                    <img
                      src={item.data?.url || `/api/files/${item.data.fileId}`}
                      alt={item.data?.title || 'Image'}
                      className="max-w-full h-auto rounded-lg mx-auto"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="p-12 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500 bg-gray-50">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-lg font-medium">Image not uploaded yet</p>
                    <p className="text-sm">Upload an image to see it here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'pdf':
        return (
          <div className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
            {item.title && (
              <div
                className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
                onClick={() => toggleCollapse(index)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">PDF</span>
                    <span className="truncate">{item.title}</span>
                  </h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <ContentProgressCheckbox index={index} item={item} />
                    <BookmarkButton
                      type="lesson_content"
                      id={lessonId}
                      size="sm"
                      className="text-white/50 hover:text-white/80"
                      metadata={{ content_type: 'pdf', content_title: item.title, content_index: index }}
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
              {item.data?.fileId ? (
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-4 border border-gray-100 rounded-md bg-gray-50/50">
                  <div className="flex-1 min-w-0 w-full">
                    <p className="font-medium text-slate-800 text-sm">{item.data?.fileName || 'PDF Document'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Click to view or download</p>
                  </div>
                  <a
                    href={item.data?.url || `/api/files/${item.data.fileId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => logContentAccess('pdf', item.data?.fileName || 'PDF Document', 'viewed', { fileName: item.data?.fileName })}
                    className="border border-slate-300 text-slate-600 hover:text-slate-800 hover:border-slate-400 px-4 py-2 rounded-md text-sm transition-colors flex items-center w-full sm:w-auto justify-center"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View PDF
                  </a>
                </div>
              ) : (
                <div className="p-12 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500 bg-gray-50">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg font-medium">PDF not uploaded yet</p>
                  <p className="text-sm">Upload a PDF to see it here</p>
                </div>
              )}
              </div>
            </div>
          </div>
        );

      case 'file':
        return (
          <div key={index} className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
            <div
              className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
              onClick={() => toggleCollapse(index)}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">File</span>
                  <span className="truncate">{item.data?.title || 'File'}</span>
                </h3>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <ContentProgressCheckbox index={index} item={item} />
                  <BookmarkButton
                    type="lesson_content"
                    id={lessonId}
                    size="sm"
                    className="text-white/50 hover:text-white/80"
                    metadata={{ content_type: 'file', content_title: item.data?.title || 'File', content_index: index }}
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
                {item.data?.fileId ? (
                  <div className="flex flex-col sm:flex-row items-start gap-3 p-4 border border-gray-100 rounded-md bg-gray-50/50">
                    <div className="flex-1 min-w-0 w-full">
                      <p className="font-medium text-slate-800 text-sm">{item.data?.fileName || 'File'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Click to download</p>
                    </div>
                    <a
                      href={item.data?.url || `/api/files/${item.data.fileId}`}
                      download
                      onClick={() => logContentAccess('file', item.data?.fileName || 'File', 'downloaded', { fileName: item.data?.fileName })}
                      className="border border-slate-300 text-slate-600 hover:text-slate-800 hover:border-slate-400 px-4 py-2 rounded-md text-sm transition-colors text-center w-full sm:w-auto"
                    >
                      Download
                    </a>
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                    File not uploaded yet
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'embed':
        return (
          <div key={index} className="bg-white rounded-lg overflow-hidden border border-gray-200/80 transition-colors">
            <div
              className="bg-slate-800 px-4 sm:px-5 py-3 cursor-pointer select-none"
              onClick={() => toggleCollapse(index)}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-medium text-white flex items-center flex-1 min-w-0">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-3 flex-shrink-0">Embed</span>
                  <span className="truncate">{item.data?.title || 'Embedded Content'}</span>
                </h3>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <ContentProgressCheckbox index={index} item={item} />
                  <BookmarkButton
                    type="lesson_content"
                    id={lessonId}
                    size="sm"
                    className="text-white/50 hover:text-white/80"
                    metadata={{ content_type: 'embed', content_title: item.data?.title || 'Embedded Content', content_index: index }}
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
                {isGoogleWorkspaceUrl(item.data?.url || item.data) ? (
                  <GoogleFileEmbed
                    url={item.data?.url || item.data}
                    title={item.data?.title || 'Google Document'}
                    height="700px"
                  />
                ) : (
                  <div className="border border-gray-100 rounded-md overflow-hidden">
                    <iframe
                      src={item.data?.url || item.data}
                      className="w-full h-[600px] sm:h-[800px] rounded"
                      title={item.data?.title || 'Embedded Content'}
                      loading="lazy"
                      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
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
            <div className="group bg-white rounded-lg overflow-hidden border-2 border-dashed border-gray-300 shadow-sm">
              <div className="bg-gradient-to-br from-gray-400 to-gray-500 px-4 sm:px-6 py-4 sm:py-5">
                <h3 className="text-sm sm:text-base md:text-xl font-bold text-white flex items-center flex-1 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 rounded-lg sm:rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <span>Quiz Not Found</span>
                </h3>
              </div>
              <div className="p-4 sm:p-6 text-center">
                <p className="text-gray-600 mb-4">This quiz has been deleted and is no longer available.</p>
                {isInstructor && (
                  <button
                    onClick={() => removeOrphanContent('quiz', item.data.quizId)}
                    className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 text-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remove from Lesson
                  </button>
                )}
              </div>
            </div>
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
            <div key={index} className="group bg-white rounded-lg overflow-hidden border-2 border-dashed border-gray-300 shadow-sm">
              <div className="bg-gradient-to-br from-gray-400 to-gray-500 px-4 sm:px-6 py-4 sm:py-5">
                <h3 className="text-sm sm:text-base md:text-xl font-bold text-white flex items-center flex-1 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 rounded-lg sm:rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <span>Assignment Not Found</span>
                </h3>
              </div>
              <div className="p-4 sm:p-6 text-center">
                <p className="text-gray-600 mb-4">This assignment has been deleted and is no longer available.</p>
                {isInstructor && (
                  <button
                    onClick={() => removeOrphanContent('assignment', item.data.assignmentId)}
                    className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 text-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remove from Lesson
                  </button>
                )}
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

      case 'label': {
        const text = item.data?.text || item.title || "";
        const style = item.data?.style || "heading";
        const size = item.data?.size || "medium";

        // Size classes for padding
        const paddingClasses: Record<string, string> = {
          small: "py-2 px-4",
          medium: "py-3 px-5",
          large: "py-4 px-6"
        };

        // Style-specific rendering
        if (style === "divider") {
          const dividerTextSizes: Record<string, string> = {
            small: "text-xs",
            medium: "text-sm",
            large: "text-base"
          };
          return (
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-gray-300" />
              {text && (
                <span className={`${dividerTextSizes[size]} font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-white px-3`}>
                  {text}
                </span>
              )}
              <div className="flex-1 h-px bg-gradient-to-l from-transparent via-gray-300 to-gray-300" />
            </div>
          );
        }

        if (style === "section") {
          const sectionTextSizes: Record<string, string> = {
            small: "text-sm",
            medium: "text-base",
            large: "text-lg"
          };
          return (
            <div className={`${paddingClasses[size]} my-5 pl-4 border-l-2 border-slate-300`}>
              <span className={`${sectionTextSizes[size]} font-medium text-slate-700`}>
                {text}
              </span>
            </div>
          );
        }

        if (style === "banner") {
          const bannerTextSizes: Record<string, string> = {
            small: "text-sm",
            medium: "text-base",
            large: "text-lg"
          };
          return (
            <div className={`${paddingClasses[size]} my-5 rounded-md bg-slate-800 text-center`}>
              <span className={`${bannerTextSizes[size]} font-medium text-white`}>
                {text}
              </span>
            </div>
          );
        }

        // Default: heading style
        const headingSizes: Record<string, string> = {
          small: "text-base",
          medium: "text-lg",
          large: "text-xl"
        };

        return (
          <div className={`${paddingClasses[size]} my-5 pl-4 border-l-2 border-slate-700`}>
            <h3 className={`${headingSizes[size]} font-medium text-slate-800`}>
              {text}
            </h3>
          </div>
        );
      }

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

  // Calculate how many items are collapsed (excluding labels)
  const collapsibleCount = content.filter(item => item.type !== 'label').length;
  const collapsedCount = Array.from(collapsedItems).filter(idx => content[idx]?.type !== 'label').length;
  const allCollapsed = collapsedCount === collapsibleCount && collapsibleCount > 0;

  return (
    <div className="relative">
      {/* Tools Toolbar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 mb-4 sm:mb-5 -mx-5 sm:-mx-8 px-5 sm:px-8 py-2">
        <div className="flex items-center justify-between gap-2">
          {/* Collapse Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={allCollapsed ? expandAll : collapseAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors text-xs"
              title={allCollapsed ? "Expand all sections" : "Collapse all sections"}
            >
              {allCollapsed ? (
                <>
                  <ChevronsUpDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Expand All</span>
                </>
              ) : (
                <>
                  <ChevronsDownUp className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Collapse All</span>
                </>
              )}
            </button>
            {collapsedCount > 0 && (
              <span className="text-[10px] text-slate-300 hidden sm:inline">
                {collapsedCount} collapsed
              </span>
            )}
          </div>

          {/* Study tools */}
          <div className="flex items-center gap-1.5">
            <BookmarkButton
              type="lesson"
              id={lessonId}
              size="md"
              showLabel
              className="hover:bg-gray-50"
            />
            <button
              onClick={() => setIsNotesPanelOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors text-xs"
              title="Open notes"
            >
              <StickyNote className="w-4 h-4" />
              <span>Notes</span>
            </button>
          </div>
        </div>
      </div>

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
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-slate-800 px-4 sm:px-6 py-3 border-b border-slate-700">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-medium text-white truncate mr-4">
                {fullscreenContent.title}
              </h2>
              <button
                onClick={() => setFullscreenContent(null)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-white/60 hover:text-white/90 rounded-md transition-colors flex-shrink-0 text-sm"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Close</span>
              </button>
            </div>
          </div>
          {/* Content */}
          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
            <div
              className="prose prose-lg max-w-none rich-text-content prose-headings:font-medium prose-headings:text-slate-800"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(fullscreenContent.html) }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { NotesPanel } from '@/app/components/student';
import { useActivityLogger, ACTIVITY_TYPES, ITEM_TYPES, ACTIONS } from '@/lib/hooks/useActivityLogger';
import StudyToolbar from './viewer/StudyToolbar';
import FullscreenContentOverlay from './viewer/FullscreenContentOverlay';
import OrphanContentCard from './viewer/OrphanContentCard';
import LabelBlock from './viewer/blocks/LabelBlock';
import ImageBlock from './viewer/blocks/ImageBlock';
import EmbedBlock from './viewer/blocks/EmbedBlock';
import AudioBlock from './viewer/blocks/AudioBlock';
import PdfBlock from './viewer/blocks/PdfBlock';
import FileBlock from './viewer/blocks/FileBlock';
import WhiteboardBlock from './viewer/blocks/WhiteboardBlock';
import SlideshowBlock from './viewer/blocks/SlideshowBlock';
import TextBlock from './viewer/blocks/TextBlock';
import VideoBlock from './viewer/blocks/VideoBlock';
import InteractiveVideoBlock from './viewer/blocks/InteractiveVideoBlock';
import CodeSandboxBlock from './viewer/blocks/CodeSandboxBlock';
import QuizBlock from './viewer/blocks/QuizBlock';
import AssignmentBlock from './viewer/blocks/AssignmentBlock';
import SurveyBlock from './viewer/blocks/SurveyBlock';
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
      case 'text': {
        const html = typeof item.data === 'string' ? item.data : (item.data?.html || '');
        return (
          <TextBlock
            index={index}
            lessonId={lessonId}
            title={item.title}
            html={html}
            isCollapsed={isCollapsed(index)}
            onToggleCollapse={() => toggleCollapse(index)}
            isComplete={contentProgress[index] || false}
            onToggleComplete={() => toggleContentComplete(index, item)}
            onRequestFullscreen={(title, html) => setFullscreenContent({ title, html })}
          />
        );
      }

      case 'video':
        return (
          <VideoBlock
            index={index}
            lessonId={lessonId}
            courseId={courseId}
            title={item.title}
            src={item.data?.url || item.data}
            videoTitle={item.data?.title}
            chapters={item.data?.chapters}
            captions={item.data?.captions}
            audioDescriptionSrc={item.data?.audioDescriptionSrc}
            preventSkipping={item.data?.preventSkipping}
            description={item.data?.description}
            isCollapsed={isCollapsed(index)}
            onToggleCollapse={() => toggleCollapse(index)}
            isComplete={contentProgress[index] || false}
            onToggleComplete={() => toggleContentComplete(index, item)}
            onFirstVisible={() =>
              logContentAccess('video', item.title || item.data?.title || 'Video', 'viewed', {
                videoUrl: item.data?.url,
              })
            }
            onDurationDetected={(dur) => {
              if (item.data && !item.data.duration) {
                item.data.duration = dur;
              }
            }}
            onWatchProgress={(data) => {
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
                    },
                  }),
                }).catch(() => {});
              }
            }}
          />
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
          <InteractiveVideoBlock
            index={index}
            lessonId={lessonId}
            title={item.title}
            url={item.data?.url}
            videoUrl={item.data?.videoUrl}
            fileId={item.data?.fileId}
            videoTitle={item.data?.title}
            checkpoints={item.data?.checkpoints}
            description={item.data?.description}
            isCollapsed={isCollapsed(index)}
            onToggleCollapse={() => toggleCollapse(index)}
            isComplete={contentProgress[index] || false}
            onToggleComplete={() => toggleContentComplete(index, item)}
          />
        );

      case 'code_sandbox':
        return (
          <CodeSandboxBlock
            index={index}
            lessonId={lessonId}
            title={item.title}
            sandboxTitle={item.data?.title}
            language={item.data?.language}
            initialCode={item.data?.code || item.data?.initialCode}
            template={item.data?.template}
            instructions={item.data?.instructions}
            readOnly={item.data?.readOnly}
            isCollapsed={isCollapsed(index)}
            onToggleCollapse={() => toggleCollapse(index)}
            isComplete={contentProgress[index] || false}
            onToggleComplete={() => toggleContentComplete(index, item)}
          />
        );

      case 'whiteboard':
        return (
          <WhiteboardBlock
            title={item.title}
            whiteboardId={item.data?.whiteboard_id}
            elements={item.data?.elements}
            appState={item.data?.app_state}
            isCollapsed={isCollapsed(index)}
            onToggleCollapse={() => toggleCollapse(index)}
            isComplete={contentProgress[index] || false}
            onToggleComplete={() => toggleContentComplete(index, item)}
          />
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
        // Accept both string data and { url, title, embedType } object data.
        const slideshowUrl =
          typeof item.data === 'string'
            ? item.data
            : item.data?.url || (item.data ? String(item.data) : '');

        return (
          <SlideshowBlock
            index={index}
            lessonId={lessonId}
            url={slideshowUrl}
            title={item.data?.title || item.title}
            embedType={item.data?.embedType}
            isCollapsed={isCollapsed(index)}
            onToggleCollapse={() => toggleCollapse(index)}
            isComplete={contentProgress[index] || false}
            onToggleComplete={() => toggleContentComplete(index, item)}
          />
        );
      }

      case 'quiz': {
        const quizId: string | undefined = item.data?.quizId;
        if (quizId && notFoundQuizzes.has(quizId)) {
          return (
            <OrphanContentCard
              kind="quiz"
              canRemove={isInstructor}
              onRemove={() => removeOrphanContent('quiz', quizId)}
            />
          );
        }
        return (
          <QuizBlock
            index={index}
            title={item.title}
            quizId={quizId}
            quiz={quizId ? quizData[quizId] : undefined}
            isLoading={quizId ? loadingData.has(quizId) : false}
            isInstructor={isInstructor}
            deletingId={deleting}
            onDelete={deleteQuiz}
            isCollapsed={isCollapsed(index)}
            onToggleCollapse={() => toggleCollapse(index)}
            isComplete={contentProgress[index] || false}
            onToggleComplete={() => toggleContentComplete(index, item)}
          />
        );
      }

      case 'assignment': {
        const assignmentId: string | undefined = item.data?.assignmentId;
        if (assignmentId && notFoundAssignments.has(assignmentId)) {
          return (
            <OrphanContentCard
              kind="assignment"
              canRemove={isInstructor}
              onRemove={() => removeOrphanContent('assignment', assignmentId)}
            />
          );
        }
        return (
          <AssignmentBlock
            index={index}
            title={item.title}
            assignmentId={assignmentId}
            assignment={assignmentId ? assignmentData[assignmentId] : undefined}
            isLoading={assignmentId ? loadingData.has(assignmentId) : false}
            isInstructor={isInstructor}
            deletingId={deleting}
            onDelete={deleteAssignment}
            isCollapsed={isCollapsed(index)}
            onToggleCollapse={() => toggleCollapse(index)}
            isComplete={contentProgress[index] || false}
            onToggleComplete={() => toggleContentComplete(index, item)}
          />
        );
      }

      case 'label':
        return (
          <LabelBlock
            text={item.data?.text || item.title || ''}
            style={item.data?.style || 'heading'}
            size={item.data?.size || 'medium'}
          />
        );

      case 'survey':
        return (
          <SurveyBlock
            index={index}
            lessonId={lessonId}
            title={item.title}
            surveyId={item.data?.surveyId}
            description={item.data?.description}
            isInstructor={isInstructor}
            isCollapsed={isCollapsed(index)}
            onToggleCollapse={() => toggleCollapse(index)}
            isComplete={contentProgress[index] || false}
            onToggleComplete={() => toggleContentComplete(index, item)}
          />
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

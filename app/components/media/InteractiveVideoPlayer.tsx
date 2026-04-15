"use client";

import React from 'react';

export type CheckpointQuestion = {
  id: string;
  timestamp: number; // in seconds
  questionText: string;
  questionType: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: Array<{ id: string; text: string; isCorrect: boolean }>;
  correctAnswer?: string | boolean;
  feedback?: string;
  points?: number;
};

interface InteractiveVideoPlayerProps {
  src: string;
  title?: string;
  checkpoints: CheckpointQuestion[];
  onCheckpointAnswered?: (checkpointId: string, answer: any, isCorrect: boolean) => void;
  showProgress?: boolean;
}

export default function InteractiveVideoPlayer({ 
  src, 
  title, 
  checkpoints = [],
  onCheckpointAnswered,
  showProgress = true
}: InteractiveVideoPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [activeCheckpoint, setActiveCheckpoint] = React.useState<CheckpointQuestion | null>(null);
  const [answeredCheckpoints, setAnsweredCheckpoints] = React.useState<Set<string>>(new Set());
  const [userAnswer, setUserAnswer] = React.useState<any>(null);
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [isCorrect, setIsCorrect] = React.useState(false);
  const [progress, setProgress] = React.useState<Record<string, boolean>>({});

  // Sort checkpoints by timestamp
  const sortedCheckpoints = React.useMemo(() => {
    return [...checkpoints].sort((a, b) => a.timestamp - b.timestamp);
  }, [checkpoints]);

  // Update current time and check for checkpoints
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      const time = video.currentTime;
      setCurrentTime(time);
      
      // Check if we've reached a checkpoint
      if (activeCheckpoint === null && !isPlaying) return;
      
      const checkpoint = sortedCheckpoints.find(cp => {
        const timeDiff = Math.abs(time - cp.timestamp);
        return !answeredCheckpoints.has(cp.id) && timeDiff < 1 && time >= cp.timestamp;
      });

      if (checkpoint && !activeCheckpoint) {
        video.pause();
        setIsPlaying(false);
        setActiveCheckpoint(checkpoint);
        setUserAnswer(null);
        setShowFeedback(false);
      }
    };

    const updateDuration = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [sortedCheckpoints, activeCheckpoint, answeredCheckpoints, isPlaying]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = () => {
    if (!activeCheckpoint || !userAnswer) return;

    let correct = false;
    
    if (activeCheckpoint.questionType === 'multiple_choice') {
      const selectedOption = activeCheckpoint.options?.find(opt => opt.id === userAnswer);
      correct = selectedOption?.isCorrect || false;
    } else if (activeCheckpoint.questionType === 'true_false') {
      // Handle both string and boolean values
      const correctAnswer = typeof activeCheckpoint.correctAnswer === 'boolean' 
        ? activeCheckpoint.correctAnswer 
        : activeCheckpoint.correctAnswer === 'true';
      const userAnswerBool = typeof userAnswer === 'boolean' 
        ? userAnswer 
        : userAnswer === 'true' || userAnswer === true;
      correct = userAnswerBool === correctAnswer;
    } else if (activeCheckpoint.questionType === 'short_answer') {
      const userAnswerLower = String(userAnswer).toLowerCase().trim();
      const correctAnswerLower = String(activeCheckpoint.correctAnswer || '').toLowerCase().trim();
      correct = userAnswerLower === correctAnswerLower;
    }

    setIsCorrect(correct);
    setShowFeedback(true);
    setAnsweredCheckpoints(prev => new Set([...prev, activeCheckpoint.id]));
    setProgress(prev => ({ ...prev, [activeCheckpoint.id]: correct }));
    
    onCheckpointAnswered?.(activeCheckpoint.id, userAnswer, correct);
  };

  const handleContinue = () => {
    setActiveCheckpoint(null);
    setShowFeedback(false);
    setUserAnswer(null);
    const video = videoRef.current;
    if (video) {
      video.play();
      setIsPlaying(true);
    }
  };

  const jumpToCheckpoint = (checkpoint: CheckpointQuestion) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = checkpoint.timestamp;
    setCurrentTime(checkpoint.timestamp);
  };

  const isYouTube = /youtube\.com|youtu\.be/.test(src);
  const isVimeo = /vimeo\.com/.test(src);

  // For YouTube/Vimeo, we can't control playback precisely, so show a simplified version
  if (isYouTube || isVimeo) {
    return (
      <div className="w-full">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Interactive checkpoints work best with uploaded video files. 
            For YouTube/Vimeo videos, checkpoints are shown as a list below the video.
          </p>
        </div>
        <div className="relative w-full mx-auto max-w-full mb-4">
          <div className="relative rounded-lg sm:rounded-lg overflow-hidden" style={{ paddingTop: "56.25%" }}>
            <iframe
              src={isYouTube 
                ? `https://www.youtube.com/embed/${src.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1]}`
                : `https://player.vimeo.com/video/${src.match(/vimeo\.com\/(\d+)/)?.[1]}`
              }
              title={title || "Video"}
              className="absolute left-0 top-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
        {sortedCheckpoints.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Video Checkpoints</h4>
            <div className="space-y-3">
              {sortedCheckpoints.map((checkpoint) => (
                <div key={checkpoint.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => jumpToCheckpoint(checkpoint)}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Jump to {formatTime(checkpoint.timestamp)}
                    </button>
                    {progress[checkpoint.id] !== undefined && (
                      <span className={`text-xs px-2 py-1 rounded ${progress[checkpoint.id] ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {progress[checkpoint.id] ? '✓ Correct' : '✗ Incorrect'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-2">{checkpoint.questionText}</p>
                  {checkpoint.questionType === 'multiple_choice' && checkpoint.options && (
                    <div className="space-y-2">
                      {checkpoint.options.map((option) => (
                        <div key={option.id} className="flex items-center gap-2">
                          <input
                            type="radio"
                            id={`${checkpoint.id}-${option.id}`}
                            name={checkpoint.id}
                            value={option.id}
                            checked={userAnswer === option.id && activeCheckpoint?.id === checkpoint.id}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            disabled={answeredCheckpoints.has(checkpoint.id)}
                            className="h-4 w-4 text-blue-600"
                          />
                          <label htmlFor={`${checkpoint.id}-${option.id}`} className="text-sm text-gray-700">
                            {option.text}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  {checkpoint.questionType === 'true_false' && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={checkpoint.id}
                          value="true"
                          checked={userAnswer === true && activeCheckpoint?.id === checkpoint.id}
                          onChange={() => setUserAnswer(true)}
                          disabled={answeredCheckpoints.has(checkpoint.id)}
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="text-sm text-gray-700">True</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={checkpoint.id}
                          value="false"
                          checked={userAnswer === false && activeCheckpoint?.id === checkpoint.id}
                          onChange={() => setUserAnswer(false)}
                          disabled={answeredCheckpoints.has(checkpoint.id)}
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="text-sm text-gray-700">False</span>
                      </label>
                    </div>
                  )}
                  {checkpoint.questionType === 'short_answer' && (
                    <input
                      type="text"
                      value={userAnswer || ''}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      disabled={answeredCheckpoints.has(checkpoint.id)}
                      placeholder="Enter your answer"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  )}
                  {activeCheckpoint?.id === checkpoint.id && !answeredCheckpoints.has(checkpoint.id) && (
                    <button
                      onClick={handleAnswer}
                      disabled={!userAnswer}
                      className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Submit Answer
                    </button>
                  )}
                  {showFeedback && activeCheckpoint?.id === checkpoint.id && (
                    <div className={`mt-3 p-3 rounded-lg ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <p className={`text-sm font-medium ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                        {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                      </p>
                      {activeCheckpoint.feedback && (
                        <p className={`text-sm mt-1 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                          {activeCheckpoint.feedback}
                        </p>
                      )}
                      <button
                        onClick={handleContinue}
                        className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Continue Video
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // HTML5 video player with full interactive checkpoint support
  return (
    <div className="w-full bg-white rounded-lg sm:rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Video Player */}
      <div className="relative bg-black">
        <video
          ref={videoRef}
          src={src}
          className="w-full aspect-video"
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        
        {/* Video Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="flex-shrink-0 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>
            <span className="text-white text-sm font-mono tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Checkpoint Markers */}
        {showProgress && sortedCheckpoints.length > 0 && (
          <div className="absolute top-4 right-4 bg-white/90 rounded-lg p-2 text-xs">
            <div className="font-medium text-gray-700 mb-1">Checkpoints</div>
            <div className="space-y-1">
              {sortedCheckpoints.map((cp) => (
                <div key={cp.id} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${progress[cp.id] ? 'bg-green-500' : answeredCheckpoints.has(cp.id) ? 'bg-red-500' : 'bg-gray-300'}`} />
                  <span className="text-gray-600">{formatTime(cp.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Checkpoint Question */}
      {activeCheckpoint && (
        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-t border-gray-200">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Checkpoint Question</h3>
                <span className="text-sm text-gray-500">At {formatTime(activeCheckpoint.timestamp)}</span>
              </div>
              
              <p className="text-base text-gray-900 mb-4 font-medium">{activeCheckpoint.questionText}</p>

              {activeCheckpoint.questionType === 'multiple_choice' && activeCheckpoint.options && (
                <div className="space-y-2 mb-4">
                  {activeCheckpoint.options.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{
                        borderColor: userAnswer === option.id ? '#3B82F6' : '#E5E7EB',
                        backgroundColor: userAnswer === option.id ? '#EFF6FF' : 'transparent'
                      }}
                    >
                      <input
                        type="radio"
                        name={activeCheckpoint.id}
                        value={option.id}
                        checked={userAnswer === option.id}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700 flex-1">{option.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {activeCheckpoint.questionType === 'true_false' && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <label
                    className={`flex items-center justify-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      userAnswer === true
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name={activeCheckpoint.id}
                      value="true"
                      checked={userAnswer === true}
                      onChange={() => setUserAnswer(true)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">True</span>
                  </label>
                  <label
                    className={`flex items-center justify-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      userAnswer === false
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name={activeCheckpoint.id}
                      value="false"
                      checked={userAnswer === false}
                      onChange={() => setUserAnswer(false)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">False</span>
                  </label>
                </div>
              )}

              {activeCheckpoint.questionType === 'short_answer' && (
                <input
                  type="text"
                  value={userAnswer || ''}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Enter your answer"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm mb-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              )}

              {!showFeedback && (
                <button
                  onClick={handleAnswer}
                  disabled={!userAnswer}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  Submit Answer
                </button>
              )}

              {showFeedback && (
                <div className={`p-4 rounded-lg mb-4 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {isCorrect ? (
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className={`font-semibold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                      {isCorrect ? 'Correct!' : 'Incorrect'}
                    </span>
                  </div>
                  {activeCheckpoint.feedback && (
                    <p className={`text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      {activeCheckpoint.feedback}
                    </p>
                  )}
                </div>
              )}

              {showFeedback && (
                <button
                  onClick={handleContinue}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Continue Video
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


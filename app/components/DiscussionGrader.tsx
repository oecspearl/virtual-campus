'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';

interface RubricLevel {
  name: string;
  description: string;
  points: number;
}

interface RubricCriterion {
  id: string;
  criteria: string;
  levels: RubricLevel[];
}

interface Student {
  id: string;
  name: string;
  email: string;
  stats: {
    posts: number;
    words: number;
  };
  grade: StudentGrade | null;
}

interface StudentGrade {
  id: string;
  score: number;
  max_score: number;
  percentage: number;
  feedback: string;
  rubric_scores: Record<string, number>;
  graded_at: string;
  grader?: { id: string; name: string };
}

interface Discussion {
  id: string;
  course_id: string;
  is_graded: boolean;
  points: number;
  rubric: RubricCriterion[] | null;
  grading_criteria?: string;
  min_replies?: number;
  min_words?: number;
}

interface DiscussionGraderProps {
  discussionId: string;
  courseId: string;
  onClose: () => void;
}

export default function DiscussionGrader({ discussionId, courseId, onClose }: DiscussionGraderProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'graded' | 'ungraded'>('all');

  useEffect(() => {
    fetchGrades();
  }, [discussionId]);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/discussions/${discussionId}/grades`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch grades');
      }
      const data = await response.json();
      setDiscussion(data.discussion);
      setStudents(data.students || []);
    } catch (err: any) {
      console.error('Error fetching grades:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = (student: Student) => {
    setSelectedStudent(student);
    if (student.grade) {
      setScore(student.grade.score);
      setFeedback(student.grade.feedback || '');
      setRubricScores(student.grade.rubric_scores || {});
    } else {
      setScore(0);
      setFeedback('');
      setRubricScores({});
    }
  };

  const calculateRubricTotal = () => {
    return Object.values(rubricScores).reduce((sum, s) => sum + s, 0);
  };

  // Calculate max possible rubric score (sum of highest points in each criterion)
  const calculateMaxRubricScore = () => {
    if (!discussion?.rubric) return 0;
    return discussion.rubric.reduce((sum, criterion) => {
      const maxLevel = Math.max(...criterion.levels.map(l => l.points));
      return sum + maxLevel;
    }, 0);
  };

  // Calculate weighted score: (rubric_total / max_rubric_total) * discussion_points
  const calculateWeightedScore = (rubricTotal: number) => {
    if (!discussion) return 0;
    const maxRubricScore = calculateMaxRubricScore();
    if (maxRubricScore === 0) return 0;
    const weighted = (rubricTotal / maxRubricScore) * discussion.points;
    return Math.round(weighted); // Round to nearest integer for database compatibility
  };

  const handleRubricSelect = (criterionId: string, points: number) => {
    const newScores = { ...rubricScores, [criterionId]: points };
    setRubricScores(newScores);
    // Auto-calculate weighted score from rubric
    const rubricTotal = Object.values(newScores).reduce((sum, s) => sum + s, 0);
    const weightedScore = calculateWeightedScore(rubricTotal);
    setScore(weightedScore);
  };

  const handleSaveGrade = async () => {
    if (!selectedStudent || !discussion) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/discussions/${discussionId}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          student_id: selectedStudent.id,
          score,
          rubric_scores: rubricScores,
          feedback
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save grade');
      }

      const data = await response.json();

      // Update local state
      setStudents(prev => prev.map(s =>
        s.id === selectedStudent.id
          ? { ...s, grade: data.grade }
          : s
      ));
      setSelectedStudent(prev => prev ? { ...prev, grade: data.grade } : null);

    } catch (err: any) {
      console.error('Error saving grade:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterStatus === 'graded') return matchesSearch && student.grade !== null;
    if (filterStatus === 'ungraded') return matchesSearch && student.grade === null;
    return matchesSearch;
  });

  const gradedCount = students.filter(s => s.grade !== null).length;
  const avgScore = students.filter(s => s.grade).length > 0
    ? Math.round(students.filter(s => s.grade).reduce((sum, s) => sum + (s.grade?.percentage || 0), 0) / gradedCount)
    : 0;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <Icon icon="material-symbols:hourglass-empty" className="w-6 h-6 text-green-600 animate-spin" />
            <span className="text-gray-700 font-medium">Loading grades...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md">
          <div className="text-center">
            <Icon icon="material-symbols:error" className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error || 'Discussion not found or not graded'}</p>
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Grade Discussion Participation</h2>
              <p className="text-green-100 text-sm mt-1">
                {discussion.points} points possible
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Icon icon="material-symbols:close" className="w-6 h-6" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-2xl font-bold">{students.length}</div>
              <div className="text-green-100 text-sm">Total Students</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-2xl font-bold">{gradedCount}</div>
              <div className="text-green-100 text-sm">Graded</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-2xl font-bold">{avgScore}%</div>
              <div className="text-green-100 text-sm">Average Score</div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Student List */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="relative mb-3">
                <Icon icon="material-symbols:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'ungraded', 'graded'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      filterStatus === status
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredStudents.map(student => (
                <button
                  key={student.id}
                  onClick={() => selectStudent(student)}
                  className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedStudent?.id === student.id ? 'bg-green-50 border-l-4 border-l-green-600' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{student.name}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </div>
                    {student.grade ? (
                      <div className="text-right">
                        <div className="font-semibold text-green-600">{student.grade.score}/{student.grade.max_score}</div>
                        <div className="text-xs text-gray-500">{student.grade.percentage}%</div>
                      </div>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                        Ungraded
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-gray-500">
                    <span>{student.stats.posts} posts</span>
                    <span>{student.stats.words} words</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Grading Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedStudent ? (
              <>
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{selectedStudent.name}</h3>
                      <p className="text-gray-500">{selectedStudent.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Participation</div>
                        <div className="font-medium">
                          {selectedStudent.stats.posts} posts, {selectedStudent.stats.words} words
                        </div>
                      </div>
                      {discussion.min_replies && selectedStudent.stats.posts < discussion.min_replies && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                          Below min replies
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {/* Rubric Scoring */}
                  {discussion.rubric && discussion.rubric.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Icon icon="material-symbols:table-chart" className="w-4 h-4" />
                        Rubric Scoring
                      </h4>
                      <div className="space-y-4">
                        {discussion.rubric.map((criterion) => (
                          <div key={criterion.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="font-medium text-gray-800 mb-2">{criterion.criteria}</div>
                            <div className="grid grid-cols-4 gap-2">
                              {criterion.levels.map((level, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleRubricSelect(criterion.id, level.points)}
                                  className={`p-2 text-sm rounded-lg border transition-all ${
                                    rubricScores[criterion.id] === level.points
                                      ? 'bg-green-600 text-white border-green-600'
                                      : 'bg-white border-gray-300 hover:border-green-500'
                                  }`}
                                >
                                  <div className="font-medium">{level.name}</div>
                                  <div className="text-xs opacity-75">{level.points} pts</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-200">
                          <div>
                            Rubric Score: <strong>{calculateRubricTotal()}</strong> / {calculateMaxRubricScore()} pts
                          </div>
                          <div className="text-green-600 font-semibold">
                            Weighted: {calculateWeightedScore(calculateRubricTotal())} / {discussion.points} pts
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Score Input */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Score
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={discussion.points}
                        value={score}
                        onChange={(e) => setScore(Number(e.target.value))}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 text-lg font-semibold"
                      />
                      <span className="text-gray-600">/ {discussion.points}</span>
                      <span className="text-gray-500 ml-2">
                        ({Math.round((score / discussion.points) * 100)}%)
                      </span>
                    </div>
                  </div>

                  {/* Feedback */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Feedback
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={4}
                      placeholder="Provide feedback to the student..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                    />
                  </div>

                  {/* Previous Grade Info */}
                  {selectedStudent.grade && (
                    <div className="bg-blue-50 rounded-lg p-4 text-sm">
                      <div className="flex items-center gap-2 text-blue-700 font-medium mb-1">
                        <Icon icon="material-symbols:info" className="w-4 h-4" />
                        Previously graded
                      </div>
                      <div className="text-blue-600">
                        Last graded on {new Date(selectedStudent.grade.graded_at).toLocaleString()}
                        {selectedStudent.grade.grader && ` by ${selectedStudent.grade.grader.name}`}
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                      <div className="flex items-center gap-2 text-red-700">
                        <Icon icon="material-symbols:error" className="w-5 h-5" />
                        {error}
                      </div>
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={handleSaveGrade}
                    disabled={saving}
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Icon icon="material-symbols:hourglass-empty" className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Icon icon="material-symbols:save" className="w-5 h-5" />
                        Save Grade
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Icon icon="material-symbols:person" className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a student to grade</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

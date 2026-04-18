'use client';

import React, { useState, useEffect } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { tenantFetch } from '@/lib/hooks/useTenantSwitcher';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  gender?: string;
  student_id?: string;
  created_at: string;
  updated_at: string;
  profile?: {
    bio?: string;
    avatar?: string;
    learning_preferences?: {
      grade_level?: string;
      subject_interests?: string;
      learning_style?: string;
      difficulty_preference?: string;
    };
  };
}

interface AdminUserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onUserUpdated: () => void;
}

const ALLOWED_ROLES = ['super_admin', 'admin', 'instructor', 'curriculum_designer', 'student', 'parent'];
const ALLOWED_GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'];
const LEARNING_STYLES = ['visual', 'auditory', 'kinesthetic', 'reading/writing'];
const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'];

export default function AdminUserEditModal({ 
  isOpen, 
  onClose, 
  userId, 
  onUserUpdated 
}: AdminUserEditModalProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student',
    gender: '',
    student_id: '',
    password: '',
    bio: '',
    avatar: '',
    grade_level: '',
    subject_areas: '',
    learning_style: '',
    difficulty_preference: ''
  });

  // Load user data when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      loadUserData();
    }
  }, [isOpen, userId]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await tenantFetch(`/api/admin/users/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to load user data');
      }

      const { user: userData } = await response.json();
      setUser(userData);

      // Populate form with user data
      const preferences = userData.profile?.learning_preferences || {};
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        role: userData.role || 'student',
        gender: userData.gender || '',
        student_id: userData.student_id || '',
        password: '',
        bio: userData.profile?.bio || '',
        avatar: userData.profile?.avatar || '',
        grade_level: preferences.grade_level || '',
        subject_areas: preferences.subject_interests || '',
        learning_style: preferences.learning_style || '',
        difficulty_preference: preferences.difficulty_preference || ''
      });

    } catch (err: any) {
      console.error('Error loading user data:', err);
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await tenantFetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      setSuccess('User updated successfully!');
      onUserUpdated();
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('Error updating user:', err);
      setError(err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!formData.password || formData.password.trim() === '') {
      setError('Please enter a new password');
      return;
    }

    try {
      setResettingPassword(true);
      setError('');
      setSuccess('');

      const response = await tenantFetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: formData.password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }

      setSuccess('Password reset successfully!');
      setFormData(prev => ({ ...prev, password: '' }));

    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      role: 'student',
      gender: '',
      student_id: '',
      password: '',
      bio: '',
      avatar: '',
      grade_level: '',
      subject_areas: '',
      learning_style: '',
      difficulty_preference: ''
    });
    setError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <LazyMotion features={domAnimation}>
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <m.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-lg shadow-sm max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Edit User Profile
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Icon icon="material-symbols:close" className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Icon icon="material-symbols:loading" className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading user data...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Error/Success Messages */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <Icon icon="material-symbols:error" className="w-5 h-5 text-red-600 mr-2" />
                      <span className="text-red-800">{error}</span>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <Icon icon="material-symbols:check-circle" className="w-5 h-5 text-green-600 mr-2" />
                      <span className="text-green-800">{success}</span>
                    </div>
                  </div>
                )}

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="edit-user-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      id="edit-user-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter full name"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-user-email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      id="edit-user-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter email address"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-user-role" className="block text-sm font-medium text-gray-700 mb-2">
                      Role *
                    </label>
                    <select
                      id="edit-user-role"
                      value={formData.role}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {ALLOWED_ROLES.map(role => (
                        <option key={role} value={role}>
                          {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="edit-user-gender" className="block text-sm font-medium text-gray-700 mb-2">
                      Gender
                    </label>
                    <select
                      id="edit-user-gender"
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select gender</option>
                      {ALLOWED_GENDERS.map(gender => (
                        <option key={gender} value={gender}>
                          {gender.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="edit-user-student-id" className="block text-sm font-medium text-gray-700 mb-2">
                      Student ID
                    </label>
                    <input
                      id="edit-user-student-id"
                      type="text"
                      value={formData.student_id}
                      onChange={(e) => handleInputChange('student_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., AB3846951"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-user-password" className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="edit-user-password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter new password"
                      />
                      <button
                        onClick={handleResetPassword}
                        disabled={resettingPassword || !formData.password || formData.password.length < 8}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {resettingPassword && <Icon icon="material-symbols:loading" className="w-4 h-4 animate-spin" />}
                        {resettingPassword ? 'Resetting...' : 'Reset'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum 8 characters. This will immediately change the user's password.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="edit-user-avatar" className="block text-sm font-medium text-gray-700 mb-2">
                      Avatar URL
                    </label>
                    <input
                      id="edit-user-avatar"
                      type="url"
                      value={formData.avatar}
                      onChange={(e) => handleInputChange('avatar', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                </div>

                {/* Profile Information */}
                <div>
                  <label htmlFor="edit-user-bio" className="block text-sm font-medium text-gray-700 mb-2">
                    Biography
                  </label>
                  <textarea
                    id="edit-user-bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                {/* Learning Preferences */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Learning Preferences</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="edit-user-grade" className="block text-sm font-medium text-gray-700 mb-2">
                        Grade Level
                      </label>
                      <input
                        id="edit-user-grade"
                        type="text"
                        value={formData.grade_level}
                        onChange={(e) => handleInputChange('grade_level', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Grade 10"
                      />
                    </div>

                    <div>
                      <label htmlFor="edit-user-subjects" className="block text-sm font-medium text-gray-700 mb-2">
                        Subject Areas
                      </label>
                      <input
                        id="edit-user-subjects"
                        type="text"
                        value={formData.subject_areas}
                        onChange={(e) => handleInputChange('subject_areas', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Math, Science, English"
                      />
                    </div>

                    <div>
                      <label htmlFor="edit-user-learning-style" className="block text-sm font-medium text-gray-700 mb-2">
                        Learning Style
                      </label>
                      <select
                        id="edit-user-learning-style"
                        value={formData.learning_style}
                        onChange={(e) => handleInputChange('learning_style', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select learning style</option>
                        {LEARNING_STYLES.map(style => (
                          <option key={style} value={style}>
                            {style.charAt(0).toUpperCase() + style.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="edit-user-difficulty" className="block text-sm font-medium text-gray-700 mb-2">
                        Difficulty Preference
                      </label>
                      <select
                        id="edit-user-difficulty"
                        value={formData.difficulty_preference}
                        onChange={(e) => handleInputChange('difficulty_preference', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select difficulty</option>
                        {DIFFICULTY_LEVELS.map(level => (
                          <option key={level} value={level}>
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading || !formData.name || !formData.email}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Icon icon="material-symbols:loading" className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
    </LazyMotion>
  );
}

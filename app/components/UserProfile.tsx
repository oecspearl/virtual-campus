'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import Button from './Button';
import { Input } from './Input';
import { useSupabase } from '@/lib/supabase-provider';
import AITutorPreferences from './AITutorPreferences';
import PasswordChange from './PasswordChange';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  phone_number?: string;
  bio?: string;
  avatar?: string;
  learning_preferences?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

interface UserProfileComponentProps {
  onProfileUpdate?: (profile: UserProfile) => void;
}

export default function UserProfileComponent({ onProfileUpdate }: UserProfileComponentProps) {
  const { supabase } = useSupabase();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [learningPreferences, setLearningPreferences] = useState<Record<string, any>>({});

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to view your profile.');
        return;
      }

      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load profile');
      }
      
      const data = await response.json();
      setProfile(data);
      setName(data.name || '');
      setPhoneNumber(data.phone_number || '');
      setBio(data.bio || '');
      setAvatar(data.avatar || '');
      setLearningPreferences(data.learning_preferences || {});
    } catch (err) {
      console.error('Profile load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to save your profile.');
        return;
      }

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name,
          phone_number: phoneNumber,
          bio,
          avatar,
          learning_preferences: learningPreferences,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save profile');
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setSuccess('Profile updated successfully!');
      
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLearningPreferenceChange = (key: string, value: any) => {
    setLearningPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAvatarFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please select a JPEG, PNG, GIF, or WebP image.');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    await uploadAvatarFile(file);
  };

  const uploadAvatarFile = async (file: File) => {
    try {
      setUploadingAvatar(true);
      setError('');
      setSuccess('');

      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to upload a profile picture.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/auth/profile/upload-avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Failed to upload profile picture';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.avatar) {
        setAvatar(data.avatar);
        setAvatarPreview(null); // Clear preview after successful upload
        setSuccess('Profile picture uploaded successfully!');
        
        // Reload profile to get updated data
        await loadProfile();
      } else {
        throw new Error('Upload succeeded but no avatar URL returned');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to upload profile picture. Please check your file and try again.';
      setError(errorMessage);
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCameraButtonClick = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card Skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-8 animate-pulse">
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto"></div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
          
          {/* Form Skeleton */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8 animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-6"></div>
              <div className="space-y-6">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-12 text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon icon="material-symbols:error" className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Profile</h3>
          <p className="text-gray-600 mb-6">There was an error loading your profile information.</p>
          <Button onClick={loadProfile} className="bg-blue-600 hover:bg-blue-700">
            <Icon icon="material-symbols:refresh" className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-1"
        >
          <div className="bg-white rounded-2xl shadow-lg p-8 sticky top-8">
            <div className="text-center mb-6">
              <div className="relative inline-block">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  {/* Background gradient (only shows when no avatar) */}
                  <div className={`avatar-fallback absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center ${(avatar || avatarPreview) ? 'hidden' : 'flex'}`}>
                    <Icon icon="material-symbols:person" className="w-12 h-12 text-white" />
                  </div>
                  
                  {/* Avatar Preview (during upload) */}
                  {avatarPreview && (
                    <img 
                      src={avatarPreview} 
                      alt="Profile Preview" 
                      className="absolute inset-0 w-24 h-24 rounded-full object-cover z-10"
                    />
                  )}
                  
                  {/* Avatar Image */}
                  {avatar && !avatarPreview && (
                    <img 
                      src={avatar} 
                      alt="Profile" 
                      className="absolute inset-0 w-24 h-24 rounded-full object-cover z-10"
                      onError={(e) => {
                        // Hide image and show fallback
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                        const fallback = document.querySelector('.avatar-fallback') as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  )}
                  
                  {/* Upload progress overlay */}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center z-20">
                      <Icon icon="material-symbols:hourglass-empty" className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleCameraButtonClick}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Upload profile picture"
                >
                  <Icon icon="material-symbols:camera-alt" className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleAvatarFileSelect}
                />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{name || 'User'}</h2>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  {profile.role}
                </span>
              </div>
              <p className="text-gray-600 text-sm">{profile.email}</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Icon icon="material-symbols:calendar-today" className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Member Since</div>
                  <div className="text-sm text-gray-600">
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Icon icon="material-symbols:update" className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Last Updated</div>
                  <div className="text-sm text-gray-600">
                    {profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Profile Form */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Icon icon="material-symbols:edit" className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
            </div>
            
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
              >
                <Icon icon="material-symbols:error" className="w-5 h-5 text-red-600" />
                <p className="text-red-600 text-sm">{error}</p>
              </motion.div>
            )}
            
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3"
              >
                <Icon icon="material-symbols:check-circle" className="w-5 h-5 text-green-600" />
                <p className="text-green-600 text-sm">{success}</p>
              </motion.div>
            )}

            <div className="space-y-8">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <Icon icon="material-symbols:person" className="w-5 h-5 text-blue-600" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <Icon icon="material-symbols:info" className="w-3 h-3" />
                      Email cannot be changed
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Role
                    </label>
                    <Input
                      type="text"
                      value={profile.role}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <Icon icon="material-symbols:info" className="w-3 h-3" />
                      Role is assigned by administrators
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <Icon icon="material-symbols:info" className="w-3 h-3" />
                      Used for SMS and WhatsApp notifications
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Avatar URL
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        value={avatar}
                        onChange={(e) => setAvatar(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={handleCameraButtonClick}
                        disabled={uploadingAvatar}
                        className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        title="Upload image file"
                      >
                        <Icon icon="material-symbols:upload" className="w-4 h-4" />
                        {uploadingAvatar ? 'Uploading...' : 'Upload'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <Icon icon="material-symbols:info" className="w-3 h-3" />
                      Enter a URL or upload an image file (JPEG, PNG, GIF, WebP - max 5MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <Icon icon="material-symbols:description" className="w-5 h-5 text-blue-600" />
                  About You
                </h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself, your interests, and what you hope to achieve..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {bio.length}/500 characters
                  </p>
                </div>
              </div>

              {/* Learning Preferences */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <Icon icon="material-symbols:school" className="w-5 h-5 text-blue-600" />
                  Learning Preferences
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Learning Style
                    </label>
                    <select
                      value={learningPreferences.learning_style || ''}
                      onChange={(e) => handleLearningPreferenceChange('learning_style', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select learning style</option>
                      <option value="visual">Visual</option>
                      <option value="auditory">Auditory</option>
                      <option value="kinesthetic">Kinesthetic</option>
                      <option value="reading">Reading/Writing</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Difficulty Level
                    </label>
                    <select
                      value={learningPreferences.difficulty_preference || ''}
                      onChange={(e) => handleLearningPreferenceChange('difficulty_preference', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select difficulty</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Subject Interests
                    </label>
                    <Input
                      type="text"
                      value={learningPreferences.subject_interests || ''}
                      onChange={(e) => handleLearningPreferenceChange('subject_interests', e.target.value)}
                      placeholder="Mathematics, Science, History, Literature, etc."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* AI Tutor Preferences */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <AITutorPreferences onPreferencesChange={() => {}} />
              </div>

              {/* Password Change */}
              <PasswordChange onPasswordChanged={() => {}} />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-200">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    onClick={saveProfile} 
                    disabled={saving}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Icon icon="material-symbols:hourglass-empty" className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Icon icon="material-symbols:save" className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    variant="outline" 
                    onClick={loadProfile}
                    className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-8 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Icon icon="material-symbols:refresh" className="w-4 h-4" />
                    Reset
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

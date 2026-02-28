'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import Button from './Button';
import { Input } from './Input';

interface PasswordChangeProps {
  onPasswordChanged?: () => void;
}

export default function PasswordChange({ onPasswordChanged }: PasswordChangeProps) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar,
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumber
    };
  };

  const getPasswordStrength = (password: string) => {
    const validation = validatePassword(password);
    const score = Object.values(validation).filter(Boolean).length - 1; // -1 for isValid
    
    if (score < 2) return { level: 'weak', color: 'text-red-600', bgColor: 'bg-red-100' };
    if (score < 4) return { level: 'medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'strong', color: 'text-green-600', bgColor: 'bg-green-100' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isChanging) return;

    // Validate form
    if (!formData.currentPassword.trim()) {
      setError('Current password is required');
      return;
    }

    if (!formData.newPassword.trim()) {
      setError('New password is required');
      return;
    }

    if (!formData.confirmPassword.trim()) {
      setError('Password confirmation is required');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    const validation = validatePassword(formData.newPassword);
    if (!validation.isValid) {
      setError('New password must be at least 8 characters and contain uppercase, lowercase, and number');
      return;
    }

    try {
      setIsChanging(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change password');
      }

      setSuccess('Password changed successfully!');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      if (onPasswordChanged) {
        onPasswordChanged();
      }

    } catch (err: any) {
      console.error('Password change error:', err);
      setError(err.message || 'Failed to change password');
    } finally {
      setIsChanging(false);
    }
  };

  const handleReset = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setError('');
    setSuccess('');
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);
  const validation = validatePassword(formData.newPassword);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
          <Icon icon="material-symbols:lock" className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
          <p className="text-sm text-gray-600">Update your account password for better security</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Current Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showPasswords.current ? 'text' : 'password'}
              value={formData.currentPassword}
              onChange={(e) => handleInputChange('currentPassword', e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your current password"
              required
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('current')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Icon 
                icon={showPasswords.current ? 'material-symbols:visibility-off' : 'material-symbols:visibility'} 
                className="w-5 h-5" 
              />
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Password
          </label>
          <div className="relative">
            <input
              type={showPasswords.new ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your new password"
              required
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('new')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Icon 
                icon={showPasswords.new ? 'material-symbols:visibility-off' : 'material-symbols:visibility'} 
                className="w-5 h-5" 
              />
            </button>
          </div>
          
          {/* Password Strength Indicator */}
          {formData.newPassword && (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-600">Password strength:</span>
                <span className={`text-sm font-medium ${passwordStrength.color}`}>
                  {passwordStrength.level.charAt(0).toUpperCase() + passwordStrength.level.slice(1)}
                </span>
              </div>
              <div className="space-y-1">
                <div className={`flex items-center gap-2 text-xs ${validation.minLength ? 'text-green-600' : 'text-gray-400'}`}>
                  <Icon icon={validation.minLength ? 'material-symbols:check-circle' : 'material-symbols:radio-button-unchecked'} className="w-4 h-4" />
                  At least 8 characters
                </div>
                <div className={`flex items-center gap-2 text-xs ${validation.hasUpperCase ? 'text-green-600' : 'text-gray-400'}`}>
                  <Icon icon={validation.hasUpperCase ? 'material-symbols:check-circle' : 'material-symbols:radio-button-unchecked'} className="w-4 h-4" />
                  One uppercase letter
                </div>
                <div className={`flex items-center gap-2 text-xs ${validation.hasLowerCase ? 'text-green-600' : 'text-gray-400'}`}>
                  <Icon icon={validation.hasLowerCase ? 'material-symbols:check-circle' : 'material-symbols:radio-button-unchecked'} className="w-4 h-4" />
                  One lowercase letter
                </div>
                <div className={`flex items-center gap-2 text-xs ${validation.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                  <Icon icon={validation.hasNumber ? 'material-symbols:check-circle' : 'material-symbols:radio-button-unchecked'} className="w-4 h-4" />
                  One number
                </div>
                <div className={`flex items-center gap-2 text-xs ${validation.hasSpecialChar ? 'text-green-600' : 'text-gray-400'}`}>
                  <Icon icon={validation.hasSpecialChar ? 'material-symbols:check-circle' : 'material-symbols:radio-button-unchecked'} className="w-4 h-4" />
                  One special character (optional)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm your new password"
              required
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('confirm')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Icon 
                icon={showPasswords.confirm ? 'material-symbols:visibility-off' : 'material-symbols:visibility'} 
                className="w-5 h-5" 
              />
            </button>
          </div>
          
          {/* Password Match Indicator */}
          {formData.confirmPassword && (
            <div className="mt-2">
              <div className={`flex items-center gap-2 text-xs ${
                formData.newPassword === formData.confirmPassword && formData.confirmPassword 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                <Icon 
                  icon={formData.newPassword === formData.confirmPassword && formData.confirmPassword 
                    ? 'material-symbols:check-circle' 
                    : 'material-symbols:error'} 
                  className="w-4 h-4" 
                />
                {formData.newPassword === formData.confirmPassword && formData.confirmPassword 
                  ? 'Passwords match' 
                  : 'Passwords do not match'}
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <Icon icon="material-symbols:error" className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <Icon icon="material-symbols:check-circle" className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-800">{success}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={isChanging || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {isChanging && <Icon icon="material-symbols:loading" className="w-5 h-5 mr-2 animate-spin" />}
            {isChanging ? 'Changing Password...' : 'Change Password'}
          </Button>
          <Button
            type="button"
            onClick={handleReset}
            disabled={isChanging}
            variant="outline"
            className="px-6"
          >
            Reset
          </Button>
        </div>
      </form>

      {/* Security Tips */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <Icon icon="material-symbols:security" className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Security Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use a unique password that you don't use elsewhere</li>
              <li>• Consider using a password manager</li>
              <li>• Avoid using personal information in your password</li>
              <li>• Change your password regularly for better security</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


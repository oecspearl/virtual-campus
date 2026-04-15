'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase-provider';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import PushNotificationManager from '@/app/components/notification/PushNotificationManager';

interface NotificationPreferences {
  id?: string;
  user_id: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  push_enabled: boolean;
  phone_number: string | null;
  whatsapp_number: string | null;
  preferences: {
    [key: string]: {
      email?: boolean;
      in_app?: boolean;
      sms?: boolean;
      whatsapp?: boolean;
      days_before?: number;
    };
  };
  quiet_hours_start: string;
  quiet_hours_end: string;
  digest_frequency: 'none' | 'daily' | 'weekly';
}

export default function NotificationPreferencesPage() {
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const res = await fetch('/api/notifications/preferences', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await res.json();
      if (data.success && data.preferences) {
        setPreferences(data.preferences);
      }
    } catch (err: any) {
      console.error('Error loading preferences:', err);
      setError('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(preferences),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || 'Failed to save preferences');
      }
    } catch (err: any) {
      console.error('Error saving preferences:', err);
      setError('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (path: string[], value: any) => {
    if (!preferences) return;

    const newPrefs = { ...preferences };
    let current: any = newPrefs;

    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }

    current[path[path.length - 1]] = value;
    setPreferences(newPrefs);
  };

  const notificationTypes = [
    {
      key: 'assignment_due_reminder',
      label: 'Assignment Due Reminders',
      description: 'Get notified when assignments are due',
      hasDaysBefore: true,
    },
    {
      key: 'grade_posted',
      label: 'Grade Posted',
      description: 'Receive notifications when grades are posted',
    },
    {
      key: 'course_announcement',
      label: 'Course Announcements',
      description: 'Notifications for course announcements',
    },
    {
      key: 'discussion_reply',
      label: 'Discussion Replies',
      description: 'Notifications when someone replies to your discussion',
    },
    {
      key: 'discussion_mention',
      label: 'Discussion Mentions',
      description: 'Notifications when you are mentioned in discussions',
    },
    {
      key: 'enrollment_confirmation',
      label: 'Enrollment Confirmations',
      description: 'Notifications when you enroll in courses',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-8">
            <p className="text-gray-600">Unable to load preferences</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-normal text-slate-900 tracking-tight">Notification Preferences</h1>
          <p className="text-gray-600 mt-2">Manage how and when you receive notifications</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
            <Icon icon="material-symbols:check-circle" className="w-5 h-5 text-green-600" />
            <span className="text-green-800">Preferences saved successfully!</span>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <Icon icon="material-symbols:error" className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* Global Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Global Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Email Notifications</label>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.email_enabled}
                  onChange={(e) => updatePreference(['email_enabled'], e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">In-App Notifications</label>
                <p className="text-sm text-gray-500">Receive notifications in the application</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.in_app_enabled}
                  onChange={(e) => updatePreference(['in_app_enabled'], e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Additional Channels</h3>

              {/* SMS Notifications */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">SMS Notifications</label>
                    <p className="text-sm text-gray-500">Receive notifications via text message</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.sms_enabled || false}
                      onChange={(e) => updatePreference(['sms_enabled'], e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {preferences.sms_enabled && (
                  <div className="ml-4">
                    <label className="text-sm text-gray-700 block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={preferences.phone_number || ''}
                      onChange={(e) => updatePreference(['phone_number'], e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +1 for US)</p>
                  </div>
                )}
              </div>

              {/* WhatsApp Notifications */}
              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">WhatsApp Notifications</label>
                    <p className="text-sm text-gray-500">Receive notifications via WhatsApp</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.whatsapp_enabled || false}
                      onChange={(e) => updatePreference(['whatsapp_enabled'], e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {preferences.whatsapp_enabled && (
                  <div className="ml-4">
                    <label className="text-sm text-gray-700 block mb-1">WhatsApp Number</label>
                    <input
                      type="tel"
                      value={preferences.whatsapp_number || preferences.phone_number || ''}
                      onChange={(e) => updatePreference(['whatsapp_number'], e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">WhatsApp number with country code</p>
                  </div>
                )}
              </div>

              {/* Push Notifications */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <PushNotificationManager
                  onStatusChange={(enabled) => updatePreference(['push_enabled'], enabled)}
                  showInlineStatus={true}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Notification Type Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Types</h2>
          
          <div className="space-y-6">
            {notificationTypes.map((type, index) => {
              const pref = preferences.preferences?.[type.key] || { email: true, in_app: true };
              
              return (
                <motion.div
                  key={type.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="border-b border-gray-200 last:border-b-0 pb-6 last:pb-0"
                >
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-gray-900">{type.label}</h3>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Email</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pref.email !== false}
                          onChange={(e) => updatePreference(['preferences', type.key, 'email'], e.target.checked)}
                          disabled={!preferences.email_enabled}
                          className="sr-only peer disabled:opacity-50"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">In-App</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pref.in_app !== false}
                          onChange={(e) => updatePreference(['preferences', type.key, 'in_app'], e.target.checked)}
                          disabled={!preferences.in_app_enabled}
                          className="sr-only peer disabled:opacity-50"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                      </label>
                    </div>

                    {preferences.sms_enabled && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">SMS</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pref.sms !== false}
                            onChange={(e) => updatePreference(['preferences', type.key, 'sms'], e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    )}

                    {preferences.whatsapp_enabled && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">WhatsApp</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pref.whatsapp !== false}
                            onChange={(e) => updatePreference(['preferences', type.key, 'whatsapp'], e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    )}

                    {type.hasDaysBefore && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-700">Remind me</label>
                        <select
                          value={pref.days_before || 1}
                          onChange={(e) => updatePreference(['preferences', type.key, 'days_before'], parseInt(e.target.value))}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="0">On due date</option>
                          <option value="1">1 day before</option>
                          <option value="2">2 days before</option>
                          <option value="3">3 days before</option>
                          <option value="7">1 week before</option>
                        </select>
                        <span className="text-sm text-gray-500">before due date</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Digest Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Email Digest</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-900 block mb-2">Digest Frequency</label>
              <select
                value={preferences.digest_frequency}
                onChange={(e) => updatePreference(['digest_frequency'], e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="none">No digest</option>
                <option value="daily">Daily digest</option>
                <option value="weekly">Weekly digest</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">Receive a summary of notifications</p>
            </div>
          </div>
        </motion.div>

        {/* Quiet Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quiet Hours</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-900 block mb-2">Start Time</label>
              <input
                type="time"
                value={preferences.quiet_hours_start || '22:00'}
                onChange={(e) => updatePreference(['quiet_hours_start'], e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-900 block mb-2">End Time</label>
              <input
                type="time"
                value={preferences.quiet_hours_end || '08:00'}
                onChange={(e) => updatePreference(['quiet_hours_end'], e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">No notifications will be sent during quiet hours</p>
        </motion.div>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={savePreferences}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Icon icon="material-symbols:save" className="w-5 h-5" />
                Save Preferences
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

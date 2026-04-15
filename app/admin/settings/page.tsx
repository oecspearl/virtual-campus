'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSupabase } from '@/lib/supabase-provider';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import RoleGuard from '@/app/components/RoleGuard';
import { clearEditorPreferenceCache } from '@/app/components/editor/TextEditor';
import LoadingIndicator from '@/app/components/ui/LoadingIndicator';

export default function AdminSettingsPage() {
  const { user } = useSupabase();
  const [editorType, setEditorType] = useState<'tinymce' | 'editorjs' | 'lexical' | 'slate' | 'proseforge'>('proseforge');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Resource upload size state
  const [resourceUploadSize, setResourceUploadSize] = useState(10);
  const [loadingUploadSize, setLoadingUploadSize] = useState(true);
  const [savingUploadSize, setSavingUploadSize] = useState(false);
  const [uploadSizeSuccess, setUploadSizeSuccess] = useState('');
  const [uploadSizeError, setUploadSizeError] = useState('');

  useEffect(() => {
    loadEditorPreference();
    loadResourceUploadSize();
  }, []);

  const loadResourceUploadSize = async () => {
    try {
      setLoadingUploadSize(true);
      const response = await fetch('/api/admin/settings/resource-upload');
      if (response.ok) {
        const data = await response.json();
        setResourceUploadSize(data.maxSizeMB || 10);
      }
    } catch (err) {
      console.error('Error loading resource upload size:', err);
    } finally {
      setLoadingUploadSize(false);
    }
  };

  const handleSaveResourceUploadSize = async () => {
    try {
      setSavingUploadSize(true);
      setUploadSizeError('');
      setUploadSizeSuccess('');

      const response = await fetch('/api/admin/settings/resource-upload', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxSizeMB: resourceUploadSize })
      });

      if (response.ok) {
        setUploadSizeSuccess(`Resource upload limit updated to ${resourceUploadSize}MB`);
        setTimeout(() => setUploadSizeSuccess(''), 5000);
      } else {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));
        setUploadSizeError(data.error || 'Failed to update resource upload size');
      }
    } catch (err) {
      console.error('Error saving resource upload size:', err);
      setUploadSizeError('Failed to update resource upload size');
    } finally {
      setSavingUploadSize(false);
    }
  };

  const loadEditorPreference = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/editor');
      if (response.ok) {
        const data = await response.json();
        setEditorType(data.editorType || 'proseforge');
      } else {
        setError('Failed to load editor preference');
      }
    } catch (err) {
      console.error('Error loading editor preference:', err);
      setError('Failed to load editor preference');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEditorPreference = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/admin/settings/editor', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ editorType }),
      });

      if (response.ok) {
        setSuccess('Editor preference updated successfully! All users will see this change on their next page load.');
        clearEditorPreferenceCache(); // Clear cache to force refresh
        
        // Optional: Show a message that page refresh may be needed
        setTimeout(() => {
          setSuccess('');
        }, 5000);
      } else {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        // Handle specific error codes
        if (data.code === 'TABLE_NOT_FOUND') {
          setError(
            'Database table not found. Please run the database migration first. ' +
            'Execute the SQL file: create-system-settings-schema.sql in your Supabase SQL editor.'
          );
        } else if (data.code === 'PERMISSION_DENIED') {
          setError('Permission denied. Please check that your user has admin privileges and RLS policies are configured correctly.');
        } else {
          setError(data.error || 'Failed to update editor preference');
        }
        
        console.error('Error response:', data);
      }
    } catch (err) {
      console.error('Error saving editor preference:', err);
      setError('Failed to update editor preference. Please check your network connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleGuard
      roles={['admin', 'super_admin']}
      fallback={
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center py-12">
              <div className="text-center bg-white rounded-lg shadow p-8 max-w-md">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon icon="material-symbols:block" className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-600 mb-4">
                  You don't have permission to access this page. Admin privileges are required.
                </p>
                <Button
                  onClick={() => window.history.back()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Go Back
                </Button>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-normal text-slate-900 tracking-tight mb-2">System Settings</h1>
                <p className="text-gray-600">Manage application-wide settings and preferences</p>
              </div>
            </div>
          </div>

          {/* Settings Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* User Management Card */}
            <Link 
              href="/admin/users/manage"
              className="group bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center group- transition-transform duration-200">
                  <Icon icon="material-symbols:people" className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    User Management
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Manage users, roles, enrollments, and user profiles
                  </p>
                  <div className="flex items-center text-blue-600 text-sm font-medium">
                    <span>Manage users</span>
                    <Icon icon="material-symbols:arrow-forward" className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Authentication / SSO Card */}
            <Link
              href="/admin/settings/oauth"
              className="group bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center group- transition-transform duration-200">
                  <Icon icon="material-symbols:shield-lock" className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    Authentication / SSO
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Configure OAuth 2.0, Azure AD, and OIDC single sign-on providers
                  </p>
                  <div className="flex items-center text-blue-600 text-sm font-medium">
                    <span>Manage providers</span>
                    <Icon icon="material-symbols:arrow-forward" className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Course Management Card */}
            <Link
              href="/admin/courses/manage"
              className="group bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center group- transition-transform duration-200">
                  <Icon icon="material-symbols:school" className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    Course Management
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Manage courses, publish/unpublish, bulk operations
                  </p>
                  <div className="flex items-center text-blue-600 text-sm font-medium">
                    <span>Manage courses</span>
                    <Icon icon="material-symbols:arrow-forward" className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Course Categories Card */}
            <Link
              href="/admin/categories"
              className="group bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center group- transition-transform duration-200">
                  <Icon icon="material-symbols:folder" className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    Course Categories
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Organize courses into categories and subcategories
                  </p>
                  <div className="flex items-center text-blue-600 text-sm font-medium">
                    <span>Manage categories</span>
                    <Icon icon="material-symbols:arrow-forward" className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Programmes Card */}
            <Link
              href="/admin/programmes"
              className="group bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center group- transition-transform duration-200">
                  <Icon icon="material-symbols:school" className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    Programmes
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Multi-course programmes with grade aggregation
                  </p>
                  <div className="flex items-center text-blue-600 text-sm font-medium">
                    <span>Manage programmes</span>
                    <Icon icon="material-symbols:arrow-forward" className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Test Email Card */}
            <Link 
              href="/admin/test-email"
              className="group bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center group- transition-transform duration-200">
                  <Icon icon="material-symbols:mail" className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    Test Email
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Send a test email to verify email notification configuration
                  </p>
                  <div className="flex items-center text-blue-600 text-sm font-medium">
                    <span>Test email</span>
                    <Icon icon="material-symbols:arrow-forward" className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Certificate Templates Card */}
            <Link 
              href="/admin/certificates/templates"
              className="group bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center group- transition-transform duration-200">
                  <Icon icon="material-symbols:workspace-premium" className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    Certificate Templates
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Design and manage certificate templates
                  </p>
                  <div className="flex items-center text-blue-600 text-sm font-medium">
                    <span>Manage templates</span>
                    <Icon icon="material-symbols:arrow-forward" className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Manage Certificates Card */}
            <Link 
              href="/admin/certificates/manage"
              className="group bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center group- transition-transform duration-200">
                  <Icon icon="material-symbols:verified" className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    Manage Certificates
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    View and manage all issued certificates
                  </p>
                  <div className="flex items-center text-blue-600 text-sm font-medium">
                    <span>View certificates</span>
                    <Icon icon="material-symbols:arrow-forward" className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Branding Settings Card */}
            <Link
              href="/admin/settings/branding"
              className="group bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center group- transition-transform duration-200">
                  <Icon icon="material-symbols:palette" className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    Branding Settings
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Manage site name, logos, homepage images, and visual identity
                  </p>
                  <div className="flex items-center text-blue-600 text-sm font-medium">
                    <span>Configure branding</span>
                    <Icon icon="material-symbols:arrow-forward" className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Proctoring Services Card */}
            <Link
              href="/admin/proctoring-services"
              className="group bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center group- transition-transform duration-200">
                  <Icon icon="material-symbols:security" className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    Proctoring Services
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Configure Respondus, ProctorU, and other proctoring integrations
                  </p>
                  <div className="flex items-center text-blue-600 text-sm font-medium">
                    <span>Manage services</span>
                    <Icon icon="material-symbols:arrow-forward" className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Editor Settings Summary Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Icon icon="material-symbols:edit-note" className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Text Editor
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Configure the default text editor for content creation
                  </p>
                  <div className="text-sm text-gray-500">
                    Current: <span className="font-medium text-gray-700">{loading ? 'Loading...' : editorType === 'proseforge' ? 'Learnboard Native Editor' : editorType === 'tinymce' ? 'TinyMCE' : editorType === 'editorjs' ? 'Editor.js' : editorType === 'lexical' ? 'Lexical' : editorType === 'slate' ? 'Slate' : editorType}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Resource Upload Summary Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <Icon icon="material-symbols:upload-file" className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Resource Uploads
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Configure file upload limits for resource links
                  </p>
                  <div className="text-sm text-gray-500">
                    Max size: <span className="font-medium text-gray-700">{loadingUploadSize ? 'Loading...' : `${resourceUploadSize}MB`}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Editor Settings Card - Detailed Configuration */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Icon icon="material-symbols:edit-note" className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Text Editor</h2>
                <p className="text-sm text-gray-600">Choose the default text editor for content creation</p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingIndicator variant="pencil" text="Loading settings..." />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Editor Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* TinyMCE Option */}
                  <div
                    onClick={() => setEditorType('tinymce')}
                    className={`relative cursor-pointer rounded-lg border-2 p-6 transition-all ${
                      editorType === 'tinymce'
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                        editorType === 'tinymce' ? 'bg-blue-500' : 'bg-gray-200'
                      }`}>
                        <Icon icon="material-symbols:text-fields" className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">TinyMCE</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Feature-rich WYSIWYG editor with extensive formatting options, media support, and plugin ecosystem.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Tables</span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Media</span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Code</span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Emoticons</span>
                        </div>
                      </div>
                      {editorType === 'tinymce' && (
                        <div className="absolute top-4 right-4">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <Icon icon="material-symbols:check" className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Editor.js Option */}
                  <div
                    onClick={() => setEditorType('editorjs')}
                    className={`relative cursor-pointer rounded-lg border-2 p-6 transition-all ${
                      editorType === 'editorjs'
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                        editorType === 'editorjs' ? 'bg-blue-500' : 'bg-gray-200'
                      }`}>
                        <Icon icon="material-symbols:code-blocks" className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">Editor.js</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Block-styled editor that outputs clean JSON. Perfect for structured content.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Free</span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Block-based</span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">JSON Output</span>
                        </div>
                      </div>
                      {editorType === 'editorjs' && (
                        <div className="absolute top-4 right-4">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <Icon icon="material-symbols:check" className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lexical Editor Option */}
                  <div
                    onClick={() => setEditorType('lexical')}
                    className={`relative cursor-pointer rounded-lg border-2 p-6 transition-all ${
                      editorType === 'lexical'
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                        editorType === 'lexical' ? 'bg-blue-500' : 'bg-gray-200'
                      }`}>
                        <Icon icon="material-symbols:code" className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">Lexical</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Facebook's modern, extensible text editor framework. High performance and React 19 compatible.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Free</span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Modern</span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Fast</span>
                        </div>
                      </div>
                      {editorType === 'lexical' && (
                        <div className="absolute top-4 right-4">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <Icon icon="material-symbols:check" className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Slate Editor Option */}
                  <div
                    onClick={() => setEditorType('slate')}
                    className={`relative cursor-pointer rounded-lg border-2 p-6 transition-all ${
                      editorType === 'slate'
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                        editorType === 'slate' ? 'bg-blue-500' : 'bg-gray-200'
                      }`}>
                        <Icon icon="material-symbols:edit-square" className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">Slate</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Highly customizable framework for building rich text editors. Fully React 19 compatible.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Free</span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Customizable</span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Flexible</span>
                        </div>
                      </div>
                      {editorType === 'slate' && (
                        <div className="absolute top-4 right-4">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <Icon icon="material-symbols:check" className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Learnboard Native Editor Option */}
                  <div
                    onClick={() => setEditorType('proseforge')}
                    className={`relative cursor-pointer rounded-lg border-2 p-6 transition-all ${
                      editorType === 'proseforge'
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                        editorType === 'proseforge' ? 'bg-blue-500' : 'bg-gray-200'
                      }`}>
                        <Icon icon="material-symbols:stylus-note" className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">Learnboard Native Editor</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          ProseMirror-inspired rich text editor with professional toolbar, find & replace, and dark chrome UI.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Free</span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Tables</span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Find & Replace</span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Export</span>
                        </div>
                      </div>
                      {editorType === 'proseforge' && (
                        <div className="absolute top-4 right-4">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <Icon icon="material-symbols:check" className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Success/Error Messages */}
                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
                    <Icon icon="material-symbols:check-circle" className="w-5 h-5" />
                    <span>{success}</span>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
                    <Icon icon="material-symbols:error" className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <Button
                    onClick={handleSaveEditorPreference}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Icon icon="material-symbols:hourglass-empty" className="w-5 h-5 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Icon icon="material-symbols:save" className="w-5 h-5 mr-2" />
                        Save Editor Preference
                      </>
                    )}
                  </Button>
                </div>

                {/* Note */}
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Icon icon="material-symbols:info" className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Note:</p>
                      <p>
                        Changes will apply to all new editor instances. Users may need to refresh their browser to see the new editor.
                        Existing content created with either editor will continue to work correctly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resource Upload Settings Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <Icon icon="material-symbols:upload-file" className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Resource Upload Limits</h2>
                <p className="text-sm text-gray-600">Configure file upload size limits for resource links</p>
              </div>
            </div>

            {loadingUploadSize ? (
              <div className="flex items-center justify-center py-8">
                <LoadingIndicator variant="pencil" text="Loading settings..." />
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum File Size (MB)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={resourceUploadSize}
                      onChange={(e) => setResourceUploadSize(Number(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={resourceUploadSize}
                        onChange={(e) => {
                          const val = Math.min(500, Math.max(1, Number(e.target.value) || 1));
                          setResourceUploadSize(val);
                        }}
                        className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-center"
                      />
                      <span className="text-sm text-gray-600 font-medium">MB</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Allowed file types: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, RTF
                  </p>
                </div>

                {/* Preset Sizes */}
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Quick presets:</p>
                  <div className="flex flex-wrap gap-2">
                    {[5, 10, 25, 50, 100].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setResourceUploadSize(size)}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                          resourceUploadSize === size
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {size}MB
                      </button>
                    ))}
                  </div>
                </div>

                {/* Success/Error Messages */}
                {uploadSizeSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
                    <Icon icon="material-symbols:check-circle" className="w-5 h-5" />
                    <span>{uploadSizeSuccess}</span>
                  </div>
                )}

                {uploadSizeError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
                    <Icon icon="material-symbols:error" className="w-5 h-5" />
                    <span>{uploadSizeError}</span>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <Button
                    onClick={handleSaveResourceUploadSize}
                    disabled={savingUploadSize}
                    className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
                  >
                    {savingUploadSize ? (
                      <>
                        <Icon icon="material-symbols:hourglass-empty" className="w-5 h-5 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Icon icon="material-symbols:save" className="w-5 h-5 mr-2" />
                        Save Upload Limit
                      </>
                    )}
                  </Button>
                </div>

                {/* Info Note */}
                <div className="bg-teal-50 border border-teal-200 text-teal-800 px-4 py-3 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Icon icon="material-symbols:info" className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">About Resource Uploads:</p>
                      <p>
                        Instructors can upload documents, PDFs, and presentations directly as resource links for courses and lessons.
                        Changing this limit affects all new uploads immediately.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}


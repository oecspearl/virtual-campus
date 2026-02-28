'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/app/components/Button';
import { Input } from '@/app/components/Input';

interface LTIExternalPlatform {
  id: string;
  name: string;
  description?: string;
  issuer: string;
  client_id: string;
  deployment_id?: string;
  authorization_server?: string;
  token_endpoint?: string;
  jwks_uri: string;
  platform_public_key?: string;
  launch_url: string;
  auto_provision_users: boolean;
  default_user_role: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
}

export default function LTIPlatformsPage() {
  const [platforms, setPlatforms] = useState<LTIExternalPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<LTIExternalPlatform | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    issuer: '',
    client_id: '',
    deployment_id: '',
    authorization_server: '',
    token_endpoint: '',
    jwks_uri: '',
    platform_public_key: '',
    launch_url: '',
    auto_provision_users: true,
    default_user_role: 'student',
  });

  useEffect(() => {
    loadPlatforms();
  }, []);

  const loadPlatforms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/lti-platforms');
      if (response.ok) {
        const data = await response.json();
        setPlatforms(data);
      }
    } catch (error) {
      console.error('Failed to load LTI platforms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingPlatform 
        ? `/api/admin/lti-platforms/${editingPlatform.id}`
        : '/api/admin/lti-platforms';
      
      const method = editingPlatform ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadPlatforms();
        setShowAddForm(false);
        setEditingPlatform(null);
        setFormData({
          name: '',
          description: '',
          issuer: '',
          client_id: '',
          deployment_id: '',
          authorization_server: '',
          token_endpoint: '',
          jwks_uri: '',
          platform_public_key: '',
          launch_url: '',
          auto_provision_users: true,
          default_user_role: 'student',
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save platform');
      }
    } catch (error) {
      console.error('Failed to save platform:', error);
      alert('Failed to save platform');
    }
  };

  const handleEdit = (platform: LTIExternalPlatform) => {
    setEditingPlatform(platform);
    setFormData({
      name: platform.name,
      description: platform.description || '',
      issuer: platform.issuer,
      client_id: platform.client_id,
      deployment_id: platform.deployment_id || '',
      authorization_server: platform.authorization_server || '',
      token_endpoint: platform.token_endpoint || '',
      jwks_uri: platform.jwks_uri,
      platform_public_key: platform.platform_public_key || '',
      launch_url: platform.launch_url,
      auto_provision_users: platform.auto_provision_users,
      default_user_role: platform.default_user_role,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (platformId: string) => {
    if (!confirm('Are you sure you want to delete this platform? This will prevent launches from this platform.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/lti-platforms/${platformId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadPlatforms();
      } else {
        alert('Failed to delete platform');
      }
    } catch (error) {
      console.error('Failed to delete platform:', error);
      alert('Failed to delete platform');
    }
  };

  const toggleStatus = async (platform: LTIExternalPlatform) => {
    try {
      const response = await fetch(`/api/admin/lti-platforms/${platform.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...platform,
          status: platform.status === 'active' ? 'inactive' : 'active',
        }),
      });

      if (response.ok) {
        await loadPlatforms();
      }
    } catch (error) {
      console.error('Failed to update platform status:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">LTI External Platforms</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage external platforms that can launch this LMS as an LTI tool (Canvas, Blackboard, Moodle, etc.)
            </p>
          </div>
          <Button
            onClick={() => {
              setShowAddForm(true);
              setEditingPlatform(null);
              setFormData({
                name: '',
                description: '',
                issuer: '',
                client_id: '',
                deployment_id: '',
                authorization_server: '',
                token_endpoint: '',
                jwks_uri: '',
                platform_public_key: '',
                launch_url: '',
                auto_provision_users: true,
                default_user_role: 'student',
              });
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Icon icon="material-symbols:add" className="w-4 h-4 mr-2" />
            Add Platform
          </Button>
        </div>
      </div>

      {showAddForm && (
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingPlatform ? 'Edit External Platform' : 'Add New External Platform'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform Name *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Canvas, Blackboard, Moodle"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issuer (Platform URL) *
                </label>
                <Input
                  type="url"
                  value={formData.issuer}
                  onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                  required
                  placeholder="https://canvas.instructure.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client ID (Our ID on their platform) *
                </label>
                <Input
                  type="text"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deployment ID
                </label>
                <Input
                  type="text"
                  value={formData.deployment_id}
                  onChange={(e) => setFormData({ ...formData, deployment_id: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  JWKS URI (Public Keys URL) *
                </label>
                <Input
                  type="url"
                  value={formData.jwks_uri}
                  onChange={(e) => setFormData({ ...formData, jwks_uri: e.target.value })}
                  required
                  placeholder="https://canvas.instructure.com/api/lti/security/jwks"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Launch URL (Our launch endpoint on their platform) *
                </label>
                <Input
                  type="url"
                  value={formData.launch_url}
                  onChange={(e) => setFormData({ ...formData, launch_url: e.target.value })}
                  required
                  placeholder="https://lms.oecslearninghub.org/api/lti/tool/launch"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Authorization Server
                </label>
                <Input
                  type="url"
                  value={formData.authorization_server}
                  onChange={(e) => setFormData({ ...formData, authorization_server: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Token Endpoint
                </label>
                <Input
                  type="url"
                  value={formData.token_endpoint}
                  onChange={(e) => setFormData({ ...formData, token_endpoint: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform Public Key (PEM format, optional - will fetch from JWKS if not provided)
                </label>
                <textarea
                  value={formData.platform_public_key}
                  onChange={(e) => setFormData({ ...formData, platform_public_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs"
                  rows={4}
                  placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
                />
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.auto_provision_users}
                    onChange={(e) => setFormData({ ...formData, auto_provision_users: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Auto-provision users from LTI claims
                  </span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default User Role
                </label>
                <select
                  value={formData.default_user_role}
                  onChange={(e) => setFormData({ ...formData, default_user_role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingPlatform ? 'Update Platform' : 'Add Platform'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingPlatform(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issuer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {platforms.map((platform) => (
                <tr key={platform.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{platform.name}</div>
                    {platform.description && (
                      <div className="text-sm text-gray-500">{platform.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 truncate max-w-xs">{platform.issuer}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">{platform.client_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        platform.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : platform.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {platform.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(platform)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Icon icon="material-symbols:edit" className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => toggleStatus(platform)}
                        className={`${
                          platform.status === 'active'
                            ? 'text-yellow-600 hover:text-yellow-900'
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        <Icon
                          icon={
                            platform.status === 'active'
                              ? 'material-symbols:pause'
                              : 'material-symbols:play-arrow'
                          }
                          className="w-5 h-5"
                        />
                      </button>
                      <button
                        onClick={() => handleDelete(platform.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Icon icon="material-symbols:delete" className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {platforms.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No external platforms registered. Click "Add Platform" to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
}




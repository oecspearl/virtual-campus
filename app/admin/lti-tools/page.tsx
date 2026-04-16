'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';

interface LTITool {
  id: string;
  name: string;
  description?: string;
  tool_url: string;
  login_url?: string;
  launch_url: string;
  client_id: string;
  deployment_id?: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
}

export default function LTIToolsPage() {
  const [tools, setTools] = useState<LTITool[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTool, setEditingTool] = useState<LTITool | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tool_url: '',
    login_url: '',
    launch_url: '',
    client_id: '',
    deployment_id: '',
    tool_keyset_url: '',
    tool_oidc_login_url: '',
  });

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/lti-tools');
      if (response.ok) {
        const data = await response.json();
        setTools(data);
      }
    } catch (error) {
      console.error('Failed to load LTI tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTool 
        ? `/api/admin/lti-tools/${editingTool.id}`
        : '/api/admin/lti-tools';
      
      const method = editingTool ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadTools();
        setShowAddForm(false);
        setEditingTool(null);
        setFormData({
          name: '',
          description: '',
          tool_url: '',
          login_url: '',
          launch_url: '',
          client_id: '',
          deployment_id: '',
          tool_keyset_url: '',
          tool_oidc_login_url: '',
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save tool');
      }
    } catch (error) {
      console.error('Failed to save tool:', error);
      alert('Failed to save tool');
    }
  };

  const handleEdit = (tool: LTITool) => {
    setEditingTool(tool);
    setFormData({
      name: tool.name,
      description: tool.description || '',
      tool_url: tool.tool_url,
      login_url: tool.login_url || '',
      launch_url: tool.launch_url,
      client_id: tool.client_id,
      deployment_id: tool.deployment_id || '',
      tool_keyset_url: '',
      tool_oidc_login_url: '',
    });
    setShowAddForm(true);
  };

  const handleDelete = async (toolId: string) => {
    if (!confirm('Are you sure you want to delete this LTI tool?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/lti-tools/${toolId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadTools();
      } else {
        alert('Failed to delete tool');
      }
    } catch (error) {
      console.error('Failed to delete tool:', error);
      alert('Failed to delete tool');
    }
  };

  const toggleStatus = async (tool: LTITool) => {
    try {
      const response = await fetch(`/api/admin/lti-tools/${tool.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...tool,
          status: tool.status === 'active' ? 'inactive' : 'active',
        }),
      });

      if (response.ok) {
        await loadTools();
      }
    } catch (error) {
      console.error('Failed to update tool status:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-normal text-slate-900 tracking-tight">LTI 1.3 Tools</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage Learning Tools Interoperability (LTI) 1.3 tool registrations
            </p>
          </div>
          <Button
            onClick={() => {
              setShowAddForm(true);
              setEditingTool(null);
              setFormData({
                name: '',
                description: '',
                tool_url: '',
                login_url: '',
                launch_url: '',
                client_id: '',
                deployment_id: '',
                tool_keyset_url: '',
                tool_oidc_login_url: '',
              });
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Icon icon="material-symbols:add" className="w-4 h-4 mr-2" />
            Add LTI Tool
          </Button>
        </div>
      </div>

      {showAddForm && (
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingTool ? 'Edit LTI Tool' : 'Add New LTI Tool'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tool Name *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client ID *
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
                  Tool URL *
                </label>
                <Input
                  type="url"
                  value={formData.tool_url}
                  onChange={(e) => setFormData({ ...formData, tool_url: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Launch URL *
                </label>
                <Input
                  type="url"
                  value={formData.launch_url}
                  onChange={(e) => setFormData({ ...formData, launch_url: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Login URL
                </label>
                <Input
                  type="url"
                  value={formData.login_url}
                  onChange={(e) => setFormData({ ...formData, login_url: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OIDC Login URL
                </label>
                <Input
                  type="url"
                  value={formData.tool_oidc_login_url}
                  onChange={(e) => setFormData({ ...formData, tool_oidc_login_url: e.target.value })}
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
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keyset URL
                </label>
                <Input
                  type="url"
                  value={formData.tool_keyset_url}
                  onChange={(e) => setFormData({ ...formData, tool_keyset_url: e.target.value })}
                />
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
                {editingTool ? 'Update Tool' : 'Add Tool'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingTool(null);
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
        <div className="bg-white shadow rounded-lg overflow-hidden overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tool Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Launch URL
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
              {tools.map((tool) => (
                <tr key={tool.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{tool.name}</div>
                    {tool.description && (
                      <div className="text-sm text-gray-500">{tool.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">{tool.client_id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 truncate max-w-xs">{tool.launch_url}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        tool.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : tool.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {tool.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(tool)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Icon icon="material-symbols:edit" className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => toggleStatus(tool)}
                        className={`${
                          tool.status === 'active'
                            ? 'text-yellow-600 hover:text-yellow-900'
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        <Icon
                          icon={
                            tool.status === 'active'
                              ? 'material-symbols:pause'
                              : 'material-symbols:play-arrow'
                          }
                          className="w-5 h-5"
                        />
                      </button>
                      <button
                        onClick={() => handleDelete(tool.id)}
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
          {tools.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No LTI tools registered. Click "Add LTI Tool" to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
}


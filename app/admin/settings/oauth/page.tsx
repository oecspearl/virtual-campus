'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import RoleGuard from '@/app/components/RoleGuard';
import LoadingIndicator from '@/app/components/ui/LoadingIndicator';

type ProviderType = 'azure_ad' | 'google' | 'generic_oidc';

interface OAuthProvider {
  id: string;
  provider_type: ProviderType;
  display_name: string;
  enabled: boolean;
  client_id: string;
  provider_tenant_id: string | null;
  authorization_url: string | null;
  token_url: string | null;
  userinfo_url: string | null;
  scopes: string;
  auto_provision_users: boolean;
  default_role: string;
  email_domain_restriction: string | null;
  button_label: string | null;
  button_icon: string | null;
  sort_order: number;
  connection_status: string;
  last_used_at: string | null;
}

const PROVIDER_OPTIONS: { value: ProviderType; label: string; icon: string }[] = [
  { value: 'azure_ad', label: 'Azure AD / Microsoft Entra ID', icon: 'mdi:microsoft' },
  { value: 'google', label: 'Google', icon: 'mdi:google' },
  { value: 'generic_oidc', label: 'Generic OIDC', icon: 'mdi:key-chain' },
];

const STATUS_COLORS: Record<string, string> = {
  connected: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  disabled: 'bg-gray-100 text-gray-500',
};

const ROLE_OPTIONS = [
  'student', 'parent', 'instructor', 'curriculum_designer', 'admin',
];

const emptyForm = {
  provider_type: 'azure_ad' as ProviderType,
  display_name: '',
  client_id: '',
  client_secret: '',
  provider_tenant_id: '',
  authorization_url: '',
  token_url: '',
  userinfo_url: '',
  scopes: 'openid email profile',
  auto_provision_users: true,
  default_role: 'student',
  email_domain_restriction: '',
  button_label: '',
  button_icon: '',
  sort_order: 0,
};

export default function OAuthSettingsPage() {
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings/oauth');
      if (res.ok) {
        setProviders(await res.json());
      }
    } catch (err) {
      console.error('Failed to load OAuth providers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const url = editingId
        ? `/api/admin/settings/oauth/${editingId}`
        : '/api/admin/settings/oauth';
      const method = editingId ? 'PUT' : 'POST';

      const body: Record<string, unknown> = { ...form };
      // Don't send empty client_secret on update (means no change)
      if (editingId && !form.client_secret) {
        delete body.client_secret;
      }
      // Clean empty strings to null
      for (const key of ['provider_tenant_id', 'authorization_url', 'token_url', 'userinfo_url', 'email_domain_restriction', 'button_label', 'button_icon']) {
        if (!body[key]) body[key] = null;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccess(editingId ? 'Provider updated' : 'Provider created');
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        await loadProviders();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save provider');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (provider: OAuthProvider) => {
    setEditingId(provider.id);
    setForm({
      provider_type: provider.provider_type,
      display_name: provider.display_name,
      client_id: provider.client_id,
      client_secret: '', // Don't pre-fill secret
      provider_tenant_id: provider.provider_tenant_id || '',
      authorization_url: provider.authorization_url || '',
      token_url: provider.token_url || '',
      userinfo_url: provider.userinfo_url || '',
      scopes: provider.scopes || 'openid email profile',
      auto_provision_users: provider.auto_provision_users,
      default_role: provider.default_role,
      email_domain_restriction: provider.email_domain_restriction || '',
      button_label: provider.button_label || '',
      button_icon: provider.button_icon || '',
      sort_order: provider.sort_order,
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleToggle = async (provider: OAuthProvider) => {
    try {
      const res = await fetch(`/api/admin/settings/oauth/${provider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !provider.enabled }),
      });
      if (res.ok) {
        await loadProviders();
        setSuccess(`Provider ${!provider.enabled ? 'enabled' : 'disabled'}`);
      }
    } catch {
      setError('Failed to toggle provider');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this OAuth provider?')) return;
    try {
      const res = await fetch(`/api/admin/settings/oauth/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadProviders();
        setSuccess('Provider deleted');
      }
    } catch {
      setError('Failed to delete provider');
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/settings/oauth/${id}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSuccess('Connection test passed');
        await loadProviders();
      } else {
        setError(data.error || 'Connection test failed');
      }
    } catch {
      setError('Test request failed');
    } finally {
      setTesting(null);
    }
  };

  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/oauth/callback`
    : '';

  if (loading) {
    return (
      <RoleGuard roles={['admin', 'super_admin', 'tenant_admin']}>
        <div className="flex justify-center items-center min-h-[60vh]">
          <LoadingIndicator />
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard roles={['admin', 'super_admin', 'tenant_admin']}>
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link href="/admin/settings" className="text-gray-500 hover:text-gray-700">
                <Icon icon="mdi:arrow-left" className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Authentication / SSO</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Configure OAuth 2.0 and OpenID Connect providers for single sign-on
                </p>
              </div>
            </div>
            {!showForm && (
              <button
                onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); setError(''); setSuccess(''); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                <Icon icon="mdi:plus" className="w-4 h-4" />
                Add Provider
              </button>
            )}
          </div>

          {/* Status messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <Icon icon="mdi:alert-circle" className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
              <Icon icon="mdi:check-circle" className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Redirect URI info */}
          {redirectUri && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-1">Redirect URI</p>
              <p className="text-xs text-blue-600 mb-2">
                Add this URL as a redirect URI in your identity provider configuration:
              </p>
              <code className="block text-sm bg-white px-3 py-2 rounded border border-blue-200 text-blue-900 select-all">
                {redirectUri}
              </code>
            </div>
          )}

          {/* Provider form */}
          {showForm && (
            <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">
                {editingId ? 'Edit Provider' : 'Add OAuth Provider'}
              </h2>
              <form onSubmit={handleSave} className="space-y-4">
                {/* Provider type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider Type</label>
                  <select
                    value={form.provider_type}
                    onChange={e => setForm({ ...form, provider_type: e.target.value as ProviderType })}
                    disabled={!!editingId}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {PROVIDER_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Display name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={form.display_name}
                    onChange={e => setForm({ ...form, display_name: e.target.value })}
                    placeholder="e.g., University Azure AD"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                {/* Client ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                  <input
                    type="text"
                    value={form.client_id}
                    onChange={e => setForm({ ...form, client_id: e.target.value })}
                    placeholder="Application (client) ID"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>

                {/* Client Secret */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Secret {editingId && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    value={form.client_secret}
                    onChange={e => setForm({ ...form, client_secret: e.target.value })}
                    placeholder={editingId ? '••••••••' : 'Client secret value'}
                    required={!editingId}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>

                {/* Azure AD tenant ID */}
                {(form.provider_type === 'azure_ad') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Azure AD Tenant ID
                    </label>
                    <input
                      type="text"
                      value={form.provider_tenant_id}
                      onChange={e => setForm({ ...form, provider_tenant_id: e.target.value })}
                      placeholder="e.g., contoso.onmicrosoft.com or GUID"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave blank to use &quot;common&quot; (any Microsoft account)
                    </p>
                  </div>
                )}

                {/* Generic OIDC URLs */}
                {form.provider_type === 'generic_oidc' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Authorization URL *</label>
                      <input
                        type="url"
                        value={form.authorization_url}
                        onChange={e => setForm({ ...form, authorization_url: e.target.value })}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Token URL *</label>
                      <input
                        type="url"
                        value={form.token_url}
                        onChange={e => setForm({ ...form, token_url: e.target.value })}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">User Info URL *</label>
                      <input
                        type="url"
                        value={form.userinfo_url}
                        onChange={e => setForm({ ...form, userinfo_url: e.target.value })}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                      />
                    </div>
                  </>
                )}

                {/* Scopes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scopes</label>
                  <input
                    type="text"
                    value={form.scopes}
                    onChange={e => setForm({ ...form, scopes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>

                {/* Behaviour options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Role</label>
                    <select
                      value={form.default_role}
                      onChange={e => setForm({ ...form, default_role: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      {ROLE_OPTIONS.map(r => (
                        <option key={r} value={r}>{r.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Domain Restriction</label>
                    <input
                      type="text"
                      value={form.email_domain_restriction}
                      onChange={e => setForm({ ...form, email_domain_restriction: e.target.value })}
                      placeholder="e.g., university.edu,staff.edu"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="auto_provision"
                    checked={form.auto_provision_users}
                    onChange={e => setForm({ ...form, auto_provision_users: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="auto_provision" className="text-sm text-gray-700">
                    Auto-provision new users on first login
                  </label>
                </div>

                {/* Button customization */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Button Label</label>
                    <input
                      type="text"
                      value={form.button_label}
                      onChange={e => setForm({ ...form, button_label: e.target.value })}
                      placeholder="e.g., Sign in with Azure AD"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={form.sort_order}
                      onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : (editingId ? 'Update Provider' : 'Create Provider')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Providers list */}
          {providers.length === 0 && !showForm ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
              <Icon icon="mdi:shield-key-outline" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No OAuth providers configured</p>
              <p className="text-gray-400 text-xs mt-1">
                Add an Azure AD, Google, or custom OIDC provider to enable single sign-on
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {providers.map(provider => {
                const providerOption = PROVIDER_OPTIONS.find(p => p.value === provider.provider_type);
                return (
                  <div
                    key={provider.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Icon
                            icon={providerOption?.icon || 'mdi:key-chain'}
                            className="w-5 h-5 text-gray-600"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{provider.display_name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[provider.connection_status] || STATUS_COLORS.pending}`}>
                              {provider.connection_status}
                            </span>
                            {provider.enabled ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                Enabled
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                Disabled
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {providerOption?.label} &middot; Client ID: {provider.client_id.substring(0, 12)}...
                            {provider.last_used_at && (
                              <> &middot; Last used: {new Date(provider.last_used_at).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTest(provider.id)}
                          disabled={testing === provider.id}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Test connection"
                        >
                          <Icon icon={testing === provider.id ? 'mdi:loading' : 'mdi:connection'} className={`w-4 h-4 ${testing === provider.id ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleToggle(provider)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                          title={provider.enabled ? 'Disable' : 'Enable'}
                        >
                          <Icon icon={provider.enabled ? 'mdi:toggle-switch' : 'mdi:toggle-switch-off'} className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(provider)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="Edit"
                        >
                          <Icon icon="mdi:pencil" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(provider.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Icon icon="mdi:delete" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}

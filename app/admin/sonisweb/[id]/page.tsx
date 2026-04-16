'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import LoadingIndicator from '@/app/components/ui/LoadingIndicator';

interface Connection {
  id: string;
  name: string;
  base_url: string;
  api_username: string;
  api_mode: string;
  auth_flow: string;
  sync_schedule: string;
  sync_enabled: boolean;
  student_sync_enabled: boolean;
  enrollment_sync_enabled: boolean;
  grade_passback_enabled: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  connection_status: string;
  settings: Record<string, any>;
  updated_at: string;
}

interface SyncLog {
  id: string;
  sync_type: string;
  trigger_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  records_failed: number;
  error_details: any[];
}

interface FieldMapping {
  id: string;
  entity_type: string;
  sonisweb_field: string;
  lms_field: string;
  lms_table: string | null;
  transform_type: string;
  transform_config: Record<string, any>;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

type Tab = 'overview' | 'mappings' | 'logs' | 'settings';

export default function SonisWebConnectionDetailPage() {
  const params = useParams();
  const connectionId = params.id as string;

  const [connection, setConnection] = useState<Connection | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('student');
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Connection>>({});

  useEffect(() => {
    loadConnection();
  }, [connectionId]);

  useEffect(() => {
    if (activeTab === 'logs') loadSyncLogs();
    if (activeTab === 'mappings') loadFieldMappings();
  }, [activeTab, entityFilter]);

  const loadConnection = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/sonisweb/config/${connectionId}`);
      if (res.ok) {
        const data = await res.json();
        setConnection(data);
        setEditForm(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSyncLogs = async () => {
    const res = await fetch(`/api/sonisweb/sync/status?connection_id=${connectionId}&limit=20`);
    if (res.ok) setSyncLogs(await res.json());
  };

  const loadFieldMappings = async () => {
    const res = await fetch(`/api/admin/sonisweb/field-mappings?connection_id=${connectionId}&entity_type=${entityFilter}`);
    if (res.ok) setFieldMappings(await res.json());
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/sonisweb/config/${connectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        alert('Settings saved');
        loadConnection();
      } else {
        const data = await res.json();
        alert(data.error || 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6"><LoadingIndicator variant="books" text="Loading connection..." fullCenter /></div>;
  if (!connection) return <div className="p-6 text-center text-red-500">Connection not found</div>;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'mdi:information-outline' },
    { key: 'mappings', label: 'Field Mappings', icon: 'mdi:swap-horizontal' },
    { key: 'logs', label: 'Sync Logs', icon: 'mdi:history' },
    { key: 'settings', label: 'Settings', icon: 'mdi:cog' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <a href="/admin/sonisweb" className="text-gray-400 hover:text-gray-600">
          <Icon icon="mdi:arrow-left" className="text-xl" />
        </a>
        <div>
          <h1 className="text-2xl font-bold">{connection.name}</h1>
          <p className="text-gray-500 text-sm">{connection.base_url}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon icon={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold mb-3">Connection Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="font-medium">{connection.connection_status}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">API Mode</span><span>{connection.api_mode}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Auth Flow</span><span>{connection.auth_flow.replace('_', ' ')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Auto-Sync</span><span>{connection.sync_enabled ? 'Enabled' : 'Disabled'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Schedule</span><span className="font-mono text-xs">{connection.sync_schedule}</span></div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold mb-3">Sync Features</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Student Sync</span><span>{connection.student_sync_enabled ? 'Enabled' : 'Disabled'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Enrollment Sync</span><span>{connection.enrollment_sync_enabled ? 'Enabled' : 'Disabled'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Grade Passback</span><span>{connection.grade_passback_enabled ? 'Enabled' : 'Disabled'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Last Sync</span><span>{connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString() : 'Never'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Last Status</span><span>{connection.last_sync_status || 'N/A'}</span></div>
            </div>
          </div>
          {connection.grade_passback_enabled && (
            <div className="md:col-span-2">
              <a href={`/admin/sonisweb/${connectionId}/grades`}>
                <Button variant="secondary">
                  <Icon icon="mdi:file-chart" className="mr-2" />
                  Configure Grade Passback per Course
                </Button>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Field Mappings Tab */}
      {activeTab === 'mappings' && (
        <div>
          <div className="flex gap-2 mb-4">
            {['student', 'course', 'enrollment', 'grade'].map(type => (
              <button
                key={type}
                onClick={() => setEntityFilter(type)}
                className={`px-3 py-1 rounded-full text-sm ${entityFilter === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-lg border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">SonisWeb Field</th>
                  <th className="text-left px-4 py-2 font-medium">LMS Field</th>
                  <th className="text-left px-4 py-2 font-medium">Table</th>
                  <th className="text-left px-4 py-2 font-medium">Transform</th>
                  <th className="text-left px-4 py-2 font-medium">Required</th>
                  <th className="text-left px-4 py-2 font-medium">Active</th>
                </tr>
              </thead>
              <tbody>
                {fieldMappings.map(m => (
                  <tr key={m.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{m.sonisweb_field}</td>
                    <td className="px-4 py-2 font-mono text-xs">{m.lms_field}</td>
                    <td className="px-4 py-2 text-gray-500">{m.lms_table || '-'}</td>
                    <td className="px-4 py-2"><span className="px-1.5 py-0.5 rounded bg-gray-100 text-xs">{m.transform_type}</span></td>
                    <td className="px-4 py-2">{m.is_required ? <Icon icon="mdi:check" className="text-green-500" /> : '-'}</td>
                    <td className="px-4 py-2">{m.is_active ? <Icon icon="mdi:check" className="text-green-500" /> : <Icon icon="mdi:close" className="text-red-400" />}</td>
                  </tr>
                ))}
                {fieldMappings.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No mappings for this entity type</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sync Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-lg border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Time</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Trigger</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Processed</th>
                <th className="text-right px-4 py-2 font-medium">Created</th>
                <th className="text-right px-4 py-2 font-medium">Updated</th>
                <th className="text-right px-4 py-2 font-medium">Failed</th>
              </tr>
            </thead>
            <tbody>
              {syncLogs.map(log => (
                <tr key={log.id} className="border-t">
                  <td className="px-4 py-2 text-xs text-gray-500">{new Date(log.started_at).toLocaleString()}</td>
                  <td className="px-4 py-2">{log.sync_type}</td>
                  <td className="px-4 py-2 text-gray-500">{log.trigger_type}</td>
                  <td className="px-4 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      log.status === 'success' ? 'bg-green-100 text-green-700' :
                      log.status === 'running' ? 'bg-blue-100 text-blue-700' :
                      log.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{log.records_processed}</td>
                  <td className="px-4 py-2 text-right text-green-600">{log.records_created}</td>
                  <td className="px-4 py-2 text-right text-blue-600">{log.records_updated}</td>
                  <td className="px-4 py-2 text-right text-red-600">{log.records_failed}</td>
                </tr>
              ))}
              {syncLogs.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No sync history yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg border p-6 max-w-2xl">
          <h3 className="font-semibold mb-4">Connection Settings</h3>
          <div className="space-y-4">
            <Input
              label="Connection Name"
              value={editForm.name || ''}
              onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
            />
            <Input
              label="Base URL"
              value={editForm.base_url || ''}
              onChange={(e) => setEditForm(p => ({ ...p, base_url: e.target.value }))}
            />
            <Input
              label="API Username"
              value={editForm.api_username || ''}
              onChange={(e) => setEditForm(p => ({ ...p, api_username: e.target.value }))}
            />
            <Input
              label="New API Password (leave blank to keep current)"
              type="password"
              value={(editForm as any).api_password || ''}
              onChange={(e) => setEditForm(p => ({ ...p, api_password: e.target.value } as any))}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Mode</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={editForm.api_mode || 'both'}
                onChange={(e) => setEditForm(p => ({ ...p, api_mode: e.target.value }))}
              >
                <option value="both">Both (API + SQL)</option>
                <option value="soapapi">SOAP API Only</option>
                <option value="soapsql">SQL Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auth Flow</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={editForm.auth_flow || 'welcome_email'}
                onChange={(e) => setEditForm(p => ({ ...p, auth_flow: e.target.value }))}
              >
                <option value="welcome_email">Welcome Email</option>
                <option value="sso_passthrough">SSO Passthrough</option>
              </select>
            </div>
            <Input
              label="Sync Schedule (cron expression)"
              value={editForm.sync_schedule || '0 2 * * *'}
              onChange={(e) => setEditForm(p => ({ ...p, sync_schedule: e.target.value }))}
            />
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.student_sync_enabled ?? true} onChange={(e) => setEditForm(p => ({ ...p, student_sync_enabled: e.target.checked }))} />
                Student Sync
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.enrollment_sync_enabled ?? true} onChange={(e) => setEditForm(p => ({ ...p, enrollment_sync_enabled: e.target.checked }))} />
                Enrollment Sync
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.grade_passback_enabled ?? false} onChange={(e) => setEditForm(p => ({ ...p, grade_passback_enabled: e.target.checked }))} />
                Grade Passback
              </label>
            </div>
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

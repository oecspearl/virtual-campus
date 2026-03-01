'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/app/components/Button';
import { Input } from '@/app/components/Input';

interface Connection {
  id: string;
  name: string;
  base_url: string;
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
  created_at: string;
}

interface XMLImportResult {
  status: string;
  persons_processed: number;
  persons_created: number;
  persons_skipped: number;
  persons_failed: number;
  groups_processed: number;
  courses_created: number;
  courses_skipped: number;
  courses_failed: number;
  memberships_processed: number;
  enrollments_created: number;
  enrollments_skipped: number;
  enrollments_failed: number;
  instructors_assigned: number;
  errors: string[];
  datasource?: string;
}

const STATUS_COLORS: Record<string, string> = {
  connected: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  disabled: 'bg-gray-100 text-gray-500',
};

export default function SonisWebAdminPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [syncing, setSyncing] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    base_url: '',
    api_username: '',
    api_password: '',
    api_mode: 'both',
    auth_flow: 'welcome_email',
  });
  const [showXMLImport, setShowXMLImport] = useState(false);
  const [xmlImporting, setXmlImporting] = useState(false);
  const [xmlResult, setXmlResult] = useState<XMLImportResult | null>(null);
  const [xmlOptions, setXmlOptions] = useState({
    createUsers: true,
    createCourses: true,
    createEnrollments: true,
    publishCourses: false,
    defaultModality: 'online',
    authFlow: 'welcome_email',
  });
  const xmlFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/sonisweb/config');
      if (res.ok) setConnections(await res.json());
    } catch (err) {
      console.error('Failed to load connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/sonisweb/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddForm(false);
        setFormData({ name: '', base_url: '', api_username: '', api_password: '', api_mode: 'both', auth_flow: 'welcome_email' });
        loadConnections();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create connection');
      }
    } catch (err) {
      console.error('Create error:', err);
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const res = await fetch(`/api/admin/sonisweb/config/${id}/test`, { method: 'POST' });
      const data = await res.json();
      alert(data.success ? 'Connection successful!' : `Connection failed: ${data.error}`);
      loadConnections();
    } catch (err) {
      alert('Test failed');
    } finally {
      setTesting(null);
    }
  };

  const handleSync = async (id: string, type: 'students' | 'enrollments' | 'grades') => {
    setSyncing(prev => ({ ...prev, [id]: type }));
    try {
      const endpoint = type === 'grades' ? '/api/sonisweb/sync/grades' : `/api/sonisweb/sync/${type}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: id }),
      });
      const data = await res.json();
      alert(`Sync ${data.status}: ${data.records_created} created, ${data.records_updated} updated, ${data.records_failed} failed`);
      loadConnections();
    } catch (err) {
      alert('Sync failed');
    } finally {
      setSyncing(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this SonisWeb connection? This will remove all sync history and mappings.')) return;
    try {
      await fetch(`/api/admin/sonisweb/config/${id}`, { method: 'DELETE' });
      loadConnections();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleToggleSync = async (id: string, enabled: boolean) => {
    await fetch(`/api/admin/sonisweb/config/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sync_enabled: enabled }),
    });
    loadConnections();
  };

  const handleXMLImport = async () => {
    const file = xmlFileRef.current?.files?.[0];
    if (!file) {
      alert('Please select an XML file');
      return;
    }

    setXmlImporting(true);
    setXmlResult(null);
    try {
      const fd = new FormData();
      fd.append('xml', file);
      fd.append('createUsers', String(xmlOptions.createUsers));
      fd.append('createCourses', String(xmlOptions.createCourses));
      fd.append('createEnrollments', String(xmlOptions.createEnrollments));
      fd.append('publishCourses', String(xmlOptions.publishCourses));
      fd.append('defaultModality', xmlOptions.defaultModality);
      fd.append('authFlow', xmlOptions.authFlow);

      const res = await fetch('/api/sonisweb/import/xml', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      setXmlResult(data);
    } catch (err) {
      setXmlResult({
        status: 'failed',
        persons_processed: 0, persons_created: 0, persons_skipped: 0, persons_failed: 0,
        groups_processed: 0, courses_created: 0, courses_skipped: 0, courses_failed: 0,
        memberships_processed: 0, enrollments_created: 0, enrollments_skipped: 0, enrollments_failed: 0,
        instructors_assigned: 0,
        errors: ['Network error: Could not reach the server'],
      });
    } finally {
      setXmlImporting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">SonisWeb SIS Integration</h1>
          <p className="text-gray-500 mt-1">Connect and sync with SonisWeb Student Information System instances</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setShowXMLImport(!showXMLImport); setShowAddForm(false); }}>
            <Icon icon="mdi:file-xml-box" className="mr-2" />
            XML Import
          </Button>
          <Button onClick={() => { setShowAddForm(!showAddForm); setShowXMLImport(false); }}>
            <Icon icon="mdi:plus" className="mr-2" />
            Add Connection
          </Button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">New SonisWeb Connection</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Connection Name"
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g., OECS SonisWeb Production"
              required
            />
            <Input
              label="SonisWeb Base URL"
              value={formData.base_url}
              onChange={(e) => setFormData(p => ({ ...p, base_url: e.target.value }))}
              placeholder="https://sonis.example.edu/cgi-bin"
              required
            />
            <Input
              label="API Username"
              value={formData.api_username}
              onChange={(e) => setFormData(p => ({ ...p, api_username: e.target.value }))}
              required
            />
            <Input
              label="API Password"
              type="password"
              value={formData.api_password}
              onChange={(e) => setFormData(p => ({ ...p, api_password: e.target.value }))}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Mode</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={formData.api_mode}
                onChange={(e) => setFormData(p => ({ ...p, api_mode: e.target.value }))}
              >
                <option value="both">Both (API + SQL)</option>
                <option value="soapapi">SOAP API Only (soapapi.cfc)</option>
                <option value="soapsql">SQL Only (soapsql.cfc)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auth Flow</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={formData.auth_flow}
                onChange={(e) => setFormData(p => ({ ...p, auth_flow: e.target.value }))}
              >
                <option value="welcome_email">Welcome Email (temp password)</option>
                <option value="sso_passthrough">SSO Passthrough (SonisWeb login)</option>
              </select>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Create Connection</Button>
              <Button variant="secondary" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {showXMLImport && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Icon icon="mdi:file-xml-box" className="text-2xl text-violet-500" />
            <div>
              <h2 className="text-lg font-semibold">Import from IMS Enterprise XML</h2>
              <p className="text-sm text-gray-500">Upload an XML file exported from SonisWeb to create users, courses, and enrollments</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">XML File</label>
              <input
                ref={xmlFileRef}
                type="file"
                accept=".xml"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
              />
              <p className="text-xs text-gray-400 mt-1">Supports IMS Enterprise XML format (up to 50MB). This is the format used by SonisWeb for Moodle/LMS exports.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={xmlOptions.createUsers}
                  onChange={(e) => setXmlOptions(p => ({ ...p, createUsers: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Create Users</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={xmlOptions.createCourses}
                  onChange={(e) => setXmlOptions(p => ({ ...p, createCourses: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Create Courses</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={xmlOptions.createEnrollments}
                  onChange={(e) => setXmlOptions(p => ({ ...p, createEnrollments: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Create Enrollments</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={xmlOptions.publishCourses}
                  onChange={(e) => setXmlOptions(p => ({ ...p, publishCourses: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Publish Courses Immediately</span>
              </label>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Course Modality</label>
                <select
                  className="w-full border rounded-lg px-3 py-1.5 text-sm"
                  value={xmlOptions.defaultModality}
                  onChange={(e) => setXmlOptions(p => ({ ...p, defaultModality: e.target.value }))}
                >
                  <option value="online">Online</option>
                  <option value="blended">Blended</option>
                  <option value="in_person">In Person</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">User Auth Flow</label>
                <select
                  className="w-full border rounded-lg px-3 py-1.5 text-sm"
                  value={xmlOptions.authFlow}
                  onChange={(e) => setXmlOptions(p => ({ ...p, authFlow: e.target.value }))}
                >
                  <option value="welcome_email">Welcome Email (temp password)</option>
                  <option value="sso_passthrough">SSO Passthrough</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleXMLImport} disabled={xmlImporting}>
                {xmlImporting ? (
                  <>
                    <Icon icon="mdi:loading" className="mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:upload" className="mr-2" />
                    Import XML
                  </>
                )}
              </Button>
              <Button variant="secondary" onClick={() => { setShowXMLImport(false); setXmlResult(null); }}>Cancel</Button>
            </div>
          </div>

          {xmlResult && (
            <div className={`mt-4 p-4 rounded-lg border ${xmlResult.status === 'success' ? 'bg-green-50 border-green-200' : xmlResult.status === 'partial' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Icon
                  icon={xmlResult.status === 'success' ? 'mdi:check-circle' : xmlResult.status === 'partial' ? 'mdi:alert-circle' : 'mdi:close-circle'}
                  className={`text-xl ${xmlResult.status === 'success' ? 'text-green-600' : xmlResult.status === 'partial' ? 'text-yellow-600' : 'text-red-600'}`}
                />
                <span className="font-semibold">
                  Import {xmlResult.status === 'success' ? 'Complete' : xmlResult.status === 'partial' ? 'Partially Complete' : 'Failed'}
                </span>
                {xmlResult.datasource && (
                  <span className="text-xs text-gray-500 ml-2">Source: {xmlResult.datasource}</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-700 mb-1">Users</div>
                  <div className="space-y-0.5 text-gray-600">
                    <div>{xmlResult.persons_processed} processed</div>
                    <div className="text-green-600">{xmlResult.persons_created} created</div>
                    <div className="text-gray-400">{xmlResult.persons_skipped} skipped (existing)</div>
                    {xmlResult.persons_failed > 0 && <div className="text-red-600">{xmlResult.persons_failed} failed</div>}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700 mb-1">Courses</div>
                  <div className="space-y-0.5 text-gray-600">
                    <div>{xmlResult.groups_processed} processed</div>
                    <div className="text-green-600">{xmlResult.courses_created} created</div>
                    <div className="text-gray-400">{xmlResult.courses_skipped} skipped (existing)</div>
                    {xmlResult.courses_failed > 0 && <div className="text-red-600">{xmlResult.courses_failed} failed</div>}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700 mb-1">Enrollments</div>
                  <div className="space-y-0.5 text-gray-600">
                    <div>{xmlResult.memberships_processed} processed</div>
                    <div className="text-green-600">{xmlResult.enrollments_created} enrolled</div>
                    <div className="text-blue-600">{xmlResult.instructors_assigned} instructors assigned</div>
                    <div className="text-gray-400">{xmlResult.enrollments_skipped} skipped</div>
                    {xmlResult.enrollments_failed > 0 && <div className="text-red-600">{xmlResult.enrollments_failed} failed</div>}
                  </div>
                </div>
              </div>
              {xmlResult.errors.length > 0 && (
                <details className="mt-3">
                  <summary className="text-sm text-red-600 cursor-pointer font-medium">
                    {xmlResult.errors.length} error{xmlResult.errors.length > 1 ? 's' : ''} (click to expand)
                  </summary>
                  <div className="mt-2 max-h-40 overflow-y-auto text-xs text-red-700 bg-red-100 rounded p-2 space-y-1">
                    {xmlResult.errors.map((err, i) => <div key={i}>{err}</div>)}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading connections...</div>
      ) : connections.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Icon icon="mdi:database-off" className="text-4xl text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No SonisWeb connections configured</p>
          <p className="text-gray-400 text-sm mt-1">Click &quot;Add Connection&quot; to connect to a SonisWeb instance</p>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((conn) => (
            <div key={conn.id} className="bg-white rounded-lg border p-5">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{conn.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[conn.connection_status] || 'bg-gray-100'}`}>
                      {conn.connection_status}
                    </span>
                    {conn.sync_enabled && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        Auto-sync
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mt-1">{conn.base_url}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>Mode: {conn.api_mode}</span>
                    <span>Auth: {conn.auth_flow.replace('_', ' ')}</span>
                    {conn.last_sync_at && (
                      <span>Last sync: {new Date(conn.last_sync_at).toLocaleString()}</span>
                    )}
                    {conn.last_sync_status && (
                      <span className={conn.last_sync_status === 'success' ? 'text-green-500' : conn.last_sync_status === 'failed' ? 'text-red-500' : 'text-yellow-500'}>
                        {conn.last_sync_status}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleSync(conn.id, !conn.sync_enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${conn.sync_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                    title={conn.sync_enabled ? 'Disable auto-sync' : 'Enable auto-sync'}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${conn.sync_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mt-4 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleTest(conn.id)}
                  disabled={testing === conn.id}
                >
                  <Icon icon={testing === conn.id ? 'mdi:loading' : 'mdi:connection'} className={`mr-1 ${testing === conn.id ? 'animate-spin' : ''}`} />
                  Test
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSync(conn.id, 'students')}
                  disabled={!!syncing[conn.id]}
                >
                  <Icon icon={syncing[conn.id] === 'students' ? 'mdi:loading' : 'mdi:account-sync'} className={`mr-1 ${syncing[conn.id] === 'students' ? 'animate-spin' : ''}`} />
                  Sync Students
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSync(conn.id, 'enrollments')}
                  disabled={!!syncing[conn.id]}
                >
                  <Icon icon={syncing[conn.id] === 'enrollments' ? 'mdi:loading' : 'mdi:school'} className={`mr-1 ${syncing[conn.id] === 'enrollments' ? 'animate-spin' : ''}`} />
                  Sync Enrollments
                </Button>
                {conn.grade_passback_enabled && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSync(conn.id, 'grades')}
                    disabled={!!syncing[conn.id]}
                  >
                    <Icon icon={syncing[conn.id] === 'grades' ? 'mdi:loading' : 'mdi:file-upload'} className={`mr-1 ${syncing[conn.id] === 'grades' ? 'animate-spin' : ''}`} />
                    Push Grades
                  </Button>
                )}
                <a href={`/admin/sonisweb/${conn.id}`}>
                  <Button variant="secondary" size="sm">
                    <Icon icon="mdi:cog" className="mr-1" />
                    Settings
                  </Button>
                </a>
                <Button variant="secondary" size="sm" onClick={() => handleDelete(conn.id)}>
                  <Icon icon="mdi:delete" className="mr-1 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import { Icon } from "@iconify/react";
import RoleGuard from "@/app/components/RoleGuard";

interface ProctoringService {
  id: string;
  name: string;
  display_name: string;
  service_type: "browser_lock" | "remote_proctoring" | "ai_proctoring" | "hybrid";
  api_endpoint?: string;
  api_key?: string;
  has_api_key?: boolean;
  configuration: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const SERVICE_TYPES = [
  { value: "browser_lock", label: "Browser Lock", description: "Locks browser during exam (prevents copy/paste, new tabs, etc.)" },
  { value: "remote_proctoring", label: "Remote Proctoring", description: "Live or recorded proctoring with human reviewers" },
  { value: "ai_proctoring", label: "AI Proctoring", description: "Automated monitoring using AI" },
  { value: "hybrid", label: "Hybrid", description: "Combination of browser lock and remote/AI proctoring" },
];

const PRESET_SERVICES = [
  { name: "respondus", display_name: "Respondus LockDown Browser", service_type: "browser_lock" as const },
  { name: "proctoru", display_name: "ProctorU", service_type: "remote_proctoring" as const },
  { name: "proctorexam", display_name: "ProctorExam", service_type: "hybrid" as const },
  { name: "examity", display_name: "Examity", service_type: "remote_proctoring" as const },
  { name: "honorlock", display_name: "Honorlock", service_type: "ai_proctoring" as const },
  { name: "proctorio", display_name: "Proctorio", service_type: "ai_proctoring" as const },
];

export default function ProctoringServicesPage() {
  const [services, setServices] = React.useState<ProctoringService[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [editingService, setEditingService] = React.useState<ProctoringService | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Form state
  const [formData, setFormData] = React.useState({
    name: "",
    display_name: "",
    service_type: "browser_lock" as string,
    api_endpoint: "",
    api_key: "",
    is_active: true,
    configuration: {} as Record<string, any>,
  });

  React.useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/proctoring-services", {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error("Failed to load services");
      }
      const data = await response.json();
      setServices(data.services || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load services");
    } finally {
      setLoading(false);
    }
  }

  function openAddModal(preset?: typeof PRESET_SERVICES[0]) {
    setEditingService(null);
    setFormData({
      name: preset?.name || "",
      display_name: preset?.display_name || "",
      service_type: preset?.service_type || "browser_lock",
      api_endpoint: "",
      api_key: "",
      is_active: true,
      configuration: {},
    });
    setShowModal(true);
  }

  function openEditModal(service: ProctoringService) {
    setEditingService(service);
    setFormData({
      name: service.name,
      display_name: service.display_name,
      service_type: service.service_type,
      api_endpoint: service.api_endpoint || "",
      api_key: service.api_key || "",
      is_active: service.is_active,
      configuration: service.configuration || {},
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = "/api/admin/proctoring-services";
      const method = editingService ? "PUT" : "POST";
      const body = editingService
        ? { id: editingService.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save service");
      }

      setShowModal(false);
      loadServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save service");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(service: ProctoringService) {
    if (!confirm(`Are you sure you want to delete "${service.display_name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/proctoring-services?id=${service.id}`, {
        method: "DELETE",
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error("Failed to delete service");
      }

      loadServices();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete service");
    }
  }

  async function toggleServiceActive(service: ProctoringService) {
    try {
      const response = await fetch("/api/admin/proctoring-services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ id: service.id, is_active: !service.is_active }),
      });

      if (!response.ok) {
        throw new Error("Failed to update service");
      }

      loadServices();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update service");
    }
  }

  function getServiceTypeIcon(type: string) {
    switch (type) {
      case "browser_lock":
        return "material-symbols:lock";
      case "remote_proctoring":
        return "material-symbols:video-camera-front";
      case "ai_proctoring":
        return "material-symbols:smart-toy";
      case "hybrid":
        return "material-symbols:layers";
      default:
        return "material-symbols:extension";
    }
  }

  function getServiceTypeColor(type: string) {
    switch (type) {
      case "browser_lock":
        return "text-blue-600 bg-blue-100";
      case "remote_proctoring":
        return "text-purple-600 bg-purple-100";
      case "ai_proctoring":
        return "text-green-600 bg-green-100";
      case "hybrid":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  }

  return (
    <RoleGuard roles={["admin", "super_admin"]}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Icon icon="material-symbols:security" className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Proctoring Services</h1>
                  <p className="text-sm text-gray-600">Configure third-party proctoring integrations</p>
                </div>
              </div>
              <button
                onClick={() => openAddModal()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Icon icon="material-symbols:add" className="w-5 h-5" />
                Add Service
              </button>
            </div>
          </div>

          {/* Quick Add Presets */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Add Popular Services</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {PRESET_SERVICES.map((preset) => {
                const isConfigured = services.some(s => s.name === preset.name);
                return (
                  <button
                    key={preset.name}
                    onClick={() => !isConfigured && openAddModal(preset)}
                    disabled={isConfigured}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      isConfigured
                        ? "bg-gray-50 border-gray-200 cursor-not-allowed opacity-60"
                        : "bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer"
                    }`}
                  >
                    <Icon
                      icon={getServiceTypeIcon(preset.service_type)}
                      className={`w-6 h-6 mx-auto mb-2 ${isConfigured ? "text-gray-400" : "text-indigo-600"}`}
                    />
                    <div className="text-sm font-medium text-gray-900">{preset.display_name}</div>
                    {isConfigured && (
                      <span className="text-xs text-green-600 flex items-center justify-center gap-1 mt-1">
                        <Icon icon="material-symbols:check-circle" className="w-3 h-3" />
                        Configured
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <Icon icon="material-symbols:error" className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* Services List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Configured Services</h2>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <Icon icon="material-symbols:progress-activity" className="w-8 h-8 text-gray-400 mx-auto animate-spin" />
                <p className="text-gray-500 mt-2">Loading services...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="p-12 text-center">
                <Icon icon="material-symbols:extension-off" className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No proctoring services configured</p>
                <p className="text-sm text-gray-400">Click "Add Service" or use the quick add options above</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {services.map((service) => (
                  <div key={service.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getServiceTypeColor(service.service_type)}`}>
                          <Icon icon={getServiceTypeIcon(service.service_type)} className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-gray-900">{service.display_name}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${service.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                              {service.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {SERVICE_TYPES.find(t => t.value === service.service_type)?.label || service.service_type}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            {service.api_endpoint && (
                              <span className="flex items-center gap-1">
                                <Icon icon="material-symbols:link" className="w-3 h-3" />
                                Endpoint configured
                              </span>
                            )}
                            {service.has_api_key && (
                              <span className="flex items-center gap-1">
                                <Icon icon="material-symbols:key" className="w-3 h-3" />
                                API key set
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleServiceActive(service)}
                          className={`p-2 rounded-lg transition-colors ${
                            service.is_active
                              ? "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                              : "text-green-600 hover:bg-green-50"
                          }`}
                          title={service.is_active ? "Deactivate" : "Activate"}
                        >
                          <Icon icon={service.is_active ? "material-symbols:toggle-on" : "material-symbols:toggle-off"} className="w-6 h-6" />
                        </button>
                        <button
                          onClick={() => openEditModal(service)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Icon icon="material-symbols:edit" className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(service)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Icon icon="material-symbols:delete" className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Help Section */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <Icon icon="material-symbols:info" className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Integration Instructions</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>1. Obtain API credentials from your proctoring service provider</li>
                  <li>2. Add the service using the form above with the API endpoint and key</li>
                  <li>3. The service will be available for instructors to enable on quizzes</li>
                  <li>4. For LTI-based services (like Respondus), also register as an LTI tool in Settings {">"} LTI Tools</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingService ? "Edit Service" : "Add Proctoring Service"}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <Icon icon="material-symbols:close" className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Name (internal identifier)
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., respondus"
                    required
                    disabled={!!editingService}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Respondus LockDown Browser"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Type
                  </label>
                  <select
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {SERVICE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {SERVICE_TYPES.find(t => t.value === formData.service_type)?.description}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Endpoint URL
                  </label>
                  <input
                    type="url"
                    value={formData.api_endpoint}
                    onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="https://api.proctoring-service.com/v1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key / Secret
                  </label>
                  <input
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={editingService?.has_api_key ? "Leave blank to keep existing key" : "Enter API key"}
                  />
                  {editingService?.has_api_key && (
                    <p className="text-xs text-gray-500 mt-1">API key is already set. Enter a new value to replace it.</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Service is active and available for use
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving && <Icon icon="material-symbols:progress-activity" className="w-4 h-4 animate-spin" />}
                    {editingService ? "Save Changes" : "Add Service"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

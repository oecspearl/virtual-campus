"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

interface Category {
  name: string;
  weight: number;
  color: string;
}

interface GradebookSettings {
  grading_scheme: string;
  total_points: number;
  categories: Category[];
  drop_lowest?: { [category: string]: number };
  show_points_to_students?: boolean;
  show_percentages_to_students?: boolean;
  show_letter_grades?: boolean;
}

const defaultSettings: GradebookSettings = {
  grading_scheme: "points",
  total_points: 1000,
  categories: [
    { name: "Quizzes", weight: 0.3, color: "#3B82F6" },
    { name: "Assignments", weight: 0.4, color: "#10B981" },
    { name: "Exams", weight: 0.3, color: "#F59E0B" }
  ],
  drop_lowest: {},
  show_points_to_students: true,
  show_percentages_to_students: true,
  show_letter_grades: false
};

export default function GradebookSetup() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [settings, setSettings] = useState<GradebookSettings>(defaultSettings);
  const [newCategory, setNewCategory] = useState({ name: "", weight: 0, color: "#6B7280" });

  // Load existing settings on mount
  useEffect(() => {
    async function loadSettings() {
      if (!courseId) return;

      try {
        const response = await fetch(`/api/courses/${courseId}/gradebook/settings`);
        if (response.ok) {
          const data = await response.json();
          if (data.settings) {
            setSettings({
              ...defaultSettings,
              ...data.settings,
              categories: data.settings.categories || defaultSettings.categories
            });
          }
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setInitialLoading(false);
      }
    }

    loadSettings();
  }, [courseId]);

  async function saveSettings() {
    try {
      setLoading(true);
      setSaveSuccess(false);
      const response = await fetch(`/api/courses/${courseId}/gradebook/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save settings");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error saving settings:", error);
      alert(error.message || "Failed to save gradebook settings");
    } finally {
      setLoading(false);
    }
  }

  function goToGradebook() {
    router.push(`/courses/${courseId}/gradebook`);
  }

  function addCategory() {
    if (newCategory.name && newCategory.weight > 0) {
      setSettings(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory]
      }));
      setNewCategory({ name: "", weight: 0, color: "#6B7280" });
    }
  }

  function removeCategory(index: number) {
    setSettings(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index)
    }));
  }

  function updateCategory(index: number, field: string, value: any) {
    setSettings(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) => 
        i === index ? { ...cat, [field]: value } : cat
      )
    }));
  }

  const totalWeight = settings.categories.reduce((sum, cat) => sum + cat.weight, 0);

  if (initialLoading) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading gradebook settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gradebook Setup</h1>
        <p className="text-gray-600">Configure how grades are calculated and displayed for this course</p>
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-700">Settings saved successfully!</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Grading Scheme */}
        <div className="bg-white p-6 border rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Grading Scheme</h2>
          <p className="text-sm text-gray-500 mb-4">
            Choose how grades will be calculated and displayed to students. Points-based grading shows raw scores,
            percentage-based shows grades as percentages, and letter grades convert scores to A-F scale.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grading System
              </label>
              <select
                value={settings.grading_scheme}
                onChange={(e) => setSettings(prev => ({ ...prev, grading_scheme: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="points">Points - Show raw point totals (e.g., 85/100)</option>
                <option value="percentage">Percentage - Show as percentages (e.g., 85%)</option>
                <option value="letter">Letter Grades - Convert to A-F scale</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Points for Course
              </label>
              <p className="text-xs text-gray-500 mb-2">
                This is the maximum number of points a student can earn across all graded items in this course.
              </p>
              <input
                type="number"
                value={settings.total_points}
                onChange={(e) => setSettings(prev => ({ ...prev, total_points: Number(e.target.value) }))}
                className="w-full md:w-48 border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Display Options */}
        <div className="bg-white p-6 border rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Display Options</h2>
          <p className="text-sm text-gray-500 mb-4">
            Control what information students can see in their gradebook view.
          </p>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.show_points_to_students ?? true}
                onChange={(e) => setSettings(prev => ({ ...prev, show_points_to_students: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Show points to students (e.g., 85/100)</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.show_percentages_to_students ?? true}
                onChange={(e) => setSettings(prev => ({ ...prev, show_percentages_to_students: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Show percentages to students</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.show_letter_grades ?? false}
                onChange={(e) => setSettings(prev => ({ ...prev, show_letter_grades: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Show letter grades to students</span>
            </label>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white p-6 border rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Grade Categories</h2>
          <p className="text-sm text-gray-500 mb-4">
            Organize graded items into categories and assign weights to each. The weight determines
            what percentage of the final grade each category contributes. All weights must add up to 1.0 (100%).
          </p>

          <div className="space-y-4">
            {/* Category header */}
            <div className="hidden md:flex items-center space-x-4 px-3 text-xs font-medium text-gray-500 uppercase">
              <span className="flex-1">Category Name</span>
              <span className="w-24 text-center">Weight (0-1)</span>
              <span className="w-16 text-center">Color</span>
              <span className="w-20"></span>
            </div>

            {settings.categories.map((category, index) => (
              <div key={index} className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 p-3 border rounded bg-gray-50">
                <input
                  type="text"
                  value={category.name}
                  onChange={(e) => updateCategory(index, "name", e.target.value)}
                  className="w-full md:flex-1 border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Category name"
                />
                <div className="flex items-center space-x-2 w-full md:w-auto">
                  <input
                    type="number"
                    value={category.weight}
                    onChange={(e) => updateCategory(index, "weight", Number(e.target.value))}
                    className="w-24 border rounded px-3 py-2 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    max="1"
                    step="0.05"
                  />
                  <span className="text-sm text-gray-500">({(category.weight * 100).toFixed(0)}%)</span>
                </div>
                <input
                  type="color"
                  value={category.color}
                  onChange={(e) => updateCategory(index, "color", e.target.value)}
                  className="w-12 h-10 border rounded cursor-pointer"
                  title="Category color"
                />
                <button
                  onClick={() => removeCategory(index)}
                  className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}

            {/* Add new category */}
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 p-3 border-2 border-dashed border-gray-300 rounded">
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                className="w-full md:flex-1 border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="New category name (e.g., Participation)"
              />
              <div className="flex items-center space-x-2 w-full md:w-auto">
                <input
                  type="number"
                  value={newCategory.weight}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, weight: Number(e.target.value) }))}
                  className="w-24 border rounded px-3 py-2 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="1"
                  step="0.05"
                  placeholder="0.1"
                />
                <span className="text-sm text-gray-500">({(newCategory.weight * 100).toFixed(0)}%)</span>
              </div>
              <input
                type="color"
                value={newCategory.color}
                onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                className="w-12 h-10 border rounded cursor-pointer"
                title="Category color"
              />
              <button
                onClick={addCategory}
                disabled={!newCategory.name || newCategory.weight <= 0}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Category
              </button>
            </div>
          </div>

          {/* Weight validation */}
          <div className={`mt-4 p-3 rounded flex items-center ${
            Math.abs(totalWeight - 1) < 0.001
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            {Math.abs(totalWeight - 1) < 0.001 ? (
              <>
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-green-700">Total weight: {(totalWeight * 100).toFixed(0)}% - Perfect!</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm text-yellow-800">
                  Total weight: {(totalWeight * 100).toFixed(0)}% - Should equal 100%
                </span>
              </>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 p-6 border border-blue-200 rounded-lg">
          <h3 className="text-md font-semibold text-blue-900 mb-2">How Grade Weighting Works</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Each category weight represents its contribution to the final grade (e.g., 0.3 = 30%)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Within each category, all items are averaged before applying the category weight</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Example: If Quizzes weight is 0.3 and a student scores 80% average on quizzes, that contributes 24% to their final grade</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={goToGradebook}
            className="px-4 py-2 border border-blue-300 rounded text-blue-700 hover:bg-blue-50 transition-colors"
          >
            Go to Gradebook
          </button>
          <button
            onClick={saveSettings}
            disabled={loading || Math.abs(totalWeight - 1) >= 0.001}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

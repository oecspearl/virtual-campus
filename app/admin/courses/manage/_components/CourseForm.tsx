'use client';

import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import dynamic from 'next/dynamic';
import CourseFormatSelector, { type CourseFormat } from '@/app/components/course/CourseFormatSelector';

const TextEditor = dynamic(() => import('@/app/components/editor/TextEditor'), {
  ssr: false,
  loading: () => <div className="h-[200px] border border-gray-300 rounded-md animate-pulse bg-gray-100" />,
});

export interface CourseFormValues {
  title: string;
  description: string;
  thumbnail: string;
  grade_level: string;
  subject_area: string;
  difficulty: string;
  modality: string;
  estimated_duration: string;
  syllabus: string;
  published: boolean;
  featured: boolean;
  course_format: CourseFormat;
}

export const EMPTY_COURSE_FORM: CourseFormValues = {
  title: '',
  description: '',
  thumbnail: '',
  grade_level: '',
  subject_area: '',
  difficulty: 'beginner',
  modality: 'self_paced',
  estimated_duration: '',
  syllabus: '',
  published: false,
  featured: false,
  course_format: 'lessons',
};

interface CourseFormProps {
  values: CourseFormValues;
  onChange: (values: CourseFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  submitIcon?: string;
  loading?: boolean;
}

export default function CourseForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  submitIcon = 'material-symbols:check',
  loading,
}: CourseFormProps) {
  const set = (field: keyof CourseFormValues, value: any) =>
    onChange({ ...values, [field]: value });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Course Title <span className="text-red-500">*</span>
          </label>
          <Input
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g., Introduction to Mathematics"
            required
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject Area <span className="text-red-500">*</span>
          </label>
          <Input
            value={values.subject_area}
            onChange={(e) => set('subject_area', e.target.value)}
            placeholder="e.g., Mathematics, Science, Language Arts"
            required
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Grade Level <span className="text-red-500">*</span>
          </label>
          <Input
            value={values.grade_level}
            onChange={(e) => set('grade_level', e.target.value)}
            placeholder="e.g., Grade 9-12, University, Professional"
            required
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
          <select
            value={values.difficulty}
            onChange={(e) => set('difficulty', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-oecs-lime-green"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Modality</label>
          <select
            value={values.modality}
            onChange={(e) => set('modality', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-oecs-lime-green"
          >
            <option value="self_paced">Self-paced</option>
            <option value="blended">Blended</option>
            <option value="instructor_led">Instructor-led</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration</label>
          <Input
            value={values.estimated_duration}
            onChange={(e) => set('estimated_duration', e.target.value)}
            placeholder="e.g., 4 weeks, 20 hours"
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
          <Input
            value={values.thumbnail}
            onChange={(e) => set('thumbnail', e.target.value)}
            placeholder="https://example.com/image.jpg"
            type="url"
            className="w-full"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Course Format</label>
          <CourseFormatSelector
            currentFormat={values.course_format}
            onFormatChange={(format) => set('course_format', format)}
            saving={loading}
          />
        </div>
        <div className="flex flex-col justify-center gap-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={values.published}
              onChange={(e) => set('published', e.target.checked)}
              className="h-4 w-4 text-oecs-lime-green focus:ring-oecs-lime-green border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">Publish immediately</label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={values.featured}
              onChange={(e) => set('featured', e.target.checked)}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900 flex items-center gap-1">
              <Icon icon="material-symbols:star" className="w-4 h-4 text-orange-500" />
              Featured (Homepage)
            </label>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <TextEditor
          value={values.description}
          onChange={(html: string) => set('description', html)}
          placeholder="Provide a brief overview of what students will learn..."
          height={200}
          showFullscreenButton={false}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Syllabus</label>
        <TextEditor
          value={values.syllabus}
          onChange={(html: string) => set('syllabus', html)}
          placeholder="Outline of topics, modules, or weekly schedule..."
          height={250}
          showFullscreenButton={false}
        />
      </div>

      <div className="flex gap-4 pt-4 border-t border-gray-200">
        <Button
          type="submit"
          disabled={loading}
          className="bg-oecs-lime-green hover:bg-oecs-lime-green-dark flex items-center gap-2"
        >
          <Icon icon={submitIcon} className="w-5 h-5" />
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex items-center gap-2">
          <Icon icon="material-symbols:close" className="w-5 h-5" />
          Cancel
        </Button>
      </div>
    </form>
  );
}

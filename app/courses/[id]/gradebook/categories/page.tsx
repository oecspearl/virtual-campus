'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import RoleGuard from '@/app/components/RoleGuard';
import Breadcrumb from '@/app/components/ui/Breadcrumb';

type Aggregation =
  | 'mean'
  | 'weighted_mean'
  | 'simple_weighted_mean'
  | 'sum'
  | 'max'
  | 'min'
  | 'median';

interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  aggregation: Aggregation;
  drop_lowest: number;
  drop_highest: number;
  keep_highest: number | null;
  weight: number | null;
  extra_credit: boolean;
  hidden: boolean;
  sort_order: number;
  display_color: string | null;
}

const COLOR_PRESETS = [
  null,
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#64748B', // slate
];

function ColorSwatchPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {COLOR_PRESETS.map((preset, i) => {
        const isActive = (value ?? null) === (preset ?? null);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(preset)}
            title={preset ?? 'No colour (use scale-driven tier)'}
            aria-label={preset ?? 'No colour'}
            className={`w-5 h-5 rounded-full border ${
              isActive ? 'ring-2 ring-offset-1 ring-blue-500' : 'border-gray-200'
            } ${preset ? '' : 'bg-white border-dashed'}`}
            style={preset ? { backgroundColor: preset } : undefined}
          >
            {preset === null && <span className="text-[10px] text-slate-400">∅</span>}
          </button>
        );
      })}
    </div>
  );
}

interface LetterBand {
  letter: string;
  min_percentage: number;
}

interface GradeItem {
  id: string;
  title: string;
  type: string;
  category: string | null;
  category_id: string | null;
  points: number;
  weight: number;
  extra_credit: boolean;
  hidden: boolean;
  locked: boolean;
  sort_order: number;
}

const AGGREGATIONS: { value: Aggregation; label: string; hint: string }[] = [
  { value: 'weighted_mean', label: 'Weighted mean', hint: 'Average weighted by per-child weight' },
  { value: 'mean', label: 'Mean', hint: 'Unweighted average of child percentages' },
  { value: 'simple_weighted_mean', label: 'Simple weighted mean', hint: 'Weighted by max points' },
  { value: 'sum', label: 'Sum (natural)', hint: 'Total points / total max' },
  { value: 'max', label: 'Max', hint: 'Best score wins' },
  { value: 'min', label: 'Min', hint: 'Worst score wins' },
  { value: 'median', label: 'Median', hint: '50th percentile' },
];

const DEFAULT_NEW_CATEGORY = {
  name: '',
  parent_id: null as string | null,
  aggregation: 'weighted_mean' as Aggregation,
  drop_lowest: 0,
  drop_highest: 0,
  keep_highest: null as number | null,
  weight: null as number | null,
  extra_credit: false,
  hidden: false,
  sort_order: 0,
  display_color: null as string | null,
};

function GradebookCategoriesPageInner() {
  const router = useRouter();
  const { id: courseId } = useParams<{ id: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [scale, setScale] = useState<LetterBand[]>([]);
  const [items, setItems] = useState<GradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ ...DEFAULT_NEW_CATEGORY });
  // Items mover state
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [moveTargetId, setMoveTargetId] = useState<string>('');

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [catRes, letterRes, itemsRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/gradebook/categories`, { cache: 'no-store' }),
        fetch(`/api/courses/${courseId}/gradebook/letter-scale`, { cache: 'no-store' }),
        fetch(`/api/courses/${courseId}/gradebook/items`, { cache: 'no-store' }),
      ]);
      if (!catRes.ok) throw new Error('Failed to load categories');
      if (!letterRes.ok) throw new Error('Failed to load letter scale');
      if (!itemsRes.ok) throw new Error('Failed to load grade items');
      const catData = await catRes.json();
      const letterData = await letterRes.json();
      const itemsData = await itemsRes.json();
      setCategories(Array.isArray(catData.categories) ? catData.categories : []);
      setScale(Array.isArray(letterData.scale) ? letterData.scale : []);
      const list: GradeItem[] = Array.isArray(itemsData.items)
        ? itemsData.items
        : Array.isArray(itemsData.gradeItems)
        ? itemsData.gradeItems
        : Array.isArray(itemsData.grade_items)
        ? itemsData.grade_items
        : [];
      setItems(list);
      setSelectedItemIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load gradebook');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const flash = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 2500);
  };

  const tree = useMemo(() => {
    const roots = categories.filter((c) => c.parent_id === null);
    const childrenOf = (id: string) =>
      categories.filter((c) => c.parent_id === id).sort((a, b) => a.sort_order - b.sort_order);
    return { roots, childrenOf };
  }, [categories]);

  // ─── Mutators ──────────────────────────────────────────────────────────

  const createCategory = async () => {
    if (!newCategory.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/courses/${courseId}/gradebook/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to create category');
      }
      setNewCategory({ ...DEFAULT_NEW_CATEGORY });
      flash('Category created');
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditingDraft({ ...c });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingDraft(null);
  };

  const saveEdit = async () => {
    if (!editingDraft) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(
        `/api/courses/${courseId}/gradebook/categories/${editingDraft.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingDraft),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to update');
      }
      cancelEdit();
      flash('Category updated');
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category? Items inside will fall back to the default root.')) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(
        `/api/courses/${courseId}/gradebook/categories/${id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to delete');
      }
      flash('Category deleted');
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const saveLetterScale = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/courses/${courseId}/gradebook/letter-scale`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scale }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to save letter scale');
      }
      flash('Letter scale saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addLetterBand = () =>
    setScale((s) => [...s, { letter: '', min_percentage: 0 }]);
  const removeLetterBand = (i: number) =>
    setScale((s) => s.filter((_, idx) => idx !== i));
  const updateLetterBand = (i: number, patch: Partial<LetterBand>) =>
    setScale((s) => s.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));

  // ─── Drag-and-drop reordering ──────────────────────────────────────────

  const persistCategoryOrder = async (
    siblings: Category[]
  ): Promise<void> => {
    const order = siblings.map((c, idx) => ({ id: c.id, sort_order: idx }));
    try {
      const res = await fetch(
        `/api/courses/${courseId}/gradebook/categories/reorder`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order }),
        }
      );
      if (!res.ok) throw new Error('Reorder failed');
    } catch (e) {
      console.error('Reorder persist error:', e);
      setError('Failed to save new order');
      await loadAll();
    }
  };

  const handleCategoryDragEnd = async (
    event: DragEndEvent,
    parentId: string | null
  ) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const siblings =
      parentId === null
        ? categories.filter((c) => c.parent_id === null)
        : categories.filter((c) => c.parent_id === parentId);
    siblings.sort((a, b) => a.sort_order - b.sort_order);

    const oldIndex = siblings.findIndex((c) => c.id === active.id);
    const newIndex = siblings.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(siblings, oldIndex, newIndex);

    // Optimistic local update so the row jumps immediately.
    setCategories((prev) => {
      const reorderedById = new Map(reordered.map((c, idx) => [c.id, idx]));
      return prev.map((c) =>
        reorderedById.has(c.id)
          ? { ...c, sort_order: reorderedById.get(c.id)! }
          : c
      );
    });

    await persistCategoryOrder(reordered);
  };

  const persistItemOrder = async (siblings: GradeItem[]): Promise<void> => {
    const order = siblings.map((it, idx) => ({ id: it.id, sort_order: idx }));
    try {
      const res = await fetch(
        `/api/courses/${courseId}/gradebook/items/reorder`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order }),
        }
      );
      if (!res.ok) throw new Error('Reorder failed');
    } catch (e) {
      console.error('Item reorder persist error:', e);
      setError('Failed to save new item order');
      await loadAll();
    }
  };

  const handleItemDragEnd = async (
    event: DragEndEvent,
    categoryId: string | null
  ) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const siblings = (itemsByCategory.get(categoryId) ?? []).slice();
    const oldIndex = siblings.findIndex((it) => it.id === active.id);
    const newIndex = siblings.findIndex((it) => it.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(siblings, oldIndex, newIndex);

    setItems((prev) => {
      const reorderedById = new Map(reordered.map((it, idx) => [it.id, idx]));
      return prev.map((it) =>
        reorderedById.has(it.id)
          ? { ...it, sort_order: reorderedById.get(it.id)! }
          : it
      );
    });

    await persistItemOrder(reordered);
  };

  // ─── Items mover ───────────────────────────────────────────────────────

  const itemsByCategory = useMemo(() => {
    const groups = new Map<string | null, GradeItem[]>();
    for (const it of items) {
      const key = it.category_id ?? null;
      const list = groups.get(key) ?? [];
      list.push(it);
      groups.set(key, list);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order);
    }
    return groups;
  }, [items]);

  const toggleItemSelect = (id: string) =>
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAllUncategorised = () => {
    const orphans = (itemsByCategory.get(null) ?? []).map((i) => i.id);
    setSelectedItemIds(new Set(orphans));
  };

  const clearSelection = () => setSelectedItemIds(new Set());

  const moveSelectedItems = async () => {
    if (selectedItemIds.size === 0) {
      setError('No items selected');
      return;
    }
    if (!moveTargetId) {
      setError('Pick a destination category');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/courses/${courseId}/gradebook/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_ids: Array.from(selectedItemIds),
          category_id: moveTargetId === '__none__' ? null : moveTargetId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to move items');
      }
      const data = await res.json();
      flash(`Moved ${data.moved ?? selectedItemIds.size} item(s)`);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to move items');
    } finally {
      setSaving(false);
    }
  };

  const toggleItemFlag = async (
    item: GradeItem,
    field: 'extra_credit' | 'hidden' | 'locked'
  ) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(
        `/api/courses/${courseId}/gradebook/items/${item.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: !item[field] }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to update item');
      }
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render helpers ────────────────────────────────────────────────────

  /**
   * Wraps a row's content in a draggable container. Adds a small drag
   * handle on the left; clicking/typing on other parts of the row is
   * unaffected (PointerSensor activationConstraint requires 5px movement
   * before a drag starts, so accidental drags from button clicks are rare).
   */
  function SortableRow({
    id,
    disabled,
    children,
    className,
    style,
  }: {
    id: string;
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id, disabled });

    const composedStyle: React.CSSProperties = {
      ...style,
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
      background: isDragging ? '#f0f9ff' : undefined,
    };

    return (
      <div ref={setNodeRef} className={className} style={composedStyle}>
        <button
          type="button"
          aria-label="Drag to reorder"
          className="text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing select-none"
          style={{ touchAction: 'none' }}
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        {children}
      </div>
    );
  }

  const renderCategoryRow = (c: Category, depth: number) => {
    const isEditing = editingId === c.id && editingDraft;
    const indent = { paddingLeft: `${depth * 24 + 20}px` };

    if (isEditing && editingDraft) {
      return (
        <div
          key={c.id}
          className="px-5 py-4 border-b border-gray-100 bg-blue-50/30"
          style={indent}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs text-slate-500">
              Name
              <input
                type="text"
                value={editingDraft.name}
                onChange={(e) =>
                  setEditingDraft({ ...editingDraft, name: e.target.value })
                }
                className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </label>
            <label className="text-xs text-slate-500">
              Aggregation
              <select
                value={editingDraft.aggregation}
                onChange={(e) =>
                  setEditingDraft({
                    ...editingDraft,
                    aggregation: e.target.value as Aggregation,
                  })
                }
                className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md"
              >
                {AGGREGATIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-500">
              Weight (in parent)
              <input
                type="number"
                step="0.01"
                value={editingDraft.weight ?? ''}
                onChange={(e) =>
                  setEditingDraft({
                    ...editingDraft,
                    weight: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                placeholder="auto (1.0)"
                className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md"
              />
            </label>
            <label className="text-xs text-slate-500">
              Drop lowest
              <input
                type="number"
                min={0}
                value={editingDraft.drop_lowest}
                onChange={(e) =>
                  setEditingDraft({
                    ...editingDraft,
                    drop_lowest: Number(e.target.value),
                  })
                }
                className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md"
              />
            </label>
            <label className="text-xs text-slate-500">
              Drop highest
              <input
                type="number"
                min={0}
                value={editingDraft.drop_highest}
                onChange={(e) =>
                  setEditingDraft({
                    ...editingDraft,
                    drop_highest: Number(e.target.value),
                  })
                }
                className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md"
              />
            </label>
            <label className="text-xs text-slate-500">
              Keep highest
              <input
                type="number"
                min={0}
                value={editingDraft.keep_highest ?? ''}
                onChange={(e) =>
                  setEditingDraft({
                    ...editingDraft,
                    keep_highest:
                      e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                placeholder="off"
                className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 mt-2">
              <input
                type="checkbox"
                checked={editingDraft.extra_credit}
                onChange={(e) =>
                  setEditingDraft({
                    ...editingDraft,
                    extra_credit: e.target.checked,
                  })
                }
              />
              Extra credit
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 mt-2">
              <input
                type="checkbox"
                checked={editingDraft.hidden}
                onChange={(e) =>
                  setEditingDraft({ ...editingDraft, hidden: e.target.checked })
                }
              />
              Hidden from students
            </label>
            <div className="md:col-span-2 mt-1">
              <div className="text-xs text-slate-500 mb-1.5">Display colour</div>
              <ColorSwatchPicker
                value={editingDraft.display_color}
                onChange={(next) =>
                  setEditingDraft({ ...editingDraft, display_color: next })
                }
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={saveEdit}
              disabled={saving}
              className="px-3 py-1.5 text-xs bg-slate-800 text-white rounded-md hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={cancelEdit}
              className="px-3 py-1.5 text-xs border border-gray-200 text-slate-600 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    const aggregationLabel =
      AGGREGATIONS.find((a) => a.value === c.aggregation)?.label ?? c.aggregation;

    return (
      <SortableRow
        key={c.id}
        id={c.id}
        className="px-5 py-3 border-b border-gray-100 hover:bg-gray-50/50 transition-colors flex items-center gap-3"
        style={indent}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {c.display_color && (
            <span
              aria-hidden="true"
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: c.display_color }}
            />
          )}
          <span className="text-sm text-slate-700 truncate">
            {c.name}
            {c.parent_id === null && (
              <span className="ml-2 text-[10px] text-slate-400 uppercase tracking-wider">
                root
              </span>
            )}
          </span>
          <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full whitespace-nowrap">
            {aggregationLabel}
          </span>
          {c.weight != null && (
            <span className="text-[11px] text-slate-500 whitespace-nowrap">
              w={c.weight}
            </span>
          )}
          {(c.drop_lowest > 0 || c.drop_highest > 0 || c.keep_highest != null) && (
            <span className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full whitespace-nowrap">
              {c.keep_highest != null
                ? `keep ${c.keep_highest}`
                : `drop ${c.drop_lowest > 0 ? `-${c.drop_lowest}` : ''}${c.drop_highest > 0 ? ` +${c.drop_highest}` : ''}`}
            </span>
          )}
          {c.extra_credit && (
            <span className="text-[11px] px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
              EC
            </span>
          )}
          {c.hidden && (
            <span className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
              hidden
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => startEdit(c)}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            Edit
          </button>
          <button
            onClick={() => deleteCategory(c.id)}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      </SortableRow>
    );
  };

  const renderTree = (parentId: string | null, depth: number): React.ReactNode => {
    const nodes =
      parentId === null ? tree.roots : tree.childrenOf(parentId);
    if (nodes.length === 0) return null;
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => handleCategoryDragEnd(event, parentId)}
      >
        <SortableContext
          items={nodes.map((n) => n.id)}
          strategy={verticalListSortingStrategy}
        >
          {nodes.map((c) => (
            <React.Fragment key={c.id}>
              {renderCategoryRow(c, depth)}
              {renderTree(c.id, depth + 1)}
            </React.Fragment>
          ))}
        </SortableContext>
      </DndContext>
    );
  };

  // ─── Page ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Courses', href: '/courses' },
            { label: 'Gradebook', href: `/courses/${courseId}/gradebook` },
            { label: 'Categories' },
          ]}
          className="mb-6"
        />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-normal text-slate-900 tracking-tight">
              Gradebook Categories
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Hierarchical categories with aggregation strategies and drop rules.
              Edits trigger a class-wide grade recompute.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/courses/${courseId}/gradebook`}
              className="px-3 py-1.5 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-md transition-colors"
            >
              Full Gradebook
            </Link>
            <Link
              href={`/courses/${courseId}/gradebook/setup`}
              className="px-3 py-1.5 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-md transition-colors"
            >
              Legacy Setup
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {/* Categories tree */}
        <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700">Tree</h2>
            <button
              onClick={() => router.refresh()}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No categories yet. Create one below to get started.
            </div>
          ) : (
            <div>{renderTree(null, 0)}</div>
          )}
        </div>

        {/* Items mover */}
        <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-slate-700">Grade items</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Move items between categories. Items not assigned to a category
                fall back to a synthetic root and won&apos;t show in the
                breakdown — assign them to make them navigable.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(itemsByCategory.get(null) ?? []).length > 0 && (
                <button
                  onClick={selectAllUncategorised}
                  className="text-xs text-amber-600 hover:text-amber-800"
                >
                  Select uncategorised ({(itemsByCategory.get(null) ?? []).length})
                </button>
              )}
              {selectedItemIds.size > 0 && (
                <button
                  onClick={clearSelection}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Clear ({selectedItemIds.size})
                </button>
              )}
            </div>
          </div>

          {selectedItemIds.size > 0 && (
            <div className="px-5 py-2.5 bg-blue-50/60 border-b border-blue-100 flex items-center gap-2">
              <span className="text-xs text-slate-700">
                Move {selectedItemIds.size} item(s) to:
              </span>
              <select
                value={moveTargetId}
                onChange={(e) => setMoveTargetId(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-200 rounded-md"
              >
                <option value="">— select category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="__none__">(uncategorised)</option>
              </select>
              <button
                onClick={moveSelectedItems}
                disabled={saving || !moveTargetId}
                className="px-3 py-1 text-xs bg-slate-800 text-white rounded-md hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? 'Moving…' : 'Move'}
              </button>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No grade items in this course yet.
            </div>
          ) : (
            <div>
              {/* Render uncategorised first so staff notice them */}
              {[null, ...categories.map((c) => c.id)].map((catId) => {
                const list = itemsByCategory.get(catId) ?? [];
                if (list.length === 0) return null;
                const cat =
                  catId === null ? null : categories.find((c) => c.id === catId);
                return (
                  <div key={catId ?? '__none__'} className="border-b border-gray-100 last:border-b-0">
                    <div className="px-5 py-2 bg-gray-50/60 text-[11px] uppercase tracking-wider font-medium text-slate-500 flex items-center justify-between">
                      <span>
                        {cat?.name ?? 'Uncategorised'}{' '}
                        <span className="text-slate-400 normal-case">
                          ({list.length})
                        </span>
                      </span>
                      {catId === null && (
                        <span className="text-[10px] text-amber-600 normal-case">
                          ⚠ not in any category
                        </span>
                      )}
                    </div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleItemDragEnd(event, catId)}
                    >
                      <SortableContext
                        items={list.map((it) => it.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {list.map((item) => {
                          const checked = selectedItemIds.has(item.id);
                          return (
                            <SortableRow
                              key={item.id}
                              id={item.id}
                              className="px-5 py-2.5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 flex items-center gap-3"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleItemSelect(item.id)}
                              />
                              <span className="text-sm text-slate-700 truncate flex-1">
                                {item.title}
                              </span>
                              <span className="text-[11px] text-slate-400 capitalize">
                                {item.type}
                              </span>
                              <span className="text-[11px] text-slate-400 tabular-nums w-12 text-right">
                                {item.points} pts
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => toggleItemFlag(item, 'extra_credit')}
                                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                                    item.extra_credit
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                  }`}
                                  title="Toggle extra credit"
                                >
                                  EC
                                </button>
                                <button
                                  onClick={() => toggleItemFlag(item, 'hidden')}
                                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                                    item.hidden
                                      ? 'bg-gray-200 text-gray-700'
                                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                  }`}
                                  title="Toggle hidden"
                                >
                                  hidden
                                </button>
                                <button
                                  onClick={() => toggleItemFlag(item, 'locked')}
                                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                                    item.locked
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                  }`}
                                  title="Toggle locked"
                                >
                                  locked
                                </button>
                              </div>
                            </SortableRow>
                          );
                        })}
                      </SortableContext>
                    </DndContext>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add category */}
        <div className="bg-white rounded-lg border border-gray-200/80 p-5 mb-6">
          <h2 className="text-sm font-medium text-slate-700 mb-4">Add category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs text-slate-500">
              Name
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, name: e.target.value })
                }
                placeholder="e.g. Quizzes"
                className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </label>
            <label className="text-xs text-slate-500">
              Parent
              <select
                value={newCategory.parent_id ?? ''}
                onChange={(e) =>
                  setNewCategory({
                    ...newCategory,
                    parent_id: e.target.value || null,
                  })
                }
                className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md"
              >
                <option value="">(root)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-500">
              Aggregation
              <select
                value={newCategory.aggregation}
                onChange={(e) =>
                  setNewCategory({
                    ...newCategory,
                    aggregation: e.target.value as Aggregation,
                  })
                }
                className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md"
              >
                {AGGREGATIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-500">
              Weight (in parent)
              <input
                type="number"
                step="0.01"
                value={newCategory.weight ?? ''}
                onChange={(e) =>
                  setNewCategory({
                    ...newCategory,
                    weight: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                placeholder="auto"
                className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md"
              />
            </label>
            <label className="text-xs text-slate-500">
              Drop lowest
              <input
                type="number"
                min={0}
                value={newCategory.drop_lowest}
                onChange={(e) =>
                  setNewCategory({
                    ...newCategory,
                    drop_lowest: Number(e.target.value),
                  })
                }
                className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md"
              />
            </label>
            <label className="text-xs text-slate-500">
              Drop highest
              <input
                type="number"
                min={0}
                value={newCategory.drop_highest}
                onChange={(e) =>
                  setNewCategory({
                    ...newCategory,
                    drop_highest: Number(e.target.value),
                  })
                }
                className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 mt-2">
              <input
                type="checkbox"
                checked={newCategory.extra_credit}
                onChange={(e) =>
                  setNewCategory({
                    ...newCategory,
                    extra_credit: e.target.checked,
                  })
                }
              />
              Extra credit
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 mt-2">
              <input
                type="checkbox"
                checked={newCategory.hidden}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, hidden: e.target.checked })
                }
              />
              Hidden from students
            </label>
            <div className="md:col-span-2 mt-2">
              <div className="text-xs text-slate-500 mb-1.5">Display colour</div>
              <ColorSwatchPicker
                value={newCategory.display_color}
                onChange={(next) =>
                  setNewCategory({ ...newCategory, display_color: next })
                }
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={createCategory}
              disabled={saving}
              className="px-3 py-1.5 text-xs bg-slate-800 text-white rounded-md hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add category'}
            </button>
          </div>
        </div>

        {/* Letter scale */}
        <div className="bg-white rounded-lg border border-gray-200/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-medium text-slate-700">Letter scale</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                The highest band the student&apos;s percentage clears wins. Leave empty
                for no letter grades.
              </p>
            </div>
            <button
              onClick={addLetterBand}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              + Add band
            </button>
          </div>

          {scale.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">No bands defined.</p>
          ) : (
            <div className="space-y-2">
              {scale.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={b.letter}
                    onChange={(e) => updateLetterBand(i, { letter: e.target.value })}
                    placeholder="A"
                    className="w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-md"
                  />
                  <span className="text-xs text-slate-400">≥</span>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={100}
                    value={b.min_percentage}
                    onChange={(e) =>
                      updateLetterBand(i, {
                        min_percentage: Number(e.target.value),
                      })
                    }
                    className="w-24 px-2 py-1.5 text-sm border border-gray-200 rounded-md"
                  />
                  <span className="text-xs text-slate-400">%</span>
                  <button
                    onClick={() => removeLetterBand(i)}
                    className="ml-auto text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              Saving recomputes every student&apos;s cached letter.
            </p>
            <button
              onClick={saveLetterScale}
              disabled={saving}
              className="px-3 py-1.5 text-xs bg-slate-800 text-white rounded-md hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save scale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GradebookCategoriesPage() {
  return (
    <RoleGuard
      roles={['instructor', 'curriculum_designer', 'admin', 'super_admin', 'tenant_admin']}
    >
      <GradebookCategoriesPageInner />
    </RoleGuard>
  );
}

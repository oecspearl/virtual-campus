'use client';

import React, { ReactNode } from 'react';

/**
 * ResponsiveTable
 *
 * Renders the same data as a `<table>` on `md` and up, and as a stack of
 * card rows on mobile. Each card uses the first (or `primary`-flagged)
 * column as a title and the remaining columns as `label: value` rows.
 *
 * Why this exists: every previous table in the app either (a) hid itself
 * entirely on mobile, (b) wrapped in `overflow-x-auto` and forced
 * horizontal scroll with no header context, or (c) re-implemented its own
 * mobile card view inline. This primitive consolidates the pattern.
 *
 * Example:
 *
 *   <ResponsiveTable
 *     rowKey={(u) => u.id}
 *     rows={users}
 *     columns={[
 *       { key: 'name', header: 'Name', render: (u) => u.name, primary: true },
 *       { key: 'email', header: 'Email', render: (u) => u.email },
 *       { key: 'role', header: 'Role', render: (u) => u.role },
 *     ]}
 *     actions={(u) => <button onClick={() => edit(u)}>Edit</button>}
 *   />
 */

export interface ResponsiveTableColumn<T> {
  /** Stable key for React reconciliation and aria. */
  key: string;
  /** Header content for the desktop table column. */
  header: ReactNode;
  /** Cell renderer. */
  render: (row: T, rowIndex: number) => ReactNode;
  /** Override `header` for the mobile card "label". Defaults to header
   *  cast to string when possible. */
  mobileLabel?: string;
  /** When true, this column is treated as the card title on mobile.
   *  If no column is flagged, the first column is used. */
  primary?: boolean;
  /** Skip this column entirely on mobile cards (e.g. internal IDs). */
  hideOnMobile?: boolean;
  /** Cell text alignment on the desktop table. */
  align?: 'left' | 'right' | 'center';
  /** CSS width hint for the desktop table column (e.g. "140px", "20%"). */
  width?: string;
  /** Extra classes applied to the desktop `<td>`. */
  className?: string;
}

export interface ResponsiveTableProps<T> {
  columns: ResponsiveTableColumn<T>[];
  rows: T[];
  /** Required. Stable identity per row for keys. */
  rowKey: (row: T, rowIndex: number) => string;
  /** Optional row-level action area. On desktop renders as a trailing
   *  table cell; on mobile renders as a footer band on the card. */
  actions?: (row: T, rowIndex: number) => ReactNode;
  /** Empty-state content. Defaults to a generic "no rows" message. */
  empty?: ReactNode;
  /** Make the desktop table header `sticky top-0`. The parent must be
   *  scrollable for sticky to take effect. */
  stickyHeader?: boolean;
  /** Caption for screen readers. Recommended. */
  caption?: string;
  /** Wrapper className. */
  className?: string;
  /** Optional row-level click handler (mobile cards become buttons). */
  onRowClick?: (row: T, rowIndex: number) => void;
}

const alignClass: Record<NonNullable<ResponsiveTableColumn<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  actions,
  empty,
  stickyHeader = false,
  caption,
  className = '',
  onRowClick,
}: ResponsiveTableProps<T>) {
  const primaryIndex = Math.max(
    0,
    columns.findIndex((c) => c.primary),
  );

  if (rows.length === 0) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 ${className}`}>
        {empty ?? 'No items to display.'}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* ── Desktop: real <table> ─────────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className={`bg-gray-50 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 ${
                    alignClass[col.align ?? 'left']
                  }`}
                >
                  {col.header}
                </th>
              ))}
              {actions && (
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : 'hover:bg-gray-50'}
                onClick={onRowClick ? () => onRowClick(row, i) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-gray-700 ${alignClass[col.align ?? 'left']} ${col.className ?? ''}`}
                  >
                    {col.render(row, i)}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-right text-sm text-gray-700">{actions(row, i)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile: stacked cards ─────────────────────────────────────────── */}
      <ul className="md:hidden space-y-3" role="list">
        {rows.map((row, i) => {
          const primaryCol = columns[primaryIndex];
          const detailCols = columns.filter((_, idx) => idx !== primaryIndex && !columns[idx].hideOnMobile);

          const cardBody = (
            <>
              <div className="text-base font-semibold text-gray-900 break-words">
                {primaryCol.render(row, i)}
              </div>
              {detailCols.length > 0 && (
                <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5 text-sm">
                  {detailCols.map((col) => (
                    <React.Fragment key={col.key}>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 self-center">
                        {col.mobileLabel ?? (typeof col.header === 'string' ? col.header : col.key)}
                      </dt>
                      <dd className="text-gray-700 break-words min-w-0">{col.render(row, i)}</dd>
                    </React.Fragment>
                  ))}
                </dl>
              )}
              {actions && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
                  {actions(row, i)}
                </div>
              )}
            </>
          );

          return (
            <li
              key={rowKey(row, i)}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              {onRowClick ? (
                <button
                  type="button"
                  onClick={() => onRowClick(row, i)}
                  className="w-full text-left"
                >
                  {cardBody}
                </button>
              ) : (
                cardBody
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ResponsiveTable;

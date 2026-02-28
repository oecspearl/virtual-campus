/**
 * Report Generation Engine
 * Handles query building, data aggregation, and export functionality
 */

import { createServiceSupabaseClient } from '@/lib/supabase-server';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface ReportConfig {
  data_sources: string[];
  fields: string[];
  filters: {
    field: string;
    operator: string;
    value: any;
  }[];
  grouping?: {
    field: string;
    function: 'sum' | 'avg' | 'count' | 'min' | 'max';
  };
  sorting?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  visualization?: {
    type: 'table' | 'chart' | 'graph';
    chart_type?: 'bar' | 'line' | 'pie';
  };
}

export interface ReportData {
  columns: string[];
  rows: any[][];
  summary?: {
    total_rows: number;
    aggregations?: Record<string, number>;
  };
}

/**
 * Build and execute report query
 */
export async function buildReportQuery(config: ReportConfig): Promise<ReportData> {
  const supabase = createServiceSupabaseClient();
  const results: any[] = [];

  // Process each data source
  for (const source of config.data_sources) {
    let query = supabase.from(source).select(config.fields.join(','));

    // Apply filters
    for (const filter of config.filters) {
      if (filter.operator === 'eq') {
        query = query.eq(filter.field, filter.value);
      } else if (filter.operator === 'gt') {
        query = query.gt(filter.field, filter.value);
      } else if (filter.operator === 'lt') {
        query = query.lt(filter.field, filter.value);
      } else if (filter.operator === 'gte') {
        query = query.gte(filter.field, filter.value);
      } else if (filter.operator === 'lte') {
        query = query.lte(filter.field, filter.value);
      } else if (filter.operator === 'like') {
        query = query.like(filter.field, `%${filter.value}%`);
      } else if (filter.operator === 'in') {
        query = query.in(filter.field, filter.value);
      }
    }

    // Apply sorting
    if (config.sorting) {
      query = query.order(config.sorting.field, {
        ascending: config.sorting.direction === 'asc',
      });
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error querying ${source}:`, error);
      continue;
    }

    if (data) {
      results.push(...data);
    }
  }

  // Extract columns
  const columns = config.fields;

  // Convert to rows
  const rows = results.map((row) => {
    return columns.map((col) => {
      // Handle nested fields (e.g., "user.name")
      const parts = col.split('.');
      let value = row;
      for (const part of parts) {
        value = value?.[part];
      }
      return value ?? '';
    });
  });

  // Apply grouping if specified
  if (config.grouping) {
    const grouped = new Map<string, any[]>();
    const groupFieldIndex = columns.indexOf(config.grouping.field);

    for (const row of rows) {
      const key = row[groupFieldIndex]?.toString() || 'unknown';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(row);
    }

    // Apply aggregation function
    const aggregatedRows: any[][] = [];
    for (const [key, groupRows] of grouped.entries()) {
      const aggregatedRow = [...rows[0]]; // Copy first row structure
      aggregatedRow[groupFieldIndex] = key;

      // Apply aggregation to numeric fields
      for (let i = 0; i < columns.length; i++) {
        if (i !== groupFieldIndex) {
          const values = groupRows.map((r) => parseFloat(r[i]) || 0).filter((v) => !isNaN(v));
          if (values.length > 0) {
            switch (config.grouping.function) {
              case 'sum':
                aggregatedRow[i] = values.reduce((a, b) => a + b, 0);
                break;
              case 'avg':
                aggregatedRow[i] = values.reduce((a, b) => a + b, 0) / values.length;
                break;
              case 'count':
                aggregatedRow[i] = groupRows.length;
                break;
              case 'min':
                aggregatedRow[i] = Math.min(...values);
                break;
              case 'max':
                aggregatedRow[i] = Math.max(...values);
                break;
            }
          }
        }
      }

      aggregatedRows.push(aggregatedRow);
    }

    return {
      columns,
      rows: aggregatedRows,
      summary: {
        total_rows: aggregatedRows.length,
      },
    };
  }

  return {
    columns,
    rows,
    summary: {
      total_rows: rows.length,
    },
  };
}

/**
 * Export report to CSV
 */
export function exportToCSV(data: ReportData, filename: string): void {
  const csv = Papa.unparse({
    fields: data.columns,
    data: data.rows,
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export report to Excel
 */
export function exportToExcel(data: ReportData, filename: string): void {
  const ws = XLSX.utils.aoa_to_sheet([data.columns, ...data.rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export report to PDF (requires jsPDF)
 */
export async function exportToPDF(data: ReportData, filename: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(16);
  doc.text('Report', 14, 20);

  // Add table
  const tableData = [data.columns, ...data.rows];
  let y = 30;
  const pageHeight = doc.internal.pageSize.height;
  const rowHeight = 7;
  const margin = 14;

  doc.setFontSize(10);
  for (let i = 0; i < tableData.length; i++) {
    if (y + rowHeight > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }

    const row = tableData[i];
    let x = margin;
    const colWidth = (doc.internal.pageSize.width - margin * 2) / row.length;

    for (const cell of row) {
      doc.text(String(cell || ''), x, y, {
        maxWidth: colWidth - 2,
      });
      x += colWidth;
    }

    y += rowHeight;
  }

  doc.save(`${filename}.pdf`);
}



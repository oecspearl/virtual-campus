/**
 * ETL Pipeline Infrastructure
 * Handles data extraction, transformation, and loading to data warehouses
 */

import { createServiceSupabaseClient } from '@/lib/supabase-server';

export interface DataWarehouseConfig {
  id: string;
  name: string;
  warehouse_type: 'snowflake' | 'bigquery' | 'redshift' | 'databricks' | 'custom';
  connection_config: Record<string, any>;
  is_active: boolean;
}

export interface ETLPipeline {
  name: string;
  source_tables: string[];
  target_schema: string;
  target_table: string;
  transformation?: (data: any[]) => any[];
  incremental_key?: string;
}

/**
 * Get data warehouse configuration
 */
export async function getDataWarehouseConfig(warehouseId: string): Promise<DataWarehouseConfig | null> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('data_warehouse_configs')
    .select('*')
    .eq('id', warehouseId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as DataWarehouseConfig;
}

/**
 * Extract data from source tables
 */
export async function extractData(
  tables: string[],
  filters?: Record<string, any>,
  limit?: number
): Promise<Record<string, any[]>> {
  const supabase = createServiceSupabaseClient();
  const extracted: Record<string, any[]> = {};

  for (const table of tables) {
    let query = supabase.from(table).select('*');
    
    // Apply filters if provided
    if (filters && filters[table]) {
      const tableFilters = filters[table];
      for (const [key, value] of Object.entries(tableFilters)) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    
    if (!error && data) {
      extracted[table] = data;
    }
  }

  return extracted;
}

/**
 * Transform data for warehouse
 */
export function transformData(
  data: any[],
  transformations?: {
    renameColumns?: Record<string, string>;
    addColumns?: Record<string, (row: any) => any>;
    filterRows?: (row: any) => boolean;
    aggregate?: {
      groupBy: string[];
      aggregations: Record<string, (group: any[]) => any>;
    };
  }
): any[] {
  let transformed = [...data];

  // Rename columns
  if (transformations?.renameColumns) {
    transformed = transformed.map(row => {
      const newRow = { ...row };
      for (const [oldName, newName] of Object.entries(transformations.renameColumns!)) {
        if (oldName in newRow) {
          newRow[newName] = newRow[oldName];
          delete newRow[oldName];
        }
      }
      return newRow;
    });
  }

  // Add computed columns
  if (transformations?.addColumns) {
    transformed = transformed.map(row => {
      const newRow = { ...row };
      for (const [columnName, computeFn] of Object.entries(transformations.addColumns!)) {
        newRow[columnName] = computeFn(row);
      }
      return newRow;
    });
  }

  // Filter rows
  if (transformations?.filterRows) {
    transformed = transformed.filter(transformations.filterRows);
  }

  // Aggregate
  if (transformations?.aggregate) {
    const grouped = new Map<string, any[]>();
    transformed.forEach(row => {
      const key = transformations.aggregate!.groupBy.map(col => row[col]).join('|');
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(row);
    });

    transformed = Array.from(grouped.entries()).map(([key, group]) => {
      const result: any = {};
      transformations.aggregate!.groupBy.forEach(col => {
        result[col] = group[0][col];
      });
      for (const [aggName, aggFn] of Object.entries(transformations.aggregate!.aggregations)) {
        result[aggName] = aggFn(group);
      }
      return result;
    });
  }

  return transformed;
}

/**
 * Load data to warehouse
 */
export async function loadToWarehouse(
  warehouseId: string,
  schema: string,
  table: string,
  data: any[],
  mode: 'append' | 'replace' | 'upsert' = 'append'
): Promise<{ success: boolean; recordsLoaded: number; error?: string }> {
  const warehouse = await getDataWarehouseConfig(warehouseId);
  
  if (!warehouse) {
    return { success: false, recordsLoaded: 0, error: 'Warehouse not found' };
  }

  // In production, this would connect to the actual warehouse
  // For now, we'll log the job
  const supabase = createServiceSupabaseClient();
  
  const { data: job, error } = await supabase
    .from('etl_pipeline_jobs')
    .insert({
      warehouse_id: warehouseId,
      pipeline_name: `${schema}.${table}`,
      status: 'running',
      started_at: new Date().toISOString(),
      metadata: {
        mode,
        record_count: data.length,
      },
    })
    .select()
    .single();

  if (error) {
    return { success: false, recordsLoaded: 0, error: error.message };
  }

  // Simulate loading (in production, use warehouse SDK)
  // For Snowflake: use snowflake-sdk
  // For BigQuery: use @google-cloud/bigquery
  // etc.

  // Update job status
  await supabase
    .from('etl_pipeline_jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      duration_seconds: Math.floor((Date.now() - new Date(job.started_at).getTime()) / 1000),
      records_processed: data.length,
    })
    .eq('id', job.id);

  return { success: true, recordsLoaded: data.length };
}

/**
 * Run ETL pipeline
 */
export async function runETLPipeline(
  warehouseId: string,
  pipeline: ETLPipeline
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    // Extract
    const extracted = await extractData(pipeline.source_tables);
    
    // Combine data from multiple tables if needed
    let combinedData: any[] = [];
    for (const [table, rows] of Object.entries(extracted)) {
      combinedData = combinedData.concat(rows.map(row => ({ ...row, _source_table: table })));
    }
    
    // Transform
    const transformed = pipeline.transformation
      ? pipeline.transformation(combinedData)
      : combinedData;
    
    // Load
    const loadResult = await loadToWarehouse(
      warehouseId,
      pipeline.target_schema,
      pipeline.target_table,
      transformed
    );
    
    if (!loadResult.success) {
      return { success: false, error: loadResult.error };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


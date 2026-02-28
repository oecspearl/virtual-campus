import { createTenantQuery } from '@/lib/tenant-query';
import type { FieldMapping, EntityType } from './types';

/**
 * Load active field mappings for a connection and entity type.
 */
export async function getFieldMappings(
  connectionId: string,
  entityType: EntityType,
  tenantId: string
): Promise<FieldMapping[]> {
  const tq = createTenantQuery(tenantId);
  const { data, error } = await tq
    .from('sonisweb_field_mappings')
    .select('*')
    .eq('connection_id', connectionId)
    .eq('entity_type', entityType)
    .eq('is_active', true);

  if (error) {
    console.error('Error loading field mappings:', error);
    return [];
  }

  return (data || []).sort((a: FieldMapping, b: FieldMapping) => a.sort_order - b.sort_order);
}

/**
 * Apply field mappings to transform a SonisWeb record into LMS fields.
 * Returns a flat object with lms_field as keys.
 */
export function applyFieldMappings(
  sonisRecord: Record<string, any>,
  mappings: FieldMapping[]
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const mapping of mappings) {
    if (!mapping.is_active) continue;

    const rawValue = sonisRecord[mapping.sonisweb_field];

    // Check required fields
    if (mapping.is_required && (rawValue === null || rawValue === undefined || rawValue === '')) {
      continue; // Skip — caller should validate required fields separately
    }

    const transformed = applyTransform(rawValue, mapping, sonisRecord);
    if (transformed !== undefined) {
      result[mapping.lms_field] = transformed;
    }
  }

  return result;
}

/**
 * Check if all required fields are present in a SonisWeb record.
 */
export function validateRequiredFields(
  sonisRecord: Record<string, any>,
  mappings: FieldMapping[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const mapping of mappings) {
    if (!mapping.is_required || !mapping.is_active) continue;
    const value = sonisRecord[mapping.sonisweb_field];
    if (value === null || value === undefined || value === '') {
      missing.push(mapping.sonisweb_field);
    }
  }

  return { valid: missing.length === 0, missing };
}

function applyTransform(
  value: any,
  mapping: FieldMapping,
  fullRecord: Record<string, any>
): any {
  switch (mapping.transform_type) {
    case 'direct':
      return value ?? null;

    case 'concat': {
      const config = mapping.transform_config as { fields?: string[]; separator?: string };
      const fields = config.fields || [mapping.sonisweb_field];
      const separator = config.separator ?? ' ';
      const parts = fields
        .map(f => fullRecord[f])
        .filter(v => v !== null && v !== undefined && v !== '');
      return parts.length > 0 ? parts.join(separator) : null;
    }

    case 'map': {
      const config = mapping.transform_config as { mapping?: Record<string, string>; default?: string };
      const mapTable = config.mapping || {};
      const strValue = String(value ?? '').toUpperCase();
      return mapTable[strValue] ?? mapTable[String(value ?? '')] ?? config.default ?? value;
    }

    case 'format': {
      const config = mapping.transform_config as { format?: string };
      if (!config.format || value === null || value === undefined) return value;
      // Simple template: replace {value} with the actual value
      return config.format.replace('{value}', String(value));
    }

    case 'custom':
      // Custom transforms are handled at the service level
      return value;

    default:
      return value;
  }
}

/**
 * Seed default field mappings when a new SonisWeb connection is created.
 */
export async function seedDefaultMappings(
  connectionId: string,
  tenantId: string
): Promise<void> {
  const tq = createTenantQuery(tenantId);

  const defaultMappings = [
    // Student mappings
    {
      connection_id: connectionId,
      entity_type: 'student',
      sonisweb_field: 'nm_first',
      lms_field: 'name',
      lms_table: 'users',
      transform_type: 'concat',
      transform_config: { fields: ['nm_first', 'nm_last'], separator: ' ' },
      is_required: true,
      sort_order: 1,
    },
    {
      connection_id: connectionId,
      entity_type: 'student',
      sonisweb_field: 'e_mail',
      lms_field: 'email',
      lms_table: 'users',
      transform_type: 'direct',
      transform_config: {},
      is_required: true,
      sort_order: 2,
    },
    {
      connection_id: connectionId,
      entity_type: 'student',
      sonisweb_field: 'soc_sec',
      lms_field: '_sonisweb_id',
      lms_table: null,
      transform_type: 'direct',
      transform_config: {},
      is_required: true,
      sort_order: 0,
    },
    {
      connection_id: connectionId,
      entity_type: 'student',
      sonisweb_field: 'gender',
      lms_field: 'gender',
      lms_table: 'users',
      transform_type: 'map',
      transform_config: {
        mapping: { M: 'male', F: 'female', O: 'other' },
        default: 'prefer_not_to_say',
      },
      is_required: false,
      sort_order: 3,
    },
    {
      connection_id: connectionId,
      entity_type: 'student',
      sonisweb_field: 'phone',
      lms_field: 'phone',
      lms_table: 'user_profiles',
      transform_type: 'direct',
      transform_config: {},
      is_required: false,
      sort_order: 4,
    },
    // Course mappings
    {
      connection_id: connectionId,
      entity_type: 'course',
      sonisweb_field: 'crs_id',
      lms_field: '_sonisweb_id',
      lms_table: null,
      transform_type: 'direct',
      transform_config: {},
      is_required: true,
      sort_order: 0,
    },
    {
      connection_id: connectionId,
      entity_type: 'course',
      sonisweb_field: 'crs_title',
      lms_field: 'title',
      lms_table: 'courses',
      transform_type: 'direct',
      transform_config: {},
      is_required: true,
      sort_order: 1,
    },
    {
      connection_id: connectionId,
      entity_type: 'course',
      sonisweb_field: 'crs_desc',
      lms_field: 'description',
      lms_table: 'courses',
      transform_type: 'direct',
      transform_config: {},
      is_required: false,
      sort_order: 2,
    },
    // Enrollment mappings
    {
      connection_id: connectionId,
      entity_type: 'enrollment',
      sonisweb_field: 'soc_sec',
      lms_field: '_student_sonisweb_id',
      lms_table: null,
      transform_type: 'direct',
      transform_config: {},
      is_required: true,
      sort_order: 0,
    },
    {
      connection_id: connectionId,
      entity_type: 'enrollment',
      sonisweb_field: 'crs_id',
      lms_field: '_course_sonisweb_id',
      lms_table: null,
      transform_type: 'direct',
      transform_config: {},
      is_required: true,
      sort_order: 1,
    },
    {
      connection_id: connectionId,
      entity_type: 'enrollment',
      sonisweb_field: 'enroll_stat',
      lms_field: 'status',
      lms_table: 'enrollments',
      transform_type: 'map',
      transform_config: {
        mapping: { A: 'active', D: 'dropped', W: 'dropped', C: 'completed' },
        default: 'active',
      },
      is_required: false,
      sort_order: 2,
    },
  ];

  const { error } = await tq
    .from('sonisweb_field_mappings')
    .insert(defaultMappings);

  if (error) {
    console.error('Error seeding default field mappings:', error);
    throw error;
  }
}

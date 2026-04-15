import { describe, it, expect } from 'vitest'
import { hasRole, permissionsFor, isAdminRole, ALL_ROLES } from '../rbac'

describe('hasRole', () => {
  it('returns true when user role matches single required role', () => {
    expect(hasRole('admin', 'admin')).toBe(true)
  })

  it('returns true when user role is in array of required roles', () => {
    expect(hasRole('instructor', ['admin', 'instructor'])).toBe(true)
  })

  it('returns false when user role does not match', () => {
    expect(hasRole('student', ['admin', 'instructor'])).toBe(false)
  })

  it('returns false for null/undefined role', () => {
    expect(hasRole(null, 'admin')).toBe(false)
    expect(hasRole(undefined, 'admin')).toBe(false)
  })

  it('works with readonly arrays', () => {
    const roles = ['admin', 'super_admin'] as const
    expect(hasRole('admin', roles)).toBe(true)
    expect(hasRole('student', roles)).toBe(false)
  })
})

describe('isAdminRole', () => {
  it('recognizes admin roles', () => {
    expect(isAdminRole('admin')).toBe(true)
    expect(isAdminRole('super_admin')).toBe(true)
    expect(isAdminRole('tenant_admin')).toBe(true)
  })

  it('rejects non-admin roles', () => {
    expect(isAdminRole('student')).toBe(false)
    expect(isAdminRole('instructor')).toBe(false)
    expect(isAdminRole(null)).toBe(false)
  })
})

describe('permissionsFor', () => {
  it('super_admin has all permissions', () => {
    const perms = permissionsFor('super_admin')
    expect(perms.canAccessAdmin).toBe(true)
    expect(perms.canManageUsers).toBe(true)
    expect(perms.canManageTenantSettings).toBe(true)
    expect(perms.canGrade).toBe(true)
    expect(perms.canCreateCourses).toBe(true)
    expect(perms.canDesignCurriculum).toBe(true)
  })

  it('student has no special permissions', () => {
    const perms = permissionsFor('student')
    expect(perms.canAccessAdmin).toBe(false)
    expect(perms.canManageUsers).toBe(false)
    expect(perms.canGrade).toBe(false)
  })

  it('instructor can grade and create courses', () => {
    const perms = permissionsFor('instructor')
    expect(perms.canGrade).toBe(true)
    expect(perms.canCreateCourses).toBe(true)
    expect(perms.canAccessAdmin).toBe(false)
  })

  it('tenant_admin can manage tenant settings', () => {
    const perms = permissionsFor('tenant_admin')
    expect(perms.canAccessAdmin).toBe(true)
    expect(perms.canManageTenantSettings).toBe(true)
    expect(perms.canGrade).toBe(false)
  })
})

describe('ALL_ROLES', () => {
  it('contains all 7 roles', () => {
    expect(ALL_ROLES).toHaveLength(7)
    expect(ALL_ROLES).toContain('super_admin')
    expect(ALL_ROLES).toContain('student')
    expect(ALL_ROLES).toContain('tenant_admin')
  })
})

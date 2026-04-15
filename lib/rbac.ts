export type UserRole =
  | "super_admin"
  | "tenant_admin"
  | "admin"
  | "instructor"
  | "curriculum_designer"
  | "student"
  | "parent";

export const ALL_ROLES: UserRole[] = [
  "super_admin",
  "tenant_admin",
  "admin",
  "instructor",
  "curriculum_designer",
  "student",
  "parent",
];

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "super_admin" || role === "tenant_admin";
}

export function canAccessAdmin(role: string | null | undefined): boolean {
  return isAdminRole(role);
}

export function hasRole(userRole: string | null | undefined, required: UserRole | readonly UserRole[]): boolean {
  if (!userRole) return false;
  const list: readonly UserRole[] = Array.isArray(required) ? required : [required];
  return list.includes(userRole as UserRole);
}

export type PermissionFlags = {
  canAccessAdmin: boolean;
  canManageUsers: boolean;
  canManageTenantSettings: boolean;
  canGrade: boolean;
  canCreateCourses: boolean;
  canDesignCurriculum: boolean;
};

export function permissionsFor(role: string | null | undefined): PermissionFlags {
  const base: PermissionFlags = {
    canAccessAdmin: false,
    canManageUsers: false,
    canManageTenantSettings: false,
    canGrade: false,
    canCreateCourses: false,
    canDesignCurriculum: false,
  };
  switch (role) {
    case "super_admin":
      return {
        ...base,
        canAccessAdmin: true,
        canManageUsers: true,
        canManageTenantSettings: true,
        canGrade: true,
        canCreateCourses: true,
        canDesignCurriculum: true,
      };
    case "tenant_admin":
      return {
        ...base,
        canAccessAdmin: true,
        canManageUsers: true,
        canManageTenantSettings: true,
      };
    case "admin":
      return { ...base, canAccessAdmin: true, canManageUsers: true };
    case "instructor":
      return { ...base, canGrade: true, canCreateCourses: true };
    case "curriculum_designer":
      return { ...base, canDesignCurriculum: true };
    case "student":
    case "parent":
    default:
      return base;
  }
}

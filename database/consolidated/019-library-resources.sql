-- ============================================================================
-- 019: Library Resources
-- Centralized reusable resource library for admins to manage documents,
-- videos, links, templates, etc. that can be attached to multiple courses.
-- ============================================================================

-- 1. Library Resource Categories
CREATE TABLE IF NOT EXISTS public.library_resource_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100) DEFAULT 'material-symbols:folder',
  color VARCHAR(20) DEFAULT '#3B82F6',
  parent_id UUID REFERENCES public.library_resource_categories(id) ON DELETE SET NULL,
  "order" INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lib_res_cat_tenant_slug ON public.library_resource_categories(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_lib_res_cat_tenant ON public.library_resource_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lib_res_cat_parent ON public.library_resource_categories(parent_id);

-- 2. Library Resources
CREATE TABLE IF NOT EXISTS public.library_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  title VARCHAR(500) NOT NULL,
  description TEXT,
  resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('document', 'video', 'link', 'template', 'scorm', 'image', 'audio', 'other')),
  url TEXT,
  file_url TEXT,
  file_name VARCHAR(500),
  file_size BIGINT,
  file_type VARCHAR(255),
  category_id UUID REFERENCES public.library_resource_categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  version INTEGER DEFAULT 1,
  version_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lib_res_tenant ON public.library_resources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lib_res_category ON public.library_resources(category_id);
CREATE INDEX IF NOT EXISTS idx_lib_res_type ON public.library_resources(tenant_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_lib_res_tags ON public.library_resources USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_lib_res_created_by ON public.library_resources(created_by);
CREATE INDEX IF NOT EXISTS idx_lib_res_active ON public.library_resources(tenant_id, is_active);

-- 3. Library Resource Versions (history)
CREATE TABLE IF NOT EXISTS public.library_resource_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  resource_id UUID NOT NULL REFERENCES public.library_resources(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  url TEXT,
  file_url TEXT,
  file_name VARCHAR(500),
  file_size BIGINT,
  file_type VARCHAR(255),
  version_notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lib_res_ver_unique ON public.library_resource_versions(resource_id, version);
CREATE INDEX IF NOT EXISTS idx_lib_res_ver_tenant ON public.library_resource_versions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lib_res_ver_resource ON public.library_resource_versions(resource_id);

-- 4. Course Library Resources (junction table)
CREATE TABLE IF NOT EXISTS public.course_library_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.library_resources(id) ON DELETE CASCADE,
  "order" INTEGER DEFAULT 0,
  added_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clr_unique ON public.course_library_resources(course_id, COALESCE(lesson_id, '00000000-0000-0000-0000-000000000000'), resource_id);
CREATE INDEX IF NOT EXISTS idx_clr_tenant ON public.course_library_resources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clr_course ON public.course_library_resources(course_id);
CREATE INDEX IF NOT EXISTS idx_clr_lesson ON public.course_library_resources(lesson_id);
CREATE INDEX IF NOT EXISTS idx_clr_resource ON public.course_library_resources(resource_id);

-- Updated-at triggers
CREATE OR REPLACE FUNCTION update_library_resource_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_library_resource_categories_updated_at
  BEFORE UPDATE ON public.library_resource_categories
  FOR EACH ROW EXECUTE FUNCTION update_library_resource_categories_updated_at();

CREATE OR REPLACE FUNCTION update_library_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_library_resources_updated_at
  BEFORE UPDATE ON public.library_resources
  FOR EACH ROW EXECUTE FUNCTION update_library_resources_updated_at();

-- RLS Policies
ALTER TABLE public.library_resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_resource_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_library_resources ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view active library resources in their tenant
CREATE POLICY lib_res_cat_select ON public.library_resource_categories
  FOR SELECT USING (true);

CREATE POLICY lib_res_select ON public.library_resources
  FOR SELECT USING (true);

CREATE POLICY lib_res_ver_select ON public.library_resource_versions
  FOR SELECT USING (true);

CREATE POLICY clr_select ON public.course_library_resources
  FOR SELECT USING (true);

-- Staff can manage library resources
CREATE POLICY lib_res_cat_all ON public.library_resource_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer')
    )
  );

CREATE POLICY lib_res_all ON public.library_resources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer')
    )
  );

CREATE POLICY lib_res_ver_all ON public.library_resource_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer')
    )
  );

CREATE POLICY clr_all ON public.course_library_resources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer')
    )
  );

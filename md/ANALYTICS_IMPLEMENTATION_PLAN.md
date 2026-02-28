# Advanced Analytics & BI Implementation Plan

## 🛡️ Safety-First Approach

This plan ensures we add comprehensive analytics **without touching existing functionality**. All changes are **additive only** and can be safely disabled if needed.

---

## 📋 Architecture Overview

### Design Principles
1. **Read-Only Analytics**: Never modify existing tables or data
2. **Separate Schema**: All analytics in dedicated `analytics_*` tables
3. **New Routes Only**: Analytics API routes don't conflict with existing ones
4. **Feature Flag**: Can be enabled/disabled without breaking the app
5. **Incremental Rollout**: Start simple, add complexity gradually
6. **Use Existing Data**: Leverage `student_activity_log` table (already exists!)

---

## 🗄️ Step 1: Database Schema (Safe - Read Only)

### Create Analytics Tables (Separate Namespace)

```sql
-- analytics_metrics: Pre-aggregated metrics for fast queries
CREATE TABLE IF NOT EXISTS analytics_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL, -- 'daily_active_users', 'course_completion', etc.
  metric_date DATE NOT NULL,
  metric_value JSONB NOT NULL, -- Flexible JSON for different metric types
  dimensions JSONB DEFAULT '{}'::jsonb, -- Filters like course_id, user_role, etc.
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(metric_type, metric_date, dimensions)
);

CREATE INDEX idx_analytics_metrics_type_date ON analytics_metrics(metric_type, metric_date DESC);
CREATE INDEX idx_analytics_metrics_dimensions ON analytics_metrics USING GIN (dimensions);

-- analytics_dashboards: User-saved dashboard configurations
CREATE TABLE IF NOT EXISTS analytics_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  config JSONB NOT NULL, -- Widget positions, filters, etc.
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_analytics_dashboards_user ON analytics_dashboards(user_id);

-- analytics_reports: Scheduled or saved reports
CREATE TABLE IF NOT EXISTS analytics_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL, -- 'user_engagement', 'course_performance', etc.
  config JSONB NOT NULL, -- Filters, date ranges, columns
  schedule JSONB, -- For scheduled reports (cron expression)
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins and instructors can view analytics
CREATE POLICY "Admins can view analytics metrics" ON analytics_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
    )
  );

CREATE POLICY "Users can manage own dashboards" ON analytics_dashboards
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own reports" ON analytics_reports
  FOR ALL
  USING (created_by = auth.uid());
```

**Why This Is Safe:**
- ✅ New tables only, no changes to existing tables
- ✅ Read-only access to existing tables via views
- ✅ Can be dropped without affecting core functionality
- ✅ RLS policies protect data access

---

## 📊 Step 2: Materialized Views for Performance

Create materialized views that aggregate from existing tables without modifying them:

```sql
-- Materialized view for daily active users
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_daily_active_users AS
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT student_id) as active_users,
  COUNT(*) as total_activities
FROM student_activity_log
GROUP BY DATE(created_at);

CREATE INDEX idx_analytics_dau_date ON analytics_daily_active_users(date DESC);

-- Materialized view for course engagement
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_course_engagement AS
SELECT 
  course_id,
  COUNT(DISTINCT student_id) as active_students,
  COUNT(*) as total_interactions,
  COUNT(DISTINCT DATE(created_at)) as active_days,
  DATE(created_at) as date
FROM student_activity_log
WHERE course_id IS NOT NULL
GROUP BY course_id, DATE(created_at);

CREATE INDEX idx_analytics_course_engagement_course ON analytics_course_engagement(course_id, date DESC);

-- Refresh function (run periodically via cron or scheduled job)
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_active_users;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_course_engagement;
END;
$$ LANGUAGE plpgsql;
```

**Why This Is Safe:**
- ✅ Views are read-only from source tables
- ✅ Can refresh without locking
- ✅ Drop views anytime without data loss

---

## 🛣️ Step 3: New API Routes (No Conflicts)

### Structure: `/app/api/analytics/`

```
app/api/analytics/
├── route.ts                    # List available analytics
├── metrics/
│   ├── route.ts                # GET metrics
│   └── [metricType]/route.ts   # Specific metric type
├── dashboards/
│   ├── route.ts                # CRUD dashboards
│   └── [id]/route.ts           # Single dashboard
├── reports/
│   ├── route.ts                # List reports
│   └── [id]/route.ts           # Single report
└── export/
    └── route.ts                # Export analytics data
```

**Example: `/app/api/analytics/metrics/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins/instructors
    if (!['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const metricType = searchParams.get('type'); // 'dau', 'course_engagement', etc.
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const courseId = searchParams.get('course_id');

    // Query from materialized views (fast) or activity log (slower but always fresh)
    if (metricType === 'dau') {
      const { data, error } = await supabase
        .from('analytics_daily_active_users') // Materialized view
        .select('*')
        .gte('date', startDate || '2024-01-01')
        .lte('date', endDate || new Date().toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;
      return NextResponse.json({ data });
    }

    // More metric types...
    return NextResponse.json({ error: "Invalid metric type" }, { status: 400 });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Why This Is Safe:**
- ✅ New routes under `/api/analytics/` - no conflicts
- ✅ Uses existing authentication/authorization
- ✅ Read-only queries
- ✅ Can return 404 if analytics disabled

---

## 🎨 Step 4: New Analytics Page (Additive)

### Create: `/app/admin/analytics/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AnalyticsPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Feature flag check - can disable analytics
    const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'false';
    
    if (!analyticsEnabled) {
      router.push('/dashboard');
      return;
    }

    // Fetch analytics data
    fetch('/api/analytics/metrics?type=dau')
      .then(res => res.json())
      .then(data => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Analytics error:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading analytics...</div>;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>
      
      {/* Charts and widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Chart components */}
      </div>
    </div>
  );
}
```

**Why This Is Safe:**
- ✅ New page route - doesn't affect existing pages
- ✅ Feature flag for easy disable
- ✅ Can navigate away if analytics unavailable
- ✅ No changes to existing dashboard

---

## 🔧 Step 5: Scheduled Job for Pre-aggregation

### Option A: Supabase Edge Functions (Recommended)

Create a scheduled function to refresh materialized views:

```sql
-- Schedule via pg_cron (if available) or external cron
SELECT cron.schedule(
  'refresh-analytics-daily',
  '0 2 * * *', -- 2 AM daily
  $$SELECT refresh_analytics_views();$$
);
```

Or use Supabase Edge Functions with cron triggers:

```typescript
// supabase/functions/refresh-analytics/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Refresh materialized views
  await supabase.rpc('refresh_analytics_views');

  return new Response('Analytics refreshed', { status: 200 });
});
```

**Why This Is Safe:**
- ✅ Runs independently
- ✅ Doesn't affect user-facing features
- ✅ Can fail without breaking the app
- ✅ Can be disabled easily

---

## 📈 Step 6: Dashboard Component Integration

### Add Analytics Widget to Existing Dashboard (Optional Enhancement)

```typescript
// app/components/AnalyticsWidget.tsx
'use client';

export default function AnalyticsWidget({ userRole }: { userRole: string }) {
  // Only show to admins/instructors
  if (!['admin', 'super_admin', 'instructor'].includes(userRole)) {
    return null;
  }

  return (
    <Link href="/admin/analytics" className="...">
      View Analytics →
    </Link>
  );
}
```

Then add to existing dashboard:

```typescript
// app/dashboard/page.tsx (add this line, no other changes needed)
{role === 'admin' && <AnalyticsWidget userRole={role} />}
```

**Why This Is Safe:**
- ✅ Single line addition
- ✅ Component handles its own visibility
- ✅ Links to new page (doesn't modify existing dashboard logic)

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1) - **SAFE TO START**
1. ✅ Create analytics tables (SQL migration)
2. ✅ Create materialized views
3. ✅ Create basic API route (`/api/analytics/metrics`)
4. ✅ Test with existing `student_activity_log` data

**Risk**: None - Only adds new tables and routes

### Phase 2: Basic Dashboard (Week 2) - **SAFE TO ADD**
1. ✅ Create `/admin/analytics` page
2. ✅ Add basic charts (using Chart.js or Recharts)
3. ✅ Display daily active users
4. ✅ Display course engagement

**Risk**: None - New page only, no existing code changes

### Phase 3: Advanced Metrics (Week 3) - **SAFE TO EXPAND**
1. ✅ Add more metric types
2. ✅ Add date range filtering
3. ✅ Add course-specific analytics
4. ✅ Add export functionality

**Risk**: Low - Only adding to existing analytics routes

### Phase 4: Predictive Analytics (Week 4+) - **OPTIONAL**
1. ⚠️ Machine learning models (separate service)
2. ⚠️ At-risk student detection
3. ⚠️ Completion prediction

**Risk**: Medium - Requires ML integration, but still isolated

---

## 🛡️ Safety Mechanisms

### 1. Feature Flag
```typescript
// Can disable analytics globally
const ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'false';

if (!ANALYTICS_ENABLED) {
  return null; // Component doesn't render
}
```

### 2. Graceful Degradation
```typescript
try {
  const data = await fetchAnalytics();
} catch (error) {
  // Analytics failed, but app still works
  console.error('Analytics unavailable:', error);
  return <AnalyticsUnavailable />;
}
```

### 3. Read-Only Access
- Analytics never writes to core tables
- Only reads from existing data
- Uses materialized views for performance

### 4. Rollback Plan
If anything goes wrong:
```sql
-- Drop analytics tables (doesn't affect core functionality)
DROP TABLE IF EXISTS analytics_metrics CASCADE;
DROP TABLE IF EXISTS analytics_dashboards CASCADE;
DROP MATERIALIZED VIEW IF EXISTS analytics_daily_active_users;
```

Then remove route and page - app works normally.

---

## 📦 Dependencies to Add

```json
{
  "dependencies": {
    "recharts": "^2.10.0", // For charts
    "date-fns": "^2.30.0"   // For date handling
  }
}
```

**Why This Is Safe:**
- ✅ Chart libraries don't conflict with existing code
- ✅ Date utilities are standard
- ✅ Can remove if needed

---

## ✅ Testing Strategy

### 1. Unit Tests
- Test analytics API routes in isolation
- Test metric calculations
- Test date range filtering

### 2. Integration Tests
- Test analytics page renders correctly
- Test with different user roles
- Test feature flag disabling

### 3. Performance Tests
- Materialized views refresh time
- Query performance with large datasets
- Dashboard load time

### 4. Safety Tests
- Verify no writes to core tables
- Verify existing functionality unchanged
- Verify rollback works

---

## 🎯 Success Criteria

✅ **Zero Breaking Changes**
- All existing features work
- No existing API routes modified
- No existing pages modified (except optional widget)

✅ **Analytics Functional**
- Metrics display correctly
- Dashboards save/load
- Reports generate

✅ **Performance**
- Analytics queries < 2 seconds
- Materialized views refresh < 30 seconds
- Dashboard loads < 3 seconds

✅ **Rollback Ready**
- Can disable analytics instantly
- Can drop tables safely
- App continues working

---

## 📝 Summary: Why This Won't Break Your App

1. **Separate Namespace**: All analytics in `analytics_*` tables
2. **Read-Only**: Never modifies existing tables
3. **New Routes**: `/api/analytics/*` doesn't conflict
4. **New Page**: `/admin/analytics` is isolated
5. **Feature Flag**: Can disable without code changes
6. **Graceful Failures**: App works even if analytics fails
7. **Easy Rollback**: Drop tables, remove route, done

**The core app remains untouched. Analytics is an add-on layer that can be safely added or removed.**

---

## 🚦 Ready to Start?

**Step 1**: Run the SQL migration (creates tables, no risk)
**Step 2**: Create the first API route (test in isolation)
**Step 3**: Create the analytics page (test separately)
**Step 4**: Gradually add more features

Each step can be tested independently and rolled back if needed!


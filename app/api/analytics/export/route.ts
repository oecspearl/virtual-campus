import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { getCurrentUser } from "@/lib/database-helpers";

/**
 * Analytics Export API
 * 
 * GET /api/analytics/export?type={metricType}&format=csv
 * 
 * Exports analytics data as CSV for download
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedRoles = ['admin', 'super_admin', 'instructor', 'curriculum_designer'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const metricType = searchParams.get('type');
    const format = searchParams.get('format') || 'csv';
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];

    if (!metricType) {
      return NextResponse.json({ error: "Metric type is required" }, { status: 400 });
    }

    // Fetch the metric data
    const metricsUrl = new URL('/api/analytics/metrics', request.url);
    metricsUrl.searchParams.set('type', metricType);
    metricsUrl.searchParams.set('start_date', startDate);
    metricsUrl.searchParams.set('end_date', endDate);

    const metricsRes = await fetch(metricsUrl.toString(), {
      headers: {
        'Cookie': request.headers.get('Cookie') || '',
      },
    });

    const metricsData = await metricsRes.json();

    if (metricsData.error) {
      return NextResponse.json({ error: metricsData.error }, { status: 500 });
    }

    // Convert to CSV
    if (format === 'csv') {
      const data = metricsData.data || [];
      
      if (data.length === 0) {
        return new NextResponse('No data available', {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${metricType}_${startDate}_to_${endDate}.csv"`,
          },
        });
      }

      // Get all unique keys from the data
      const allKeys = new Set<string>();
      data.forEach((item: any) => {
        Object.keys(item).forEach(key => allKeys.add(key));
      });

      const headers = Array.from(allKeys);
      const csvRows = [
        headers.join(','), // Header row
        ...data.map((row: any) =>
          headers.map(header => {
            const value = row[header];
            // Handle null/undefined
            if (value === null || value === undefined) return '';
            // Handle objects/arrays - stringify them
            if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
            // Handle strings with commas - wrap in quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        ),
      ];

      const csvContent = csvRows.join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${metricType}_${startDate}_to_${endDate}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format. Use format=csv" }, { status: 400 });

  } catch (error: any) {
    console.error('Analytics export error:', error);
    return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 });
  }
}

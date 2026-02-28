/**
 * Performance Analytics API Endpoint
 * 
 * Receives and stores performance metrics from the client
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

export async function POST(request: NextRequest) {
    try {
        const metric = await request.json();

        // Validate metric data
        if (!metric.name || typeof metric.value !== 'number') {
            return NextResponse.json(
                { error: 'Invalid metric data' },
                { status: 400 }
            );
        }

        // Log performance metrics (can be stored in database later)
        if (process.env.NODE_ENV === 'production') {
            console.log('[Performance Metric]', {
                name: metric.name,
                value: metric.value,
                timestamp: metric.timestamp,
                metadata: metric.metadata,
            });

            // Optional: Store in Supabase for analytics
            // Note: Uncomment when performance_metrics table is created
            // try {
            //   const tenantId = getTenantIdFromRequest(request);
            //   const tq = createTenantQuery(tenantId);
            //   await tq.from('performance_metrics').insert({
            //     metric_name: metric.name,
            //     metric_value: metric.value,
            //     metadata: metric.metadata,
            //     created_at: new Date(metric.timestamp),
            //   });
            // } catch (dbError) {
            //   console.error('[Performance API] Database error:', dbError);
            // }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Performance API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to record metric' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        // Return performance statistics
        // This would query your analytics database

        return NextResponse.json({
            message: 'Performance analytics endpoint',
            endpoints: {
                POST: 'Submit performance metrics',
                GET: 'Retrieve performance statistics',
            },
        });
    } catch (error) {
        console.error('[Performance API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to retrieve statistics' },
            { status: 500 }
        );
    }
}

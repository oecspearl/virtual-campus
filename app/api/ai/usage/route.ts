import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get today's usage - handle case where function might not exist or return empty
    let todayUsageData = { api_calls: 0, tokens_used: 0, cost_usd: 0 };
    try {
      const { data: todayUsage, error: todayError } = await tq.raw
        .rpc('get_user_ai_usage_today', { user_uuid: user.id });

      if (todayError) {
        console.error('Error fetching today\'s usage:', todayError);
        // If function doesn't exist, use default values
        if (todayError.code === '42883' || todayError.message?.includes('does not exist')) {
          console.warn('get_user_ai_usage_today function not found, using defaults');
        } else {
          // For other errors, still use defaults but log the error
          console.warn('Error fetching today\'s usage, using defaults:', todayError.message);
        }
      } else if (todayUsage && todayUsage.length > 0) {
        todayUsageData = todayUsage[0];
      }
    } catch (error: any) {
      console.error('Exception fetching today\'s usage:', error);
      // Continue with default values
    }

    // Get usage for the last 7 days
    const { data: weeklyUsage, error: weeklyError } = await tq
      .from('ai_usage_tracking')
      .select('date, api_calls, tokens_used, cost_usd')
      .eq('user_id', user.id)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (weeklyError) {
      console.error('Error fetching weekly usage:', weeklyError);
      return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
    }

    // Calculate totals
    const totalUsage = weeklyUsage?.reduce((acc, day) => ({
      api_calls: acc.api_calls + day.api_calls,
      tokens_used: acc.tokens_used + day.tokens_used,
      cost_usd: acc.cost_usd + parseFloat(day.cost_usd.toString())
    }), { api_calls: 0, tokens_used: 0, cost_usd: 0 }) || { api_calls: 0, tokens_used: 0, cost_usd: 0 };

    // Get usage limits (you can configure these based on user role)
    const usageLimits = {
      daily_api_calls: 100,
      daily_tokens: 10000,
      daily_cost_usd: 5.00
    };

    return NextResponse.json({
      today: {
        ...todayUsageData,
        limits: usageLimits,
        percentage_used: {
          api_calls: Math.min((todayUsageData.api_calls / usageLimits.daily_api_calls) * 100, 100),
          tokens: Math.min((todayUsageData.tokens_used / usageLimits.daily_tokens) * 100, 100),
          cost: Math.min((todayUsageData.cost_usd / usageLimits.daily_cost_usd) * 100, 100)
        }
      },
      weekly: {
        total: totalUsage,
        daily_breakdown: weeklyUsage || []
      },
      limits: usageLimits
    });

  } catch (error) {
    console.error('AI Usage API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

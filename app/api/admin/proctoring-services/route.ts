import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';

// GET - List all proctoring services
export async function GET(request: NextRequest) {
  try {
    const { success, user, userProfile, error: authError } = await authenticateUser(request);
    if (!success || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!userProfile || !['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: services, error } = await tq
      .from('proctoring_services')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching proctoring services:', error);
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
    }

    // Don't expose API keys in the response, just indicate if they're set
    const sanitizedServices = services?.map(service => ({
      ...service,
      api_key: service.api_key ? '••••••••' : null,
      has_api_key: !!service.api_key
    }));

    return NextResponse.json({ services: sanitizedServices || [] });
  } catch (error) {
    console.error('Proctoring services GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new proctoring service
export async function POST(request: NextRequest) {
  try {
    const { success, user, userProfile, error: authError } = await authenticateUser(request);
    if (!success || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!userProfile || !['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const body = await request.json();
    const {
      name,
      display_name,
      service_type,
      api_endpoint,
      api_key,
      configuration,
      is_active
    } = body;

    if (!name || !display_name || !service_type) {
      return NextResponse.json({ error: 'Name, display name, and service type are required' }, { status: 400 });
    }

    const { data: service, error } = await tq
      .from('proctoring_services')
      .insert({
        name,
        display_name,
        service_type,
        api_endpoint: api_endpoint || null,
        api_key: api_key || null,
        configuration: configuration || {},
        is_active: is_active ?? true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating proctoring service:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A service with this name already exists' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
    }

    // Sanitize response
    const sanitizedService = {
      ...service,
      api_key: service.api_key ? '••••••••' : null,
      has_api_key: !!service.api_key
    };

    return NextResponse.json({ service: sanitizedService }, { status: 201 });
  } catch (error) {
    console.error('Proctoring services POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a proctoring service
export async function PUT(request: NextRequest) {
  try {
    const { success, user, userProfile, error: authError } = await authenticateUser(request);
    if (!success || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!userProfile || !['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
    }

    // If api_key is the masked value, don't update it
    if (updates.api_key === '••••••••') {
      delete updates.api_key;
    }

    const { data: service, error } = await tq
      .from('proctoring_services')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating proctoring service:', error);
      return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
    }

    // Sanitize response
    const sanitizedService = {
      ...service,
      api_key: service.api_key ? '••••••••' : null,
      has_api_key: !!service.api_key
    };

    return NextResponse.json({ service: sanitizedService });
  } catch (error) {
    console.error('Proctoring services PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a proctoring service
export async function DELETE(request: NextRequest) {
  try {
    const { success, user, userProfile, error: authError } = await authenticateUser(request);
    if (!success || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!userProfile || !['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
    }

    const { error } = await tq
      .from('proctoring_services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting proctoring service:', error);
      return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Proctoring services DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

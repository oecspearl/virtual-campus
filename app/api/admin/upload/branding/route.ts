import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

// POST - Upload branding image
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'tenant_admin', 'curriculum_designer'])) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get('file') as File | null;
    const imageType = form.get('imageType') as string; // 'logo', 'logo_header', 'homepage_background', 'favicon'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type (images only)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only images (JPEG, PNG, WebP, GIF, SVG) are allowed.' 
      }, { status: 400 });
    }

    // File size limit (5MB for branding images)
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 413 });
    }

    const tenantId = getTenantIdFromRequest(request, authResult.userProfile.role);
    const tq = createTenantQuery(tenantId);

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || 'png';
    const fileName = `branding/${imageType || 'image'}-${timestamp}-${randomString}.${fileExtension}`;

    // Check if bucket exists, if not try to create it or use alternative bucket
    let bucketName = 'course-materials';
    try {
      const { data: buckets, error: listError } = await tq.raw.storage.listBuckets();
      if (listError) {
        console.error('Error listing buckets:', listError);
      } else {
        const bucketExists = buckets?.some(b => b.name === bucketName);
        if (!bucketExists) {
          // Try to create the bucket
          const { error: createError } = await tq.raw.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 52428800, // 50MB
          });
          if (createError) {
            console.warn('Could not create bucket, trying public bucket:', createError);
            // Try public bucket as fallback
            bucketName = 'public';
          }
        }
      }
    } catch (error) {
      console.warn('Error checking buckets, proceeding with default:', error);
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await tq.raw.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      // Provide more detailed error message
      const errorMessage = uploadError.message || 'File upload failed';
      return NextResponse.json({ 
        error: 'File upload failed',
        details: errorMessage,
        bucket: bucketName
      }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = tq.raw.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    // Update the corresponding setting in site_settings
    if (imageType) {
      const settingKeyMap: Record<string, string> = {
        'logo': 'logo_url',
        'logo_header': 'logo_header_url',
        'homepage_background': 'homepage_header_background',
        'favicon': 'favicon_url'
      };

      const settingKey = settingKeyMap[imageType];
      if (settingKey) {
        await tq
          .from('site_settings')
          .upsert({
            setting_key: settingKey,
            setting_value: urlData.publicUrl,
            setting_type: 'image',
            updated_by: authResult.user?.id,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'tenant_id,setting_key'
          });
      }
    }

    return NextResponse.json({
      url: urlData.publicUrl,
      fileName: fileName,
      size: file.size,
      type: file.type
    });
  } catch (error: any) {
    console.error('Branding upload error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message || 'Unknown error occurred'
    }, { status: 500 });
  }
}


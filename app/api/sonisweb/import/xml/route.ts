import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { getTenantIdFromRequest } from '@/lib/tenant-query';
import { importIMSEnterpriseXML } from '@/lib/sonisweb/xml-import';

export const maxDuration = 300; // 5 minutes for large files

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }
    const { userProfile } = authResult;

    if (!hasRole(userProfile.role, ['admin', 'tenant_admin', 'super_admin'])) {
      return createAuthResponse('Forbidden: Admin access required', 403);
    }

    const tenantId = getTenantIdFromRequest(request);

    const formData = await request.formData();
    const file = formData.get('xml') as File;

    if (!file) {
      return NextResponse.json({ error: 'No XML file provided' }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xml')) {
      return NextResponse.json({ error: 'Only XML files are allowed' }, { status: 400 });
    }

    // Validate file size (50MB limit for large institution exports)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 50MB' }, { status: 400 });
    }

    const xmlContent = await file.text();

    // Basic sanity check
    if (!xmlContent.includes('<enterprise') && !xmlContent.includes('<Enterprise')) {
      return NextResponse.json({ error: 'Invalid IMS Enterprise XML: missing <enterprise> element' }, { status: 400 });
    }

    // Parse import options from form data
    const options = {
      createUsers: formData.get('createUsers') !== 'false',
      createCourses: formData.get('createCourses') !== 'false',
      createEnrollments: formData.get('createEnrollments') !== 'false',
      defaultStudentRole: (formData.get('defaultStudentRole') as string) || 'student',
      defaultInstructorRole: (formData.get('defaultInstructorRole') as string) || 'instructor',
      authFlow: (formData.get('authFlow') as 'welcome_email' | 'sso_passthrough') || 'welcome_email',
      publishCourses: formData.get('publishCourses') === 'true',
      defaultModality: (formData.get('defaultModality') as string) || 'online',
      semester: (formData.get('semester') as string) || '',
    };

    const result = await importIMSEnterpriseXML(xmlContent, tenantId, options);

    return NextResponse.json(result, {
      status: result.status === 'failed' ? 500 : 200,
    });
  } catch (error) {
    console.error('XML import error:', error);
    return NextResponse.json(
      { error: 'Failed to process XML file', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

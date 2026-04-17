import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { generateScormPackage } from '@/lib/scorm/generator';
import type { SCORMBuilderData } from '@/lib/scorm/types';
import { DEFAULT_SETTINGS } from '@/lib/scorm/types';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // ─── Auth ──────────────────────────────────────────────────────────────
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const allowedRoles = ['instructor', 'curriculum_designer', 'admin', 'super_admin', 'tenant_admin'];
    if (!allowedRoles.includes(user.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // ─── Parse body ────────────────────────────────────────────────────────
    const body = await request.json();
    const { lessonId, courseId, builderData } = body as {
      lessonId: string;
      courseId?: string;
      builderData: SCORMBuilderData;
    };

    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 });
    }
    if (!builderData || !builderData.title || !builderData.slides || builderData.slides.length === 0) {
      return NextResponse.json({ error: 'builderData with at least one slide is required' }, { status: 400 });
    }

    // Apply defaults to settings
    builderData.settings = { ...DEFAULT_SETTINGS, ...builderData.settings };

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = createServiceSupabaseClient();

    // ─── Verify lesson exists ──────────────────────────────────────────────
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title, course_id')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const finalCourseId = courseId || lesson.course_id;

    // ─── Generate SCORM ZIP ────────────────────────────────────────────────
    const zipBuffer = await generateScormPackage(builderData);

    // ─── Upload to Supabase Storage ────────────────────────────────────────
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const packageFolder = `scorm-packages/${timestamp}-${randomStr}`;

    // Upload the ZIP so it can be re-downloaded if needed
    const zipPath = `${packageFolder}/package.zip`;
    await serviceSupabase.storage
      .from('course-materials')
      .upload(zipPath, zipBuffer, { contentType: 'application/zip', cacheControl: '3600', upsert: false });

    // Also extract and upload individual files so the SCORM player can serve them
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(zipBuffer);
    const filePaths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);

    const uploadResults = await Promise.all(
      filePaths.map(async (filePath) => {
        const content = await zip.files[filePath].async('arraybuffer');
        const storagePath = `${packageFolder}/${filePath}`;
        const { error } = await serviceSupabase.storage
          .from('course-materials')
          .upload(storagePath, content, { contentType: 'application/octet-stream', cacheControl: '3600', upsert: false });
        return error ? null : storagePath;
      })
    );

    const uploadedCount = uploadResults.filter(Boolean).length;
    if (uploadedCount === 0) {
      return NextResponse.json({ error: 'Failed to upload generated package files' }, { status: 500 });
    }

    const packageUrl = `${packageFolder}/index.html`;

    // ─── Clean up previous SCORM package for this lesson ───────────────────
    const { data: existingPackage } = await serviceSupabase
      .from('scorm_packages')
      .select('id, package_url')
      .eq('lesson_id', lessonId)
      .single();

    if (existingPackage?.package_url) {
      const oldFolder = existingPackage.package_url.split('/').slice(0, 2).join('/');
      const { data: oldFiles } = await serviceSupabase.storage.from('course-materials').list(oldFolder);
      if (oldFiles && oldFiles.length > 0) {
        await serviceSupabase.storage.from('course-materials').remove(oldFiles.map((f) => `${oldFolder}/${f.name}`));
      }
    }

    // ─── Upsert scorm_packages record ──────────────────────────────────────
    const packageData = {
      lesson_id: lessonId,
      course_id: finalCourseId,
      title: builderData.title,
      description: builderData.description || `Generated SCORM package with ${builderData.slides.length} slide(s)`,
      scorm_version: '2004' as const,
      package_url: packageUrl,
      manifest_xml: '', // Generated manifest is inside the ZIP
      package_size: zipBuffer.length,
      identifier: `scorm-gen-${timestamp}`,
      created_by: user.id,
    };

    let scormPackage;
    if (existingPackage) {
      const { data, error } = await serviceSupabase
        .from('scorm_packages')
        .update(packageData)
        .eq('id', existingPackage.id)
        .select()
        .single();
      if (error) throw error;
      scormPackage = data;
    } else {
      const { data, error } = await serviceSupabase
        .from('scorm_packages')
        .insert([packageData])
        .select()
        .single();
      if (error) throw error;
      scormPackage = data;
    }

    // ─── Update lesson content_type ────────────────────────────────────────
    await serviceSupabase.from('lessons').update({ content_type: 'scorm' }).eq('id', lessonId);

    // ─── Store builder source data so it can be re-edited ──────────────────
    // We store it as a JSON file alongside the package
    const sourceDataPath = `${packageFolder}/builder-source.json`;
    await serviceSupabase.storage
      .from('course-materials')
      .upload(sourceDataPath, JSON.stringify(builderData), {
        contentType: 'application/json',
        cacheControl: '3600',
        upsert: false,
      });

    return NextResponse.json({
      success: true,
      scormPackage: {
        id: scormPackage.id,
        lesson_id: lessonId,
        title: builderData.title,
        scorm_version: '2004',
        package_url: packageUrl,
        package_size: zipBuffer.length,
        files_extracted: uploadedCount,
      },
    });
  } catch (error: any) {
    console.error('SCORM generate error:', error);
    return NextResponse.json({ error: 'Failed to generate SCORM package' }, { status: 500 });
  }
}

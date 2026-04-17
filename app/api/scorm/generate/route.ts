import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { buildManifestXml } from '@/lib/scorm/manifest-builder';
import { generateIndexHtml, generateStyleCss } from '@/lib/scorm/templates/slide-quiz';
import { getScormRuntimeJs } from '@/lib/scorm/templates/base-runtime';
import type { SCORMBuilderData } from '@/lib/scorm/types';
import { DEFAULT_SETTINGS } from '@/lib/scorm/types';

export const maxDuration = 30;
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

    // ─── Generate files in memory (no ZIP round-trip) ──────────────────────
    const files: { name: string; content: string; contentType: string }[] = [
      { name: 'imsmanifest.xml', content: buildManifestXml(builderData), contentType: 'application/xml' },
      { name: 'index.html', content: generateIndexHtml(builderData), contentType: 'text/html; charset=utf-8' },
      { name: 'style.css', content: generateStyleCss(builderData.settings.accentColor), contentType: 'text/css' },
      { name: 'scorm-api.js', content: getScormRuntimeJs(), contentType: 'application/javascript' },
      { name: 'builder-source.json', content: JSON.stringify(builderData), contentType: 'application/json' },
    ];

    // ─── Upload directly to Supabase Storage ───────────────────────────────
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const packageFolder = `scorm-packages/${timestamp}-${randomStr}`;

    const uploadResults = await Promise.all(
      files.map(async (file) => {
        const storagePath = `${packageFolder}/${file.name}`;
        const { error } = await serviceSupabase.storage
          .from('course-materials')
          .upload(storagePath, file.content, {
            contentType: file.contentType,
            cacheControl: '3600',
            upsert: false,
          });
        return error ? null : storagePath;
      })
    );

    const uploadedCount = uploadResults.filter(Boolean).length;
    if (uploadedCount === 0) {
      return NextResponse.json({ error: 'Failed to upload generated package files' }, { status: 500 });
    }

    const packageUrl = `${packageFolder}/index.html`;
    const totalSize = files.reduce((sum, f) => sum + f.content.length, 0);

    // ─── Clean up previous SCORM package for this lesson ───────────────────
    const { data: existingPackage } = await serviceSupabase
      .from('scorm_packages')
      .select('id, package_url')
      .eq('lesson_id', lessonId)
      .single();

    if (existingPackage?.package_url) {
      // package_url is a storage path like scorm-packages/xxx/index.html
      const oldFolder = existingPackage.package_url.split('/').slice(0, -1).join('/');
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
      manifest_xml: files[0].content,
      package_size: totalSize,
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

    return NextResponse.json({
      success: true,
      scormPackage: {
        id: scormPackage.id,
        lesson_id: lessonId,
        title: builderData.title,
        scorm_version: '2004',
        package_url: packageUrl,
        package_size: totalSize,
        files_extracted: uploadedCount,
      },
    });
  } catch (error: any) {
    console.error('SCORM generate error:', error);
    return NextResponse.json({ error: 'Failed to generate SCORM package' }, { status: 500 });
  }
}

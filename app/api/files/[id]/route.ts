import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from "@/lib/supabase-server";
import { authenticateUser } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

const STAFF_ROLES = [
  'admin',
  'super_admin',
  'tenant_admin',
  'curriculum_designer',
  'instructor',
] as const;

const BUCKET = 'course-materials';

/**
 * Extract the in-bucket storage path from a Supabase storage URL.
 *
 * Public URL  : .../storage/v1/object/public/<bucket>/<path>
 * Signed URL  : .../storage/v1/object/sign/<bucket>/<path>?token=...
 * Authenticated: .../storage/v1/object/authenticated/<bucket>/<path>
 *
 * Returns null when the URL doesn't reference our bucket — caller can
 * fall back to "use whatever was stored verbatim" if appropriate, but
 * for our case we just 404.
 */
function extractStoragePath(rawUrl: string, bucket: string): string | null {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    const bucketIdx = parts.indexOf(bucket);
    if (bucketIdx === -1 || bucketIdx === parts.length - 1) return null;
    return parts.slice(bucketIdx + 1).join('/');
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params;
    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 });
    }

    // Auth gate. The previous version of this route had no auth check,
    // so any caller with a file id could download any file. Require a
    // valid user, then check ownership / staff role below.
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = authResult.userProfile!;

    const serviceSupabase = createServiceSupabaseClient();

    const { data: fileRecord, error: dbError } = await serviceSupabase
      .from('files')
      .select('id, name, type, size, url, uploaded_by')
      .eq('id', fileId)
      .single();

    if (dbError || !fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Access control: uploader or staff. This is the conservative gate
    // — every other case (course members, peer reviewers) currently
    // funnels through the same upload pipeline, so the uploader is
    // typically the student who needs to read it back, plus staff.
    // Tightening further (e.g. by submission_id context) is a follow-up.
    const isOwner = fileRecord.uploaded_by === user.id;
    const isStaff = hasRole(user.role, [...STAFF_ROLES]);
    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // The original implementation called .split('/').pop() on the
    // stored URL to derive the storage key, which dropped the
    // `assignment-submissions/` prefix and made every download 404.
    // Use a proper URL parser that finds the bucket boundary and
    // takes everything after it.
    const storagePath = extractStoragePath(fileRecord.url, BUCKET);
    if (!storagePath) {
      console.error('[files] Could not extract storage path from URL:', fileRecord.url);
      return NextResponse.json(
        { error: 'File path malformed' },
        { status: 500 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: fileData, error: storageError } = await supabase.storage
      .from(BUCKET)
      .download(storagePath);

    if (storageError || !fileData) {
      console.error('[files] Storage download failed for', storagePath, storageError);
      return NextResponse.json(
        { error: 'File not found in storage' },
        { status: 404 }
      );
    }

    const buffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': fileRecord.type || 'application/octet-stream',
        'Content-Length': String(fileRecord.size ?? uint8Array.byteLength),
        'Content-Disposition': `inline; filename="${fileRecord.name.replace(/"/g, '\\"')}"`,
        // Authorised access — don't let intermediaries cache.
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('File serving error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

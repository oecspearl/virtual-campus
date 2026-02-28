import { NextRequest, NextResponse } from 'next/server';
import { uploadDocument } from '@/lib/admissions/admission-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const applicationId = formData.get('application_id') as string | null;
    const fieldId = formData.get('field_id') as string | null;

    if (!file || !applicationId || !fieldId) {
      return NextResponse.json({ error: 'file, application_id, and field_id are required' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    const result = await uploadDocument(applicationId, fieldId, file);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ document: result.document }, { status: 201 });
  } catch (error) {
    console.error('Public upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

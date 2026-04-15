import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
    try {
        const tenantId = getTenantIdFromRequest(request);
        const tq = createTenantQuery(tenantId);
        const authResult = await authenticateUser(request);
        if (!authResult.success) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        const user = authResult.user;

        const { searchParams } = new URL(request.url);
        const meetingID = searchParams.get('meetingID');

        if (!meetingID) {
            return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
        }

        // BBB Configuration
        const BBB_URL = process.env.BBB_URL || 'https://test-install.blindsidenetworks.com/bigbluebutton/';
        const BBB_SECRET = process.env.BBB_SECRET || '8cd8ef52e8e101574e400365b55e11a6';

        // 1. Fetch conference details to get title and role
        const { data: conference, error: confError } = await tq
            .from('video_conferences')
            .select('*')
            .eq('meeting_id', meetingID)
            .single();

        if (confError || !conference) {
            return NextResponse.json({ error: 'Conference not found' }, { status: 404 });
        }

        // Determine Role and Password
        const isInstructor = conference.instructor_id === user.id;
        // We'll use simple default passwords if not stored
        const moderatorPW = conference.bbb_moderator_pw || 'mp';
        const attendeePW = conference.bbb_attendee_pw || 'ap';

        const password = isInstructor ? moderatorPW : attendeePW;
        const fullName = user.user_metadata?.full_name || user.email || 'User';

        // 2. Create Meeting (Idempotent - ensures it exists)
        // Construct Create URL
        const createParams = new URLSearchParams({
            name: conference.title,
            meetingID: meetingID,
            attendeePW: attendeePW,
            moderatorPW: moderatorPW,
            record: conference.recording_enabled ? 'true' : 'false',
        });

        const createQuery = createParams.toString();
        const createChecksum = crypto.createHash('sha1').update('create' + createQuery + BBB_SECRET).digest('hex');
        const createUrl = `${BBB_URL}api/create?${createQuery}&checksum=${createChecksum}`;

        try {
            const createResponse = await fetch(createUrl);
            const createText = await createResponse.text();
            // We assume success or "idempotent" success.
            // If we really wanted to be sure, we'd parse the XML, but for now we proceed to join.
            console.log('BBB Create Response:', createText);
        } catch (err) {
            console.error('Error creating BBB meeting:', err);
            return NextResponse.json({ error: 'Failed to connect to BigBlueButton server' }, { status: 502 });
        }

        // 3. Generate Join URL
        const joinParams = new URLSearchParams({
            fullName: fullName,
            meetingID: meetingID,
            password: password,
            redirect: 'true'
        });

        const joinQuery = joinParams.toString();
        const joinChecksum = crypto.createHash('sha1').update('join' + joinQuery + BBB_SECRET).digest('hex');
        const joinUrl = `${BBB_URL}api/join?${joinQuery}&checksum=${joinChecksum}`;

        // 4. Redirect User
        return NextResponse.redirect(joinUrl);

    } catch (error) {
        console.error('Error in join-bbb route:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

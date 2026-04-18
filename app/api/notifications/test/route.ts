import { NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { isValidEmail } from '@/lib/validations';
import { sendEmail } from '@/lib/email-service';

/**
 * Test Email API
 *
 * POST /api/notifications/test
 *
 * Sends a test email to verify email configuration.
 */
export const POST = withTenantAuth(
  async ({ user, request }) => {
    try {
      const body = await request.json();
      const { to, subject, message } = body;

      if (!to || !isValidEmail(to)) {
        return NextResponse.json(
          { error: "Valid 'to' email address is required" },
          { status: 400 }
        );
      }

      const emailSubject = subject || 'Test Email from OECS Virtual Campus';
      const emailMessage =
        message ||
        `
        <h2>Test Email</h2>
        <p>This is a test email from OECS Virtual Campus to verify email configuration.</p>
        <p><strong>Sent by:</strong> ${user.name} (${user.email})</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p>If you received this email, your email notification system is working correctly! ✅</p>
        <hr>
        <p style="color: #666; font-size: 12px;">This is an automated test email. You can ignore it.</p>
      `;

      const result = await sendEmail({
        to,
        subject: emailSubject,
        html: emailMessage,
        text: `Test Email\n\n${emailMessage.replace(/<[^>]*>/g, '')}`,
        tags: [{ name: 'test_email', value: 'true' }],
      });

      if (!result.success) {
        const errorResponse: Record<string, unknown> = {
          success: false,
          error: result.error || 'Failed to send email',
          details: 'Check your RESEND_API_KEY and RESEND_FROM_EMAIL configuration',
        };
        if ((result as { suggestion?: string }).suggestion) {
          errorResponse.suggestion = (result as { suggestion?: string }).suggestion;
        }
        return NextResponse.json(errorResponse, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully!',
        messageId: result.messageId,
        sentTo: to,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Test email error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          message: error.message || String(error),
        },
        { status: 500 }
      );
    }
  },
  { requiredRoles: ['admin', 'super_admin'] }
);

/**
 * GET - Simple info about the test endpoint (public, no auth).
 */
export async function GET() {
  return NextResponse.json({
    message: 'Email Test Endpoint',
    description: 'POST to this endpoint to send a test email',
    usage: {
      method: 'POST',
      body: {
        to: 'test@example.com',
        subject: 'Optional custom subject',
        message: 'Optional custom message (HTML supported)',
      },
    },
    requirements: {
      authentication: 'Required (Admin or Super Admin)',
      environmentVariables: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL (optional, has default)'],
    },
  });
}

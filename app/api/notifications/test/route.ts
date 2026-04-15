import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import { sendEmail } from "@/lib/email-service";

/**
 * Test Email API
 * 
 * POST /api/notifications/test
 * 
 * Sends a test email to verify email configuration
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    // Only admins and super admins can test emails
    if (!hasRole(user.role, ["admin", "super_admin"])) {
      return createAuthResponse("Forbidden - Admin access required", 403);
    }

    const body = await request.json();
    const { to, subject, message } = body;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!to || !emailRegex.test(to)) {
      return NextResponse.json({ error: "Valid 'to' email address is required" }, { status: 400 });
    }

    // Prepare email content
    const emailSubject = subject || "Test Email from OECS Virtual Campus";
    const emailMessage = message || `
      <h2>Test Email</h2>
      <p>This is a test email from OECS Virtual Campus to verify email configuration.</p>
      <p><strong>Sent by:</strong> ${user.name} (${user.email})</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <p>If you received this email, your email notification system is working correctly! ✅</p>
      <hr>
      <p style="color: #666; font-size: 12px;">
        This is an automated test email. You can ignore it.
      </p>
    `;

    // Send email
    const result = await sendEmail({
      to: to,
      subject: emailSubject,
      html: emailMessage,
      text: `Test Email\n\n${emailMessage.replace(/<[^>]*>/g, '')}`,
      tags: [{ name: 'test_email', value: 'true' }],
    });

    if (!result.success) {
      const errorResponse: any = {
        success: false,
        error: result.error || "Failed to send email",
        details: "Check your RESEND_API_KEY and RESEND_FROM_EMAIL configuration"
      };
      
      // Add suggestion if domain verification error
      if ((result as any).suggestion) {
        errorResponse.suggestion = (result as any).suggestion;
      }
      
      return NextResponse.json(errorResponse, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully!",
      messageId: result.messageId,
      sentTo: to,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Test email error:', error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      message: error.message || String(error)
    }, { status: 500 });
  }
}

/**
 * GET - Simple info about test endpoint
 */
export async function GET() {
  return NextResponse.json({
    message: "Email Test Endpoint",
    description: "POST to this endpoint to send a test email",
    usage: {
      method: "POST",
      body: {
        to: "test@example.com",
        subject: "Optional custom subject",
        message: "Optional custom message (HTML supported)"
      }
    },
    requirements: {
      authentication: "Required (Admin or Super Admin)",
      environmentVariables: [
        "RESEND_API_KEY",
        "RESEND_FROM_EMAIL (optional, has default)"
      ]
    }
  });
}


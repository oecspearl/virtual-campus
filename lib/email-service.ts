/**
 * Email Service
 * 
 * Handles all email sending functionality using Resend
 * Supports transactional emails, templates, and digests
 */

import { Resend } from 'resend';

// Lazy initialization of Resend client (only when needed)
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface TemplateVariables {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Send a single email
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string; suggestion?: string }> {
  try {
    // If no API key, log and return (don't fail)
    const client = getResendClient();
    if (!client || !process.env.RESEND_API_KEY) {
      console.warn('Resend API key not configured. Email not sent:', options.subject);
      return { success: false, error: 'Email service not configured' };
    }

    // Check if using custom domain without verification
    const fromEmail = options.from || process.env.RESEND_FROM_EMAIL || 'OECS LearnBoard <notifications@oecslearning.org>';
    
    // If using custom domain, check if it's verified
    // For now, if error occurs, suggest using test domain
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      replyTo: options.replyTo,
      tags: options.tags,
    });

    if (error) {
      console.error('Resend error:', error);
      
      // Check if it's a domain verification or validation error
      if (error.message && (error.message.includes('domain is not verified') || 
                            error.message.includes('send testing emails to your own email'))) {
        const testDomain = 'onboarding@resend.dev';
        const errorMsg = error.message.includes('send testing emails') 
          ? 'Resend is in test mode - can only send to account owner email. Verify your domain to send to all recipients.'
          : 'Domain not verified';
        return { 
          success: false, 
          error: errorMsg,
          suggestion: `For testing, use: ${testDomain}. Update RESEND_FROM_EMAIL or verify your domain at https://resend.com/domains`
        };
      }
      
      // Check for rate limit errors
      if (error.statusCode === 429 || error.name === 'rate_limit_exceeded') {
        return {
          success: false,
          error: 'Rate limit exceeded. Resend allows 2 requests per second. Emails are being rate-limited automatically.',
        };
      }
      
      return { success: false, error: error.message || 'Failed to send email' };
    }

    return { success: true, messageId: data?.id };
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Send email to multiple recipients
 */
export async function sendBulkEmail(
  recipients: Array<{ email: string; variables?: TemplateVariables }>,
  template: { subject: string; html: string; text?: string },
  options?: { from?: string; tags?: Array<{ name: string; value: string }> }
): Promise<Array<{ email: string; success: boolean; error?: string }>> {
  const results = [];

  // Resend has a limit of 100 recipients per batch
  const batchSize = 100;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    for (const recipient of batch) {
      try {
        const personalizedHtml = replaceTemplateVariables(template.html, recipient.variables || {});
        const personalizedText = template.text ? replaceTemplateVariables(template.text, recipient.variables || {}) : undefined;
        const personalizedSubject = replaceTemplateVariables(template.subject, recipient.variables || {});

        const result = await sendEmail({
          to: recipient.email,
          subject: personalizedSubject,
          html: personalizedHtml,
          text: personalizedText,
          from: options?.from,
          tags: options?.tags,
        });

        results.push({
          email: recipient.email,
          success: result.success,
          error: result.error,
        });
      } catch (error: any) {
        results.push({
          email: recipient.email,
          success: false,
          error: error.message || 'Failed to send email',
        });
      }
    }
  }

  return results;
}

/**
 * Replace template variables in a string
 * Supports {{variable}} syntax
 */
export function replaceTemplateVariables(template: string, variables: TemplateVariables): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, String(value || ''));
  }

  // Handle conditional blocks {{#if variable}}...{{/if}}
  const ifRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
  result = result.replace(ifRegex, (match, variable, content) => {
    const value = variables[variable];
    return value ? content : '';
  });

  return result;
}

/**
 * Strip HTML tags to create plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Get brand colors and styling for email templates
 */
export function getEmailBranding() {
  return {
    primaryColor: '#2563eb',
    secondaryColor: '#16a34a',
    dangerColor: '#dc2626',
    backgroundColor: '#f3f4f6',
    textColor: '#333333',
    fontFamily: 'Arial, sans-serif',
    logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || '/oecs-logo.png',
  };
}

/**
 * Wrap email content in branded HTML template
 */
export function wrapEmailTemplate(content: string, options?: { title?: string }): string {
  const branding = getEmailBranding();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options?.title || 'Notification'}</title>
</head>
<body style="margin: 0; padding: 0; font-family: ${branding.fontFamily}; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 20px 0; text-align: center; background-color: white; border-bottom: 2px solid ${branding.primaryColor};">
        <img src="${branding.logoUrl}" alt="OECS LearnBoard" style="max-height: 50px;" />
      </td>
    </tr>
    <tr>
      <td style="padding: 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: white; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px; text-align: center; background-color: #f9fafb; color: #6b7280; font-size: 12px;">
        <p style="margin: 0;">This is an automated email from OECS LearnBoard</p>
        <p style="margin: 5px 0 0 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://oecsmypd.org'}" style="color: ${branding.primaryColor}; text-decoration: none;">Visit OECS LearnBoard</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

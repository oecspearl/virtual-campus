import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

interface CertificateData {
  studentName: string;
  courseName: string;
  completionDate: string;
  gradePercentage?: number;
  verificationCode: string;
  logoUrl?: string;
}

interface TemplateVariables {
  [key: string]: string | number | undefined;
}

/**
 * Replace template variables in HTML string
 */
function replaceTemplateVariables(template: string, variables: TemplateVariables): string {
  let result = template;
  
  // Replace simple variables {{variable_name}}
  Object.keys(variables).forEach(key => {
    const value = variables[key];
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value?.toString() || '');
  });
  
  // Simple conditional handling {{#if variable}}...{{/if}}
  // This is a basic implementation - can be enhanced with a proper template engine
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(conditionalRegex, (match, variable, content) => {
    if (variables[variable]) {
      return replaceTemplateVariables(content, variables);
    }
    return '';
  });
  
  return result;
}

/**
 * Convert HTML to PDF-friendly format (simplified)
 * Note: For production, consider using puppeteer/playwright for full HTML/CSS rendering
 */
function htmlToPlainText(html: string): string {
  // Remove HTML tags and extract text content
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Extract style attributes and create PDF formatting
 */
function parseHTMLForPDF(template: string): Array<{ text: string; options: any }> {
  // Simple parser - extract text and basic formatting
  const sections: Array<{ text: string; options: any }> = [];
  
  // Match tags with text content
  const tagRegex = /<(h1|h2|h3|p|div)[^>]*>([^<]+)<\/\1>/gi;
  let match;
  
  while ((match = tagRegex.exec(template)) !== null) {
    const tagName = match[1].toLowerCase();
    const text = match[2].trim();
    
    if (!text) continue;
    
    const options: any = {
      align: 'center' // Default center alignment
    };
    
    // Parse style attribute if present
    const styleMatch = match[0].match(/style="([^"]*)"/);
    if (styleMatch) {
      const styles = styleMatch[1].split(';');
      styles.forEach(style => {
        const [key, value] = style.split(':').map(s => s.trim());
        if (key === 'font-size') {
          const size = parseInt(value);
          if (!isNaN(size)) options.fontSize = size * 0.75; // Convert px to points (approximate)
        }
        if (key === 'color') {
          options.color = value;
        }
      });
    }
    
    // Set font size based on tag
    switch (tagName) {
      case 'h1':
        options.fontSize = options.fontSize || 36;
        options.font = 'Helvetica-Bold';
        break;
      case 'h2':
        options.fontSize = options.fontSize || 28;
        options.font = 'Helvetica-Bold';
        break;
      case 'h3':
        options.fontSize = options.fontSize || 24;
        options.font = 'Helvetica-Bold';
        break;
      default:
        options.fontSize = options.fontSize || 14;
        options.font = 'Helvetica';
    }
    
    sections.push({ text, options });
  }
  
  return sections;
}

/**
 * Generate certificate PDF
 */
export async function generateCertificatePDF(
  certificateData: CertificateData,
  templateHtml: string
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      // Replace template variables
      const variables: TemplateVariables = {
        student_name: certificateData.studentName,
        course_name: certificateData.courseName,
        completion_date: certificateData.completionDate,
        grade_percentage: certificateData.gradePercentage,
        verification_code: certificateData.verificationCode,
        logo_url: certificateData.logoUrl || ''
      };
      
      const processedHtml = replaceTemplateVariables(templateHtml, variables);
      
      // Center everything
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      
      // Add logo if provided
      if (certificateData.logoUrl) {
        // Note: For production, download and embed image
        // For now, we'll skip logo embedding
      }
      
      // Parse HTML and render to PDF
      const sections = parseHTMLForPDF(processedHtml);
      
      let yPosition = 150;
      const lineHeight = 30;
      
      sections.forEach((section, index) => {
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          yPosition = 100;
        }
        
        const text = section.text;
        const options = {
          ...section.options,
          width: pageWidth - 100,
          align: 'center'
        };
        
        doc.font(options.font || 'Helvetica')
           .fontSize(options.fontSize || 14)
           .fillColor(options.color || '#000000');
        
        // Handle multi-line text
        const lines = text.split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            doc.text(line.trim(), (pageWidth - options.width) / 2, yPosition, options);
            yPosition += lineHeight;
          }
        });
        
        // Add spacing after sections
        yPosition += 20;
      });
      
      // Add QR code for verification
      try {
        const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify/${certificateData.verificationCode}`;
        const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
          width: 150,
          margin: 1
        });
        
        // Convert data URL to buffer
        const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
        const qrBuffer = Buffer.from(base64Data, 'base64');
        
        // Add QR code at bottom
        doc.image(qrBuffer, pageWidth / 2 - 75, pageHeight - 150, {
          width: 150,
          height: 150
        });
        
        // Add verification code text
        doc.font('Helvetica')
           .fontSize(10)
           .fillColor('#666666')
           .text(
             `Verification Code: ${certificateData.verificationCode}`,
             (pageWidth - 200) / 2,
             pageHeight - 50,
             { align: 'center', width: 200 }
           );
      } catch (qrError) {
        console.error('Error generating QR code:', qrError);
        // Continue without QR code
      }
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get default certificate template
 */
export async function getCertificateTemplate(templateId?: string) {
  const supabase = createServiceSupabaseClient();
  
  if (templateId) {
    const { data, error } = await supabase
      .from('certificate_templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (!error && data) return data;
  }
  
  // Get default template
  const { data, error } = await supabase
    .from('certificate_templates')
    .select('*')
    .eq('is_default', true)
    .single();
  
  if (error || !data) {
    throw new Error('No certificate template found');
  }
  
  return data;
}

/**
 * Upload certificate PDF to storage
 */
export async function uploadCertificatePDF(
  pdfBuffer: Buffer,
  studentId: string,
  courseId: string,
  certificateId: string
): Promise<string> {
  const supabase = createServiceSupabaseClient();
  
  const fileName = `${studentId}/${courseId}/${certificateId}.pdf`;
  const bucket = 'certificates';
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });
  
  if (error) {
    // If bucket doesn't exist, create it first
    if (error.message.includes('Bucket not found')) {
      // Note: Creating buckets requires admin API, handle via Supabase dashboard
      throw new Error('Certificates storage bucket not found. Please create bucket "certificates" in Supabase Storage.');
    }
    throw error;
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);
  
  return urlData.publicUrl;
}


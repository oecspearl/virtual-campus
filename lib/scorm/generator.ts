import JSZip from 'jszip';
import type { SCORMBuilderData } from './types';
import { buildManifestXml } from './manifest-builder';
import { generateIndexHtml, generateStyleCss } from './templates/slide-quiz';
import { getScormRuntimeJs } from './templates/base-runtime';

/**
 * Generate a SCORM 2004 conformant ZIP package from structured builder data.
 * Returns a Buffer suitable for uploading to Supabase Storage.
 */
export async function generateScormPackage(data: SCORMBuilderData): Promise<Buffer> {
  const zip = new JSZip();

  // 1. imsmanifest.xml — required by SCORM spec at the root
  zip.file('imsmanifest.xml', buildManifestXml(data));

  // 2. The player HTML
  zip.file('index.html', generateIndexHtml(data));

  // 3. Styles
  zip.file('style.css', generateStyleCss(data.settings.accentColor));

  // 4. SCORM API bridge JS
  zip.file('scorm-api.js', getScormRuntimeJs());

  // Generate as Node Buffer
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return buffer;
}

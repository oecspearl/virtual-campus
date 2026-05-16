import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import JSZip from "jszip";
import { gunzipSync } from "zlib";
import { detectArchiveFormat, parseTarArchive } from "@/lib/moodle/archive";
import { getZipFile } from "@/lib/moodle/parser";
import { handleMoodleXmlImport, handlePlatformBackupRestore, handleAIMoodleImport } from "@/lib/moodle/importer";
import { createLogger } from "@/lib/logger";

export const maxDuration = 300; // 5 minutes

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_UNCOMPRESSED_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

export async function POST(request: NextRequest) {
  const log = createLogger('api/courses/import/moodle', request);
  try {
    log.info('Moodle import started');

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;

    // Check permissions
    if (!hasRole(userProfile.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const serviceSupabase = createServiceSupabaseClient();

    // Determine request type: JSON (storage path) vs FormData (direct upload)
    const contentType = request.headers.get('content-type') || '';
    let file: File | null = null;
    let courseName: string | null = null;
    let buffer: Buffer | null = null;
    let fileName: string = '';

    if (contentType.includes('application/json')) {
      // New flow: file already uploaded to Supabase Storage
      const body = await request.json();
      const { storagePath, fileName: fn, courseName: cn } = body;
      courseName = cn || null;
      fileName = fn || '';

      if (!storagePath) {
        return NextResponse.json({ error: "No storagePath provided" }, { status: 400 });
      }

      // Download file from Supabase Storage
      const { data: fileData, error: downloadError } = await serviceSupabase.storage
        .from('course-materials')
        .download(storagePath);

      if (downloadError || !fileData) {
        log.error('Failed to download backup from storage', { storagePath }, downloadError);
        return NextResponse.json({
          error: "Failed to download uploaded file from storage",
          details: downloadError?.message || "File not found in storage"
        }, { status: 400 });
      }

      // Convert Blob to Buffer
      const arrayBuffer = await fileData.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);

      // Clean up temp file from storage (fire and forget)
      serviceSupabase.storage.from('course-materials').remove([storagePath]).catch(() => {});
    } else {
      // Legacy flow: file sent directly in FormData
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch (error) {
        log.error('Failed to parse form data', undefined, error);
        return NextResponse.json({
          error: "Failed to parse form data",
          details: error instanceof Error ? error.message : "Could not read request body"
        }, { status: 400 });
      }

      file = formData.get('file') as File | null;
      courseName = formData.get('course_name') as string | null;

      if (!file) {
        return NextResponse.json({
          error: "No backup file provided",
          details: "Please select a backup file (.mbz, .zip, or .xml) to upload"
        }, { status: 400 });
      }

      fileName = file.name;

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({
          error: `Backup file too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum is ${MAX_FILE_SIZE / 1024 / 1024}MB.`
        }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    // Validate file type
    const isMbz = fileName.endsWith('.mbz') || fileName.endsWith('.zip');
    const isXml = fileName.endsWith('.xml');

    if (!isMbz && !isXml) {
      return NextResponse.json({
        error: "Backup file must be a .mbz, .zip, or .xml file",
        details: `The file "${fileName}" is not a supported format.`
      }, { status: 400 });
    }

    // Handle XML files differently from ZIP/MBZ files
    if (isXml) {
      // Create a File-like object for the XML handler
      const xmlContent = buffer!.toString('utf-8');
      const xmlFile = new File([xmlContent], fileName, { type: 'text/xml' });
      return await handleMoodleXmlImport(xmlFile, courseName, serviceSupabase, authResult);
    }

    // At this point buffer is guaranteed to be set
    if (!buffer) {
      return NextResponse.json({ error: "No file data available" }, { status: 400 });
    }

    // Validate file is not empty
    if (buffer.length === 0) {
      log.warn('Backup file is empty', { fileName });
      return NextResponse.json({
        error: "The uploaded file is empty",
        details: "The file appears to have no content. Please check your Moodle backup file and try again."
      }, { status: 400 });
    }

    // Detect archive format
    let archiveFormat = await detectArchiveFormat(buffer);

    // Handle gzip: decompress first, then re-detect inner format
    if (archiveFormat === 'gzip') {
      try {
        buffer = gunzipSync(buffer);
        archiveFormat = await detectArchiveFormat(buffer);
      } catch (error) {
        log.error('Gzip decompression failed', { fileName }, error);
        return NextResponse.json({
          error: "Failed to decompress gzip file",
          details: "The .mbz file appears to be gzip-compressed but could not be decompressed. The file may be corrupted.",
          troubleshooting: [
            "Try re-downloading the backup from Moodle",
            "Verify the file wasn't corrupted during transfer"
          ]
        }, { status: 400 });
      }
    }

    // Handle TAR: parse and convert to JSZip-compatible structure
    let zip: JSZip;

    if (archiveFormat === 'tar') {
      try {
        const tarFiles = parseTarArchive(buffer);

        // Populate a JSZip instance with TAR contents so downstream code works unchanged
        zip = new JSZip();
        for (const [path, data] of tarFiles) {
          zip.file(path, data);
        }
      } catch (error) {
        log.error('TAR parsing failed', { fileName }, error);
        return NextResponse.json({
          error: "Failed to parse TAR archive",
          details: "The Moodle backup TAR archive could not be read. The file may be corrupted.",
          troubleshooting: [
            "Try re-exporting the course from Moodle",
            "Verify the file wasn't corrupted during download"
          ]
        }, { status: 400 });
      }
    } else if (archiveFormat === 'zip') {
      try {
        zip = await JSZip.loadAsync(buffer, {
          checkCRC32: false,
          createFolders: true,
        });
      } catch (error) {
        const zipLoadError = error instanceof Error ? error : new Error(String(error));
        return NextResponse.json({
          error: "Failed to read ZIP file",
          details: "The file could not be processed as a ZIP archive. Please ensure it's a valid Moodle backup file.",
          troubleshooting: [
            "Verify the file is a complete Moodle course backup (.mbz)",
            "Try re-exporting from Moodle",
            "Check that the file wasn't corrupted during upload",
            "Ensure the file is not password-protected"
          ],
          technical: zipLoadError.message
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({
        error: "Unknown archive format",
        details: "The file does not appear to be a valid ZIP, TAR, or gzip archive. Please ensure you're uploading a complete Moodle backup file."
      }, { status: 400 });
    }

    // Verify ZIP has files
    const fileCount = Object.keys(zip.files).length;
    if (fileCount === 0) {
      return NextResponse.json({
        error: "The ZIP file is empty",
        details: "The uploaded file appears to be an empty ZIP archive. Please ensure you're uploading a complete Moodle backup."
      }, { status: 400 });
    }

    // Log ZIP structure for debugging
    const xmlFiles = Object.keys(zip.files).filter(path => path.endsWith('.xml'));
    const binaryFiles = Object.keys(zip.files).filter(path =>
      path.startsWith('files/') && !path.endsWith('.xml')
    );
    const mbzFiles = Object.keys(zip.files).filter(path => path.endsWith('.mbz'));
    const nestedZipFiles = Object.keys(zip.files).filter(path =>
      path.endsWith('.zip') && !path.endsWith('.mbz.zip')
    );

    log.info('ZIP loaded', {
      fileCount,
      xmlFiles: xmlFiles.length,
      binaryFiles: binaryFiles.length,
      mbzNested: mbzFiles.length,
      zipNested: nestedZipFiles.length,
      hasMoodleBackupXml: !!getZipFile(zip, 'moodle_backup.xml'),
    });

    // Check if this is a nested ZIP (ZIP containing a .mbz file)
    if ((mbzFiles.length > 0 || nestedZipFiles.length > 0) && !getZipFile(zip, 'moodle_backup.xml')) {
      // Try to extract the nested .mbz or .zip file
      const nestedFile = mbzFiles[0] || nestedZipFiles[0];
      if (nestedFile) {
        try {
          const nestedFileEntry = getZipFile(zip, nestedFile);
          if (nestedFileEntry) {
            const nestedBuffer = await nestedFileEntry.async('nodebuffer');

            // Load the nested ZIP
            try {
              zip = await JSZip.loadAsync(nestedBuffer, {
                checkCRC32: false,
                createFolders: true
              });
            } catch (nestedError) {
              log.error('Nested ZIP load failed', { nestedFile }, nestedError);
              return NextResponse.json({
                error: "Failed to extract nested Moodle backup",
                details: "The file contains a nested ZIP/MBZ file, but it could not be extracted. The nested file may be corrupted.",
                troubleshooting: [
                  "Try extracting the outer ZIP file manually",
                  "Upload the inner .mbz file directly (not the .zip containing it)",
                  "Re-export from Moodle ensuring you download the .mbz file directly"
                ]
              }, { status: 400 });
            }
          }
        } catch (extractError) {
          log.error('Nested file extraction failed', { nestedFile }, extractError);
          return NextResponse.json({
            error: "Failed to extract nested Moodle backup",
            details: "The file appears to contain a nested ZIP/MBZ file, but extraction failed.",
            troubleshooting: [
              "Extract the outer ZIP file manually first",
              "Upload the inner .mbz file directly",
              "Re-export from Moodle"
            ]
          }, { status: 400 });
        }
      }
    }

    // Detect platform backup format (manifest.json instead of moodle_backup.xml)
    const manifestJsonFile = zip.file('manifest.json');
    if (manifestJsonFile && !getZipFile(zip, 'moodle_backup.xml')) {
      return await handlePlatformBackupRestore(zip, authResult);
    }

    // Verify ZIP structure - check for required Moodle files
    const requiredFiles = ['moodle_backup.xml'];
    const missingFiles = requiredFiles.filter(file => !getZipFile(zip, file));

    if (missingFiles.length > 0) {
      log.warn('Missing required files in ZIP', { missing: missingFiles });
      // Don't fail immediately - might be in a subdirectory
    }

    // Use AI-powered import for reliable Moodle backup parsing
    return await handleAIMoodleImport(zip, courseName, authResult, serviceSupabase);

  } catch (error) {
    log.error('POST handler crashed', undefined, error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Determine if this is a client error (400) or server error (500)
    const isClientError = errorMessage.includes('validation') ||
                         errorMessage.includes('invalid') ||
                         errorMessage.includes('missing') ||
                         errorMessage.includes('required');

    return NextResponse.json({
      error: "Failed to import Moodle backup",
      details: errorMessage,
      troubleshooting: [
        "Check that the file is a valid Moodle backup",
        "Ensure the file upload completed successfully",
        "Try re-exporting from Moodle",
        "Contact support if the issue persists"
      ]
    }, { status: isClientError ? 400 : 500 });
  }
}

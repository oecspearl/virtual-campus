import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import JSZip from "jszip";
import { gunzipSync } from "zlib";
import { detectArchiveFormat, parseTarArchive } from "@/lib/moodle/archive";
import { getZipFile } from "@/lib/moodle/parser";
import { handleMoodleXmlImport, handlePlatformBackupRestore, handleAIMoodleImport } from "@/lib/moodle/importer";

export const maxDuration = 300; // 5 minutes

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_UNCOMPRESSED_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

export async function POST(request: NextRequest) {
  try {
    console.log('[Moodle Import] Starting import request...');

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      console.error('[Moodle Import] Authentication failed:', authResult.error);
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    console.log('[Moodle Import] User authenticated:', userProfile.id, userProfile.role);

    // Check permissions
    if (!hasRole(userProfile.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      console.error('[Moodle Import] Insufficient permissions:', userProfile.role);
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

      console.log('[Moodle Import] Storage path mode:', { storagePath, fileName, courseName });

      // Download file from Supabase Storage
      const { data: fileData, error: downloadError } = await serviceSupabase.storage
        .from('course-materials')
        .download(storagePath);

      if (downloadError || !fileData) {
        console.error('[Moodle Import] Failed to download from storage:', downloadError);
        return NextResponse.json({
          error: "Failed to download uploaded file from storage",
          details: downloadError?.message || "File not found in storage"
        }, { status: 400 });
      }

      // Convert Blob to Buffer
      const arrayBuffer = await fileData.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      console.log('[Moodle Import] Downloaded from storage, size:', buffer.length,
        'firstBytes:', buffer.slice(0, 4).toString('hex'),
        'ascii:', buffer.slice(0, 20).toString('ascii').replace(/[^\x20-\x7E]/g, '.'));

      // Clean up temp file from storage (fire and forget)
      serviceSupabase.storage.from('course-materials').remove([storagePath]).catch(() => {});
    } else {
      // Legacy flow: file sent directly in FormData
      let formData: FormData;
      try {
        formData = await request.formData();
        console.log('[Moodle Import] Form data received');
      } catch (error) {
        console.error('[Moodle Import] Failed to parse form data:', error);
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
      console.log('[Moodle Import] File info:', { fileName: file.name, fileSize: file.size, fileType: file.type });

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

    console.log('[Moodle Import] Buffer ready, length:', buffer.length);

    // Validate file is not empty
    if (buffer.length === 0) {
      console.error('[Moodle Import] File is empty');
      return NextResponse.json({
        error: "The uploaded file is empty",
        details: "The file appears to have no content. Please check your Moodle backup file and try again."
      }, { status: 400 });
    }

    // Detect archive format
    let archiveFormat = await detectArchiveFormat(buffer);
    console.log('[Moodle Import] Detected archive format:', archiveFormat);

    // Handle gzip: decompress first, then re-detect inner format
    if (archiveFormat === 'gzip') {
      try {
        console.log('[Moodle Import] Decompressing gzip...');
        buffer = gunzipSync(buffer);
        console.log('[Moodle Import] Decompressed size:', buffer.length,
          'firstBytes:', buffer.slice(0, 4).toString('hex'));
        archiveFormat = await detectArchiveFormat(buffer);
        console.log('[Moodle Import] Inner format:', archiveFormat);
      } catch (error) {
        console.error('[Moodle Import] Gzip decompression failed:', error);
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
        console.log('[Moodle Import] Parsing TAR archive...');
        const tarFiles = parseTarArchive(buffer);
        console.log('[Moodle Import] TAR contains', tarFiles.size, 'files');

        // Populate a JSZip instance with TAR contents so downstream code works unchanged
        zip = new JSZip();
        for (const [path, data] of tarFiles) {
          zip.file(path, data);
        }

        const tarFileNames = Array.from(tarFiles.keys()).slice(0, 20);
        console.log('[Moodle Import] TAR file list (first 20):', tarFileNames);
      } catch (error) {
        console.error('[Moodle Import] TAR parsing failed:', error);
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
      // Log file info for debugging
      console.log('[Moodle Import] Loading ZIP archive, size:', buffer.length);

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

    console.log(`ZIP loaded successfully. Contains ${fileCount} files/entries:`);
    console.log(`  - ${xmlFiles.length} XML files`);
    console.log(`  - ${binaryFiles.length} binary files in files/ directory`);
    console.log(`  - ${mbzFiles.length} .mbz files (nested)`);
    console.log(`  - ${nestedZipFiles.length} .zip files (nested)`);
    console.log(`  - Required file 'moodle_backup.xml': ${getZipFile(zip, 'moodle_backup.xml') ? 'found' : 'missing'}`);
    console.log(`  - All files in ZIP:`, Object.keys(zip.files).slice(0, 20));

    // Check if this is a nested ZIP (ZIP containing a .mbz file)
    if ((mbzFiles.length > 0 || nestedZipFiles.length > 0) && !getZipFile(zip, 'moodle_backup.xml')) {
      console.log('[Moodle Import] Detected nested ZIP/MBZ file. Attempting to extract...');

      // Try to extract the nested .mbz or .zip file
      const nestedFile = mbzFiles[0] || nestedZipFiles[0];
      if (nestedFile) {
        try {
          const nestedFileEntry = getZipFile(zip, nestedFile);
          if (nestedFileEntry) {
            console.log(`[Moodle Import] Extracting nested file: ${nestedFile}`);
            const nestedBuffer = await nestedFileEntry.async('nodebuffer');
            console.log(`[Moodle Import] Nested file extracted, size: ${nestedBuffer.length}`);

            // Load the nested ZIP
            try {
              zip = await JSZip.loadAsync(nestedBuffer, {
                checkCRC32: false,
                createFolders: true
              });

              const nestedFileCount = Object.keys(zip.files).length;
              const nestedXmlFiles = Object.keys(zip.files).filter(path => path.endsWith('.xml'));
              console.log(`[Moodle Import] Nested ZIP loaded successfully. Contains ${nestedFileCount} files:`);
              console.log(`  - ${nestedXmlFiles.length} XML files`);
              console.log(`  - All files in nested ZIP:`, Object.keys(zip.files).slice(0, 20));
            } catch (nestedError) {
              console.error('[Moodle Import] Failed to load nested ZIP:', nestedError);
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
          console.error('[Moodle Import] Failed to extract nested file:', extractError);
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
      console.log('[Moodle Import] Detected platform backup format (manifest.json). Routing to platform restore...');
      return await handlePlatformBackupRestore(zip, authResult);
    }

    // Verify ZIP structure - check for required Moodle files
    const requiredFiles = ['moodle_backup.xml'];
    const missingFiles = requiredFiles.filter(file => !getZipFile(zip, file));

    if (missingFiles.length > 0) {
      console.warn(`Missing required files in ZIP: ${missingFiles.join(', ')}`);
      // Don't fail immediately - might be in a subdirectory
    }

    // Use AI-powered import for reliable Moodle backup parsing
    return await handleAIMoodleImport(zip, courseName, authResult, serviceSupabase);

  } catch (error) {
    console.error('[Moodle Import] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log full error details
    console.error('[Moodle Import] Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? error.cause : undefined
    });

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
